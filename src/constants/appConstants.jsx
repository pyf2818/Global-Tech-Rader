// 顶层常量集合：从 App.jsx 抽离，集中管理
// 包含产品信息、导航、分类、频道、LLM 预设、模式、GitHub、地区、素材类型、文章模板、ICONS 等
// 注意：此文件中的常量为 i18n 版本（labelKey），与 constants/index.jsx 中的旧版（label）并存
import React from 'react';

export const PRODUCT_NAME = '万般硅川';
export const PRODUCT_TAGLINE = '高质量多领域智能资讯生态';
export const PRODUCT_DESCRIPTION = '面向 AI 时代的个人情报、开源发现、智能体创作与知识资产平台。';

export const MOTIVATIONAL_QUOTES = [
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

// NAV_ITEMS / PRIMARY_NAV_ITEMS / NAV_CONTEXT_SECTIONS 的 label/desc/short 字段
// 存储的是 i18n key（如 'nav.aiWorkstation'），运行时通过 t() 翻译
export const NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.aiWorkstation', icon: 'sparkle' },
  { id: 'recommendations', labelKey: 'nav.recommendations', icon: 'calendar' },
  { id: 'all', labelKey: 'nav.allNews', icon: 'grid' },
  { id: 'stock', labelKey: 'nav.stock', icon: 'trendingUp' },

  { id: 'github', labelKey: 'nav.github', icon: 'github' },
  { id: 'materials', labelKey: 'nav.materials', icon: 'layers' },
  { id: 'studio', labelKey: 'nav.studio', icon: 'edit' },
  { id: 'agents', labelKey: 'nav.agents', icon: 'bot' },
  { id: 'editor', labelKey: 'nav.editor', icon: 'edit' },
  { id: 'square', labelKey: 'nav.square', icon: 'user' },
  { id: 'profile-center', labelKey: 'nav.profileCenter', icon: 'target' },
];

export const PRIMARY_NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.aiWorkstation', descKey: 'nav.today', shortKey: 'nav.aiWorkstation', icon: 'cpu', nav: 'home', children: ['home'] },
  { id: 'recommendations', labelKey: 'nav.recommendations', descKey: 'nav.calendarTimeline', shortKey: 'nav.recommendations', icon: 'calendar', nav: 'recommendations', children: ['recommendations'] },
  { id: 'all', labelKey: 'nav.allNews', descKey: 'nav.expandVision', shortKey: 'nav.allNews', icon: 'grid', nav: 'all', children: ['all'] },
  { id: 'stock', labelKey: 'nav.stock', descKey: 'nav.marketAnalysis', shortKey: 'nav.stock', icon: 'trendingUp', nav: 'stock', children: [] },
  { id: 'github', labelKey: 'nav.github', descKey: 'nav.githubProjects', shortKey: 'nav.github', icon: 'github', nav: 'github', children: ['github'] },
  { id: 'studio', labelKey: 'nav.studio', descKey: 'nav.materialsAgentsCreation', shortKey: 'nav.studio', icon: 'edit', nav: 'studio', children: ['materials', 'agents', 'editor'] },
  { id: 'square', labelKey: 'nav.square', descKey: 'nav.shareCommunity', shortKey: 'nav.square', icon: 'user', nav: 'square', children: ['square'] },
  { id: 'profile-center', labelKey: 'nav.profileCenter', descKey: 'nav.profileLearning', shortKey: 'nav.profileCenter', icon: 'target', nav: 'profile-center', children: ['profile-center'] }
];

export const NAV_CONTEXT_SECTIONS = {
  home: {
    labelKey: 'context.aiWorkstation',
    items: ['home']
  },
  recommendations: {
    labelKey: 'context.recommendations',
    items: ['recommendations']
  },
  all: {
    labelKey: 'context.multiDomainNews',
    items: ['all']
  },
  github: {
    labelKey: 'context.openSourceDiscovery',
    items: ['github']
  },
  stock: {
    labelKey: 'context.marketAnalysis',
    items: []
  },
  studio: {
    labelKey: 'context.creativeCenter',
    items: ['materials', 'agents', 'editor']
  },
  square: {
    labelKey: 'context.communitySquare',
    items: ['square']
  },
  'profile-center': {
    labelKey: 'context.userProfile',
    items: ['profile-center']
  },
};


