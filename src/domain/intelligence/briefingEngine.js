const unique = values => [...new Set(values.filter(Boolean))];

function summarizeLane(items, fallback) {
  const lead = items[0];
  if (!lead) return fallback;
  const reasons = lead.reasons || lead.recommendationReasons || [];
  return `${lead.title}${reasons[0] ? `：${reasons[0]}` : ''}`;
}

export function buildAlgorithmBriefing({ date, lanes = {}, generatedAt = new Date().toISOString() }) {
  const publicItems = Array.isArray(lanes.public) ? lanes.public : [];
  const personalItems = Array.isArray(lanes.personal) ? lanes.personal : [];
  const allItems = [...publicItems, ...personalItems];
  const categories = unique(allItems.map(item => item.category));
  const sources = unique(allItems.map(item => item.source));
  const citationIds = unique(allItems.map(item => item.id));
  const oneLine = publicItems.length || personalItems.length
    ? `今日需同时关注公共热点与个人重点：${summarizeLane(publicItems, summarizeLane(personalItems, '暂无可用资讯'))}`
    : '当前没有足够的有效资讯生成速报，请稍后刷新信源。';

  return {
    version: 1,
    date,
    generatedAt,
    mode: 'algorithm',
    oneLine,
    opportunities: personalItems.slice(0, 3).map(item => ({
      itemId: item.id,
      text: summarizeLane([item], item.title),
    })),
    risks: publicItems
      .filter(item => (item.health && item.health !== 'healthy') || (item.publicScore || 0) < 35)
      .slice(0, 3)
      .map(item => ({ itemId: item.id, text: `${item.title}：信息仍需更多来源确认` })),
    sections: {
      lead: allItems[0] || null,
      public: publicItems,
      personal: personalItems,
      domains: categories.map(category => ({
        category,
        items: allItems.filter(item => item.category === category),
      })),
      sources,
    },
    citationIds,
  };
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(entry => typeof entry === 'string' ? entry.trim() : String(entry?.text || '').trim()).filter(Boolean).slice(0, 5);
}

export function mergeAiBriefing(base, aiResult) {
  if (!base || !aiResult || typeof aiResult !== 'object') {
    return { ...base, aiValidationError: 'AI 返回结构无效' };
  }
  const cited = unique(Array.isArray(aiResult.citationIds) ? aiResult.citationIds.map(String) : []);
  const allowed = new Set(base.citationIds || []);
  const invalidCitations = cited.filter(id => !allowed.has(id));
  if (!cited.length || invalidCitations.length) {
    return {
      ...base,
      aiValidationError: invalidCitations.length
        ? `AI 引用了未知资讯：${invalidCitations.join('、')}`
        : 'AI 未提供可验证引用',
    };
  }
  const oneLine = String(aiResult.oneLine || '').trim();
  if (!oneLine) return { ...base, aiValidationError: 'AI 未提供有效总判断' };

  return {
    ...base,
    mode: 'ai',
    oneLine,
    opportunities: normalizeTextList(aiResult.opportunities),
    risks: normalizeTextList(aiResult.risks),
    aiCitationIds: cited,
    aiValidatedAt: new Date().toISOString(),
    aiValidationError: undefined,
  };
}
