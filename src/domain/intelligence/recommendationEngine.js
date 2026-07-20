import { domainTierScore, sourceTierScore } from './profileTiers.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = value => Math.round(value * 100) / 100;
const sumParts = parts => Object.values(parts).reduce((total, value) => total + Number(value || 0), 0);

export function freshnessScore(publishedAt, now = Date.now(), max = 30) {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return 0;
  const hours = Math.max(0, (now - published) / 3_600_000);
  return round(clamp(max * Math.exp(-hours / 12), 0, max));
}

export function matchSpecialFollow(item, rules = []) {
  const titleAndSummary = `${item.title || ''} ${item.summary || ''}`.toLocaleLowerCase();
  const source = String(item.source || item.author || '').toLocaleLowerCase();
  const url = String(item.url || item.link || '').toLocaleLowerCase();

  return rules.reduce((best, rule) => {
    const target = String(rule.target || rule.name || rule.url || '').trim().toLocaleLowerCase();
    if (!target) return best;
    if ((rule.type === 'source' || rule.type === 'author' || !rule.type) && source.includes(target)) {
      return Math.max(best, 25);
    }
    if (rule.type === 'keyword' && titleAndSummary.includes(target)) return Math.max(best, 18);
    if (rule.type === 'url' && url.includes(target)) return Math.max(best, 18);
    return best;
  }, 0);
}

export function buildRecommendation(item, context = {}) {
  const publicParts = {
    freshness: freshnessScore(item.publishedAt, context.now, 30),
    corroboration: clamp((context.independentSourceCount || 1) * 6.25, 0, 25),
    sourceQuality: clamp(Number(item.sourceQualityScore ?? context.sourceQualityScore ?? 10), 0, 20),
    trend: clamp(Number(context.trendVelocity || 0) * 15, 0, 15),
    completeness: clamp(((item.summary?.length || 0) / 160) * 8 + (item.imageUrl ? 1 : 0) + (item.videoUrl ? 1 : 0), 0, 10),
  };
  const personalParts = {
    domain: domainTierScore(context.domainTiers?.[item.category]),
    source: sourceTierScore(context.sourceTiers?.[item.source]),
    specialFollow: matchSpecialFollow(item, context.specialFollows),
    freshness: freshnessScore(item.publishedAt, context.now, 15),
    behavior: clamp(Number(context.behaviorSignal || 0), -10, 10),
    novelty: context.isNovel === false ? 0 : 5,
  };
  const publicScore = round(clamp(sumParts(publicParts), 0, 100));
  const personalScore = round(clamp(sumParts(personalParts), 0, 100));
  const mustReadScore = round(publicScore * 0.5 + personalScore * 0.5);
  const reasons = buildReasons(publicParts, personalParts);

  return {
    ...item,
    publicScore,
    personalScore,
    mustReadScore,
    scoreParts: { public: publicParts, personal: personalParts },
    recommendationScoreParts: { ...personalParts, publicSignal: round(publicScore * 0.5) },
    reasons,
    recommendationReasons: reasons,
    recommendation: reasons.join(' · ') || '综合热度、来源质量和新鲜度较高',
  };
}

function buildReasons(publicParts, personalParts) {
  return [
    personalParts.specialFollow > 0 && '命中特别关注',
    personalParts.domain >= 14 && '匹配关注领域',
    personalParts.source >= 11 && '来自高信任信源',
    publicParts.corroboration >= 12.5 && '多个独立来源印证',
    publicParts.freshness >= 20 && '发布时间较新',
    publicParts.sourceQuality >= 15 && '来源质量较高',
  ].filter(Boolean).slice(0, 3);
}

