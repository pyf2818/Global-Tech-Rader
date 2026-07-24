const RISK_RE = /\b(risk|lawsuit|copyright|regulation|policy|ban|security|privacy|breach|delay|concern|probe|investigation|recall|暂停|诉讼|监管|风险|安全|隐私|调查|争议)\b/i;
const OPPORTUNITY_RE = /\b(opportunity|launch|release|partnership|funding|enterprise|developer|open source|deployment|growth|adoption|扩张|发布|合作|融资|企业|开发者|开源|落地|增长)\b/i;

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function eventTime(event) {
  return Date.parse(event.lastSeenAt || event.firstSeenAt || event.publishedAt || event.updatedAt || '') || 0;
}

function daysAgo(days, now = Date.now()) {
  return now - days * 24 * 60 * 60 * 1000;
}

function uniqueSorted(values = []) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function topCounts(values = [], limit = 6) {
  const counts = new Map();
  values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function classifySignal(event) {
  const text = `${event.title || ''} ${event.summary || ''}`;
  if (RISK_RE.test(text)) return 'risk';
  if (OPPORTUNITY_RE.test(text)) return 'opportunity';
  return 'watch';
}

function buildSector(group) {
  const events = group.events.sort((a, b) => {
    const scoreDiff = safeNumber(b.personalScore || b.intelligenceScore) - safeNumber(a.personalScore || a.intelligenceScore);
    if (scoreDiff) return scoreDiff;
    return eventTime(b) - eventTime(a);
  });
  const eventCount = events.length;
  const sourceCount = uniqueSorted(events.flatMap(event => event.sources || event.source || [])).length;
  const averageImpact = Math.round(events.reduce((sum, event) => sum + safeNumber(event.impactScore), 0) / Math.max(1, eventCount));
  const averageHeat = Math.round(events.reduce((sum, event) => sum + safeNumber(event.heatScore), 0) / Math.max(1, eventCount));
  const personalLift = Math.round(events.reduce((sum, event) => sum + Math.max(0, safeNumber(event.personalScore) - safeNumber(event.intelligenceScore)), 0) / Math.max(1, eventCount));
  const score = Math.round((averageImpact * 0.38) + (averageHeat * 0.28) + (Math.min(100, eventCount * 12) * 0.18) + (Math.min(100, sourceCount * 14) * 0.12) + (personalLift * 0.04));
  const signalCounts = topCounts(events.map(classifySignal), 3);
  const primarySignal = signalCounts[0]?.name || 'watch';

  return {
    id: group.category || 'uncategorized',
    category: group.category || 'uncategorized',
    label: group.label || group.category || 'Uncategorized',
    eventCount,
    sourceCount,
    averageImpact,
    averageHeat,
    score,
    personalLift,
    trend: eventCount >= 4 || averageHeat >= 75 ? 'surging' : eventCount >= 2 ? 'active' : 'watch',
    primarySignal,
    keyEntities: topCounts(events.flatMap(event => event.entities || []), 5),
    topEvents: events.slice(0, 3).map(event => ({
      id: event.id,
      title: event.title,
      summary: event.summary || '',
      score: Math.round(safeNumber(event.personalScore || event.intelligenceScore)),
      impactScore: safeNumber(event.impactScore),
      heatScore: safeNumber(event.heatScore),
      confidence: safeNumber(event.confidence),
      sources: event.sources || (event.source ? [event.source] : []),
      citations: event.citations || [],
      signal: classifySignal(event),
      lastSeenAt: event.lastSeenAt || event.publishedAt || '',
    })),
  };
}

export function buildWeeklySectorAnalysis(events = [], options = {}) {
  const now = options.now || Date.now();
  const sinceMs = options.sinceMs || daysAgo(safeNumber(options.days, 7), now);
  const recentEvents = events
    .filter(event => event && eventTime(event) >= sinceMs)
    .filter(event => event.title || event.summary);

  const groups = new Map();
  recentEvents.forEach(event => {
    const category = event.category || 'uncategorized';
    const existing = groups.get(category) || {
      category,
      label: event.categoryLabel || category,
      events: [],
    };
    existing.events.push(event);
    if (!existing.label && event.categoryLabel) existing.label = event.categoryLabel;
    groups.set(category, existing);
  });

  const sectors = [...groups.values()]
    .map(buildSector)
    .sort((a, b) => b.score - a.score || b.eventCount - a.eventCount || a.label.localeCompare(b.label));

  const risks = sectors
    .flatMap(sector => sector.topEvents.filter(event => event.signal === 'risk').map(event => ({ ...event, sector: sector.label })))
    .slice(0, 5);

  const opportunities = sectors
    .flatMap(sector => sector.topEvents.filter(event => event.signal === 'opportunity').map(event => ({ ...event, sector: sector.label })))
    .slice(0, 5);

  return {
    ok: true,
    version: 1,
    period: {
      days: safeNumber(options.days, 7),
      since: new Date(sinceMs).toISOString(),
      until: new Date(now).toISOString(),
    },
    count: sectors.length,
    eventCount: recentEvents.length,
    sectors,
    leadSector: sectors[0] || null,
    opportunities,
    risks,
  };
}
