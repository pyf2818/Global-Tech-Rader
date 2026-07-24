const MARKET_PATTERN = /\b(funding|raises|valuation|ipo|acquisition|merger|revenue|enterprise|partnership|customer|cloud|deployment|融资|估值|上市|收购|营收|企业|客户|合作|部署)\b/i;
const DEVELOPER_PATTERN = /\b(api|sdk|github|open source|developer|framework|library|tooling|agent|inference|开源|开发者|框架|工具|推理)\b/i;
const RISK_PATTERN = /\b(regulation|lawsuit|copyright|safety|security|policy|alignment|risk|ban|监管|诉讼|版权|安全|政策|风险|禁止)\b/i;
const RESEARCH_PATTERN = /\b(paper|research|arxiv|benchmark|sota|frontier|reasoning|multimodal|论文|研究|基准|推理|多模态)\b/i;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function classifyOpportunity(event = {}) {
  const text = `${event.title || ''} ${event.summary || ''} ${(event.reasons || []).join(' ')}`;
  if (RISK_PATTERN.test(text)) return 'risk';
  if (MARKET_PATTERN.test(text)) return 'market';
  if (DEVELOPER_PATTERN.test(text)) return 'developer';
  if (RESEARCH_PATTERN.test(text)) return 'technology';
  return 'watch';
}

function opportunityLabel(type) {
  return {
    market: 'Market Opportunity',
    developer: 'Developer Ecosystem',
    technology: 'Technology Signal',
    risk: 'Risk Watch',
    watch: 'Follow-up Watch',
  }[type] || 'Follow-up Watch';
}

function opportunityScore(event, type) {
  const base = (event.impactScore || 0) * 0.55 + (event.heatScore || 0) * 0.25 + (event.confidence || 0) * 0.2;
  const typeBoost = {
    market: 12,
    developer: 8,
    technology: 8,
    risk: 10,
    watch: 0,
  }[type] || 0;
  const sourceBoost = Math.min(12, Math.max(0, (event.independentSourceCount || 1) - 1) * 4);
  return Math.round(clamp(base + typeBoost + sourceBoost));
}

function buildWhy(event, type) {
  const entities = (event.entities || []).slice(0, 3).join(', ');
  const entityText = entities ? `${entities}: ` : '';
  if (type === 'risk') return `${entityText}${event.title} may affect adoption, compliance, or trust.`;
  if (type === 'market') return `${entityText}${event.title} may indicate spending, partnership, or capital-market movement.`;
  if (type === 'developer') return `${entityText}${event.title} may shift developer workflows or ecosystem adoption.`;
  if (type === 'technology') return `${entityText}${event.title} may change model capability, research direction, or product roadmaps.`;
  return `${entityText}${event.title} is worth monitoring for follow-up signals.`;
}

function buildNextAction(event, type) {
  if (type === 'risk') return 'Check primary citations and monitor regulatory, security, or IP follow-up.';
  if (type === 'market') return 'Map affected companies, customers, and public comparables.';
  if (type === 'developer') return 'Track GitHub, API docs, SDK adoption, and developer feedback.';
  if (type === 'technology') return 'Compare claims against benchmarks, papers, and independent replications.';
  return 'Wait for a second independent source or official confirmation.';
}

export function buildOpportunitySignals(events = []) {
  return [...events].map(event => {
    const type = classifyOpportunity(event);
    return {
      id: `opp-${event.id}`,
      type,
      label: opportunityLabel(type),
      eventId: event.id,
      title: event.title,
      summary: event.summary,
      why: buildWhy(event, type),
      nextAction: buildNextAction(event, type),
      score: opportunityScore(event, type),
      confidence: event.confidence || 0,
      entities: event.entities || [],
      sources: event.sources || [],
      citations: event.citations || [],
      lastSeenAt: event.lastSeenAt,
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        categoryLabel: event.categoryLabel,
        heatScore: event.heatScore,
        impactScore: event.impactScore,
        intelligenceScore: event.intelligenceScore,
      },
    };
  }).sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff) return scoreDiff;
    return (Date.parse(b.lastSeenAt) || 0) - (Date.parse(a.lastSeenAt) || 0);
  });
}
