const RISK_RE = /\b(risk|lawsuit|copyright|regulation|policy|ban|security|privacy|breach|concern|probe|investigation|诉讼|监管|风险|安全|隐私|调查|争议)\b/i;
const BREAKING_RE = /\b(launch|release|announces|announced|funding|partnership|open source|developer|enterprise|发布|宣布|融资|合作|开源|开发者|企业)\b/i;

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function eventTime(event) {
  return Date.parse(event.lastSeenAt || event.firstSeenAt || event.publishedAt || event.updatedAt || '') || 0;
}

function hoursOld(event, now = Date.now()) {
  const time = eventTime(event);
  if (!time) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - time) / 3_600_000);
}

function alertKind(event) {
  const text = `${event.title || ''} ${event.summary || ''}`;
  if (RISK_RE.test(text)) return 'risk';
  if (BREAKING_RE.test(text)) return 'opportunity';
  return 'priority';
}

function eventPriority(event, now) {
  const baseScore = safeNumber(event.personalScore || event.intelligenceScore);
  const impact = safeNumber(event.impactScore);
  const confidence = safeNumber(event.confidence);
  const sourceBoost = Math.min(14, safeNumber(event.independentSourceCount || event.sources?.length) * 4);
  const freshBoost = hoursOld(event, now) <= 24 ? 12 : hoursOld(event, now) <= 72 ? 6 : 0;
  const personalBoost = Math.max(0, safeNumber(event.personalScore) - safeNumber(event.intelligenceScore));
  const kindBoost = alertKind(event) === 'risk' ? 6 : alertKind(event) === 'opportunity' ? 4 : 0;
  return Math.round(baseScore * 0.42 + impact * 0.28 + confidence * 0.12 + sourceBoost + freshBoost + personalBoost * 0.08 + kindBoost);
}

function buildEventAlert(event, now) {
  const kind = alertKind(event);
  const priority = eventPriority(event, now);
  return {
    id: `event:${event.id}`,
    kind,
    priority,
    title: event.title,
    summary: event.summary || '',
    reason: kind === 'risk'
      ? '高影响风险信号需要关注'
      : kind === 'opportunity'
        ? '高影响机会信号适合继续研究'
        : '匹配当前画像的高优先级情报',
    category: event.category || '',
    categoryLabel: event.categoryLabel || event.category || '',
    entities: (event.entities || []).slice(0, 5),
    sources: event.sources || (event.source ? [event.source] : []),
    citations: event.citations || [],
    lastSeenAt: event.lastSeenAt || event.publishedAt || '',
  };
}

function buildSectorAlert(sector) {
  return {
    id: `sector:${sector.id}`,
    kind: 'sector',
    priority: Math.round(safeNumber(sector.score) + Math.min(10, safeNumber(sector.eventCount) * 2)),
    title: `${sector.label} 赛道本周${sector.trend === 'surging' ? '明显升温' : '保持活跃'}`,
    summary: `${sector.eventCount || 0} 个事件，${sector.sourceCount || 0} 个来源，主信号为 ${sector.primarySignal || 'watch'}。`,
    reason: '周度赛道动量达到主动提醒阈值',
    category: sector.category || '',
    categoryLabel: sector.label || '',
    entities: (sector.keyEntities || []).map(entity => entity.name).slice(0, 5),
    sources: [],
    citations: (sector.topEvents || []).flatMap(event => event.citations || []).slice(0, 5),
    lastSeenAt: sector.topEvents?.[0]?.lastSeenAt || '',
  };
}

function dedupeAlerts(alerts) {
  const seen = new Set();
  return alerts.filter(alert => {
    const key = `${alert.kind}:${String(alert.title || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildProactiveAlerts({ events = [], weeklySectors = null, limit = 6, now = Date.now() } = {}) {
  const eventAlerts = events
    .filter(event => event && (event.title || event.summary))
    .map(event => buildEventAlert(event, now))
    .filter(alert => alert.priority >= 72 || alert.kind === 'risk' || alert.kind === 'opportunity');

  const sectorAlerts = (weeklySectors?.sectors || [])
    .filter(sector => sector && (sector.trend === 'surging' || safeNumber(sector.score) >= 78))
    .map(buildSectorAlert)
    .filter(alert => alert.priority >= 76);

  const alerts = dedupeAlerts([...eventAlerts, ...sectorAlerts])
    .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit));

  return {
    ok: true,
    version: 1,
    generatedAt: new Date(now).toISOString(),
    count: alerts.length,
    alerts,
  };
}
