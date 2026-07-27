/**
 * profileLearning.js - 画像自主学习（深化版）
 *
 * 规则驱动的轻量学习，存 localStorage `learnedProfile`。
 * 与服务端 memoryEvolver 互补：本模块是规则学习，那边是 LLM 自由总结。
 *
 * 学习维度（11 个）：
 * 1. frequentTopics      高频主题（带时间衰减权重）
 * 2. interestDomains     兴趣领域权重（ai/chips/business/stock/security/policy/...）
 * 3. questionPatterns    提问模式（compare/analyze/summarize/how/what/why/list/...）
 * 4. preferredFormat     偏好格式（table/list/paragraph）
 * 5. preferredDepth      偏好深度（concise/standard/deep）
 * 6. preferredLength     偏好长度（short/medium/long，基于实际回复字符数）
 * 7. preferredLanguage   偏好语言（zh/en/mixed）
 * 8. timePreference      时段偏好（morning/afternoon/evening/night）
 * 9. toolUsage           工具偏好（用户主动让 agent 调用的工具频次）
 * 10. negativeSignals    负面反馈（识别"不对/不是/再想想"等，学习哪些不该输出）
 * 11. recentEntities     最近关注实体（公司/产品/人名等，短期记忆）
 *
 * 展示策略：AgentPanel 按观测次数/权重排序展示，未观测到的不显示。
 */

const KEY = 'learnedProfile';

const DEFAULT = {
  frequentTopics: [],      // [{ topic, count, lastAt, weight }]
  interestDomains: {},     // { ai: 5, chips: 2, business: 8, ... }
  questionPatterns: {},    // { compare: 3, analyze: 5, ... }
  preferredFormat: {},     // { table: 3, list: 1, paragraph: 2 }
  preferredDepth: {},       // { concise: 1, standard: 4, deep: 2 }
  preferredLength: {},     // { short: 1, medium: 4, long: 2 }
  preferredLanguage: {},   // { zh: 8, en: 2, mixed: 1 }
  timePreference: {},      // { morning: 3, afternoon: 5, evening: 2, night: 0 }
  toolUsage: {},           // { search_news: 3, fetch_page: 1, ... }
  negativeSignals: [],     // [{ pattern, count, lastAt }]
  recentEntities: [],      // [{ entity, count, lastAt }]
  sessionStats: { totalSessions: 0, totalRounds: 0, avgRounds: 0, maxRounds: 0 },
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

/* ============ 工具函数 ============ */

const STOP = new Set(['的', '了', '是', '在', '我', '你', '这', '那', '和', '与', '一', '个', '中', '不', '为', '有', '分析', '什么', '怎么', '如何', '可以', '请', '帮', 'the', 'a', 'an', 'is', 'are', 'to', 'of']);

/* 时间衰减权重：30 天前的观测权重 0.5，90 天前 0.1 */
function timeWeight(lastAt, now = Date.now()) {
  const days = (now - lastAt) / (1000 * 60 * 60 * 24);
  if (days <= 7) return 1;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.3;
  return 0.1;
}

/* ============ 1. 高频主题提取（中文 2 字以上，英文 3 字以上） ============ */

function extractTopics(text) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const words = lower.match(/[a-z]{3,}|[一-鿿]{2,}/g) || [];
  return [...new Set(words.filter(w => !STOP.has(w)))].slice(0, 5);
}

/* ============ 2. 兴趣领域识别（基于关键词） ============ */
const DOMAIN_KEYWORDS = {
  ai: ['ai', '人工智能', 'llm', 'gpt', '大模型', '机器学习', '深度学习', 'neural', 'transformer', 'agent', '智能体', 'copilot', 'claude', 'gemini', 'openai', 'anthropic'],
  chips: ['芯片', 'chip', '半导体', 'semiconductor', 'nvidia', 'amd', 'intel', 'tsmc', '台积电', 'asml', '光刻', '制程', '工艺', 'wafer', '晶圆'],
  business: ['商业', '商业模式', '市场', '竞争', '战略', 'strategy', 'market', 'business', '营收', '利润', '增长', '估值', 'roi', '护城河', '飞轮'],
  stock: ['股票', '股市', '股价', '市值', '涨停', '跌停', 'stock', 'share', 'equity', '市盈率', 'pe', 'pb', '财报', '业绩', '盘前', '盘后'],
  security: ['安全', '漏洞', '攻击', 'cyber', 'security', 'vulnerability', '漏洞', '0day', '勒索', 'ransomware', 'cve'],
  policy: ['政策', '监管', '合规', '反垄断', '数据保护', 'gdpr', '监管局', '网信办', 'policy', 'regulation'],
  product: ['产品', '发布', '上线', 'release', 'launch', 'feature', '功能', '体验'],
  research: ['研究', '论文', 'paper', 'arxiv', 'nature', 'science', 'research', '发现', '突破'],
  crypto: ['加密', 'crypto', 'bitcoin', '比特币', '以太坊', 'ethereum', 'blockchain', '区块链', 'web3'],
  cloud: ['云', 'cloud', 'aws', 'azure', 'gcp', 'k8s', 'kubernetes', 'docker', 'serverless'],
};
function detectDomains(text) {
  const lower = String(text).toLowerCase();
  const hits = [];
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) hits.push(domain);
  }
  return hits;
}

