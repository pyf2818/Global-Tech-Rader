// 情境化快捷建议：基于今日情报/简报/素材库状态派生 5 个情境化快捷按钮
// 从 src/components/AiChatPanel.jsx 抽离，纯函数

/**
 * @param {object} intelligenceContext 情报上下文（含 items/briefing）
 * @param {Array} workbenchItems 工作台今日资讯列表
 * @param {object} materialContext 素材上下文（来自 buildMaterialContext）
 * @returns {Array<{label:string, icon:string, desc:string, prompt:string}>}
 */
export function buildQuickActions(intelligenceContext, workbenchItems, materialContext) {
  const items = intelligenceContext?.items || workbenchItems || [];
  const briefing = intelligenceContext?.briefing || {};
  const hasItems = items.length > 0;
  const hasBriefing = briefing.oneLine || briefing.opportunities?.length;
  const topSources = [...new Set(items.map(i => i.source).filter(Boolean))].slice(0, 3);
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const materialAction = materialContext.hasElf
    ? {
      label: '继续精灵研究',
      icon: 'sparkle',
      desc: `${materialContext.elfCount} 条 AI 精灵素材`,
      prompt: '请基于素材库中 AI 精灵交接的研究记录继续深化，输出：1）核心结论 2）证据缺口 3）下一步研究清单 4）可沉淀为文章的结构，并用 [素材:ID] 引用关键素材。',
    }
    : materialContext.total > 0
      ? {
        label: '分析素材库',
        icon: 'sparkle',
        desc: `${materialContext.total} 条素材可用`,
        prompt: '请基于素材库上下文梳理可继续研究的主题，输出优先级、证据缺口和下一步行动，并用 [素材:ID] 引用关键素材。',
      }
      : null;

  if (!hasItems) {
    // 无情报时：基础引导
    return [
      materialAction,
      { label: '今日趋势', icon: 'trending', desc: '梳理整体趋势与关键变化', prompt: '分析今日资讯的整体趋势和关键变化，用表格列出主要变化' },
      { label: '三个机会', icon: 'target', desc: '提取最有价值的商业/技术机会', prompt: '从今日资讯中提取三个最有价值的商业/技术机会，说明原因' },
      { label: '创作选题', icon: 'edit', desc: '基于关注领域给出选题大纲', prompt: '基于今日资讯和我的关注领域，给出5个创作选题及大纲' },
      { label: '风险预警', icon: 'alert', desc: '识别负面信号与影响评估', prompt: '今日资讯中有哪些风险或负面信号需要关注？给出影响评估' },
      { label: '信息图表', icon: 'chart', desc: '用表格对比主要公司/技术', prompt: '用 markdown 表格对比今日资讯中涉及的3-5个主要公司/技术' },
    ].filter(Boolean).slice(0, 5);
  }

  // 有情报时：情境化建议
  const actions = [];

  // 1. 今日总判断有内容时，先梳理趋势
  if (hasBriefing) {
    actions.push({
      label: '解读今日总判断',
      icon: 'target',
      desc: briefing.oneLine?.slice(0, 30) + '…',
      prompt: `今日总判断是"${briefing.oneLine || ''}"，请基于今日 ${items.length} 条资讯深入分析这个判断的依据和可信度`,
    });
  } else {
    actions.push({
      label: '梳理今日趋势',
      icon: 'trending',
      desc: `${items.length} 条资讯的整体脉络`,
      prompt: `今日共 ${items.length} 条资讯，请梳理整体趋势和关键变化，用表格列出主要发现`,
    });
  }

  if (materialAction) actions.push(materialAction);

  // 2. 有机会时提取机会
  if (briefing.opportunities?.length > 0) {
    actions.push({
      label: `分析 ${briefing.opportunities.length} 个机会`,
      icon: 'target',
      desc: '深入分析识别到的商业/技术机会',
      prompt: `今日识别到 ${briefing.opportunities.length} 个机会：${briefing.opportunities.slice(0, 2).map(o => typeof o === 'string' ? o.slice(0, 30) : (o.text || '').slice(0, 30)).join('、')}… 请逐个深入分析可行性`,
    });
  } else {
    actions.push({
      label: '三个机会',
      icon: 'target',
      desc: '提取最有价值的商业/技术机会',
      prompt: '从今日资讯中提取三个最有价值的商业/技术机会，说明原因',
    });
  }

  // 3. 有风险时预警
  if (briefing.risks?.length > 0) {
    actions.push({
      label: `风险预警（${briefing.risks.length} 条）`,
      icon: 'alert',
      desc: '评估今日识别到的风险影响',
      prompt: `今日有 ${briefing.risks.length} 条风险信号，请分析影响范围、紧迫程度和应对建议`,
    });
  } else {
    actions.push({
      label: '风险预警',
      icon: 'alert',
      desc: '识别负面信号与影响评估',
      prompt: '今日资讯中有哪些风险或负面信号需要关注？给出影响评估',
    });
  }

  // 4. 信源分析
  if (topSources.length >= 2) {
    actions.push({
      label: '信源对比',
      icon: 'chart',
      desc: `对比 ${topSources.join('、')}`,
      prompt: `请对比分析今日来自 ${topSources.join('、')} 的资讯，找出差异视角和一致判断`,
    });
  } else {
    actions.push({
      label: '信息图表',
      icon: 'chart',
      desc: '用表格对比主要公司/技术',
      prompt: '用 markdown 表格对比今日资讯中涉及的3-5个主要公司/技术',
    });
  }

  // 5. 有关注领域时创作选题
  actions.push({
    label: '创作选题',
    icon: 'edit',
    desc: '基于关注领域和今日情报给出选题',
    prompt: `基于今日 ${items.length} 条资讯和我的关注领域，给出5个创作选题及大纲`,
  });

  return actions.slice(0, 5);
}
