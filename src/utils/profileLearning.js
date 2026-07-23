/**
 * profileLearning.js - 画像自主学习
 *
 * 观测用户行为（提问主题、回复格式偏好、收藏类别），自动更新学习画像。
 * 存 localStorage `learnedProfile`，可查看/删除/关闭。
 *
 * 学习字段：
 * - frequentTopics: 高频提问主题（按次数排序，前 8）
 * - preferredFormat: 偏好回复格式（table/list/paragraph，按次数）
 * - preferredDepth: 偏好深度（concise/standard/deep，按次数）
 * - learningEnabled: 是否开启自动学习（默认 true）
 */

const KEY = 'learnedProfile';

const DEFAULT = {
  frequentTopics: [],      // [{ topic, count, lastAt }]
  preferredFormat: {},     // { table: 3, list: 1, paragraph: 2 }
  preferredDepth: {},      // { concise: 1, standard: 4, deep: 2 }
  learningEnabled: true,
  updatedAt: 0,
};

export function loadLearnedProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

function save(profile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch {}
}

export function setLearningEnabled(enabled) {
  const p = loadLearnedProfile();
  p.learningEnabled = Boolean(enabled);
  save(p);
}

export function clearLearnedProfile() {
  save({ ...DEFAULT });
}

/* 从用户消息提取主题关键词 */
const STOP = new Set(['的', '了', '是', '在', '我', '你', '这', '那', '和', '与', '一', '个', '中', '不', '为', '有', '分析', '什么', '怎么', '如何', '可以', '请', '帮', 'the', 'a', 'an', 'is', 'are', 'to', 'of']);
function extractTopics(text) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const words = lower.match(/[a-z]{3,}|[一-鿿]{2,}/g) || [];
  return [...new Set(words.filter(w => !STOP.has(w)))].slice(0, 5);
}

/* 观测：用户提问 -> 更新高频主题 */
export function observeQuestion(text) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const topics = extractTopics(text);
  const now = Date.now();
  topics.forEach(t => {
    const existing = p.frequentTopics.find(f => f.topic === t);
    if (existing) { existing.count += 1; existing.lastAt = now; }
    else p.frequentTopics.push({ topic: t, count: 1, lastAt: now });
  });
  // 保留前 8，按 count 降序
  p.frequentTopics.sort((a, b) => b.count - a.count);
  p.frequentTopics = p.frequentTopics.slice(0, 8);
  p.updatedAt = now;
  save(p);
}

/* 从 AI 回复推断格式 */
function detectFormat(content) {
  if (!content) return null;
  if (/^\s*\|.*\|.*\n\s*\|[-: |]+\|/m.test(content)) return 'table';
  if (/^\s*[-*]\s/m.test(content) && (content.match(/^\s*[-*]\s/gm) || []).length >= 3) return 'list';
  return 'paragraph';
}

function detectDepth(content) {
  if (!content) return null;
  const len = content.length;
  if (len > 1500) return 'deep';
  if (len < 400) return 'concise';
  return 'standard';
}

/* 观测：AI 回复 -> 更新格式/深度偏好 */
export function observeReply(content) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const fmt = detectFormat(content);
  const depth = detectDepth(content);
  const now = Date.now();
  if (fmt) p.preferredFormat[fmt] = (p.preferredFormat[fmt] || 0) + 1;
  if (depth) p.preferredDepth[depth] = (p.preferredDepth[depth] || 0) + 1;
  p.updatedAt = now;
  save(p);
}

/* 获取偏好结论（供 systemPrompt 注入） */
export function getLearnedPreferences() {
  const p = loadLearnedProfile();
  const topTopics = p.frequentTopics.filter(f => f.count >= 2).slice(0, 5).map(f => f.topic);
  const bestFormat = Object.entries(p.preferredFormat).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestDepth = Object.entries(p.preferredDepth).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    frequentTopics: topTopics,
    preferredFormat: bestFormat,        // table/list/paragraph
    preferredDepth: bestDepth,          // concise/standard/deep
    learningEnabled: p.learningEnabled,
    hasData: topTopics.length > 0 || bestFormat || bestDepth,
  };
}
