import { TRENDING_SOURCES } from '../config/constants.js';
import { hash } from '../utils/textProcessing.js';
import { parseFeed } from '../parsing/feedParser.js';
import { isGoodImageUrl } from '../images/imageProcessing.js';

// 缓存（服务内部拥有）
export const trendingCache = { data: null, expiresAt: 0 };
export const githubCaches = {};

export async function fetchTrendingSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://localhost)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 15);
    return { source: source.name, items: items.map(item => ({ ...item, platform: source.platform })) };
  } catch (e) {
    console.warn(`[Trending] Failed to fetch ${source.name}: ${e.message}`);
    return { source: source.name, items: [], error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getTrending(platformFilter = 'all', page = 0, pageSize = 60) {
  const now = Date.now();

  // 获取所有数据（从缓存或重新获取）
  let allItems = [];
  if (trendingCache.data && trendingCache.expiresAt > now && trendingCache.data.items?.length > 0) {
    allItems = trendingCache.data.items;
  } else {
    const settled = await Promise.allSettled(TRENDING_SOURCES.map(fetchTrendingSource));
    const results = settled.flatMap(result => (result.status === 'fulfilled' ? result.value : []));
    allItems = results.flatMap(r => r.items || []);

    // 按时间排序
    allItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    // 更新缓存（存储所有数据）
    trendingCache.data = { items: allItems };
    trendingCache.expiresAt = now + 1000 * 60 * 10;
  }

  // 按平台筛选
  let items = allItems;
  if (platformFilter !== 'all') {
    items = items.filter(item => item.platform === platformFilter);
  }

  // 分页
  const start = page * pageSize;
  const end = start + pageSize;
  const pagedItems = items.slice(start, end);

  const payload = {
    updatedAt: new Date().toISOString(),
    items: pagedItems,
    sourcesCount: TRENDING_SOURCES.length,
    hasMore: end < items.length
  };
  return payload;
}

export async function getGithubTrending(lang, since) {
  const validSince = ['daily', 'weekly', 'monthly'].includes(since) ? since : 'weekly';
  const now = Date.now();
  const cacheKey = `github-${lang}-${validSince}`;
  if (githubCaches[cacheKey] && githubCaches[cacheKey].expiresAt > now) {
    return githubCaches[cacheKey].data;
  }

  try {
    const dateRange = validSince === 'daily' ? getYesterday() : validSince === 'monthly' ? get30DaysAgo() : get7DaysAgo();
    const langQuery = lang ? `+language:${encodeURIComponent(lang)}` : '';
    const apiUrl = `https://api.github.com/search/repositories?q=created:>${dateRange}${langQuery}&sort=stars&order=desc&per_page=25`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1', 'Accept': 'application/vnd.github.v3+json' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);

    const data = await response.json();
    const rawRepos = data.items || [];

    const repos = rawRepos.slice(0, 25).map(item => ({
      id: hash(item.full_name),
      fullName: item.full_name,
      name: item.name,
      url: item.html_url,
      description: item.description || '暂无描述',
      language: item.language || '',
      totalStars: item.stargazers_count || 0,
      forks: item.forks_count || 0,
      starsToday: validSince === 'daily' ? item.stargazers_count : 0,
      starsThisWeek: validSince === 'weekly' ? item.stargazers_count : 0,
      starsThisMonth: validSince === 'monthly' ? item.stargazers_count : 0,
      period: validSince,
      periodLabel: validSince === 'daily' ? 'today' : validSince === 'monthly' ? 'this month' : 'this week',
      homepage: item.homepage || '',
      topics: item.topics || [],
      openIssues: item.open_issues_count || 0,
      watchers: item.watchers_count || 0,
      imageUrl: '',
      readmeIntro: '',
      tutorial: ''
    }));

    const settled = await Promise.allSettled(rawRepos.slice(0, 5).map(async (item, i) => {
      try {
        const branches = ['main', 'master'];
        let content = '';
        for (const branch of branches) {
          const rawUrl = `https://raw.githubusercontent.com/${item.full_name}/${branch}/README.md`;
          const rawRes = await fetch(rawUrl, {
            headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
            signal: AbortSignal.timeout(5000)
          });
          if (rawRes.ok) { content = await rawRes.text(); break; }
        }
        if (!content) {
          const readmeUrl = `https://api.github.com/repos/${item.full_name}/readme`;
          const readmeRes = await fetch(readmeUrl, {
            headers: { 'User-Agent': 'GlobalTechRadar/0.1', 'Accept': 'application/vnd.github.raw' },
            signal: AbortSignal.timeout(6000)
          });
          if (!readmeRes.ok) return null;
          content = await readmeRes.text();
        }
const imageUrls = [...content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
        const markdownImages = [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
        const readmeBadImgRe = /(badge|shield|icon|logo|status|build|coverage|codecov|travis|circleci|github\.com\/.*\/badges|npm\/badge|snyk|dependabot|renovate|license|downloads|version|size|rating|stars|follow|tweet|share|sponsor|patreon|ko-fi|buy_me_a_coffee|opencollective|code_style|lint|test|ci|workflow|actions|progress|compat|platform|browser|stack|node|python|java|rust|go|typescript|javascript|swift|kotlin|ruby|php|docker|podman|kubernetes|terraform|ansible|visual.studio|vscode|jetbrains|intellij|emacs|vim|neovim|sublime)\b/i;
        const readmeGoodImgRe = /(screenshot|demo|preview|example|result|output|architecture|diagram|flow|chart|graph|figure|fig|illustration|展示|演示|截图|效果图|架构图|流程图|界面|画面|界面截图)/i;
        const candidates = [];
        const resolveUrl = (src) => {
          if (src.startsWith('http://') || src.startsWith('https://')) return src;
          const base = `https://raw.githubusercontent.com/${item.full_name}/main`;
          const path = src.startsWith('/') ? src.slice(1) : src;
          return `${base}/${path}`;
        };
        const markdownMatches = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
        for (const m of markdownMatches) {
          const alt = m[1];
          let src = m[2];
          if (!/\.(jpg|jpeg|png|gif|webp)/i.test(src)) continue;
          src = resolveUrl(src);
          if (readmeBadImgRe.test(src) || readmeBadImgRe.test(alt)) continue;
          if (!isGoodImageUrl(src, content)) continue;
          const goodScore = (readmeGoodImgRe.test(src) || readmeGoodImgRe.test(alt)) ? 2 : 0;
          const pathScore = /\/(img|images|assets|static|public|media|pics|screenshots|screens|docs\/images|doc\/img|examples)\b/i.test(src) ? 1 : 0;
          candidates.push({ src, score: goodScore + pathScore });
        }
        const htmlMatches = [...content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
        for (const m of htmlMatches) {
          let src = m[1];
          if (!/\.(jpg|jpeg|png|gif|webp)/i.test(src)) continue;
          src = resolveUrl(src);
          if (readmeBadImgRe.test(src)) continue;
          if (!isGoodImageUrl(src, content)) continue;
          const goodScore = readmeGoodImgRe.test(src) ? 2 : 0;
          const pathScore = /\/(img|images|assets|static|public|media|pics|screenshots|screens|docs\/images|doc\/img|examples)\b/i.test(src) ? 1 : 0;
          candidates.push({ src, score: goodScore + pathScore });
        }
        candidates.sort((a, b) => b.score - a.score);
        const imageUrl = candidates.length > 0 ? candidates[0].src : (item.homepage ? '' : '');

        const tutorial = extractTutorial(content);
        const intro = content.replace(/!\[[^\]]*\]\([^\)]+\)/g, '').replace(/<[^>]+>/g, '').replace(/#{1,4}\s/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
        return { index: i, imageUrl, tutorial, readmeIntro: intro };
      } catch { return null; }
    }));

    settled.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { index, imageUrl, tutorial, readmeIntro } = result.value;
        if (repos[index]) {
          repos[index].imageUrl = imageUrl;
          repos[index].tutorial = tutorial;
          repos[index].readmeIntro = readmeIntro;
        }
      }
    });

    const payload = { updatedAt: new Date().toISOString(), language: lang || 'all', period: validSince, repos };
    githubCaches[cacheKey] = { data: payload, expiresAt: now + 1000 * 60 * 30 };
    return payload;
  } catch (e) {
    return { updatedAt: new Date().toISOString(), language: lang || 'all', period: validSince, repos: [], error: e.message };
  }
}

export function extractTutorial(readme) {
  const sections = readme.split(/\n(?=#{1,3}\s)/);
  for (const section of sections) {
    const lower = section.toLowerCase();
    if (/(installation|install|setup|getting started|quick start|usage|how to use|how to run|教程|使用说明|安装|快速开始)/i.test(lower.slice(0, 80))) {
      const cleaned = section.replace(/#{1,3}\s/g, '').replace(/!\[[^\]]*\]\([^\)]+\)/g, '').replace(/<[^>]+>/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim();
      const lines = cleaned.split('\n').filter(l => l.trim());
      const meaningfulLines = lines.filter(l => !/^\s*(```|---|\*|\*\*|$)/.test(l.trim()));
      if (meaningfulLines.length < 2) return '';
      return meaningfulLines.join('\n').trim();
    }
  }
  return '';
}

export function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function get7DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

export function get30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}
