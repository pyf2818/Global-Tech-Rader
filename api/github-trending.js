let cache = { data: null, key: null, expiresAt: 0 };

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function parseGithubTrending(html) {
  const repos = [];
  const repoPattern = /<article class="Box-row">(.*?)<\/article>/gs;
  const matches = [...html.matchAll(repoPattern)];

  for (const match of matches) {
    const block = match[1];

    const ownerMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>/);
    const fullName = ownerMatch ? ownerMatch[1].trim() : '';
    if (!fullName) continue;

    const descMatch = block.match(/<p class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

    const langMatch = block.match(/<span itemprop="programmingLanguage">(.*?)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : '';

    const starsMatch = block.match(/(\d[\d,]*)\s*stars\s*this\s*week/i) || block.match(/class="[^"]*d-inline-block[^"]*"[^>]*>[\s\S]*?(\d[\d,]*)[\s\S]*?<\/a>/i);
    const starsThisWeek = starsMatch ? starsMatch[1].replace(/,/g, '') : '0';

    const totalStarsMatch = block.match(/(\d[\d,]*)\s*<\/svg>\s*<\/a>/g);
    const totalStars = totalStarsMatch ? totalStarsMatch[0].replace(/[^\d]/g, '') : '0';

    const forksMatch = block.match(/(\d[\d,]*)\s*(?:<\/svg>\s*<\/a>)/g);
    const forks = forksMatch && forksMatch.length > 1 ? forksMatch[1].replace(/[^\d]/g, '') : '0';

    repos.push({
      id: hash(fullName),
      fullName,
      name: fullName.split('/')[1] || fullName,
      url: `https://github.com/${fullName}`,
      description: description || '暂无描述',
      language,
      starsThisWeek: parseInt(starsThisWeek, 10) || 0,
      totalStars: parseInt(totalStars, 10) || 0,
      forks: parseInt(forks, 10) || 0
    });
  }

  return repos.sort((a, b) => b.starsThisWeek - a.starsThisWeek).slice(0, 25);
}

export default async function handler(req, res) {
  const now = Date.now();
  const lang = req.query.lang || '';
  const cacheKey = `github-${lang}`;

  if (cache.data && cache.key === cacheKey && cache.expiresAt > now) {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(cache.data));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const langParam = lang ? `/${lang}` : '';
    const url = `https://github.com/trending${langParam}?since=weekly`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://vercel)', 'Accept': 'text/html' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`GitHub responded ${response.status}`);

    const html = await response.text();
    const repos = parseGithubTrending(html);

    const payload = { updatedAt: new Date().toISOString(), language: lang || 'all', period: 'weekly', repos };
    cache = { data: payload, key: cacheKey, expiresAt: now + 1000 * 60 * 15 };

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ updatedAt: new Date().toISOString(), language: lang || 'all', period: 'weekly', repos: [], error: e.message }));
  } finally {
    clearTimeout(timeout);
  }
}