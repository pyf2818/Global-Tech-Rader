import { fetchAiHotItems } from '../collectors/aihotCollector.js';
import { fetchRssIntelligenceItems } from '../collectors/rssCollector.js';
import { normalizeAiHotItems, normalizeRssItems } from '../processors/normalizeItem.js';
import { scoreIntelligenceItems } from '../processors/impactScore.js';
import { clusterIntelligenceEvents } from '../processors/eventCluster.js';
import { buildDailyIntelligenceBriefing } from '../processors/dailyBriefing.js';
import { buildEntityProfiles, findEntityProfile } from '../processors/entityExtract.js';
import { buildOpportunitySignals } from '../processors/opportunityAnalysis.js';
import { applyPersonalScores } from '../processors/personalScore.js';
import { buildProactiveAlerts } from '../processors/proactiveAlerts.js';
import { buildWeeklySectorAnalysis } from '../processors/weeklySectorAnalysis.js';
import { createIntelligenceRepository } from '../repositories/intelligenceRepository.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_INTELLIGENCE_TAKE = 80;
const MAX_INTELLIGENCE_TAKE = 200;
const DEFAULT_AGENT_TAKE = 24;
const MAX_AGENT_TAKE = 60;
const AIHOT_PROVIDER_TAKE = 100;
const cache = new Map();

function boundedNumber(value, fallback, { min = 1, max = MAX_INTELLIGENCE_TAKE } = {}) {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : fallback));
}

