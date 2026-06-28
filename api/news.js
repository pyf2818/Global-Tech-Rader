import { DEFAULT_SOURCES, SOURCE_WEIGHTS, CROSS_VERIFY_THRESHOLD, CATEGORIES, CATEGORY_RULES, TAG_RULES } from '../server/news/config/constants.js';
import { getSourceGradeInfo } from '../server/news/config/sourceGrades.js';

let cache = { data: null, expiresAt: 0 };
// ========== Jina AI Reader（绕过反爬虫）==========
async function jinaFetch(url, timeoutMs = 8000) {
  try {
    const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(jinaUrl, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const text = await response.text();
    return text.trim().slice(0, 500);
  } catch {
    return null;
  }
}

// 多源交叉验证
function crossVerifyItems(items) {
  const urlMap = new Map();
  items.forEach(item => {
    const normalized = String(item.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!urlMap.has(normalized)) urlMap.set(normalized, []);
    urlMap.get(normalized).push(item);
  });

  return items.map(item => {
    const normalized = String(item.url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const sameUrlItems = urlMap.get(normalized) || [];
    const sourceCount = sameUrlItems.length;
    let crossVerifyScore = sourceCount >= CROSS_VERIFY_THRESHOLD ? 3 : sourceCount >= 2 ? 2 : 1;
    const sourceWeight = SOURCE_WEIGHTS[item.source] || 0.5;
    return {
      ...item,
      crossVerifyScore,
      sourceWeight,
      qualityScore: Math.round((crossVerifyScore * sourceWeight) * 10) / 10
    };
  });
}

async function fetchSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'GlobalTechRadar/0.1 (+https://vercel)' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`${source.name} responded ${response.status}`);

    const xml = await response.text();
    const items = parseFeed(xml, source).slice(0, 20);
    
    // 尝试用 Jina AI Reader 增强摘要
    if (items.length > 0) {
      await Promise.allSettled(items.slice(0, 3).map(async (item) => {
        if (!item.summary || item.summary.length < 100) {
          const enhanced = await jinaFetch(item.url, 5000);
          if (enhanced) {
            item.summary = enhanced.length > 160 ? `${enhanced.slice(0, 160)}...` : enhanced;
          }
        }
      }));
    }
    
    return { source: source.name, items };
  } catch (e) {
    return { source: source.name, items: [], error: e.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml, source) {
  const itemPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks = [...xml.matchAll(itemPattern)].map(m => m[2]);
  return blocks.map((block, index) => normalizeItem(block, source, index)).filter(item => item.title && item.url);
}

function normalizeItem(block, source, index) {
  const title = cleanText(pick(block, ['title']));
  const rawSummary = cleanText(pick(block, ['description', 'summary']));
  const bodyIntro = trimIntro(cleanText(pick(block, ['content:encoded', 'content'])));
  const summary = trimSummary(rawSummary || bodyIntro);
  const url = cleanText(pick(block, ['link'])) || pickAtomLink(block);
  const publishedAt = normalizeDate(pick(block, ['pubDate', 'published', 'updated', 'dc:date']));
  const text = `${title} ${summary} ${bodyIntro} ${source.name}`;
  const category = detectCategory(text, source.defaultCategory);
  const tags = detectTags(text, category);

  return {
    id: hash(`${source.name}-${url}-${index}`),
    title,
    summary,
    bodyIntro,
    url,
    source: source.name,
    sourceUrl: source.url,
    region: source.region,
    category,
    mode: detectMode(text, source.name),
    publishedAt,
    tags
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
  if (!value) return '暂无摘要，请前往原文查看完整内容。';
  return value.length > 160 ? `${value.slice(0, 160).trim()}...` : value;
}

function trimIntro(value) {
  if (!value) return '';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > 220 ? `${compact.slice(0, 220).trim()}...` : compact;
}

function normalizeDate(value) {
  const time = new Date(cleanText(value)).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function detectCategory(text, fallback) {
  return CATEGORY_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? fallback;
}

function detectTags(text, category) {
  const tags = TAG_RULES.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  const categoryLabel = CATEGORIES.find(item => item.id === category)?.label;
  return [...new Set([...tags, categoryLabel].filter(Boolean))].slice(0, 4);
}

function detectMode(text, sourceName) {
  if (/\b(how to|tutorial|guide|developer|api|release|open source|github|技术|教程|开源|implementation)\b/i.test(text)) return 'technical';
  if (/\b(analysis|review|why|inside|research|study|report|解读|研究|报告|deep dive)\b/i.test(text) || /MIT|ArXiv|Nature/i.test(sourceName)) return 'deep';
  return 'flash';
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

function applyBlockedWords(items, blocked) {
  if (!blocked.length) return items;
  return items.filter(item => {
    const searchable = `${item.title} ${item.summary} ${item.source} ${item.tags.join(' ')}`.toLowerCase();
    return blocked.every(word => !searchable.includes(word));
  });
}

export default async function handler(req, res) {
  const now = Date.now();
  const blocked = (req.query.blocked || '')
    .split(',')
    .map(word => word.trim().toLowerCase())
    .filter(Boolean);

  const disabledSources = (req.query.disabledSources || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const filteredSources = DEFAULT_SOURCES.filter(s => !disabledSources.includes(s.name));

  if (!blocked.length && !disabledSources.length && cache.data && cache.expiresAt > now) {
    const filtered = applyBlockedWords(cache.data.items, blocked);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      ...cache.data,
      items: filtered,
      blockedCount: cache.data.items.length - filtered.length
    }));
  }

  const settled = await Promise.allSettled(filteredSources.map(fetchSource));
  const sourceResults = settled
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value);
  const items = sourceResults.flatMap(result => result.items);
  const failedSources = settled.filter(result => result.status === 'rejected').length;

  const cleaned = applyBlockedWords(items, blocked)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // 多源交叉验证 + 质量评分
  const verified = crossVerifyItems(cleaned);
  verified.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

  // 为每个 item 注入源等级信息（与 dev 端 newsService.js 保持一致）
  verified.forEach(item => {
    const gradeInfo = getSourceGradeInfo(item.source);
    item.sourceGrade = gradeInfo.weight;
    item.sourceGradeLabel = gradeInfo.label;
    item.sourceGradeColor = gradeInfo.color;
    item.sourceGradeIcon = gradeInfo.icon;
  });

  const filtered = verified.slice(0, 360);
  const payload = {
    updatedAt: new Date().toISOString(),
    items: filtered,
    sourceCount: filteredSources.length,
    failedSources,
    blockedCount: items.length - filtered.length
  };

  if (!blocked.length && !disabledSources.length) {
    cache = { data: payload, expiresAt: now + 1000 * 60 * 5 };
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}