/* ============ 3. 提问模式识别（基于正则） ============ */
const QUESTION_PATTERNS = [
  { id: 'compare', regex: /(对比|比较|versus|vs\.?|相比|区别|差异)/i },
  { id: 'analyze', regex: /(分析|解读|拆解|剖析|深挖|analyze|breakdown|deep dive)/i },
  { id: 'summarize', regex: /(总结|摘要|概览|summary|summarize|tldr|归纳)/i },
  { id: 'how', regex: /(如何|怎么|怎样|how to|how do|how does)/i },
  { id: 'what', regex: /(是什么|什么是|what is|what are|解释一下)/i },
  { id: 'why', regex: /(为什么|为何|why|原因|理由)/i },
  { id: 'predict', regex: /(预测|展望|未来|趋势|predict|forecast|outlook)/i },
  { id: 'evaluate', regex: /(评估|评价|值得|买不买|好不好|evaluate|worth|review)/i },
  { id: 'list', regex: /(列出|列举|清单|哪些|list|top \d+)/i },
  { id: 'create', regex: /(写|创作|生成|make|create|generate|draft)/i },
];
function detectQuestionPatterns(text) {
  return QUESTION_PATTERNS.filter(p => p.regex.test(text)).map(p => p.id);
}

/* ============ 4-6. 格式/深度/长度识别（基于 AI 回复） ============ */
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
function detectLength(content) {
  if (!content) return null;
  const len = content.length;
  if (len < 600) return 'short';
  if (len < 1800) return 'medium';
  return 'long';
}

/* ============ 7. 语言识别 ============ */
function detectLanguage(text) {
  if (!text) return null;
  const zh = (text.match(/[一-鿿]/g) || []).length;
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  if (zh === 0 && en === 0) return null;
  if (zh === 0) return 'en';
  if (en === 0) return 'zh';
  // 双语都有：按比例判断
  const ratio = zh / (zh + en);
  if (ratio > 0.7) return 'zh';
  if (ratio < 0.3) return 'en';
  return 'mixed';
}

/* ============ 8. 时段偏好 ============ */
function detectTimeSlot(date = new Date()) {
  const h = date.getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'night';
}

/* ============ 9. 工具使用记录（从 assistant 消息的 toolCalls 提取） ============ */
export function observeToolUsage(toolCallNames = []) {
  if (!Array.isArray(toolCallNames) || toolCallNames.length === 0) return;
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  toolCallNames.forEach(name => {
    p.toolUsage[name] = (p.toolUsage[name] || 0) + 1;
  });
  p.updatedAt = Date.now();
  save(p);
}

/* ============ 10. 负面反馈信号识别 ============ */
const NEGATIVE_PATTERNS = [
  { pattern: '不对', regex: /不对|不正确|错了|错误|搞错/i },
  { pattern: '不是', regex: /不是|并非|不是这样/i },
  { pattern: '再想想', regex: /再想想|重新|再来一次|重试| redo/i },
  { pattern: '太长', regex: /太长|啰嗦|精简一点|简短/i },
  { pattern: '太短', regex: /太短|不够详细|展开|深入/i },
  { pattern: '没回答', regex: /没回答|答非所问|跑题|没问到点子上/i },
];
function detectNegatives(text) {
  return NEGATIVE_PATTERNS.filter(n => n.regex.test(text)).map(n => n.pattern);
}

