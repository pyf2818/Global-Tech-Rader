/**
 * todoExtractor.js - 从 AI 回复中自动提取行动项
 *
 * 本地正则提取（不调 LLM，避免每轮额外请求），识别"建议/下一步/可以/应该"等行动模式。
 * 提取结果推送到待办区，标 source: 'auto'，用户可确认/删除/转手动。
 */

// 行动项触发词（出现在列表项或句首时识别为待办）
const ACTION_CUES = [
  '建议', '推荐', '可以', '应该', '需要', '下一步', '接下来', '待办', '行动',
  '务必', '记得', '别忘', '注意', '重点关注', '跟进', '追踪', '部署', '采用',
  '尝试', '考虑', '规划', '制定', '建立', '启动', '评估',
];

// 列表项正则：- / * / 数字. 开头
const LIST_ITEM_RE = /^(?:[-*•]|\d+[.、)])\s*(.+)/gm;

// 行动句正则：句首含触发词
const ACTION_SENTENCE_RE = new RegExp(
  `(?:${ACTION_CUES.join('|')})[^。；!！?？\n]{4,60}`,
  'g'
);

function clean(text) {
  return String(text || '').replace(/[*_`]/g, '').replace(/\[资讯:[^\]]+\]/g, '').trim();
}

/**
 * 从 AI 回复中提取行动项
 * @returns Array<{ text, source: 'auto' }>
 */
export function extractTodos(content) {
  if (!content) return [];
  const found = [];
  const seen = new Set();

  // 1. 列表项中含行动触发词的
  const listMatches = [...content.matchAll(LIST_ITEM_RE)];
  for (const m of listMatches) {
    const item = clean(m[1]);
    if (item.length < 4 || item.length > 60) continue;
    if (ACTION_CUES.some(cue => item.startsWith(cue) || item.includes('：' + cue) || item.includes(':' + cue))) {
      if (!seen.has(item)) { seen.add(item); found.push({ text: item, source: 'auto' }); }
    }
  }

  // 2. 独立行动句
  const sentMatches = [...content.matchAll(ACTION_SENTENCE_RE)];
  for (const m of sentMatches) {
    const item = clean(m[0]);
    if (item.length < 4 || item.length > 60) continue;
    // 排除已在列表项里的
    if (!seen.has(item) && !found.some(f => f.text.includes(item) || item.includes(f.text))) {
      seen.add(item); found.push({ text: item, source: 'auto' });
    }
  }

  return found.slice(0, 5); // 最多 5 条，避免噪声
}
