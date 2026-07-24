function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function textFor(event = {}) {
  return `${event.title || ''} ${event.summary || ''} ${event.category || ''} ${event.categoryLabel || ''} ${(event.entities || []).join(' ')}`.toLowerCase();
}

export function scorePersonalFit(event = {}, context = {}) {
  const interests = normalizeList(context.interests);
  const follows = normalizeList(context.follows || context.specialFollows);
  const sourceTiers = normalizeList(context.sourceTiers);
  const text = textFor(event);

  const interestMatches = interests.filter(interest => {
    const value = interest.toLowerCase();
    return value && text.includes(value);
  });
  const followMatches = follows.filter(follow => {
    const value = follow.toLowerCase();
    return value && text.includes(value);
  });
  const sourceMatches = sourceTiers.filter(source => {
    const value = source.toLowerCase();
    return value && (event.sources || []).some(item => String(item).toLowerCase().includes(value));
  });

  const score = Math.min(100,
    interestMatches.length * 22
    + followMatches.length * 28
    + sourceMatches.length * 14
    + ((event.confidence || 0) >= 70 ? 8 : 0)
    + ((event.independentSourceCount || 1) > 1 ? 8 : 0)
  );

  return {
    personalScore: Math.round(score),
    personalReasons: [
      ...interestMatches.map(item => `interest:${item}`),
      ...followMatches.map(item => `follow:${item}`),
      ...sourceMatches.map(item => `source:${item}`),
    ].slice(0, 6),
  };
}

export function applyPersonalScores(events = [], context = {}) {
  const hasContext = normalizeList(context.interests).length
    || normalizeList(context.follows || context.specialFollows).length
    || normalizeList(context.sourceTiers).length;

  if (!hasContext) {
    return events.map(event => ({ ...event, personalScore: event.personalScore || 0, personalReasons: event.personalReasons || [] }));
  }

  return events.map(event => {
    const personal = scorePersonalFit(event, context);
    return {
      ...event,
      ...personal,
      intelligenceScore: Math.round(Math.min(100, (event.intelligenceScore || 0) * 0.72 + personal.personalScore * 0.28)),
    };
  }).sort((a, b) => {
    const scoreDiff = (b.intelligenceScore || 0) - (a.intelligenceScore || 0);
    if (scoreDiff) return scoreDiff;
    return (b.personalScore || 0) - (a.personalScore || 0);
  });
}