/* ============ 11. 最近关注实体（公司/产品/人名） ============ */
const ENTITY_PATTERNS = [
  // 大公司
  'OpenAI', 'Anthropic', 'Google', 'DeepMind', 'Meta', 'Apple', 'Microsoft', 'Amazon', 'Nvidia', 'Tesla', 'ByteDance', '字节跳动', '腾讯', '阿里巴巴', '阿里', '百度', '华为', '小米', 'OPPO', 'vivo',
  // AI 产品
  'ChatGPT', 'Claude', 'Gemini', 'GPT-4', 'GPT-5', 'Copilot', 'Cursor', 'Llama', 'DeepSeek', 'Qwen', '通义', '文心', '豆包',
  // 芯片
  'H100', 'H200', 'B200', 'MI300', 'A100', 'Hopper', 'Blackwell', 'Rubin',
];
const ENTITY_REGEX = new RegExp(`\\b(${ENTITY_PATTERNS.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
function extractEntities(text) {
  if (!text) return [];
  const matches = String(text).match(ENTITY_REGEX) || [];
  return [...new Set(matches)].slice(0, 5);
}

/* ============ 主观测函数 ============ */

/* 观测：用户提问 -> 更新高频主题 / 兴趣领域 / 提问模式 / 时段偏好 / 实体 */
export function observeQuestion(text) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const now = Date.now();
  const topics = extractTopics(text);
  const domains = detectDomains(text);
  const patterns = detectQuestionPatterns(text);
  const timeSlot = detectTimeSlot();
  const entities = extractEntities(text);

  // 1. 高频主题（带时间衰减权重）
  topics.forEach(t => {
    const existing = p.frequentTopics.find(f => f.topic === t);
    if (existing) {
      existing.count += 1;
      existing.lastAt = now;
      existing.weight = timeWeight(now) + (existing.weight || 0) * 0.8; // 滑动加权
    } else {
      p.frequentTopics.push({ topic: t, count: 1, lastAt: now, weight: 1 });
    }
  });
  // 重新计算所有 topic 的权重（时间衰减）
  p.frequentTopics.forEach(f => {
    f.weight = f.weight * 0.95 + timeWeight(f.lastAt, now) * 0.05;
  });
  // 保留前 15，按权重降序
  p.frequentTopics.sort((a, b) => b.weight - a.weight);
  p.frequentTopics = p.frequentTopics.slice(0, 15);

  // 2. 兴趣领域
  domains.forEach(d => {
    p.interestDomains[d] = (p.interestDomains[d] || 0) + 1;
  });

  // 3. 提问模式
  patterns.forEach(pt => {
    p.questionPatterns[pt] = (p.questionPatterns[pt] || 0) + 1;
  });

  // 4. 时段偏好
  p.timePreference[timeSlot] = (p.timePreference[timeSlot] || 0) + 1;

  // 5. 最近关注实体
  entities.forEach(e => {
    const existing = p.recentEntities.find(r => r.entity === e);
    if (existing) { existing.count += 1; existing.lastAt = now; }
    else p.recentEntities.push({ entity: e, count: 1, lastAt: now });
  });
  // 实体保留前 12，按 count 降序，超过 30 天的清理
  p.recentEntities = p.recentEntities
    .filter(r => (now - r.lastAt) < 30 * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  p.updatedAt = now;
  save(p);
}

/* 观测：AI 回复 -> 更新格式/深度/长度偏好 + 负面信号（如果用户在回复中表达不满） */
export function observeReply(content) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const fmt = detectFormat(content);
  const depth = detectDepth(content);
  const len = detectLength(content);
  const lang = detectLanguage(content);
  const now = Date.now();

  if (fmt) p.preferredFormat[fmt] = (p.preferredFormat[fmt] || 0) + 1;
  if (depth) p.preferredDepth[depth] = (p.preferredDepth[depth] || 0) + 1;
  if (len) p.preferredLength[len] = (p.preferredLength[len] || 0) + 1;
  if (lang) p.preferredLanguage[lang] = (p.preferredLanguage[lang] || 0) + 1;

  p.updatedAt = now;
  save(p);
}

/* 观测：用户后续回复 -> 识别负面反馈信号 */
export function observeFeedback(text) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const negatives = detectNegatives(text);
  if (negatives.length === 0) return;
  const now = Date.now();
  negatives.forEach(pattern => {
    const existing = p.negativeSignals.find(n => n.pattern === pattern);
    if (existing) { existing.count += 1; existing.lastAt = now; }
    else p.negativeSignals.push({ pattern, count: 1, lastAt: now });
  });
  // 保留前 8，按 count 降序
  p.negativeSignals.sort((a, b) => b.count - a.count);
  p.negativeSignals = p.negativeSignals.slice(0, 8);
  p.updatedAt = now;
  save(p);
}

/* 观测：会话结束 -> 统计会话长度 */
export function observeSessionEnd(rounds) {
  const p = loadLearnedProfile();
  if (!p.learningEnabled) return;
  const stats = p.sessionStats || { totalSessions: 0, totalRounds: 0, avgRounds: 0, maxRounds: 0 };
  stats.totalSessions += 1;
  stats.totalRounds += rounds;
  stats.avgRounds = Math.round(stats.totalRounds / stats.totalSessions * 10) / 10;
  stats.maxRounds = Math.max(stats.maxRounds, rounds);
  p.sessionStats = stats;
  p.updatedAt = Date.now();
  save(p);
}

/* ============ 派生偏好（供 systemPrompt 注入与 UI 展示） ============ */

/* 把 {key: count} 字典转为按 count 降序的数组，可选过滤最小观测次数 */
function topEntries(dict, minCount = 2, limit = 5) {
  return Object.entries(dict || {})
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

/* 中文标签映射 */
const LABELS = {
  format: { table: '表格', list: '列表', paragraph: '段落' },
  depth: { concise: '简洁', standard: '标准', deep: '深入' },
  length: { short: '短', medium: '中', long: '长' },
  language: { zh: '中文', en: '英文', mixed: '中英混合' },
  time: { morning: '上午', afternoon: '下午', evening: '晚上', night: '深夜' },
  pattern: { compare: '对比分析', analyze: '深度拆解', summarize: '总结归纳', how: '操作方法', what: '概念解释', why: '探究原因', predict: '趋势预测', evaluate: '评估判断', list: '清单列举', create: '创作生成' },
  domain: { ai: 'AI/大模型', chips: '芯片半导体', business: '商业市场', stock: '股票金融', security: '网络安全', policy: '政策监管', product: '产品发布', research: '学术研究', crypto: '加密 web3', cloud: '云计算' },
};

/* 主接口：获取所有已学习的偏好，按"观测强度"动态排序（hasData 检测所有字段） */
export function getLearnedPreferences() {
  const p = loadLearnedProfile();
  const now = Date.now();

  // 1. 高频主题：count >= 2 且权重 > 0.2
  const topTopics = (p.frequentTopics || [])
    .filter(f => f.count >= 2 && (f.weight || 1) > 0.2)
    .slice(0, 8)
    .map(f => ({ key: f.topic, count: f.count, weight: Math.round((f.weight || 1) * 100) / 100 }));

  // 2. 兴趣领域：count >= 2
  const topDomains = topEntries(p.interestDomains, 2, 6).map(d => ({
    ...d,
    label: LABELS.domain[d.key] || d.key,
  }));

  // 3. 提问模式
  const topPatterns = topEntries(p.questionPatterns, 2, 5).map(d => ({
    ...d,
    label: LABELS.pattern[d.key] || d.key,
  }));

  // 4. 格式/深度/长度/语言（取 top 1）
  const topFormat = topEntries(p.preferredFormat, 2, 1)[0];
  const topDepth = topEntries(p.preferredDepth, 2, 1)[0];
  const topLength = topEntries(p.preferredLength, 2, 1)[0];
  const topLanguage = topEntries(p.preferredLanguage, 2, 1)[0];

  // 5. 时段偏好
  const topTime = topEntries(p.timePreference, 1, 2).map(d => ({
    ...d,
    label: LABELS.time[d.key] || d.key,
  }));

  // 6. 工具使用偏好
  const topTools = topEntries(p.toolUsage, 1, 6);

  // 7. 负面反馈信号
  const negatives = (p.negativeSignals || [])
    .filter(n => n.count >= 1)
    .slice(0, 5)
    .map(n => ({ pattern: n.pattern, count: n.count }));

  // 8. 最近关注实体
  const recentEntities = (p.recentEntities || [])
    .filter(r => (now - r.lastAt) < 30 * 24 * 60 * 60 * 1000)
    .slice(0, 8)
    .map(r => ({ entity: r.entity, count: r.count }));

  // 9. 会话统计
  const sessionStats = p.sessionStats || {};

  // 兼容旧 API（AiChatPanel 中用到 frequentTopics / preferredFormat / preferredDepth）
  const legacyTopics = topTopics.map(t => t.key);
  const legacyFormat = topFormat?.key;
  const legacyDepth = topDepth?.key;

  // 计算总观测数（用于 hasData 判定）
  const totalObservations = (p.frequentTopics || []).length
    + Object.values(p.interestDomains || {}).reduce((s, c) => s + c, 0)
    + Object.values(p.questionPatterns || {}).reduce((s, c) => s + c, 0)
    + Object.values(p.preferredFormat || {}).reduce((s, c) => s + c, 0)
    + Object.values(p.preferredDepth || {}).reduce((s, c) => s + c, 0)
    + (p.recentEntities || []).length;

  return {
    // 兼容字段
    frequentTopics: legacyTopics,
    preferredFormat: legacyFormat,
    preferredDepth: legacyDepth,
    learningEnabled: p.learningEnabled,
    hasData: totalObservations > 0,

    // 新结构化字段（用于 AgentPanel 智能展示）
    insights: {
      topics: topTopics,
      domains: topDomains,
      patterns: topPatterns,
      format: topFormat ? { ...topFormat, label: LABELS.format[topFormat.key] || topFormat.key } : null,
      depth: topDepth ? { ...topDepth, label: LABELS.depth[topDepth.key] || topDepth.key } : null,
      length: topLength ? { ...topLength, label: LABELS.length[topLength.key] || topLength.key } : null,
      language: topLanguage ? { ...topLanguage, label: LABELS.language[topLanguage.key] || topLanguage.key } : null,
      time: topTime,
      tools: topTools,
      negatives,
      recentEntities,
      sessionStats,
    },
    updatedAt: p.updatedAt,
  };
}
