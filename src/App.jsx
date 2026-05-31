import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import GlobeView from './GlobeView.jsx';
import AiElf from './AiElf.jsx';

const MOTIVATIONAL_QUOTES = [
  '保持饥饿',
  '保持愚蠢',
  '立刻行动',
  '突破边界',
  '构建未来',
  '学无止境',
  '创新为王',
  '快速迭代',
  '使命必达',
  '持续构建',
  '颠覆创新',
  '少说多做',
  '代码至上',
  '敢于试错',
  '完成优先',
  '保持好奇',
  '聚焦影响',
  '解决真问',
  '小步快跑',
  '立刻行动',
  '快速交付',
  '用户第一',
  '数据驱动',
  '拥抱变化',
  '精益求精',
  '团队协作',
  '结果导向',
  '持续改进',
  '追求卓越',
  '永不放弃'
];

const NAV_ITEMS = [
  { id: 'all', label: '全部动态', icon: 'grid' },
  { id: 'recommendations', label: '智能推荐', icon: 'sparkle' },
  { id: 'briefing', label: '今日态势', icon: 'document' },
  { id: 'tracker', label: '我的追踪', icon: 'follow' },
  { id: 'trending', label: '热门榜单', icon: 'fire' },
  { id: 'github', label: 'GitHub 热门', icon: 'github' },
  { id: 'custom-url', label: '自定义抓取', icon: 'link' },
  { id: 'materials', label: '素材库', icon: 'layers' },
  { id: 'editor', label: '创作中心', icon: 'edit' },
  { id: 'calendar', label: '日历管理', icon: 'calendar' },
  { id: 'reading-list', label: '阅读列表', icon: 'bookmark' },
  { id: 'trends', label: '赛道矩阵', icon: 'chart' },
  { id: 'reading-stats', label: '阅读画像', icon: 'rows' },
  { id: 'knowledge-export', label: '导出发布', icon: 'link' }
];

const NAV_GROUPS = [
  { id: 'core', label: '资讯中心', items: ['all', 'recommendations', 'trending', 'github', 'custom-url'] },
  { id: 'insight', label: '洞察分析', items: ['briefing', 'tracker', 'trends', 'reading-stats'] },
  { id: 'create', label: '素材创作', items: ['materials', 'editor'] },
  { id: 'manage', label: '管理沉淀', items: ['calendar', 'reading-list', 'knowledge-export'] }
];

const CATEGORIES = [
  { id: 'ai-models', label: 'AI 大模型', icon: 'cpu' },
  { id: 'research', label: '科研前沿', icon: 'beaker' },
  { id: 'open-source', label: '开源生态', icon: 'code' },
  { id: 'data-science', label: '数据科学', icon: 'data' },
  { id: 'quantum', label: '量子计算', icon: 'quantum' },
  { id: 'cybersecurity', label: '网络安全', icon: 'shield' },
  { id: 'chips-compute', label: '芯片半导体', icon: 'chip' },
  { id: 'devices', label: '硬件数码', icon: 'device' },
  { id: 'robotics', label: '机器人', icon: 'bot' },
  { id: 'iot-5g', label: '物联网5G', icon: 'iot' },
  { id: 'silicon-valley', label: '硅谷欧美', icon: 'globe' },
  { id: 'china-tech', label: '国内大厂', icon: 'building' },
  { id: 'policy-finance', label: '政策财经', icon: 'document' },
  { id: 'fintech', label: '金融科技', icon: 'fintech' },
  { id: 'space', label: '太空探索', icon: 'space' },
  { id: 'new-energy', label: '新能源', icon: 'bolt' },
  { id: 'climate-esg', label: '气候ESG', icon: 'climate' },
  { id: 'gaming', label: '游戏电竞', icon: 'gaming' },
  { id: 'metaverse-xr', label: '元宇宙XR', icon: 'metaverse' },
  { id: 'healthcare', label: '医疗健康', icon: 'heart' },
  { id: 'education-tech', label: '教育科技', icon: 'edu' },
  { id: 'agriculture-tech', label: '农业科技', icon: 'agriculture' },
  { id: 'cloud', label: '云计算', icon: 'cloud' },
  { id: 'automotive', label: '智能汽车', icon: 'auto' },
  { id: 'economy-stock', label: '经济股市', icon: 'trendingUp' },
  { id: 'game-entertain', label: '游戏娱乐', icon: 'gamepad' },
  { id: 'showbiz', label: '影视娱乐圈', icon: 'film' },
  { id: 'anime-acg', label: '动漫二次元', icon: 'star' }
];

const CATEGORY_GROUPS = [
  { id: 'tech-ai', label: '科技前沿', icon: 'flask', categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity', 'chips-compute'] },
  { id: 'hardware-consumer', label: '消费电子', icon: 'device', categories: ['devices', 'robotics', 'iot-5g', 'metaverse-xr', 'automotive'] },
  { id: 'industry-economy', label: '产业经济', icon: 'building', categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech', 'economy-stock'] },
  { id: 'entertainment', label: '娱乐文化', icon: 'star', categories: ['gaming', 'game-entertain', 'showbiz', 'anime-acg'] },
  { id: 'lifestyle-health', label: '生活健康', icon: 'heart', categories: ['space', 'new-energy', 'climate-esg', 'healthcare', 'education-tech'] }
];

const LLM_PRESETS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'], icon: '🟢', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder'], icon: '🔵', placeholder: 'sk-...' },
  { id: 'moonshot', name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'], icon: '🌙', placeholder: 'sk-...' },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-air'], icon: '🟣', placeholder: '请输入 API Key' },
  { id: 'custom', name: '自定义', baseUrl: '', models: [], icon: '⚙️', placeholder: 'https://...' }
];

const DEFAULT_AGENTS = [
  {
    id: 'analyst',
    name: '资讯分析师',
    description: '对资讯进行结构化分析，提炼核心要点',
    icon: 'chart',
    avatar: '',
    tags: ['资讯分析', '结构化思维'],
    systemPrompt: '你是一位资深资讯分析师。你的任务是对用户提供的信息进行结构化分析，输出格式清晰、内容精炼的分析报告。概述部分控制在100字以内，影响分析适当展开。',
    category: '分析',
    isDefault: true
  },
  {
    id: 'tech-advisor',
    name: '技术顾问',
    description: '深入解读技术趋势，评估技术价值',
    icon: 'cpu',
    avatar: '',
    tags: ['技术趋势', '技术评估'],
    systemPrompt: '你是一位技术领域资深顾问。擅长解读最新技术动态，评估技术价值和落地可行性。输出简洁有力，技术判断精准，避免空话套话。请用技术人的视角，快速提炼核心技术点、技术原理、优劣势对比。',
    category: '技术',
    isDefault: true
  },
  {
    id: 'business-analyst',
    name: '商业分析师',
    description: '分析商业模式、市场机会和竞争格局',
    icon: 'trend',
    avatar: '',
    tags: ['商业模式', '市场分析'],
    systemPrompt: '你是一位资深商业分析师。擅长从商业视角分析资讯，评估市场机会、竞争格局和商业模式。输出数据驱动，观点明确，直接给出actionable insights。',
    category: '商业',
    isDefault: true
  },
  {
    id: 'writer',
    name: '写作助手',
    description: '帮助润色、改写、创作各类文案',
    icon: 'document',
    avatar: '',
    tags: ['文案创作', '润色改写'],
    systemPrompt: '你是一位专业写作助手。擅长帮助用户润色文章、改写文案、生成创意内容。根据用户输入的风格和语气要求，提供高质量的写作建议和输出。保持原文风格的同时提升表达质量。',
    category: '创作',
    isDefault: true
  },
  {
    id: 'translator',
    name: '翻译专家',
    description: '专业级翻译，保持原文语义和风格',
    icon: 'globe',
    avatar: '',
    tags: ['翻译', '语言'],
    systemPrompt: '你是一位资深翻译专家。擅长中英文互译，注重语义准确性和表达地道性。翻译时保持原文的专业术语准确，同时让译文读起来自然流畅。遇到专业术语请保留原文并附注。',
    category: '语言',
    isDefault: true
  },
  {
    id: 'code-reviewer',
    name: '代码审查员',
    description: '审查代码质量，提供优化建议',
    icon: 'code',
    avatar: '',
    tags: ['代码审查', '技术'],
    systemPrompt: '你是一位资深代码审查员。擅长审查代码质量，发现潜在问题，提供优化建议。输出简洁专业，一针见血，不重复显而易见的点。关注代码可读性、性能、安全性和最佳实践。',
    category: '技术',
    isDefault: true
  },
  {
    id: 'learning-coach',
    name: '学习教练',
    description: '拆解复杂知识，帮助高效学习',
    icon: 'star',
    avatar: '',
    tags: ['知识拆解', '学习方法'],
    systemPrompt: '你是一位学习教练。擅长将复杂的知识拆解成易于理解的部分，帮助用户建立知识体系。输出结构清晰，重点突出，善于用类比和例子帮助理解。推荐学习路径和资源。',
    category: '教育',
    isDefault: true
  },
  {
    id: 'debate-master',
    name: '辩论大师',
    description: '多角度分析问题，提供正反观点',
    icon: 'alert',
    avatar: '',
    tags: ['思辨', '多角度分析'],
    systemPrompt: '你是一位辩论大师。擅长从不同角度分析问题，提供正反两面的观点和论据。输出逻辑严密，论据充分，帮助用户全面理解议题。每个观点都要有事实依据支撑。',
    category: '思辨',
    isDefault: true
  }
];

const AGENT_CATEGORIES = ['全部', '分析', '技术', '商业', '创作', '语言', '教育', '思辨'];

const MODES = [
  { id: 'all', label: '全部' },
  { id: 'flash', label: '快讯' },
  { id: 'deep', label: '深度' },
  { id: 'technical', label: '干货' }
];

const VIEW_MODES = [
  { id: 'compact', label: '紧凑' },
  { id: 'standard', label: '标准' },
  { id: 'card', label: '卡片' }
];

const GITHUB_LANGS = [
  { id: '', label: 'All' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JS' },
  { id: 'typescript', label: 'TS' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' }
];

const GITHUB_PERIODS = [
  { id: 'daily', label: '日榜' },
  { id: 'weekly', label: '周榜' },
  { id: 'monthly', label: '月榜' }
];

const REGION_MAP = { domestic: '国内', overseas: '海外', global: '全球' };
const MODE_MAP = { flash: '快讯', deep: '深度', technical: '干货' };
const MATERIAL_TYPES = { quote: '金句', data: '数据', case: '案例', viewpoint: '观点', chart: '图表' };
const ARTICLE_STATUS = { draft: '草稿', published: '已发布', archived: '已归档' };
const ARTICLE_TEMPLATES = { blank: '空白', briefing: '每日简报', analysis: '深度分析', tech: '技术解读' };
const ARTICLE_TEMPLATE_CONTENT = {
  blank: '',
  briefing: `# 每日科技简报\n\n> 日期：{DATE}\n\n## 今日要闻\n\n1. \n2. \n3. \n\n## 重点分析\n\n### 事件背景\n\n\n### 影响解读\n\n\n## 趋势观察\n\n\n## 明日关注\n\n`,
  analysis: `# 深度分析：标题\n\n## 摘要\n\n用 2-3 句话概括本文核心观点。\n\n## 背景\n\n介绍事件的来龙去脉，提供必要的上下文信息。\n\n## 核心观点\n\n### 观点一\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n### 观点二\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n## 影响分析\n\n- 对行业的影响\n- 对用户的影响\n- 对技术生态的影响\n\n## 趋势预判\n\n基于以上分析，对未来趋势做出预判。\n\n## 参考资料\n\n1. \n2. \n`,
  tech: `# 技术解读：标题\n\n## 概述\n\n简要介绍要解读的技术/产品/工具。\n\n## 技术原理\n\n### 核心概念\n\n解释关键技术概念。\n\n### 架构设计\n\n描述技术的架构或设计思路。\n\n## 使用场景\n\n- 场景一：\n- 场景二：\n- 场景三：\n\n## 代码示例\n\n\`\`\`javascript\n// 示例代码\n\`\`\`\n\n## 优缺点分析\n\n### 优势\n\n- \n- \n\n### 局限\n\n- \n- \n\n## 总结\n\n总结技术的价值和适用场景。\n\n## 参考资料\n\n- \n`
};
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const ICONS = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  cpu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>,
  chip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/></svg>,
  code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  building: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/><path d="M9 9h1M9 13h1M9 17h1"/></svg>,
  device: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
  bot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>,
  cloud: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  beaker: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3h6M10 3v6.39a2 2 0 0 1-.34 1.12L5.86 17.39A2 2 0 0 0 7.53 20h8.94a2 2 0 0 0 1.67-2.61l-3.8-6.88A2 2 0 0 1 14 9.39V3"/></svg>,
  flask: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 2v7.31a2 2 0 0 1-.34 1.12L5.86 17.39A2 2 0 0 0 7.53 20h8.94a2 2 0 0 0 1.67-2.61l-3.8-6.88A2 2 0 0 1 14 9.39V2"/><line x1="6" y1="2" x2="18" y2="2"/></svg>,
  rocket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12l-3.62 3.62"/><path d="M14 9l3.62-3.62"/></svg>,
  document: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  fire: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
  arrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevronLeft: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  externalLink: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  github: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  fork: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  bookmark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  bookmarkFill: <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  leftArrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  rightArrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  keyboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6.01" y2="8"/><line x1="10" y1="8" x2="10.01" y2="8"/><line x1="14" y1="8" x2="14.01" y2="8"/><line x1="18" y1="8" x2="18.01" y2="8"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>,
  follow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v8M8 12h8"/></svg>,
  eventCard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="10" y1="3" x2="10" y2="9"/><line x1="14" y1="3" x2="14" y2="9"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  rows: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="15" width="18" height="6" rx="1"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  spinner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  grid3: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg>,
  data: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  quantum: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>,
  iot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>,
  fintech: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  space: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="4" r="0.5"/></svg>,
  climate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 2a10 10 0 0 0-10 10"/></svg>,
  gaming: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" y1="13" r="1"/><circle cx="18" y1="11" r="1"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>,
  metaverse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  edu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  agriculture: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22V8"/><path d="M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7"/><path d="M3 22h18"/><path d="M7 16c0-2.76 2.24-5 5-5s5 2.24 5 5"/></svg>,
  auto: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>,
  trendingUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  gamepad: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>,
  film: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="2" x2="6" y2="10"/><line x1="18" y1="2" x2="18" y2="10"/></svg>,
  sparkles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3z"/><path d="M6 18l-1 3 3-1 1 3-3 1-1-3-3 1 1-3 3-1z"/><path d="M18 18l-1 3 3-1 1 3-3 1-1-3-3 1 1-3 3-1z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  bold: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>,
  italic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>,
  heading: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v8"/></svg>,
  quoteIcon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>,
  listIcon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>,
  orderedList: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>,
  codeIcon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  tableIcon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  hr: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12"/></svg>,
  image: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  power: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.72 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    if (key === 'bookmarks' && Array.isArray(parsed)) return parsed.map(b => ({ ...b, isRead: b.isRead ?? false, readAt: b.readAt || null, mode: b.mode || 'flash', region: b.region || 'overseas', tags: b.tags || [], category: b.category || '', summary: b.summary || '' }));
    return parsed;
  } catch { return fallback; }
}

function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'material-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function clearStaleLS() {
  ['summaryCache'].forEach(key => {
    try {
      const v = localStorage.getItem(key);
      if (v) {
        const parsed = JSON.parse(v);
        if (typeof parsed !== 'object' || parsed === null) localStorage.removeItem(key);
      }
    } catch { localStorage.removeItem(key); }
  });
}

