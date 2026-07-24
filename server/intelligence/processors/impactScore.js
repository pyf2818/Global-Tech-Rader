const OFFICIAL_SOURCE_PATTERN = /\b(openai|anthropic|deepmind|google ai|google research|meta ai|microsoft|nvidia|apple machine learning|amazon science|github blog)\b/i;
const HIGH_AUTHORITY_PATTERN = /\b(reuters|bloomberg|financial times|mit technology review|nature|science|techcrunch|the verge|wired|stanford|berkeley|arxiv)\b/i;
const MAJOR_COMPANY_PATTERN = /\b(openai|anthropic|google|deepmind|meta|microsoft|nvidia|apple|amazon|xai|mistral|deepseek|alibaba|bytedance)\b/i;
const TECH_BREAKTHROUGH_PATTERN = /\b(gpt-?5|frontier|reasoning|agent|multimodal|sota|benchmark|model release|open weight|robotics|inference|training|芯片|模型|推理|智能体|多模态|开源)\b/i;
const CAPITAL_PATTERN = /\b(funding|raises|valuation|ipo|acquisition|merger|investment|revenue|融资|估值|收购|上市|投资|营收)\b/i;
const DEVELOPER_PATTERN = /\b(api|sdk|github|open source|developer|framework|library|tooling|开源|开发者|框架|工具)\b/i;
const ENTERPRISE_PATTERN = /\b(enterprise|cloud|customer|deployment|partnership|governance|security|企业|客户|部署|合作|安全)\b/i;
const REGULATORY_PATTERN = /\b(regulation|lawsuit|copyright|policy|safety|alignment|监管|诉讼|版权|安全|对齐)\b/i;

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export function freshnessScore(publishedAt, now = Date.now(), max = 25) {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return 0;
  const hours = Math.max(0, (now - published) / 3_600_000);
  return round(clamp(max * Math.exp(-hours / 36), 0, max));
}

export function sourceWeight(source = '') {
  if (OFFICIAL_SOURCE_PATTERN.test(source)) return 1;
  if (HIGH_AUTHORITY_PATTERN.test(source)) return 0.85;
  return 0.62;
}

export function scoreIntelligenceItem(item, context = {}) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.source || ''}`;
  const officialBonus = OFFICIAL_SOURCE_PATTERN.test(item.source || '') ? 20 : 0;
  const authority = sourceWeight(item.source);
  const independentSourceCount = Number(context.independentSourceCount || 1);
  const freshness = freshnessScore(item.publishedAt, context.now);
  const sourceQuality = round(authority * 25);

  const heatParts = {
    sourceQuality,
    corroboration: clamp(independentSourceCount * 8, 0, 15),
    freshness,
    communitySignal: DEVELOPER_PATTERN.test(text) ? 8 : 0,
    officialBonus,
  };

  const impactParts = {
    companyWeight: MAJOR_COMPANY_PATTERN.test(text) ? 20 : 8,
    technologyBreakthrough: TECH_BREAKTHROUGH_PATTERN.test(text) ? 25 : 8,
    capitalMarketImpact: CAPITAL_PATTERN.test(text) ? 15 : 0,
    developerAdoption: DEVELOPER_PATTERN.test(text) ? 15 : 4,
    enterpriseAdoption: ENTERPRISE_PATTERN.test(text) ? 15 : 3,
    regulatoryRisk: REGULATORY_PATTERN.test(text) ? 10 : 0,
  };

  const heatScore = round(clamp(Object.values(heatParts).reduce((sum, value) => sum + value, 0)));
  const impactScore = round(clamp(Object.values(impactParts).reduce((sum, value) => sum + value, 0)));
  const intelligenceScore = round(clamp(impactScore * 0.6 + heatScore * 0.3 + freshness * 0.1));

  return {
    ...item,
    heatScore,
    impactScore,
    intelligenceScore,
    scoreParts: {
      heat: heatParts,
      impact: impactParts,
    },
    reasons: buildReasons({ heatParts, impactParts, source: item.source }),
  };
}

function buildReasons({ heatParts, impactParts, source }) {
  return [
    heatParts.officialBonus > 0 && 'official source',
    sourceWeight(source) >= 0.85 && 'high-authority source',
    impactParts.technologyBreakthrough >= 20 && 'technical breakthrough signal',
    impactParts.capitalMarketImpact > 0 && 'capital market signal',
    impactParts.enterpriseAdoption > 10 && 'enterprise adoption signal',
    impactParts.developerAdoption > 10 && 'developer ecosystem signal',
    heatParts.freshness >= 18 && 'fresh update',
  ].filter(Boolean).slice(0, 4);
}

export function scoreIntelligenceItems(items = [], context = {}) {
  return items.map(item => scoreIntelligenceItem(item, context));
}
