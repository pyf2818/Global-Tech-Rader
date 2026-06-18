import { cleanText, decodeEntities } from '../utils/textProcessing.js';
import { isSafeUrl } from '../utils/httpUtils.js';
import { matchBlocks, pick } from '../parsing/feedParser.js';

const USER_AGENT = 'GlobalTechRadar/0.1 (+https://localhost)';
const COMMON_FEED_PATHS = [
  '/feed',
  '/feed/',
  '/rss',
  '/rss/',
  '/rss.xml',
  '/atom.xml',
  '/feed.xml',
  '/index.xml',
  '/feeds/posts/default?alt=rss'
];

const CATEGORY_HINTS = [
  ['ai-models', /\b(ai|artificial intelligence|machine learning|llm|openai|deepmind|anthropic|model)\b|人工智能|大模型|机器学习/i],
  ['research', /\b(research|science|paper|journal|arxiv|nature|mit|stanford)\b|科研|论文|研究/i],
  ['open-source', /\b(open source|github|developer|programming|software|engineering)\b|开源|开发者|编程/i],
  ['chips-compute', /\b(chip|semiconductor|gpu|cpu|nvidia|compute|hardware)\b|芯片|半导体|算力/i],
  ['cybersecurity', /\b(security|cyber|hack|breach|vulnerability|malware)\b|安全|漏洞|网络安全/i],
  ['cloud', /\b(cloud|aws|azure|kubernetes|serverless|devops)\b|云|云计算/i],
  ['automotive', /\b(auto|vehicle|ev|tesla|battery|mobility)\b|汽车|电动车|新能源车/i],
  ['fintech', /\b(fintech|crypto|blockchain|bank|payment)\b|金融科技|区块链|支付/i],
  ['economy-stock', /\b(market|stock|finance|economy|invest|wall street)\b|财经|经济|股票|投资/i],
  ['healthcare', /\b(health|medical|biotech|medicine|pharma)\b|医疗|健康|生物/i],
  ['space', /\b(space|nasa|rocket|satellite|orbital)\b|太空|航天|卫星/i],
  ['devices', /\b(device|phone|apple|android|gadget|consumer tech)\b|硬件|数码|手机/i]
];

const DOMESTIC_TLDS = new Set(['cn', 'com.cn', 'net.cn', 'org.cn']);

function withTimeout(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function inferRegion(url, text = '') {
  const host = getHostname(url);
  const lowerText = String(text || '').toLowerCase();
  const parts = host.split('.');
  const tld = parts.slice(-2).join('.') === 'com.cn' ? 'com.cn' : parts.at(-1);
  if (DOMESTIC_TLDS.has(tld) || /(^|\.)36kr\.com$|qbitai|jiqizhixin|sspai|huxiu|ithome|oschina/i.test(host)) return 'domestic';
  if (/china|chinese|beijing|shanghai|shenzhen|hong kong|中国|中文|国内/.test(lowerText)) return 'domestic';
  return 'overseas';
}

export function inferCategory(candidate) {
  const text = `${candidate.title || ''} ${candidate.description || ''} ${candidate.url || ''}`.toLowerCase();
  return CATEGORY_HINTS.find(([, pattern]) => pattern.test(text))?.[0] || 'open-source';
}

export function inferSuggestedGrade(candidate) {
  const score = candidate.score || 0;
  const itemCount = candidate.itemCount || 0;
  const host = getHostname(candidate.url);
  if (/\b(arxiv|nature|science|mit|stanford|openai|deepmind|anthropic|nvidia|microsoft|google|aws|reuters|bloomberg|ft)\b/i.test(host)) return 'A';
  if (score >= 92 && itemCount >= 15) return 'B';
  if (score >= 75 && itemCount >= 8) return 'C';
  return 'D';
}

function addCandidateIntelligence(candidate) {
  const category = inferCategory(candidate);
  return {
    ...candidate,
    suggestedRegion: inferRegion(candidate.url, `${candidate.title || ''} ${candidate.description || ''}`),
    suggestedCategory: category,
    suggestedGrade: inferSuggestedGrade(candidate),
    tags: [...new Set(['discovered', candidate.sourceType || 'rss', category].filter(Boolean))]
  };
}

function mergeEquivalentCandidates(candidates) {
  const grouped = new Map();
  candidates.forEach(candidate => {
    const host = getHostname(candidate.url);
    const titleKey = cleanText(candidate.title || host).toLowerCase();
    const descriptionKey = cleanText(candidate.description || '').toLowerCase().slice(0, 80);
    const key = `${host}|${titleKey}|${descriptionKey}|${candidate.itemCount || 0}`;
    const existing = grouped.get(key);
    if (!existing || (candidate.score || 0) > (existing.score || 0) || candidate.discoveredVia === 'html-link') {
      grouped.set(key, candidate);
    }
  });
  return [...grouped.values()];
}

export function normalizeCandidateUrl(input, baseUrl) {
  try {
    const value = String(input || '').trim();
    if (!value) return '';
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
}

export function guessSourceName(url, title = '') {
  const cleanedTitle = cleanText(title).replace(/\s*(RSS|Atom|Feed)\s*$/i, '').trim();
  if (cleanedTitle && cleanedTitle.length <= 80) return cleanedTitle;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.split('.')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  } catch {
    return 'Custom Feed';
  }
}

export function extractFeedLinks(html, siteUrl) {
  const links = [];
  const pattern = /<link\b([^>]+)>/gi;
  for (const match of html.matchAll(pattern)) {
    const attrs = match[1] || '';
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
    const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1] || '';
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1] || '';
    const title = decodeEntities(attrs.match(/\btitle=["']([^"']+)["']/i)?.[1] || '');
    const looksLikeFeed = /alternate/i.test(rel) && /(rss|atom|feed|xml)/i.test(`${type} ${href} ${title}`);
    if (!looksLikeFeed) continue;
    const url = normalizeCandidateUrl(href, siteUrl);
    if (url) links.push({ url, title, discoveredVia: 'html-link' });
  }
  return links;
}

