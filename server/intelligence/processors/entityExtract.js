const COMPANY_NAMES = new Set([
  'OpenAI', 'Anthropic', 'Google', 'Meta', 'Microsoft', 'NVIDIA', 'Apple', 'Amazon',
  'Hugging Face', 'GitHub', 'xAI', 'Mistral', 'Perplexity', 'DeepSeek', 'Alibaba', 'ByteDance',
]);

const MODEL_PATTERNS = [/gpt/i, /claude/i, /gemini/i, /llama/i, /grok/i, /mistral/i, /deepseek/i, /qwen/i, /doubao/i, /sora/i];

function slugify(value = '') {
  return String(value)
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function maxIso(values = []) {
  const times = values.map(value => Date.parse(value)).filter(Number.isFinite);
  return times.length ? new Date(Math.max(...times)).toISOString() : '';
}

function minIso(values = []) {
  const times = values.map(value => Date.parse(value)).filter(Number.isFinite);
  return times.length ? new Date(Math.min(...times)).toISOString() : '';
}

function inferEntityType(name, events = []) {
  if (COMPANY_NAMES.has(name)) return 'company';
  if (MODEL_PATTERNS.some(pattern => pattern.test(name))) return 'model';
  const text = events.map(event => `${event.title || ''} ${event.summary || ''}`).join(' ');
  if (/paper|research|arxiv|论文|研究/i.test(text)) return 'research';
  if (/product|app|platform|工具|产品|平台/i.test(text)) return 'product';
  return 'topic';
}

function buildEntitySummary(name, profileEvents) {
  const lead = profileEvents[0];
  if (!lead) return `${name} has no current intelligence events.`;
  const sourceCount = new Set(profileEvents.flatMap(event => event.sources || [])).size;
  return `${name} appears in ${profileEvents.length} current intelligence event${profileEvents.length > 1 ? 's' : ''}, led by "${lead.title}"${sourceCount ? ` across ${sourceCount} source${sourceCount > 1 ? 's' : ''}` : ''}.`;
}

export function buildEntityProfiles(events = []) {
  const byName = new Map();

  events.forEach(event => {
    (event.entities || []).forEach(name => {
      if (!name) return;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(event);
    });
  });

  return [...byName.entries()].map(([name, profileEvents]) => {
    const sortedEvents = [...profileEvents].sort((a, b) => {
      const scoreDiff = (b.intelligenceScore || 0) - (a.intelligenceScore || 0);
      if (scoreDiff) return scoreDiff;
      return (Date.parse(b.lastSeenAt) || 0) - (Date.parse(a.lastSeenAt) || 0);
    });
    const citations = sortedEvents.flatMap(event => event.citations || []).slice(0, 12);
    const sources = [...new Set(sortedEvents.flatMap(event => event.sources || []))];

    return {
      id: slugify(name),
      name,
      type: inferEntityType(name, sortedEvents),
      summary: buildEntitySummary(name, sortedEvents),
      eventCount: sortedEvents.length,
      sourceCount: sources.length,
      sources,
      heatScore: Math.round(Math.max(...sortedEvents.map(event => event.heatScore || 0), 0)),
      impactScore: Math.round(Math.max(...sortedEvents.map(event => event.impactScore || 0), 0)),
      intelligenceScore: Math.round(Math.max(...sortedEvents.map(event => event.intelligenceScore || 0), 0)),
      firstSeenAt: minIso(sortedEvents.map(event => event.firstSeenAt)),
      lastSeenAt: maxIso(sortedEvents.map(event => event.lastSeenAt)),
      relatedEvents: sortedEvents.slice(0, 8).map(event => ({
        id: event.id,
        title: event.title,
        category: event.category,
        categoryLabel: event.categoryLabel,
        heatScore: event.heatScore,
        impactScore: event.impactScore,
        intelligenceScore: event.intelligenceScore,
        lastSeenAt: event.lastSeenAt,
      })),
      citations,
    };
  }).sort((a, b) => {
    const scoreDiff = b.intelligenceScore - a.intelligenceScore;
    if (scoreDiff) return scoreDiff;
    return b.eventCount - a.eventCount || a.name.localeCompare(b.name);
  });
}

export function findEntityProfile(events = [], entityId = '') {
  const id = slugify(entityId);
  return buildEntityProfiles(events).find(entity => entity.id === id || slugify(entity.name) === id) || null;
}
