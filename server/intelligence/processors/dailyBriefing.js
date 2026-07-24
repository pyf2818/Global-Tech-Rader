const SECTION_LABELS = {
  'ai-models': 'Model Releases',
  'ai-products': 'Product Updates',
  industry: 'Industry Moves',
  paper: 'Research',
  tip: 'Techniques and Views',
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildOpportunity(event) {
  const entities = event.entities?.length ? ` (${event.entities.slice(0, 3).join(', ')})` : '';
  if ((event.impactScore || 0) >= 70) return `High-impact signal${entities}: ${event.title}`;
  if ((event.sources || []).length >= 2) return `Multi-source confirmation${entities}: ${event.title}`;
  return `Track for follow-up${entities}: ${event.title}`;
}

function buildRisk(event) {
  const text = `${event.title || ''} ${event.summary || ''}`.toLowerCase();
  if (/regulation|lawsuit|copyright|safety|risk|监管|诉讼|版权|安全|风险/.test(text)) {
    return `Risk signal: ${event.title}`;
  }
  if ((event.confidence || 0) < 40) return `Needs more confirmation: ${event.title}`;
  return '';
}

export function buildDailyIntelligenceBriefing({ events = [], date = new Date().toISOString().slice(0, 10), generatedAt = new Date().toISOString(), source = 'live' } = {}) {
  const sorted = [...events].sort((a, b) => {
    const scoreDiff = (b.intelligenceScore || 0) - (a.intelligenceScore || 0);
    if (scoreDiff) return scoreDiff;
    return (Date.parse(b.lastSeenAt) || 0) - (Date.parse(a.lastSeenAt) || 0);
  });
  const topEvents = sorted.slice(0, 8);
  const lead = topEvents[0] || null;
  const categories = unique(sorted.map(event => event.category));
  const citations = sorted.flatMap(event => event.citations || []).slice(0, 40);
  const watchEntities = unique(sorted.flatMap(event => event.entities || [])).slice(0, 12);
  const opportunities = topEvents.map(buildOpportunity).slice(0, 5);
  const risks = topEvents.map(buildRisk).filter(Boolean).slice(0, 5);

  return {
    ok: true,
    version: 1,
    mode: 'algorithm',
    source,
    date,
    generatedAt,
    oneLine: lead
      ? `${lead.title} is the leading AI intelligence event today, with impact ${Math.round(lead.impactScore || 0)} and intelligence score ${Math.round(lead.intelligenceScore || 0)}.`
      : 'No AI intelligence events are available for today yet.',
    lead,
    topEvents,
    sections: categories.map(category => ({
      category,
      label: SECTION_LABELS[category] || category,
      events: sorted.filter(event => event.category === category).slice(0, 6),
    })),
    opportunities,
    risks,
    watchEntities,
    citationIds: unique(citations.map(item => item.id)),
    citations,
    diagnostics: {
      eventCount: sorted.length,
      categoryCount: categories.length,
      citationCount: citations.length,
    },
  };
}