export function buildCommonFeedCandidates(siteUrl) {
  const url = new URL(siteUrl);
  return COMMON_FEED_PATHS.map(path => ({
    url: new URL(path, `${url.protocol}//${url.host}`).toString(),
    title: '',
    discoveredVia: 'common-path'
  }));
}

export async function fetchText(url, timeoutMs = 8000) {
  const { controller, timeout } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8,*/*;q=0.5' },
      signal: controller.signal
    });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateFeedUrl(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  if (!url) return { ok: false, message: 'URL is required' };
  if (!isSafeUrl(url)) return { ok: false, message: 'URL points to a blocked destination' };

  try {
    const { response, text } = await fetchText(url, timeoutMs);
    if (!response.ok) return { ok: false, message: `HTTP ${response.status}`, status: response.status, url };

    const isFeed = /<rss\b|<feed\b|<channel\b/i.test(text);
    if (!isFeed) return { ok: false, message: 'Not a valid RSS/Atom feed', status: response.status, url };

    const items = matchBlocks(text, 'item').length || matchBlocks(text, 'entry').length;
    const root = matchBlocks(text, 'channel').concat(matchBlocks(text, 'feed')).join('');
    const title = cleanText(pick(root, ['title'])) || guessSourceName(url);
    const description = cleanText(pick(root, ['description', 'subtitle']));
    const updated = cleanText(pick(root, ['lastBuildDate', 'updated']));
    const score = Math.min(100, 45 + Math.min(items, 30) * 2 + (title ? 10 : 0));

    return {
      ok: true,
      url,
      title,
      description,
      updated,
      itemCount: items,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      score,
      message: 'Feed is valid'
    };
  } catch (error) {
    return { ok: false, url, message: error.name === 'AbortError' ? 'Request timed out' : error.message };
  }
}

export async function discoverSourceCandidates(inputUrl) {
  if (!inputUrl) return { ok: false, message: 'URL is required', candidates: [] };
  const siteUrl = normalizeCandidateUrl(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
  if (!siteUrl) return { ok: false, message: 'Invalid URL', candidates: [] };
  if (!isSafeUrl(siteUrl)) return { ok: false, message: 'URL points to a blocked destination', candidates: [] };

  const directValidation = await validateFeedUrl(siteUrl, { timeoutMs: 7000 });
  if (directValidation.ok) {
    return {
      ok: true,
      siteUrl,
      candidates: [addCandidateIntelligence({ ...directValidation, discoveredVia: 'direct-feed', sourceType: 'rss' })]
    };
  }

  let html = '';
  try {
    const fetched = await fetchText(siteUrl, 8000);
    if (fetched.response.ok) html = fetched.text;
  } catch {}

  const discovered = html ? extractFeedLinks(html, siteUrl) : [];
  const common = buildCommonFeedCandidates(siteUrl);
  const dedupedMap = new Map();
  [...discovered, ...common].forEach(candidate => {
    if (!candidate.url || !isSafeUrl(candidate.url)) return;
    const key = candidate.url.replace(/\/$/, '');
    if (!dedupedMap.has(key)) dedupedMap.set(key, candidate);
  });

  const validations = await Promise.all(
    [...dedupedMap.values()].slice(0, 12).map(async candidate => {
      const result = await validateFeedUrl(candidate.url, { timeoutMs: candidate.discoveredVia === 'html-link' ? 8000 : 4500 });
      return {
        ...candidate,
        ...result,
        title: result.title || candidate.title || guessSourceName(candidate.url),
        sourceType: 'rss'
      };
    })
  );

  const candidates = mergeEquivalentCandidates(validations
    .filter(candidate => candidate.ok)
    .map(addCandidateIntelligence))
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.itemCount || 0) - (a.itemCount || 0));

  return {
    ok: candidates.length > 0,
    siteUrl,
    candidates,
    checkedCount: validations.length,
    message: candidates.length > 0 ? 'Feed candidates discovered' : 'No valid RSS/Atom feed found'
  };
}