// NOTE: DEFAULT_AGENT_WORKFLOW / WORKFLOW_NODE_TYPES / WORKFLOW_TEMPLATE_LIBRARY 等
// 常量与模板实例化函数已迁移至 src/constants/workflowConstants.js，
// 通过 workflowStore 间接消费。App.jsx 仅保留仍在使用的辅助常量与函数。

export const WORKFLOW_SKILL_CATALOG = [
  {
    id: 'evidence-pack',
    label: '证据包整理',
    description: '整理可引用链接、来源、摘要和推荐理由，形成后续 LLM 可直接使用的证据包。'
  },
  {
    id: 'media-audit',
    label: '多媒体审计',
    description: '检查资讯卡片图片/视频覆盖、重复图片、缺图风险和可补图线索。'
  },
  {
    id: 'material-extractor',
    label: '素材候选提取',
    description: '把高价值资讯转成素材库候选，补齐类型、标签、来源和使用场景。'
  },
  {
    id: 'profile-memory',
    label: '画像记忆更新',
    description: '从本次输入中提取追踪词、兴趣强化项和降噪建议，让系统越用越懂用户。'
  },
  {
    id: 'article-outline',
    label: '文章草稿架构',
    description: '把素材与情报结论转成可进入内容创作中心的大纲、论点和引用安排。'
  },
  {
    id: 'github-evaluator',
    label: 'GitHub 项目评估',
    description: '评估开源项目用途、成熟度、可落地场景、媒体线索和试用建议。'
  }
];

export const WORKFLOW_CONDITION_METRICS = [
  { id: 'itemCount', label: '资讯数量' },
  { id: 'mediaCount', label: '多媒体线索' },
  { id: 'materialCount', label: '素材数量' },
  { id: 'savedCount', label: '收藏/素材命中' },
  { id: 'focusCount', label: '关注领域命中' },
  { id: 'githubCount', label: 'GitHub 项目数' }
];

export const WORKFLOW_CONDITION_OPERATORS = [
  { id: '>=', label: '>=' },
  { id: '>', label: '>' },
  { id: '<=', label: '<=' },
  { id: '<', label: '<' },
  { id: '==', label: '=' }
];

export function getWorkflowSkillMeta(skillId) {
  return WORKFLOW_SKILL_CATALOG.find(skill => skill.id === skillId) || WORKFLOW_SKILL_CATALOG[0];
}

export function isWorkflowSkillId(skillId) {
  return WORKFLOW_SKILL_CATALOG.some(skill => skill.id === skillId);
}

export function formatWorkflowNodeConfig(node) {
  if (!node) return '';
  if (node.type === 'skill') return getWorkflowSkillMeta(node.skillId)?.label || '证据包整理';
  if (node.type === 'condition') {
    const metric = WORKFLOW_CONDITION_METRICS.find(item => item.id === node.conditionMetric)?.label || node.conditionMetric || '资讯数量';
    return `${metric} ${node.conditionOperator || '>='} ${node.conditionValue || 1}`;
  }
  if (node.type === 'classifier') return `分类桶：${node.classifierLabels || '必读,追踪,素材,创作,降噪'}`;
  return '';
}

