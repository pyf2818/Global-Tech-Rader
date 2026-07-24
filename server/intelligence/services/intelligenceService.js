import { fetchAiHotItems } from '../collectors/aihotCollector.js';
import { fetchRssIntelligenceItems } from '../collectors/rssCollector.js';
import { normalizeAiHotItems, normalizeRssItems } from '../processors/normalizeItem.js';
import { scoreIntelligenceItems } from '../processors/impactScore.js';
import { clusterIntelligenceEvents } from '../processors/eventCluster.js';
import { buildDailyIntelligenceBriefing } from '../processors/dailyBriefing.js';
import { createIntelligenceRepository } from '../repositories/intelligenceRepository.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(options) {
  return JSON.stringify({
    mode: options.mode || 'selected',
    take: options.take || 50,
    category: options.category || '',
    since: options.since || '',
    q: options.q || '',
    cursor: options.cursor || '',
    providers: options.providers || 'all',
  });
}

function fromCache(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.payload;
}

function setCache(key, payload) {
  cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

function parseOptions(params = {}) {
  return {
    mode: params.mode === 'all' ? 'all' : 'selected',
    take: Math.min(100, Math.max(1, Number.parseInt(params.take || '50', 10) || 50)),
    category: String(params.category || '').trim(),
    since: String(params.since || '').trim(),
    q: String(params.q || params.query || '').trim(),
    cursor: String(params.cursor || '').trim(),
    providers: String(params.providers || 'all').trim(),
    perSource: Math.min(20, Math.max(1, Number.parseInt(params.perSource || '6', 10) || 6)),
    sources: String(params.sources || '').trim(),
  };
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.intelligenceScore || 0) - (a.intelligenceScore || 0);
    if (scoreDiff) return scoreDiff;
    return (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0);
  });
}

export async function getIntelligenceItems(params = {}) {
  const options = parseOptions(params);
  const key = cacheKey(options);
  const cached = fromCache(key);
  if (cached) return { ...cached, cache: { hit: true, ttlSeconds: CACHE_TTL_MS / 1000 } };

  const providerSet = new Set(String(options.providers || 'all').split(',').map(item => item.trim()).filter(Boolean));
  const useAll = providerSet.has('all') || providerSet.size === 0;
  const tasks = [];
  if (useAll || providerSet.has('aihot')) tasks.push(fetchAiHotItems(options).then(result => ({ kind: 'aihot', result })));
  if (useAll || providerSet.has('rss')) tasks.push(fetchRssIntelligenceItems({ ...options, perSource: options.perSource, sources: options.sources }).then(result => ({ kind: 'rss', result })));

  const settled = await Promise.allSettled(tasks);
  const diagnostics = { providers: [], failedProviders: [] };
  const normalized = settled.flatMap(result => {
    if (result.status !== 'fulfilled') {
      diagnostics.failedProviders.push({ provider: 'unknown', error: result.reason?.message || 'fetch failed' });
      return [];
    }
    const { kind, result: payload } = result.value;
    diagnostics.providers.push({
      provider: kind,
      count: payload.items?.length || 0,
      sourceCount: payload.sourceCount,
      successfulSources: payload.successfulSources,
      failedSources: payload.failedSources,
    });
    return kind === 'aihot'
      ? normalizeAiHotItems(payload.items)
      : normalizeRssItems(payload.items);
  });

  if (!normalized.length && diagnostics.failedProviders.length) {
    throw new Error('All intelligence providers failed');
  }

  const scored = sortItems(scoreIntelligenceItems(dedupeItems(normalized))).slice(0, options.take);
  const payload = {
    ok: true,
    version: 1,
    source: useAll ? 'multi' : [...providerSet].join(','),
    mode: options.mode,
    updatedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
    count: scored.length,
    hasNext: false,
    nextCursor: null,
    items: scored,
    diagnostics,
    cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
  };
  setCache(key, payload);
  return payload;
}