function cacheKey(options) {
  return JSON.stringify({
    mode: options.mode || 'selected',
    take: options.take || 50,
    category: options.category || '',
    since: options.since || '',
    q: options.q || '',
    cursor: options.cursor || '',
    providers: options.providers || 'all',
    perSource: options.perSource || '',
    sources: options.sources || '',
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

function providerTask(kind, promise) {
  return promise
    .then(result => ({ kind, result }))
    .catch(error => {
      throw { kind, error };
    });
}

function parseOptions(params = {}) {
  return {
    mode: params.mode === 'all' ? 'all' : 'selected',
    take: boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE),
    category: String(params.category || '').trim(),
    since: String(params.since || '').trim(),
    q: String(params.q || params.query || '').trim(),
    cursor: String(params.cursor || '').trim(),
    providers: String(params.providers || 'all').trim(),
    perSource: boundedNumber(params.perSource, 10, { min: 1, max: 30 }),
    sources: String(params.sources || '').trim(),
    storage: ['live', 'stored', 'auto'].includes(params.storage) ? params.storage : 'live',
    interests: String(params.interests || '').trim(),
    follows: String(params.follows || params.specialFollows || '').trim(),
    sourceTiers: String(params.sourceTiers || '').trim(),
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
  if (useAll || providerSet.has('aihot')) {
    tasks.push(providerTask('aihot', fetchAiHotItems({ ...options, take: Math.min(options.take, AIHOT_PROVIDER_TAKE) })));
  }
  if (useAll || providerSet.has('rss')) {
    tasks.push(providerTask('rss', fetchRssIntelligenceItems({ ...options, perSource: options.perSource, sources: options.sources })));
  }

  const settled = await Promise.allSettled(tasks);
  const diagnostics = { providers: [], failedProviders: [] };
  const normalized = settled.flatMap(result => {
    if (result.status !== 'fulfilled') {
      diagnostics.failedProviders.push({
        provider: result.reason?.kind || 'unknown',
        error: result.reason?.error?.message || result.reason?.message || 'fetch failed',
      });
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
  const take = boundedNumber(params.take, DEFAULT_AGENT_TAKE, { min: 8, max: MAX_AGENT_TAKE });
  const payload = await getIntelligenceItems({ ...params, take });
  const topItems = payload.items.slice(0, take);
  const events = clusterIntelligenceEvents(topItems);
  const opportunities = buildOpportunitySignals(events).slice(0, 10);
  const weeklySectors = buildWeeklySectorAnalysis(events, { days: 7 });
  const proactiveAlerts = buildProactiveAlerts({ events, weeklySectors, limit: 8 });

  return {
    ok: true,
    version: 1,
    generatedAt: new Date().toISOString(),
    source: payload.source,
    mode: payload.mode,
    briefing: {
      title: 'AI Intelligence Context',
      oneLine: buildOneLine(topItems),
      topEvents: topItems.slice(0, 15).map(toAgentEvent),
      watchEntities: topEntities(topItems),
      opportunities,
      weeklySectors: weeklySectors.sectors.slice(0, 8),
      proactiveAlerts: proactiveAlerts.alerts,
      suggestedQuestions: [
        'Which AI events have the highest industry impact today?',
        'Which companies or models should I track next?',
        'What changed for developers, enterprises, or investors?',
        'Which opportunities or risks need follow-up this week?',
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
  const options = parseOptions(params);
  if (options.storage === 'stored') {
    const stored = await getStoredIntelligenceEvents(options);
    return { ...stored, events: applyPersonalScores(stored.events, options) };
  }

  const take = boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE, { min: 12 });
  let payload;
  try {
    payload = await getIntelligenceItems({ ...params, take, storage: 'live' });
  } catch (error) {
    if (options.storage !== 'auto') throw error;
    const stored = await getStoredIntelligenceEvents(options);
    return { ...stored, events: applyPersonalScores(stored.events, options), fallback: { reason: 'live-error', message: error.message || 'Live intelligence unavailable' } };
  }

  const events = clusterIntelligenceEvents(payload.items);
  const personalizedEvents = applyPersonalScores(events, options);

  if (options.storage === 'auto' && personalizedEvents.length === 0) {
    const stored = await getStoredIntelligenceEvents(options);
    return { ...stored, events: applyPersonalScores(stored.events, options), fallback: { reason: 'live-empty' } };
  }

  return {
    ok: true,
    version: 1,
    source: payload.source,
    mode: payload.mode,
    updatedAt: payload.updatedAt,
    count: personalizedEvents.length,
    events: personalizedEvents,
    cache: payload.cache,
  };
}

export async function syncIntelligenceSnapshot(params = {}) {
  const take = boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE, { min: 12 });
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
  const options = parseOptions(params);
  const take = boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE, { min: 12 });
  let liveEvents;
  try {
    liveEvents = await getIntelligenceEvents({ ...params, take, storage: options.storage === 'stored' ? 'stored' : 'live' });
  } catch (error) {
    if (options.storage !== 'auto') throw error;
    const stored = await getStoredIntelligenceEvents({ ...options, take });
    return {
      ...buildDailyIntelligenceBriefing({
        events: stored.events,
        date: params.date || new Date().toISOString().slice(0, 10),
        source: 'stored',
      }),
      fallback: { reason: 'live-error', message: error.message || 'Live intelligence unavailable' },
    };
  }

  if (options.storage === 'auto' && liveEvents.events.length === 0) {
    const stored = await getStoredIntelligenceEvents({ ...options, take });
    return {
      ...buildDailyIntelligenceBriefing({
        events: stored.events,
        date: params.date || new Date().toISOString().slice(0, 10),
        source: 'stored',
      }),
      fallback: { reason: 'live-empty' },
    };
  }

  return buildDailyIntelligenceBriefing({
    events: liveEvents.events,
    date: params.date || new Date().toISOString().slice(0, 10),
    source: liveEvents.source,
  });
}

export async function getIntelligenceEntities(params = {}) {
  const take = boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE, { min: 12 });
  const eventsPayload = await getIntelligenceEvents({ ...params, take, storage: params.storage || 'auto' });
  const entities = buildEntityProfiles(eventsPayload.events);

  return {
    ok: true,
    version: 1,
    source: eventsPayload.source,
    mode: eventsPayload.mode,
    updatedAt: eventsPayload.updatedAt || new Date().toISOString(),
    count: entities.length,
    entities,
    fallback: eventsPayload.fallback,
  };
}

export async function getIntelligenceEntity(entityId, params = {}) {
  const take = boundedNumber(params.take, DEFAULT_INTELLIGENCE_TAKE, { min: 12 });
  const eventsPayload = await getIntelligenceEvents({ ...params, take, storage: params.storage || 'auto' });
  const entity = findEntityProfile(eventsPayload.events, entityId);

  if (!entity) {
    const error = new Error('Intelligence entity not found');
    error.status = 404;
    throw error;
  }

  return {
    ok: true,
    version: 1,
    source: eventsPayload.source,
    mode: eventsPayload.mode,
    updatedAt: eventsPayload.updatedAt || new Date().toISOString(),
    entity,
    fallback: eventsPayload.fallback,
  };
}

export async function getIntelligenceOpportunities(params = {}) {
  const take = boundedNumber(params.take, 80, { min: 12 });
  const eventsPayload = await getIntelligenceEvents({ ...params, take, storage: params.storage || 'auto' });
  const opportunities = buildOpportunitySignals(eventsPayload.events).slice(0, take);

  return {
    ok: true,
    version: 1,
    source: eventsPayload.source,
    mode: eventsPayload.mode,
    updatedAt: eventsPayload.updatedAt || new Date().toISOString(),
    count: opportunities.length,
    opportunities,
    fallback: eventsPayload.fallback,
  };
}

export async function getWeeklySectorAnalysis(params = {}) {
  const take = boundedNumber(params.take, 120, { min: 20 });
  const days = Math.min(30, Math.max(3, Number.parseInt(params.days || params.since || '7', 10) || 7));
  const eventsPayload = await getIntelligenceEvents({ ...params, take, storage: params.storage || 'auto' });
  const analysis = buildWeeklySectorAnalysis(eventsPayload.events, { days });

  return {
    ...analysis,
    source: eventsPayload.source,
    mode: eventsPayload.mode,
    updatedAt: eventsPayload.updatedAt || new Date().toISOString(),
    fallback: eventsPayload.fallback,
  };
}

export async function getProactiveIntelligenceAlerts(params = {}) {
  const take = boundedNumber(params.take, 120, { min: 20 });
  const limit = boundedNumber(params.limit, 8, { min: 1, max: 30 });
  const days = Math.min(30, Math.max(3, Number.parseInt(params.days || params.since || '7', 10) || 7));
  const eventsPayload = await getIntelligenceEvents({ ...params, take, storage: params.storage || 'auto' });
  const weeklySectors = buildWeeklySectorAnalysis(eventsPayload.events, { days });
  const alerts = buildProactiveAlerts({ events: eventsPayload.events, weeklySectors, limit });

  return {
    ...alerts,
    source: eventsPayload.source,
    mode: eventsPayload.mode,
    updatedAt: eventsPayload.updatedAt || new Date().toISOString(),
    fallback: eventsPayload.fallback,
  };
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
