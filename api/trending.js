const RSSHUB_BASE = 'https://rsshub.rssforever.com';

const TRENDING_SOURCES = [
  // === 国内平台 ===
  { name: '36氪', url: 'https://36kr.com/feed', region: 'domestic', platform: '36氪' },
  { name: '36氪快讯', url: `${RSSHUB_BASE}/36kr/newsflashes`, region: 'domestic', platform: '36氪' },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'domestic', platform: '少数派' },
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', region: 'domestic', platform: '爱范儿' },
  { name: '品玩', url: 'https://www.pingwest.com/feed', region: 'domestic', platform: '品玩' },
  { name: '虎扑', url: 'https://bbs.hupu.com/feed', region: 'domestic', platform: '虎扑' },
  { name: 'IT之家 24h 热榜', url: `${RSSHUB_BASE}/ithome/ranking/24h`, region: 'domestic', platform: 'IT之家' },
  
  // === 国际平台 ===
  { name: 'Hacker News Top', url: 'https://hnrss.org/frontpage', region: 'global', platform: 'Hacker News' },
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', region: 'global', platform: 'Hacker News' },
  { name: 'Dev.to', url: 'https://dev.to/feed', region: 'global', platform: 'Dev.to' },
  { name: 'Lobsters', url: 'https://lobste.rs/rss', region: 'global', platform: 'Lobsters' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', region: 'global', platform: 'Product Hunt' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', region: 'global', platform: 'GitHub' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'global', platform: 'TechCrunch' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'global', platform: 'The Verge' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/feed/', region: 'global', platform: 'Ars Technica' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', region: 'global', platform: 'Wired' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', region: 'global', platform: 'MIT Review' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', region: 'global', platform: 'Engadget' },
  { name: 'Slashdot', url: 'https://rss.slashdot.org/Slashdot/slashdotMain', region: 'global', platform: 'Slashdot' },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', region: 'global', platform: 'Smashing Mag' },
];

let cache = { data: null, expiresAt: 0 };

async function fetchTrendingSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://vercel)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml).slice(0, 15);
    return { source: source.name, items: items.map(item => ({ ...item, platform: source.platform })) };
  } catch (e) {
    return { source: source.name, items: [], error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml) {
  const itemPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks = [...xml.matchAll(itemPattern)].map(m => m[2]);
  return blocks.map((block, index) => normalizeItem(block, index)).filter(item => item.title && item.url);
}

function normalizeItem(block, index) {
  const title = cleanText(pick(block, ['title']));
  const rawSummary = cleanText(pick(block, ['description', 'summary']));
  const bodyIntro = trimIntro(cleanText(pick(block, ['content:encoded', 'content'])));
  const summary = trimSummary(rawSummary || bodyIntro);
  const url = cleanText(pick(block, ['link'])) || pickAtomLink(block);
  const publishedAt = normalizeDate(pick(block, ['pubDate', 'published', 'updated', 'dc:date']));

  return {
    id: hash(`${url}-${index}`),
    title,
    summary,
    bodyIntro,
    url,
    publishedAt
  };
}

function pick(block, tags) {
  for (const tag of tags) {
    const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i');
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

function pickAtomLink(block) {
  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeEntities(href) : '';
}

function cleanText(value) {
  return decodeEntities(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimSummary(value) {
  if (!value) return '暂无摘要';
  return value.length > 160 ? `${value.slice(0, 160).trim()}...` : value;
}

function trimIntro(value) {
  if (!value) return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 220 ? `${compact.slice(0, 220).trim()}...` : compact;
}

function normalizeDate(value) {
  const time = new Date(cleanText(value)).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hash(value) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result << 5) - result + value.charCodeAt(i);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

export default async function handler(req, res) {
  const now = Date.now();

  if (cache.data && cache.expiresAt > now) {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(cache.data));
  }

  const settled = await Promise.allSettled(TRENDING_SOURCES.map(fetchTrendingSource));
  const items = settled.flatMap(result => (result.status === 'fulfilled' ? result.value.items : []));

  const filtered = items
    .filter(item => /\b(ai|llm|gpt|model|大模型|人工智能|deep|neural|transformer|agent|chat|machine learning|nlp|diffusion)\b/i.test(`${item.title} ${item.summary}`))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 60);

  const payload = { updatedAt: new Date().toISOString(), items: filtered };
  cache = { data: payload, expiresAt: now + 1000 * 60 * 10 };

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}