export async function getAgentIntelligenceContext(params = {}) {
  const take = Math.min(30, Math.max(8, Number.parseInt(params.take || '16', 10) || 16));
  const payload = await getIntelligenceItems({ ...params, take });
  const topItems = payload.items.slice(0, take);

  return {
    ok: true,
    version: 1,
    generatedAt: new Date().toISOString(),
    source: payload.source,
    mode: payload.mode,
    briefing: {
      title: 'AI Intelligence Context',
      oneLine: buildOneLine(topItems),
      topEvents: topItems.slice(0, 8).map(toAgentEvent),
      watchEntities: topEntities(topItems),
      suggestedQuestions: [
        'Which AI events have the highest industry impact today?',
        'Which companies or models should I track next?',
        'What changed for developers, enterprises, or investors?',
      ],
    },
    citations: topItems.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
    })),
    cache: payload.cache,
  };
}

export async function getIntelligenceEvents(params = {}) {
  const take = Math.min(100, Math.max(12, Number.parseInt(params.take || '50', 10) || 50));
  const payload = await getIntelligenceItems({ ...params, take });
  const events = clusterIntelligenceEvents(payload.items);

  return {
    ok: true,
    version: 1,
    source: payload.source,
    mode: payload.mode,
    updatedAt: payload.updatedAt,
    count: events.length,
    events,
    cache: payload.cache,
  };
}

export async function syncIntelligenceSnapshot(params = {}) {
  const take = Math.min(100, Math.max(12, Number.parseInt(params.take || '60', 10) || 60));
  const itemsPayload = await getIntelligenceItems({ ...params, take });
  const events = clusterIntelligenceEvents(itemsPayload.items);
  const repository = createIntelligenceRepository();
  const saved = await repository.upsertArticlesAndEvents({
    articles: itemsPayload.items,
    events,
  });

  return {
    ok: true,
    version: 1,
    syncedAt: new Date().toISOString(),
    source: itemsPayload.source,
    mode: itemsPayload.mode,
    saved,
    diagnostics: itemsPayload.diagnostics,
  };
}

export async function getStoredIntelligenceEvents(params = {}) {
  const repository = createIntelligenceRepository();
  const events = await repository.listEvents({
    limit: params.take || params.limit || 30,
    category: params.category || '',
  });
  return {
    ok: true,
    version: 1,
    source: 'stored',
    updatedAt: new Date().toISOString(),
    count: events.length,
    events,
  };
}

export async function getStoredIntelligenceArticles(params = {}) {
  const repository = createIntelligenceRepository();
  const articles = await repository.listArticles({ limit: params.take || params.limit || 50 });
  return {
    ok: true,
    version: 1,
    source: 'stored',
    updatedAt: new Date().toISOString(),
    count: articles.length,
    items: articles,
  };
}

export async function getDailyIntelligenceBriefing(params = {}) {
  const take = Math.min(100, Math.max(12, Number.parseInt(params.take || '60', 10) || 60));
  const liveEvents = await getIntelligenceEvents({ ...params, take });
  return buildDailyIntelligenceBriefing({
    events: liveEvents.events,
    date: params.date || new Date().toISOString().slice(0, 10),
    source: liveEvents.source,
  });
}

function buildOneLine(items) {
  if (!items.length) return 'No current AI intelligence items are available.';
  const lead = items[0];
  return `${lead.title} leads the current AI intelligence feed with impact ${lead.impactScore}.`;
}

function toAgentEvent(item) {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    category: item.category,
    categoryLabel: item.categoryLabel,
    source: item.source,
    url: item.url,
    publishedAt: item.publishedAt,
    entities: item.entities,
    heatScore: item.heatScore,
    impactScore: item.impactScore,
    intelligenceScore: item.intelligenceScore,
    reasons: item.reasons,
  };
}

function topEntities(items) {
  const counts = new Map();
  items.forEach(item => {
    item.entities?.forEach(entity => counts.set(entity, (counts.get(entity) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function dedupeItems(items = []) {
  const seen = new Set();
  return items.filter(item => {
    const key = String(item.url || item.id || '').toLowerCase().replace(/[?#].*$/, '').replace(/\/$/, '');
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
