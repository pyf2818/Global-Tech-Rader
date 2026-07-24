import { parseFeed } from '../../news/parsing/feedParser.js';

export const INTELLIGENCE_RSS_SOURCES = Object.freeze([
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', region: 'global', defaultCategory: 'ai-models', tier: 'official', trustAllItems: true, enabledByDefault: true },
  { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/', region: 'global', defaultCategory: 'ai-products', tier: 'official', trustAllItems: true, enabledByDefault: true },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss', region: 'global', defaultCategory: 'ai-models', tier: 'official', trustAllItems: true, enabledByDefault: false },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss/', region: 'global', defaultCategory: 'ai-models', tier: 'official', trustAllItems: true, enabledByDefault: false },
  { name: 'Google Research Blog', url: 'https://research.google/blog/rss/', region: 'global', defaultCategory: 'paper', tier: 'official', enabledByDefault: false },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', region: 'global', defaultCategory: 'ai-models', tier: 'official', trustAllItems: true, enabledByDefault: false },
  { name: 'GitHub Blog AI', url: 'https://github.blog/feed/', region: 'global', defaultCategory: 'ai-products', tier: 'developer', enabledByDefault: false },
  { name: 'ArXiv CS AI', url: 'https://export.arxiv.org/rss/cs.AI', region: 'global', defaultCategory: 'paper', tier: 'research', trustAllItems: true, enabledByDefault: false },
  { name: 'ArXiv CS ML', url: 'https://export.arxiv.org/rss/cs.LG', region: 'global', defaultCategory: 'paper', tier: 'research', trustAllItems: true, enabledByDefault: false },
  { name: 'ArXiv CS CL', url: 'https://export.arxiv.org/rss/cs.CL', region: 'global', defaultCategory: 'paper', tier: 'research', trustAllItems: true, enabledByDefault: false },
]);

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const AI_RELEVANCE_PATTERN = /\b(ai|artificial intelligence|machine learning|ml|llm|large language model|gpt|claude|gemini|agent|agents|copilot|deep learning|neural|transformer|diffusion|rag|inference|model|open source model|人工智能|大模型|模型|智能体|机器学习|深度学习|推理|多模态|开源模型)\b/i;

function boundedPerSource(value) {
  const parsed = Number.parseInt(value ?? '8', 10);
  return Math.min(20, Math.max(1, Number.isFinite(parsed) ? parsed : 8));
}

function selectSources(options = {}) {
  const sourceParam = String(options.sources || '').trim();
  if (!sourceParam) return INTELLIGENCE_RSS_SOURCES.filter(source => source.enabledByDefault !== false);
  const requested = new Set(sourceParam.split(',').map(item => item.trim()).filter(Boolean));
  return INTELLIGENCE_RSS_SOURCES.filter(source => requested.has(source.name) || requested.has(source.tier));
}

export async function fetchRssIntelligenceSource(source, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || 9_000));

  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'User-Agent': BROWSER_USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw Object.assign(new Error(`${source.name} responded ${response.status}`), { status: response.status });
    }

    const xml = await response.text();
    const parsed = parseFeed(xml, source);
    const relevant = source.trustAllItems
      ? parsed
      : parsed.filter(item => AI_RELEVANCE_PATTERN.test(`${item.title || ''} ${item.summary || ''} ${(item.tags || []).join(' ')}`));
    const items = relevant.slice(0, boundedPerSource(options.perSource));
    return {
      provider: 'rss',
      source: source.name,
      tier: source.tier,
      fetchedAt: new Date().toISOString(),
      items,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRssIntelligenceItems(options = {}) {
  const sources = selectSources(options);
  const settled = await Promise.allSettled(sources.map(source => fetchRssIntelligenceSource(source, options)));
  const results = settled.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failures = settled
    .map((result, index) => result.status === 'rejected'
      ? { source: sources[index].name, error: result.reason?.message || 'fetch failed' }
      : null)
    .filter(Boolean);

  return {
    provider: 'rss',
    fetchedAt: new Date().toISOString(),
    sourceCount: sources.length,
    successfulSources: results.length,
    failedSources: failures,
    items: results.flatMap(result => result.items.map(item => ({
      ...item,
      provider: 'rss',
      sourceTier: result.tier,
    }))),
  };
}