export const FALLBACK_CATEGORIES = [
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

export const CATEGORY_GROUPS = [
  { id: 'tech-ai', label: '科技前沿', icon: 'flask', categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity', 'chips-compute'] },
  { id: 'hardware-consumer', label: '消费电子', icon: 'device', categories: ['devices', 'robotics', 'iot-5g', 'metaverse-xr', 'automotive'] },
  { id: 'industry-economy', label: '产业经济', icon: 'building', categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech', 'economy-stock'] },
  { id: 'entertainment', label: '娱乐文化', icon: 'star', categories: ['gaming', 'game-entertain', 'showbiz', 'anime-acg'] },
  { id: 'lifestyle-health', label: '生活健康', icon: 'heart', categories: ['space', 'new-energy', 'climate-esg', 'healthcare', 'education-tech'] }
];

// ========== 5大垂直频道（精准用户圈层）==========
export const VERTICAL_CHANNELS = [
  {
    id: 'cross-trade',
    label: '跨境经贸',
    icon: 'globe',
    description: '外贸、跨境电商、出海企业、货代',
    keywords: ['贸易', '关税', '出口', '进口', '跨境电商', '外贸', '海运', '货代', '美元', '人民币', '汇率', '采购', '供应链', '关税政策'],
    categories: ['policy-finance', 'fintech', 'economy-stock']
  },
  {
    id: 'study-immigration',
    label: '留学移民',
    icon: 'edu',
    description: '学生、家长，海外教育',
    keywords: ['留学', '签证', '移民', '教育', '大学', '院校', '雅思', '托福', '研究生', '博士', '学费', '奖学金'],
    categories: ['education-tech', 'healthcare']
  },
  {
    id: 'international-politics',
    label: '国际时政',
    icon: 'document',
    description: '大国地缘冲突、国际政坛变动、全球防务',
    keywords: ['地缘', '政治', '外交', '冲突', '战争', '选举', '总统', '政府', '政策', '国际关系', '防务', '军事'],
    categories: ['silicon-valley', 'china-tech', 'policy-finance']
  },
  {
    id: 'tech-frontier',
    label: '科技前沿',
    icon: 'cpu',
    description: 'AI、芯片、量子计算、前沿科技',
    keywords: ['AI', '人工智能', '大模型', '芯片', '量子', '计算', '研究', '科技', '创新', '突破', '发布', '推出'],
    categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity', 'chips-compute']
  },
  {
    id: 'global-finance',
    label: '环球财经',
    icon: 'trendingUp',
    description: '全球经济、股市、金融动态',
    keywords: ['股市', '股票', '经济', '金融', '加息', '降息', '通胀', '就业', 'GDP', '央行', '利率', '市场', '投资'],
    categories: ['economy-stock', 'fintech', 'policy-finance']
  },
  {
    id: 'china-focused',
    label: '涉华资讯',
    icon: 'flag',
    description: '海外对华政策、外贸订单、中国企业出海',
    keywords: ['China', '中国', '中企', '中国企业', '人民币', '华为', '腾讯', '阿里巴巴', '字节跳动', '对华', '涉华', '中美', '中欧', '一带一路', 'RCEP', '东盟'],
    categories: []
  }
];

export const LLM_PRESETS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'], icon: '🟢', abbrev: 'OA', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder'], icon: '🔵', abbrev: 'DS', placeholder: 'sk-...' },
  { id: 'moonshot', name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'], icon: '🌙', abbrev: 'MS', placeholder: 'sk-...' },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-air'], icon: '🟣', abbrev: 'ZP', placeholder: '请输入 API Key' },
  { id: 'custom', name: '自定义', baseUrl: '', models: [], icon: '⚙️', abbrev: 'CT', placeholder: 'https://...' }
];

// 兼容旧引用：部分文件仍 import AGENT_CATEGORIES（全大写），统一为与 AGENT_categories 相同内容
// 注意：实际定义在下方 AGENT_categories，这里不能直接引用（TDZ）
// 解决：在文件末尾用 re-export 或在 AGENT_categories 定义后导出别名

// 滚动资讯热点数据源
export const SCROLLING_NEWS_ITEMS = [
  {
    id: 1,
    title: 'OpenAI发布最新GPT-5模型',
    category: 'ai-models',
    source: 'OpenAI官方博客',
    time: '10分钟前',
    hot: true
  },
  {
    id: 2,
    title: '苹果M4芯片性能提升40%',
    category: 'chips-compute',
    source: 'MacRumors',
    time: '15分钟前',
    hot: true
  },
  {
    id: 3,
    title: '英伟达发布新一代Blackwell架构',
    category: 'ai-models',
    source: 'NVIDIA官方',
    time: '20分钟前',
    hot: false
  },
  {
    id: 4,
    title: '中国量子计算取得重大突破',
    category: 'quantum',
    source: '科技日报',
    time: '30分钟前',
    hot: true
  },
  {
    id: 5,
    title: 'GitHub推出AI代码助手新功能',
    category: 'open-source',
    source: 'GitHub Blog',
    time: '35分钟前',
    hot: false
  },
  {
    id: 6,
    title: '特斯拉Optimus机器人实现量产',
    category: 'robotics',
    source: 'Electrek',
    time: '45分钟前',
    hot: true
  },
  {
    id: 7,
    title: 'SpaceX星舰第四次试飞成功',
    category: 'space',
    source: 'SpaceX官方',
    time: '50分钟前',
    hot: true
  },
  {
    id: 8,
    title: '量子通信实现1000公里安全传输',
    category: 'quantum',
    source: 'Nature',
    time: '1小时前',
    hot: false
  },
  {
    id: 9,
    title: 'ChatGPT用户突破10亿大关',
    category: 'ai-models',
    source: 'OpenAI',
    time: '1小时前',
    hot: true
  },
  {
    id: 10,
    title: '全球半导体市场预计增长20%',
    category: 'chips-compute',
    source: 'IC Insights',
    time: '2小时前',
    hot: false
  }
];