export function selectBriefingLanes(items = [], options = {}) {
  const perLane = Math.max(1, Number(options.perLane || 5));
  const maxPerSource = Math.max(1, Number(options.maxPerSource || 2));
  const maxCategoryRatio = clamp(Number(options.maxCategoryRatio || 0.4), 0.1, 1);
  const usedEvents = new Set();
  const diagnostics = { relaxedSelections: 0, rejectedDuplicates: 0 };

  const select = scoreKey => {
    const sorted = [...items].sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0) || String(a.id).localeCompare(String(b.id)));
    const selected = [];
    const sources = new Map();
    const categories = new Map();
    const categoryLimit = Math.max(1, Math.floor(perLane * maxCategoryRatio));

    const trySelect = (item, relaxed = false) => {
      const eventId = item.canonicalId || item.eventClusterId || item.id;
      if (!eventId || usedEvents.has(eventId)) {
        diagnostics.rejectedDuplicates += 1;
        return;
      }
      const sourceCount = sources.get(item.source || '') || 0;
      const categoryCount = categories.get(item.category || '') || 0;
      if (!relaxed && (sourceCount >= maxPerSource || categoryCount >= categoryLimit)) return;
      selected.push(item);
      usedEvents.add(eventId);
      sources.set(item.source || '', sourceCount + 1);
      categories.set(item.category || '', categoryCount + 1);
      if (relaxed) diagnostics.relaxedSelections += 1;
    };

    sorted.forEach(item => { if (selected.length < perLane) trySelect(item); });
    sorted.forEach(item => { if (selected.length < perLane) trySelect(item, true); });
    return selected;
  };

  return { public: select('publicScore'), personal: select('personalScore'), diagnostics };
}

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'is', 'of', 'on', 'the', 'to', 'with', 'new', 'today']);

function canonicalUrl(item) {
  const value = item.canonicalUrl || item.url || item.link;
  if (!value) return '';
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => parsed.searchParams.delete(key));
    return parsed.toString().replace(/\/$/, '').toLocaleLowerCase();
  } catch {
    return String(value).trim().replace(/\/$/, '').toLocaleLowerCase();
  }
}

function titleTokens(title = '') {
  const normalized = String(title).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(token => token.length > 1 && !STOP_WORDS.has(token));
  if (words.length > 1) return new Set(words);
  const compact = normalized.replace(/\s/g, '');
  return new Set(Array.from({ length: Math.max(0, compact.length - 1) }, (_, index) => compact.slice(index, index + 2)));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach(token => { if (right.has(token)) intersection += 1; });
  return intersection / (left.size + right.size - intersection);
}

export function clusterEvents(items = [], options = {}) {
  const maxItems = Math.min(500, Math.max(1, Number(options.maxItems || 500)));
  const threshold = clamp(Number(options.similarityThreshold || 0.72), 0.4, 1);
  const windowMs = Math.max(1, Number(options.windowHours || 48)) * 3_600_000;
  const candidates = [...items]
    .sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))
    .slice(0, maxItems)
    .map(item => ({ item, url: canonicalUrl(item), tokens: titleTokens(item.title), at: Date.parse(item.publishedAt) || 0 }));
  const clusters = [];

  candidates.forEach(candidate => {
    const match = clusters.find(cluster => {
      const anchor = cluster._anchor;
      if (candidate.url && anchor.url && candidate.url === anchor.url) return true;
      if (Math.abs(candidate.at - anchor.at) > windowMs) return false;
      return jaccard(candidate.tokens, anchor.tokens) >= threshold;
    });
    if (match) match.items.push(candidate.item);
    else clusters.push({ _anchor: candidate, items: [candidate.item] });
  });

  return clusters.map((cluster, index) => {
    const independentSources = [...new Set(cluster.items.map(item => item.source).filter(Boolean))];
    const primaryItem = [...cluster.items].sort((a, b) => (b.mustReadScore || 0) - (a.mustReadScore || 0) || (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0))[0];
    return {
      id: primaryItem.canonicalId || `event-${index}-${primaryItem.id}`,
      primaryItem,
      items: cluster.items,
      itemIds: cluster.items.map(item => item.id),
      independentSources,
      independentSourceCount: independentSources.length || 1,
    };
  });
}
