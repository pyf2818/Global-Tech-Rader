const CATEGORY_LABELS = {
  'ai-models': 'Models',
  'ai-products': 'Products',
  industry: 'Industry',
  paper: 'Research',
  tip: 'Techniques',
};

const ENTITY_PATTERNS = [
  ['OpenAI', /\bopenai\b|gpt-?5|gpt-?4|chatgpt|sora/i],
  ['Anthropic', /\banthropic\b|claude/i],
  ['Google', /\bgoogle\b|deepmind|gemini/i],
  ['Meta', /\bmeta\b|llama/i],
  ['Microsoft', /\bmicrosoft\b|copilot/i],
  ['NVIDIA', /\bnvidia\b|cuda|blackwell/i],
  ['Apple', /\bapple\b|apple intelligence/i],
  ['Amazon', /\bamazon\b|aws\b|bedrock/i],
  ['Hugging Face', /hugging\s*face/i],
  ['GitHub', /\bgithub\b/i],
  ['xAI', /\bxai\b|grok/i],
  ['Mistral', /\bmistral\b/i],
  ['Perplexity', /\bperplexity\b/i],
  ['DeepSeek', /\bdeepseek\b/i],
  ['Alibaba', /\balibaba\b|qwen|tongyi/i],
  ['ByteDance', /\bbytedance\b|doubao/i],
];

function stableHash(value) {
  let result = 0;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    result = (result << 5) - result + input.charCodeAt(index);
    result |= 0;
  }
  return Math.abs(result).toString(36);
}

function cleanText(value, maxLength = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizePublishedAt(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString();
}

function extractEntities(text) {
  return ENTITY_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([entity]) => entity);
}

function buildTags(item, entities) {
  return [
    CATEGORY_LABELS[item.category] || '',
    ...entities.slice(0, 3),
    item.source || '',
  ].filter(Boolean).slice(0, 5);
}

export function normalizeAiHotItem(item = {}) {
  const title = cleanText(item.title, 360);
  const summary = cleanText(item.summary, 1200);
  const url = cleanText(item.url || item.sourceUrl, 1200);
  const source = cleanText(item.source || item.sourceName || 'AI HOT', 180);
  const category = cleanText(item.category || 'industry', 80);
  const publishedAt = normalizePublishedAt(item.publishedAt);
  const rawId = cleanText(item.id || `${source}:${url}:${title}`, 500);
  const entities = extractEntities(`${title} ${summary} ${source} ${item.title_en || ''}`);

  return {
    id: `aihot:${rawId || stableHash(`${url}:${title}`)}`,
    upstreamId: rawId,
    provider: 'aihot',
    title,
    titleEn: cleanText(item.title_en || item.titleEn || '', 360),
    summary,
    url,
    source,
    sourceUrl: url,
    category,
    categoryLabel: CATEGORY_LABELS[category] || 'Industry',
    publishedAt,
    entities,
    tags: buildTags({ category, source }, entities),
    evidence: {
      provider: 'AI HOT',
      source,
      url,
      fetchedFrom: 'selected intelligence feed',
    },
  };
}

export function normalizeAiHotItems(items = []) {
  return items
    .map(normalizeAiHotItem)
    .filter(item => item.title && item.url);
}

export function normalizeRssItem(item = {}) {
  const title = cleanText(item.title, 360);
  const summary = cleanText(item.summary || item.bodyIntro, 1200);
  const url = cleanText(item.url, 1200);
  const source = cleanText(item.source || 'RSS Source', 180);
  const category = cleanText(item.category || 'industry', 80);
  const publishedAt = normalizePublishedAt(item.publishedAt);
  const rawId = cleanText(item.id || `${source}:${url}:${title}`, 500);
  const entities = extractEntities(`${title} ${summary} ${source}`);

  return {
    id: `rss:${rawId || stableHash(`${url}:${title}`)}`,
    upstreamId: rawId,
    provider: 'rss',
    title,
    titleEn: '',
    summary,
    url,
    source,
    sourceUrl: item.sourceUrl || url,
    sourceTier: item.sourceTier || '',
    category,
    categoryLabel: CATEGORY_LABELS[category] || 'Industry',
    publishedAt,
    entities,
    tags: [...new Set([...(item.tags || []), ...buildTags({ category, source }, entities)])].slice(0, 6),
    imageUrl: item.imageUrl || '',
    videoUrl: item.videoUrl || '',
    evidence: {
      provider: 'RSS',
      source,
      url,
      fetchedFrom: item.sourceUrl || '',
    },
  };
}

export function normalizeRssItems(items = []) {
  return items
    .map(normalizeRssItem)
    .filter(item => item.title && item.url);
}