export const AGENT_categories = ['全部', '指挥', '分析', '技术', '商业', '创作', '记忆', '风险', '语言', '教育', '思辨'];

// 兼容旧引用：部分文件仍 import AGENT_CATEGORIES（全大写）
export const AGENT_CATEGORIES = AGENT_categories;

export const MODES = [
  { id: 'all', label: '全部' },
  { id: 'flash', label: '快讯' },
  { id: 'deep', label: '深度' },
  { id: 'technical', label: '干货' }
];

export const VIEW_MODES = [
  { id: 'compact', label: '紧凑' },
  { id: 'standard', label: '标准' },
  { id: 'card', label: '卡片' }
];

export const TRENDING_TYPES = [
  { id: '24h', label: '24小时热点', icon: '🔥' },
  { id: '7d', label: '7日全球财经', icon: '📈' },
  { id: 'politics', label: '时政热议', icon: '🌍' }
];

export const GITHUB_LANGS = [
  { id: '', label: 'All' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JS' },
  { id: 'typescript', label: 'TS' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' }
];

export const GITHUB_PERIODS = [
  { id: 'daily', label: '日榜' },
  { id: 'weekly', label: '周榜' },
  { id: 'monthly', label: '月榜' }
];

export const REGION_MAP = { domestic: '国内', overseas: '海外', global: '全球' };
export const MODE_MAP = { flash: '快讯', deep: '深度', technical: '干货' };
export const MATERIAL_TYPES = { quote: '金句', data: '数据', case: '案例', viewpoint: '观点', chart: '图表', project: '项目' };
export const ARTICLE_STATUS = { draft: '草稿', published: '已发布', archived: '已归档' };
export const ARTICLE_TEMPLATES = { blank: '空白', briefing: '每日简报', analysis: '深度分析', tech: '技术解读' };
export const ARTICLE_TEMPLATE_CONTENT = {
  blank: '',
  briefing: `# 每日科技简报\n\n> 日期：{DATE}\n\n## 今日要闻\n\n1. \n2. \n3. \n\n## 重点分析\n\n### 事件背景\n\n\n### 影响解读\n\n\n## 趋势观察\n\n\n## 明日关注\n\n`,
  analysis: `# 深度分析：标题\n\n## 摘要\n\n用 2-3 句话概括本文核心观点。\n\n## 背景\n\n介绍事件的来龙去脉，提供必要的上下文信息。\n\n## 核心观点\n\n### 观点一\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n### 观点二\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n## 影响分析\n\n- 对行业的影响\n- 对用户的影响\n- 对技术生态的影响\n\n## 趋势预判\n\n基于以上分析，对未来趋势做出预判。\n\n## 参考资料\n\n1. \n2. \n`,
  tech: `# 技术解读：标题\n\n## 概述\n\n简要介绍要解读的技术/产品/工具。\n\n## 技术原理\n\n### 核心概念\n\n解释关键技术概念。\n\n### 架构设计\n\n描述技术的架构或设计思路。\n\n## 使用场景\n\n- 场景一：\n- 场景二：\n- 场景三：\n\n## 代码示例\n\n\`\`\`javascript\n// 示例代码\n\`\`\`\n\n## 优缺点分析\n\n### 优势\n\n- \n- \n\n### 局限\n\n- \n- \n\n## 总结\n\n总结技术的价值和适用场景。\n\n## 参考资料\n\n- \n`
};
export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const ICONS = {
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
  palette: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 0 0-1 19.9c.4 0 .7-.2.9-.5.1-.2.2-.4.2-.7 0-.6-.2-1.1-.6-1.5-.4-.4-.6-.9-.6-1.5 0-1.1.9-2 2-2h2.3a3.5 3.5 0 0 0 3.5-3.5c0-3-2.5-5.5-5.5-5.5z"/><circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="10" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="14" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
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
  play: <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
};
