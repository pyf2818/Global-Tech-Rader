const githubCaches = {};
const CACHE_TTL = 1000 * 60 * 30;
const MAX_REPOS = 25;
const README_ENRICH_LIMIT = 8;

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function getDateBefore(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function normalizeSince(value) {
  return ['daily', 'weekly', 'monthly'].includes(value) ? value : 'weekly';
}

function periodMeta(since) {
  if (since === 'daily') return { dateRange: getDateBefore(1), label: 'today', scoreKey: 'starsToday' };
  if (since === 'monthly') return { dateRange: getDateBefore(30), label: 'this month', scoreKey: 'starsThisMonth' };
  return { dateRange: getDateBefore(7), label: 'this week', scoreKey: 'starsThisWeek' };
}

function isGoodReadmeImage(src = '', alt = '') {
  const text = `${src} ${alt}`.toLowerCase();
  if (!/\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(src)) return false;
  if (/data:image\/svg|\.svg(\?|#|$)/i.test(src)) return false;
  if (/(badge|shield|icon|logo|avatar|status|build|coverage|codecov|travis|circleci|github\.com\/.*\/badges|npm\/badge|snyk|dependabot|renovate|license|downloads|version|size|rating|stars|follow|tweet|share|sponsor|patreon|ko-fi|opencollective|code_style|lint|test|ci|workflow|actions|progress|compat|platform)\b/i.test(text)) return false;
  if (/(1x1|pixel|spacer|tracking|transparent|placeholder|blank|loading|favicon|apple-touch-icon)/i.test(text)) return false;
  return true;
}

function imageScore(src = '', alt = '') {
  const text = `${src} ${alt}`.toLowerCase();
  let score = 0;
  if (/(screenshot|screen|demo|preview|example|result|output|architecture|diagram|flow|chart|graph|figure|illustration|展示|演示|截图|效果|架构|流程|界面|画面)/i.test(text)) score += 5;
  if (/\/(img|image|images|assets|static|public|media|pics|screenshots|screens|docs\/images|doc\/img|examples)\b/i.test(src)) score += 2;
  if (/\.(gif|webp)(\?|#|$)/i.test(src)) score += 1;
  return score;
}

function resolveReadmeImageUrl(src, repoFullName, defaultBranch) {
  if (!src) return '';
  const cleaned = src.trim().replace(/^<|>$/g, '').replace(/^['"]|['"]$/g, '');
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (cleaned.startsWith('//')) return `https:${cleaned}`;
  if (cleaned.startsWith('#') || cleaned.startsWith('mailto:')) return '';
  const branch = defaultBranch || 'main';
  const path = cleaned.startsWith('/') ? cleaned.slice(1) : cleaned;
  return `https://raw.githubusercontent.com/${repoFullName}/${branch}/${path}`;
}

function extractReadmeImage(readme, repoFullName, defaultBranch) {
  const candidates = [];
  const markdownMatches = [...readme.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)];
  for (const match of markdownMatches) {
    const alt = match[1] || '';
    const url = resolveReadmeImageUrl(match[2], repoFullName, defaultBranch);
    if (url && isGoodReadmeImage(url, alt)) candidates.push({ url, score: imageScore(url, alt) });
  }

  const htmlMatches = [...readme.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  for (const match of htmlMatches) {
    const block = match[0] || '';
    const altMatch = block.match(/alt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : '';
    const url = resolveReadmeImageUrl(match[1], repoFullName, defaultBranch);
    if (url && isGoodReadmeImage(url, alt)) candidates.push({ url, score: imageScore(url, alt) });
  }

  const seen = new Set();
  return candidates
    .filter(candidate => {
      if (seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .sort((a, b) => b.score - a.score)[0]?.url || '';
}

function cleanReadmeText(readme) {
  return readme
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\|?\s*:?-{3,}:?\s*\|?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractReadmeIntro(readme, description) {
  const cleaned = cleanReadmeText(readme);
  if (!cleaned) return description || '';
  const withoutBadges = cleaned.replace(/^(build|status|license|version|coverage|downloads)\b.*?\s/gi, '');
  return withoutBadges.slice(0, 260);
}

function extractTutorial(readme) {
  const sections = readme.split(/\n(?=#{1,3}\s)/);
  for (const section of sections) {
    const title = section.slice(0, 120).toLowerCase();
    if (!/(installation|install|setup|getting started|quick start|quickstart|usage|how to use|how to run|example|教程|使用说明|安装|快速开始|入门)/i.test(title)) continue;
    const cleaned = section
      .replace(/#{1,3}\s/g, '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
    const meaningful = lines.filter(line => !/^(```|---|\*{2}|<\/?)/.test(line));
    if (meaningful.length >= 2) return meaningful.slice(0, 16).join('\n').trim();
  }
  return '';
}

async function fetchReadme(repoFullName, defaultBranch) {
  const branches = [defaultBranch, 'main', 'master'].filter(Boolean);
  for (const branch of [...new Set(branches)]) {
    const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${branch}/README.md`;
    try {
      const rawRes = await fetch(rawUrl, {
        headers: { 'User-Agent': 'WanbanSiliconRiver/1.0' },
        signal: AbortSignal.timeout(6000)
      });
      if (rawRes.ok) return await rawRes.text();
    } catch {}
  }

  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${repoFullName}/readme`, {
      headers: { 'User-Agent': 'WanbanSiliconRiver/1.0', Accept: 'application/vnd.github.raw' },
      signal: AbortSignal.timeout(7000)
    });
    if (readmeRes.ok) return await readmeRes.text();
  } catch {}

  return '';
}

function buildRepo(item, since, meta) {
  const starsInPeriod = item.stargazers_count || 0;
  return {
    id: hash(item.full_name),
    fullName: item.full_name,
    name: item.name,
    url: item.html_url,
    description: item.description || '暂无描述',
    language: item.language || '',
    totalStars: item.stargazers_count || 0,
    forks: item.forks_count || 0,
    starsToday: since === 'daily' ? starsInPeriod : 0,
    starsThisWeek: since === 'weekly' ? starsInPeriod : 0,
    starsThisMonth: since === 'monthly' ? starsInPeriod : 0,
    period: since,
    periodLabel: meta.label,
    homepage: item.homepage || '',
    topics: item.topics || [],
    openIssues: item.open_issues_count || 0,
    watchers: item.watchers_count || 0,
    defaultBranch: item.default_branch || 'main',
    pushedAt: item.pushed_at || '',
    createdAt: item.created_at || '',
    imageUrl: '',
    readmeIntro: '',
    tutorial: ''
  };
}

async function enrichRepos(repos) {
  const settled = await Promise.allSettled(repos.slice(0, README_ENRICH_LIMIT).map(async (repo, index) => {
    const readme = await fetchReadme(repo.fullName, repo.defaultBranch);
    if (!readme) return null;
    return {
      index,
      imageUrl: extractReadmeImage(readme, repo.fullName, repo.defaultBranch),
      readmeIntro: extractReadmeIntro(readme, repo.description),
      tutorial: extractTutorial(readme)
    };
  }));

  settled.forEach(result => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const { index, imageUrl, readmeIntro, tutorial } = result.value;
    if (repos[index]) Object.assign(repos[index], { imageUrl, readmeIntro, tutorial });
  });

  return repos;
}

export default async function handler(req, res) {
  const lang = typeof req.query.lang === 'string' ? req.query.lang.trim() : '';
  const since = normalizeSince(req.query.since);
  const meta = periodMeta(since);
  const cacheKey = `github-${lang || 'all'}-${since}`;
  const now = Date.now();

  if (githubCaches[cacheKey]?.expiresAt > now) {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(githubCaches[cacheKey].data));
  }

  try {
    const langQuery = lang ? `+language:${encodeURIComponent(lang)}` : '';
    const apiUrl = `https://api.github.com/search/repositories?q=created:>${meta.dateRange}${langQuery}&sort=stars&order=desc&per_page=${MAX_REPOS}`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'WanbanSiliconRiver/1.0 (+https://vercel)',
        Accept: 'application/vnd.github.v3+json'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);

    const data = await response.json();
    const repos = await enrichRepos((data.items || []).slice(0, MAX_REPOS).map(item => buildRepo(item, since, meta)));
    const payload = { updatedAt: new Date().toISOString(), language: lang || 'all', period: since, repos };

    githubCaches[cacheKey] = { data: payload, expiresAt: now + CACHE_TTL };
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(payload));
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      updatedAt: new Date().toISOString(),
      language: lang || 'all',
      period: since,
      repos: [],
      error: e.message
    }));
  }
}
