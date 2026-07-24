const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'the', 'to', 'with',
  'new', 'launch', 'release', 'update', 'ai', '人工智能', '发布', '推出', '更新',
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canonicalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    url.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(value).trim().replace(/\/$/, '').toLowerCase();
  }
}

function titleTokens(value = '') {
  const normalized = String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = normalized.split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token));
  if (words.length > 1) return new Set(words);

  const compact = normalized.replace(/\s/g, '');
  if (compact.length <= 2) return new Set(compact ? [compact] : []);
  return new Set(Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2)));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach(token => {
    if (right.has(token)) intersection += 1;
  });
  return intersection / (left.size + right.size - intersection);
}

function entityOverlap(left = [], right = []) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach(entity => {
    if (b.has(entity)) intersection += 1;
  });
  return intersection / Math.min(a.size, b.size);
}

function selectPrimary(items) {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.intelligenceScore || 0) - (a.intelligenceScore || 0);
    if (scoreDiff) return scoreDiff;
    const impactDiff = (b.impactScore || 0) - (a.impactScore || 0);
    if (impactDiff) return impactDiff;
    return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
  })[0];
}

function clusterConfidence(items, sources) {
  const sourceSignal = clamp(sources.length * 18, 18, 54);
  const scoreSignal = clamp(Math.max(...items.map(item => item.intelligenceScore || 0)) * 0.36, 0, 36);
  const entitySignal = new Set(items.flatMap(item => item.entities || [])).size ? 10 : 0;
  return Math.round(clamp(sourceSignal + scoreSignal + entitySignal, 0, 100));
}

export function clusterIntelligenceEvents(items = [], options = {}) {
  const threshold = clamp(Number(options.similarityThreshold || 0.7), 0.4, 1);
  const windowMs = Math.max(1, Number(options.windowHours || 72)) * 3_600_000;
  const candidates = [...items]
    .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
    .map(item => ({
      item,
      url: canonicalUrl(item.url),
      tokens: titleTokens(item.title),
      at: Date.parse(item.publishedAt) || 0,
    }));

  const clusters = [];

  candidates.forEach(candidate => {
    const match = clusters.find(cluster => {
      const anchor = cluster.anchor;
      if (candidate.url && anchor.url && candidate.url === anchor.url) return true;
      if (Math.abs(candidate.at - anchor.at) > windowMs) return false;
      if (candidate.item.category && anchor.item.category && candidate.item.category !== anchor.item.category) return false;
      const titleSimilarity = jaccard(candidate.tokens, anchor.tokens);
      const entitySimilarity = entityOverlap(candidate.item.entities, anchor.item.entities);
      return titleSimilarity >= threshold || (entitySimilarity >= 0.5 && titleSimilarity >= 0.42);
    });

    if (match) match.items.push(candidate.item);
    else clusters.push({ anchor: candidate, items: [candidate.item] });
  });

  return clusters.map((cluster, index) => {
    const primary = selectPrimary(cluster.items);
    const sources = [...new Set(cluster.items.map(item => item.source).filter(Boolean))];
    const entities = [...new Set(cluster.items.flatMap(item => item.entities || []))];
    const firstSeenAt = new Date(Math.min(...cluster.items.map(item => Date.parse(item.publishedAt) || Date.now()))).toISOString();
    const lastSeenAt = new Date(Math.max(...cluster.items.map(item => Date.parse(item.publishedAt) || Date.now()))).toISOString();

    return {
      id: primary.canonicalId || `intel-event-${index}-${primary.id}`,
      title: primary.title,
      summary: primary.summary,
      category: primary.category,
      categoryLabel: primary.categoryLabel,
      primaryItemId: primary.id,
      articleIds: cluster.items.map(item => item.id),
      articles: cluster.items,
      entities,
      sources,
      independentSourceCount: sources.length || 1,
      firstSeenAt,
      lastSeenAt,
      heatScore: Math.round(Math.max(...cluster.items.map(item => item.heatScore || 0))),
      impactScore: Math.round(Math.max(...cluster.items.map(item => item.impactScore || 0))),
      intelligenceScore: Math.round(Math.max(...cluster.items.map(item => item.intelligenceScore || 0))),
      confidence: clusterConfidence(cluster.items, sources),
      citations: cluster.items.map(item => ({
        id: item.id,
        title: item.title,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
      })),
      reasons: primary.reasons || [],
    };
  }).sort((a, b) => (b.intelligenceScore || 0) - (a.intelligenceScore || 0));
}