function App() {
  clearStaleLS();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [nav, setNav] = useState('all');
  const [category, setCategory] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [mode, setMode] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => loadLS('viewMode', 'standard'));
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newsPage, setNewsPage] = useState(0);
  const [newsHasMore, setNewsHasMore] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [globeFullscreenOpen, setGlobeFullscreenOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [elfAvatar, setElfAvatar] = useState(() => {
    try {
      return localStorage.getItem('elfAvatar') || '';
    } catch {
      return '';
    }
  });
  const [elfAvatarHistory, setElfAvatarHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('elfAvatarHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [elfName, setElfName] = useState(() => {
    try {
      return localStorage.getItem('elfName') || 'AI精灵';
    } catch {
      return 'AI精灵';
    }
  });
  const [agents, setAgents] = useState(() => {
    try {
      const saved = localStorage.getItem('elfAgents');
      if (saved) {
        const parsed = JSON.parse(saved);
        const customAgents = parsed.filter(a => a.isCustom);
        return [...DEFAULT_AGENTS, ...customAgents];
      }
      return DEFAULT_AGENTS;
    } catch {
      return DEFAULT_AGENTS;
    }
  });
  const [currentAgent, setCurrentAgent] = useState(() => {
    try {
      return localStorage.getItem('elfCurrentAgent') || 'analyst';
    } catch {
      return 'analyst';
    }
  });
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', systemPrompt: '', category: '分析', avatar: '' });
  const [agentFilter, setAgentFilter] = useState('全部');
  const [agentPromptRefining, setAgentPromptRefining] = useState(false);
  const [stats, setStats] = useState({ sourceCount: 40, failedSources: 0, updatedAt: '', blockedCount: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const motivationalQuote = useMemo(() => {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }, []);
  const [panelCollapsed, setPanelCollapsed] = useState(() => localStorage.getItem('panelCollapsed') === 'true');
  const [customSources, setCustomSources] = useState(() => loadLS('customSources', []));
  const [disabledSources, setDisabledSources] = useState(() => loadLS('disabledSources', []));
  const [newSource, setNewSource] = useState({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
  const [sourceVerifyResult, setSourceVerifyResult] = useState(null);
  const [sourceVerifying, setSourceVerifying] = useState(false);
  const [verifyingAllSources, setVerifyingAllSources] = useState(false);
  const [allSourcesVerifyResults, setAllSourcesVerifyResults] = useState(null);
  const [sourceHealth, setSourceHealth] = useState(() => loadLS('sourceHealth', {}));
  const [editingSource, setEditingSource] = useState(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSources, setSelectedSources] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [customSourceFilter, setCustomSourceFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [builtinBatchMode, setBuiltinBatchMode] = useState(false);
  const [selectedBuiltinSources, setSelectedBuiltinSources] = useState(new Set());
  const [autoMonitorEnabled, setAutoMonitorEnabled] = useState(() => loadLS('autoMonitorEnabled', false));
  const [monitorInterval, setMonitorInterval] = useState(() => loadLS('monitorInterval', 60)); // 分钟
  const [monitorAlerts, setMonitorAlerts] = useState([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [llmConfig, setLlmConfig] = useState(() => loadLS('llmConfig', { baseUrl: '', apiKey: '', selectedModel: '', manualModels: [], provider: '' }));
  const [llmModels, setLlmModels] = useState([]);
  const [llmFetching, setLlmFetching] = useState(false);
  const [llmFetchError, setLlmFetchError] = useState('');
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmManualInput, setLlmManualInput] = useState('');
  const [showLlmQuickConfig, setShowLlmQuickConfig] = useState(false);

  // ========== 用户系统 ==========
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedInterests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', signature: '' });

  // 打开资料弹窗时预填充表单
  useEffect(() => {
    if (showProfileModal && user) {
      setProfileForm({
        displayName: user.displayName || '',
        signature: user.signature || ''
      });
    }
  }, [showProfileModal, user]);

  const isLoggedIn = !!user && !!token;

  // 保存用户数据到 localStorage
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);
  useEffect(() => {
    localStorage.setItem('selectedInterests', JSON.stringify(selectedInterests));
  }, [selectedInterests]);

  // 认证函数
  const handleRegister = async () => {
    if (!authForm.username || !authForm.password) {
      setAuthError('用户名和密码不能为空');
      return;
    }
    if (authForm.password !== authForm.confirmPassword) {
      setAuthError('两次输入的密码不一致');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authForm.username,
          password: authForm.password,
          email: authForm.email,
          interests: selectedInterests
        })
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setToken(data.token);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '', confirmPassword: '' });
        showToast('注册成功！');
      } else {
        setAuthError(data.message || '注册失败');
      }
    } catch (e) {
      setAuthError('网络错误，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authForm.username || !authForm.password) {
      setAuthError('用户名和密码不能为空');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authForm.username,
          password: authForm.password
        })
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setToken(data.token);
        if (data.user.interests) {
          setSelectedInterests(data.user.interests);
        }
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '', confirmPassword: '' });
        showToast('登录成功！');
      } else {
        setAuthError(data.message || '登录失败');
      }
    } catch (e) {
      setAuthError('网络错误，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setSelectedInterests([]);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedInterests');
    setShowUserMenu(false);
    showToast('已退出登录');
  };

  const updateUserInterests = async (interests) => {
    if (!token) return;
    try {
      await fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, interests })
      });
      setSelectedInterests(interests);
      if (user) {
        setUser({ ...user, interests });
      }
    } catch (e) {
      console.error('Failed to update interests:', e);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...updates })
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setUser(data.user);
      }
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  // 获取用户兴趣分类的详细信息
  const userInterestCategories = useMemo(() => {
    return CATEGORIES.filter(c => c.id !== 'all' && selectedInterests.includes(c.id));
  }, [selectedInterests]);

  const allLlmModels = useMemo(() => [...llmModels, ...(llmConfig.manualModels || [])], [llmModels, llmConfig.manualModels]);
  const [allSources, setAllSources] = useState([]);
   const [sourceGrades, setSourceGrades] = useState({});
   const [gradeFilter, setGradeFilter] = useState('all');
  const [sourceTypeTab, setSourceTypeTab] = useState('builtin');
  const [trendingItems, setTrendingItems] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingPlatform, setTrendingPlatform] = useState('all');
  const [trendingPage, setTrendingPage] = useState(0);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [trendingLoadingMore, setTrendingLoadingMore] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubLang, setGithubLang] = useState('');
  const [githubSince, setGithubSince] = useState('weekly');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [events, setEvents] = useState(() => loadLS('calendarEvents', []));
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', time: '', color: '#22d3ee' });
  const [showEventForm, setShowEventForm] = useState(false);

  const [bookmarks, setBookmarks] = useState(() => loadLS('bookmarks', []));
  const [materials, setMaterials] = useState(() => loadLS('materials', []));
  const [articles, setArticles] = useState(() => loadLS('articles', []));
  const [expandedSummary, setExpandedSummary] = useState({});
  const [summaryCache, setSummaryCache] = useState(() => loadLS('summaryCache', {}));
  const [followKeywords, setFollowKeywords] = useState(() => loadLS('followKeywords', []));
  const [pinnedKeywords, setPinnedKeywords] = useState(() => loadLS('pinnedKeywords', []));
  const [newKeyword, setNewKeyword] = useState('');
  const [searchHistory, setSearchHistory] = useState(() => loadLS('searchHistory', []));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSort, setSearchSort] = useState('time');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, src: '', title: '' });
  const [expandedEvents, setExpandedEvents] = useState({});
  const [exportCategory, setExportCategory] = useState('all');
  const [exportRange, setExportRange] = useState('all');

  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlResult, setCustomUrlResult] = useState(null);
  const [customUrlLoading, setCustomUrlLoading] = useState(false);
  const [customUrlError, setCustomUrlError] = useState('');
  const [customUrlMode, setCustomUrlMode] = useState('basic');
  const [showFollowDropdown, setShowFollowDropdown] = useState(false);
  const [recentVisits, setRecentVisits] = useState(() => loadLS('recentVisits', []));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [trackTargets, setTrackTargets] = useState(() => loadLS('trackTargets', []));
  const [briefingConfig, setBriefingConfig] = useState(() => loadLS('briefingConfig', { length: 'standard', includeRead: false }));
  const [newTrackTarget, setNewTrackTarget] = useState('');
  const [readingHistory, setReadingHistory] = useState(() => loadLS('readingHistory', []));
  const [translations, setTranslations] = useState(() => loadLS('translations', {}));
  const [aiInsights, setAiInsights] = useState({ loading: false, data: null, error: '' });
  const [translationOpen, setTranslationOpen] = useState({});
  const [translatingItems, setTranslatingItems] = useState({});
  const [navGroupOpen, setNavGroupOpen] = useState({ core: true, insight: true, manage: false });
  const [currentArticleId, setCurrentArticleId] = useState(null);
  const [materialFilter, setMaterialFilter] = useState('all');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialTags, setMaterialTags] = useState([]);
  const [materialTimeRange, setMaterialTimeRange] = useState('all');
  const [materialSourceFilter, setMaterialSourceFilter] = useState('all');
  const [materialSpaceFilter, setMaterialSpaceFilter] = useState('all');
  const [materialSpaces, setMaterialSpaces] = useState(() => loadLS('materialSpaces', []));
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [aiResult, setAiResult] = useState({ loading: false, content: '', error: '', action: '' });
  const [aiBrief, setAiBrief] = useState({ loading: false, content: '', error: '', generatedAt: null });
  const [signalFilter, setSignalFilter] = useState('all');
  const [articleExportFilter, setArticleExportFilter] = useState('all');
  const [articleSearch, setArticleSearch] = useState('');
  const [articleStatusFilter, setArticleStatusFilter] = useState('all');
  const [articleTemplateFilter, setArticleTemplateFilter] = useState('all');
  const [articleSort, setArticleSort] = useState('updated');
  const [articleTagInput, setArticleTagInput] = useState('');
  const [editingArticleTag, setEditingArticleTag] = useState(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [editorTab, setEditorTab] = useState('edit');
  const [editorCursorPos, setEditorCursorPos] = useState({ start: 0, end: 0 });
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [articleSpaces, setArticleSpaces] = useState(() => loadLS('articleSpaces', []));
  const [articleSpaceFilter, setArticleSpaceFilter] = useState('all');
  const [articleMaterialSpaceFilter, setArticleMaterialSpaceFilter] = useState('all');
  const [articleSpaceFormOpen, setArticleSpaceFormOpen] = useState(false);
  const [newArticleSpaceName, setNewArticleSpaceName] = useState('');
  const [articleSpaceForNewArticle, setArticleSpaceForNewArticle] = useState('all');
  const editorTextareaRef = useRef(null);
  const imageInputRef = useRef(null);

  const feedRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem('panelCollapsed', String(panelCollapsed)); }, [panelCollapsed]);
  // ESC 退出创作中心全屏
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setEditorFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => { saveLS('customSources', customSources); }, [customSources]);
  useEffect(() => { saveLS('sourceHealth', sourceHealth); }, [sourceHealth]);
  useEffect(() => { saveLS('disabledSources', disabledSources); }, [disabledSources]);
  useEffect(() => { saveLS('calendarEvents', events); }, [events]);
  useEffect(() => { saveLS('bookmarks', bookmarks); }, [bookmarks]);
  useEffect(() => { saveLS('materials', materials); }, [materials]);
  useEffect(() => { saveLS('materialSpaces', materialSpaces); }, [materialSpaces]);
  useEffect(() => { saveLS('articleSpaces', articleSpaces); }, [articleSpaces]);
  useEffect(() => { saveLS('articles', articles); }, [articles]);
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handler = (e) => { if (!e.target.closest('.editor-template-dropdown')) setShowTemplateMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplateMenu]);
  useEffect(() => { saveLS('summaryCache', summaryCache); }, [summaryCache]);
  useEffect(() => { saveLS('followKeywords', followKeywords); }, [followKeywords]);
  useEffect(() => { saveLS('pinnedKeywords', pinnedKeywords); }, [pinnedKeywords]);
  useEffect(() => { saveLS('searchHistory', searchHistory); }, [searchHistory]);
  useEffect(() => { saveLS('viewMode', viewMode); }, [viewMode]);
  useEffect(() => { saveLS('recentVisits', recentVisits); }, [recentVisits]);
  useEffect(() => { saveLS('trackTargets', trackTargets); }, [trackTargets]);
  useEffect(() => { saveLS('briefingConfig', briefingConfig); }, [briefingConfig]);
  useEffect(() => { saveLS('readingHistory', readingHistory); }, [readingHistory]);
  useEffect(() => { saveLS('translations', translations); }, [translations]);
  useEffect(() => { saveLS('llmConfig', llmConfig); }, [llmConfig]);
  useEffect(() => {
    if (elfAvatar) localStorage.setItem('elfAvatar', elfAvatar);
    else localStorage.removeItem('elfAvatar');
  }, [elfAvatar]);
  useEffect(() => { localStorage.setItem('elfAvatarHistory', JSON.stringify(elfAvatarHistory)); }, [elfAvatarHistory]);
  useEffect(() => { localStorage.setItem('elfName', elfName); }, [elfName]);
  useEffect(() => {
    const customAgents = agents.filter(a => a.isCustom);
    localStorage.setItem('elfAgents', JSON.stringify(customAgents));
  }, [agents]);
  useEffect(() => { localStorage.setItem('elfCurrentAgent', currentAgent); }, [currentAgent]);

  const fetchAiInsights = async () => {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel || items.length === 0) {
      return;
    }
    setAiInsights(p => ({ ...p, loading: true, error: '' }));
    try {
      const topItems = items.slice(0, 30).map(i => ({
        title: i.title,
        category: i.category,
        source: i.source,
        summary: i.summary || '',
        tags: (i.tags || []).join(', ')
      }));
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          items: topItems
        })
      });
      const data = await res.json();
      console.log('[AI Insights] Response:', data);
      if (data.error) {
        const msg = data.raw ? `AI 返回格式错误：${data.error}。原始输出：${data.raw.slice(0, 200)}` : data.error;
        throw new Error(msg);
      }
      setAiInsights({ loading: false, data, error: '' });
    } catch (e) {
      setAiInsights({ loading: false, data: null, error: e.message });
    }
  };

  useEffect(() => {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    const timer = setTimeout(fetchAiInsights, 1000);
    return () => clearTimeout(timer);
  }, [items, llmConfig.baseUrl, llmConfig.apiKey, llmConfig.selectedModel]);

  useEffect(() => {
    if (!lightbox.open) return;
    const handler = (e) => { if (e.key === 'Escape') setLightbox({ open: false, src: '', title: '' }); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox.open]);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const handleScroll = () => setShowBackToTop(el.scrollTop > 300);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (nav !== 'all' && nav !== 'recommendations') return;
    const el = feedRef.current;
    if (!el || !newsHasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreNews(); },
      { root: el, rootMargin: '200px' }
    );
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nav, newsHasMore, loadingMore, loading, items.length]);

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    fetch('/api/meta')
      .then(r => r.json())
      .then(d => {
        console.log('Fetched allSources:', d.sources);
        setAllSources(d.sources || []);
        if (d.sourceGrades) {
          setSourceGrades(d.sourceGrades);
        }
      })
      .catch(e => {
        console.error('Failed to fetch allSources:', e);
      });
  }, []);
  useEffect(() => { loadNews(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (nav !== 'all') return;
    loadNews(blocked, false, debouncedQuery);
  }, [debouncedQuery, category, mode, sourceFilter]);
  useEffect(() => {
    if (nav === 'trending' && trendingItems.length === 0) loadTrending();
    if (nav === 'github' && githubRepos.length === 0) loadGithub();
    if (nav === 'recommendations') loadNews(blocked, false, debouncedQuery);
  }, [nav]);

  // 趋势分析数据
  const trendData = useMemo(() => {
    // 按赛道统计
    const categoryStats = new Map();
    items.forEach(item => {
      const cat = categoryStats.get(item.category) || { count: 0, sources: new Set() };
      cat.count++;
      cat.sources.add(item.source);
      categoryStats.set(item.category, cat);
    });

    // 按来源统计
    const sourceStats = new Map();
    items.forEach(item => {
      const src = sourceStats.get(item.source) || { count: 0, categories: new Set() };
      src.count++;
      src.categories.add(item.category);
      sourceStats.set(item.source, src);
    });

    // 关键词频率
    const keywordMap = new Map();
    items.forEach(item => {
      item.tags?.forEach(tag => {
        keywordMap.set(tag, (keywordMap.get(tag) || 0) + 1);
      });
    });

    const days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - idx));
      return d;
    });
    const dayKeys = days.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

    const topCategoryIds = [...categoryStats.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([id]) => id);
    const categorySeries = topCategoryIds.map((catId) => {
      const values = dayKeys.map((dayKey) => items.filter(i => i.category === catId && i.publishedAt?.slice(0, 10) === dayKey).length);
      return { id: catId, values };
    });

    const topSources = [...sourceStats.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([name]) => name);
    const sourceSeries = topSources.map((name) => {
      const values = dayKeys.map((dayKey) => items.filter(i => i.source === name && i.publishedAt?.slice(0, 10) === dayKey).length);
      return { name, values };
    });

    return {
      categoryStats: [...categoryStats.entries()].sort((a, b) => b[1].count - a[1].count),
      sourceStats: [...sourceStats.entries()].sort((a, b) => b[1].count - a[1].count),
      topKeywords: [...keywordMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
      emergingKeywords: [...keywordMap.entries()].filter(([, count]) => count >= 3 && count <= 8).slice(0, 10),
      dayLabels: dayKeys.map(d => d.slice(5)),
      categorySeries,
      sourceSeries
    };
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(item => {
      const cat = category === 'all' || item.category === category;
      const md = mode === 'all' || item.mode === mode;
      const src = sourceFilter === 'all' || item.source === sourceFilter;
      return cat && md && src;
    });

    if (followKeywords.length > 0) {
      result.sort((a, b) => {
        const aFollow = followKeywords.some(kw => `${a.title} ${a.summary}`.toLowerCase().includes(kw.toLowerCase())) ? 0 : 1;
        const bFollow = followKeywords.some(kw => `${b.title} ${b.summary}`.toLowerCase().includes(kw.toLowerCase())) ? 0 : 1;
        return aFollow - bFollow;
      });
    }

    return result;
  }, [items, category, mode, sourceFilter, followKeywords]);

  const sourceOptions = useMemo(() => {
    const counts = new Map();
    items
      .filter(item => {
        const cat = category === 'all' || item.category === category;
        const md = mode === 'all' || item.mode === mode;
        return cat && md;
      })
      .forEach(item => counts.set(item.source, (counts.get(item.source) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, category, mode]);

  const addRecentVisit = useCallback((type, value, label) => {
    setRecentVisits(prev => {
      const filtered = prev.filter(v => !(v.type === type && v.value === value));
      const newVisit = { type, value, label, timestamp: Date.now() };
      return [newVisit, ...filtered].slice(0, 3);
    });
  }, []);

  const hotTags = useMemo(() => {
    const allMap = new Map();
    const last24hMap = new Map();
    const now = Date.now();
    filtered.forEach(item => {
      (item.tags || []).forEach(tag => {
        allMap.set(tag, (allMap.get(tag) || 0) + 1);
        if (now - new Date(item.publishedAt).getTime() <= 24 * 60 * 60 * 1000) {
          last24hMap.set(tag, (last24hMap.get(tag) || 0) + 1);
        }
      });
    });
    return [...allMap.entries()]
      .map(([tag, count]) => ({ tag, count, trend: last24hMap.get(tag) || 0, score: count + (last24hMap.get(tag) || 0) * 2 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [filtered]);

  const sourceStats = useMemo(() => items.reduce((s, i) => ({ ...s, [i.region]: (s[i.region] || 0) + 1 }), { domestic: 0, overseas: 0, global: 0 }), [items]);

  const regionCategoryMatrix = useMemo(() => {
    const regions = ['domestic', 'overseas', 'global'];
    const matrix = {};
    let maxVal = 0;
    regions.forEach(r => {
      matrix[r] = {};
      CATEGORIES.forEach(c => {
        const count = items.filter(i => i.region === r && i.category === c.id).length;
        matrix[r][c.id] = count;
        if (count > maxVal) maxVal = count;
      });
    });
    return { matrix, maxVal, regions };
  }, [items]);

  const dailyBriefing = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const todayItems = items.filter(i => new Date(i.publishedAt) >= yesterday);
    
    const sourceWeight = { 'TechCrunch': 1.5, 'MIT Technology Review': 1.5, 'The Verge': 1.3, 'Wired': 1.3, 'Ars Technica': 1.3, 'OpenAI Blog': 1.4, 'Anthropic News': 1.4, 'Google DeepMind': 1.4, '量子位': 1.2, '机器之心': 1.2 };
    
    const scored = todayItems.map(item => {
      let score = 100;
      const age = (now - new Date(item.publishedAt)) / (1000 * 60 * 60);
      score += Math.max(0, 50 - age * 2);
      score *= sourceWeight[item.source] || 1;
      if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) score += 30;
      if (/\b(ai|llm|gpt|大模型|芯片|融资|发布)\b/i.test(item.title)) score += 20;
      return { ...item, score };
    }).sort((a, b) => b.score - a.score);

    const count = briefingConfig.length === 'compact' ? 5 : briefingConfig.length === 'detailed' ? 20 : 10;
    const topNews = scored.slice(0, count);
    
    const categoryGroups = {};
    topNews.forEach(item => {
      if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
      categoryGroups[item.category].push(item);
    });

    const emergingKeywords = [...new Set(todayItems.flatMap(i => {
      const words = i.title.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      return words.filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'been', 'were', 'they', 'their', 'what', 'when', 'more', 'some', 'time', 'very', 'just', 'know', 'take', 'come', 'made', 'could', 'after', 'also', 'than', 'them', 'other', 'into', 'your', 'about', 'over', 'such', 'only', 'then', 'most', 'would'].includes(w));
    }))].slice(0, 10);

    return { topNews, categoryGroups, emergingKeywords, totalToday: todayItems.length, generatedAt: now.toISOString() };
  }, [items, followKeywords, briefingConfig.length]);

  const trackerData = useMemo(() => {
    const result = {};
    trackTargets.forEach(target => {
      const matched = items.filter(i => {
        const text = `${i.title} ${i.summary}`.toLowerCase();
        return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
      });
      const last7Days = matched.filter(i => new Date(i.publishedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const last30Days = matched.filter(i => new Date(i.publishedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      result[target.id] = { all: matched, last7Days, last30Days, total: matched.length, weekly: last7Days.length };
    });
    return result;
  }, [items, trackTargets]);

  // 洞察分析数据层
  const insightData = useMemo(() => {
    const now = new Date();
    const buildDayKeys = (days) => Array.from({ length: days }).map((_, idx) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const day14 = buildDayKeys(14);
    const day7 = day14.slice(7);
    const day7prev = day14.slice(0, 7);
    const day30 = buildDayKeys(30);

    // 近30天赛道趋势数据（用于趋势对比图）
    const categoryTrend30 = CATEGORIES.map(cat => {
      const daily30 = day30.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length);
      return { id: cat.id, label: cat.label, daily30 };
    }).filter(c => c.daily30.some(v => v > 0));

    // 赛道关联分析：统计同一篇文章中同时出现的赛道对
    const categoryCorrelations = [];
    const catPairCounts = new Map();
    items.forEach(item => {
      const itemCats = new Set([item.category]);
      // 查找同一来源同一天的其他文章
      const sameDayItems = items.filter(i => i.source === item.source && i.publishedAt?.slice(0, 10) === item.publishedAt?.slice(0, 10) && i.id !== item.id);
      sameDayItems.forEach(other => {
        if (other.category !== item.category) {
          const pair = [item.category, other.category].sort().join('::');
          catPairCounts.set(pair, (catPairCounts.get(pair) || 0) + 1);
        }
      });
    });
    catPairCounts.forEach((count, pair) => {
      const [cat1, cat2] = pair.split('::');
      const label1 = CATEGORIES.find(c => c.id === cat1)?.label || cat1;
      const label2 = CATEGORIES.find(c => c.id === cat2)?.label || cat2;
      categoryCorrelations.push({ cat1, cat2, label1, label2, count });
    });
    categoryCorrelations.sort((a, b) => b.count - a.count);

    // 赛道增长率（近7天 vs 前7天）+ 7日趋势线
    const categoryGrowth = CATEGORIES.map(cat => {
      const daily7 = day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length);
      const recent = daily7.reduce((a, b) => a + b, 0);
      const prev = day7prev.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length).reduce((a, b) => a + b, 0);
      const growth = prev === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - prev) / prev) * 100);
      return { id: cat.id, label: cat.label, recent, prev, growth, daily7 };
    }).sort((a, b) => b.growth - a.growth);

    // 赛道动量分数（近3天加权）
    const day3 = day7.slice(4);
    const categoryMomentum = CATEGORIES.map(cat => {
      const weights = [1, 2, 3];
      const score = day3.reduce((sum, d, idx) => {
        return sum + items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length * weights[idx];
      }, 0);
      return { id: cat.id, label: cat.label, score };
    }).sort((a, b) => b.score - a.score);

    // 来源区域分布
    const regionDistribution = { domestic: 0, overseas: 0, global: 0 };
    items.forEach(i => { regionDistribution[i.region] = (regionDistribution[i.region] || 0) + 1; });
    const regionPct = {
      domestic: items.length ? Math.round(regionDistribution.domestic / items.length * 100) : 0,
      overseas: items.length ? Math.round(regionDistribution.overseas / items.length * 100) : 0,
      global: items.length ? Math.round(regionDistribution.global / items.length * 100) : 0
    };

    // 异常检测：近7天日均 vs 前7天日均，变化超过50%标记异常
    const anomalies = categoryGrowth.filter(c => Math.abs(c.growth) > 50).map(c => ({
      ...c, type: c.growth > 0 ? 'surge' : 'drop'
    }));

    // 今日 vs 昨日
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
    const todayCount = items.filter(i => i.publishedAt?.slice(0, 10) === today).length;
    const yesterdayCount = items.filter(i => i.publishedAt?.slice(0, 10) === yesterdayStr).length;
    const dailyChange = yesterdayCount === 0 ? 0 : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);

    // 热门赛道排行（综合计数+增长率）
    const categoryRanking = categoryGrowth.map(c => ({
      ...c,
      momentum: categoryMomentum.find(m => m.id === c.id)?.score || 0,
      heatScore: c.recent * 2 + c.momentum
    })).sort((a, b) => b.heatScore - a.heatScore);

    // 关键词动量（近3天出现频次加权）
    const keywordMomentum = new Map();
    items.forEach(item => {
      if (item.publishedAt && day3.some(d => item.publishedAt.slice(0, 10) === d)) {
        item.tags?.forEach(tag => {
          keywordMomentum.set(tag, (keywordMomentum.get(tag) || 0) + 1);
        });
      }
    });
    const risingKeywords = [...keywordMomentum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

    // TF-IDF 词频分析：提取标题+摘要中的高频技术词
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'whose', 'about', 'up', 'new', 'one', 'two', 'three', 'first', 'also', 'more', 'say', 'says', 'said', 'make', 'made', 'take', 'get', 'got', 'use', 'used', 'find', 'found', 'come', 'came', 'go', 'went', 'know', 'think', 'see', 'give', 'want', 'work', 'try', 'ask', 'seem', 'feel', 'leave', 'call', 'keep', 'let', 'begin', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull']);
    const wordFreq = new Map();
    const wordSources = new Map(); // 每个词被多少不同来源报道
    items.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      const words = text.match(/\b[a-z]{4,}\b/g) || [];
      const seenInItem = new Set();
      words.forEach(w => {
        if (!stopWords.has(w) && !/^(this|that|with|from|have|been|were|they|their|what|when|more|some|time|very|just|know|take|come|made|could|after|also|than|them|other|into|your|about|over|such|only|then|most|would|which|there|these|being|will|each|does|did|into|many|through|back|much|well|where|because|before|those|even|around|between|while|still|during|without|however|people|thing|things|think|like|things|thing|says|said|says|make|made|take|get|got|find|found|come|came|go|went|see|seen|give|gave|want|work|try|ask|keep|kept|let|show|showed|hear|heard|play|played|run|ran|move|moved|live|lived|believe|believed|bring|brought|seem|seemed|feel|felt|leave|left|call|called|need|needed|become|became|becomes|turn|turned|put|puts|means|mean|meant|help|helped|helps|high|low|big|small|long|short|old|young|good|bad|new|right|wrong|real|true|false|last|next|early|late|soon|far|near|here|there|every|any|some|none|all|both|few|many|most|other|another|such|only|own|same|so|than|too|very|just|because|but|and|or|if|while|yet|since|until|whether|although|though|unless|whereas|whilst|provided|assuming|given|supposing|considering|regarding|concerning|including|excluding|except|besides|apart|along|across|behind|beneath|beside|beyond|inside|outside|upon|within|without|among|amid|amongst|against|towards|unto|underneath|notwithstanding)$/.test(w)) {
          wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
          if (!seenInItem.has(w)) {
            seenInItem.add(w);
            wordSources.set(w, (wordSources.get(w) || 0) + 1);
          }
        }
      });
    });
    // TF-IDF 简化：freq * log(source_count + 1)
    const techKeywords = [...wordFreq.entries()]
      .filter(([w]) => w.length >= 4)
      .map(([word, freq]) => ({
        word,
        freq,
        sourceCount: wordSources.get(word) || 1,
        score: freq * Math.log((wordSources.get(word) || 1) + 1)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    // 跨源交叉验证：同一关键词被≥3个不同来源报道 = 高置信度
    const crossSourceSignals = techKeywords
      .filter(k => k.sourceCount >= 3)
      .slice(0, 10)
      .map(k => ({
        keyword: k.word,
        sourceCount: k.sourceCount,
        freq: k.freq,
        confidence: k.sourceCount >= 5 ? 'high' : k.sourceCount >= 3 ? 'medium' : 'low'
      }));

    // 技术雷达四象限数据
    // 采用(Adopt): 高频 + 高源覆盖 + 成熟赛道
    // 试验(Trial): 中高频 + 增长快
    // 评估(Assess): 低频但增长极快（新兴）
    // 暂缓(Hold): 低频 + 负增长或持平
    const techRadar = CATEGORIES.map(cat => {
      const growth = categoryGrowth.find(c => c.id === cat.id)?.growth || 0;
      const recent = categoryGrowth.find(c => c.id === cat.id)?.recent || 0;
      const sources = trendData.categoryStats.find(([id]) => id === cat.id)?.[1]?.sources?.size || 0;
      let quadrant = 'hold';
      if (recent >= 10 && sources >= 5 && growth >= -10) quadrant = 'adopt';
      else if (recent >= 5 && growth > 20) quadrant = 'trial';
      else if (growth > 50 || (recent >= 3 && growth > 30)) quadrant = 'assess';
      return { id: cat.id, label: cat.label, quadrant, recent, growth, sources };
    });

    // 源质量评分
    const sourceQuality = trendData.sourceStats.map(([name, data]) => {
      const srcItems = items.filter(i => i.source === name);
      const avgLen = srcItems.reduce((s, i) => s + (i.summary || '').length + (i.title || '').length, 0) / (srcItems.length || 1);
      const updateFreq = srcItems.length;
      const qualityScore = Math.min(100, Math.round(updateFreq * 5 + avgLen / 10));
      return { name, count: data.count, categories: data.categories.size, avgLen: Math.round(avgLen), qualityScore };
    }).sort((a, b) => b.qualityScore - a.qualityScore);

    // 机会雷达：低热度但高价值的资讯（来源权威 × 新鲜度 / 常见度）
    const opportunityRadar = items.map(item => {
      const highWeightSources = ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft', 'Nature', 'MIT Technology Review', 'ArXiv', 'Stanford'];
      const sourceWeight = highWeightSources.some(s => item.source?.includes(s)) ? 2.0 : 1.0;
      const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
      const freshness = Math.max(0, 1 - age / 48);
      const titleWords = (item.title || '').toLowerCase().split(/\s+/);
      const commonality = titleWords.reduce((sum, word) => {
        if (word.length < 4) return sum;
        const freq = items.filter(i => i.title?.toLowerCase().includes(word)).length;
        return sum + (freq > 0 ? Math.log(freq + 1) : 0);
      }, 0) / Math.max(titleWords.length, 1);
      const score = (sourceWeight * freshness * 100) / (commonality + 1);
      const isRelevant = followKeywords.length === 0 || followKeywords.some(kw =>
        `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())
      );
      return { ...item, opportunityScore: score, isRelevant };
    }).filter(item => item.opportunityScore > 5).sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 10);

    return {
      categoryGrowth,
      categoryMomentum,
      categoryRanking,
      regionDistribution,
      regionPct,
      anomalies,
      todayCount,
      yesterdayCount,
      dailyChange,
      risingKeywords,
      techKeywords,
      crossSourceSignals,
      techRadar,
      sourceQuality,
      day7,
      day7prev,
      day3,
      day14,
      day30,
      categoryTrend30,
      categoryCorrelations,
      opportunityRadar
    };
  }, [items]);

  // 阅读行为分析
  const readingProfile = useMemo(() => {
    const now = new Date();
    const buildDayKeys = (days) => Array.from({ length: days }).map((_, idx) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    // 连续阅读天数
    let streak = 0;
    const sorted = [...bookmarks].sort((a, b) => new Date(b.readAt || 0) - new Date(a.readAt || 0));
    const readDates = new Set(sorted.filter(b => b.readAt).map(b => b.readAt.slice(0, 10)));
    let checkDate = new Date(now);
    if (!readDates.has(`${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`)) {
      checkDate = new Date(checkDate.getTime() - 86400000);
    }
    while (true) {
      const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (readDates.has(ds)) { streak++; checkDate = new Date(checkDate.getTime() - 86400000); } else break;
    }

    // 阅读时段分布（24小时）
    const hourDist = Array(24).fill(0);
    sorted.filter(b => b.readAt).forEach(b => {
      const h = new Date(b.readAt).getHours();
      hourDist[h]++;
    });
    const peakHour = hourDist.indexOf(Math.max(...hourDist));

    // 兴趣画像
    const interestDist = {};
    bookmarks.forEach(b => {
      const cat = b.category || 'unknown';
      interestDist[cat] = (interestDist[cat] || 0) + 1;
    });
    const topInterests = Object.entries(interestDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({
      id, label: CATEGORIES.find(c => c.id === id)?.label || id, count,
      pct: bookmarks.length ? Math.round(count / bookmarks.length * 100) : 0
    }));

    // 阅读速度（近7天平均每日阅读数）
    const day7 = buildDayKeys(7);
    const weekReads = day7.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const avgDailyRead = Math.round(weekReads.reduce((a, b) => a + b, 0) / 7 * 10) / 10;

    // 收藏转阅读率
    const readRate = bookmarks.length ? Math.round(bookmarks.filter(b => b.isRead).length / bookmarks.length * 100) : 0;

    // 7天阅读热力图数据
    const heatData = day7.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const maxHeat = Math.max(...heatData, 1);

    // 来源偏好分析
    const sourceDist = {};
    bookmarks.forEach(b => {
      const source = b.source || '未知来源';
      sourceDist[source] = (sourceDist[source] || 0) + 1;
    });
    const topSources = Object.entries(sourceDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({
      name, count,
      pct: bookmarks.length ? Math.round(count / bookmarks.length * 100) : 0
    }));

    // 近30天阅读趋势
    const day30 = buildDayKeys(30);
    const trendData = day30.map(d => sorted.filter(b => (b.readAt || '').slice(0, 10) === d).length);
    const maxTrend = Math.max(...trendData, 1);

    // 阅读深度分析（基于摘要长度估算）
    const avgSummaryLength = bookmarks.length 
      ? Math.round(bookmarks.reduce((sum, b) => sum + (b.summary?.length || 0), 0) / bookmarks.length)
      : 0;
    const deepReads = bookmarks.filter(b => (b.summary?.length || 0) > 200).length;
    const shallowReads = bookmarks.filter(b => (b.summary?.length || 0) <= 100).length;

    // 标签偏好
    const tagDist = {};
    bookmarks.forEach(b => {
      (b.tags || []).forEach(tag => {
        tagDist[tag] = (tagDist[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagDist).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({
      name, count,
      pct: Object.values(tagDist).reduce((a, b) => a + b, 0) ? Math.round(count / Object.values(tagDist).reduce((a, b) => a + b, 0) * 100) : 0
    }));

    return {
      streak,
      peakHour,
      hourDist,
      topInterests,
      avgDailyRead,
      readRate,
      heatData,
      maxHeat,
      day7,
      topSources,
      trendData,
      maxTrend,
      day30,
      avgSummaryLength,
      deepReads,
      shallowReads,
      topTags,
      totalBookmarks: bookmarks.length
    };
  }, [bookmarks]);

  const eventClusters = useMemo(() => {
    if (nav !== 'all') return [];
    const clusters = [];
    const used = new Set();
    const titleWords = (t) => t.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(w => w.length > 2);

    for (let i = 0; i < filtered.length; i++) {
      if (used.has(i)) continue;
      const words = titleWords(filtered[i].title);
      const group = [filtered[i]];
      used.add(i);

      for (let j = i + 1; j < filtered.length; j++) {
        if (used.has(j)) continue;
        const otherWords = titleWords(filtered[j].title);
        const overlap = words.filter(w => otherWords.includes(w)).length;
        const threshold = Math.max(2, Math.min(words.length, otherWords.length) * 0.4);
        if (overlap >= threshold) {
          group.push(filtered[j]);
          used.add(j);
        }
      }

      if (group.length >= 2) {
        const kw = words.slice(0, 3).join(' ');
        clusters.push({ id: `cluster-${i}`, keyword: kw, items: group });
      }
    }
    return clusters;
  }, [filtered, nav]);

  const smartRecommendations = useMemo(() => {
    if (readingHistory.length === 0) return [];
    
    const categoryCounts = {};
    const sourceCounts = {};
    const keywordCounts = {};
    
    readingHistory.forEach(h => {
      if (h.category) categoryCounts[h.category] = (categoryCounts[h.category] || 0) + 1;
      if (h.source) sourceCounts[h.source] = (sourceCounts[h.source] || 0) + 1;
      if (h.tags) h.tags.forEach(t => keywordCounts[t] = (keywordCounts[t] || 0) + 1);
    });

    const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s);
    const topKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);

    const scored = items.map(item => {
      let score = 0;
      if (topCategories.includes(item.category)) score += 30;
      if (topSources.includes(item.source)) score += 20;
      item.tags?.forEach(t => { if (topKeywords.includes(t)) score += 10; });
      if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) score += 25;
      const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 20 - age);
      return { ...item, recScore: score };
    });

    const readIds = new Set(readingHistory.map(h => h.id));
    return scored.filter(i => !readIds.has(i.id) && i.recScore > 20).sort((a, b) => b.recScore - a.recScore).slice(0, 15);
  }, [items, readingHistory, followKeywords]);

  // 我的关注动态：按关键词分组展示最新匹配的资讯
  const followKeywordUpdates = useMemo(() => {
    if (followKeywords.length === 0) return [];
    return followKeywords.map(kw => {
      const matched = items.filter(item =>
        `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())
      ).slice(0, 3);
      return { keyword: kw, count: matched.length, items: matched };
    }).filter(g => g.count > 0);
  }, [followKeywords, items]);

  // 今日必读：基于关注关键词和阅读历史的推荐
  const todayMustRead = useMemo(() => {
    const readIds = new Set(readingHistory.map(h => h.id));
    return items
      .filter(item => !readIds.has(item.id))
      .map(item => {
        let score = 0;
        followKeywords.forEach(kw => {
          if (`${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())) {
            score += 20;
          }
        });
        // 来源权重
        const highWeightSources = ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft'];
        if (highWeightSources.some(s => item.source?.includes(s))) score += 10;
        // 新鲜度
        const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        score += Math.max(0, 15 - age);
        return { ...item, mustReadScore: score };
      })
      .sort((a, b) => b.mustReadScore - a.mustReadScore)
      .slice(0, 5);
  }, [items, followKeywords, readingHistory]);

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, month: month - 1, year, isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, month, year, isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    return days;
  }, [calendarDate]);

  const calendarHeatMap = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const d = new Date(item.publishedAt);
      if (d.getFullYear() === calendarDate.getFullYear() && d.getMonth() === calendarDate.getMonth()) {
        const key = d.getDate();
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [items, calendarDate]);

  const calendarInsights = useMemo(() => {
    const monthEvents = events.filter(e => {
      const d = new Date(`${e.date}T00:00:00`);
      return d.getFullYear() === calendarDate.getFullYear() && d.getMonth() === calendarDate.getMonth();
    });
    const upcoming = events
      .filter(e => new Date(`${e.date}T${e.time || '23:59'}`) >= new Date())
      .sort((a, b) => new Date(`${a.date}T${a.time || '23:59'}`) - new Date(`${b.date}T${b.time || '23:59'}`))
      .slice(0, 5);
    const activeDays = new Set(monthEvents.map(e => e.date)).size;
    return { monthTotal: monthEvents.length, activeDays, upcoming };
  }, [events, calendarDate]);

  const searchSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return items
      .map(i => i.title)
      .filter(t => t.toLowerCase().includes(q))
      .slice(0, 5);
  }, [items, query]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const currentItems = nav === 'all' ? filtered : nav === 'trending' ? trendingItems : [];
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, currentItems.length - 1));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        if (focusedIndex >= 0 && currentItems[focusedIndex]) window.open(currentItems[focusedIndex].url, '_blank');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (focusedIndex >= 0 && currentItems[focusedIndex]) toggleBookmark(currentItems[focusedIndex]);
      } else if (e.key === '1') { e.preventDefault(); setViewMode('compact'); }
      else if (e.key === '2') { e.preventDefault(); setViewMode('standard'); }
      else if (e.key === '3') { e.preventDefault(); setViewMode('card'); }
      else if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); }
      else if (e.key === 'Escape') { setShowShortcuts(false); setSearchOpen(false); setCategoryOpen(false); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedIndex, nav, filtered, trendingItems]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0) {
      const el = document.querySelector(`.news-item[data-index="${focusedIndex}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  function loadNews(b = blocked, append = false, searchQuery = '') {
    if (!append) { setLoading(true); setError(''); setNewsPage(0); setNewsHasMore(true); }
    const page = append ? newsPage + 1 : 0;
    const customParams = customSources.map(s => `custom=${encodeURIComponent(JSON.stringify(s))}`).join('&');
    const disabledParam = disabledSources.length > 0 ? `&disabledSources=${encodeURIComponent(disabledSources.join(','))}` : '';
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    // 兴趣过滤
    let interestsParam = '';
    if (nav === 'recommendations' && isLoggedIn && selectedInterests.length > 0) {
      interestsParam = `&interests=${encodeURIComponent(selectedInterests.join(','))}`;
    }
    fetch(`/api/news?blocked=${encodeURIComponent(b)}&page=${page}&pageSize=40${searchParam}${disabledParam}${interestsParam}${customParams ? '&' + customParams : ''}`)
      .then(r => r.json())
      .then(d => {
        if (append) {
          setItems(prev => [...prev, ...(d.items || [])]);
        } else {
          setItems(d.items || []);
        }
        setStats({ ...d, items: undefined });
        setNewsHasMore(d.hasMore ?? false);
        setNewsPage(page);
      })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }

  function loadMoreNews() {
    if (!newsHasMore || loadingMore || loading) return;
    setLoadingMore(true);
    loadNews(blocked, true, debouncedQuery);
  }

  function renderMarkdown(text) {
    if (!text) return '';
    // 确保 text 是字符串
    let str = text;
    if (typeof str === 'object') {
      str = str.content || str.text || JSON.stringify(str);
    }
    let html = typeof str === 'string' ? str : String(str);

    // 保护已存在的 <img> 标签，避免被 HTML escape 破坏
    const imgMap = new Map();
    let imgCounter = 0;
    html = html.replace(/<img[^>]*\/>/g, (match) => {
      const key = `__IMG_${imgCounter++}__`;
      imgMap.set(key, match);
      return key;
    });

    // Escape HTML (but preserve existing markdown syntax)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Fenced code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="code-block${lang ? ` language-${lang}` : ''}"><code>${code.trim()}</code></pre>`;
    });
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr />');
    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, headerRow, sepRow, bodyRows) => {
      const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });
    // Blockquotes (handle multi-line)
    html = html.replace(/^(?:&gt; (.+)\n?)+/gm, match => {
      const lines = match.split('\n').map(l => l.replace(/^&gt; /, '')).filter(Boolean);
      return `<blockquote>${lines.join('<br>')}</blockquote>`;
    });
    // Unordered lists
    html = html.replace(/((?:^[-*] .+\n?)+)/gm, list => {
      const items = list.trim().split('\n').map(line => `<li>${line.replace(/^[-*] /, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    });
    // Ordered lists
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, list => {
      const items = list.trim().split('\n').map(line => `<li>${line.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    });
    // Line breaks and paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // 恢复 <img> 标签
    imgMap.forEach((imgTag, key) => {
      html = html.replace(key, imgTag);
    });

    return `<p>${html}</p>`;
  }

  function renderMarkdownWithImages(text, images = []) {
    if (!text) return '';
    
    // 将图片占位符替换为实际的 Base64 数据，支持大小参数
    // 格式: ![alt](#img-id|w=300|h=200) 或 ![alt](#img-id|w=300)
    let processedText = text;
    if (images && images.length > 0) {
      images.forEach(img => {
        // 支持多种占位符格式
        // 1. ![alt](#img-id) - 默认尺寸
        // 2. ![alt](#img-id|w=300) - 指定宽度，高度自适应
        // 3. ![alt](#img-id|w=300|h=200) - 指定宽高
        const placeholderPattern = new RegExp(`!\\[([^\\]]*)\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
        
        processedText = processedText.replace(placeholderPattern, (match, alt) => {
          // 解析大小参数
          const sizeMatch = match.match(/\|w=(\d+)(?:\|h=(\d+))?/);
          let sizeAttrs = '';
          if (sizeMatch) {
            const width = sizeMatch[1];
            const height = sizeMatch[2];
            sizeAttrs = ` width="${width}"`;
            if (height) {
              sizeAttrs += ` height="${height}"`;
            }
          } else {
            // 如果没有指定大小，使用图片的原始尺寸但限制最大宽度
            sizeAttrs = ` style="max-width:100%;height:auto;"`;
          }
          return `<img src="${img.base64}" alt="${alt || img.alt}"${sizeAttrs} />`;
        });
      });
    }
    
    return renderMarkdown(processedText);
  }

  function loadTrending(append = false, platform = trendingPlatform) {
    if (!append) {
      setTrendingLoading(true);
      setTrendingPage(0);
      setTrendingHasMore(true);
    } else {
      setTrendingLoadingMore(true);
    }
    const params = new URLSearchParams();
    if (platform !== 'all') params.set('platform', platform);
    const page = append ? trendingPage + 1 : 0;
    params.set('page', page);
    params.set('pageSize', 20);
    const url = `/api/trending?${params}`;
    console.log('[Trending] Fetching:', url);
    fetch(url).then(r => r.json()).then(d => {
      console.log('[Trending] Received:', d.items?.length || 0, 'items, hasMore:', d.hasMore);
      if (append) {
        setTrendingItems(prev => [...prev, ...(d.items || [])]);
        setTrendingHasMore(d.hasMore ?? false);
        setTrendingPage(page);
      } else {
        setTrendingItems(d.items || []);
        setTrendingHasMore(d.hasMore ?? true);
        setTrendingPage(page);
      }
    }).catch(e => {
      console.error('[Trending] Error:', e);
    }).finally(() => {
      setTrendingLoading(false);
      setTrendingLoadingMore(false);
    });
  }

  function loadGithub(lang = githubLang, since = githubSince) {
    setGithubLoading(true);
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    params.set('since', since);
    fetch(`/api/github-trending?${params}`).then(r => r.json()).then(d => setGithubRepos(d.repos || [])).catch(() => {}).finally(() => setGithubLoading(false));
  }

  function toggleBookmark(item) {
    setBookmarks(prev => {
      const exists = prev.find(b => b.itemId === item.id);
      if (exists) return prev.filter(b => b.itemId !== item.id);
      return [...prev, { id: Date.now(), itemId: item.id, title: item.title, url: item.url, source: item.source, savedAt: new Date().toISOString(), isRead: false, readAt: null, summary: item.summary, tags: item.tags, region: item.region, mode: item.mode, publishedAt: item.publishedAt, category: item.category }];
    });
  }

  function isBookmarked(itemId) { return bookmarks.some(b => b.itemId === itemId); }
  function isInMaterials(itemId) { return materials.some(m => m.originalItemId === itemId); }

  function toggleRead(bookmarkId) {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, isRead: !b.isRead, readAt: !b.isRead ? new Date().toISOString() : null } : b));
  }

  // 根据内容智能判断素材类型
  function detectMaterialType(item) {
    if (item.category) {
      const catMap = {
        'ai-models': 'data', 'ai-apps': 'data', 'ai-tools': 'data',
        'open-source': 'case', 'developer': 'case',
        'funding': 'data', 'ipo': 'data', 'mergers-acquisitions': 'data',
        'policy': 'viewpoint', 'regulation': 'viewpoint',
        'industry-trends': 'viewpoint', 'emerging-tech': 'viewpoint',
        'product-launch': 'case', 'partnership': 'case',
      };
      return catMap[item.category] || 'quote';
    }
    return 'quote';
  }

  // 素材库操作
  function toggleMaterial(item, type = null, note = '') {
    if (isInMaterials(item.id)) {
      setMaterials(prev => prev.filter(m => m.originalItemId !== item.id));
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '已从素材库移除';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } else {
      const detectedType = type || detectMaterialType(item);
      const newMaterial = {
        id: Date.now(),
        type: detectedType,
        title: item.title,
        content: item.summary || item.title,
        fullContent: item.content || item.summary || item.title,
        source: item.source,
        url: item.url,
        tags: item.tags || [],
        originalItemId: item.id,
        note,
        createdAt: new Date().toISOString()
      };
      setMaterials(prev => [...prev, newMaterial]);
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '✓ 已添加到素材库';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  }

  function addManualMaterial({ title, content, type, source, url, tags, note, spaceId }) {
    const newMaterial = {
      id: Date.now(),
      type,
      title,
      content,
      source: source || '手动添加',
      url: url || '',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      note,
      spaceId: spaceId ? Number(spaceId) : null,
      createdAt: new Date().toISOString()
    };
    setMaterials(prev => [...prev, newMaterial]);
    setShowAddMaterial(false);
  }

  function removeMaterial(id) {
    setMaterials(prev => prev.filter(m => m.id !== id));
  }

  function batchRemoveMaterials(ids) {
    setMaterials(prev => prev.filter(m => !ids.includes(m.id)));
    setSelectedMaterials([]);
  }

  function updateMaterialTags(id, tags) {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, tags } : m));
  }

  function toggleMaterialSelection(id) {
    setSelectedMaterials(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function selectAllMaterials() {
    setSelectedMaterials(filteredMaterials.map(m => m.id));
  }

  function clearMaterialSelection() {
    setSelectedMaterials([]);
  }

  function updateMaterialNote(id, note) {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, note } : m));
  }

  function assignMaterialsToSpace(ids, spaceId) {
    setMaterials(prev => prev.map(m => ids.includes(m.id) ? { ...m, spaceId } : m));
    setSelectedMaterials([]);
  }

  function createMaterialSpace() {
    if (!newSpaceName.trim()) return;
    const newSpace = { id: Date.now(), name: newSpaceName.trim(), createdAt: new Date().toISOString() };
    setMaterialSpaces(prev => [...prev, newSpace]);
    setNewSpaceName('');
    setShowSpaceForm(false);
  }

  function deleteMaterialSpace(id) {
    setMaterialSpaces(prev => prev.filter(s => s.id !== id));
    setMaterials(prev => prev.map(m => m.spaceId === id ? { ...m, spaceId: null } : m));
    if (materialSpaceFilter === String(id)) setMaterialSpaceFilter('all');
  }

  function toggleMaterialStar(id) {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  }

  function exportMaterials() {
    const data = JSON.stringify(materials, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tech-radar-materials-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importMaterials(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          setMaterials(prev => [...prev, ...imported.map(m => ({ ...m, id: Date.now() + Math.random() }))]);
          const toast = document.createElement('div');
          toast.className = 'material-toast';
          toast.textContent = `✓ 成功导入 ${imported.length} 条素材`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2000);
        }
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  }

  // 文章操作
  function createArticle(template = 'blank', spaceId = null) {
    let templateContent = ARTICLE_TEMPLATE_CONTENT[template] || '';
    templateContent = templateContent.replace('{DATE}', new Date().toLocaleDateString('zh-CN'));
    const defaultTitle = template === 'briefing' ? `每日简报 · ${new Date().toLocaleDateString('zh-CN')}` : template === 'blank' ? '未命名文章' : '';
    const newArticle = {
      id: Date.now(),
      title: defaultTitle,
      content: templateContent,
      template,
      materials: [],
      tags: [],
      status: 'draft',
      spaceId: spaceId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      images: []
    };
    setArticles(prev => [...prev, newArticle]);
    return newArticle;
  }

  function updateArticle(id, updates) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  }

  function deleteArticle(id) {
    setArticles(prev => prev.filter(a => a.id !== id));
  }

  function duplicateArticle(id) {
    const original = articles.find(a => a.id === id);
    if (!original) return;
    const copy = {
      ...original,
      id: Date.now(),
      title: `${original.title} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    setArticles(prev => [...prev, copy]);
  }

  function addArticleTag(id, tag) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setArticles(prev => prev.map(a => a.id === id ? { ...a, tags: a.tags.includes(trimmed) ? a.tags : [...a.tags, trimmed], updatedAt: new Date().toISOString() } : a));
  }

  function removeArticleTag(id, tag) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, tags: a.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() } : a));
  }

  function triggerAutoSave(article) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      setLastSavedAt(new Date().toISOString());
      setAutoSaveTimer(null);
    }, 500);
    setAutoSaveTimer(timer);
  }

  function handleContentChange(article, newContent) {
    updateArticle(article.id, { content: newContent });
    triggerAutoSave(article);
  }

  function handleTitleChange(article, newTitle) {
    updateArticle(article.id, { title: newTitle });
    triggerAutoSave(article);
  }

  function insertAtCursor(article, text, wrapBefore, wrapAfter) {
    const ta = editorTextareaRef.current;
    if (!ta) {
      updateArticle(article.id, { content: article.content + (wrapBefore || '') + text + (wrapAfter || '') });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = article.content.substring(start, end);
    const before = article.content.substring(0, start);
    const after = article.content.substring(end);
    const insert = wrapBefore ? wrapBefore + (selected || text) + wrapAfter : text;
    const newContent = before + insert + after;
    updateArticle(article.id, { content: newContent });
    setTimeout(() => {
      ta.focus();
      const newPos = wrapBefore ? start + wrapBefore.length + (selected || text).length + (wrapAfter || '').length : start + text.length;
      ta.setSelectionRange(selected ? start + (wrapBefore || '').length : newPos, newPos);
    }, 0);
  }

  function insertMaterialAtCursor(article, material) {
    const ta = editorTextareaRef.current;
    const ref = `\n> [${material.content.slice(0, 50)}...](${material.url || ''})\n> 来源: ${material.source}\n\n`;
    if (!ta) {
      const newContent = article.content + ref;
      updateArticle(article.id, { content: newContent, materials: article.materials.includes(material.id) ? article.materials : [...article.materials, material.id] });
      return;
    }
    const start = ta.selectionStart;
    const before = article.content.substring(0, start);
    const after = article.content.substring(start);
    const newContent = before + ref + after;
    updateArticle(article.id, { content: newContent, materials: article.materials.includes(material.id) ? article.materials : [...article.materials, material.id] });
    setTimeout(() => {
      ta.focus();
      const newPos = start + ref.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  }

  function removeLinkedMaterial(article, materialId) {
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, materials: a.materials.filter(id => id !== materialId) } : a));
  }

  // 处理图片上传
  function handleImageUpload(article, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const alt = file.name.replace(/\.[^/.]+$/, '');
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 获取图片原始尺寸
      const img = new Image();
      img.onload = () => {
        const imageData = {
          id: imageId,
          base64: base64,
          alt: alt,
          width: img.width,
          height: img.height
        };
        
        // 更新文章，添加图片数据
        const existingImages = article.images || [];
        const updatedImages = [...existingImages, imageData];
        updateArticle(article.id, { images: updatedImages });
        
        // 在编辑器中插入占位符（默认使用原始尺寸，但允许后续调整）
        const markdown = `\n![${alt}](#${imageId})\n`;
        insertAtCursor(article, markdown, '', '');
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }

  // 处理粘贴图片
  function handlePaste(e, article) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(article, file);
        }
        break;
      }
    }
  }

  // 创作空间管理
  function createArticleSpace(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newSpace = { id: Date.now(), name: trimmed, createdAt: new Date().toISOString() };
    setArticleSpaces(prev => [...prev, newSpace]);
    setNewArticleSpaceName('');
    setArticleSpaceFormOpen(false);
  }

  function deleteArticleSpace(id) {
    setArticleSpaces(prev => prev.filter(s => s.id !== id));
    setArticles(prev => prev.map(a => a.spaceId === id ? { ...a, spaceId: null } : a));
    if (articleSpaceFilter === String(id)) setArticleSpaceFilter('all');
  }

  function assignArticleToSpace(id, spaceId) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, spaceId: spaceId || null } : a));
  }

  function batchAssignArticlesToSpace(ids, spaceId) {
    setArticles(prev => prev.map(a => ids.includes(a.id) ? { ...a, spaceId: spaceId || null } : a));
  }

  // AI 辅助写作
  async function aiAction(article, action, content) {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      setAiResult({ loading: false, content: '', error: '请先配置大模型', action });
      return;
    }
    setAiResult({ loading: true, content: '', error: '', action });
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action,
          content
        })
      });
      const data = await res.json();
      if (data.ok) {
        setAiResult({ loading: false, content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content), error: '', action });
      } else {
        setAiResult({ loading: false, content: '', error: data.error || '请求失败', action });
      }
    } catch (e) {
      setAiResult({ loading: false, content: '', error: e.message, action });
    }
  }

  function insertAiResult(article) {
    if (!aiResult.content) return;
    if (aiResult.action === 'title') {
      updateArticle(article.id, { title: aiResult.content.trim() });
    } else if (aiResult.action === 'rewrite' || aiResult.action === 'translate_zh' || aiResult.action === 'simplify' || aiResult.action === 'expand') {
      const selected = window.getSelection().toString();
      if (selected) {
        updateArticle(article.id, { content: article.content.replace(selected, aiResult.content) });
      } else {
        updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
      }
    } else if (aiResult.action === 'summary' || aiResult.action === 'outline') {
      updateArticle(article.id, { content: `> ${aiResult.action === 'summary' ? '摘要' : '大纲'}\n\n${aiResult.content}\n\n---\n\n` + article.content });
    } else if (aiResult.action === 'custom') {
      updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
    } else {
      updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
    }
    setAiResult({ loading: false, content: '', error: '', action: '' });
  }

  function clearAiResult() {
    setAiResult({ loading: false, content: '', error: '', action: '' });
  }

  // AI 每日简报生成
  async function generateAiBrief() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      setAiBrief({ loading: false, content: '', error: '请先在设置中配置大模型', generatedAt: null });
      return;
    }
    setAiBrief({ loading: true, content: '', error: '', generatedAt: null });
    try {
      const topNews = items.slice(0, 15).map(i => `- ${i.title} (${i.source})`).join('\n');
      const signals = insightData.anomalies.slice(0, 5).map(a => `- ${a.label}: ${a.type === 'surge' ? '升温' : '降温'} ${a.growth > 0 ? '+' : ''}${a.growth}%`).join('\n');
      const prompt = `请根据以下今日科技资讯生成一份简洁的中文每日简报（500字以内）：

## 要闻
${topNews}

## 信号
${signals}

格式要求：
1. 【今日焦点】1-2条最重要新闻及简评
2. 【赛道观察】2-3个值得关注的趋势
3. 【明日关注】1-2个前瞻性预测

保持简洁客观，避免冗余。`;

      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'custom',
          content: prompt
        })
      });
      const data = await res.json();
      if (data.ok) {
        setAiBrief({ loading: false, content: data.content, error: '', generatedAt: new Date().toISOString() });
      } else {
        setAiBrief({ loading: false, content: '', error: data.error || '生成失败', generatedAt: null });
      }
    } catch (e) {
      setAiBrief({ loading: false, content: '', error: e.message, generatedAt: null });
    }
  }

  // Markdown 简化渲染（支持标题、粗体、列表）- 用于 AI 简报
  function renderBriefMarkdown(text) {
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(<ul key={`list-${elements.length}`} className="brief-list">{listItems.map((item, i) => <li key={i}>{item}</li>)}</ul>);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      // 标题
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(<h4 key={idx} className="brief-h2">{renderInline(trimmed.slice(3))}</h4>);
      } else if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(<h3 key={idx} className="brief-h1">{renderInline(trimmed.slice(2))}</h3>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('1. ') || /^\d+\.\s/.test(trimmed)) {
        inList = true;
        const content = trimmed.replace(/^[-\d]+\.\s|^- /, '');
        listItems.push(renderInline(content));
      } else {
        flushList();
        elements.push(<p key={idx} className="brief-p">{renderInline(trimmed)}</p>);
      }
    });
    flushList();
    return elements;
  }

  function renderInline(text) {
    // 粗体 **text**
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
  }

  // 保存简报到素材库
  function saveBriefToMaterials() {
    if (!aiBrief.content) return;
    const title = `AI简报 · ${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN')}`;
    const newMaterial = {
      id: Date.now(),
      type: 'viewpoint',
      title,
      content: aiBrief.content,
      source: 'AI 每日简报',
      url: '',
      tags: ['AI简报'],
      note: '',
      createdAt: new Date().toISOString()
    };
    setMaterials(prev => [...prev, newMaterial]);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已保存到素材库';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // 导出简报为本地文件
  function exportBriefToFile() {
    if (!aiBrief.content) return;
    const title = `AI简报_${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
    const blob = new Blob([aiBrief.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已下载为 markdown 文件';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // 导出文章为本地文件
  function exportArticleToFile(article) {
    const title = (article.title || '未命名').replace(/[\\/:*?"<>|]/g, '_');
    
    // 处理图片占位符（支持大小参数）
    let exportContent = article.content;
    if (article.images && article.images.length > 0) {
      article.images.forEach(img => {
        // 支持带大小参数的占位符
        const placeholderPattern = new RegExp(`!\\[([^\\]]*)\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
        exportContent = exportContent.replace(placeholderPattern, (match, alt) => {
          // 解析大小参数
          const sizeMatch = match.match(/\|w=(\d+)(?:\|h=(\d+))?/);
          let sizeAttrs = '';
          if (sizeMatch) {
            sizeAttrs = ` width="${sizeMatch[1]}"`;
            if (sizeMatch[2]) {
              sizeAttrs += ` height="${sizeMatch[2]}"`;
            }
          }
          return `<img src="${img.base64}" alt="${alt || img.alt}"${sizeAttrs} />`;
        });
      });
    }
    
    const content = `# ${article.title || '未命名'}\n\n> 创建时间: ${new Date(article.createdAt).toLocaleString('zh-CN')}\n> 更新时间: ${new Date(article.updatedAt).toLocaleString('zh-CN')}\n> 模板: ${ARTICLE_TEMPLATES[article.template] || article.template}\n> 状态: ${ARTICLE_STATUS[article.status] || article.status}\n${article.tags.length > 0 ? `> 标签: ${article.tags.join(', ')}\n` : ''}\n---\n\n${exportContent}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已下载为 markdown 文件';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  // 导出简报到创作中心
  function exportBriefToEditor() {
    if (!aiBrief.content) return;
    const title = `AI简报 · ${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN')}`;
    const newArticle = {
      id: Date.now(),
      title,
      content: aiBrief.content,
      template: 'blank',
      materials: [],
      tags: ['AI简报'],
      status: 'draft',
      spaceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    setArticles(prev => [...prev, newArticle]);
    setCurrentArticleId(newArticle.id);
    setNav('editor');
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已导出到创作中心';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  const readingStatsData = useMemo(() => {
    const buildDayKeys = (days) => Array.from({ length: days }).map((_, idx) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (days - 1 - idx));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const day7 = buildDayKeys(7);
    const day30 = buildDayKeys(30);
    const saved7 = day7.map(k => bookmarks.filter(b => (b.savedAt || '').slice(0, 10) === k).length);
    const read7 = day7.map(k => bookmarks.filter(b => (b.readAt || '').slice(0, 10) === k).length);
    const saved30 = day30.map(k => bookmarks.filter(b => (b.savedAt || '').slice(0, 10) === k).length);
    const read30 = day30.map(k => bookmarks.filter(b => (b.readAt || '').slice(0, 10) === k).length);
    return {
      labels7: day7.map(d => d.slice(5)),
      labels30: day30.map(d => d.slice(5)),
      series7: [{ name: '新增收藏', values: saved7 }, { name: '完成阅读', values: read7 }],
      series30: [{ name: '新增收藏', values: saved30 }, { name: '完成阅读', values: read30 }]
    };
  }, [bookmarks]);

  const exportFilteredBookmarks = useMemo(() => {
    const now = Date.now();
    const rangeMs = exportRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : exportRange === '30d' ? 30 * 24 * 60 * 60 * 1000 : null;
    return bookmarks.filter((b) => {
      const byCategory = exportCategory === 'all' || b.category === exportCategory;
      const byRange = !rangeMs || new Date(b.savedAt || 0).getTime() >= now - rangeMs;
      return byCategory && byRange;
    });
  }, [bookmarks, exportCategory, exportRange]);

  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (materialSpaceFilter !== 'all') {
      const sid = Number(materialSpaceFilter);
      result = result.filter(m => m.spaceId === sid);
    }
    if (materialFilter !== 'all') result = result.filter(m => m.type === materialFilter);
    if (materialTimeRange !== 'all') {
      const now = Date.now();
      const ms = materialTimeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      result = result.filter(m => new Date(m.createdAt).getTime() >= now - ms);
    }
    if (materialSourceFilter !== 'all') {
      result = result.filter(m => m.source === materialSourceFilter);
    }
    if (materialSearch) {
      const q = materialSearch.toLowerCase();
      result = result.filter(m => 
        (m.content || '').toLowerCase().includes(q) || 
        (m.source || '').toLowerCase().includes(q) || 
        (m.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (m.note || '').toLowerCase().includes(q)
      );
    }
    if (materialTags.length > 0) {
      result = result.filter(m => (m.tags || []).some(t => materialTags.includes(t)));
    }
    result.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [materials, materialSpaceFilter, materialFilter, materialTimeRange, materialSourceFilter, materialSearch, materialTags]);

  const allMaterialSources = useMemo(() => {
    const sourceSet = new Set();
    materials.forEach(m => m.source && sourceSet.add(m.source));
    return Array.from(sourceSet).sort();
  }, [materials]);

  const allMaterialTags = useMemo(() => {
    const tagSet = new Set();
    materials.forEach(m => (m.tags || []).forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [materials]);

  // 计算每个素材被文章引用的次数
  const materialRefCounts = useMemo(() => {
    const counts = {};
    articles.forEach(a => {
      (a.materials || []).forEach(mid => {
        counts[mid] = (counts[mid] || 0) + 1;
      });
    });
    return counts;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    let result = [...articles];
    if (articleSpaceFilter !== 'all') {
      const sid = Number(articleSpaceFilter);
      result = result.filter(a => a.spaceId === sid);
    }
    if (articleSearch) {
      const q = articleSearch.toLowerCase();
      result = result.filter(a => (a.title || '').toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q) || (a.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (articleStatusFilter !== 'all') result = result.filter(a => a.status === articleStatusFilter);
    if (articleTemplateFilter !== 'all') result = result.filter(a => a.template === articleTemplateFilter);
    if (articleSort === 'updated') result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    else if (articleSort === 'created') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (articleSort === 'title') result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-CN'));
    return result;
  }, [articles, articleSpaceFilter, articleSearch, articleStatusFilter, articleTemplateFilter, articleSort]);

  const filteredExportArticles = useMemo(() => {
    if (articleExportFilter === 'all') return articles;
    return articles.filter(a => a.status === articleExportFilter);
  }, [articles, articleExportFilter]);

  function exportArticle(article, format) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${article.title.replace(/[^\w\s\u4e00-\u9fff]/g, '')}-${dateStr}`;

    if (format === 'md') {
      const md = `# ${article.title}\n\n${article.content}`;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const renderedHtml = renderMarkdown(article.content);
      const printHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${article.title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;line-height:1.8}h1{font-size:28px;border-bottom:2px solid #eee;padding-bottom:12px;margin-bottom:24px}h2{font-size:22px;margin:28px 0 12px;color:#222}h3{font-size:18px;margin:20px 0 10px}p{margin-bottom:16px;text-align:justify}ul,ol{margin-bottom:16px;padding-left:24px}li{margin-bottom:6px}blockquote{border-left:4px solid #ddd;padding-left:16px;color:#666;margin:16px 0;font-style:italic}pre{background:#f5f5f5;padding:16px;border-radius:6px;overflow-x:auto;font-size:14px;line-height:1.5}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:"DM Mono",monospace;font-size:14px}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5;font-weight:600}img{max-width:100%;border-radius:6px;margin:12px 0}a{color:#3b82f6}hr{border:none;border-top:1px solid #eee;margin:24px 0}@media print{body{padding:0;max-width:100%}}</style></head><body><h1>${article.title}</h1><div class="meta" style="color:#999;font-size:14px;margin-bottom:24px">Tech Radar · ${dateStr} · ${ARTICLE_TEMPLATES[article.template]} · ${ARTICLE_STATUS[article.status]}</div>${renderedHtml}</body></html>`;
      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) return;
      setTimeout(() => { w.print(); }, 300);
    } else {
      const renderedHtml = renderMarkdown(article.content);
      const cssMap = {
        html: `body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#333;line-height:1.8}h1{border-bottom:2px solid #eee;padding-bottom:12px;margin-bottom:20px}h2{font-size:20px;margin:24px 0 12px;color:#222}h3{font-size:17px;margin:18px 0 8px}p{margin-bottom:14px}ul,ol{margin-bottom:14px;padding-left:24px}li{margin-bottom:4px}blockquote{border-left:4px solid #ddd;padding-left:16px;color:#666;margin:14px 0}pre{background:#f5f5f5;padding:14px;border-radius:6px;overflow-x:auto;font-size:14px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:monospace}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5}img{max-width:100%;border-radius:6px}a{color:#3b82f6}hr{border:none;border-top:1px solid #eee;margin:20px 0}`,
        wechat: `body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:677px;margin:0 auto;padding:16px;color:#333;line-height:1.8;font-size:16px}h1{font-size:24px;text-align:center;margin-bottom:8px}h2{font-size:20px;border-left:4px solid #07c160;padding-left:12px;margin:20px 0 12px;color:#333}h3{font-size:17px;color:#666;margin:16px 0 8px}.meta{text-align:center;color:#999;font-size:14px;margin-bottom:24px}p{margin-bottom:16px;text-align:justify}ul,ol{margin-bottom:16px;padding-left:20px}li{margin-bottom:6px}blockquote{background:#f7f7f7;border-left:none;padding:16px;margin:16px 0;border-radius:8px}pre{background:#f7f7f7;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px}code{background:#f7f7f7;padding:2px 6px;border-radius:3px}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #e0e0e0;padding:8px 12px;text-align:left}th{background:#f7f7f7}img{max-width:100%;border-radius:6px;margin:12px 0}a{color:#576b95}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}`,
        zhihu: `body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1a1a1a;line-height:1.75;font-size:16px}h1{font-size:26px;font-weight:700;margin-bottom:16px}h2{font-size:22px;font-weight:600;margin:24px 0 12px}h3{font-size:18px;font-weight:600;margin:18px 0 8px}p{margin-bottom:16px}ul,ol{margin-bottom:16px;padding-left:20px}li{margin-bottom:6px}blockquote{border-left:4px solid #0066ff;padding-left:16px;color:#666;margin:16px 0}pre{background:#f6f6f6;padding:16px;border-radius:4px;overflow-x:auto;font-size:14px}code{background:#f6f6f6;padding:2px 6px;border-radius:3px;font-family:monospace}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #e0e0e0;padding:8px 12px;text-align:left}th{background:#f6f6f6}img{max-width:100%;border-radius:4px;margin:12px 0}a{color:#0066ff}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}`
      };
      const css = cssMap[format] || cssMap.html;
      const htmlContent = `<!doctype html><html><head><meta charset="utf-8"><title>${article.title}</title><style>${css}</style></head><body><h1>${article.title}</h1><div class="meta" style="color:#999;font-size:14px;margin-bottom:24px">Tech Radar · ${dateStr}</div>${renderedHtml}</body></html>`;

      if (format === 'html') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(htmlContent);
        w.document.close();
        w.focus();
      }
    }
  }

  function copyArticleAsRichText(article) {
    const renderedHtml = renderMarkdown(article.content);
    const fullHtml = `<h1>${article.title}</h1>${renderedHtml}`;
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([article.content], { type: 'text/plain' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).then(() => {
        showToast('✓ 已复制富文本到剪贴板');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = article.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✓ 已复制 Markdown 文本');
    }
  }

  function generateSummary(item) {
    if (summaryCache[item.id]) return summaryCache[item.id];
    const title = item.title;
    const source = item.source;
    const tags = item.tags?.join('、') || '';
    const summaryText = item.summary || '';
    const points = [
      `核心: ${title}`,
      tags ? `领域: ${tags}` : `来源: ${source}`,
      summaryText.length > 20 ? `要点: ${summaryText.slice(0, 80)}` : `追踪: ${source}`
    ];
    const result = points.join(' | ');
    setSummaryCache(prev => ({ ...prev, [item.id]: result }));
    return result;
  }

  function addFollowKeyword(kw) {
    const keyword = kw || newKeyword;
    if (!keyword.trim() || followKeywords.includes(keyword.trim())) return;
    setFollowKeywords(prev => [...prev, keyword.trim()]);
    setNewKeyword('');
  }

  function removeFollowKeyword(kw) {
    setFollowKeywords(prev => prev.filter(k => k !== kw));
    setPinnedKeywords(prev => prev.filter(k => k !== kw));
  }

  function pinFollowKeyword(kw) {
    setPinnedKeywords(prev => prev.includes(kw) ? prev : [...prev, kw]);
  }

  function unpinFollowKeyword(kw) {
    setPinnedKeywords(prev => prev.filter(k => k !== kw));
  }

  const sortedFollowKeywords = useMemo(() => {
    const pinned = pinnedKeywords.filter(k => followKeywords.includes(k));
    const unpinned = followKeywords.filter(k => !pinned.includes(k));
    return [...pinned, ...unpinned];
  }, [followKeywords, pinnedKeywords]);

  const matchCountPerKeyword = useMemo(() => {
    const map = {};
    followKeywords.forEach(kw => {
      map[kw] = filtered.filter(item => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())).length;
    });
    return map;
  }, [followKeywords, filtered]);

  function addTrackTarget() {
    if (!newTrackTarget.trim()) return;
    const id = Date.now().toString();
    setTrackTargets(prev => [...prev, { id, keyword: newTrackTarget.trim(), aliases: [], createdAt: new Date().toISOString() }]);
    setNewTrackTarget('');
  }

  function recordReading(item) {
    setReadingHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id);
      return [{ id: item.id, title: item.title, source: item.source, category: item.category, tags: item.tags, readAt: new Date().toISOString() }, ...filtered].slice(0, 100);
    });
  }

  async function requestTranslation(item) {
    console.log('[Translation] Called for item:', item.id, item.title);

    const existing = translations[item.id];
    // 如果存在旧翻译且格式正确（有 summary 字段），直接返回；否则重新翻译
    if (existing && existing.title && existing.title !== item.title && existing.summary !== undefined) {
      console.log('[Translation] Using existing translation:', existing);
      return existing;
    }
    if (translatingItems[item.id]) {
      console.log('[Translation] Already translating, skipping');
      return null;
    }

    const isEnglish = /^[a-zA-Z0-9\s\-.,!?"'():;&%$#@*+\[\]{}|\\\/<>`~+=]+$/.test(item.title) && !/^[\u4e00-\u9fff]/.test(item.title);
    console.log('[Translation] isEnglish check:', isEnglish, 'title:', item.title);
    if (!isEnglish) {
      console.log('[Translation] Not English content, skipping');
      return null;
    }

    console.log('[Translation] llmConfig:', { baseUrl: llmConfig.baseUrl, selectedModel: llmConfig.selectedModel });
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      console.log('[Translation] LLM config missing');
      showToast('请先在设置中配置大模型 API');
      return null;
    }

    console.log('[Translation] Starting translation request...');
    setTranslatingItems(prev => ({ ...prev, [item.id]: true }));

    try {
      const content = `title: ${item.title}\nsummary: ${item.summary || ''}`;
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'translate_zh',
          content
        })
      });

      const data = await response.json();
      console.log('[Translation] API response:', data);

      if (data.error) {
        showToast(`翻译失败: ${data.error}`);
        return null;
      }

      const lines = (data.content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // 跳过 LLM 添加的说明文字前缀
      const skipPrefixes = ['以下是', 'Here is', 'Translation:', '翻译：', 'Translated:', '翻译结果', '以下是翻译结果'];
      const filteredLines = lines.filter(line => !skipPrefixes.some(prefix => line.toLowerCase().startsWith(prefix.toLowerCase())));
      const finalLines = filteredLines.length > 0 ? filteredLines : lines;

      console.log('[Translation] Parsed lines:', finalLines);

      if (finalLines.length === 0) {
        showToast('翻译返回空内容');
        return null;
      }

      // 第一行作为标题，其余作为摘要
      const title = finalLines[0] || item.title;
      const summary = finalLines.slice(1).join('\n') || '';

      console.log('[Translation] Translated:', { title, summary });

      if (!title || title === item.title) {
        showToast('翻译失败：无法获取翻译结果');
        return null;
      }

      // 检查标题是否包含中文（简单判断）
      const hasChinese = /[\u4e00-\u9fff]/.test(title);
      if (!hasChinese) {
        showToast('翻译结果不包含中文，请重试');
        return null;
      }

      const translated = { title, summary };
      setTranslations(prev => ({ ...prev, [item.id]: translated }));
      console.log('[Translation] Saved to state:', translated);
      return translated;
    } catch (e) {
      console.error('[Translation] Error:', e);
      showToast(`翻译失败: ${e.message}`);
      return null;
    } finally {
      setTranslatingItems(prev => ({ ...prev, [item.id]: false }));
    }
  }

  function getTranslation(item) {
    return translations[item.id] || null;
  }

  function executeSearch(q) {
    setNav('all');
    setCategory('all');
    setMode('all');
    setSourceFilter('all');
    setQuery(q);
    if (q.trim()) {
      setSearchHistory(prev => {
        const filtered = prev.filter(h => h.query !== q.trim());
        return [{ query: q.trim(), searchedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
      });
    }
    setSearchOpen(false);
  }

  function addEvent() {
    if (!eventForm.title || !selectedDate) return;
    setEvents(prev => [...prev, {
      id: Date.now(),
      title: eventForm.title,
      time: eventForm.time,
      color: eventForm.color,
      date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`
    }]);
    setEventForm({ title: '', time: '', color: '#22d3ee' });
    setShowEventForm(false);
  }

  function removeEvent(id) { setEvents(prev => prev.filter(e => e.id !== id)); }

  function getEventsForDay(dayInfo) {
    if (!dayInfo.isCurrentMonth) return [];
    const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  }

  function isToday(dayInfo) {
    const now = new Date();
    return dayInfo.isCurrentMonth && dayInfo.day === now.getDate() && dayInfo.month === now.getMonth() && dayInfo.year === now.getFullYear();
  }

  function getHeatLevel(day) {
    const count = calendarHeatMap.get(day) || 0;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  }

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${panelCollapsed ? 'panel-collapsed' : ''} ${editorFullscreen ? 'editor-fullscreen' : ''}`}>
      <div className="particle-layer" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => <span key={i} className="particle" style={{ '--i': i }} />)}
      </div>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
<div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="none" className="logo-svg">
                <defs>
                  <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2ff"/>
                    <stop offset="50%" stopColor="#00a8ff"/>
                    <stop offset="100%" stopColor="#7c00ff"/>
                  </linearGradient>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2ff"/>
                    <stop offset="100%" stopColor="#7c00ff"/>
                  </linearGradient>
                  <filter id="techGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="techGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="blur1"/>
                    <feGaussianBlur stdDeviation="6" result="blur2"/>
                    <feMerge>
                      <feMergeNode in="blur2"/>
                      <feMergeNode in="blur1"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <g className="logo-core-glow">
                  <circle cx="24" cy="24" r="14" fill="url(#coreGrad)" opacity="0.15" filter="url(#techGlow)"/>
                </g>
                <g className="logo-rings">
                  <circle cx="24" cy="24" r="20" stroke="url(#ringGrad)" strokeWidth="0.5" fill="none" opacity="0.4" strokeDasharray="3 2"/>
                  <circle cx="24" cy="24" r="16" stroke="url(#ringGrad)" strokeWidth="1" fill="none" opacity="0.6"/>
                  <circle cx="24" cy="24" r="12" stroke="url(#ringGrad)" strokeWidth="0.5" fill="none" opacity="0.5" strokeDasharray="2 3"/>
                </g>
                <g className="logo-core">
                  <polygon points="24,10 31,13.5 31,20.5 31,27.5 24,31 17,27.5 17,20.5 17,13.5" stroke="url(#coreGrad)" strokeWidth="1.5" fill="rgba(0,242,255,0.1)"/>
                  <polygon points="24,14 27,16 27,19 27,22 24,24 21,22 21,19 21,16" stroke="#00f2ff" strokeWidth="1" fill="rgba(0,242,255,0.2)" filter="url(#techGlow)"/>
                  <circle cx="24" cy="19" r="1.5" fill="#00f2ff" filter="url(#techGlowStrong)"/>
                </g>
                <g className="logo-data-flow">
                  <line x1="24" y1="5" x2="24" y2="8" stroke="#00f2ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="24" y1="31" x2="24" y2="34" stroke="#00f2ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="5" y1="19" x2="8" y2="19" stroke="#7c00ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="40" y1="19" x2="43" y2="19" stroke="#7c00ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="10" y1="10" x2="12.5" y2="12.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="38" y1="10" x2="35.5" y2="12.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="10" y1="28" x2="12.5" y2="25.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="38" y1="28" x2="35.5" y2="25.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                </g>
                <g className="logo-nodes" filter="url(#techGlow)">
                  <circle cx="24" cy="5" r="2" fill="#00f2ff"/>
                  <circle cx="24" cy="43" r="2" fill="#00f2ff"/>
                  <circle cx="5" cy="19" r="2" fill="#7c00ff"/>
                  <circle cx="43" cy="19" r="2" fill="#7c00ff"/>
                  <circle cx="10" cy="10" r="1.5" fill="#00a8ff"/>
                  <circle cx="38" cy="10" r="1.5" fill="#00a8ff"/>
                  <circle cx="10" cy="28" r="1.5" fill="#00a8ff"/>
                  <circle cx="38" cy="28" r="1.5" fill="#00a8ff"/>
                </g>
                <g className="logo-particles">
                  <circle cx="24" cy="2" r="0.8" fill="#00f2ff" opacity="0.8"/>
                  <circle cx="46" cy="19" r="0.8" fill="#7c00ff" opacity="0.8"/>
                  <circle cx="24" cy="46" r="0.8" fill="#00f2ff" opacity="0.8"/>
                  <circle cx="2" cy="19" r="0.8" fill="#7c00ff" opacity="0.8"/>
                </g>
              </svg>
            </div>
            <span className="logo-text">{motivationalQuote}</span>
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(c => !c)} title={sidebarCollapsed ? '展开' : '收起'}>
            {sidebarCollapsed ? ICONS.chevronRight : ICONS.chevronLeft}
          </button>
        </div>

        {recentVisits.length > 0 && !sidebarCollapsed && (
          <div className="quick-access-bar">
            <div className="quick-access-title">快速访问</div>
            <div className="quick-access-list">
              {recentVisits.map((v, i) => (
                <button key={i} className="quick-access-item" onClick={() => {
                  if (v.type === 'nav') setNav(v.value);
                  else if (v.type === 'search') { setQuery(v.value); setNav('all'); }
                }}>
                  <span className="quick-access-icon">{v.type === 'search' ? ICONS.search : ICONS.globe}</span>
                  <span className="quick-access-label">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="nav-menu">
          {NAV_GROUPS.map(group => {
            const groupItems = group.items.map(id => NAV_ITEMS.find(item => item.id === id)).filter(Boolean);
            return (
              <div key={group.id} className="nav-group">
                {!sidebarCollapsed && (
                  <button className="nav-group-toggle" onClick={() => setNavGroupOpen(prev => ({ ...prev, [group.id]: !prev[group.id] }))}>
                    <span className="nav-group-title">{group.label}</span>
                    <span className={`nav-group-chevron ${navGroupOpen[group.id] ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                  </button>
                )}
                {(sidebarCollapsed || navGroupOpen[group.id]) && groupItems.map(item => (
                  <button key={item.id} className={`nav-item ${nav === item.id ? 'active' : ''}`} onClick={() => { setNav(item.id); setFocusedIndex(-1); addRecentVisit('nav', item.id, item.label); setMobileMenuOpen(false); }} title={sidebarCollapsed ? item.label : undefined}>
                    <span className="nav-icon">{ICONS[item.icon]}</span>
                    {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                    {!sidebarCollapsed && nav === item.id && item.id === 'reading-list' && <span className="nav-count">{bookmarks.length}</span>}
                    {!sidebarCollapsed && nav === item.id && item.id === 'all' && <span className="nav-count">{filtered.length}</span>}
                  </button>
                ))}
              </div>
            );
          })}
          {!sidebarCollapsed && (
            <div className="nav-group nav-follow-group">
              <button className="nav-group-toggle" onClick={() => setShowFollowDropdown(v => !v)}>
                <span className="nav-group-title">我的关注</span>
                {followKeywords.length > 0 && <span className="nav-group-follow-count">{followKeywords.length}</span>}
                <span className={`nav-group-chevron ${showFollowDropdown ? 'open' : ''}`}>{ICONS.chevronDown}</span>
              </button>
              {showFollowDropdown && (
                <div className="nav-follow-list">
                  {followKeywords.length === 0 && <p className="nav-follow-empty">暂无关注关键词</p>}
                  {sortedFollowKeywords.map(kw => (
                    <div key={kw} className={`nav-follow-item ${pinnedKeywords.includes(kw) ? 'nav-follow-item-pinned' : ''}`}>
                      <button className="nav-follow-name" onClick={() => executeSearch(kw)}>
                        {pinnedKeywords.includes(kw) && <span className="nav-follow-pin-dot" />}
                        {kw}
                      </button>
                      <div className="nav-follow-btns">
                        <button className={`nav-follow-pin-btn ${pinnedKeywords.includes(kw) ? 'pinned' : ''}`} onClick={() => pinnedKeywords.includes(kw) ? unpinFollowKeyword(kw) : pinFollowKeyword(kw)} title={pinnedKeywords.includes(kw) ? '取消置顶' : '置顶'}>
                          <svg viewBox="0 0 16 16" width="12" height="12" fill={pinnedKeywords.includes(kw) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M3 13l5-5 5 5M8 1v7"/></svg>
                        </button>
                        <button className="nav-follow-del-btn" onClick={() => removeFollowKeyword(kw)} title="删除">
                          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="nav-follow-add">
                    <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="关键词" onKeyDown={e => e.key === 'Enter' && addFollowKeyword()} />
                    <button className="nav-follow-add-btn" onClick={() => addFollowKeyword()}>{ICONS.plus}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          {isLoggedIn ? (
            <button className="sidebar-action" onClick={() => setShowProfileModal(true)}>
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="sidebar-user-avatar-btn" />
              ) : (
                <span className="sidebar-user-avatar-small">{(user?.displayName || user?.username)?.[0]?.toUpperCase() || 'U'}</span>
              )}
              {!sidebarCollapsed && <span>{user?.displayName || user?.username}</span>}
            </button>
          ) : (
            <button className="sidebar-action" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
              {ICONS.user}
              {!sidebarCollapsed && <span>登录</span>}
            </button>
          )}
          <button className="sidebar-action" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? ICONS.sun : ICONS.moon}
            {!sidebarCollapsed && <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>}
          </button>
          <button className="sidebar-action" onClick={() => setShowSettings(true)}>
            {ICONS.settings}
            {!sidebarCollapsed && <span>设置</span>}
          </button>
          <button className="sidebar-action" onClick={() => setShowShortcuts(s => !s)}>
            {ICONS.keyboard}
            {!sidebarCollapsed && <span>快捷键</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className={`topbar ${nav === 'all' ? 'topbar-all' : ''} ${(nav === 'trending' || nav === 'recommendations') ? 'topbar-trending' : ''}`}>
          {nav === 'all' && (
            <div className="topbar-brand">
              <span className="brand-title">Tech Radar</span>
              <span className="brand-theme-icon" aria-hidden="true">{theme === 'light' ? ICONS.sun : ICONS.moon}</span>
            </div>
          )}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            {ICONS.menu}
          </button>
          <div className={`topbar-main ${nav === 'all' ? 'topbar-main-all' : ''}`}>
            <div className={`topbar-main-row ${nav === 'all' ? 'topbar-main-row-all' : ''}`}>
              <div className="search-wrap">
                {ICONS.search}
                <input ref={searchInputRef} value={query} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="搜索技术、公司、项目..." />
                {searchOpen && (query.trim() || searchHistory.length > 0) && (
                  <>
                    <div className="dropdown-backdrop" onClick={() => setSearchOpen(false)} />
                    <div className="search-dropdown">
                      {searchSuggestions.map((s, i) => (
                        <button key={i} className="search-suggestion" onClick={() => executeSearch(s)}>{s}</button>
                      ))}
                      {searchSuggestions.length === 0 && searchHistory.slice(0, 5).map((h, i) => (
                        <button key={i} className="search-history-item" onClick={() => executeSearch(h.query)}>
                          {ICONS.clock}<span>{h.query}</span>
                        </button>
                      ))}
                      {query.trim() && (
                        <div className="search-sort-row">
                          <button className={`search-sort-btn ${searchSort === 'time' ? 'active' : ''}`} onClick={() => setSearchSort('time')}>按时间</button>
                          <button className={`search-sort-btn ${searchSort === 'relevance' ? 'active' : ''}`} onClick={() => setSearchSort('relevance')}>按相关度</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={`topbar-actions ${(nav === 'trending' || nav === 'recommendations') ? 'singleline' : ''} ${nav === 'all' ? 'topbar-actions-all' : ''}`}>
              {nav === 'all' && (
                <div className="category-dropdown-wrap">
                  <button className="category-dropdown-btn" onClick={() => setCategoryOpen(o => !o)}>
                    <span>{category === 'all' ? '全部赛道' : CATEGORIES.find(c => c.id === category)?.label || '全部赛道'}</span>
                    <span className={`chevron ${categoryOpen ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                  </button>
                  {categoryOpen && (
                    <>
                      <div className="dropdown-backdrop" onClick={() => setCategoryOpen(false)} />
                      <div className="category-dropdown category-dropdown-grouped">
                        <button className={`category-option ${category === 'all' ? 'active' : ''}`} onClick={() => { setCategory('all'); setCategoryOpen(false); }}>全部赛道</button>
                        {CATEGORY_GROUPS.map(group => (
                          <div key={group.id} className="category-group">
                            <div className="category-group-header">
                              <span className="cat-group-icon">{ICONS[group.icon]}</span>
                              <span className="cat-group-label">{group.label}</span>
                            </div>
                            <div className="category-group-items">
                              {group.categories.map(catId => {
                                const cat = CATEGORIES.find(c => c.id === catId);
                                if (!cat) return null;
                                return (
                                  <button key={cat.id} className={`category-option ${category === cat.id ? 'active' : ''}`} onClick={() => { setCategory(cat.id); setCategoryOpen(false); }}>
                                    <span className="cat-icon">{ICONS[cat.icon]}</span><span>{cat.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {nav === 'github' && (
                <div className="github-filter-bar">
                  <div className="lang-tabs">
                    {GITHUB_PERIODS.map(p => (
                      <button key={p.id} className={`lang-tab ${githubSince === p.id ? 'active' : ''}`} onClick={() => { setGithubSince(p.id); loadGithub(githubLang, p.id); }}>{p.label}</button>
                    ))}
                  </div>
                  <div className="lang-tabs">
                    {GITHUB_LANGS.slice(0, 6).map(l => (
                      <button key={l.id} className={`lang-tab ${githubLang === l.id ? 'active' : ''}`} onClick={() => { setGithubLang(l.id); loadGithub(l.id, githubSince); }}>{l.label}</button>
                    ))}
                  </div>
                </div>
              )}
              {(nav === 'all' || nav === 'trending' || nav === 'reading-list' || nav === 'recommendations' || nav === 'materials' || nav === 'editor') && (
                <>
                  <div className="mode-tabs">
                    {MODES.map(m => <button key={m.id} className={`mode-tab ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>)}
                  </div>
                  {nav === 'all' && (
                    <div className="source-filter-wrap">
                      <select id="source-filter" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="source-filter-select">
                        <option value="all">全部来源</option>
                        {sourceOptions.slice(0, 20).map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                      </select>
                    </div>
                  )}
                  <div className="view-toggle">
                    {VIEW_MODES.map(v => <button key={v.id} className={`view-btn ${viewMode === v.id ? 'active' : ''}`} onClick={() => setViewMode(v.id)} title={v.label}>{v.id === 'compact' ? ICONS.list : v.id === 'standard' ? ICONS.rows : ICONS.grid3}</button>)}
                  </div>
                </>
              )}
              {(nav === 'all' || nav === 'trending' || nav === 'github') && (
                <button className={`btn-refresh ${nav === 'all' ? 'btn-refresh-all' : ''}`} onClick={() => { if (nav === 'all') loadNews(); else if (nav === 'trending') loadTrending(); else if (nav === 'github') loadGithub(); }}>
                  {ICONS.refresh}
                </button>
              )}
              {nav === 'trending' && (
                <div className="trending-platform-topbar">
                  <select 
                    className="platform-dropdown-topbar"
                    value={trendingPlatform} 
                    onChange={(e) => { setTrendingPlatform(e.target.value); loadTrending(false, e.target.value); }}
                  >
                    <option value="all">全部平台</option>
                    <optgroup label="国内平台">
                      <option value="36氪">36氪</option>
                      <option value="少数派">少数派</option>
                      <option value="爱范儿">爱范儿</option>
                      <option value="品玩">品玩</option>
                      <option value="虎扑">虎扑</option>
                      <option value="IT之家">IT之家</option>
                    </optgroup>
                    <optgroup label="国际平台">
                      <option value="Hacker News">Hacker News</option>
                      <option value="Product Hunt">Product Hunt</option>
                      <option value="Dev.to">Dev.to</option>
                      <option value="GitHub">GitHub</option>
                      <option value="TechCrunch">TechCrunch</option>
                      <option value="The Verge">The Verge</option>
                      <option value="Ars Technica">Ars Technica</option>
                      <option value="Wired">Wired</option>
                      <option value="MIT Review">MIT Review</option>
                      <option value="Engadget">Engadget</option>
                      <option value="Slashdot">Slashdot</option>
                      <option value="Smashing Mag">Smashing Mag</option>
                      <option value="Lobsters">Lobsters</option>
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="stats-bar">
          {nav === 'all' && <><div className="stat-item"><span className="stat-value">{items.length}</span><span className="stat-label">资讯总数</span></div><div className="stat-item"><span className="stat-value highlight">{filtered.length}</span><span className="stat-label">筛选结果</span></div><div className="stat-item"><span className="stat-value live">{stats.sourceCount - stats.failedSources}</span><span className="stat-label">活跃源</span></div></>}
          {nav === 'trending' && <><div className="stat-item"><span className="stat-value highlight">{trendingItems.length}</span><span className="stat-label">热门榜单</span></div><div className="stat-item"><span className="stat-value live">热门</span><span className="stat-label">全网热搜</span></div></>}
          {nav === 'github' && <><div className="stat-item"><span className="stat-value highlight">{githubRepos.length}</span><span className="stat-label">热门项目</span></div><div className="stat-item"><span className="stat-value live">{GITHUB_PERIODS.find(p => p.id === githubSince)?.label || '周榜'}</span><span className="stat-label">当前榜单</span></div></>}
          {nav === 'reading-list' && <><div className="stat-item"><span className="stat-value highlight">{bookmarks.length}</span><span className="stat-label">收藏总数</span></div><div className="stat-item"><span className="stat-value live">{bookmarks.filter(b => !b.isRead).length}</span><span className="stat-label">未读</span></div></>}
          {nav === 'calendar' && <><div className="stat-item"><span className="stat-value highlight">{events.length}</span><span className="stat-label">日程事件</span></div></>}
          {nav === 'recommendations' && <><div className="stat-item"><span className="stat-value highlight">{filtered.length}</span><span className="stat-label">推荐内容</span></div><div className="stat-item"><span className="stat-value live">{selectedInterests.length}</span><span className="stat-label">兴趣领域</span></div></>}
          <div className="stat-item time">{ICONS.clock}<span>{stats.updatedAt ? formatTime(stats.updatedAt) : '--'}</span></div>
          <button className="panel-toggle" onClick={() => setPanelCollapsed(c => !c)}>{panelCollapsed ? ICONS.chevronLeft : ICONS.chevronRight}</button>
        </div>

        <div className="feed custom-scrollbar" ref={feedRef}>
          {/* ALL NEWS */}
          {nav === 'all' && (
            <>
              {/* Event Clusters */}
              {eventClusters.length > 0 && category === 'all' && mode === 'all' && !query && (
                <div className="event-clusters">
                  {eventClusters.slice(0, 3).map(cluster => (
                    <div key={cluster.id} className="event-cluster-card">
                      <div className="cluster-header" onClick={() => setExpandedEvents(p => ({ ...p, [cluster.id]: !p[cluster.id] }))}>
                        <span className="cluster-icon">{ICONS.eventCard}</span>
                        <span className="cluster-keyword">{cluster.keyword}</span>
                        <span className="cluster-count">{cluster.items.length}家媒体报道</span>
                        <span className={`cluster-chevron ${expandedEvents[cluster.id] ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                      </div>
                      {expandedEvents[cluster.id] && (
                        <div className="cluster-items">
                          {cluster.items.map((item, ci) => <NewsItem key={item.id} item={item} index={ci} viewMode={viewMode} isFocused={focusedIndex === filtered.indexOf(item)} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {loading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}</div>}
              {error && <div className="error-state"><p>加载失败: {error}</p><button onClick={() => loadNews()}>重试</button></div>}
              {!loading && !error && filtered.length === 0 && <div className="empty-state"><p>没有匹配的资讯</p><button onClick={() => { setQuery(''); setCategory('all'); setMode('all'); setSourceFilter('all'); }}>重置筛选</button></div>}
              <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
                {filtered.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}
              </div>
              {nav === 'all' && newsHasMore && (
                <div id="load-more-sentinel" className="load-more-area">
                  {loadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
                  {!loadingMore && <span className="load-more-hint">滚动加载更多</span>}
                </div>
              )}
              {nav === 'all' && !newsHasMore && items.length > 0 && (
                <div className="load-more-area load-more-done">已全部加载</div>
              )}
            </>
          )}

          {/* TRENDING */}
          {nav === 'trending' && (
            <>
              <div className="section-header">
                <h2 className="section-title">{ICONS.fire} 热门榜单</h2>
                <p className="section-desc">聚合 36氪、少数派、爱范儿、品玩、IT之家、Hacker News、TechCrunch、The Verge、Ars Technica、Wired 等 20+ 高质量平台热门内容</p>
              </div>

              {trendingLoading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}</div>}
              {!trendingLoading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{trendingItems.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} isFollowed={false} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} />)}</div>}

              {!trendingLoading && trendingItems.length > 0 && (
                <div className="load-more-area">
                  {trendingLoadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
                  {!trendingLoadingMore && trendingHasMore && (
                    <button className="btn-load-more" onClick={() => loadTrending(true)}>加载更多</button>
                  )}
                  {!trendingHasMore && <span className="load-more-done">已全部加载</span>}
                </div>
              )}
            </>
          )}

          {/* SMART RECOMMENDATIONS - 基于兴趣的个性化推荐 */}
          {nav === 'recommendations' && (
            <>
              <div className="section-header">
                <h2 className="section-title">{ICONS.sparkle} 智能推荐</h2>
                <p className="section-desc">基于你的兴趣领域，为你精准推送相关内容</p>
              </div>
              {!isLoggedIn && (
                <div className="empty-state">
                  <p>请先登录并选择感兴趣的领域</p>
                  <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>去登录</button>
                </div>
              )}
              {isLoggedIn && selectedInterests.length === 0 && (
                <div className="empty-state">
                  <p>你还没有选择感兴趣的领域</p>
                  <button onClick={() => setShowInterestModal(true)}>选择兴趣领域</button>
                </div>
              )}
              {isLoggedIn && selectedInterests.length > 0 && (
                <>
                  <div className="interest-tags-bar">
                    <span className="interest-tags-label">已选领域：</span>
                    {selectedInterests.map(id => {
                      const cat = CATEGORIES.find(c => c.id === id);
                      return cat ? (
                        <span key={id} className="interest-tag-badge">
                          {ICONS[cat.icon]} {cat.label}
                        </span>
                      ) : null;
                    })}
                    <button className="interest-edit-btn" onClick={() => setShowInterestModal(true)}>编辑</button>
                  </div>
                  {loading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}</div>}
                  {error && <div className="error-state"><p>加载失败: {error}</p><button onClick={() => loadNews()}>重试</button></div>}
                  {!loading && !error && filtered.length === 0 && <div className="empty-state"><p>暂无推荐内容</p></div>}
                  {!loading && !error && filtered.length > 0 && (
                    <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
                      {filtered.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}
                    </div>
                  )}
                  {newsHasMore && (
                    <div id="load-more-sentinel" className="load-more-area">
                      {loadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
                      {!loadingMore && <span className="load-more-hint">滚动加载更多</span>}
                    </div>
                  )}
                  {!newsHasMore && filtered.length > 0 && (
                    <div className="load-more-area load-more-done">已全部加载</div>
                  )}
                </>
              )}
            </>
          )}

          {/* GITHUB */}
          {nav === 'github' && (
            <>
              <div className="section-header"><h2 className="section-title">{ICONS.github} GitHub {GITHUB_PERIODS.find(p => p.id === githubSince)?.label || '周榜'}热门项目</h2><p className="section-desc">{githubSince === 'daily' ? '今日增星最多的开源项目' : githubSince === 'monthly' ? '本月增星最多的开源项目' : '本周增星最多的开源项目'}（实时同步）</p></div>
               {githubLoading && <div className="github-grid">{Array.from({ length: 6 }).map((_, i) => <article key={i} className="github-card skeleton"><div className="skeleton-gh-header" /><div className="skeleton-gh-desc" /><div className="skeleton-gh-stats" /></article>)}</div>}
               <div className="github-grid">{githubRepos.map((repo, i) => <GithubRepoCard key={repo.id} repo={repo} index={i} since={githubSince} isBookmarked={isBookmarked(repo.url)} isInMaterials={isInMaterials(repo.id)} onBookmark={() => toggleBookmark({ id: repo.url, title: repo.fullName, url: repo.url, source: 'GitHub', summary: repo.description, tags: [repo.language].filter(Boolean), region: 'global', mode: 'deep', publishedAt: new Date().toISOString(), category: 'open-source' })} onAddMaterial={() => toggleMaterial({ id: repo.id, title: repo.fullName, url: repo.url, source: 'GitHub', summary: repo.description, tags: [repo.language].filter(Boolean) })} showTranslation={translationOpen[repo.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [repo.id]: !p[repo.id] }))} translation={getTranslation({ id: repo.id, title: repo.fullName, summary: repo.description })} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}</div>
            </>
           )}

          {/* READING LIST - 阅读列表 */}
          {nav === 'reading-list' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.bookmark}<span>阅读列表</span></h2>
                <p className="trends-desc">共 {bookmarks.length} 条收藏，{bookmarks.filter(b => !b.isRead).length} 条未读</p>
              </div>
              {bookmarks.length === 0 ? (
                <section className="trends-section">
                  <div className="empty-state">
                    <p>暂无收藏内容</p>
                    <p className="hint">浏览资讯时点击收藏按钮，将感兴趣的内容添加到阅读列表</p>
                  </div>
                </section>
              ) : (
                <section className="trends-section">
                  <div className="bookmarks-list">
                    {bookmarks.map(b => (
                      <div key={b.id} className={`bookmark-item ${b.isRead ? 'read' : ''}`}>
                        <div className="bookmark-main">
                          <a href={b.url} target="_blank" rel="noopener noreferrer" className="bookmark-title">{b.title}</a>
                          <div className="bookmark-meta">
                            <span className="bookmark-source">{b.source}</span>
                            <span className="bookmark-date">{new Date(b.savedAt).toLocaleDateString('zh-CN')}</span>
                            {b.category && <span className="bookmark-category">{CATEGORIES.find(c => c.id === b.category)?.label || b.category}</span>}
                          </div>
                          {b.summary && <p className="bookmark-summary">{b.summary}</p>}
                        </div>
                        <div className="bookmark-actions">
                          <button
                            className={`bookmark-read-btn ${b.isRead ? 'read' : ''}`}
                            onClick={() => toggleRead(b.id)}
                            title={b.isRead ? '标记为未读' : '标记为已读'}
                          >
                            {b.isRead ? '已读' : '未读'}
                          </button>
                          <button className="bookmark-remove" onClick={() => setBookmarks(prev => prev.filter(x => x.id !== b.id))} title="移除">{ICONS.x}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* CUSTOM URL - 自定义抓取 */}
          {nav === 'custom-url' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.link}<span>自定义抓取</span></h2>
                <p className="trends-desc">输入任意网页 URL，使用 AI 驱动的抓取技术获取内容</p>
              </div>

              <section className="trends-section">
                <div className="custom-url-input-section">
                  <div className="custom-url-input-wrapper">
                    <input
                      type="url"
                      className="custom-url-input"
                      placeholder="输入网页 URL (例如: https://example.com/article)"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchCustomUrl(customUrlInput, customUrlMode)}
                    />
                    <div className="custom-url-actions">
                      <select
                        className="custom-url-mode-select"
                        value={customUrlMode}
                        onChange={(e) => setCustomUrlMode(e.target.value)}
                      >
                        <option value="basic">基础模式</option>
                        <option value="dynamic">动态页面</option>
                        <option value="stealth">隐身模式</option>
                      </select>
                      <button
                        className="custom-url-fetch-btn"
                        onClick={() => fetchCustomUrl(customUrlInput, customUrlMode)}
                        disabled={customUrlLoading || !customUrlInput.trim()}
                      >
                        {customUrlLoading ? '抓取中...' : '抓取'}
                      </button>
                    </div>
                  </div>

                  {customUrlError && (
                    <div className="custom-url-error">{customUrlError}</div>
                  )}
                </div>

                {customUrlLoading && (
                  <div className="custom-url-loading">
                    <div className="loading-spinner"></div>
                    <p>正在抓取网页内容...</p>
                  </div>
                )}

                {customUrlResult && !customUrlLoading && (
                  <div className="custom-url-result">
                    <div className="custom-url-result-header">
                      <h3>{customUrlResult.title}</h3>
                      <a
                        href={customUrlResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="custom-url-result-link"
                      >
                        {ICONS.externalLink}
                        <span>打开原文</span>
                      </a>
                    </div>

                    <div className="custom-url-result-meta">
                      {customUrlResult.author && (
                        <span className="custom-url-meta-item">
                          <strong>作者:</strong> {customUrlResult.author}
                        </span>
                      )}
                      {customUrlResult.published_date && (
                        <span className="custom-url-meta-item">
                          <strong>发布时间:</strong> {customUrlResult.published_date}
                        </span>
                      )}
                      <span className="custom-url-meta-item">
                        <strong>段落数:</strong> {customUrlResult.paragraphs_count}
                      </span>
                      <span className="custom-url-meta-item">
                        <strong>内容长度:</strong> {customUrlResult.content_length} 字符
                      </span>
                    </div>

                    {customUrlResult.description && (
                      <div className="custom-url-result-description">
                        <h4>描述</h4>
                        <p>{customUrlResult.description}</p>
                      </div>
                    )}

                    {customUrlResult.summary && (
                      <div className="custom-url-result-summary">
                        <h4>摘要</h4>
                        <p>{customUrlResult.summary}</p>
                      </div>
                    )}

                    {customUrlResult.images.length > 0 && (
                      <div className="custom-url-result-images">
                        <h4>图片 ({customUrlResult.images.length})</h4>
                        <div className="custom-url-images-grid">
                          {customUrlResult.images.map((img, idx) => (
                            <div key={idx} className="custom-url-image-item">
                              <img src={img.src} alt={img.alt} />
                              {img.alt && <p>{img.alt}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {customUrlResult.links.length > 0 && (
                      <div className="custom-url-result-links">
                        <h4>相关链接 ({customUrlResult.links.length})</h4>
                        <ul className="custom-url-links-list">
                          {customUrlResult.links.map((link, idx) => (
                            <li key={idx}>
                              <a href={link.url} target="_blank" rel="noopener noreferrer">
                                {link.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="custom-url-result-actions">
                      <button
                        className="btn-new-article-pro"
                        onClick={() => {
                          const newArticle = {
                            id: Date.now(),
                            title: customUrlResult.title,
                            content: customUrlResult.summary,
                            url: customUrlResult.url,
                            images: [],
                            createdAt: new Date().toISOString(),
                            publishedAt: customUrlResult.published_date || new Date().toISOString()
                          };
                          setArticles(prev => [newArticle, ...prev]);
                          setCurrentArticleId(newArticle.id);
                          setNav('editor');
                        }}
                      >
                        {ICONS.edit}
                        <span>保存到创作中心</span>
                      </button>
                      <button
                        className="btn-new-article-pro"
                        onClick={() => {
                          const newMaterial = {
                            id: Date.now(),
                            title: customUrlResult.title,
                            content: customUrlResult.summary,
                            source: new URL(customUrlResult.url).hostname,
                            url: customUrlResult.url,
                            createdAt: new Date().toISOString(),
                            category: 'all',
                            tags: customUrlResult.keywords ? customUrlResult.keywords.split(',').map(k => k.trim()) : []
                          };
                          setMaterials(prev => [newMaterial, ...prev]);
                          setNav('materials');
                        }}
                      >
                        {ICONS.layers}
                        <span>保存到素材库</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* CALENDAR - 日历管理 */}
          {nav === 'calendar' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.calendar}<span>日历管理</span></h2>
                <div className="header-actions">
                  <button className="btn-new-article-pro" onClick={() => setShowEventForm(true)}>
                    {ICONS.plus}
                    <span>添加事件</span>
                  </button>
                </div>
              </div>
              {events.length === 0 ? (
                <section className="trends-section">
                  <div className="empty-state">
                    <p>暂无日程事件</p>
                    <p className="hint">点击"添加事件"按钮创建你的第一个日程</p>
                  </div>
                </section>
              ) : (
                <section className="trends-section">
                  <div className="events-list">
                    {events.map(e => (
                      <div key={e.id} className="event-item">
                        <div className="event-date">
                          <span className="event-day">{new Date(e.date).getDate()}</span>
                          <span className="event-month">{new Date(e.date).getMonth() + 1}月</span>
                        </div>
                        <div className="event-content">
                          <h4 className="event-title">{e.title}</h4>
                          {e.description && <p className="event-desc">{e.description}</p>}
                          {e.time && <p className="event-time">{e.time}</p>}
                        </div>
                        <button className="event-remove" onClick={() => setEvents(prev => prev.filter(x => x.id !== e.id))} title="删除">{ICONS.x}</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

           {/* 洞察分析 - 统一仪表盘 */}
          {(nav === 'briefing' || nav === 'tracker' || nav === 'trends' || nav === 'reading-stats') && (() => {
            const insightTab = nav === 'trends' ? 'trends' : nav === 'tracker' ? 'tracker' : nav === 'reading-stats' ? 'profile' : 'overview';
            const setInsightTab = (t) => {
              const map = { overview: 'briefing', trends: 'trends', tracker: 'tracker', profile: 'reading-stats' };
              setNav(map[t]);
            };

            // 态势等级
            const severityLevel = insightData.anomalies.length >= 3 ? { label: '爆发', color: '#ef4444' }
              : insightData.anomalies.length >= 1 || insightData.todayCount > insightData.yesterdayCount * 1.5 ? { label: '活跃', color: '#f59e0b' }
              : { label: '正常', color: '#10b981' };

            // 追踪目标信号
            const getTrackerStatus = (target) => {
              const data = trackerData[target.id] || { weekly: 0 };
              const day7 = Array.from({ length: 7 }).map((_, idx) => {
                const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - idx));
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              });
              const counts = day7.map(d => items.filter(i => {
                const text = `${i.title} ${i.summary}`.toLowerCase();
                return (text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()))) && i.publishedAt?.slice(0, 10) === d;
              }).length);
              const recent3 = counts.slice(4).reduce((a, b) => a + b, 0);
              const prev4 = counts.slice(0, 4).reduce((a, b) => a + b, 0);
              const growth = prev4 === 0 ? (recent3 > 0 ? 100 : 0) : Math.round(((recent3 - prev4) / prev4) * 100);
              const isSurge = growth > 50 && recent3 > 0;
              const isDrop = growth < -50;
              const isStreak = recent3 > 0 && counts[5] > 0 && counts[6] > 0;
              return { counts, growth, isSurge, isDrop, isStreak, weekly: data.weekly };
            };

            return (
              <div className="insight-dashboard">
                {/* 洞察子导航 */}
                <div className="insight-tabs">
                  {[
                    { id: 'overview', label: '今日态势' },
                    { id: 'trends', label: '赛道矩阵' },
                    { id: 'tracker', label: '我的追踪' },
                    { id: 'profile', label: '阅读画像' }
                  ].map(tab => (
                    <button key={tab.id} className={`insight-tab ${insightTab === tab.id ? 'active' : ''}`} onClick={() => setInsightTab(tab.id)}>
                      <span className="insight-tab-label">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* ====== 概览页 ====== */}
                {insightTab === 'overview' && (
                  <>
                    <div className="overview-top-row">
                      {/* 态势总览条 */}
                      <div className="insight-status-bar" style={{ borderLeft: `4px solid ${severityLevel.color}` }}>
                        <div className="insight-status-main">
                          <span className="insight-status-text">科技资讯态势<strong style={{ color: severityLevel.color }}> {severityLevel.label} </strong>今日收录 <strong>{insightData.todayCount}</strong> 条
                            {insightData.dailyChange !== 0 && <span className={insightData.dailyChange > 0 ? 'text-up' : 'text-down'}> {insightData.dailyChange > 0 ? '↑' : '↓'}{Math.abs(insightData.dailyChange)}% vs 昨日</span>}
                          </span>
                        </div>
                        <div className="insight-status-meta">
                          {insightData.categoryRanking[0] && <span className="status-tag hot">热 {insightData.categoryRanking[0].label} ({insightData.categoryRanking[0].recent}条)</span>}
                          {insightData.anomalies.length > 0 && <span className="status-tag signal">信号 {insightData.anomalies.length} 个</span>}
                          {readingProfile.streak > 0 && <span className="status-tag streak">连续 {readingProfile.streak} 天</span>}
                        </div>
                      </div>
                    </div>

                    {/* AI 每日简报 */}
                    <section className="insight-section">
                      <div className="ai-brief-card">
                        <div className="ai-brief-header">
                          <h3 className="ai-brief-title">AI 每日简报</h3>
                          <div className="ai-brief-actions">
                            {aiBrief.content && (
                              <>
                                <button className="ai-brief-action-btn" onClick={saveBriefToMaterials} title="保存到素材库">存素材</button>
                                <button className="ai-brief-action-btn" onClick={exportBriefToFile} title="导出为文件">下载</button>
                                <button className="ai-brief-action-btn primary" onClick={exportBriefToEditor} title="导出到创作中心">导出</button>
                              </>
                            )}
                            <button className="ai-brief-generate" onClick={generateAiBrief} disabled={aiBrief.loading}>
                              {aiBrief.loading ? '生成中...' : aiBrief.content ? '重新生成' : '生成简报'}
                            </button>
                          </div>
                        </div>
                        {aiBrief.error && <div className="ai-brief-error">{aiBrief.error}</div>}
                        {aiBrief.content && (
                          <div className="ai-brief-content">
                            {renderBriefMarkdown(aiBrief.content)}
                            <div className="ai-brief-time">生成于 {new Date(aiBrief.generatedAt).toLocaleTimeString('zh-CN')}</div>
                          </div>
                        )}
                        {!aiBrief.content && !aiBrief.loading && !aiBrief.error && (
                          <div className="ai-brief-placeholder">
                            <p>基于今日 {insightData.todayCount} 条资讯自动生成摘要简报</p>
                            <p className="ai-brief-hint">需要先在设置中配置大模型 API</p>
                          </div>
                        )}
                        {aiBrief.loading && (
                          <div className="ai-brief-loading">
                            <div className="ai-brief-spinner" />
                            <span>正在分析资讯数据，生成简报中...</span>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* 我的今日关注 */}
                    {followKeywords.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">我的今日关注</h3>
                        <div className="insight-follow-updates">
                          {followKeywordUpdates.length === 0 ? (
                            <div className="insight-empty">暂无匹配资讯</div>
                          ) : (
                            followKeywordUpdates.slice(0, 3).map(group => (
                              <div key={group.keyword} className="insight-follow-group">
                                <div className="insight-follow-header">
                                  <span className="insight-follow-keyword">{group.keyword}</span>
                                  <span className="insight-follow-count">+{group.count} 条</span>
                                </div>
                                <div className="insight-follow-items">
                                  {group.items.map((item, idx) => (
                                    <a key={idx} href={item.url} target="_blank" rel="noreferrer" className="insight-follow-item" title={item.title}>
                                      <span className="insight-follow-item-title">{item.title}</span>
                                      <span className="insight-follow-item-source">{item.source}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    )}

                    {/* 必读榜单 */}
                    {todayMustRead.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">必读榜单</h3>
                        <div className="insight-must-read">
                          {todayMustRead.map((item, idx) => (
                            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="insight-must-read-item" title={item.title}>
                              <div className="insight-must-read-rank">{idx + 1}</div>
                              <div className="insight-must-read-info">
                                <span className="insight-must-read-title">{item.title}</span>
                                <div className="insight-must-read-meta">
                                  <span>{item.source}</span>
                                  <span className="insight-must-read-score">{item.mustReadScore.toFixed(0)}</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 机会雷达 */}
                    {insightData.opportunityRadar.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">机会雷达</h3>
                        <div className="insight-opportunities">
                          {insightData.opportunityRadar.slice(0, 5).map((item, idx) => (
                            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="insight-opportunity-item" title={item.title}>
                              <div className="insight-opportunity-rank">{idx + 1}</div>
                              <div className="insight-opportunity-info">
                                <span className="insight-opportunity-title">{item.title}</span>
                                <div className="insight-opportunity-meta">
                                  <span>{item.source}</span>
                                  <span className="insight-opportunity-score">{item.opportunityScore.toFixed(0)}</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                    {/* ====== 趋势页 ====== */}
                {insightTab === 'trends' && (
                  <>
                    {/* 赛道热度排行 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">赛道热度排行</h3>
                      <div className="category-ranking-list">
                        {insightData.categoryRanking.slice(0, 8).map((cat, idx) => (
                          <div key={cat.id} className="category-rank-row" onClick={() => { setCategory(cat.id); setNav('all'); }}>
                            <span className="category-rank-num">{idx + 1}</span>
                            <span className="category-rank-name">{cat.label}</span>
                            <div className="category-rank-bar-wrap">
                              <div className="category-rank-bar" style={{ width: `${insightData.categoryRanking[0]?.heatScore > 0 ? (cat.heatScore / insightData.categoryRanking[0].heatScore * 100) : 0}%` }} />
                            </div>
                            <span className={`category-rank-growth ${cat.growth > 0 ? 'up' : cat.growth < 0 ? 'down' : ''}`}>
                              {cat.growth > 0 ? '+' : ''}{cat.growth}%
                            </span>
                            <span className="category-rank-count">{cat.recent}条</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 赛道趋势对比（近30日） */}
                    {insightData.categoryTrend30.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">赛道趋势对比（近30日）</h3>
                        <div className="trend-comparison-chart">
                          <div className="trend-comparison-bars">
                            {insightData.day30.map((d, dayIdx) => (
                              <div key={d} className="trend-comparison-col" title={d}>
                                {insightData.categoryTrend30.slice(0, 5).map((cat, catIdx) => {
                                  const count = cat.daily30[dayIdx];
                                  const maxVal = Math.max(...cat.daily30);
                                  const height = maxVal > 0 ? Math.max((count / maxVal) * 100, 4) : 4;
                                  const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
                                  return (
                                    <div
                                      key={cat.id}
                                      className="trend-comparison-bar"
                                      style={{ height: `${height}%`, background: colors[catIdx % colors.length] }}
                                      title={`${cat.label} ${d}: ${count}条`}
                                    />
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                          <div className="trend-comparison-legend">
                            {insightData.categoryTrend30.slice(0, 5).map((cat, idx) => {
                              const colors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
                              return (
                                <span key={cat.id} className="trend-legend-item">
                                  <span className="trend-legend-dot" style={{ background: colors[idx % colors.length] }} />
                                  {cat.label}
                                </span>
                              );
                            })}
                          </div>
                          <div className="trend-comparison-labels">
                            <span>{insightData.day30[0]?.slice(5)}</span>
                            <span>{insightData.day30[14]?.slice(5)}</span>
                            <span>{insightData.day30[29]?.slice(5)}</span>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* 赛道关联分析 */}
                    {insightData.categoryCorrelations.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">赛道关联分析</h3>
                        <div className="correlation-list">
                          {insightData.categoryCorrelations.slice(0, 8).map((corr, idx) => (
                            <div key={`${corr.cat1}-${corr.cat2}`} className="correlation-row">
                              <span className="correlation-rank">{idx + 1}</span>
                              <div className="correlation-pair">
                                <span className="correlation-cat">{corr.label1}</span>
                                <span className="correlation-arrow">↔</span>
                                <span className="correlation-cat">{corr.label2}</span>
                              </div>
                              <div className="correlation-bar-wrap">
                                <div className="correlation-bar" style={{ width: `${Math.min(corr.count / (insightData.categoryCorrelations[0]?.count || 1) * 100, 100)}%` }} />
                              </div>
                              <span className="correlation-count">{corr.count}次</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="insight-section">
                      <h3 className="insight-section-title">赛道热力矩阵（7日）</h3>
                      <div className="insight-heatmap">
                        <div className="heatmap-header">
                          <span className="heatmap-label" />
                          {insightData.day7.map(d => <span key={d} className="heatmap-day">{d.slice(5)}</span>)}
                        </div>
                        {CATEGORIES.map(cat => {
                          const maxVal = Math.max(...insightData.day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length), 1);
                          return (
                            <div key={cat.id} className="heatmap-row">
                              <span className="heatmap-label">{cat.label}</span>
                              {insightData.day7.map(d => {
                                const count = items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length;
                                const intensity = count / maxVal;
                                return <span key={d} className="heatmap-cell" style={{ background: intensity > 0.7 ? 'rgba(34, 211, 238, 0.6)' : intensity > 0.4 ? 'rgba(34, 211, 238, 0.35)' : intensity > 0.1 ? 'rgba(34, 211, 238, 0.15)' : 'rgba(34, 211, 238, 0.04)' }} title={`${cat.label} ${d}: ${count}条`}>{count}</span>;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="insight-section">
                      <h3 className="insight-section-title">区域分布</h3>
                      <div className="insight-region-bars">
                        {[
                          { key: 'domestic', label: '国内', pct: insightData.regionPct.domestic, count: insightData.regionDistribution.domestic, color: '#ef4444' },
                          { key: 'overseas', label: '海外', pct: insightData.regionPct.overseas, count: insightData.regionDistribution.overseas, color: '#3b82f6' },
                          { key: 'global', label: '全球', pct: insightData.regionPct.global, count: insightData.regionDistribution.global, color: '#10b981' }
                        ].map(r => (
                          <div key={r.key} className="insight-region-row">
                            <span className="insight-region-label" style={{ color: r.color }}>{r.label}</span>
                            <div className="insight-region-bar-wrap">
                              <div className="insight-region-bar" style={{ width: `${r.pct}%`, background: r.color }} />
                            </div>
                            <span className="insight-region-pct">{r.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 技术雷达四象限 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">技术雷达（Gartner 四象限）</h3>
                      <div className="tech-radar-grid">
                        <div className="tech-radar-quadrant adopt">
                          <h4 className="radar-quadrant-title">采用 Adopt</h4>
                          <span className="radar-quadrant-desc">成熟稳定，高频率，广泛覆盖</span>
                          <div className="radar-items">
                            {insightData.techRadar.filter(c => c.quadrant === 'adopt').map(c => (
                              <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                            ))}
                            {insightData.techRadar.filter(c => c.quadrant === 'adopt').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                          </div>
                        </div>
                        <div className="tech-radar-quadrant trial">
                          <h4 className="radar-quadrant-title">试验 Trial</h4>
                          <span className="radar-quadrant-desc">中高频，增长快速</span>
                          <div className="radar-items">
                            {insightData.techRadar.filter(c => c.quadrant === 'trial').map(c => (
                              <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                            ))}
                            {insightData.techRadar.filter(c => c.quadrant === 'trial').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                          </div>
                        </div>
                        <div className="tech-radar-quadrant assess">
                          <h4 className="radar-quadrant-title">评估 Assess</h4>
                          <span className="radar-quadrant-desc">低频但极速增长（新兴）</span>
                          <div className="radar-items">
                            {insightData.techRadar.filter(c => c.quadrant === 'assess').map(c => (
                              <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                            ))}
                            {insightData.techRadar.filter(c => c.quadrant === 'assess').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                          </div>
                        </div>
                        <div className="tech-radar-quadrant hold">
                          <h4 className="radar-quadrant-title">暂缓 Hold</h4>
                          <span className="radar-quadrant-desc">低频，增长放缓或持平</span>
                          <div className="radar-items">
                            {insightData.techRadar.filter(c => c.quadrant === 'hold').map(c => (
                              <span key={c.id} className="radar-item" onClick={() => { setCategory(c.id); setNav('all'); }}>{c.label}</span>
                            ))}
                            {insightData.techRadar.filter(c => c.quadrant === 'hold').length === 0 && <span className="radar-item radar-item-empty">暂无</span>}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 源质量排行 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">源质量排行</h3>
                      <div className="source-quality-list">
                        {insightData.sourceQuality.slice(0, 10).map((s, i) => (
                          <div key={s.name} className="source-quality-row">
                            <span className="source-quality-rank">{i + 1}</span>
                            <span className="source-quality-name">{s.name}</span>
                            <span className="source-quality-meta">{s.count}条 · {s.categories}赛道</span>
                            <div className="source-quality-bar-wrap">
                              <div className="source-quality-bar" style={{ width: `${s.qualityScore}%`, background: s.qualityScore > 70 ? '#10b981' : s.qualityScore > 40 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="source-quality-score">{s.qualityScore}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* 技术关键词 TF-IDF */}
                    {insightData.techKeywords.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">技术关键词（TF-IDF）</h3>
                        <div className="insight-tech-keywords">
                          {insightData.techKeywords.slice(0, 20).map(k => (
                            <button key={k.word} className="insight-tech-kw" onClick={() => executeSearch(k.word)}>
                              <span className="tech-kw-word">{k.word}</span>
                              <span className="tech-kw-meta">{k.freq}次 · {k.sourceCount}源</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* ====== 追踪页 ====== */}
                {insightTab === 'tracker' && (
                  <>
                    <div className="tracker-form">
                      <input type="text" placeholder="输入公司名或技术关键词" value={newTrackTarget} onChange={e => setNewTrackTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrackTarget()} />
                      <button className="tracker-form-btn" onClick={addTrackTarget}>{ICONS.plus} 添加</button>
                    </div>
                    <div className="tracker-presets">
                      {['OpenAI', 'Google', '字节跳动', '华为', 'React', 'LLM', 'RISC-V'].map(name => (
                        <button key={name} className="tracker-preset" onClick={() => { setNewTrackTarget(name); }}>{name}</button>
                      ))}
                    </div>

                    {trackTargets.length === 0 && <div className="empty-state"><p>暂无追踪目标，添加你想关注的公司或技术</p></div>}

                    <div className="insight-watchlist">
                      {trackTargets.map(target => {
                        const st = getTrackerStatus(target);
                        let statusLabel = '—', statusColor = '#6b7280', statusIcon = '';
                        if (st.isSurge) { statusLabel = '今日突增'; statusColor = '#f59e0b'; statusIcon = '!'; }
                        else if (st.isStreak) { statusLabel = '连续增长'; statusColor = '#10b981'; statusIcon = '+'; }
                        else if (st.isDrop) { statusLabel = '显著降温'; statusColor = '#ef4444'; statusIcon = '-'; }
                        else if (st.growth > 0) { statusLabel = '小幅增长'; statusColor = '#22d3ee'; statusIcon = '↑'; }
                        else if (st.growth < 0) { statusLabel = '小幅下降'; statusColor = '#f87171'; statusIcon = '↓'; }

                        // 获取相关新闻
                        const relatedNews = items.filter(i => {
                          const text = `${i.title} ${i.summary}`.toLowerCase();
                          return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
                        }).slice(0, 5);

                        // 获取来源分布
                        const sourceDist = {};
                        items.filter(i => {
                          const text = `${i.title} ${i.summary}`.toLowerCase();
                          return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
                        }).forEach(i => {
                          sourceDist[i.source] = (sourceDist[i.source] || 0) + 1;
                        });
                        const topSources = Object.entries(sourceDist).sort((a, b) => b[1] - a[1]).slice(0, 3);

                        // 获取关联关键词
                        const keywordDist = {};
                        items.filter(i => {
                          const text = `${i.title} ${i.summary}`.toLowerCase();
                          return text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()));
                        }).forEach(i => {
                          (i.tags || []).forEach(tag => {
                            if (!target.keyword.toLowerCase().includes(tag.toLowerCase()) && !target.aliases?.some(a => a.toLowerCase().includes(tag.toLowerCase()))) {
                              keywordDist[tag] = (keywordDist[tag] || 0) + 1;
                            }
                          });
                        });
                        const relatedKeywords = Object.entries(keywordDist).sort((a, b) => b[1] - a[1]).slice(0, 5);

                        const maxC = Math.max(...st.counts, 1);
                        return (
                          <div key={target.id} className="insight-watch-card">
                            <div className="insight-watch-header">
                              <span className="insight-watch-name">{target.keyword}</span>
                              <button className="insight-watch-remove" onClick={() => setTrackTargets(prev => prev.filter(t => t.id !== target.id))}>{ICONS.x}</button>
                            </div>
                            <div className="insight-watch-stats">
                              <span className="insight-watch-val">{st.weekly}<sub>周</sub></span>
                              <span className={`insight-watch-change ${st.growth > 0 ? 'up' : st.growth < 0 ? 'down' : ''}`}>{st.growth > 0 ? '+' : ''}{st.growth}%</span>
                              <span className="insight-watch-status" style={{ color: statusColor }}>{statusIcon} {statusLabel}</span>
                            </div>
                            <div className="insight-watch-sparkline">
                              {st.counts.map((c, idx) => (
                                <div key={idx} className="spark-bar" style={{ height: `${Math.max((c / maxC) * 32, 3)}px`, opacity: c > 0 ? 0.3 + (c / maxC) * 0.7 : 0.15 }} />
                              ))}
                            </div>
                            <div className="insight-watch-spark-labels">
                              {Array.from({ length: 7 }).map((_, idx) => {
                                const d = new Date(); d.setDate(d.getDate() - (6 - idx));
                                return <span key={idx}>{d.getMonth() + 1}/{d.getDate()}</span>;
                              })}
                            </div>

                            {/* 来源分布 */}
                            {topSources.length > 0 && (
                              <div className="tracker-source-distribution">
                                <span className="tracker-section-label">来源分布</span>
                                <div className="tracker-source-bars">
                                  {topSources.map(([name, count]) => (
                                    <div key={name} className="tracker-source-bar-item">
                                      <span className="tracker-source-name">{name}</span>
                                      <div className="tracker-source-bar-wrap">
                                        <div className="tracker-source-bar" style={{ width: `${count / topSources[0][1] * 100}%` }} />
                                      </div>
                                      <span className="tracker-source-count">{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 关联关键词 */}
                            {relatedKeywords.length > 0 && (
                              <div className="tracker-related-keywords">
                                <span className="tracker-section-label">关联关键词</span>
                                <div className="tracker-keyword-tags">
                                  {relatedKeywords.map(([kw, count]) => (
                                    <span key={kw} className="tracker-keyword-tag" onClick={() => executeSearch(kw)}>{kw} ({count})</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 相关新闻 */}
                            {relatedNews.length > 0 && (
                              <div className="tracker-related-news">
                                <span className="tracker-section-label">相关新闻</span>
                                <div className="tracker-news-list">
                                  {relatedNews.map(news => (
                                    <div key={news.id} className="tracker-news-item" onClick={() => window.open(news.link, '_blank')}>
                                      <span className="tracker-news-title">{news.title}</span>
                                      <span className="tracker-news-source">{news.source}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ====== 阅读画像页 ====== */}
                {insightTab === 'profile' && (
                  <>
                    {/* 核心指标 */}
                    <div className="reading-metrics">
                      <div className="reading-metric">
                        <span className="reading-metric-value">{readingProfile.streak}</span>
                        <span className="reading-metric-label">连续天数</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-value">{readingProfile.avgDailyRead}</span>
                        <span className="reading-metric-label">日均阅读</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-value">{readingProfile.readRate}%</span>
                        <span className="reading-metric-label">读完率</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-value">{String(readingProfile.peakHour).padStart(2, '0')}:00</span>
                        <span className="reading-metric-label">阅读高峰</span>
                      </div>
                    </div>

                    {/* 近30天阅读趋势 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">近30天阅读趋势</h3>
                      <div className="profile-trend-chart">
                        <div className="trend-chart-bars">
                          {readingProfile.trendData.map((count, idx) => {
                            const height = readingProfile.maxTrend > 0 ? Math.max((count / readingProfile.maxTrend) * 100, 4) : 4;
                            return (
                              <div key={idx} className="trend-chart-bar-wrapper" title={`${readingProfile.day30[idx]}: ${count}篇`}>
                                <div className="trend-chart-bar" style={{ height: `${height}%` }} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="trend-chart-labels">
                          <span>{readingProfile.day30[0]?.slice(5)}</span>
                          <span>{readingProfile.day30[14]?.slice(5)}</span>
                          <span>{readingProfile.day30[29]?.slice(5)}</span>
                        </div>
                      </div>
                    </section>

                    {/* 24小时阅读时段分布 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">24小时阅读时段分布</h3>
                      <div className="profile-hour-chart">
                        <div className="hour-chart-bars">
                          {readingProfile.hourDist.map((count, idx) => {
                            const maxCount = Math.max(...readingProfile.hourDist, 1);
                            const height = Math.max((count / maxCount) * 100, 4);
                            return (
                              <div key={idx} className="hour-chart-bar-wrapper" title={`${String(idx).padStart(2, '0')}:00 - ${count}篇`}>
                                <div className="hour-chart-bar" style={{ height: `${height}%` }} />
                                {idx % 4 === 0 && <span className="hour-chart-label">{idx}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    <div className="profile-two-col">
                      {/* 来源偏好 */}
                      <section className="insight-section">
                        <h3 className="insight-section-title">来源偏好 TOP5</h3>
                        <div className="profile-sources">
                          {readingProfile.topSources.length > 0 ? readingProfile.topSources.map((source, idx) => (
                            <div key={source.name} className="profile-source-row">
                              <span className="profile-source-rank">{idx + 1}</span>
                              <span className="profile-source-name">{source.name}</span>
                              <div className="profile-source-bar-wrap">
                                <div className="profile-source-bar" style={{ width: `${readingProfile.topSources[0]?.count > 0 ? (source.count / readingProfile.topSources[0].count * 100) : 0}%` }} />
                              </div>
                              <span className="profile-source-count">{source.count}篇</span>
                            </div>
                          )) : <div className="empty-state">暂无阅读数据</div>}
                        </div>
                      </section>

                      {/* 标签偏好 */}
                      <section className="insight-section">
                        <h3 className="insight-section-title">标签偏好 TOP8</h3>
                        <div className="profile-tags-cloud">
                          {readingProfile.topTags.length > 0 ? readingProfile.topTags.map(tag => (
                            <span key={tag.name} className="profile-tag-item" style={{ fontSize: `${11 + tag.pct / 5}px` }}>
                              {tag.name} <small>({tag.count})</small>
                            </span>
                          )) : <div className="empty-state">暂无标签数据</div>}
                        </div>
                      </section>
                    </div>

                    {/* 阅读深度分析 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">阅读深度分析</h3>
                      <div className="profile-depth-metrics">
                        <div className="profile-depth-card">
                          <span className="profile-depth-value">{readingProfile.avgSummaryLength}</span>
                          <span className="profile-depth-label">平均摘要长度（字符）</span>
                        </div>
                        <div className="profile-depth-card">
                          <span className="profile-depth-value">{readingProfile.deepReads}</span>
                          <span className="profile-depth-label">深度阅读（长文）</span>
                        </div>
                        <div className="profile-depth-card">
                          <span className="profile-depth-value">{readingProfile.shallowReads}</span>
                          <span className="profile-depth-label">快速浏览（短文）</span>
                        </div>
                        <div className="profile-depth-card">
                          <span className="profile-depth-value">{readingProfile.totalBookmarks}</span>
                          <span className="profile-depth-label">总收藏数</span>
                        </div>
                      </div>
                    </section>

                    {/* 兴趣分布 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">兴趣分布</h3>
                      <div className="reading-interests">
                        {readingProfile.topInterests.map((interest, idx) => (
                          <div key={interest.id} className="reading-interest-row">
                            <span className="reading-interest-rank">{idx + 1}</span>
                            <span className="reading-interest-name">{interest.label}</span>
                            <div className="reading-interest-bar-wrap">
                              <div className="reading-interest-bar" style={{ width: `${readingProfile.topInterests[0]?.count > 0 ? (interest.count / readingProfile.topInterests[0].count * 100) : 0}%` }} />
                            </div>
                            <span className="reading-interest-pct">{interest.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            );
          })()}

          {nav === 'materials' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.layers}<span>素材库</span></h2>
                <p className="trends-desc">从资讯中收集的素材，共 {materials?.length || 0} 条</p>
                <div className="header-actions">
                  <button className="btn-icon" onClick={exportMaterials} title="导出素材">
                    {ICONS.link}
                  </button>
                  <label className="btn-icon" title="导入素材">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <input 
                      type="file" 
                      accept=".json" 
                      style={{ display: 'none' }} 
                      onChange={e => { if (e.target.files[0]) importMaterials(e.target.files[0]); }}
                    />
                  </label>
                  <button className="btn-add-material" onClick={() => setShowAddMaterial(true)}>
                    {ICONS.plus} 添加素材
                  </button>
                </div>
              </div>

              <section className="trends-section">
                <div className="materials-toolbar">
                  <div className="materials-toolbar-row">
                    <div className="space-tabs">
                      <button 
                        className={`space-tab ${materialSpaceFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setMaterialSpaceFilter('all')}
                      >
                        全部 ({materials?.length || 0})
                      </button>
                      {materialSpaces.map(space => {
                        const count = (materials || []).filter(m => m.spaceId === space.id).length;
                        return (
                          <button 
                            key={space.id}
                            className={`space-tab ${materialSpaceFilter === String(space.id) ? 'active' : ''}`}
                            onClick={() => setMaterialSpaceFilter(String(space.id))}
                          >
                            {space.name} ({count})
                          </button>
                        );
                      })}
                      <button className="space-tab space-tab-add" onClick={() => setShowSpaceForm(true)}>+ 新建空间</button>
                    </div>
                  </div>
                  <div className="materials-toolbar-row">
                    <div className="material-search">
                      {ICONS.search}
                      <input 
                        type="text" 
                        placeholder="搜索素材内容、来源、标签..." 
                        value={materialSearch} 
                        onChange={e => setMaterialSearch(e.target.value)} 
                      />
                    </div>
                    <select className="material-filter" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
                      <option value="all">全部类型</option>
                      <option value="quote">金句</option>
                      <option value="data">数据</option>
                      <option value="case">案例</option>
                      <option value="viewpoint">观点</option>
                      <option value="chart">图表</option>
                    </select>
                    <select className="material-filter" value={materialTimeRange} onChange={e => setMaterialTimeRange(e.target.value)}>
                      <option value="all">全部时间</option>
                      <option value="7d">近 7 天</option>
                      <option value="30d">近 30 天</option>
                    </select>
                    {allMaterialSources.length > 0 && (
                      <select className="material-filter" value={materialSourceFilter} onChange={e => setMaterialSourceFilter(e.target.value)}>
                        <option value="all">全部来源</option>
                        {allMaterialSources.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                  {allMaterialTags.length > 0 && (
                    <div className="material-tag-filters">
                      <span className="tag-filter-label">标签:</span>
                      {allMaterialTags.slice(0, 15).map(tag => (
                        <button 
                          key={tag}
                          className={`material-tag-btn ${materialTags.includes(tag) ? 'active' : ''}`}
                          onClick={() => setMaterialTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                        >
                          {tag}
                        </button>
                      ))}
                      {materialTags.length > 0 && (
                        <button className="tag-clear-btn" onClick={() => setMaterialTags([])}>清除</button>
                      )}
                    </div>
                  )}
                  <div className="materials-actions">
                    <span className="material-count">{filteredMaterials.length} / {materials.length} 条</span>
                    {selectedMaterials.length > 0 && (
                      <div className="batch-actions">
                        <span className="batch-count">已选 {selectedMaterials.length} 项</span>
                        <select className="batch-space-select" value="" onChange={e => { if (e.target.value) assignMaterialsToSpace(selectedMaterials, Number(e.target.value)); }}>
                          <option value="">移动到空间...</option>
                          {materialSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button className="btn-batch-delete" onClick={() => { if (confirm(`确定删除 ${selectedMaterials.length} 条素材？`)) batchRemoveMaterials(selectedMaterials); }}>批量删除</button>
                        <button className="btn-clear-selection" onClick={clearMaterialSelection}>取消选择</button>
                      </div>
                    )}
                    {selectedMaterials.length === 0 && materials.length > 0 && (
                      <button className="btn-select-all" onClick={selectAllMaterials}>全选</button>
                    )}
                  </div>
                </div>

                {filteredMaterials.length === 0 ? (
                  <div className="empty-materials">
                    <div className="empty-icon">{ICONS.layers}</div>
                    <p className="empty-title">{materialSearch || materialFilter !== 'all' || materialTags.length > 0 ? '没有找到匹配的素材' : '暂无素材'}</p>
                    <p className="hint">{materialSearch || materialFilter !== 'all' || materialTags.length > 0 ? '试试调整筛选条件' : '浏览资讯时点击收藏按钮，或点击右上角"添加素材"手动添加'}</p>
                  </div>
                ) : (
                  <div className="materials-grid">
                    {filteredMaterials.map(m => (
                      <div key={m.id} className={`material-card ${m.starred ? 'starred' : ''} ${selectedMaterials.includes(m.id) ? 'selected' : ''}`}>
                        <div className="material-header">
                          <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type] || m.type}</span>
                          <div className="material-header-actions">
                            <button className="material-star" onClick={() => toggleMaterialStar(m.id)} title={m.starred ? '取消星标' : '添加星标'}>
                              {m.starred ? '★' : '☆'}
                            </button>
                            <button className="material-remove" onClick={() => removeMaterial(m.id)} title="删除素材">{ICONS.x}</button>
                          </div>
                        </div>
                        <div className="material-checkbox-row">
                          <label className="material-checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={selectedMaterials.includes(m.id)} 
                              onChange={() => toggleMaterialSelection(m.id)} 
                            />
                            <span className="checkbox-custom"></span>
                          </label>
                        </div>
                        {m.title && <p className="material-title">{m.title}</p>}
                        <p className="material-content">{m.fullContent || m.content}</p>
                        {m.url && (
                          <a className="material-link" href={m.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                            查看原文
                          </a>
                        )}
                        {m.note && <p className="material-note">{m.note}</p>}
                        <div className="material-meta">
                          <span className="material-source">{m.source}</span>
                          {m.tags && m.tags.length > 0 && (
                            <span className="material-tags">{m.tags.map(t => `#${t}`).join(' ')}</span>
                          )}
                          {materialRefCounts[m.id] && (
                            <span className="material-ref-count" title={`被 ${materialRefCounts[m.id]} 篇文章引用`}>
                              引用 {materialRefCounts[m.id]}
                            </span>
                          )}
                          <span className="material-date">{new Date(m.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {showSpaceForm && (
            <div className="modal-backdrop" onClick={() => setShowSpaceForm(false)}>
              <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>新建素材空间</h3>
                  <button className="modal-close" onClick={() => setShowSpaceForm(false)}>{ICONS.x}</button>
                </div>
                <form className="add-material-form" onSubmit={e => { e.preventDefault(); createMaterialSpace(); }}>
                  <div className="form-group">
                    <label>空间名称</label>
                    <input 
                      name="spaceName" 
                      type="text" 
                      placeholder="如：AI 素材、技术趋势、产品灵感" 
                      value={newSpaceName}
                      onChange={e => setNewSpaceName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-modal-cancel" onClick={() => setShowSpaceForm(false)}>取消</button>
                    <button type="submit" className="btn-modal-submit">创建</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showAddMaterial && (
            <div className="modal-backdrop" onClick={() => setShowAddMaterial(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>添加素材</h3>
                  <button className="modal-close" onClick={() => setShowAddMaterial(false)}>{ICONS.x}</button>
                </div>
                <form className="add-material-form" onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.target);
                  addManualMaterial({
                    title: fd.get('title') || '',
                    content: fd.get('content') || '',
                    type: fd.get('type') || 'quote',
                    source: fd.get('source') || '',
                    url: fd.get('url') || '',
                    tags: fd.get('tags') || '',
                    note: fd.get('note') || '',
                    spaceId: fd.get('spaceId') || null
                  });
                }}>
                  <div className="form-group">
                    <label>类型</label>
                    <select name="type" defaultValue="quote">
                      <option value="quote">金句</option>
                      <option value="data">数据</option>
                      <option value="case">案例</option>
                      <option value="viewpoint">观点</option>
                      <option value="chart">图表</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>所属空间</label>
                      <select name="spaceId" defaultValue="">
                        <option value="">默认空间</option>
                        {materialSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>标题（可选）</label>
                    <input name="title" type="text" placeholder="素材标题" />
                  </div>
                  <div className="form-group">
                    <label>内容 *</label>
                    <textarea name="content" required placeholder="素材内容..." rows="4" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>来源</label>
                      <input name="source" type="text" placeholder="来源名称" />
                    </div>
                    <div className="form-group">
                      <label>链接</label>
                      <input name="url" type="url" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>标签（逗号分隔）</label>
                    <input name="tags" type="text" placeholder="AI, 大模型, 趋势" />
                  </div>
                  <div className="form-group">
                    <label>备注</label>
                    <input name="note" type="text" placeholder="个人备注..." />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-modal-cancel" onClick={() => setShowAddMaterial(false)}>取消</button>
                    <button type="submit" className="btn-modal-submit">添加</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {nav === 'editor' && (
            <div className="trends-dashboard">
              <div className="trends-header editor-header">
                <h2>{ICONS.edit}<span>创作中心</span></h2>
                <div className="editor-header-actions">
                  <button className="editor-fullscreen-btn" onClick={() => setEditorFullscreen(f => !f)} title={editorFullscreen ? '退出全屏' : '全屏创作'}>
                    {editorFullscreen ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    )}
                    <span>{editorFullscreen ? '退出全屏' : '全屏'}</span>
                  </button>
                  <button className="btn-new-article-pro" onClick={() => { const a = createArticle('blank', articleSpaceFilter !== 'all' ? Number(articleSpaceFilter) : null); setCurrentArticleId(a.id); }}>
                    {ICONS.plus}
                    <span>新建文章</span>
                    <span className="btn-key-hint">Ctrl+N</span>
                  </button>
                  <div className="template-popover">
                    <button className="btn-template-popover" onClick={() => setShowTemplateMenu(!showTemplateMenu)} title="从模板创建">
                      {ICONS.layers}
                      <span>模板</span>
                      {ICONS.chevronDown}
                    </button>
                    {showTemplateMenu && (
                      <div className="template-popover-menu">
                        <div className="template-menu-title">选择模板</div>
                        {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => (
                          <button key={id} className="template-menu-item" onClick={() => { const a = createArticle(id, articleSpaceFilter !== 'all' ? Number(articleSpaceFilter) : null); setCurrentArticleId(a.id); setShowTemplateMenu(false); }}>
                            <span className="template-menu-icon">{
                              id === 'blank' ? ICONS.edit : id === 'briefing' ? ICONS.document : id === 'analysis' ? ICONS.chart : ICONS.code
                            }</span>
                            <span className="template-menu-label">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentArticleId ? (
                <section className="trends-section article-editor">
                  {(() => {
                    const article = articles.find(a => a.id === currentArticleId);
                    if (!article) return null;
                    const wordCount = article.content.replace(/\s/g, '').length;
                    const paragraphCount = article.content.split(/\n\s*\n/).filter(p => p.trim()).length;
                    const readMinutes = Math.max(1, Math.ceil(wordCount / 500));
                    const linkedMaterials = materials.filter(m => article.materials.includes(m.id));

                    return (
                      <>
                        <div className="article-toolbar">
                          <button className="btn-back-list" onClick={() => { setCurrentArticleId(null); setEditorTab('edit'); }}>← 返回列表</button>
                          <div className="article-actions">
                            {lastSavedAt && <span className="autosave-indicator">已自动保存 {new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
                            <select className="article-status-select" value={article.status} onChange={e => updateArticle(article.id, { status: e.target.value })}>
                              <option value="draft">草稿</option>
                              <option value="published">已发布</option>
                              <option value="archived">已归档</option>
                            </select>
                            <button className="btn-copy-article" onClick={() => exportArticleToFile(article)} title="导出为文件">{ICONS.download}</button>
                            <button className="btn-copy-article" onClick={() => copyArticleAsRichText(article)} title="复制全文">{ICONS.copy}</button>
                          </div>
                        </div>

                        <input
                          className="article-title-input"
                          value={article.title}
                          onChange={e => handleTitleChange(article, e.target.value)}
                          placeholder="文章标题"
                        />

                        <div className="article-meta-bar">
                          <select
                            className="article-template-select"
                            value={article.template}
                            onChange={e => updateArticle(article.id, { template: e.target.value })}
                          >
                            {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                          <div className="article-tags-inline">
                            {article.tags.map(tag => (
                              <span key={tag} className="article-tag-pill">
                                {tag}
                                <button className="article-tag-remove" onClick={() => removeArticleTag(article.id, tag)}>{ICONS.x}</button>
                              </span>
                            ))}
                            <input
                              className="article-tag-input"
                              value={editingArticleTag === article.id ? articleTagInput : ''}
                              placeholder="+ 标签"
                              onFocus={() => setEditingArticleTag(article.id)}
                              onBlur={() => { if (articleTagInput.trim()) addArticleTag(article.id, articleTagInput); setEditingArticleTag(null); setArticleTagInput(''); }}
                              onKeyDown={e => { if (e.key === 'Enter' && articleTagInput.trim()) { addArticleTag(article.id, articleTagInput); setArticleTagInput(''); e.preventDefault(); } }}
                              onChange={e => setArticleTagInput(e.target.value)}
                            />
                          </div>
                          <span className="article-updated">{wordCount} 字 · {readMinutes} 分钟阅读</span>
                        </div>

                        <div className="editor-toolbar">
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="粗体 (Ctrl+B)" onClick={() => insertAtCursor(article, '', '**', '**')}>{ICONS.bold}</button>
                            <button className="editor-tool-btn" title="斜体 (Ctrl+I)" onClick={() => insertAtCursor(article, '', '*', '*')}>{ICONS.italic}</button>
                            <button className="editor-tool-btn" title="标题" onClick={() => insertAtCursor(article, '标题\n', '## ', '')}>{ICONS.heading}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="引用" onClick={() => insertAtCursor(article, '引用内容', '> ', '')}>{ICONS.quoteIcon}</button>
                            <button className="editor-tool-btn" title="无序列表" onClick={() => insertAtCursor(article, '- 列表项\n', '', '')}>{ICONS.listIcon}</button>
                            <button className="editor-tool-btn" title="有序列表" onClick={() => insertAtCursor(article, '1. 列表项\n', '', '')}>{ICONS.orderedList}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="代码块" onClick={() => insertAtCursor(article, '代码', '```\n', '\n```')}>{ICONS.codeIcon}</button>
                            <button className="editor-tool-btn" title="行内代码" onClick={() => insertAtCursor(article, '', '`', '`')}>{ICONS.code}</button>
                            <button className="editor-tool-btn" title="表格" onClick={() => insertAtCursor(article, '\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| 内容 | 内容 | 内容 |\n', '', '')}>{ICONS.tableIcon}</button>
                            <button className="editor-tool-btn" title="分割线" onClick={() => insertAtCursor(article, '\n---\n', '', '')}>{ICONS.hr}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="链接" onClick={() => insertAtCursor(article, '', '[链接文本](url)', '')}>{ICONS.link}</button>
                            <button className="editor-tool-btn" title="上传图片" onClick={() => imageInputRef.current?.click()}>{ICONS.image}</button>
                            <input
                              type="file"
                              ref={imageInputRef}
                              style={{ display: 'none' }}
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(article, file);
                                e.target.value = '';
                              }}
                            />
                          </div>
                          <div className="editor-toolbar-group editor-tab-group">
                            <button className={`editor-tab-btn ${editorTab === 'edit' ? 'active' : ''}`} onClick={() => setEditorTab('edit')}>编辑</button>
                            <button className={`editor-tab-btn ${editorTab === 'split' ? 'active' : ''}`} onClick={() => setEditorTab('split')}>分栏</button>
                            <button className={`editor-tab-btn ${editorTab === 'preview' ? 'active' : ''}`} onClick={() => setEditorTab('preview')}>预览</button>
                          </div>
                        </div>

                        <div className={`editor-split-view editor-mode-${editorTab}`}>
                          {editorTab !== 'preview' && (
                            <div className="editor-pane">
                              <textarea
                                ref={editorTextareaRef}
                                className="article-content-editor"
                                value={article.content}
                                onChange={e => handleContentChange(article, e.target.value)}
                                placeholder="开始写作...&#10;&#10;支持 Markdown 格式：&#10;# 标题&#10;**粗体** *斜体*&#10;- 列表&#10;> 引用&#10;`代码`&#10;![图片](url)&#10;&#10;支持拖拽上传图片、粘贴图片、插入素材"
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                                onDrop={e => {
                                  e.preventDefault();
                                  try {
                                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                                    if (data && data.materialId) {
                                      const mat = materials.find(m => m.id === data.materialId);
                                      if (mat) insertMaterialAtCursor(article, mat);
                                    }
                                  } catch {}
                                }}
                                onPaste={e => handlePaste(e, article)}
                              />
                            </div>
                          )}
                          {editorTab !== 'edit' && (
                            <div className="preview-pane">
                              <div className="preview-header">
                                <span>预览</span>
                                <span className="preview-stats">{wordCount} 字</span>
                              </div>
                              <div
                                className="markdown-preview"
                                dangerouslySetInnerHTML={{ __html: renderMarkdownWithImages(article.content, article.images) }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 图片管理面板 */}
                        {article.images && article.images.length > 0 && (
                          <div className="image-manager-panel">
                            <div className="image-manager-header" onClick={() => setShowImagePanel(!showImagePanel)}>
                              <div className="image-manager-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                <span>图片管理 ({article.images.length}张)</span>
                              </div>
                              <span className={`ai-panel-chevron ${showImagePanel ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                            </div>
                            {showImagePanel && (
                              <div className="image-manager-body">
                                <div className="image-manager-grid">
                                  {article.images.map(img => {
                                    // 检查图片是否在文章中被引用
                                    const placeholderRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                    const isUsed = placeholderRegex.test(article.content);
                                    // 解析当前尺寸
                                    const match = article.content.match(placeholderRegex);
                                    let currentWidth = '', currentHeight = '';
                                    if (match) {
                                      const sizeMatch = match[0].match(/\|w=(\d+)(?:\|h=(\d+))?/);
                                      if (sizeMatch) {
                                        currentWidth = sizeMatch[1];
                                        currentHeight = sizeMatch[2] || '';
                                      }
                                    }
                                    return (
                                      <div key={img.id} className={`image-manager-card ${isUsed ? 'used' : 'unused'}`}>
                                        <div className="image-manager-card-img-wrap" onClick={() => {
                                          // 点击缩略图滚动到编辑器中对应位置
                                          if (editorTextareaRef.current) {
                                            const ta = editorTextareaRef.current;
                                            const idx = article.content.indexOf(`#${img.id}`);
                                            if (idx !== -1) {
                                              ta.focus();
                                              ta.setSelectionRange(idx, idx);
                                              // 计算行号并滚动
                                              const lines = article.content.substring(0, idx).split('\n');
                                              const lineHeight = 20;
                                              ta.scrollTop = Math.max(0, (lines.length - 5) * lineHeight);
                                            }
                                          }
                                        }}>
                                          <img src={img.base64} alt={img.alt} className="image-manager-card-thumb" />
                                          {isUsed && <span className="image-manager-used-badge">已引用</span>}
                                          {!isUsed && <span className="image-manager-unused-badge">未引用</span>}
                                          <button
                                            className="image-manager-card-remove"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)\\n?`, 'g');
                                              const newContent = article.content.replace(oldRegex, '');
                                              updateArticle(article.id, {
                                                content: newContent,
                                                images: article.images.filter(i => i.id !== img.id)
                                              });
                                            }}
                                            title="删除图片"
                                          >
                                            {ICONS.trash}
                                          </button>
                                        </div>
                                        <div className="image-manager-card-info">
                                          <span className="image-manager-card-name" title={img.alt}>{img.alt}</span>
                                          <span className="image-manager-card-dims">{img.width}×{img.height}</span>
                                        </div>
                                        <div className="image-manager-card-actions">
                                          {/* 宽度调整 */}
                                          <div className="image-manager-size-input">
                                            <label>宽度</label>
                                            <input
                                              type="number"
                                              value={currentWidth}
                                              placeholder="自动"
                                              onChange={e => {
                                                const newWidth = e.target.value;
                                                const newHeight = currentHeight;
                                                let newPlaceholder = `![${img.alt}](#${img.id}`;
                                                if (newWidth) {
                                                  newPlaceholder += `|w=${newWidth}`;
                                                  if (newHeight) newPlaceholder += `|h=${newHeight}`;
                                                }
                                                newPlaceholder += ')';
                                                const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                                const newContent = article.content.replace(oldRegex, newPlaceholder);
                                                updateArticle(article.id, { content: newContent });
                                              }}
                                            />
                                            <span>px</span>
                                          </div>
                                          {/* 高度调整 */}
                                          <div className="image-manager-size-input">
                                            <label>高度</label>
                                            <input
                                              type="number"
                                              value={currentHeight}
                                              placeholder="自动"
                                              onChange={e => {
                                                const newWidth = currentWidth;
                                                const newHeight = e.target.value;
                                                let newPlaceholder = `![${img.alt}](#${img.id}`;
                                                if (newWidth || newHeight) {
                                                  newPlaceholder += `|w=${newWidth || img.width}`;
                                                  if (newHeight) newPlaceholder += `|h=${newHeight}`;
                                                }
                                                newPlaceholder += ')';
                                                const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                                const newContent = article.content.replace(oldRegex, newPlaceholder);
                                                updateArticle(article.id, { content: newContent });
                                              }}
                                            />
                                            <span>px</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="ai-assistant-panel">
                          <div className="ai-panel-header" onClick={() => setShowAiPanel(!showAiPanel)}>
                            <div className="ai-panel-title">
                              {ICONS.sparkles}
                              <span>AI 写作助手</span>
                              {llmConfig.baseUrl && <span className="ai-status-dot" title="已配置大模型"></span>}
                            </div>
                            <span className={`ai-panel-chevron ${showAiPanel ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                          </div>
                          {showAiPanel && (
                            <div className="ai-panel-body">
                              {!llmConfig.baseUrl ? (
                                <div className="ai-config-hint">
                                  <span>请先在设置中配置大模型 API</span>
                                </div>
                              ) : (
                                <>
                                  <div className="ai-quick-actions">
                                    <div className="ai-action-group">
                                      <span className="ai-group-label">文本处理</span>
                                      <div className="ai-action-grid">
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要处理的文本', 1500); return; }
                                          aiAction(article, 'rewrite', selected);
                                        }}>
                                          {ICONS.edit}<span>润色改写</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要翻译的文本', 1500); return; }
                                          aiAction(article, 'translate_zh', selected);
                                        }}>
                                          {ICONS.globe}<span>翻译中文</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要简化的文本', 1500); return; }
                                          aiAction(article, 'simplify', selected);
                                        }}>
                                          {ICONS.bolt}<span>精简压缩</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要扩写的文本', 1500); return; }
                                          aiAction(article, 'expand', selected);
                                        }}>
                                          {ICONS.follow}<span>扩写展开</span>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="ai-action-group">
                                      <span className="ai-group-label">内容生成</span>
                                      <div className="ai-action-grid">
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          aiAction(article, 'continue', selected || article.content);
                                        }}>
                                          {ICONS.arrowRight}<span>智能续写</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'title', article.content)}>
                                          {ICONS.sparkle}<span>生成标题</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'summary', article.content)}>
                                          {ICONS.list}<span>生成摘要</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'outline', article.content)}>
                                          {ICONS.layers}<span>提取大纲</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ai-custom-prompt">
                                    <textarea
                                      className="ai-prompt-input"
                                      placeholder="输入自定义指令，例如：'将这段文字改写为更口语化的风格'..."
                                      value={aiCustomPrompt}
                                      onChange={e => setAiCustomPrompt(e.target.value)}
                                      rows="2"
                                    />
                                    <button className="ai-prompt-send" onClick={() => {
                                      if (!aiCustomPrompt.trim()) { showToast('请输入自定义指令', 1500); return; }
                                      const selected = window.getSelection().toString();
                                      const context = selected || article.content;
                                      aiAction(article, 'custom', `${aiCustomPrompt}\n\n待处理内容：\n${context}`);
                                    }}>
                                      {ICONS.arrowRight}
                                    </button>
                                  </div>
                                </>
                              )}
                              {aiResult.loading && (
                                <div className="ai-loading-state">
                                  <div className="ai-loading-spinner"></div>
                                  <span>AI 正在处理中...</span>
                                </div>
                              )}
                              {aiResult.content && (
                                <div className="ai-result-block">
                                  <div className="ai-result-header">
                                    <span className="ai-result-label">{
                                      aiResult.action === 'continue' ? '续写结果' :
                                      aiResult.action === 'rewrite' ? '润色改写' :
                                      aiResult.action === 'translate_zh' ? '翻译结果' :
                                      aiResult.action === 'title' ? '生成标题' :
                                      aiResult.action === 'summary' ? '摘要' :
                                      aiResult.action === 'outline' ? '大纲' :
                                      aiResult.action === 'custom' ? '自定义结果' : 'AI 结果'
                                    }</span>
                                    <div className="ai-result-actions">
                                      <button className="btn-ai-insert" onClick={() => insertAiResult(article)}>插入正文</button>
                                      <button className="btn-ai-copy" onClick={() => { navigator.clipboard.writeText(aiResult.content); showToast('已复制到剪贴板', 1500); }}>复制</button>
                                      <button className="btn-ai-clear" onClick={clearAiResult}>{ICONS.x}</button>
                                    </div>
                                  </div>
                                  <pre className="ai-result-content">{aiResult.content}</pre>
                                </div>
                              )}
                              {aiResult.error && (
                                <div className="ai-result-error">
                                  <span>{aiResult.error}</span>
                                  <button onClick={clearAiResult}>{ICONS.x}</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="article-materials-panel">
                          <div className="materials-panel-header">
                            <h4>关联素材 <span className="material-hint">（拖拽到编辑器中或点击插入）</span></h4>
                            {linkedMaterials.length > 0 && (
                              <span className="linked-material-count">{linkedMaterials.length} 篇已引用</span>
                            )}
                          </div>
                          <div className="material-space-filter">
                            <select
                              value={articleMaterialSpaceFilter}
                              onChange={e => setArticleMaterialSpaceFilter(e.target.value)}
                            >
                              <option value="all">全部空间</option>
                              {materialSpaces.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          {linkedMaterials.length > 0 && (
                            <div className="linked-materials-list">
                              {linkedMaterials.map(m => (
                                <div key={m.id} className="linked-material-item">
                                  <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type]}</span>
                                  <span className="linked-material-text">{m.content.slice(0, 50)}...</span>
                                  <button className="linked-material-remove" onClick={() => removeLinkedMaterial(article, m.id)} title="移除引用">{ICONS.x}</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {materials.length > 0 && (
                            <div className="materials-picker-list">
                              {materials
                                .filter(m => !article.materials.includes(m.id))
                                .filter(m => articleMaterialSpaceFilter === 'all' || m.spaceId === Number(articleMaterialSpaceFilter))
                                .slice(0, 20)
                                .map(m => (
                                  <div
                                    key={m.id}
                                    className="material-picker-item"
                                    onClick={() => insertMaterialAtCursor(article, m)}
                                    draggable
                                    onDragStart={e => { e.dataTransfer.setData('text/plain', JSON.stringify({ materialId: m.id })); e.dataTransfer.effectAllowed = 'copy'; }}
                                    title={m.content}
                                  >
                                    <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type]}</span>
                                    <span className="material-picker-content">{m.content.slice(0, 40)}...</span>
                                  </div>
                                ))}
                            </div>
                          )}
                          {materials.length === 0 && (
                            <p className="hint">素材库为空，浏览资讯时点击收藏按钮或手动添加素材</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </section>
              ) : (
                <section className="trends-section">
                  {articles.length === 0 ? (
                    <div className="empty-articles">
                      <div className="empty-icon">{ICONS.edit}</div>
                      <p className="empty-title">暂无文章</p>
                      <button className="btn-new-article-inline" onClick={() => { const a = createArticle('blank'); setCurrentArticleId(a.id); }}>+ 创建第一篇文章</button>
                    </div>
                  ) : (
                    <>
                      <div className="article-space-tabs">
                        <button
                          className={`article-space-tab ${articleSpaceFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setArticleSpaceFilter('all')}
                        >
                          全部文章
                          <span className="article-space-count">{articles.length}</span>
                        </button>
                        {articleSpaces.map(space => {
                          const count = articles.filter(a => a.spaceId === space.id).length;
                          return (
                            <button
                              key={space.id}
                              className={`article-space-tab ${articleSpaceFilter === String(space.id) ? 'active' : ''}`}
                              onClick={() => setArticleSpaceFilter(String(space.id))}
                            >
                              {space.name}
                              <span className="article-space-count">{count}</span>
                            </button>
                          );
                        })}
                        <button className="article-space-tab article-space-add" onClick={() => setArticleSpaceFormOpen(true)}>
                          {ICONS.plus}
                        </button>
                      </div>
                      <div className="article-list-toolbar">
                        <div className="article-search-box">
                          {ICONS.search}
                          <input type="text" placeholder="搜索文章标题..." value={articleSearch} onChange={e => setArticleSearch(e.target.value)} />
                        </div>
                        <select className="article-filter-select" value={articleStatusFilter} onChange={e => setArticleStatusFilter(e.target.value)}>
                          <option value="all">全部状态</option>
                          <option value="draft">草稿</option>
                          <option value="published">已发布</option>
                          <option value="archived">已归档</option>
                        </select>
                        <select className="article-filter-select" value={articleTemplateFilter} onChange={e => setArticleTemplateFilter(e.target.value)}>
                          <option value="all">全部模板</option>
                          {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                        <select className="article-filter-select" value={articleSort} onChange={e => setArticleSort(e.target.value)}>
                          <option value="updated">按更新时间</option>
                          <option value="created">按创建时间</option>
                          <option value="title">按标题排序</option>
                        </select>
                        <span className="article-count">{filteredArticles.length} 篇</span>
                      </div>
                      <div className="articles-list">
                        {filteredArticles.map(a => (
                          <div key={a.id} className="article-item">
                            <div className="article-item-main" onClick={() => { setCurrentArticleId(a.id); setEditorTab('edit'); }}>
                              <h3 className="article-item-title">{a.title}</h3>
                              <div className="article-item-meta">
                                <span className={`article-status-badge status-${a.status}`}>{ARTICLE_STATUS[a.status]}</span>
                                <span>{ARTICLE_TEMPLATES[a.template] || a.template}</span>
                                {a.spaceId && (() => { const sp = articleSpaces.find(s => s.id === a.spaceId); return sp ? <span className="article-space-badge">{sp.name}</span> : null; })()}
                                <span>{new Date(a.updatedAt).toLocaleDateString('zh-CN')}</span>
                                {a.tags.length > 0 && a.tags.slice(0, 3).map(t => <span key={t} className="article-tag-pill">{t}</span>)}
                              </div>
                            </div>
                            <div className="article-item-actions">
                              <select className="article-space-assign" value={a.spaceId || ''} onClick={e => e.stopPropagation()} onChange={e => assignArticleToSpace(a.id, e.target.value ? Number(e.target.value) : null)}>
                                <option value="">未分配</option>
                                {articleSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <button className="btn-duplicate" onClick={() => duplicateArticle(a.id)} title="复制">{ICONS.layers}</button>
                              <button className="btn-delete-article" onClick={() => { if (confirm('确定删除？')) deleteArticle(a.id); }} title="删除">{ICONS.trash}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
          )}

          {articleSpaceFormOpen && (
            <div className="modal-backdrop" onClick={() => setArticleSpaceFormOpen(false)}>
              <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>新建创作空间</h3>
                  <button className="modal-close" onClick={() => setArticleSpaceFormOpen(false)}>{ICONS.x}</button>
                </div>
                <form className="add-material-form" onSubmit={e => { e.preventDefault(); createArticleSpace(newArticleSpaceName); }}>
                  <div className="form-group">
                    <label>空间名称</label>
                    <input 
                      type="text" 
                      placeholder="如：技术博客、产品测评、学习笔记" 
                      value={newArticleSpaceName}
                      onChange={e => setNewArticleSpaceName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-modal-cancel" onClick={() => setArticleSpaceFormOpen(false)}>取消</button>
                    <button type="submit" className="btn-modal-submit">创建</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {nav === 'knowledge-export' && (
            <div className="trends-dashboard">
              <div className="trends-header"><h2>{ICONS.link}<span>导出发布</span></h2><p className="trends-desc">将阅读清单和文章导出为知识资产</p></div>

              <section className="trends-section">
                <h3 className="trends-section-title">我的文章导出</h3>
                <div className="export-filters">
                  <select value={articleExportFilter} onChange={e => setArticleExportFilter(e.target.value)}>
                    <option value="all">全部文章</option>
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                  <span className="export-count">共 {filteredExportArticles.length} 篇</span>
                </div>
                {filteredExportArticles.length > 0 ? (
                  <div className="article-export-list">
                    {filteredExportArticles.map(a => (
                      <div key={a.id} className="article-export-item">
                        <div className="article-export-info">
                          <span className={`article-status-badge status-${a.status}`}>{ARTICLE_STATUS[a.status]}</span>
                          <span className="article-export-title">{a.title}</span>
                        </div>
                        <div className="article-export-actions">
                          <button className="btn-export-md" onClick={() => exportArticle(a, 'md')}>Markdown</button>
                          <button className="btn-export-html" onClick={() => exportArticle(a, 'html')}>HTML</button>
                          <button className="btn-export-pdf" onClick={() => exportArticle(a, 'pdf')}>PDF</button>
                          <button className="btn-export-wechat" onClick={() => exportArticle(a, 'wechat')}>公众号</button>
                          <button className="btn-export-zhihu" onClick={() => exportArticle(a, 'zhihu')}>知乎</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-hint">暂无文章可导出</p>
                )}
              </section>

              <section className="trends-section">
                <h3 className="trends-section-title">阅读收藏导出</h3>
                <div className="export-filters">
                  <select value={exportCategory} onChange={(e) => setExportCategory(e.target.value)}>
                    <option value="all">全部赛道</option>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <select value={exportRange} onChange={(e) => setExportRange(e.target.value)}>
                    <option value="all">全部时间</option>
                    <option value="7d">近7天</option>
                    <option value="30d">近30天</option>
                  </select>
                  <span className="export-count">待导出: {exportFilteredBookmarks.length} 篇</span>
                </div>
                <div className="category-heat-grid">
                  <button className="btn-refresh" onClick={() => {
                    const md = exportFilteredBookmarks.map((b, idx) => `## ${idx + 1}. ${b.title}\n- 来源: ${b.source}\n- 时间: ${b.publishedAt || b.savedAt}\n- 链接: ${b.url}\n- 摘要: ${b.summary || ''}\n`).join('\n');
                    const blob = new Blob([`# Tech Radar 阅读导出\n\n${md}`], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tech-radar-bookmarks-${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>导出 Markdown</button>
                  <button className="btn-refresh" onClick={() => {
                    const data = JSON.stringify(exportFilteredBookmarks, null, 2);
                    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tech-radar-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>导出 JSON</button>
                  <button className="btn-refresh" onClick={() => {
                    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const weekly = exportFilteredBookmarks.filter(b => new Date(b.savedAt || 0).getTime() >= weekAgo);
                    const lines = [
                      '# Tech Radar 周阅读报告',
                      '',
                      `- 生成时间: ${new Date().toLocaleString('zh-CN')}`,
                      `- 本周新增收藏: ${weekly.length}`,
                      `- 本周完成阅读: ${weekly.filter(b => b.isRead).length}`,
                      '',
                      '## 本周收藏清单',
                      ...weekly.map((b, i) => `${i + 1}. [${b.title}](${b.url}) - ${b.source}`)
                    ].join('\n');
                    const blob = new Blob([lines], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tech-radar-weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>导出周报 Markdown</button>
                  <button className="btn-refresh" onClick={() => {
                    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                    const weekly = exportFilteredBookmarks.filter(b => new Date(b.savedAt || 0).getTime() >= weekAgo);
                    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>周阅读报告</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 12px}ul{line-height:1.6}</style></head><body><h1>Tech Radar 周阅读报告</h1><p>生成时间: ${new Date().toLocaleString('zh-CN')}</p><p>本周新增收藏: ${weekly.length}，本周完成阅读: ${weekly.filter(b => b.isRead).length}</p><h2>本周收藏清单</h2><ul>${weekly.map(b => `<li><a href=\"${b.url}\">${b.title}</a> - ${b.source}</li>`).join('')}</ul></body></html>`;
                    const w = window.open('', '_blank');
                    if (!w) return;
                    w.document.write(html);
                    w.document.close();
                    w.focus();
                    w.print();
                  }}>打印/导出 PDF</button>
                </div>
              </section>
            </div>
          )}

          {/* Event Form Modal */}
          {showEventForm && (
            <div className="modal-backdrop" onClick={() => setShowEventForm(false)}>
              <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>添加日程事件</h3>
                  <button className="modal-close" onClick={() => setShowEventForm(false)}>{ICONS.x}</button>
                </div>
                <form className="add-material-form" onSubmit={e => {
                  e.preventDefault();
                  const title = e.target.title.value;
                  const date = e.target.date.value;
                  const time = e.target.time.value;
                  const description = e.target.description.value;
                  if (!title || !date) return;
                  setEvents(prev => [...prev, {
                    id: Date.now(),
                    title,
                    date,
                    time,
                    description,
                    color: '#22d3ee'
                  }]);
                  setShowEventForm(false);
                }}>
                  <div className="form-group">
                    <label>事件标题</label>
                    <input name="title" type="text" placeholder="输入事件标题" autoFocus required />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>日期</label>
                      <input name="date" type="date" required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>时间</label>
                      <input name="time" type="time" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>描述</label>
                    <textarea name="description" placeholder="可选描述..." rows="3" />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-modal-cancel" onClick={() => setShowEventForm(false)}>取消</button>
                    <button type="submit" className="btn-modal-submit">添加</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Panel */}
      <aside className={`panel ${panelCollapsed ? 'collapsed' : ''}`}>
        {!panelCollapsed && (
          <>
            <section className="panel-section follow-panel-section">
              <div className="follow-panel-header">
                <h3 className="panel-title">{ICONS.sparkle}<span>我的关注</span></h3>
                {followKeywords.length > 0 && <span className="follow-total-badge">{followKeywords.length} 个关键词</span>}
              </div>
              <div className="follow-keywords-panel">
                {followKeywords.length === 0 && (
                  <div className="follow-panel-empty">
                    <div className="follow-empty-visual">
                      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" opacity="0.3"><circle cx="20" cy="20" r="18"/><path d="M20 12v8"/><path d="M16 20h8"/></svg>
                    </div>
                    <p className="follow-empty-title">追踪你感兴趣的话题</p>
                    <p className="follow-empty-desc">添加关键词，优先展示匹配资讯</p>
                  </div>
                )}
                {followKeywords.length > 0 && (
                  <div className="follow-panel-list">
                    {sortedFollowKeywords.map(kw => {
                      const count = matchCountPerKeyword[kw] || 0;
                      const isPinned = pinnedKeywords.includes(kw);
                      return (
                        <div key={kw} className={`follow-panel-item ${isPinned ? 'follow-panel-item-pinned' : ''}`}>
                          <div className="follow-panel-item-left">
                            <button className="follow-panel-kw" onClick={() => executeSearch(kw)}>{kw}</button>
                          </div>
                          <div className="follow-panel-item-right">
                            <button className={`follow-panel-pin ${isPinned ? 'is-pinned' : ''}`} onClick={() => isPinned ? unpinFollowKeyword(kw) : pinFollowKeyword(kw)} title={isPinned ? '取消置顶' : '置顶'}>
                              <svg viewBox="0 0 16 16" width="14" height="14" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M3 13l5-5 5 5M8 1v7"/></svg>
                            </button>
                            <button className="follow-panel-del" onClick={() => removeFollowKeyword(kw)} title="删除">
                              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="follow-add-bar follow-add-bar-panel">
                  <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="添加关键词..." onKeyDown={e => e.key === 'Enter' && addFollowKeyword()} />
                  <button className="follow-add-btn" onClick={() => addFollowKeyword()}><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg></button>
                </div>
                {hotTags.length > 0 && (() => {
                  const suggestions = hotTags.filter(t => !followKeywords.includes(t.tag)).slice(0, 4);
                  return suggestions.length > 0 && followKeywords.length > 0 ? (
                    <div className="follow-suggest">
                      <span className="follow-suggest-label">热门推荐</span>
                      <div className="follow-suggest-tags">
                        {suggestions.map(s => (
                          <button key={s.tag} className="follow-suggest-tag" onClick={() => addFollowKeyword(s.tag)}>{s.tag}</button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            </section>
            <section className="panel-section"><h3 className="panel-title">{ICONS.fire}<span>热门标签</span></h3><div className="hot-tags">{hotTags.map((item, i) => <button key={item.tag} className="hot-tag" onClick={() => executeSearch(item.tag)}><span className="tag-rank">{i + 1}</span><span className="tag-name">{item.tag}</span><span className="tag-trend">24h +{item.trend}</span><span className="tag-count">{item.count}</span></button>)}</div></section>
            {/* 全球科技大屏预览 */}
            <section className="panel-section panel-globe-preview">
              <h3 className="panel-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span>全球科技大屏</span>
              </h3>
              <div className="globe-preview-card" onClick={() => setGlobeFullscreenOpen(true)}>
                <div className="globe-preview-visual">
                  <div className="globe-preview-globe">
                    <div className="globe-preview-ring" />
                    <div className="glob-preview-dot" style={{ top: '30%', left: '25%' }} />
                    <div className="glob-preview-dot" style={{ top: '35%', left: '70%' }} />
                    <div className="glob-preview-dot" style={{ top: '55%', left: '50%' }} />
                    <div className="glob-preview-dot" style={{ top: '45%', left: '35%' }} />
                  </div>
                </div>
                <div className="globe-preview-info">
                  <span className="globe-preview-label">全球热点分布</span>
                  <span className="globe-preview-count">{items.length} 条资讯</span>
                </div>
                <button className="globe-preview-expand" title="点击放大">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  点击放大
                </button>
              </div>
            </section>
            {/* 我的关注动态 */}
            {followKeywords.length > 0 && (
              <section className="panel-section follow-updates-section">
                <h3 className="panel-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  <span>关注动态</span>
                </h3>
                <div className="follow-updates-list">
                  {followKeywordUpdates.length === 0 ? (
                    <div className="follow-updates-empty">暂无匹配资讯</div>
                  ) : (
                    followKeywordUpdates.slice(0, 3).map(group => (
                      <div key={group.keyword} className="follow-update-group">
                        <div className="follow-update-header">
                          <span className="follow-update-keyword">{group.keyword}</span>
                          <span className="follow-update-count">+{group.count}</span>
                        </div>
                        <div className="follow-update-items">
                          {group.items.map((item, idx) => (
                            <a
                              key={idx}
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="follow-update-item"
                              title={item.title}
                              onClick={(e) => { e.stopPropagation(); }}
                            >
                              <span className="follow-update-title">{item.title}</span>
                              <span className="follow-update-source">{item.source}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
            {/* 今日必读 */}
            {todayMustRead.length > 0 && (
              <section className="panel-section must-read-section">
                <h3 className="panel-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/><circle cx="12" cy="12" r="3"/></svg>
                  <span>今日必读</span>
                </h3>
                <div className="must-read-list">
                  {todayMustRead.map((item, idx) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="must-read-item"
                      title={item.title}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <div className="must-read-rank">{idx + 1}</div>
                      <div className="must-read-info">
                        <span className="must-read-title">{item.title}</span>
                        <div className="must-read-meta">
                          <span className="must-read-source">{item.source}</span>
                          <span className="must-read-score">{item.mustReadScore.toFixed(0)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}
            <section className="panel-section">
              <div className="ai-insights-header">
                <h3 className="panel-title">{ICONS.sparkles}<span>AI 洞察</span></h3>
                {aiInsights.data && (
                  <button className="btn-refresh-insights" onClick={fetchAiInsights} disabled={aiInsights.loading} title="重新分析">
                    {ICONS.refresh}
                  </button>
                )}
              </div>
              {aiInsights.loading && <div className="ai-insights-loading"><div className="ai-loading-spinner" />正在分析...</div>}
              {aiInsights.error && <div className="ai-insights-error">{ICONS.x} {aiInsights.error}</div>}
              {aiInsights.data && (
                <div className="ai-insights-content">
                  {aiInsights.data.trends && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.chart} 技术趋势</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.trends.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiInsights.data.correlations && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.link} 跨域关联</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.correlations.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                  {aiInsights.data.signals && (
                    <div className="ai-insight-block">
                      <span className="ai-insight-label">{ICONS.bell} 关键信号</span>
                      <ul className="ai-insight-list">
                        {aiInsights.data.signals.map((s, i) => <li key={i} className="ai-signal-item">{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {!aiInsights.loading && !aiInsights.data && !aiInsights.error && (
                <div className="ai-insights-placeholder">
                  {!llmConfig.baseUrl ? (
                    <>
                      <p>配置大模型后自动生成洞察</p>
                      <button className="btn-quick-config" onClick={() => setShowLlmQuickConfig(true)}>{ICONS.settings}<span>快速配置</span></button>
                    </>
                  ) : (
                    <>
                      <div className="llm-status-row">
                        <span className="llm-status-indicator" title="已配置">●</span>
                        <span className="llm-model-name">{llmConfig.selectedModel || '未选择模型'}</span>
                      </div>
                      <p className="ai-insights-hint">已配置 LLM，点击「重新分析」生成当前资讯的洞察</p>
                      <div className="llm-action-row">
                        <button className="btn-test-inline" onClick={fetchAiInsights} disabled={llmTesting}>{llmTesting ? '...' : '分析'}</button>
                        <button className="btn-edit-config" onClick={() => setShowLlmQuickConfig(true)}>{ICONS.settings}<span>修改</span></button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </aside>

      {/* Settings Modal */}
      {/* Lightbox */}
      {lightbox.open && (
        <div className="lightbox-overlay" onClick={() => setLightbox({ open: false, src: '', title: '' })}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox({ open: false, src: '', title: '' })}>{ICONS.x}</button>
            <img src={lightbox.src} alt={lightbox.title} className="lightbox-img" />
            {lightbox.title && <p className="lightbox-title">{lightbox.title}</p>}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal modal-lg settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>设置</h3><button className="modal-close" onClick={() => setShowSettings(false)}>{ICONS.x}</button></div>
            <div className="modal-body settings-sidebar-body">
              <div className="settings-sidebar">
                <button className={`settings-nav-item ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>通用设置</button>
                <button className={`settings-nav-item ${settingsTab === 'sources' ? 'active' : ''}`} onClick={() => setSettingsTab('sources')}>信息源</button>
                <button className={`settings-nav-item ${settingsTab === 'llm' ? 'active' : ''}`} onClick={() => setSettingsTab('llm')}>大模型</button>
                <button className={`settings-nav-item ${settingsTab === 'agents' ? 'active' : ''}`} onClick={() => setSettingsTab('agents')}>Agent管理</button>
              </div>
              <div className="settings-content">
              {settingsTab === 'general' && (
                <div className="setting-item"><label>关键词屏蔽</label><textarea value={blocked} onChange={e => setBlocked(e.target.value)} placeholder="输入屏蔽词，逗号分隔" /><p className="setting-note">已过滤 {stats.blockedCount} 条资讯</p></div>
              )}

              {settingsTab === 'sources' && (
                <>
                  {/* 源类型切换 */}
                  <div className="source-type-tabs">
                    <button
                      className={`source-type-tab ${sourceTypeTab === 'builtin' ? 'active' : ''}`}
                      onClick={() => setSourceTypeTab('builtin')}
                    >
                      内置信息源
                    </button>
                    <button
                      className={`source-type-tab ${sourceTypeTab === 'custom' ? 'active' : ''}`}
                      onClick={() => setSourceTypeTab('custom')}
                    >
                      自定义信息源
                    </button>
                  </div>

                  {/* 等级统计面板 - 所有源都显示 */}
                  {Object.keys(sourceGrades).length > 0 && (
                    <div className="grade-stats-panel">
                      <div className="grade-stats-header">
                        <span className="grade-stats-title">信息源等级分布</span>
                        <span className="grade-stats-total">总计: {sourceTypeTab === 'builtin' ? allSources.length : customSources.length}个源</span>
                      </div>
                      <div className="grade-stats-grid">
                        {['S', 'A', 'B', 'C', 'D'].map(grade => {
                          const gradeInfo = sourceGrades[grade];
                          const currentSources = sourceTypeTab === 'builtin' ? allSources : customSources;
                          const count = currentSources.filter(s => s.grade === grade).length;
                          const percentage = currentSources.length > 0 ? (count / currentSources.length * 100).toFixed(1) : 0;
                          return (
                            <div key={grade} className="grade-stat-card">
                              <div className="grade-stat-badge" style={{backgroundColor: gradeInfo?.color || '#ccc'}}>
                                {grade}
                              </div>
                              <div className="grade-stat-content">
                                <div className="grade-stat-label">{gradeInfo?.label?.split('-')[1] || '未知'}</div>
                                <div className="grade-stat-stats">
                                  <span className="grade-stat-count">{count}个</span>
                                  <span className="grade-stat-percent">{percentage}%</span>
                                </div>
                                <div className="grade-stat-desc">{gradeInfo?.description || ''}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 内置信息源管理 */}
                  {sourceTypeTab === 'builtin' && (
                    <div className="setting-item">
                      <label>内置信息源管理</label>
                      <p className="setting-desc">管理系统内置的266个权威信息源，支持等级筛选和启用/禁用操作</p>

                       <div className="source-stats">
                         <span>已启用: {allSources.length - disabledSources.length}</span>
                         <span>已禁用: {disabledSources.length}</span>
                         <span>总计: {allSources.length}</span>
                       </div>

                      {/* 筛选栏 */}
                      <div className="source-filter-bar">
                        <input
                          type="text"
                          placeholder="搜索源名称、地区..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="source-search-input"
                        />
                        <select
                          value={gradeFilter}
                          onChange={(e) => setGradeFilter(e.target.value)}
                          className="source-filter-select"
                        >
                          <option value="all">全部等级</option>
                          {Object.keys(sourceGrades).map(grade => (
                            <option key={grade} value={grade}>{grade}级 - {sourceGrades[grade].label?.split('-')[1]}</option>
                          ))}
                        </select>
                        <select
                          value={regionFilter}
                          onChange={(e) => setRegionFilter(e.target.value)}
                          className="source-filter-select"
                        >
                          <option value="all">全部地区</option>
                          <option value="overseas">海外</option>
                          <option value="domestic">国内</option>
                          <option value="global">全球</option>
                        </select>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="source-filter-select"
                        >
                          <option value="all">全部状态</option>
                          <option value="enabled">已启用</option>
                          <option value="disabled">已禁用</option>
                        </select>
                      </div>

                      {/* 内置源列表 */}
                      <div className="builtin-sources-grid">
                        {allSources.length === 0 ? (
                          <div className="empty-state">
                            <p>正在加载内置信息源...</p>
                          </div>
                        ) : (
                          allSources.filter(source => {
                            if (!source || !source.name) return false;

                            // 搜索匹配
                            const searchLower = searchQuery.toLowerCase();
                            const matchesSearch = !searchQuery ||
                              source.name.toLowerCase().includes(searchLower) ||
                              source.region?.toLowerCase().includes(searchLower);

                            // 等级筛选
                            const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;

                            // 地区筛选
                            const matchesRegion = regionFilter === 'all' || source.region === regionFilter;

                            // 状态筛选
                            const isDisabled = disabledSources.includes(source.name);
                            const matchesStatus = statusFilter === 'all' ||
                              (statusFilter === 'enabled' && !isDisabled) ||
                              (statusFilter === 'disabled' && isDisabled);

                            return matchesSearch && matchesGrade && matchesRegion && matchesStatus;
                          }).map(source => (
                            <div
                              key={source.name}
className={`source-card ${disabledSources.includes(source.name) ? 'disabled' : ''}`}
                            >
                               <div className="source-card-main">
                                <div className="source-card-header">
                                  <div className="source-card-title-row">
                                    <span className="source-card-name">{source.name}</span>
                                    {source.grade && sourceGrades[source.grade] && (
                                      <span
                                        className="source-grade-badge"
                                        style={{
                                          backgroundColor: sourceGrades[source.grade].color,
                                          color: '#fff'
                                        }}
                                      >
                                        {source.grade}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    className="source-toggle-btn"
                                    onClick={() => {
                                      if (disabledSources.includes(source.name)) {
                                        setDisabledSources(prev => prev.filter(name => name !== source.name));
                                      } else {
                                        setDisabledSources(prev => [...prev, source.name]);
                                      }
                                    }}
                                  >
                                    {disabledSources.includes(source.name) ? '启用' : '禁用'}
                                  </button>
                                </div>
                                <div className="source-card-info">
                                  <div className="source-card-meta">
                                    <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                    <span className="source-card-category">{source.grade || 'N/A'}级</span>
                                  </div>
                                  {source.gradeInfo && (
                                    <div className="source-card-desc">{source.gradeInfo.description}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                     </div>
                  )}

                  {/* 自定义信息源管理 */}
                  {sourceTypeTab === 'custom' && (
                    <>
                      <div className="setting-item">
                        <label>自定义信息源</label>
                        <p className="setting-desc">管理 RSS/Atom 订阅源，支持编辑、批量操作和健康监控</p>
                    
                    {/* 数据加载状态指示 */}
                    {(!allSources || allSources.length === 0) && (
                      <div className="loading-indicator">
                        <p>正在加载内置信息源...</p>
                      </div>
                    )}
                    
                    {/* 自动监控控制面板 */}
                    <div className="monitor-control-panel">
                      <div className="monitor-toggle">
                        <label className="monitor-switch">
                          <input
                            type="checkbox"
                            checked={autoMonitorEnabled}
                            onChange={(e) => setAutoMonitorEnabled(e.target.checked)}
                          />
                          <span>自动监控</span>
                        </label>
                        <select
                          value={monitorInterval}
                          onChange={(e) => setMonitorInterval(Number(e.target.value))}
                          className="monitor-interval-select"
                          disabled={!autoMonitorEnabled}
                        >
                          <option value="30">每30分钟</option>
                          <option value="60">每小时</option>
                          <option value="120">每2小时</option>
                          <option value="360">每6小时</option>
                          <option value="720">每12小时</option>
                        </select>
                      </div>
                      
                      {/* 警告面板 */}
                      {monitorAlerts.length > 0 && (
                        <div className="monitor-alerts-panel">
                          <div className="alerts-header">
                            <span className="alerts-title">⚠️ 健康警告 ({monitorAlerts.length})</span>
                            <button className="alerts-clear-btn" onClick={clearAlerts}>清除</button>
                          </div>
                          <div className="alerts-list">
                            {monitorAlerts.map(alert => (
                              <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                                <span className="alert-message">{alert.message}</span>
                                <span className="alert-time">
                                  {new Date(alert.timestamp).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* 批量操作栏 */}
                    <div className="source-batch-actions">
<button className="source-action-btn" onClick={() => setBatchMode(!batchMode)} disabled={customSources.length === 0}>
                         {batchMode ? '退出批量' : '批量操作'}
                       </button>
{batchMode && (
                         <>
                           <select
                             value={selectedSources.size > 0 ? 'selected' : 'all'}
                             onChange={(e) => {
                               const targetGrade = e.target.value;
                               if (targetGrade === 'all') return;

                               const sourcesToSelect = allSources.filter(s => s.grade === targetGrade);
                               if (e.target.value === 'selected') {
                                 // 保持当前选择
                               } else {
                                 setSelectedSources(new Set(sourcesToSelect.map(s => s.name)));
                               }
                             }}
                             className="source-action-btn"
                           >
                             <option value="selected">已选择 ({selectedSources.size})</option>
                             {Object.keys(sourceGrades).map(grade => (
                               <option key={grade} value={grade}>
                                 选择所有{grade}级源
                               </option>
                             ))}
                           </select>
                           <button className="source-action-btn" onClick={() => setDisabledSources(prev => {
                             const selectedIds = Array.from(selectedSources);
                             const enabledSources = customSources.filter(s => !disabledSources.includes(s.name));
                             const newlyDisabled = enabledSources.filter(s => selectedIds.includes(s.id));
                             return [...prev, ...newlyDisabled.map(s => s.name)];
                           })} disabled={selectedSources.size === 0}>
                             批量禁用
                           </button>
                           <button className="source-action-btn" onClick={() => setDisabledSources(prev => {
                             const selectedIds = Array.from(selectedSources);
                             const currentlyDisabled = prev.filter(name => {
                               const source = customSources.find(s => s.id === selectedIds[0]);
                               return source && source.name === name;
                             });
                             return prev.filter(name => !currentlyDisabled.includes(name));
                           })} disabled={selectedSources.size === 0}>
                             批量启用
                           </button>
                           <button className="source-action-btn danger" onClick={() => {
                             if (confirm(`确定删除选中的 ${selectedSources.size} 个源？`)) {
                               setCustomSources(prev => prev.filter(s => !selectedSources.has(s.id)));
                               setSelectedSources(new Set());
                               setBatchMode(false);
                             }
                           }} disabled={selectedSources.size === 0}>
                             批量删除
                           </button>
                         </>
                       )}
                      <button className="source-action-btn primary" onClick={() => setShowSourceForm(true)}>
                        {ICONS.plus} 添加源
                      </button>
                      <button className="source-action-btn" onClick={verifyAllSources} disabled={verifyingAllSources}>
                        {verifyingAllSources ? '验证中...' : '验证所有源'}
                      </button>
                      <button className="source-action-btn" onClick={exportSources}>
                        导出配置
                      </button>
                      <label className="source-action-btn">
                        导入配置
                        <input
                          type="file"
                          accept=".json"
                          onChange={importSources}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

{/* 高级搜索和筛选 */}
                     <div className="source-filter-bar">
                       <input
                         type="text"
                         placeholder="搜索源名称、URL、标签..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="source-search-input"
                       />
                       <select
                         value={customSourceFilter}
                         onChange={(e) => setCustomSourceFilter(e.target.value)}
                         className="source-filter-select"
                       >
                         <option value="all">全部状态</option>
                         <option value="enabled">已启用</option>
                         <option value="disabled">已禁用</option>
                         <option value="healthy">健康</option>
                         <option value="warning">警告</option>
                         <option value="error">异常</option>
                       </select>
                       <select
                         value={gradeFilter}
                         onChange={(e) => setGradeFilter(e.target.value)}
                         className="source-filter-select"
                       >
                         <option value="all">全部等级</option>
{Object.keys(sourceGrades).length > 0 && Object.entries(sourceGrades).map(([grade, info]) => (
                            <option key={grade} value={grade}>
                              {grade}级 - {info.label?.split('-')[1] || '未知'}
                            </option>
                          ))}
                       </select>
                       <select
                         value={regionFilter}
                         onChange={(e) => setRegionFilter(e.target.value)}
                         className="source-filter-select"
                       >
                         <option value="all">全部地区</option>
                         <option value="overseas">仅海外</option>
                         <option value="domestic">仅国内</option>
                         <option value="global">全球</option>
                       </select>
                     </div>

                    {/* 自定义源列表 */}
                    <div className="custom-sources-grid">
                      {customSources.length === 0 ? (
                        <div className="empty-state">
                          <p>暂无自定义信息源</p>
                          <button className="source-action-btn primary" onClick={() => setShowSourceForm(true)}>
                            {ICONS.plus} 添加第一个源
                          </button>
                        </div>
                      ) : (
                        (customSources || []).filter(source => {
                          if (!source || !source.name || !source.url) return false;
                          
                          // 搜索匹配
                          const searchLower = searchQuery.toLowerCase();
                          const matchesSearch = !searchQuery || 
                            source.name.toLowerCase().includes(searchLower) ||
                            source.url.toLowerCase().includes(searchLower) ||
                            (source.tags && source.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                            (source.category && source.category.toLowerCase().includes(searchLower));
                          
                          // 启用状态筛选
                          const isDisabled = disabledSources.includes(source.name);
                          const matchesStatus = customSourceFilter === 'all' ||
                            (customSourceFilter === 'enabled' && !isDisabled) ||
                            (customSourceFilter === 'disabled' && isDisabled);
                          
// 地区筛选
                           const matchesRegion = regionFilter === 'all' || source.region === regionFilter;

                           // 等级筛选
                           const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;

                           // 健康状态筛选
                           const health = sourceHealth[source.id];
                           const matchesHealth = customSourceFilter === 'all' ||
                             customSourceFilter === 'enabled' ||
                             customSourceFilter === 'disabled' ||
                             (customSourceFilter === 'healthy' && health?.status === 'healthy') ||
                             (customSourceFilter === 'warning' && health?.status === 'warning') ||
                             (customSourceFilter === 'error' && health?.status === 'error');

                           return matchesSearch && matchesStatus && matchesRegion && matchesGrade && matchesHealth;
                        }).map(source => (
                          <div
                            key={source.id}
className={`source-card`}
                          >
 <div className="source-card-main">
                               <div className="source-card-header">
                                 <div className="source-card-title-row">
                                   <span className="source-card-name">{source.name}</span>
                                   {source.grade && sourceGrades[source.grade] && (
                                     <span
                                       className="source-grade-badge"
                                       style={{
                                         backgroundColor: sourceGrades[source.grade].color,
                                         color: '#fff',
                                         fontSize: '10px',
                                         padding: '2px 6px',
                                         borderRadius: '4px',
                                         marginLeft: '8px',
                                         fontWeight: '600',
                                         display: 'inline-flex',
                                         alignItems: 'center',
                                         gap: '2px'
                                       }}
                                       title={sourceGrades[source.grade].label}
                                     >
                                       {sourceGrades[source.grade].icon} {source.grade}级
                                     </span>
                                   )}
                                 </div>
                                 <div className="source-card-status">
                                   {getSourceHealthIndicator(source.id, 'custom')}
                                 </div>
                               </div>
                              <div className="source-card-info">
                                <div className="source-card-url" title={source.url}>
                                  {truncateUrl(source.url, 40)}
                                </div>
                                <div className="source-card-meta">
                                  <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                  {source.category && (
                                    <span className="source-card-category">{source.category}</span>
                                  )}
                                  {(source.tags || []).slice(0, 3).map((tag, i) => (
                                    <span key={i} className="source-card-tag">{tag}</span>
                                  ))}
                                </div>
                                {source.notes && (
                                  <p className="source-card-notes" title={source.notes}>
                                    {truncateText(source.notes, 50)}
                                  </p>
                                )}
                              </div>
                              <div className="source-card-actions">
                                <button
                                  className="source-icon-btn"
                                  title="编辑"
                                  onClick={() => setEditingSource(source)}
                                >
                                  {ICONS.edit || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0 0-2 2v14a2 2 0 0 0 0 2h7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1 1 4 4z" /></svg>}
                                </button>
                                <button
                                  className="source-icon-btn"
                                  title="验证"
                                  onClick={() => verifySingleSource(source)}
                                >
                                  {ICONS.check || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 12 20 12" /></svg>}
                                </button>
                                <button
                                  className="source-icon-btn danger"
                                  title="删除"
                                  onClick={() => {
                                    if (confirm(`确定删除「${source.name}」？`)) {
                                      setCustomSources(prev => prev.filter(s => s.id !== source.id));
                                      setSourceHealth(prev => {
                                        const newHealth = { ...prev };
                                        delete newHealth[source.id];
                                        return newHealth;
                                      });
                                    }
                                  }}
                                >
                                  {ICONS.x || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                       </div>

                    {/* 编辑/添加源表单 */}
                    {showSourceForm && (
                      <div className="source-form-modal-overlay">
                        <div className="source-form-modal">
                          <div className="source-form-header">
                            <h3>{editingSource ? '编辑信息源' : '添加信息源'}</h3>
                            <button className="source-form-close" onClick={() => {
                              setShowSourceForm(false);
                              setEditingSource(null);
                              setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                            }}>{ICONS.x}</button>
                          </div>
                          <div className="source-form-body">
                            <div className="source-form-group">
                              <label>名称 *</label>
                              <input
                                type="text"
                                value={editingSource ? editingSource.name : newSource.name}
                                onChange={e => {
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, name: e.target.value }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, name: e.target.value }));
                                  }
                                }}
                                placeholder="如：TechCrunch"
                                className="source-form-input"
                              />
                            </div>
                            <div className="source-form-group">
                              <label>RSS/Atom URL *</label>
                              <input
                                type="text"
                                value={editingSource ? editingSource.url : newSource.url}
                                onChange={e => {
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, url: e.target.value }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, url: e.target.value }));
                                  }
                                }}
                                placeholder="https://example.com/feed.xml"
                                className="source-form-input"
                              />
                            </div>
                            <div className="source-form-group">
                              <label>地区</label>
                              <select
                                value={editingSource ? editingSource.region : newSource.region}
                                onChange={e => {
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, region: e.target.value }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, region: e.target.value }));
                                  }
                                }}
                                className="source-form-select"
                              >
                                <option value="overseas">海外</option>
                                <option value="domestic">国内</option>
                                <option value="global">全球</option>
                              </select>
                            </div>
                            <div className="source-form-group">
                              <label>分类</label>
                              <input
                                type="text"
                                value={editingSource ? editingSource.category || '' : newSource.category}
                                onChange={e => {
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, category: e.target.value }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, category: e.target.value }));
                                  }
                                }}
                                placeholder="如：AI、硬件、开源"
                                className="source-form-input"
                              />
                            </div>
                            <div className="source-form-group">
                              <label>标签（逗号分隔）</label>
                              <input
                                type="text"
                                value={editingSource ? (editingSource.tags || []).join(', ') : newSource.tags}
                                onChange={e => {
                                  const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, tags }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, tags }));
                                  }
                                }}
                                placeholder="如：科技, AI, 机器学习"
                                className="source-form-input"
                              />
                            </div>
                            <div className="source-form-group">
                              <label>备注</label>
                              <textarea
                                value={editingSource ? editingSource.notes || '' : newSource.notes}
                                onChange={e => {
                                  if (editingSource) {
                                    setEditingSource(prev => ({ ...prev, notes: e.target.value }));
                                  } else {
                                    setNewSource(prev => ({ ...prev, notes: e.target.value }));
                                  }
                                }}
                                rows={3}
                                placeholder="可选备注信息..."
                                className="source-form-textarea"
                              />
                            </div>
                          </div>
                          <div className="source-form-footer">
                            <button className="btn-cancel" onClick={() => {
                              setShowSourceForm(false);
                              setEditingSource(null);
                              setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                            }}>取消</button>
                            <button
                              className="btn-save"
                              onClick={() => {
                                if (editingSource) {
                                  setCustomSources(prev => prev.map(s => s.id === editingSource.id ? editingSource : s));
                                  setEditingSource(null);
                                } else {
                                  if (!newSource.name.trim() || !newSource.url.trim()) {
                                    alert('请填写名称和 URL');
                                    return;
                                  }
                                  const source = {
                                    ...newSource,
                                    id: Date.now(),
                                    tags: newSource.tags ? newSource.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                                  };
                                  setCustomSources(prev => [...prev, source]);
                                  setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                                }
                                setShowSourceForm(false);
                              }}
                            >
                              {editingSource ? '保存修改' : '添加'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  <div className="setting-item">
                    <label>内置信息源</label>
                    <p className="setting-desc">管理系统预设的信息源，支持批量操作和健康监控</p>
                    
                    {/* 内置源工具栏 */}
                    <div className="source-batch-actions">
<button className="source-action-btn" onClick={() => setBuiltinBatchMode(!builtinBatchMode)} disabled={!allSources || allSources.length === 0}>
                         {builtinBatchMode ? '退出批量' : '批量操作'}
                       </button>
                      {builtinBatchMode && (
                        <>
                          <button className="source-action-btn" onClick={() => setDisabledSources([])} disabled={selectedBuiltinSources.size === 0}>
                            批量启用
                          </button>
                          <button className="source-action-btn" onClick={() => setDisabledSources(Array.from(selectedBuiltinSources))} disabled={selectedBuiltinSources.size === 0}>
                            批量禁用
                          </button>
                        </>
                      )}
                      <button className="source-action-btn" onClick={verifyAllSources} disabled={verifyingAllSources}>
                        {verifyingAllSources ? '验证中...' : '验证所有源'}
                      </button>
                    </div>

                    {/* 搜索和筛选 */}
                    <div className="source-filter-bar">
                      <input
                        type="text"
                        placeholder="搜索信息源名称..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="source-search-input"
                      />
                      <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="source-filter-select"
                      >
                        <option value="all">全部地区</option>
                        <option value="overseas">仅海外</option>
                        <option value="domestic">仅国内</option>
                        <option value="healthy">健康</option>
                        <option value="warning">警告</option>
                        <option value="error">异常</option>
                      </select>
                    </div>

                    {/* 内置源卡片列表 */}
                    <div className="builtin-sources-grid">
                      {!allSources || allSources.length === 0 ? (
                        <div className="empty-state">
                          <p>暂无内置信息源</p>
                        </div>
                      ) : (
                        (allSources || []).filter(s => {
                          if (!s || !s.name || !s.url) return false;
                          
                          const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesFilter = sourceFilter === 'all' || 
                            (sourceFilter === 'overseas' && s.region === 'overseas') ||
                            (sourceFilter === 'domestic' && s.region !== 'overseas') ||
                            (sourceFilter === s.health && sourceHealth[s.name]?.status === sourceFilter);
                          return matchesSearch && matchesFilter;
                        }).map(source => {
                          const isDisabled = disabledSources.includes(source.name);
                          const health = sourceHealth[source.name];
                          const isSelected = selectedBuiltinSources.has(source.name);
                          
                          return (
                            <div
                              key={source.name}
className={`source-card builtin ${isDisabled ? 'disabled' : ''} ${health?.status ? `health-${health.status}` : ''}`}
                            >
                               <div className="source-card-main">
                                <div className="source-card-header">
                                  <span className="source-card-name">{source.name}</span>
                                  <div className="source-card-status">
                                    {getSourceHealthIndicator(source.name, 'builtin')}
                                    {health && health.responseTime && (
                                      <span className="response-time">{health.responseTime}ms</span>
                                    )}
                                  </div>
                                </div>
                                <div className="source-card-info">
                                  <div className="source-card-url" title={source.url}>
                                    {truncateUrl(source.url, 40)}
                                  </div>
                                  <div className="source-card-meta">
                                    <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                    <span className="source-card-category">{source.defaultCategory}</span>
                                  </div>
                                  {health && health.itemCount > 0 && (
                                    <div className="source-card-stats">
                                      <span className="stats-item">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 4 4" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        {health.itemCount} 条
                                      </span>
                                      {health.lastCheck && (
                                        <span className="stats-item">
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 16 12" /><line x1="12" y1="8" x2="12" y2="12" /></svg>
                                          {new Date(health.lastCheck).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="source-card-actions">
                                  <button
                                    className="source-icon-btn"
                                    title={isDisabled ? '启用' : '禁用'}
                                    onClick={() => {
                                      if (isDisabled) {
                                        setDisabledSources(prev => prev.filter(name => name !== source.name));
                                      } else {
                                        setDisabledSources(prev => [...prev, source.name]);
                                      }
                                    }}
                                  >
                                    {isDisabled ? ICONS.power || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="5" width="22" height="14" rx="2" ry="2" /><line x1="1" y1="22" x2="23" y2="22" /></svg> : ICONS.power || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.72 0" /><line x1="12" y1="2" x2="12" y2="22" /><path d="M12 2v20" /></svg>}
                                  </button>
                                  <button
                                    className="source-icon-btn"
                                    title="验证"
                                    onClick={() => verifySingleSource(source, 'builtin')}
                                  >
                                    {ICONS.check || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 12 20 12" /></svg>}
                                  </button>
                                  <button
                                    className="source-icon-btn"
                                    title="复制URL"
                                    onClick={() => {
                                      navigator.clipboard.writeText(source.url);
                                      alert('URL 已复制到剪贴板');
                                    }}
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="6" height="6" /><path d="M7 17.94l3.47-3.47" /><path d="M9 12.94l3.47-3.47" /><path d="M10.5 2H9" /><path d="M9 2L3.5 6" /></svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* 验证结果面板 */}
                    {allSourcesVerifyResults && (
                      <div className="all-sources-verify-results">
                        <div className="verify-results-header">
                          <p className="verify-results-title">
                            {verifyingAllSources ? `验证中... (${allSourcesVerifyResults?.length || 0}/${allSources.length})` : '验证结果'}
                          </p>
                          {!verifyingAllSources && allSourcesVerifyResults && (
                            <button className="verify-results-close" onClick={() => setAllSourcesVerifyResults(null)}>{ICONS.x}</button>
                          )}
                        </div>
                        <div className="verify-results-list">
                          {allSourcesVerifyResults.map((r, i) => (
                            <div key={i} className={`verify-result-item ${r.ok ? 'verify-ok' : 'verify-fail'}`}>
                              <div className="verify-result-main">
                                <span className="verify-result-name">{r.name}</span>
                                <span className={`verify-result-status ${r.ok ? 'status-ok' : 'status-fail'}`}>
                                  {r.ok ? '✓ 有效' : '✗ ' + (r.message || '无效')}
                                </span>
                              </div>
                              {r.itemCount && (
                                <div className="verify-result-detail">
                                  {r.itemCount} 条内容
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {settingsTab === 'llm' && (
                <div className="setting-item">
                  <label>大模型配置</label>
                  <p className="setting-desc">配置 OpenAI 兼容 API，自动拉取或手动输入模型</p>
                  <div className="llm-config-form">
                    <div className="llm-config-row">
                      <input type="text" placeholder="API Base URL (如 https://api.openai.com)" value={llmConfig.baseUrl} onChange={e => setLlmConfig(prev => ({ ...prev, baseUrl: e.target.value }))} className="llm-input url-input" />
                      <input type="password" placeholder="API Key (可选)" value={llmConfig.apiKey} onChange={e => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))} className="llm-input" />
                      <button className="fetch-models-btn" onClick={fetchLlmModels} disabled={llmFetching || !llmConfig.baseUrl}>{llmFetching ? '拉取中...' : '拉取模型'}</button>
                    </div>
                    {llmFetchError && <div className="llm-fetch-error">{llmFetchError}</div>}
                    <div className="llm-config-row">
                      <select className="llm-model-select" value={llmConfig.selectedModel} onChange={e => setLlmConfig(prev => ({ ...prev, selectedModel: e.target.value }))}>
                        <option value="">选择模型</option>
                        {allLlmModels.map(m => <option key={m.id} value={m.id}>{m.name}{m.owned_by ? ` (${m.owned_by})` : ''}</option>)}
                      </select>
                      <input type="text" placeholder="手动输入模型名称" value={llmManualInput} onChange={e => setLlmManualInput(e.target.value)} className="llm-input" />
                      <button className="add-source-btn" onClick={addManualModel} disabled={!llmManualInput.trim()}>{ICONS.plus}</button>
                    </div>
                    {(llmConfig.manualModels || []).length > 0 && (
                      <div className="manual-models-list">
                        {(llmConfig.manualModels || []).map(m => <div key={m.id} className="custom-source-item"><div className="custom-source-info"><span className="custom-source-name">{m.name}</span><span className="custom-source-region">手动</span></div><button className="remove-source-btn" onClick={() => removeManualModel(m.id)}>{ICONS.x}</button></div>)}
                      </div>
                    )}
                    <div className="llm-config-row">
                      <button className="test-llm-btn" onClick={testLlmConnection} disabled={llmTesting || !llmConfig.baseUrl || !llmConfig.selectedModel}>{llmTesting ? '测试中...' : '测试连接'}</button>
                    </div>
                    {llmTestResult && (
                      <div className={`source-verify-result ${llmTestResult.ok ? 'verify-ok' : 'verify-fail'}`}>
                        {llmTestResult.ok ? <>{ICONS.check} 连接成功 ({llmTestResult.model}): {llmTestResult.reply}</> : <>连接失败: {llmTestResult.message}</>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settingsTab === 'agents' && (
                <>
                  <div className="setting-item">
                    <label>AI精灵名称</label>
                    <p className="setting-desc">自定义AI精灵在聊天窗口中的显示名称</p>
                    <input 
                      type="text" 
                      value={elfName} 
                      onChange={e => setElfName(e.target.value || 'AI精灵')}
                      placeholder="AI精灵"
                      className="elf-name-input"
                      maxLength={20}
                    />
                  </div>
                  <div className="setting-item">
                    <label>Agent管理</label>
                    <p className="setting-desc">选择和管理AI精灵的智能体，每个Agent有不同的专长和提示词</p>
                    <div className="agent-filter-bar">
                      {AGENT_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          className={`agent-filter-btn ${agentFilter === cat ? 'active' : ''}`}
                          onClick={() => setAgentFilter(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="agent-list">
                      {agents.filter(a => agentFilter === '全部' || a.category === agentFilter).map(agent => (
                        <div key={agent.id} className={`agent-card ${currentAgent === agent.id ? 'active' : ''}`}>
                          <div className="agent-card-main">
                            <img src={agent.avatar || '/ai-elf-avatar.png'} alt={agent.name} className="agent-card-avatar" />
                            <div className="agent-card-info">
                              <span className="agent-card-name">{agent.name}</span>
                            <span className="agent-card-desc">{agent.description}</span>
                            <div className="agent-card-tags">
                              <span className="agent-card-category">{agent.category}</span>
                              {(agent.tags || []).map((tag, i) => (
                                <span key={i} className="agent-card-tag">{tag}</span>
                              ))}
                            </div>
                            </div>
                          </div>
                          <div className="agent-card-actions">
                            <button
                              className={`agent-card-select ${currentAgent === agent.id ? 'selected' : ''}`}
                              onClick={() => setCurrentAgent(agent.id)}
                            >
                              {currentAgent === agent.id ? '使用中' : '选择'}
                            </button>
                            <button
                              className="agent-card-detail-btn"
                              onClick={() => setEditingAgent(agent)}
                            >
                              详情
                            </button>
                            {agent.isCustom && (
                              <button className="agent-card-delete" onClick={() => {
                                if (confirm(`确定删除Agent「${agent.name}」？`)) {
                                  setAgents(prev => prev.filter(a => a.id !== agent.id));
                                  if (currentAgent === agent.id) setCurrentAgent('analyst');
                                }
                              }}>
                                {ICONS.x}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="agent-create-btn" onClick={() => setShowAgentForm(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16,marginRight:6}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      创建自定义Agent
                    </button>
                  </div>

                  {showAgentForm && (
                    <div className="agent-form-overlay">
                      <div className="agent-form">
                        <div className="agent-form-header">
                          <h4>创建自定义Agent</h4>
                          <button className="agent-form-close" onClick={() => setShowAgentForm(false)}>{ICONS.x}</button>
                        </div>
                        <div className="agent-form-body">
                          <div className="agent-form-avatar-section">
                            <img src={newAgent.avatar || '/ai-elf-avatar.png'} alt="预览" className="agent-form-avatar-preview" />
                            <div className="agent-form-avatar-actions">
                              <input
                                type="file"
                                accept="image/*"
                                id="agent-avatar-upload-new"
                                className="elf-avatar-file-input"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setNewAgent(prev => ({ ...prev, avatar: ev.target.result }));
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <label htmlFor="agent-avatar-upload-new" className="elf-avatar-upload-btn">选择图片</label>
                              {newAgent.avatar && (
                                <button className="elf-avatar-reset-btn" onClick={() => setNewAgent(prev => ({ ...prev, avatar: '' }))}>恢复默认</button>
                              )}
                            </div>
                          </div>
                          <label>名称</label>
                          <input
                            type="text"
                            value={newAgent.name}
                            onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="如：产品经理助手"
                            className="agent-form-input"
                          />
                          <label>分类</label>
                          <select
                            value={newAgent.category}
                            onChange={e => setNewAgent(prev => ({ ...prev, category: e.target.value }))}
                            className="agent-form-select"
                          >
                            {AGENT_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <label>描述</label>
                          <input
                            type="text"
                            value={newAgent.description}
                            onChange={e => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="简短描述这个Agent的用途"
                            className="agent-form-input"
                          />
                          <label>标签（逗号分隔）</label>
                          <input
                            type="text"
                            value={(newAgent.tags || []).join(', ')}
                            onChange={e => setNewAgent(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                            placeholder="如：资讯分析, 结构化思维"
                            className="agent-form-input"
                          />
                          <label>系统提示词</label>
                          <textarea
                            value={newAgent.systemPrompt}
                            onChange={e => setNewAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                            placeholder="定义这个Agent的角色、技能和回答风格..."
                            rows={6}
                            className="agent-form-textarea"
                          />
                          <button
                            className="agent-refine-btn"
                            onClick={async () => {
                              if (!newAgent.systemPrompt.trim() || !llmConfig.baseUrl) return;
                              setAgentPromptRefining(true);
                              try {
                                const res = await fetch('/api/ai-generate', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    baseUrl: llmConfig.baseUrl,
                                    apiKey: llmConfig.apiKey,
                                    model: llmConfig.selectedModel,
                                    action: 'chat',
                                    content: `请帮我优化以下AI Agent的系统提示词，使其更加专业、清晰、有效。保持原意，但让提示词更加精炼有力。直接输出优化后的提示词，不要添加额外说明：

${newAgent.systemPrompt}`
                                  })
                                });
                                const data = await res.json();
                                if (data.content) {
                                  setNewAgent(prev => ({ ...prev, systemPrompt: data.content.trim() }));
                                }
                              } catch (e) {
                                alert('润色失败: ' + e.message);
                              } finally {
                                setAgentPromptRefining(false);
                              }
                            }}
                            disabled={agentPromptRefining || !newAgent.systemPrompt.trim() || !llmConfig.baseUrl}
                          >
                            {agentPromptRefining ? '润色中...' : 'AI润色提示词'}
                          </button>
                        </div>
                        <div className="agent-form-footer">
                          <button className="btn-cancel" onClick={() => setShowAgentForm(false)}>取消</button>
                          <button
                            className="btn-save"
                            onClick={() => {
                              if (!newAgent.name.trim() || !newAgent.systemPrompt.trim()) return;
                              const agent = {
                                id: 'custom-' + Date.now(),
                                name: newAgent.name.trim(),
                                description: newAgent.description.trim() || '自定义Agent',
                                systemPrompt: newAgent.systemPrompt.trim(),
                                category: newAgent.category,
                                tags: newAgent.tags || [],
                                avatar: newAgent.avatar || '',
                                isDefault: false,
                                isCustom: true
                              };
                              setAgents(prev => [...prev, agent]);
                               setNewAgent({ name: '', description: '', systemPrompt: '', category: '分析', tags: [], avatar: '' });
                              setShowAgentForm(false);
                            }}
                            disabled={!newAgent.name.trim() || !newAgent.systemPrompt.trim()}
                          >
                            创建
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent详情编辑 */}
                  {editingAgent && (
                    <div className="agent-form-overlay">
                      <div className="agent-form">
                        <div className="agent-form-header">
                          <h4>Agent详情</h4>
                          <button className="agent-form-close" onClick={() => setEditingAgent(null)}>{ICONS.x}</button>
                        </div>
                        <div className="agent-form-body">
                          <div className="agent-form-avatar-section">
                            <img src={editingAgent.avatar || '/ai-elf-avatar.png'} alt={editingAgent.name} className="agent-form-avatar-preview" />
                            <div className="agent-form-avatar-actions">
                              <input
                                type="file"
                                accept="image/*"
                                id="agent-avatar-upload-edit"
                                className="elf-avatar-file-input"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => setEditingAgent(prev => ({ ...prev, avatar: ev.target.result }));
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <label htmlFor="agent-avatar-upload-edit" className="elf-avatar-upload-btn">选择图片</label>
                              {editingAgent.avatar && (
                                <button className="elf-avatar-reset-btn" onClick={() => setEditingAgent(prev => ({ ...prev, avatar: '' }))}>恢复默认</button>
                              )}
                            </div>
                          </div>
                          <label>ID</label>
                          <input type="text" value={editingAgent.id} disabled className="agent-form-input" />
                          <label>名称</label>
                          <input
                            type="text"
                            value={editingAgent.name}
                            onChange={e => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                            className="agent-form-input"
                          />
                          <label>描述</label>
                          <input
                            type="text"
                            value={editingAgent.description}
                            onChange={e => setEditingAgent(prev => ({ ...prev, description: e.target.value }))}
                            className="agent-form-input"
                          />
                          <label>分类</label>
                          <select
                            value={editingAgent.category}
                            onChange={e => setEditingAgent(prev => ({ ...prev, category: e.target.value }))}
                            className="agent-form-select"
                          >
                            {AGENT_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <label>标签（逗号分隔）</label>
                          <input
                            type="text"
                            value={(editingAgent.tags || []).join(', ')}
                            onChange={e => setEditingAgent(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                            placeholder="如：资讯分析, 结构化思维"
                            className="agent-form-input"
                          />
                          <label>系统提示词</label>
                          <textarea
                            value={editingAgent.systemPrompt}
                            onChange={e => setEditingAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                            rows={6}
                            className="agent-form-textarea"
                          />
                        </div>
                        <div className="agent-form-footer">
                          <button className="btn-cancel" onClick={() => setEditingAgent(null)}>取消</button>
                          <button
                            className="btn-save"
                            onClick={() => {
                              setAgents(prev => prev.map(a => a.id === editingAgent.id ? editingAgent : a));
                              setEditingAgent(null);
                            }}
                          >
                            保存修改
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowSettings(false)}>取消</button><button className="btn-save" onClick={() => { loadNews(); setShowSettings(false); }}>保存并刷新</button></div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>快捷键</h3><button className="modal-close" onClick={() => setShowShortcuts(false)}>{ICONS.x}</button></div>
            <div className="modal-body">
              <div className="shortcuts-list">
                <div className="shortcut-row"><kbd>J</kbd><span>下一条资讯</span></div>
                <div className="shortcut-row"><kbd>K</kbd><span>上一条资讯</span></div>
                <div className="shortcut-row"><kbd>O</kbd><span>打开原文链接</span></div>
                <div className="shortcut-row"><kbd>S</kbd><span>收藏/取消收藏</span></div>
                <div className="shortcut-row"><kbd>1</kbd><span>紧凑视图</span></div>
                <div className="shortcut-row"><kbd>2</kbd><span>标准视图</span></div>
                <div className="shortcut-row"><kbd>3</kbd><span>卡片视图</span></div>
                <div className="shortcut-row"><kbd>?</kbd><span>显示快捷键帮助</span></div>
                <div className="shortcut-row"><kbd>Esc</kbd><span>关闭弹窗</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LLM Quick Config Modal */}
      {showLlmQuickConfig && (
        <div className="modal-overlay" onClick={() => setShowLlmQuickConfig(false)}>
          <div className="modal modal-sm llm-quick-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 大模型快速配置</h3>
              <button className="modal-close" onClick={() => setShowLlmQuickConfig(false)}>{ICONS.x}</button>
            </div>
            <div className="modal-body">
              <div className="llm-preset-bar">
                {LLM_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    className={`llm-preset-btn ${llmConfig.provider === preset.id ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.name}
                  >
                    <span className="preset-icon">{preset.icon}</span>
                    <span className="preset-name">{preset.name}</span>
                  </button>
                ))}
              </div>

              <div className="setting-item">
                <label>API Base URL</label>
                <input
                  type="text"
                  placeholder={llmConfig.provider === 'custom' ? 'https://...' : '已自动填充'}
                  value={llmConfig.baseUrl}
                  onChange={e => setLlmConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  className="llm-input"
                />
              </div>

              <div className="setting-item">
                <label>API Key</label>
                <input
                  type="password"
                  placeholder={LLM_PRESETS.find(p => p.id === llmConfig.provider)?.placeholder || 'sk-...'}
                  value={llmConfig.apiKey}
                  onChange={e => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="llm-input"
                />
              </div>

              <div className="setting-item">
                <label>选择模型</label>
                <select
                  className="llm-model-select"
                  value={llmConfig.selectedModel}
                  onChange={e => setLlmConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
                >
                  <option value="">选择模型</option>
                  {allLlmModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.owned_by ? ` (${m.owned_by})` : ''}</option>
                  ))}
                </select>
              </div>

              {llmTestResult && (
                <div className={`source-verify-result ${llmTestResult.ok ? 'verify-ok' : 'verify-fail'}`}>
                  {llmTestResult.ok ? (
                    <>{ICONS.check} 连接成功 ({llmTestResult.model}): {llmTestResult.reply}</>
                  ) : (
                    <>连接失败：{llmTestResult.message}</>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowLlmQuickConfig(false)}>取消</button>
              <button className="btn-test" onClick={handleQuickTest} disabled={llmTesting || !llmConfig.baseUrl || !llmConfig.selectedModel}>
                {llmTesting ? '测试中...' : '测试连接'}
              </button>
              <button className="btn-save" onClick={handleQuickSave} disabled={!llmConfig.baseUrl || !llmConfig.selectedModel}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Back to Top */}
      <button className={`back-to-top ${showBackToTop ? 'visible' : ''}`} onClick={scrollToTop} title="回到顶部">
        {ICONS.chevronLeft ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg> : ICONS.chevronUp}
      </button>

      {/* AI精灵助手 */}
      <AiElf 
        llmConfig={llmConfig} 
        avatarImage={elfAvatar} 
        elfName={elfName} 
        agents={agents}
        currentAgent={currentAgent}
        onChangeAgent={setCurrentAgent}
        onExportToMaterials={(data) => {
        const { title, content } = data;
        addManualMaterial({
          title: title.slice(0, 100),
          content: content.slice(0, 5000),
          type: 'analysis',
          source: 'AI精灵',
          url: '',
          tags: 'AI分析,AI精灵',
          note: '',
          spaceId: null
        });
      }} />

      {/* 登录/注册弹窗 */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{authMode === 'login' ? '登录' : '注册'}</h3>
              <button className="modal-close" onClick={() => setShowAuthModal(false)}>{ICONS.x}</button>
            </div>
            <div className="modal-body auth-modal-body">
              <div className="auth-tabs">
                <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setAuthError(''); }}>登录</button>
                <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => { setAuthMode('register'); setAuthError(''); }}>注册</button>
              </div>
              {authError && <div className="auth-error">{authError}</div>}
              <div className="auth-form">
                <div className="auth-field">
                  <label>用户名</label>
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="请输入用户名"
                  />
                </div>
                {authMode === 'register' && (
                  <div className="auth-field">
                    <label>邮箱</label>
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="请输入邮箱（选填）"
                    />
                  </div>
                )}
                <div className="auth-field">
                  <label>密码</label>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="请输入密码"
                  />
                </div>
                {authMode === 'register' && (
                  <div className="auth-field">
                    <label>确认密码</label>
                    <input
                      type="password"
                      value={authForm.confirmPassword}
                      onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="请再次输入密码"
                    />
                  </div>
                )}
                <button
                  className="auth-submit-btn"
                  onClick={authMode === 'login' ? handleLogin : handleRegister}
                  disabled={authLoading}
                >
                  {authLoading ? '处理中...' : (authMode === 'login' ? '登录' : '注册')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 个人资料弹窗 */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>个人资料</h3>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>{ICONS.x}</button>
            </div>
            <div className="modal-body auth-modal-body">
              <div className="profile-avatar-section">
                <div className="profile-avatar-preview">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" />
                  ) : (
                    <div className="profile-avatar-default">{(user?.displayName || user?.username)?.[0]?.toUpperCase() || 'U'}</div>
                  )}
                </div>
                <label className="profile-avatar-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target.result;
                        setUser(prev => ({ ...prev, avatar: base64 }));
                        updateUserProfile({ avatar: base64 });
                        showToast('头像已更新');
                      };
                      reader.readAsDataURL(file);
                    }}
                    style={{ display: 'none' }}
                  />
                  更换头像
                </label>
              </div>
              <div className="auth-form">
                <div className="auth-field">
                  <label>显示名称</label>
                  <input
                    type="text"
                    value={profileForm.displayName}
                    onChange={e => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder={user?.displayName || user?.username || '显示名称'}
                  />
                </div>
                <div className="auth-field">
                  <label>个性签名</label>
                  <input
                    type="text"
                    value={profileForm.signature}
                    onChange={e => setProfileForm(prev => ({ ...prev, signature: e.target.value }))}
                    placeholder="写点啥..."
                  />
                </div>
                <div className="profile-interest-section">
                  <label className="profile-interest-label">兴趣领域</label>
                  <div className="profile-interest-tags">
                    {selectedInterests.length === 0 && <span className="profile-interest-empty">暂无</span>}
                    {selectedInterests.map(id => {
                      const cat = CATEGORIES.find(c => c.id === id);
                      return cat ? (
                        <span key={id} className="profile-interest-tag">
                          {ICONS[cat.icon]} {cat.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <button className="profile-interest-edit" onClick={() => { setShowProfileModal(false); setShowInterestModal(true); }}>
                    {ICONS.edit} 编辑兴趣
                  </button>
                </div>
                <div className="profile-actions">
                  <button
                    className="auth-submit-btn"
                    onClick={() => {
                      const newDisplayName = profileForm.displayName.trim();
                      const newSignature = profileForm.signature.trim();
                      setUser(prev => ({ ...prev, displayName: newDisplayName, signature: newSignature }));
                      updateUserProfile({ displayName: newDisplayName, signature: newSignature });
                      setShowProfileModal(false);
                      setProfileForm({ displayName: '', signature: '' });
                      showToast('资料已更新');
                    }}
                  >
                    保存
                  </button>
                  <button className="profile-logout-btn" onClick={() => { setShowProfileModal(false); handleLogout(); }}>
                    {ICONS.power} 退出登录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 兴趣选择弹窗 */}
      {showInterestModal && (
        <div className="modal-overlay" onClick={() => setShowInterestModal(false)}>
          <div className="modal modal-lg interest-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择感兴趣的领域</h3>
              <button className="modal-close" onClick={() => setShowInterestModal(false)}>{ICONS.x}</button>
            </div>
            <div className="modal-body interest-modal-body">
              <p className="interest-desc">选择你感兴趣的领域，我们将为你精准推送相关内容</p>
              <div className="interest-groups">
                {CATEGORY_GROUPS.map(group => (
                  <div key={group.id} className="interest-group">
                    <div className="interest-group-title">
                      <span className="interest-group-icon">{ICONS[group.icon]}</span>
                      <span>{group.label}</span>
                    </div>
                    <div className="interest-group-items">
                      {group.categories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        if (!cat) return null;
                        const isSelected = selectedInterests.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            className={`interest-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedInterests(prev => {
                                if (isSelected) {
                                  return prev.filter(id => id !== cat.id);
                                }
                                return [...prev, cat.id];
                              });
                            }}
                          >
                            <span className="interest-item-icon">{ICONS[cat.icon]}</span>
                            <span className="interest-item-label">{cat.label}</span>
                            {isSelected && <span className="interest-item-check">{ICONS.check}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer interest-modal-footer">
              <span className="interest-count">已选择 {selectedInterests.length} 个领域</span>
              <div className="interest-actions">
                <button className="btn-cancel" onClick={() => setShowInterestModal(false)}>取消</button>
                <button className="btn-save" onClick={() => { updateUserInterests(selectedInterests); setShowInterestModal(false); showToast('兴趣领域已保存'); }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全球科技大屏全屏 */}
      {globeFullscreenOpen && (
        <GlobeView items={items} externalFullscreen={globeFullscreenOpen} onFullscreenChange={setGlobeFullscreenOpen} />
      )}
    </div>
  );

  function addCustomSource() {
    if (!newSource.name || !newSource.url) return;
    setCustomSources(prev => [...prev, { ...newSource, id: Date.now() }]);
    setNewSource({ name: '', url: '', region: 'overseas' });
    setSourceVerifyResult(null);
  }

  function removeCustomSource(id) {
    setCustomSources(prev => prev.filter(s => s.id !== id));
  }

  function verifySource() {
    if (!newSource.url) return;
    setSourceVerifying(true);
    setSourceVerifyResult(null);
    fetch(`/api/verify-source?url=${encodeURIComponent(newSource.url)}`).then(r => r.json()).then(d => {
      setSourceVerifyResult(d);
      if (d.ok && !newSource.name && d.title) {
        setNewSource(prev => ({ ...prev, name: d.title }));
      }
    }).catch(() => {
      setSourceVerifyResult({ ok: false, message: 'Network error' });
    }).finally(() => setSourceVerifying(false));
  }

  function verifyAllSources() {
    if (!allSources || !allSources.length) {
      console.log('verifyAllSources: No sources to verify', allSources);
      return;
    }
    
    console.log('verifyAllSources: Starting verification for', allSources.length, 'sources');
    setVerifyingAllSources(true);
    setAllSourcesVerifyResults(null);
    
    const results = [];
    let completed = 0;
    
    allSources.forEach(source => {
      if (!source.url) {
        console.warn('Source without URL:', source.name);
        return;
      }
      
      console.log('Verifying:', source.name, source.url);
      
      fetch(`/api/verify-source?url=${encodeURIComponent(source.url)}`)
        .then(r => r.json())
        .then(d => {
          console.log('Verification result for', source.name, ':', d);
          results.push({ name: source.name, ...d });
        })
        .catch(e => {
          console.error('Verification failed for', source.name, ':', e);
          results.push({ name: source.name, ok: false, message: 'Network error' });
        })
        .finally(() => {
          completed++;
          console.log('Verification progress:', completed, '/', allSources.length);
          if (completed === allSources.length) {
            console.log('Verification complete, results:', results);
            setAllSourcesVerifyResults(results);
            setVerifyingAllSources(false);
          }
        });
    });
  }

  // 辅助函数：截断 URL
  function truncateUrl(url, maxLength) {
    if (!url) return '';
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  }

  // 辅助函数：截断文本
  function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  // 辅助函数：获取健康度指示器
  function getSourceHealthIndicator(sourceId, type) {
    const health = sourceHealth[sourceId];
    if (!health) {
      return <span className="health-indicator health-unknown" title="未验证">?</span>;
    }
    
    if (health.status === 'healthy') {
      return <span className="health-indicator health-good" title="健康">✓</span>;
    } else if (health.status === 'warning') {
      return <span className="health-indicator health-warning" title="警告">!</span>;
    } else if (health.status === 'error') {
      return <span className="health-indicator health-bad" title="错误">✗</span>;
    }
    return <span className="health-indicator health-unknown" title="未验证">?</span>;
  }

  // 验证单个源
  function verifySingleSource(source, isBuiltin = false) {
    if (!source || !source.url) {
      console.warn('verifySingleSource: Invalid source', source);
      return;
    }
    
    const url = source.url;
    const sourceKey = isBuiltin ? source.name : source.id;
    const startTime = Date.now();
    setSourceVerifying(true);
    
    console.log('verifySingleSource: Verifying', source.name || sourceKey, url);
    
    fetch(`/api/verify-source?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        const responseTime = Date.now() - startTime;
        console.log('verifySingleSource: Result for', source.name || sourceKey, ':', d);
        
        const previousHealth = sourceHealth[sourceKey];
        const failCount = d.ok ? 0 : (previousHealth?.failCount || 0) + 1;
        
        // 健康状态判断逻辑
        let status = 'healthy';
        if (!d.ok) {
          status = 'error';
        } else if (responseTime > 3000) {
          // 响应时间超过3秒视为警告
          status = 'warning';
        } else if (failCount >= 2) {
          // 即使验证成功，但之前有失败记录也标记为警告
          status = 'warning';
        }
        
        setSourceHealth(prev => ({
          ...prev,
          [sourceKey]: {
            status,
            lastCheck: Date.now(),
            responseTime,
            failCount,
            itemCount: d.itemCount || 0
          }
        }));
      })
      .catch(e => {
        console.error('verifySingleSource: Error for', source.name || sourceKey, ':', e);
        setSourceHealth(prev => ({
          ...prev,
          [sourceKey]: {
            status: 'error',
            lastCheck: Date.now(),
            responseTime: 0,
            failCount: (prev[sourceKey]?.failCount || 0) + 1,
            itemCount: 0
          }
        }));
      })
      .finally(() => {
        setSourceVerifying(false);
      });
  }

  // 导出配置
  function exportSources() {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      customSources: customSources,
      sourceHealth: sourceHealth,
      disabledSources: disabledSources
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sources-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 导入配置
  function importSources(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        
        if (config.version && config.customSources) {
          const confirmed = confirm(
            `即将导入 ${config.customSources.length} 个自定义源。\n\n` +
            `注意：这将覆盖现有的自定义源配置。\n\n` +
            `是否继续？`
          );
          
          if (confirmed) {
            setCustomSources(config.customSources);
            if (config.sourceHealth) {
              setSourceHealth(config.sourceHealth);
            }
            if (config.disabledSources) {
              setDisabledSources(config.disabledSources);
            }
            alert('导入成功！');
          }
        } else {
          alert('配置文件格式错误！');
        }
      } catch (error) {
        alert('导入失败：文件解析错误');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置文件输入
  }

  // 自动监控相关函数
  useEffect(() => {
    if (!autoMonitorEnabled) return;
    
    const interval = setInterval(() => {
      // 自动验证所有启用的源
      const allEnabledSources = [...(customSources || []).filter(s => !disabledSources.includes(s.name)), ...(allSources || []).filter(s => !disabledSources.includes(s.name))];
      
      // 只验证有健康记录的源，避免首次验证所有源
      const sourcesToMonitor = allEnabledSources.filter(source => {
        const key = source.id || source.name;
        return sourceHealth[key] && sourceHealth[key].lastCheck;
      });
      
      if (sourcesToMonitor.length > 0) {
        sourcesToMonitor.forEach(source => {
          verifySingleSource(source, !source.id);
        });
      }
    }, monitorInterval * 60 * 1000); // 分钟转换为毫秒
    
    return () => clearInterval(interval);
  }, [autoMonitorEnabled, monitorInterval, customSources, allSources, disabledSources, sourceHealth]);

  // 检查健康状态并发送警告
  useEffect(() => {
    const newAlerts = [];
    
    // 检查自定义源
    customSources.forEach(source => {
      const health = sourceHealth[source.id];
      if (health && health.failCount >= 3) {
        newAlerts.push({
          id: source.id,
          name: source.name,
          type: 'error',
          message: `${source.name} 连续失败 ${health.failCount} 次`,
          timestamp: health.lastCheck
        });
      } else if (health && health.status === 'warning') {
        newAlerts.push({
          id: source.id,
          name: source.name,
          type: 'warning',
          message: `${source.name} 响应较慢：${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      }
    });
    
    // 检查内置源
    allSources.forEach(source => {
      const health = sourceHealth[source.name];
      if (health && health.failCount >= 3) {
        newAlerts.push({
          id: source.name,
          name: source.name,
          type: 'error',
          message: `${source.name} 连续失败 ${health.failCount} 次`,
          timestamp: health.lastCheck
        });
      } else if (health && health.status === 'warning') {
        newAlerts.push({
          id: source.name,
          name: source.name,
          type: 'warning',
          message: `${source.name} 响应较慢：${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      }
    });
    
    // 只显示最近10条警告
    setMonitorAlerts(newAlerts.slice(-10));
  }, [sourceHealth, customSources, allSources]);

  // 保存监控设置
  useEffect(() => {
    saveLS('autoMonitorEnabled', autoMonitorEnabled);
  }, [autoMonitorEnabled]);

  useEffect(() => {
    saveLS('monitorInterval', monitorInterval);
  }, [monitorInterval]);

  // 清除警告
  function clearAlerts() {
    setMonitorAlerts([]);
  }

  function fetchLlmModels() {
    if (!llmConfig.baseUrl) return;
    setLlmFetching(true);
    setLlmFetchError('');
    const params = new URLSearchParams({ baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey });
    fetch(`/api/llm-models?${params}`).then(r => r.json()).then(d => {
      if (d.ok) {
        setLlmModels(d.models || []);
      } else {
        setLlmFetchError(d.message || 'Failed to fetch models');
        setLlmModels([]);
      }
    }).catch(() => {
      setLlmFetchError('Network error');
      setLlmModels([]);
    }).finally(() => setLlmFetching(false));
  }

  async function fetchCustomUrl(url, mode = 'basic') {
    if (!url.trim()) {
      setCustomUrlError('请输入 URL');
      return;
    }

    setCustomUrlLoading(true);
    setCustomUrlError('');
    setCustomUrlResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          mode: mode,
          timeout: 30
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '抓取失败');
      }

      setCustomUrlResult(data);
    } catch (error) {
      setCustomUrlError(error.message || '抓取失败，请稍后重试');
    } finally {
      setCustomUrlLoading(false);
    }
  }

  function addManualModel() {
    if (!llmManualInput.trim()) return;
    setLlmConfig(prev => ({
      ...prev,
      manualModels: [...(prev.manualModels || []), { id: llmManualInput.trim(), name: llmManualInput.trim() }],
      selectedModel: prev.selectedModel || llmManualInput.trim()
    }));
    setLlmManualInput('');
  }

  function removeManualModel(modelId) {
    setLlmConfig(prev => ({
      ...prev,
      manualModels: (prev.manualModels || []).filter(m => m.id !== modelId),
      selectedModel: prev.selectedModel === modelId ? '' : prev.selectedModel
    }));
  }

  function testLlmConnection() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    setLlmTesting(true);
    setLlmTestResult(null);
    fetch('/api/llm-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.selectedModel })
    }).then(r => r.json()).then(d => {
      setLlmTestResult(d);
    }).catch(() => {
      setLlmTestResult({ ok: false, message: 'Network error' });
    }).finally(() => setLlmTesting(false));
  }

  function handleSelectPreset(preset) {
    setLlmConfig(prev => ({
      ...prev,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      apiKey: ''
    }));
    setLlmModels(preset.models.map(m => ({ id: m, name: m, owned_by: preset.name })));
  }

  function handleQuickSave() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    setShowLlmQuickConfig(false);
    setAiInsights({ loading: false, data: null, error: '' });
  }

  function handleQuickTest() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    testLlmConnection();
  }

  }

function SkeletonCard({ viewMode = 'standard' }) {
  const isCompact = viewMode === 'compact';
  return (
    <article className={`news-item skeleton view-${viewMode}`}>
      <div className="item-left">
        {!isCompact && <div className="skeleton-tags"><span className="skeleton-tag" /><span className="skeleton-tag" /></div>}
        <div className="skeleton-time" />
      </div>
      <div className="item-main">
        <div className="skeleton-title" />
        {!isCompact && <div className="skeleton-summary"><span /><span style={{ width: '70%' }} /></div>}
        {!isCompact && <div className="skeleton-meta"><span className="skeleton-source" /><span className="skeleton-link" /></div>}
      </div>
    </article>
  );
}

function NewsItem({ item, index, viewMode = 'standard', isFocused = false, isBookmarked = false, isInMaterials = false, onBookmark, onSummary, isSummaryOpen, summaryText, isFollowed = false, onRead, showTranslation, onToggleTranslation, onRequestTranslation, isTranslating, translation, onOpenLightbox, onAddMaterial }) {
  const isCompact = viewMode === 'compact';
  const isCard = viewMode === 'card';
  const hasMedia = item.imageUrl || item.videoUrl;

  const isEnglish = /^[a-zA-Z0-9\s\-.,!?"'():;&%$#@*+\[\]{}|\\\/<>`~+=]+$/.test(item.title) && !/^[\u4e00-\u9fff]/.test(item.title);

  // 拖拽开始
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 源等级标识
  const renderSourceGrade = () => {
    if (!item.sourceGrade || !item.sourceGradeLabel) return null;

    const gradeMap = {
      1: 'S',
      2: 'A',
      3: 'B',
      4: 'C',
      5: 'D'
    };

    const grade = gradeMap[item.sourceGrade] || item.sourceGrade?.toString().toUpperCase() || 'N/A';

    return (
      <span
        className="source-grade-badge"
        style={{
          color: '#fff',
          fontSize: '10px',
          marginLeft: '8px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px'
        }}
        title={item.sourceGradeLabel}
      >
        <span
          className="news-item-source-grade"
          data-grade={grade}
        >
          {grade}
        </span>
      </span>
    );
  };

  return (
    <article
      className={`news-item view-${viewMode} ${isFocused ? 'focused' : ''} ${isFollowed ? 'followed' : ''}`}
      style={{ animationDelay: `${index * 40}ms` }}
      data-index={index}
      draggable
      onDragStart={handleDragStart}
    >
      {isFollowed && <div className="follow-badge">关注</div>}
      <div className="item-left">
        {!isCompact && <div className="item-tags">
          <span className={`item-mode mode-${item.mode}`}>{MODE_MAP[item.mode]}</span>
          <span className={`item-region region-${item.region}`}>{REGION_MAP[item.region]}</span>
        </div>}
        <div className="item-time">{formatRelative(item.publishedAt)}</div>
        <div className="item-actions-left">
          {onBookmark && <button className={`bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>}
          {onAddMaterial && <button className={`add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={() => onAddMaterial(item)} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
          {onSummary && <button className="summary-btn" onClick={onSummary} title="AI 摘要">{ICONS.sparkle}</button>}
          {isEnglish && onToggleTranslation && <button className={`translate-btn ${showTranslation ? 'active' : ''} ${isTranslating ? 'translating' : ''}`} onClick={() => { console.log('[NewsItem] Translate button clicked:', { isTranslating, translation, onRequestTranslation: !!onRequestTranslation }); if (isTranslating) return; if (!translation && onRequestTranslation) { onRequestTranslation().then(result => { console.log('[NewsItem] Translation result:', result); if (result) onToggleTranslation(); }); } else { onToggleTranslation(); } }} title="中英对照" disabled={isTranslating}>{isTranslating ? ICONS.spinner : ICONS.globe}</button>}
        </div>
      </div>
      <div className="item-main">
        <div className="item-content-row">
          <div className="item-text">
            <h2 className="item-title"><span className="item-rank">{index + 1}.</span> {item.title}</h2>
            {showTranslation && translation && <p className="item-translation">{translation.title}</p>}
            {!isCompact && <p className="item-summary">{item.summary}</p>}
            {!isCompact && item.bodyIntro && <p className="item-intro">导读：{item.bodyIntro}</p>}
            {showTranslation && translation && !isCompact && translation.summary && <p className="item-translation">{translation.summary}</p>}
          </div>
          {hasMedia && !isCompact && (
            <div className="item-media">
              {item.imageUrl && (
                <div className="item-media-thumb" onClick={() => onOpenLightbox?.(item.imageUrl, item.title)}>
                  <img src={item.imageUrl} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                  {item.videoUrl && <span className="item-media-play">{ICONS.eye}</span>}
                </div>
              )}
              {!item.imageUrl && item.videoUrl && (
                <a href={item.videoUrl} target="_blank" rel="noreferrer" className="item-media-video-link">
                  {ICONS.eye}<span>视频</span>
                </a>
              )}
            </div>
          )}
        </div>
        {isSummaryOpen && summaryText && (
          <div className="ai-summary">
            <div className="ai-summary-header">{ICONS.sparkle}<span>AI 摘要</span></div>
            <div className="ai-summary-content">{summaryText.split(' | ').map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        )}
        {!isCompact && <div className="item-meta">
          <div className="item-tags-row">{item.tags?.slice(0, 4).map(t => <span key={t} className="item-tag">{t}</span>)}</div>
          <div className="item-footer">
            <div className="item-source-container">
              <span className="item-source">{item.source}{item.platform ? ` · ${item.platform}` : ''}</span>
              {renderSourceGrade()}
            </div>
            <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>阅读原文 {ICONS.arrowRight}</a>
          </div>
        </div>}
        {isCompact && <div className="item-footer compact-footer">
          <div className="item-source-container">
            <span className="item-source">{item.source}</span>
            {renderSourceGrade()}
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>{ICONS.arrowRight}</a>
        </div>}
      </div>
    </article>
  );
}

function HexRadarChart({ categories, regions, matrix, maxVal }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const levels = 4;
  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const regionColors = { domestic: '#3b82f6', overseas: '#22d3ee', global: '#a78bfa' };
  const regionGlows = { domestic: 'rgba(59,130,246,0.6)', overseas: 'rgba(34,211,238,0.6)', global: 'rgba(167,139,250,0.6)' };
  const regionFills = { domestic: 'rgba(59,130,246,0.30)', overseas: 'rgba(34,211,238,0.30)', global: 'rgba(167,139,250,0.30)' };

  const getPoint = (idx, value) => {
    const ratio = maxVal > 0 ? value / maxVal : 0;
    const angle = startAngle + idx * angleStep;
    const px = cx + r * ratio * Math.cos(angle);
    const py = cy + r * ratio * Math.sin(angle);
    return { px, py };
  };

  const hexPoints = (level) => {
    const lr = r * (level / levels);
    return Array.from({ length: n }, (_, i) => {
      const angle = startAngle + i * angleStep;
      return `${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`;
    }).join(' ');
  };

  const regionPath = (region) => {
    const values = categories.map(c => matrix[region]?.[c.id] || 0);
    return values.map((v, i) => {
      const p = getPoint(i, v);
      return `${p.px},${p.py}`;
    }).join(' ');
  };

  return (
    <div className="hex-radar-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="hex-radar-svg">
        <defs>
          {regions.map(region => (
            <filter key={`glow-${region}`} id={`glow-${region}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          ))}
        </defs>
        {Array.from({ length: levels }, (_, l) => (
          <polygon key={`grid-${l}`} points={hexPoints(l + 1)} fill={l === levels ? 'var(--bg-hover)' : 'none'} stroke="var(--border-active)" strokeWidth="1" opacity={l === levels ? 0.4 : 0.25} />
        ))}
        {categories.map((cat, i) => {
          const angle = startAngle + i * angleStep;
          const ex = cx + (r + 22) * Math.cos(angle);
          const ey = cy + (r + 22) * Math.sin(angle);
          const ax = cx + r * Math.cos(angle);
          const ay = cy + r * Math.sin(angle);
          return (
            <g key={`axis-${cat.id}`}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--border-active)" strokeWidth="1" opacity="0.35" />
              <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="var(--text-secondary)" fontWeight="600">{cat.label.length > 4 ? cat.label.slice(0, 4) : cat.label}</text>
            </g>
          );
        })}
        {regions.map(region => (
          <polygon key={region} points={regionPath(region)} fill={regionFills[region]} stroke={regionColors[region]} strokeWidth="2" strokeLinejoin="round" filter={`url(#glow-${region})`} />
        ))}
        {regions.map(region => categories.map((cat, i) => {
          const v = matrix[region]?.[cat.id] || 0;
          if (!v) return null;
          const p = getPoint(i, v);
          return <circle key={`dot-${region}-${cat.id}`} cx={p.px} cy={p.py} r="3.5" fill={regionColors[region]} stroke="white" strokeWidth="1.5" />;
        }))}
        {regions.map(region => categories.map((cat, i) => {
          const v = matrix[region]?.[cat.id] || 0;
          if (!v) return null;
          const p = getPoint(i, v);
          const angle = startAngle + i * angleStep;
          const lx = p.px + 10 * Math.cos(angle);
          const ly = p.py + 10 * Math.sin(angle);
          return <text key={`val-${region}-${cat.id}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="7" fill={regionColors[region]} fontWeight="600">{v}</text>;
        }))}
      </svg>
      <div className="hex-radar-legend">
        {regions.map(r => <span key={r} className="hex-legend-item"><span className="hex-legend-dot" style={{ background: regionColors[r], boxShadow: `0 0 6px ${regionGlows[r]}` }} />{REGION_MAP[r]}</span>)}
      </div>
    </div>
  );
}

function TrendLineChart({ labels = [], series = [] }) {
  const width = 760;
  const height = 220;
  const pad = 28;
  const maxValue = Math.max(1, ...series.flatMap(s => s.values || [0]));
  const colors = ['#22d3ee', '#3b82f6', '#a78bfa', '#34d399', '#fbbf24'];
  const [hover, setHover] = useState(null);

  const pointsFor = (values) => values.map((v, idx) => {
    const x = pad + (idx * (width - pad * 2)) / Math.max(1, (values.length - 1));
    const y = height - pad - (v / maxValue) * (height - pad * 2);
    return { x, y, v };
  });

  const wavePathFor = (values) => {
    const points = pointsFor(values);
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const areaPathFor = (values) => {
    const points = pointsFor(values);
    if (points.length < 2) return '';
    const wave = wavePathFor(values);
    const tail = ` L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;
    return wave + tail;
  };

  return (
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img" aria-label="trend-line-chart">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border-color)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--border-color)" />
        {[0, 1, 2, 3, 4].map(i => {
          const y = pad + ((height - pad * 2) * i) / 4;
          const val = Math.round(maxValue * (1 - i / 4));
          return (
            <g key={`tick-${i}`}>
              <line x1={pad} y1={y} x2={width - pad} y2={y} stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
              <text x={pad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{val}</text>
            </g>
          );
        })}
        {series.map((s, idx) => (
          <g key={s.name}>
            <path d={areaPathFor(s.values || [])} fill={colors[idx % colors.length]} opacity="0.12" />
            <path d={wavePathFor(s.values || [])} fill="none" stroke={colors[idx % colors.length]} strokeWidth="2.5" strokeLinecap="round" />
            {(s.values || []).map((v, i) => {
              const x = pad + (i * (width - pad * 2)) / Math.max(1, (s.values.length - 1));
              const y = height - pad - (v / maxValue) * (height - pad * 2);
              return (
                <circle
                  key={`${s.name}-${i}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={colors[idx % colors.length]}
                  onMouseEnter={() => setHover({ x, y, label: labels[i], series: s.name, value: v })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>
        ))}
        {hover && (
          <g>
            <rect x={hover.x + 8} y={hover.y - 34} width="120" height="30" rx="6" fill="#0b1220" stroke="rgba(255,255,255,0.15)" />
            <text x={hover.x + 14} y={hover.y - 20} fontSize="10" fill="#cbd5e1">{hover.series} · {hover.label}</text>
            <text x={hover.x + 14} y={hover.y - 9} fontSize="11" fill="#22d3ee">{hover.value}</text>
          </g>
        )}
      </svg>
      <div className="line-chart-legend">
        {series.map((s, idx) => <span key={s.name} className="line-legend-item"><i style={{ background: colors[idx % colors.length] }} />{s.name}</span>)}
      </div>
      <div className="line-chart-labels">{labels.map(label => <span key={label}>{label}</span>)}</div>
    </div>
  );
}

function GithubRepoCard({ repo, index, since = 'weekly', isBookmarked = false, isInMaterials = false, onBookmark, onAddMaterial, showTranslation, onToggleTranslation, translation, onOpenLightbox }) {
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const tutorialLines = repo.tutorial ? repo.tutorial.split('\n') : [];
  const hasLongTutorial = tutorialLines.length > 4;
  const isEnglish = /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.fullName) || /^[a-zA-Z0-9\s\-.,!?':\(\)\[\]{}]+$/.test(repo.description);

  // 拖拽开始 - 生成兼容 AI Elf 的数据格式
  const handleDragStart = (e) => {
    const dragItem = {
      id: repo.id || repo.url,
      title: repo.fullName,
      url: repo.url,
      summary: repo.description,
      source: 'GitHub',
      tags: [repo.language].filter(Boolean),
      region: 'global',
      mode: 'deep',
      publishedAt: new Date().toISOString(),
      category: 'open-source'
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <article className="github-card" style={{ animationDelay: `${index * 60}ms` }} draggable onDragStart={handleDragStart}>
      <div className="gh-card-header">
        <span className="gh-rank">#{index + 1}</span>
        <div className="gh-card-title-row">
          <a href={repo.url} target="_blank" rel="noreferrer" className="gh-full-name">{repo.fullName}</a>
          {repo.language && <span className="gh-lang"><span className="gh-lang-dot" />{repo.language}</span>}
        </div>
      </div>
      {repo.imageUrl && (
        <div className="gh-card-image" onClick={() => onOpenLightbox?.(repo.imageUrl, repo.fullName)}>
          <img src={repo.imageUrl} alt={repo.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <p className="gh-desc">{repo.description}</p>
      {showTranslation && translation && <p className="gh-translation">{translation.title}{translation.summary ? ` - ${translation.summary}` : ''}</p>}
      {repo.tutorial && <div className="gh-tutorial">
        <span className="gh-tutorial-label">使用教程</span>
        <pre className={`gh-tutorial-text ${tutorialExpanded ? 'expanded' : ''}`}>{tutorialExpanded ? repo.tutorial : tutorialLines.slice(0, 4).join('\n')}</pre>
        {hasLongTutorial && <button className="gh-tutorial-toggle" onClick={() => setTutorialExpanded(v => !v)}>{tutorialExpanded ? '收起' : '展开全文'}</button>}
      </div>}
      {repo.topics?.length > 0 && <div className="gh-topics">{repo.topics.slice(0, 4).map(t => <span key={t} className="gh-topic">{t}</span>)}</div>}
      <div className="gh-card-stats">
        <span className="gh-stat">{ICONS.star}<span className="gh-stat-val">{formatStars(repo.totalStars)}</span><span className="gh-stat-label">stars</span></span>
        <span className="gh-stat">{ICONS.fork}<span className="gh-stat-val">{formatStars(repo.forks)}</span><span className="gh-stat-label">forks</span></span>
      </div>
      <div className="gh-card-actions">
        <button className={`gh-bookmark-btn ${isBookmarked ? 'active' : ''}`} onClick={onBookmark} title={isBookmarked ? '取消收藏' : '收藏'}>{isBookmarked ? ICONS.bookmarkFill : ICONS.bookmark}</button>
        {onAddMaterial && <button className={`gh-add-material-btn ${isInMaterials ? 'active' : ''}`} onClick={onAddMaterial} title={isInMaterials ? '已在素材库' : '收藏为素材'}>{ICONS.layers}</button>}
        {isEnglish && onToggleTranslation && <button className={`gh-translate-btn ${showTranslation ? 'active' : ''}`} onClick={onToggleTranslation} title="中英对照">{ICONS.globe}</button>}
      </div>
    </article>
  );
}

function formatTime(v) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v));
}

function formatRelative(v) {
  const diff = Date.now() - new Date(v).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return formatTime(v);
}

function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default App;
