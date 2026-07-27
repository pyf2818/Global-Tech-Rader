import { useEffect, useMemo, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useUiStore, useLightboxStore, useWorkflowStore, useMaterialsStore, useProfileStore, useNewsStore, useRecommendStore, useAiStore, useStockStore, useElfStore, useSourceStore } from './store/index.js';
import SettingsModal from './components/SettingsModal.jsx';
import ArticleEditor from './components/ArticleEditor.jsx';
import CreativeWorkspace from './components/CreativeWorkspace.jsx';
import ColorfulBubbles from './components/ColorfulBubbles.jsx';
import AiChatPanel from './components/AiChatPanel.jsx';
import ThemePicker from './ThemePicker.jsx';
import { PALETTES } from './ThemePicker.jsx';
import { formatTime, formatRelative, getGradeColors, isEnglishText, isChineseText } from './utils/format.js';
import { loadLS, saveLS, clearStaleLS } from './utils/localStorage.js';
import { showToast } from './utils/toast.js';
import { renderMarkdown, renderBriefMarkdown } from './utils/markdown.jsx';
import SkeletonCard from './components/SkeletonCard.jsx';
import NewsItem from './components/NewsItem.jsx';
import HexRadarChart from './components/HexRadarChart.jsx';
import TrendLineChart from './components/TrendLineChart.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useLlmConfig } from './hooks/useLlmConfig.js';
import { useTrending } from './hooks/useTrending.js';
import { useSourceManager } from './hooks/useSourceManager.js';
import { useCalendar } from './hooks/useCalendar.js';
import { useUI } from './hooks/useUI.js';
import { useCreativeWorkspace } from './hooks/useCreativeWorkspace.js';
import { useCalendarMemos } from './hooks/useCalendarMemos.js';
import { useRecommendationFeedback } from './hooks/useRecommendationFeedback.js';
import { useMaterialsMemos } from './hooks/useMaterialsMemos.js';
import { useReadingStatsMemos } from './hooks/useReadingStatsMemos.js';
import { useWorkflowMeta } from './hooks/useWorkflowMeta.js';
import { useWorkflowOps } from './hooks/useWorkflowOps.js';
import { useNewsFilter } from './hooks/useNewsFilter.js';
import { useAgents } from './hooks/useAgents.js';
import { useExternalIntelligence } from './hooks/useExternalIntelligence.js';
import { useIntelligenceMemos } from './hooks/useIntelligenceMemos.js';
import { useRecommendationMemos } from './hooks/useRecommendationMemos.js';
import { useBookmarkMaterial } from './hooks/useBookmarkMaterial.js';
import { useArticleEditor } from './hooks/useArticleEditor.js';
import { useBriefingOps } from './hooks/useBriefingOps.js';
import { useGithubInsight } from './hooks/useGithubInsight.js';
import { BlockGrid, BlockPanel, BlockStat, BlockToolbar } from './blocks/index.js';
import CommandPalette from './shell/CommandPalette.jsx';
import IntelligenceSidebar from './components/IntelligenceSidebar.jsx';
import IntelligenceFeedPanel from './components/IntelligenceFeedPanel.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import RecommendationFeed from './components/RecommendationFeed.jsx';
import RecommendationDateRail from './components/RecommendationDateRail.jsx';
import TodayNewspaper from './components/TodayNewspaper.jsx';
import CommunityPage from './components/CommunityPage.jsx';
import RecommendationsPage from './components/RecommendationsPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import StudioPage from './components/StudioPage.jsx';
import NewsPage from './components/NewsPage.jsx';
import CustomUrlPage from './components/CustomUrlPage.jsx';
import KnowledgeExportPage from './components/KnowledgeExportPage.jsx';
import InsightDashboardPage from './components/InsightDashboardPage.jsx';
import GithubPage from './components/GithubPage.jsx';
import TrendingPage from './components/TrendingPage.jsx';
import HomePage from './components/HomePage.jsx';
import AgentsPage from './components/AgentsPage.jsx';
import CalendarPage from './components/CalendarPage.jsx';
import MaterialsPage from './components/MaterialsPage.jsx';
import ReadingListPage from './components/ReadingListPage.jsx';
import Lightbox from './components/Lightbox.jsx';
import AuthModal from './components/AuthModal.jsx';
import InterestModal from './components/InterestModal.jsx';
import RightPanel from './components/RightPanel.jsx';
import Sidebar from './components/Sidebar.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import LlmQuickConfigModal from './components/LlmQuickConfigModal.jsx';
import ShortcutsModal from './components/ShortcutsModal.jsx';
import NewspaperOverlay from './components/NewspaperOverlay.jsx';
import EventFormModal from './components/EventFormModal.jsx';
import ArticleSpaceModal from './components/ArticleSpaceModal.jsx';
import AddMaterialModal from './components/AddMaterialModal.jsx';
import { useProfileSync } from './hooks/useProfileSync.js';
import { useWorkbenchMemos } from './hooks/useWorkbenchMemos.js';
import { useTranslationSummary } from './hooks/useTranslationSummary.js';
import {
  domainTierScore,
  sourceTierScore,
} from './domain/intelligence/profileTiers.js';
import { clusterEvents } from './domain/intelligence/recommendationEngine.js';
import { createSnapshotStore } from './domain/intelligence/snapshotStore.js';
import { isAiElfAsset, normalizeAsset } from './domain/creative/assetModel.js';
import { exportDocument } from './domain/creative/exportEngine.js';
import { saveDocumentVersion } from './domain/creative/versionStore.js';

// 代码分割：三个重组件按需加载，避免首屏全量打包 Three.js / klinecharts
const GlobeView = lazy(() => import('./GlobeView.jsx'));
const AiElf = lazy(() => import('./AiElf.jsx'));
const StockPage = lazy(() => import('./components/StockPage.jsx'));

const PRODUCT_NAME = '万般硅川';
const PRODUCT_TAGLINE = '高质量多领域智能资讯生态';
const PRODUCT_DESCRIPTION = '面向 AI 时代的个人情报、开源发现、智能体创作与知识资产平台。';

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

// NAV_ITEMS / PRIMARY_NAV_ITEMS / NAV_CONTEXT_SECTIONS 的 label/desc/short 字段
// 存储的是 i18n key（如 'nav.aiWorkstation'），运行时通过 t() 翻译
const NAV_ITEMS = [
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

const PRIMARY_NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.aiWorkstation', descKey: 'nav.today', shortKey: 'nav.aiWorkstation', icon: 'cpu', nav: 'home', children: ['home'] },
  { id: 'recommendations', labelKey: 'nav.recommendations', descKey: 'nav.calendarTimeline', shortKey: 'nav.recommendations', icon: 'calendar', nav: 'recommendations', children: ['recommendations'] },
  { id: 'all', labelKey: 'nav.allNews', descKey: 'nav.expandVision', shortKey: 'nav.allNews', icon: 'grid', nav: 'all', children: ['all'] },
  { id: 'stock', labelKey: 'nav.stock', descKey: 'nav.marketAnalysis', shortKey: 'nav.stock', icon: 'trendingUp', nav: 'stock', children: [] },
  { id: 'github', labelKey: 'nav.github', descKey: 'nav.githubProjects', shortKey: 'nav.github', icon: 'github', nav: 'github', children: ['github'] },
  { id: 'studio', labelKey: 'nav.studio', descKey: 'nav.materialsAgentsCreation', shortKey: 'nav.studio', icon: 'edit', nav: 'studio', children: ['materials', 'agents', 'editor'] },
  { id: 'square', labelKey: 'nav.square', descKey: 'nav.shareCommunity', shortKey: 'nav.square', icon: 'user', nav: 'square', children: ['square'] },
  { id: 'profile-center', labelKey: 'nav.profileCenter', descKey: 'nav.profileLearning', shortKey: 'nav.profileCenter', icon: 'target', nav: 'profile-center', children: ['profile-center'] }
];

const NAV_CONTEXT_SECTIONS = {
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

const WORKFLOW_SKILL_CATALOG = [
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

const WORKFLOW_CONDITION_METRICS = [
  { id: 'itemCount', label: '资讯数量' },
  { id: 'mediaCount', label: '多媒体线索' },
  { id: 'materialCount', label: '素材数量' },
  { id: 'savedCount', label: '收藏/素材命中' },
  { id: 'focusCount', label: '关注领域命中' },
  { id: 'githubCount', label: 'GitHub 项目数' }
];

const WORKFLOW_CONDITION_OPERATORS = [
  { id: '>=', label: '>=' },
  { id: '>', label: '>' },
  { id: '<=', label: '<=' },
  { id: '<', label: '<' },
  { id: '==', label: '=' }
];

function getWorkflowSkillMeta(skillId) {
  return WORKFLOW_SKILL_CATALOG.find(skill => skill.id === skillId) || WORKFLOW_SKILL_CATALOG[0];
}

function isWorkflowSkillId(skillId) {
  return WORKFLOW_SKILL_CATALOG.some(skill => skill.id === skillId);
}

function formatWorkflowNodeConfig(node) {
  if (!node) return '';
  if (node.type === 'skill') return getWorkflowSkillMeta(node.skillId)?.label || '证据包整理';
  if (node.type === 'condition') {
    const metric = WORKFLOW_CONDITION_METRICS.find(item => item.id === node.conditionMetric)?.label || node.conditionMetric || '资讯数量';
    return `${metric} ${node.conditionOperator || '>='} ${node.conditionValue || 1}`;
  }
  if (node.type === 'classifier') return `分类桶：${node.classifierLabels || '必读,追踪,素材,创作,降噪'}`;
  return '';
}

const FALLBACK_CATEGORIES = [
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

// ========== 5大垂直频道（精准用户圈层）==========
const VERTICAL_CHANNELS = [
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

const LLM_PRESETS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'], abbrev: 'OA', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder'], abbrev: 'DS', placeholder: 'sk-...' },
  { id: 'moonshot', name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'], abbrev: 'MS', placeholder: 'sk-...' },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-air'], abbrev: 'ZP', placeholder: '请输入 API Key' },
  { id: 'custom', name: '自定义', baseUrl: '', models: [], abbrev: 'CT', placeholder: 'https://...' }
];

// 滚动资讯热点数据源
const SCROLLING_NEWS_ITEMS = [
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

const AGENT_categories = ['全部', '指挥', '分析', '技术', '商业', '创作', '记忆', '风险', '语言', '教育', '思辨'];

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

const TRENDING_TYPES = [
  { id: '24h', label: '24小时热点', icon: '🔥' },
  { id: '7d', label: '7日全球财经', icon: '📈' },
  { id: 'politics', label: '时政热议', icon: '🌍' }
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
const MATERIAL_TYPES = { quote: '金句', data: '数据', case: '案例', viewpoint: '观点', chart: '图表', project: '项目' };
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

function App() {
  clearStaleLS();
  // i18n：t 翻译函数，i18n.language 当前语言（用于 useMemo 依赖触发重新翻译）
  const { t, i18n } = useTranslation();
  // 派生翻译后的导航数据（语言切换时自动重算）
  const navItems = useMemo(() => NAV_ITEMS.map(item => ({ ...item, label: t(item.labelKey) })), [t, i18n.language]);
  const primaryNavItems = useMemo(() => PRIMARY_NAV_ITEMS.map(item => ({
    ...item,
    label: t(item.labelKey),
    desc: t(item.descKey),
    short: t(item.shortKey),
  })), [t, i18n.language]);
  const navContextSections = useMemo(() => {
    const translated = {};
    for (const [key, section] of Object.entries(NAV_CONTEXT_SECTIONS)) {
      translated[key] = { ...section, label: t(section.labelKey) };
    }
    return translated;
  }, [t, i18n.language]);

  // ===== UI 状态从 useUiStore 获取（Zustand 全局 store）=====
  const showThemePicker = useUiStore(s => s.showThemePicker);
  const setShowThemePicker = useUiStore(s => s.setShowThemePicker);
  const themeMode = useUiStore(s => s.themeMode);
  const setThemeMode = useUiStore(s => s.setThemeMode);
  const editorFullscreen = useUiStore(s => s.editorFullscreen);
  const setEditorFullscreen = useUiStore(s => s.setEditorFullscreen);
  const nav = useUiStore(s => s.nav);
  const setNav = useUiStore(s => s.setNav);
  const showSettings = useUiStore(s => s.showSettings);
  const setShowSettings = useUiStore(s => s.setShowSettings);
  const settingsTab = useUiStore(s => s.settingsTab);
  const setSettingsTab = useUiStore(s => s.setSettingsTab);
  // 一次性的 URL ?view=xxx 参数支持（仅在首次挂载时覆盖 store 的 nav）
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    if (requested && NAV_ITEMS.some(item => item.id === requested)) {
      setNav(requested);
    }
  }, [setNav]);

  // ===== 主题与 UI 杂项状态（迁移自 useState -> Zustand uiStore）=====
  const palette = useUiStore(s => s.palette);
  const setPalette = useUiStore(s => s.setPalette);
  const globeFullscreenOpen = useUiStore(s => s.globeFullscreenOpen);
  const setGlobeFullscreenOpen = useUiStore(s => s.setGlobeFullscreenOpen);
  const panelCollapsed = useUiStore(s => s.panelCollapsed);
  const setPanelCollapsed = useUiStore(s => s.setPanelCollapsed);
  const profilePage = useUiStore(s => s.profilePage);
  const setProfilePage = useUiStore(s => s.setProfilePage);
  // ===== AI 助手人格状态（迁移自 useState -> Zustand elfStore）=====
  const elfAvatar = useElfStore(s => s.elfAvatar);
  const setElfAvatar = useElfStore(s => s.setElfAvatar);
  const elfAvatarHistory = useElfStore(s => s.elfAvatarHistory);
  const setElfAvatarHistory = useElfStore(s => s.setElfAvatarHistory);
  const elfName = useElfStore(s => s.elfName);
  const setElfName = useElfStore(s => s.setElfName);
  // ===== 新闻流与搜索状态（迁移自 useState -> Zustand newsStore）=====
  const category = useNewsStore(s => s.category);
  const setCategory = useNewsStore(s => s.setCategory);
  const categoryOpen = useNewsStore(s => s.categoryOpen);
  const setCategoryOpen = useNewsStore(s => s.setCategoryOpen);
  const verticalChannel = useNewsStore(s => s.verticalChannel);
  const setVerticalChannel = useNewsStore(s => s.setVerticalChannel);
  const mode = useNewsStore(s => s.mode);
  const setMode = useNewsStore(s => s.setMode);
  const sourceFilter = useNewsStore(s => s.sourceFilter);
  const setSourceFilter = useNewsStore(s => s.setSourceFilter);
  const selectedNewsDate = useNewsStore(s => s.selectedNewsDate);
  const setSelectedNewsDate = useNewsStore(s => s.setSelectedNewsDate);
  const viewMode = useNewsStore(s => s.viewMode);
  const setViewMode = useNewsStore(s => s.setViewMode);
  const query = useNewsStore(s => s.query);
  const setQuery = useNewsStore(s => s.setQuery);
  const items = useNewsStore(s => s.items);
  const setItems = useNewsStore(s => s.setItems);
  const { externalIntelligenceItems, setExternalIntelligenceItems, externalIntelligenceOpportunities, setExternalIntelligenceOpportunities, externalIntelligenceWeeklySectors, setExternalIntelligenceWeeklySectors, externalIntelligenceAlerts, setExternalIntelligenceAlerts, externalIntelligenceLoading, externalIntelligenceError, externalIntelligenceUpdatedAt, loadExternalIntelligence } = useExternalIntelligence();
  const loading = useNewsStore(s => s.loading);
  const setLoading = useNewsStore(s => s.setLoading);
  const loadingMore = useNewsStore(s => s.loadingMore);
  const setLoadingMore = useNewsStore(s => s.setLoadingMore);
  const newsPage = useNewsStore(s => s.newsPage);
  const setNewsPage = useNewsStore(s => s.setNewsPage);
  const newsHasMore = useNewsStore(s => s.newsHasMore);
  const setNewsHasMore = useNewsStore(s => s.setNewsHasMore);
  const renderLimit = useNewsStore(s => s.renderLimit);
  const setRenderLimit = useNewsStore(s => s.setRenderLimit);
  // 同步跟踪 filtered.length 给 IntersectionObserver 用（避免 observer 依赖 filtered 触发重建）
  const filteredLengthRef = useRef(0);
  const debouncedQuery = useNewsStore(s => s.debouncedQuery);
  const setDebouncedQuery = useNewsStore(s => s.setDebouncedQuery);
  const error = useNewsStore(s => s.error);
  const setError = useNewsStore(s => s.setError);
  const blocked = useNewsStore(s => s.blocked);
  const setBlocked = useNewsStore(s => s.setBlocked);
  // globeFullscreenOpen / elfAvatar / elfAvatarHistory / elfName 已迁移到 uiStore/elfStore
  const { agents, setAgents, updateAgent, currentAgent, setCurrentAgent, showAgentForm, setShowAgentForm, editingAgent, setEditingAgent, newAgent, setNewAgent } = useAgents();
  // Workflow 编辑器 UI 状态从 useUiStore 获取
  const agentFilter = useUiStore(s => s.agentFilter);
  const setAgentFilter = useUiStore(s => s.setAgentFilter);
  const agentPromptRefining = useUiStore(s => s.agentPromptRefining);
  const setAgentPromptRefining = useUiStore(s => s.setAgentPromptRefining);
  const agentWorkflowPrompt = useUiStore(s => s.agentWorkflowPrompt);
  const setAgentWorkflowPrompt = useUiStore(s => s.setAgentWorkflowPrompt);
  const agentWorkflowScope = useUiStore(s => s.agentWorkflowScope);
  const setAgentWorkflowScope = useUiStore(s => s.setAgentWorkflowScope);
  const newWorkflowNodeType = useUiStore(s => s.newWorkflowNodeType);
  const setNewWorkflowNodeType = useUiStore(s => s.setNewWorkflowNodeType);
  const draggingWorkflowNodeId = useUiStore(s => s.draggingWorkflowNodeId);
  const setDraggingWorkflowNodeId = useUiStore(s => s.setDraggingWorkflowNodeId);
  // ===== 工作流状态（迁移自 useState -> Zustand workflowStore）=====
  const agentWorkflowResult = useWorkflowStore(s => s.agentWorkflowResult);
  const setAgentWorkflowResult = useWorkflowStore(s => s.setAgentWorkflowResult);
  const agentWorkflowRun = useWorkflowStore(s => s.agentWorkflowRun);
  const setAgentWorkflowRun = useWorkflowStore(s => s.setAgentWorkflowRun);
  const agentWorkflowHistory = useWorkflowStore(s => s.agentWorkflowHistory);
  const setAgentWorkflowHistory = useWorkflowStore(s => s.setAgentWorkflowHistory);
  const agentWorkflowActions = useWorkflowStore(s => s.agentWorkflowActions);
  const setAgentWorkflowActions = useWorkflowStore(s => s.setAgentWorkflowActions);
  const agentWorkflowDraft = useWorkflowStore(s => s.agentWorkflowDraft);
  const setAgentWorkflowDraft = useWorkflowStore(s => s.setAgentWorkflowDraft);
  const workflowTemplates = useWorkflowStore(s => s.workflowTemplates);
  const setWorkflowTemplates = useWorkflowStore(s => s.setWorkflowTemplates);
  const activeWorkflowId = useWorkflowStore(s => s.activeWorkflowId);
  const setActiveWorkflowId = useWorkflowStore(s => s.setActiveWorkflowId);
  const selectedWorkflowNodeId = useWorkflowStore(s => s.selectedWorkflowNodeId);
  const setSelectedWorkflowNodeId = useWorkflowStore(s => s.setSelectedWorkflowNodeId);
  const [stats, setStats] = useState({ sourceCount: 40, failedSources: 0, updatedAt: '', blockedCount: 0 });
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore(s => s.setSidebarCollapsed);
  const motivationalQuote = useMemo(() => {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }, []);
  // panelCollapsed 已迁移到 uiStore
  // 导航分组下拉展开：记录哪些主模块展开了细分项
  const expandedNavGroups = useUiStore(s => s.expandedNavGroups);
  const setExpandedNavGroups = useUiStore(s => s.setExpandedNavGroups);
  const toggleNavGroup = useUiStore(s => s.toggleNavGroup);
  // 细分模块下拉折叠状态（默认展开）
  const contextGroupOpen = useUiStore(s => s.contextGroupOpen);
  const setContextGroupOpen = useUiStore(s => s.setContextGroupOpen);
  // ===== 信息源管理状态（迁移自 useState -> Zustand sourceStore）=====
  const searchQuery = useSourceStore(s => s.searchQuery);
  const setSearchQuery = useSourceStore(s => s.setSearchQuery);
  const customSourceFilter = useSourceStore(s => s.customSourceFilter);
  const setCustomSourceFilter = useSourceStore(s => s.setCustomSourceFilter);
  const regionFilter = useSourceStore(s => s.regionFilter);
  const setRegionFilter = useSourceStore(s => s.setRegionFilter);
  const statusFilter = useSourceStore(s => s.statusFilter);
  const setStatusFilter = useSourceStore(s => s.setStatusFilter);
  
  
  // ===== 股市监控状态（迁移自 useState -> Zustand stockStore）=====
  // autoMonitorEnabled/monitorInterval/monitorAlerts 已迁移至 useSourceManager
  const showAlertPanel = useStockStore(s => s.showAlertPanel);
  const setShowAlertPanel = useStockStore(s => s.setShowAlertPanel);
  const {
    llmConfig, setLlmConfig,
    llmModels, setLlmModels,
    llmFetching, setLlmFetching,
    llmFetchError, setLlmFetchError,
    llmTestResult, setLlmTestResult,
    llmTesting, setLlmTesting,
    llmManualInput, setLlmManualInput,
    showLlmQuickConfig, setShowLlmQuickConfig,
    llmPresetName, setLlmPresetName,
    allLlmModels,
    llmPresets, upsertPreset, removePreset, activatePreset, activePresetId, setActivePresetId,
    fetchLlmModels, addManualModel, removeManualModel, testLlmConnection,
    handleSelectPreset, handleQuickSave, handleQuickTest,
  } = useLlmConfig({ LLM_PRESETS, onQuickSaveSuccess: () => setAiInsights({ loading: false, data: null, error: '' }) });

  // ========== 用户系统 ==========
  // 认证与用户会话 — 从 App.jsx 提取为独立 hook（减少 ~140 行）
  const {
    user, token, showAuthModal, authMode, authForm, authLoading, authError, setAuthError,
    showInterestModal, selectedInterests, isLoggedIn,
    setUser, setToken, setShowAuthModal, setAuthMode, setAuthForm,
    setSelectedInterests, setShowInterestModal,
    handleRegister, handleLogin, handleLogout, updateUserInterests, updateUserProfile,
  } = useAuth({ setSelectedInterests: (interests) => {
    setSelectedInterests(interests);
    // 同步更新外部 state
  } });

  // profilePage 已从 useUiStore 订阅（见上方 UI 状态区）
  // ===== AI 助手与简报状态（迁移自 useState -> Zustand aiStore）=====
  const copilotPendingMessage = useAiStore(s => s.copilotPendingMessage);
  const setCopilotPendingMessage = useAiStore(s => s.setCopilotPendingMessage);
  const showNewspaperOverlay = useUiStore(s => s.showNewspaperOverlay);
  const setShowNewspaperOverlay = useUiStore(s => s.setShowNewspaperOverlay);
  const showUserMenu = useUiStore(s => s.showUserMenu);
  const setShowUserMenu = useUiStore(s => s.setShowUserMenu);
  const showProfileModal = useUiStore(s => s.showProfileModal);
  const setShowProfileModal = useUiStore(s => s.setShowProfileModal);
  // ===== 用户画像与偏好状态（迁移自 useState -> Zustand profileStore）=====
  const profileForm = useProfileStore(s => s.profileForm);
  const setProfileForm = useProfileStore(s => s.setProfileForm);
  const domainTiers = useProfileStore(s => s.domainTiers);
  const setDomainTiers = useProfileStore(s => s.setDomainTiers);
  const sourceTiers = useProfileStore(s => s.sourceTiers);
  const setSourceTiers = useProfileStore(s => s.setSourceTiers);
  const dailyProfileSnapshots = useProfileStore(s => s.dailyProfileSnapshots);
  const setDailyProfileSnapshots = useProfileStore(s => s.setDailyProfileSnapshots);
  const specialFollows = useProfileStore(s => s.specialFollows);
  const setSpecialFollows = useProfileStore(s => s.setSpecialFollows);
  const briefingConfig = useProfileStore(s => s.briefingConfig);
  const setBriefingConfig = useProfileStore(s => s.setBriefingConfig);
  const specialFollowForm = useProfileStore(s => s.specialFollowForm);
  const setSpecialFollowForm = useProfileStore(s => s.setSpecialFollowForm);
  const editingSpecialFollowId = useProfileStore(s => s.editingSpecialFollowId);
  const setEditingSpecialFollowId = useProfileStore(s => s.setEditingSpecialFollowId);
  useProfileSync({ user, domainTiers, sourceTiers, specialFollows, setDomainTiers, setSourceTiers, setSpecialFollows });

  // 打开资料弹窗时预填充表单
  useEffect(() => {
    if (showProfileModal && user) {
      setProfileForm({
        displayName: user.displayName || '',
        signature: user.signature || ''
      });
    }
  }, [showProfileModal, user]);

  // 画像状态持久化由 profileStore 的 persist 中间件自动处理（不再需要手写 saveLS effect）


  // 认证函数已抽取至 useAuth — 这里不再定义

  const allSources = useSourceStore(s => s.allSources);
  const setAllSources = useSourceStore(s => s.setAllSources);
  const sourceGrades = useSourceStore(s => s.sourceGrades);
  const setSourceGrades = useSourceStore(s => s.setSourceGrades);
  const serverCategories = useSourceStore(s => s.serverCategories);
  const setServerCategories = useSourceStore(s => s.setServerCategories);

  // 分类单一来源：服务端 /api/meta 下发，离线时用 fallback
  const categories = useMemo(
    () => (serverCategories.length > 0 ? serverCategories : FALLBACK_CATEGORIES),
    [serverCategories]
  );

  const resetSpecialFollowForm = () => {
    setSpecialFollowForm({ type: 'source', target: '', note: '' });
    setEditingSpecialFollowId(null);
  };

  const submitSpecialFollow = () => {
    const target = specialFollowForm.target.trim();
    const note = specialFollowForm.note.trim();
    if (!target) {
      showToast('请输入特别关注目标');
      return;
    }
    const duplicate = specialFollows.some(item =>
      item.id !== editingSpecialFollowId
      && item.type === specialFollowForm.type
      && item.target.toLocaleLowerCase() === target.toLocaleLowerCase()
    );
    if (duplicate) {
      showToast('该特别关注已存在');
      return;
    }
    if (editingSpecialFollowId) {
      setSpecialFollows(previous => previous.map(item => item.id === editingSpecialFollowId
        ? { ...item, type: specialFollowForm.type, target, note }
        : item));
    } else {
      setSpecialFollows(previous => [...previous, {
        id: globalThis.crypto?.randomUUID?.() || `follow-${Date.now()}`,
        type: specialFollowForm.type,
        target,
        note,
      }]);
    }
    resetSpecialFollowForm();
  };

  const editSpecialFollow = item => {
    setEditingSpecialFollowId(item.id);
    setSpecialFollowForm({ type: item.type, target: item.target, note: item.note || '' });
  };

  // 获取用户兴趣分类的详细信息
  const userInterestCategories = useMemo(() => {
    return categories.filter(c => c.id !== 'all' && selectedInterests.includes(c.id));
  }, [categories, selectedInterests]);

  const gradeFilter = useSourceStore(s => s.gradeFilter);
  const setGradeFilter = useSourceStore(s => s.setGradeFilter);
  const sourceTypeTab = useSourceStore(s => s.sourceTypeTab);
  const setSourceTypeTab = useSourceStore(s => s.setSourceTypeTab);
  const {
    trendingItems, setTrendingItems,
    trendingLoading, trendingPlatform, setTrendingPlatform,
    trendingType, setTrendingType,
    trendingPage, trendingHasMore, trendingLoadingMore,
    githubRepos, githubLoading,
    githubLang, setGithubLang,
    githubSince, setGithubSince,
    loadTrending, loadGithub,
  } = useTrending();

  useEffect(() => {
    fetch('/api/meta')
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data.sources)) setAllSources(data.sources);
        if (data.sourceGrades) setSourceGrades(data.sourceGrades);
        if (Array.isArray(data.categories)) setServerCategories(data.categories);
      })
      .catch(error => {
        console.warn('Failed to load source metadata:', error);
      });
  }, []);
  // UI switch states
  const { showFollowDropdown, setShowFollowDropdown, mobileMenuOpen, setMobileMenuOpen, showBackToTop, setShowBackToTop, moreNavOpen, setMoreNavOpen } = useUI();
  // calendar + customUrl hooks (independent domains)
  const {
    calendarDate, setCalendarDate,
    events, setEvents,
    eventForm, setEventForm,
    showEventForm, setShowEventForm,
    addEvent, removeEvent,
  } = useCalendar();
  // useCustomUrl hook moved into CustomUrlPage component
  // source management — uses allSources from /api/meta
  const {
    customSources, setCustomSources,
    disabledSources, setDisabledSources,
    newSource, setNewSource,
    sourceVerifyResult, sourceVerifying,
    sourceDiscoveryUrl, setSourceDiscoveryUrl,
    sourceDiscoveryState,
    verifyingAllSources, allSourcesVerifyResults, setAllSourcesVerifyResults,
    sourceHealth, setSourceHealth,
    editingSource, setEditingSource,
    showSourceForm, setShowSourceForm,
    verifySource, discoverSource, addDiscoveredSource, verifyAllSources,
    addCustomSource, removeCustomSource,
    truncateUrl, truncateText,
    getSourceHealthIndicator,
    verifySingleSource,
    exportSources, importSources,
    clearAlerts,
    autoMonitorEnabled, setAutoMonitorEnabled,
    monitorInterval, setMonitorInterval,
    monitorAlerts, setMonitorAlerts,
  } = useSourceManager({ allSources });  // githubLang/githubSince 已移入 useTrending
  // calendar states moved to useCalendar hook

  // articles/articlespaces moved to useArticleEditor hook
  const creativeWorkspace = useCreativeWorkspace({ syncEnabled: isLoggedIn });
  const {
    expandedSummary, setExpandedSummary,
    summaryCache, setSummaryCache,
    summaryLoading, setSummaryLoading,
    translations, setTranslations,
    translationOpen, setTranslationOpen,
    translatingItems, setTranslatingItems,
    getSummaryEntry, handleSummaryToggle, requestTranslation, getTranslation, toggleGithubTranslation,
  } = useTranslationSummary(llmConfig);
  // ===== 推荐反馈与追踪状态（迁移自 useState -> Zustand recommendStore）=====
  const followKeywords = useRecommendStore(s => s.followKeywords);
  const setFollowKeywords = useRecommendStore(s => s.setFollowKeywords);
  const pinnedKeywords = useRecommendStore(s => s.pinnedKeywords);
  const setPinnedKeywords = useRecommendStore(s => s.setPinnedKeywords);
  const recommendationFeedback = useRecommendStore(s => s.recommendationFeedback);
  const setRecommendationFeedback = useRecommendStore(s => s.setRecommendationFeedback);
  const recommendationFeedbackEvents = useRecommendStore(s => s.recommendationFeedbackEvents);
  const setRecommendationFeedbackEvents = useRecommendStore(s => s.setRecommendationFeedbackEvents);
  const snapshotStoreRef = useRef(null);
  if (!snapshotStoreRef.current) snapshotStoreRef.current = createSnapshotStore(localStorage);
  const recommendationSnapshots = useRecommendStore(s => s.recommendationSnapshots);
  const setRecommendationSnapshots = useRecommendStore(s => s.setRecommendationSnapshots);
  const [newKeyword, setNewKeyword] = useState('');
  const searchHistory = useRecommendStore(s => s.searchHistory);
  const setSearchHistory = useRecommendStore(s => s.setSearchHistory);
  const searchOpen = useRecommendStore(s => s.searchOpen);
  const setSearchOpen = useRecommendStore(s => s.setSearchOpen);
  const searchSort = useRecommendStore(s => s.searchSort);
  const setSearchSort = useRecommendStore(s => s.setSearchSort);
  const focusedIndex = useRecommendStore(s => s.focusedIndex);
  const setFocusedIndex = useRecommendStore(s => s.setFocusedIndex);
  const showShortcuts = useUiStore(s => s.showShortcuts);
  const setShowShortcuts = useUiStore(s => s.setShowShortcuts);
  const showCommandPalette = useUiStore(s => s.showCommandPalette);
  const setShowCommandPalette = useUiStore(s => s.setShowCommandPalette);
  // Lightbox 状态从 useLightboxStore 获取（跨页面共享的图片预览）
  const lightbox = useLightboxStore(s => s.lightbox);
  const setLightbox = useLightboxStore(s => s.setLightbox);
  const expandedEvents = useRecommendStore(s => s.expandedEvents);
  const setExpandedEvents = useRecommendStore(s => s.setExpandedEvents);
  const exportCategory = useRecommendStore(s => s.exportCategory);
  const setExportCategory = useRecommendStore(s => s.setExportCategory);
  const exportRange = useRecommendStore(s => s.exportRange);
  const setExportRange = useRecommendStore(s => s.setExportRange);

  // customUrl states moved to useCustomUrl hook
  // UI switch states (showFollowDropdown/mobileMenuOpen/showBackToTop) moved to useUI
  const trackTargets = useRecommendStore(s => s.trackTargets);
  const setTrackTargets = useRecommendStore(s => s.setTrackTargets);
  // briefingConfig 已迁移到 profileStore
  const [newTrackTarget, setNewTrackTarget] = useState('');
  const readingHistory = useRecommendStore(s => s.readingHistory);
  const setReadingHistory = useRecommendStore(s => s.setReadingHistory);
  // recommendationFeedbackEvents 持久化由 recommendStore 的 persist 中间件自动处理
  // ===== AI Insights / Elf 引用上下文（迁移自 useState -> Zustand aiStore）=====
  const aiInsights = useAiStore(s => s.aiInsights);
  const setAiInsights = useAiStore(s => s.setAiInsights);
  const elfQuotedContext = useAiStore(s => s.elfQuotedContext);
  const setElfQuotedContext = useAiStore(s => s.setElfQuotedContext);
  // moreNavOpen moved to useUI
  // ===== 素材库 UI 状态（迁移自 useState -> Zustand materialsStore）=====
  const materialFilter = useMaterialsStore(s => s.materialFilter);
  const setMaterialFilter = useMaterialsStore(s => s.setMaterialFilter);
  const materialSearch = useMaterialsStore(s => s.materialSearch);
  const setMaterialSearch = useMaterialsStore(s => s.setMaterialSearch);
  const materialTags = useMaterialsStore(s => s.materialTags);
  const setMaterialTags = useMaterialsStore(s => s.setMaterialTags);
  const materialTimeRange = useMaterialsStore(s => s.materialTimeRange);
  const setMaterialTimeRange = useMaterialsStore(s => s.setMaterialTimeRange);
  const materialSourceFilter = useMaterialsStore(s => s.materialSourceFilter);
  const setMaterialSourceFilter = useMaterialsStore(s => s.setMaterialSourceFilter);
  const materialSpaceFilter = useMaterialsStore(s => s.materialSpaceFilter);
  const setMaterialSpaceFilter = useMaterialsStore(s => s.setMaterialSpaceFilter);
  const showSpaceForm = useMaterialsStore(s => s.showSpaceForm);
  const setShowSpaceForm = useMaterialsStore(s => s.setShowSpaceForm);
  const showAddMaterial = useMaterialsStore(s => s.showAddMaterial);
  const setShowAddMaterial = useMaterialsStore(s => s.setShowAddMaterial);
  // ===== AI 简报状态（迁移自 useState -> Zustand aiStore，content 自动持久化）=====
  const aiBrief = useAiStore(s => s.aiBrief);
  const setAiBrief = useAiStore(s => s.setAiBrief);
  const signalFilter = useStockStore(s => s.signalFilter);
  const setSignalFilter = useStockStore(s => s.setSignalFilter);
  // article editor state moved to useArticleEditor hook

  // 滚动资讯热点状态：从实时 items 派生热门资讯，保证数据准确实时
  const scrollingNewsPaused = useUiStore(s => s.scrollingNewsPaused);
  const setScrollingNewsPaused = useUiStore(s => s.setScrollingNewsPaused);
  const scrollingNewsRef = useRef(null);
  const { scrollingNews, sourceStats, availableNewsDates, sourceOptions } = useNewsFilter(items, category, mode);

  const editorTextareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const workflowImportInputRef = useRef(null);

  // bookmarks / materials state must precede useArticleEditor (which consumes materials)
  const {
    bookmarks, setBookmarks,
    materials, setMaterials,
    selectedMaterials, setSelectedMaterials,
    materialSpaces, setMaterialSpaces,
    newSpaceName, setNewSpaceName,
    toggleBookmark, isBookmarked, isInMaterials, toggleRead,
    detectMaterialType, toggleMaterial, addManualMaterial,
    continueMaterialInWorkbench, removeMaterial, batchRemoveMaterials,
    updateMaterialTags, toggleMaterialSelection,
    clearMaterialSelection, updateMaterialNote, assignMaterialsToSpace,
    createMaterialSpace, deleteMaterialSpace, toggleMaterialStar,
    exportMaterials, importMaterials,
  } = useBookmarkMaterial({
    creativeWorkspace,
    setNav,
    setCopilotPendingMessage,
    setShowAddMaterial,
    setShowSpaceForm,
    materialSpaceFilter,
    setMaterialSpaceFilter,
  });

  const {
    articles, setArticles,
    articleSpaces, setArticleSpaces,
    currentArticleId, setCurrentArticleId,
    editorTab, setEditorTab,
    editorCursorPos, setEditorCursorPos,
    showTemplateMenu, setShowTemplateMenu,
    showAiPanel, setShowAiPanel,
    showImagePanel, setShowImagePanel,
    aiResult, setAiResult,
    aiCustomPrompt, setAiCustomPrompt,
    autoSaveTimer, setAutoSaveTimer,
    lastSavedAt, setLastSavedAt,
    articleTagInput, setArticleTagInput,
    editingArticleTag, setEditingArticleTag,
    articleSpaceFilter, setArticleSpaceFilter,
    articleMaterialSpaceFilter, setArticleMaterialSpaceFilter,
    articleSpaceFormOpen, setArticleSpaceFormOpen,
    newArticleSpaceName, setNewArticleSpaceName,
    articleSpaceForNewArticle, setArticleSpaceForNewArticle,
    articleSearch, setArticleSearch,
    articleStatusFilter, setArticleStatusFilter,
    articleTemplateFilter, setArticleTemplateFilter,
    articleSort, setArticleSort,
    articleExportFilter, setArticleExportFilter,
    createArticle, updateArticle, deleteArticle, duplicateArticle,
    addArticleTag, removeArticleTag,
    triggerAutoSave,
    handleContentChange, handleTitleChange,
    insertAtCursor, insertMaterialAtCursor,
    removeLinkedMaterial,
    handleImageUpload, handlePaste,
    createArticleSpace, deleteArticleSpace,
    assignArticleToSpace, batchAssignArticlesToSpace,
    insertAiResult, clearAiResult, aiAction,
    exportArticleToFile, copyArticleAsRichText, exportArticle,
    articleCitations, saveArticleVersion,
  } = useArticleEditor({ llmConfig, materials, editorTextareaRef });

  const feedRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.mode = themeMode;
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('palette', palette);
  }, [palette]);
  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem('panelCollapsed', String(panelCollapsed)); }, [panelCollapsed]);
  // ESC 退出创作中心全屏
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setEditorFullscreen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handler = (e) => { if (!e.target.closest('.editor-template-dropdown')) setShowTemplateMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplateMenu]);

  const recentVisits = useUiStore(s => s.recentVisits);
  const setRecentVisits = useUiStore(s => s.setRecentVisits);

  // 30+ 个 saveLS 合并为一个统一同步 effect — 任何 state 变化只触发一次写入
  // 注：nav/sidebarCollapsed/themeMode/expandedNavGroups/contextGroupOpen/recentVisits
  // 等已迁移到 useUiStore；followKeywords/pinnedKeywords/recommendationFeedback/
  // searchHistory/viewMode/trackTargets/briefingConfig/readingHistory/recommendationFeedbackEvents
  // 已迁移到对应 Zustand store，由 store 自行持久化，不再需要在这里同步
  useEffect(() => {
    const map = {
      customSources, sourceHealth, disabledSources, calendarEvents: events,
      bookmarks, materials, materialSpaces, articleSpaces, articles,
      summaryCache, translations, llmConfig,
    };
    for (const [key, val] of Object.entries(map)) saveLS(key, val);
    // localStorage 直写的字段
    localStorage.setItem('elfAvatar', elfAvatar || '');
    if (!elfAvatar) localStorage.removeItem('elfAvatar');
    localStorage.setItem('elfAvatarHistory', JSON.stringify(elfAvatarHistory));
    localStorage.setItem('elfName', elfName);
  }, [
    customSources, sourceHealth, disabledSources, events, bookmarks, materials,
    materialSpaces, articleSpaces, articles, summaryCache, translations, llmConfig,
    elfAvatar, elfAvatarHistory, elfName,
  ]);
  // 工作流状态持久化由 workflowStore 的 persist 中间件自动处理（不再需要手写 saveLS effect）

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

  // 滚动资讯自动滚动效果：rAF 连续平移 scrollLeft，无缝循环
  useEffect(() => {
    const el = scrollingNewsRef.current;
    if (!el || scrollingNewsPaused || scrollingNews.length === 0) return;
    let raf;
    const step = () => {
      // 滚到第一份末尾（总宽度一半）时跳回开头，实现无缝循环
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
      el.scrollLeft += 0.4; // 滚动速度 px/帧
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scrollingNewsPaused, scrollingNews.length]);

  // 滚动资讯手动拖拽：按下并拖动直接控制 scrollLeft
  const scrollingNewsDragRef = useRef({ dragging: false, startX: 0, startScroll: 0, moved: false });
  const handleScrollingNewsMouseMove = useCallback((e) => {
    const ref = scrollingNewsDragRef.current;
    if (!ref.dragging) return;
    const el = scrollingNewsRef.current;
    if (!el) return;
    const dx = e.clientX - ref.startX;
    if (Math.abs(dx) > 3) ref.moved = true;
    el.scrollLeft = ref.startScroll - dx;
  }, []);
  const handleScrollingNewsMouseUp = useCallback(() => {
    const ref = scrollingNewsDragRef.current;
    ref.dragging = false;
    window.removeEventListener('mousemove', handleScrollingNewsMouseMove);
    window.removeEventListener('mouseup', handleScrollingNewsMouseUp);
    // 拖拽结束后短暂保持暂停状态，给用户一个自然的间隙
    if (ref.moved) {
      setScrollingNewsPaused(true);
      setTimeout(() => setScrollingNewsPaused(false), 1200);
    }
  }, [handleScrollingNewsMouseMove]);
  const handleScrollingNewsMouseDown = useCallback((e) => {
    const el = scrollingNewsRef.current;
    if (!el) return;
    e.preventDefault(); // 防止文字选中
    scrollingNewsDragRef.current = {
      dragging: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    window.addEventListener('mousemove', handleScrollingNewsMouseMove);
    window.addEventListener('mouseup', handleScrollingNewsMouseUp);
  }, [handleScrollingNewsMouseMove, handleScrollingNewsMouseUp]);

  useEffect(() => {
    if (!lightbox.open) return;
    const handler = (e) => { if (e.key === 'Escape') setLightbox({ open: false, src: '', title: '', images: [], index: 0 }); };
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
    if (!el || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        // 滚动接近底部时同时做两件事（不互斥）：
        // 1) 渲染分页：每批 +20 让 DOM 增长平滑，避免一次 +40 卡顿
        // 2) 后端预加载：在用户看到底部前提前请求下一页
        setRenderLimit(r => (filteredLengthRef.current > r ? r + 20 : r));
        if (newsHasMore && !loadingMore) {
          loadMoreNews();
        }
      },
      { root: el, rootMargin: '800px 0px' }
    );
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nav, newsHasMore, loadingMore, loading, renderLimit]);

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic page title and description based on current navigation
  useEffect(() => {
    let title = `${PRODUCT_NAME} - ${PRODUCT_TAGLINE}`;
    let description = PRODUCT_DESCRIPTION;
    
    if (nav === 'home') {
      title = `${PRODUCT_NAME} - AI 工作站`;
      description = '基于公共热点、用户画像和可验证来源生成每日情报总判断。';
    } else if (nav === 'trending') {
      title = `${PRODUCT_NAME} - ${TRENDING_TYPES.find(t => t.id === trendingType)?.label || '热门榜单'}`;
      description = '隐藏工具中的热点榜单，用于补充观察公共热度。';
    } else if (nav === 'github') {
      title = `${PRODUCT_NAME} - GitHub 热门项目`;
      description = '收集 GitHub 日榜、周榜、月榜明星项目，结合图片和应用场景帮助判断项目价值。';
    } else if (nav === 'studio') {
      title = `${PRODUCT_NAME} - 智创中心`;
      description = '聚合素材库、智能体工作流和内容创作，沉淀个人知识资产。';
    } else if (nav === 'agents') {
      title = `${PRODUCT_NAME} - 智能体工作流`;
      description = '主力大模型工作区，支持可视化节点蓝图、智能体协作和工作流输出沉淀。';
    } else if (nav === 'materials') {
      title = `${PRODUCT_NAME} - 素材库`;
      description = '收集资讯卡片、每日汇报、本地上传和智能体输出，形成可复用知识资产。';
    } else if (nav === 'editor') {
      title = `${PRODUCT_NAME} - 内容创作`;
      description = '联动素材库和智能体工作流，创作文章、报告并导出本地知识库资产。';
    } else if (nav === 'square') {
      title = `${PRODUCT_NAME} - 用户广场`;
      description = '分享文章、智能体和每日汇报，提供点赞、收藏、关注和评论等交流能力。';
    } else if (nav === 'profile-center') {
      title = `${PRODUCT_NAME} - 用户画像`;
      description = '管理关注领域、阅读记录、收藏资讯、领域优先级和信号源优先级。';
    } else if (nav === 'recommendations') {
      title = `${PRODUCT_NAME} - 精准推荐`;
      description = '使用不可变日快照按日历和时间线回看精准推荐及其评分依据。';
    } else if (nav === 'all') {
      if (verticalChannel !== 'all') {
        const channel = VERTICAL_CHANNELS.find(ch => ch.id === verticalChannel);
        if (channel) {
          title = `${PRODUCT_NAME} - ${channel.label}`;
          description = `${channel.description} - 多领域高质量资讯平台。`;
        }
      }
    }
    
    document.title = title;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }, [nav, trendingType, verticalChannel]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (nav !== 'all') return;
    loadNews(blocked, false, debouncedQuery);
  }, [debouncedQuery, category, mode, sourceFilter]);
  useEffect(() => {
    if (nav === 'recommendations') loadNews(blocked, false, debouncedQuery);
  }, [nav]);
  // 后台预加载：进入首页即拉取热门/GitHub/资讯，避免切 tab 时白屏等待
  const backgroundLoadedRef = useRef(false);
  useEffect(() => {
    if (backgroundLoadedRef.current) return;
    backgroundLoadedRef.current = true;
    if (trendingItems.length === 0) loadTrending();
    if (githubRepos.length === 0) loadGithub();
    if (items.length === 0) loadNews(blocked, false, debouncedQuery);
    // 后台预取股票/3D 地球/AI 工作站等 lazy chunk，切到对应 tab 时无需再等下载
    import('./components/StockPage.jsx').catch(() => {});
    // 预取股票 dashboard 数据填充服务端缓存，切到 stock tab 时秒出
    fetch('/api/stock/dashboard').catch(() => {});
  }, []);

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
      let reg = regionFilter === 'all';
      if (!reg) {
        if (regionFilter === 'domestic') {
          reg = item.region === 'domestic';
        } else if (regionFilter === 'overseas') {
          reg = item.region === 'overseas' || item.region === 'global';
        }
      }
      return cat && md && src && reg;
    });

    if (items.length > 0) {
      const sampleRegions = items.slice(0, 5).map(i => ({ title: i.title?.substring(0, 30), region: i.region }));
    }

    // 综合质量排序：qualityScore（多源交叉验证×源权重）+ mustReadScore + 关注词加权
    const followLc = followKeywords.map(kw => kw.toLowerCase());
    result.sort((a, b) => {
      // 1. 关注词命中：命中加分 +50，置于前列
      const aFollow = followLc.some(kw => `${a.title} ${a.summary}`.toLowerCase().includes(kw)) ? 50 : 0;
      const bFollow = followLc.some(kw => `${b.title} ${b.summary}`.toLowerCase().includes(kw)) ? 50 : 0;
      // 2. 质量分（后端 qualityScore 范围 0~30+）
      const aQ = (a.qualityScore || 0) + (a.mustReadScore || 0) + aFollow;
      const bQ = (b.qualityScore || 0) + (b.mustReadScore || 0) + bFollow;
      if (bQ !== aQ) return bQ - aQ;
      // 3. 同分时按发布时间倒序
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return result;
  }, [items, category, mode, sourceFilter, followKeywords, regionFilter]);

  // 同步 filtered.length 到 ref（供 IntersectionObserver 闭包读取最新值）
  useEffect(() => { filteredLengthRef.current = filtered.length; }, [filtered.length]);

  // 「全部动态」当前活动筛选 —— 用于 chip 条展示与一键清除
  const allActiveFilters = useMemo(() => {
    const chips = [];
    if (query.trim()) chips.push({ key: 'query', label: `搜索: ${query.trim()}`, clear: () => setQuery('') });
    if (category !== 'all') {
      const cat = categories.find(c => c.id === category);
      chips.push({ key: 'category', label: cat?.label || category, clear: () => setCategory('all') });
    }
    if (mode !== 'all') {
      const m = MODES.find(x => x.id === mode);
      chips.push({ key: 'mode', label: m?.label || mode, clear: () => setMode('all') });
    }
    if (regionFilter !== 'all') {
      chips.push({ key: 'region', label: regionFilter === 'domestic' ? '国内' : '国外', clear: () => setRegionFilter('all') });
    }
    if (sourceFilter !== 'all') chips.push({ key: 'source', label: sourceFilter, clear: () => setSourceFilter('all') });
    return chips;
  }, [query, category, mode, regionFilter, sourceFilter, categories]);

  const clearAllFilters = () => {
    setQuery('');
    setCategory('all');
    setMode('all');
    setRegionFilter('all');
    setSourceFilter('all');
  };

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
      .slice(0, 8);
  }, [filtered]);

  useEffect(() => {
    if (!items.length || !availableNewsDates.length) return;
    if (!availableNewsDates.includes(selectedNewsDate)) {
      // 历史日期可能无实时资讯但有快照，用户主动选择时不覆盖
      const hasSnapshot = snapshotStoreRef.current.get(selectedNewsDate);
      if (!hasSnapshot) setSelectedNewsDate(availableNewsDates[0]);
    }
  }, [items.length, availableNewsDates, selectedNewsDate]);

  const selectedDateItems = useMemo(() => {
    // 每日汇报严格聚焦当天日期，不允许降级到全部数据
    const sameDay = filtered.filter(item => {
      const d = item.publishedAt?.slice(0, 10);
      return d === selectedNewsDate;
    });
    return sameDay;
  }, [filtered, selectedNewsDate]);

  const regionCategoryMatrix = useMemo(() => {
    const regions = ['domestic', 'overseas', 'global'];
    const matrix = {};
    let maxVal = 0;
    regions.forEach(r => {
      matrix[r] = {};
      categories.forEach(c => {
        const count = items.filter(i => i.region === r && i.category === c.id).length;
        matrix[r][c.id] = count;
        if (count > maxVal) maxVal = count;
      });
    });
    return { matrix, maxVal, regions };
  }, [items]);

  const { dailyBriefing, trackerData, insightData, readingProfile } = useIntelligenceMemos({
    items,
    followKeywords,
    briefingConfig,
    trackTargets,
    categories,
    trendData,
    bookmarks,
  });

  const eventClusters = useMemo(() => {
    if (nav !== 'all') return [];
    return clusterEvents(filtered)
      .filter(cluster => cluster.items.length >= 2)
      .map(cluster => ({ ...cluster, keyword: cluster.primaryItem.title }));
  }, [filtered, nav]);

  const allFeedItems = useMemo(() => {
    if (nav !== 'all' || eventClusters.length === 0) return filtered;
    const secondaryIds = new Set(eventClusters.flatMap(cluster =>
      cluster.items.filter(item => item.id !== cluster.primaryItem.id).map(item => item.id)
    ));
    return filtered.filter(item => !secondaryIds.has(item.id));
  }, [filtered, eventClusters, nav]);

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

  const {
    followKeywordUpdates,
    todayMustRead,
    recommendationCandidates,
    recommendationLanes,
    algorithmBriefing,
  } = useRecommendationMemos({
    items,
    followKeywords,
    readingHistory,
    bookmarks,
    selectedInterests,
    domainTiers,
    sourceTiers,
    specialFollows,
    selectedNewsDate,
  });

  const selectedRecommendationSnapshot = useMemo(() => {
    if (!selectedNewsDate) return null;
    return snapshotStoreRef.current.get(selectedNewsDate);
  }, [selectedNewsDate, recommendationSnapshots]);

  const displayRecommendationLanes = useMemo(() => {
    const liveCount = (recommendationLanes.public?.length || 0) + (recommendationLanes.personal?.length || 0);
    if (liveCount > 0) return recommendationLanes;
    return selectedRecommendationSnapshot?.lanes || recommendationLanes;
  }, [recommendationLanes, selectedRecommendationSnapshot]);

  useEffect(() => {
    if (loading || recommendationCandidates.length === 0) return;
    snapshotStoreRef.current.create({
      date: selectedNewsDate,
      profileVersion: 1,
      algorithmVersion: '1.0',
      lanes: recommendationLanes,
      briefing: algorithmBriefing,
    });
    setRecommendationSnapshots(snapshotStoreRef.current.list());
  }, [loading, selectedNewsDate, recommendationCandidates.length, recommendationLanes, algorithmBriefing]);

  // 今日速报页：实时 lanes 为空时（历史日期无缓存资讯）降级到当日快照，保证历史日报可读
  const todayLanes = useMemo(() => {
    const hasLive = (recommendationLanes.public?.length || 0) + (recommendationLanes.personal?.length || 0) > 0;
    if (hasLive) return recommendationLanes;
    const snapLanes = selectedRecommendationSnapshot?.lanes;
    return snapLanes || recommendationLanes;
  }, [recommendationLanes, selectedRecommendationSnapshot]);
  const todayBriefing = useMemo(() => {
    const hasLive = algorithmBriefing && (algorithmBriefing.oneLine || algorithmBriefing.opportunities?.length || algorithmBriefing.risks?.length);
    if (hasLive) return algorithmBriefing;
    return selectedRecommendationSnapshot?.briefing || algorithmBriefing;
  }, [algorithmBriefing, selectedRecommendationSnapshot]);

  const {
    workbenchItems,
    workbenchStats,
    intelligenceProfile,
    profilePriorityItems,
    sourcePriorityItems,
  } = useWorkbenchMemos({
    todayMustRead,
    selectedDateItems,
    selectedInterests,
    followKeywords,
    recommendationFeedback,
    bookmarks,
    materials,
    categories,
    domainTiers,
    sourceTiers,
    readingProfile,
    insightData,
    isBookmarked,
    isInMaterials,
  });

  const feedbackLearningCount = useMemo(() => {
    return (recommendationFeedback.hiddenIds || []).length
      + Object.values(recommendationFeedback.boostedCategories || {}).reduce((sum, value) => sum + value, 0)
      + Object.values(recommendationFeedback.mutedSources || {}).reduce((sum, value) => sum + value, 0)
      + Object.values(recommendationFeedback.trackedTerms || {}).reduce((sum, value) => sum + value, 0);
  }, [recommendationFeedback]);

  const getRecommendationLevel = useCallback((score = 0) => {
    if (score >= 90) return { label: '强推荐', tone: 'strong' };
    if (score >= 55) return { label: '值得看', tone: 'good' };
    if (score >= 15) return { label: '可略读', tone: 'light' };
    return { label: '入选', tone: 'neutral' };
  }, []);

  const buildAiJudgement = useCallback((item) => {
    const reasons = item.recommendationReasons || [];
    const title = item.title || '';
    if (reasons.some(reason => reason.includes('追踪'))) return '与你的长期追踪主题相关，适合继续观察后续变化。';
    if (reasons.some(reason => reason.includes('关注'))) return '命中你的核心关注领域，建议优先判断它是否会形成趋势。';
    if (item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A')) return '来源质量较高，适合作为今天的可信参考材料。';
    if (/regulat|policy|安全|治理|risk|ban|law/i.test(`${title} ${item.summary || ''}`)) return '可能涉及监管、风险或安全变化，建议结合业务影响阅读。';
    if (/agent|model|芯片|算力|cloud|AI/i.test(`${title} ${item.summary || ''}`)) return '反映技术和产业落地方向，可沉淀为选题或观察点。';
    return '与今天的技术动态相关，可快速浏览后决定是否沉淀。';
  }, []);

  // TOP 5 hot items — memoized independently from workbenchItems so
  // clicking a hotspot (which calls recordReading → updates readingHistory)
  // does NOT reorder the list.
  const topMustRead = useMemo(() => {
    return workbenchItems.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedInterests, recommendationFeedback, followKeywords]);

  // Profile-based recommendations (excluding top 5, unlimited)
  const profileRecommendations = useMemo(() => {
    const topIds = new Set(topMustRead.map(i => i.id));
    return workbenchItems
      .filter(item => !topIds.has(item.id))
      .sort((a, b) => (b.mustReadScore || 0) - (a.mustReadScore || 0));
  }, [workbenchItems, topMustRead]);

  const workbenchAiInsight = useMemo(() => {
    const topItems = workbenchItems.slice(0, 3);
    const categoryCounts = workbenchItems.reduce((acc, item) => {
      const label = categories.find(cat => cat.id === item.category)?.label || item.category || '综合科技';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const leadingCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([label]) => label);
    const highQualityCount = workbenchItems.filter(item => item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A')).length;
    const trackedCount = workbenchStats.keywordMatches;
    const opportunity = leadingCategories.length
      ? `${leadingCategories.join('、')} 是今天最集中的信号，适合优先建立持续观察。`
      : '今天的资讯较分散，建议先从高质量来源快速扫读。';
    const risk = workbenchItems.some(item => /regulat|policy|治理|安全|risk|ban|case|law/i.test(`${item.title} ${item.summary || ''}`))
      ? '今日出现监管、治理或安全相关信号，建议标记为风险观察。'
      : highQualityCount >= 4
        ? '高质量来源占比较高，适合沉淀成可靠参考。'
        : '部分来源质量偏弱，建议优先看高等级来源。';
    const oneLine = leadingCategories.length
      ? `今天主要围绕 ${leadingCategories.join('、')} 展开，系统已按你的偏好收敛为 ${workbenchItems.length} 条。`
      : `系统已从当前日期资讯中收敛出 ${workbenchItems.length} 条，适合快速建立今日判断。`;

    return {
      oneLine,
      opportunity,
      risk,
      topItems,
      leadingCategories,
      highQualityCount,
      trackedCount
    };
  }, [workbenchItems, workbenchStats.keywordMatches]);

  const intelligenceAgents = useMemo(() => {
    const sourcePoolCount = selectedDateItems.length || items.length;
    const filteredOutCount = Math.max(sourcePoolCount - workbenchItems.length, 0);
    const creationReadyCount = workbenchItems.filter(item => isBookmarked(item.id) || isInMaterials(item.id) || item.imageUrl || (item.summary || '').length > 80).length;
    const memorySignals = feedbackLearningCount + followKeywords.length + selectedInterests.length;
    return [
      {
        name: '情报筛选 Agent',
        status: `${filteredOutCount} 条已过滤`,
        detail: `从 ${sourcePoolCount} 条候选中保留 ${workbenchItems.length} 条，优先看高匹配和高质量来源。`,
        tone: 'cyan'
      },
      {
        name: '解读分析 Agent',
        status: `${workbenchAiInsight.leadingCategories.length || 1} 个主信号`,
        detail: workbenchAiInsight.oneLine,
        tone: 'blue'
      },
      {
        name: '追踪记忆 Agent',
        status: `${memorySignals} 个用户信号`,
        detail: `已结合关注领域、追踪关键词和 ${feedbackLearningCount} 次反馈调整推荐。`,
        tone: 'amber'
      },
      {
        name: '创作转化 Agent',
        status: `${creationReadyCount} 条可转化`,
        detail: '可把今日资讯生成简报、选题、文章草稿或素材库条目。',
        tone: 'green'
      }
    ];
  }, [selectedDateItems, items, workbenchItems, feedbackLearningCount, followKeywords, selectedInterests, workbenchAiInsight, bookmarks, materials]);

  const profileLearningEngine = useMemo(() => {
    const categoryMap = new Map();
    const sourceMap = new Map();
    const tagMap = new Map();
    const allBehaviorItems = [
      ...readingHistory.map(item => ({ ...item, behavior: 'read', weight: 3 })),
      ...bookmarks.map(item => ({ ...item, behavior: 'saved', weight: 4 })),
      ...materials.map(item => ({ ...item, behavior: 'material', weight: 5 }))
    ];

    allBehaviorItems.forEach(item => {
      const category = item.category || item.metadata?.category || '';
      if (category) categoryMap.set(category, (categoryMap.get(category) || 0) + item.weight);
      if (item.source) sourceMap.set(item.source, (sourceMap.get(item.source) || 0) + item.weight);
      (item.tags || []).forEach(tag => {
        if (tag) tagMap.set(tag, (tagMap.get(tag) || 0) + item.weight);
      });
    });

    selectedInterests.forEach(id => categoryMap.set(id, (categoryMap.get(id) || 0) + domainTierScore(domainTiers[id])));
    Object.entries(recommendationFeedback.boostedCategories || {}).forEach(([id, count]) => categoryMap.set(id, (categoryMap.get(id) || 0) + count * 6));
    Object.entries(recommendationFeedback.trackedTerms || {}).forEach(([term, count]) => tagMap.set(term, (tagMap.get(term) || 0) + count * 5));
    followKeywords.forEach(term => tagMap.set(term, (tagMap.get(term) || 0) + 4));
    Object.entries(sourceTiers || {}).forEach(([source, tier]) => sourceMap.set(source, (sourceMap.get(source) || 0) + sourceTierScore(tier)));
    Object.entries(recommendationFeedback.mutedSources || {}).forEach(([source, count]) => sourceMap.set(source, Math.max(0, (sourceMap.get(source) || 0) - count * 8)));

    const topCategories = [...categoryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, score]) => ({
        id,
        label: categories.find(cat => cat.id === id)?.label || id,
        score: Math.round(score)
      }));
    const topSources = [...sourceMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, score]) => ({ name, score: Math.round(score) }));
    const topTags = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, score]) => ({ name, score: Math.round(score) }));

    const selectedSet = new Set(selectedInterests);
    const readCategorySet = new Set(readingHistory.map(item => item.category).filter(Boolean));
    const blindSpots = categories
      .filter(cat => cat.id !== 'all' && !selectedSet.has(cat.id) && !readCategorySet.has(cat.id))
      .slice(0, 4)
      .map(cat => cat.label);

    const materialRatio = allBehaviorItems.length ? Math.round(materials.length / Math.max(allBehaviorItems.length, 1) * 100) : 0;
    const savedRatio = readingHistory.length ? Math.round(bookmarks.length / Math.max(readingHistory.length, 1) * 100) : 0;
    const recentReads = readingHistory.filter(item => Date.now() - new Date(item.readAt || 0).getTime() < 7 * 24 * 60 * 60 * 1000);
    const multimediaReads = readingHistory.filter(item => item.imageUrl || item.videoUrl).length;
    const behaviorDepth = materials.length >= bookmarks.length && materials.length > 0
      ? '资产沉淀型'
      : savedRatio >= 50
        ? '收藏复盘型'
        : recentReads.length >= 6
          ? '高频扫描型'
          : '探索校准型';

    const confidence = Math.min(96, Math.round(
      Math.min(readingHistory.length, 30) * 1.4
      + Math.min(bookmarks.length, 20) * 1.3
      + Math.min(materials.length, 20) * 1.8
      + selectedInterests.length * 3
      + followKeywords.length * 1.8
      + feedbackLearningCount * 2
    ));
    const confidenceLabel = confidence >= 75 ? '高可信' : confidence >= 45 ? '持续学习中' : '需要校准';
    const dominantCategory = topCategories[0]?.label || '综合科技';
    const dominantSource = topSources[0]?.name || '多来源';
    const dominantTag = topTags[0]?.name || followKeywords[0] || '关键趋势';
    const summary = confidence >= 45
      ? `系统判断你当前更偏向「${dominantCategory}」与「${dominantTag}」，信任来源集中在「${dominantSource}」，推荐会优先保留高质量、可沉淀的信息。`
      : '系统仍在学习你的偏好。建议先设置关注领域、阅读几条推荐并收藏/沉淀重要内容。';

    const explanation = [
      topCategories[0] ? `领域权重最高：${topCategories[0].label}` : '',
      topSources[0] ? `信任来源最高：${topSources[0].name}` : '',
      topTags[0] ? `记忆关键词：${topTags.slice(0, 3).map(item => item.name).join('、')}` : '',
      recommendationFeedback.mutedSources && Object.keys(recommendationFeedback.mutedSources).length ? `已降低 ${Object.keys(recommendationFeedback.mutedSources).slice(0, 2).join('、')} 的权重` : ''
    ].filter(Boolean);

    const nextActions = [
      blindSpots.length ? `补看 ${blindSpots.slice(0, 2).join('、')}，避免信息茧房` : '',
      topTags.length ? `持续追踪 ${topTags.slice(0, 2).map(item => item.name).join('、')}` : '',
      materialRatio < 15 && bookmarks.length > 0 ? '把收藏中的关键内容沉淀为素材' : '',
      confidence < 45 ? '先校准 3 个关注领域和 2 个高信任来源' : ''
    ].filter(Boolean).slice(0, 3);

    return {
      confidence,
      confidenceLabel,
      summary,
      behaviorDepth,
      topCategories,
      topSources,
      topTags,
      blindSpots,
      explanation,
      nextActions,
      savedRatio,
      materialRatio,
      recentReadCount: recentReads.length,
      multimediaReads
    };
  }, [readingHistory, bookmarks, materials, selectedInterests, domainTiers, recommendationFeedback, followKeywords, sourceTiers, feedbackLearningCount, categories]);

  const todayProfileSnapshot = useMemo(() => ({
    date: selectedNewsDate,
    focus: intelligenceProfile.focusLabels.slice(0, 5),
    tracked: intelligenceProfile.tracked.slice(0, 5),
    depth: intelligenceProfile.depth,
    outputGoal: intelligenceProfile.outputGoal,
    confidence: profileLearningEngine.confidence,
    learningSummary: profileLearningEngine.summary,
    behaviorDepth: profileLearningEngine.behaviorDepth,
    blindSpots: profileLearningEngine.blindSpots.slice(0, 3),
    nextActions: profileLearningEngine.nextActions.slice(0, 3),
    reads: readingHistory.length,
    saved: bookmarks.length,
    materials: materials.length,
    sources: sourcePriorityItems.slice(0, 3).map(s => s.name)
  }), [selectedNewsDate, intelligenceProfile, profileLearningEngine, readingHistory.length, bookmarks.length, materials.length, sourcePriorityItems]);

  const profileCalibrationSignals = useMemo(() => {
    const highDomainCount = profilePriorityItems.filter(item => item.tier === 'focus').length;
    const highSourceCount = sourcePriorityItems.filter(item => item.tier === 'focus').length;
    const clickedCategories = [...new Set(readingHistory.map(item => item.category).filter(Boolean))].length;
    return [
      { label: '高优先领域', value: highDomainCount, desc: '优先影响每日汇报排序' },
      { label: '高信任来源', value: highSourceCount, desc: '提高对应信号源权重' },
      { label: '阅读领域记忆', value: clickedCategories, desc: '从点击行为学习偏好' },
      { label: '收藏沉淀', value: bookmarks.length, desc: '强化可复用主题和来源' }
    ];
  }, [profilePriorityItems, sourcePriorityItems, readingHistory, bookmarks.length]);

  useEffect(() => {
    if (!todayProfileSnapshot.date) return;
    setDailyProfileSnapshots(prev => {
      const existing = prev.find(item => item.date === todayProfileSnapshot.date);
      if (existing && !existing.auto) return prev;
      const nextSnapshot = { ...todayProfileSnapshot, generatedAt: new Date().toISOString(), auto: true };
      if (existing) {
        const comparableExisting = { ...existing, generatedAt: undefined };
        const comparableNext = { ...nextSnapshot, generatedAt: undefined };
        if (JSON.stringify(comparableExisting) === JSON.stringify(comparableNext)) return prev;
      }
      const next = [
        nextSnapshot,
        ...prev.filter(item => item.date !== todayProfileSnapshot.date)
      ].slice(0, 30);
      return next;
    });
  }, [todayProfileSnapshot]);

  const intelligenceMissions = useMemo(() => [
    {
      id: 'briefing',
      agentId: 'orchestrator',
      label: '生成今日作战简报',
      prompt: '请作为情报总控，基于今日推荐生成一份个人作战简报：一句话总判断、三个最重要信号、优先阅读顺序、今天应该采取的下一步动作。'
    },
    {
      id: 'impact',
      agentId: 'analyst',
      label: '解释对我的影响',
      prompt: '请结合我的关注画像，解释今日资讯对我关注领域的影响：哪些是真机会，哪些只是噪声，哪些需要进一步验证。'
    },
    {
      id: 'memory',
      agentId: 'memory-agent',
      label: '更新追踪记忆',
      prompt: '请作为追踪记忆官，把今日资讯和我的历史偏好连接起来：应新增哪些追踪关键词、降低哪些来源权重、下次推荐应如何调整。'
    },
    {
      id: 'risk',
      agentId: 'risk-scout',
      label: '扫描潜在风险',
      prompt: '请作为风险雷达，找出今日资讯中的政策、市场、技术路线、安全和竞争风险，并区分确定事实、合理推断和仍需观察的信号。'
    },
    {
      id: 'creation',
      agentId: 'creation-agent',
      label: '转成创作选题',
      prompt: '请作为创作转化官，从今日资讯中提炼 5 个可写选题，每个选题给出标题、核心观点、素材来源和适合的文章结构。'
    }
  ], []);

  const aiActionPrompts = useMemo(() => intelligenceMissions.slice(0, 4), [intelligenceMissions]);

  const { workflowTypeMeta, workflowRunStatusMeta, selectedWorkflowNode, selectedWorkflowConnections, enabledWorkflowNodes } = useWorkflowMeta(agentWorkflowDraft, selectedWorkflowNodeId);

  const workflowBlueprintText = useMemo(() => {
    return `${agentWorkflowDraft.name}
${agentWorkflowDraft.description}

${agentWorkflowDraft.nodes.map((node, index) => `${index + 1}. [${workflowTypeMeta[node.type]?.label || node.type}] ${node.title}
角色：${node.role}
输入：${node.inputKey || 'context'}
输出：${node.outputKey || `step_${index + 1}`}
能力配置：${formatWorkflowNodeConfig(node) || '默认'}
指令：${node.prompt}
状态：${node.enabled === false ? '停用' : '启用'}`).join('\n\n')}`;
  }, [agentWorkflowDraft, workflowTypeMeta]);

  const {
    updateWorkflowDraft,
    switchWorkflowTemplate,
    saveWorkflowAsTemplate,
    installWorkflowTemplate,
    importWorkflowJson,
    deleteWorkflowTemplate,
    updateWorkflowNode,
    reorderWorkflowNode,
    moveWorkflowNode,
    addWorkflowNode,
    removeWorkflowNode,
    resetWorkflowDraft,
    exportWorkflowToMaterials,
    downloadWorkflowJson,
    exportWorkflowResultToEditor,
  } = useWorkflowOps({
    agentWorkflowDraft,
    setAgentWorkflowDraft,
    workflowTemplates,
    setWorkflowTemplates,
    activeWorkflowId,
    setActiveWorkflowId,
    workflowTypeMeta,
    newWorkflowNodeType,
    selectedWorkflowNodeId,
    setSelectedWorkflowNodeId,
    addManualMaterial,
    agentWorkflowResult,
    agentWorkflowRun,
    workflowBlueprintText,
    setArticles,
    setCurrentArticleId,
    setNav,
    workflowImportInputRef,
  });

  useEffect(() => {
    if (!agentWorkflowDraft?.nodes?.length) return;
    setWorkflowTemplates(prev => {
      const draftId = activeWorkflowId || agentWorkflowDraft.id || 'default-workflow';
      const nextDraft = { ...agentWorkflowDraft, id: draftId, updatedAt: new Date().toISOString() };
      if (!prev.some(template => template.id === draftId)) return [...prev, nextDraft];
      return prev.map(template => template.id === draftId ? nextDraft : template);
    });
  }, [agentWorkflowDraft, activeWorkflowId]);

  const agentWorkflowScopes = useMemo(() => [
    { id: 'daily', label: '今日', desc: `${workbenchItems.length} 条推荐` },
    { id: 'focus', label: '关注', desc: `${workbenchStats.focusMatches} 条匹配` },
    { id: 'saved', label: '沉淀', desc: `${workbenchStats.savedCount} 条已存` }
  ], [workbenchItems.length, workbenchStats.focusMatches, workbenchStats.savedCount]);

  const scopedAgentItems = useMemo(() => {
    if (agentWorkflowScope === 'focus') {
      const focused = workbenchItems.filter(item => selectedInterests.includes(item.category));
      return focused.length ? focused : workbenchItems;
    }
    if (agentWorkflowScope === 'saved') {
      const saved = workbenchItems.filter(item => isBookmarked(item.id) || isInMaterials(item.id));
      return saved.length ? saved : workbenchItems;
    }
    return workbenchItems;
  }, [agentWorkflowScope, workbenchItems, selectedInterests, bookmarks, materials]);

  const workflowValidation = useMemo(() => {
    const nodes = Array.isArray(agentWorkflowDraft.nodes) ? agentWorkflowDraft.nodes : [];
    const enabledNodes = nodes.filter(node => node.enabled !== false);
    const outputKeys = new Set();
    const checks = [];
    const addCheck = (id, label, ok, blocking = false, detail = '') => {
      checks.push({ id, label, ok, blocking, detail });
    };

    addCheck('enabled-nodes', '至少启用一个节点', enabledNodes.length > 0, true, `${enabledNodes.length} 个启用节点`);
    addCheck('output-node', '包含最终输出节点', enabledNodes.some(node => node.type === 'output'), true, '需要 output 节点承接结果');
    addCheck('llm-config', '大模型节点具备运行配置', !enabledNodes.some(node => node.type === 'llm') || Boolean(llmConfig.baseUrl && llmConfig.selectedModel), true, llmConfig.selectedModel || '未选择模型');
    addCheck('context-items', '当前范围有可分析资讯', scopedAgentItems.length > 0, false, `${scopedAgentItems.length} 条资讯`);
    addCheck('profile-signal', '画像有偏好或行为依据', selectedInterests.length > 0 || readingHistory.length > 0 || bookmarks.length > 0 || materials.length > 0, false, `${selectedInterests.length} 个关注领域`);
    addCheck('template-identity', '工作流名称与目标完整', Boolean(String(agentWorkflowDraft.name || '').trim() && String(agentWorkflowDraft.description || '').trim()), false, '便于导出和复用');

    enabledNodes.forEach((node, index) => {
      const title = String(node.title || '').trim();
      const role = String(node.role || '').trim();
      const prompt = String(node.prompt || '').trim();
      const inputKey = String(node.inputKey || '').trim();
      const outputKey = String(node.outputKey || '').trim();
      const missing = [
        !title ? '标题' : '',
        !role ? '职责' : '',
        !prompt ? 'Prompt' : ''
      ].filter(Boolean);
      addCheck(`node-required-${node.id}`, `${index + 1}. ${title || '未命名节点'} 基础配置`, missing.length === 0, true, missing.length ? `缺少 ${missing.join('、')}` : '已填写');
      addCheck(`node-io-${node.id}`, `${index + 1}. ${title || '未命名节点'} 输入输出变量`, Boolean(inputKey && outputKey), false, inputKey && outputKey ? `${inputKey} -> ${outputKey}` : '建议填写 inputKey / outputKey');
      if (node.type === 'skill') {
        const skillId = node.skillId || 'evidence-pack';
        addCheck(`node-skill-${node.id}`, `${index + 1}. ${title || '工具节点'} 已选择内置能力`, isWorkflowSkillId(skillId), true, getWorkflowSkillMeta(skillId)?.label || '未选择 Skill');
      }
      if (node.type === 'condition') {
        const conditionMetricOk = WORKFLOW_CONDITION_METRICS.some(item => item.id === (node.conditionMetric || 'itemCount'));
        const conditionOperatorOk = WORKFLOW_CONDITION_OPERATORS.some(item => item.id === (node.conditionOperator || '>='));
        const conditionValueOk = Number.isFinite(Number(node.conditionValue ?? 1));
        addCheck(`node-condition-${node.id}`, `${index + 1}. ${title || '条件节点'} 规则可执行`, conditionMetricOk && conditionOperatorOk && conditionValueOk, true, formatWorkflowNodeConfig(node));
      }
      if (node.type === 'classifier') {
        const labels = String(node.classifierLabels || '').split(',').map(item => item.trim()).filter(Boolean);
        addCheck(`node-classifier-${node.id}`, `${index + 1}. ${title || '分类节点'} 分类桶完整`, labels.length >= 2, false, labels.length ? labels.join(' / ') : '建议至少 2 个分类');
      }
      if (outputKey) {
        addCheck(`node-unique-output-${node.id}`, `${index + 1}. ${title || '未命名节点'} 输出变量不重复`, !outputKeys.has(outputKey), true, outputKey);
        outputKeys.add(outputKey);
      }
    });

    const blockingIssues = checks.filter(check => check.blocking && !check.ok);
    const warnings = checks.filter(check => !check.blocking && !check.ok);

    return {
      checks,
      blockingIssues,
      warnings,
      ready: blockingIssues.length === 0,
      score: Math.round((checks.filter(check => check.ok).length / Math.max(checks.length, 1)) * 100)
    };
  }, [agentWorkflowDraft, llmConfig.baseUrl, llmConfig.selectedModel, scopedAgentItems.length, selectedInterests.length, readingHistory.length, bookmarks.length, materials.length]);

  const buildWorkbenchContext = useCallback((prompt) => {
    const topItems = scopedAgentItems.slice(0, 8);
    const lines = topItems.map((item, idx) => {
      const reasons = item.recommendationReasons?.length ? item.recommendationReasons.join('、') : item.recommendation || '综合推荐';
      return `${idx + 1}. ${item.title}
来源：${item.source || '未知'}｜分类：${item.category || '未分类'}｜质量：${item.sourceGradeLabel || '未评级'}｜推荐分：${Math.round(item.mustReadScore || 0)}
推荐理由：${reasons}
摘要：${item.summary || '暂无摘要'}
链接：${item.url || ''}`;
    }).join('\n\n');
    const normalizedMaterials = materials.flatMap(material => {
      try { return [normalizeAsset(material)]; } catch { return []; }
    });
    const prioritizedMaterials = normalizedMaterials.sort((a, b) => {
      const aElf = isAiElfAsset(a) ? 1 : 0;
      const bElf = isAiElfAsset(b) ? 1 : 0;
      if (aElf !== bElf) return bElf - aElf;
      return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0);
    }).slice(0, 6);
    const materialLines = prioritizedMaterials.map((material, idx) => `${idx + 1}. ${material.title || '未命名素材'}
来源：${material.source || '未知'}｜类型：${material.type || 'material'}｜标签：${Array.isArray(material.tags) ? material.tags.join('、') : ''}
内容：${String(material.fullContent || material.content || '').replace(/\s+/g, ' ').slice(0, 900)}`).join('\n\n');

    return `${prompt}

日期：${selectedNewsDate || new Date().toISOString().slice(0, 10)}
关注领域：${selectedInterests.map(id => categories.find(c => c.id === id)?.label || id).join('、') || '未设置'}
追踪关键词：${followKeywords.join('、') || '未设置'}
用户画像：
- 当前深度：${intelligenceProfile.depth}
- 输出目标：${intelligenceProfile.outputGoal}
- 重点关注：${intelligenceProfile.focusLabels.join('、') || '未设置'}
- 最近强化：${intelligenceProfile.boosted.join('、') || '暂无'}
- 降权来源：${intelligenceProfile.muted.join('、') || '暂无'}
- 记忆关键词：${intelligenceProfile.tracked.join('、') || '暂无'}
推荐统计：当前范围 ${scopedAgentItems.length} 条，全部推荐 ${workbenchItems.length} 条，兴趣匹配 ${workbenchStats.focusMatches} 条，关键词命中 ${workbenchStats.keywordMatches} 条

今日推荐资讯：
${lines}

素材库上下文（优先包含 AI 精灵交接记录）：
${materialLines || '暂无素材'}`;
  }, [scopedAgentItems, workbenchItems.length, selectedNewsDate, selectedInterests, followKeywords, intelligenceProfile, workbenchStats.focusMatches, workbenchStats.keywordMatches, materials]);

  const sendWorkbenchToElf = useCallback((prompt, agentId = 'orchestrator') => {
    if (agentId) setCurrentAgent(agentId);
    setElfQuotedContext({
      id: Date.now(),
      title: '今日情报工作台',
      agentId,
      content: buildWorkbenchContext(prompt),
      suggestedPrompt: prompt
    });
    showToast('已把今日情报交给智能体');
  }, [buildWorkbenchContext]);

  const sendCopilotAbout = useCallback((item) => {
    const msg = `请分析这条资讯：「${item.title}」——来源：${item.sourceName || item.source || '未知'}，分类：${item.category || '未分类'}，推荐理由：${item.recommendation || '综合推荐'}。请给出要点分析和跟我关注领域的关联。`;
    setCopilotPendingMessage(msg);
  }, []);

  const generateDailyProfileSnapshot = useCallback(() => {
    setDailyProfileSnapshots(prev => {
      const next = [
        { ...todayProfileSnapshot, generatedAt: new Date().toISOString() },
        ...prev.filter(item => item.date !== todayProfileSnapshot.date)
      ].slice(0, 30);
      return next;
    });
    showToast('今日用户画像已记录');
  }, [todayProfileSnapshot]);

  const restoreAgentWorkflowHistory = useCallback((record) => {
    if (!record) return;
    setAgentWorkflowResult({
      loading: false,
      content: record.content || '',
      error: record.error || '',
      missionId: record.missionId || ''
    });
    setAgentWorkflowRun({
      id: record.id || '',
      status: record.status || 'completed',
      missionLabel: record.missionLabel || '历史运行',
      startedAt: record.startedAt || '',
      finishedAt: record.finishedAt || '',
      trace: record.trace || []
    });
    setAgentWorkflowActions(record.actions || []);
    setAgentWorkflowPrompt(record.prompt || '');
    showToast('已恢复工作流历史结果');
  }, []);

  const clearAgentWorkflowHistory = useCallback(() => {
    setAgentWorkflowHistory([]);
    showToast('已清空工作流运行历史');
  }, []);

  const createWorkflowActions = useCallback(({ runId, mission, prompt, content, nodeOutputs }) => {
    const candidates = scopedAgentItems.slice(0, 5);
    const deriveWorkflowTerm = (item) => {
      const tags = item.tags || [];
      const preferredTag = tags.find(tag => tag && tag.length >= 2 && tag.length <= 24);
      if (preferredTag) return preferredTag;
      const titleWords = (item.title || '').match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,6}/g) || [];
      return titleWords[0] || item.category || item.source || '';
    };
    const materialItems = candidates
      .filter(item => !materials.some(m => m.originalItemId === item.id))
      .slice(0, 3);
    const termCandidates = [...new Set([
      ...candidates.flatMap(item => item.tags || []),
      ...candidates.map(item => deriveWorkflowTerm(item)),
      ...intelligenceProfile.tracked
    ])].filter(Boolean).slice(0, 6);
    const actions = [];

    materialItems.forEach(item => {
      actions.push({
        id: `${runId}-material-${item.id}`,
        type: 'material',
        label: '沉淀素材',
        title: item.title,
        desc: item.summary || item.recommendation || '保存为智创中心素材，供后续智能体和内容创作复用。',
        itemId: item.id,
        status: 'pending'
      });
    });

    termCandidates
      .filter(term => !followKeywords.includes(term))
      .slice(0, 3)
      .forEach(term => {
        actions.push({
          id: `${runId}-track-${term}`,
          type: 'track',
          label: '追踪记忆',
          title: term,
          desc: '加入用户画像追踪词，后续每日汇报和智能体会提高相关信号权重。',
          term,
          status: 'pending'
        });
      });

    if (content) {
      actions.push({
        id: `${runId}-article`,
        type: 'article',
        label: '生成草稿',
        title: `${mission.label || '智能体任务'} · ${new Date().toLocaleDateString('zh-CN')}`,
        desc: '把本次智能体结果转成内容创作草稿，继续编辑并导出为私有知识库资产。',
        content,
        prompt,
        status: 'pending'
      });
    }

    actions.push({
      id: `${runId}-profile`,
      type: 'profile',
      label: '记录画像',
      title: '生成今日画像快照',
      desc: `记录本次工作流中的关注领域、追踪词、素材数量和输出目标，形成“越用越懂你”的日期记忆。`,
      status: 'pending'
    });

    const hasMediaAudit = nodeOutputs?.some(output => output.structured?.mediaAudit);
    if (hasMediaAudit) {
      actions.push({
        id: `${runId}-media-audit`,
        type: 'note',
        label: '多媒体审计',
        title: '保存图片/视频质量审计',
        desc: '保存缺图、重复图片和可引用链接信息，帮助后续优化资讯卡片多媒体质量。',
        content: nodeOutputs
          .filter(output => output.structured?.mediaAudit)
          .map(output => `${output.title}\n${JSON.stringify(output.structured.mediaAudit, null, 2)}`)
          .join('\n\n'),
        status: 'pending'
      });
    }

    return actions.slice(0, 8);
  }, [scopedAgentItems, materials, followKeywords, intelligenceProfile.tracked]);

  const updateWorkflowActionStatus = useCallback((actionId, status) => {
    setAgentWorkflowActions(prev => prev.map(action => action.id === actionId ? { ...action, status } : action));
    setAgentWorkflowHistory(prev => prev.map(record => ({
      ...record,
      actions: (record.actions || []).map(action => action.id === actionId ? { ...action, status } : action)
    })));
  }, []);

  const executeWorkflowAction = useCallback((action) => {
    if (!action || action.status === 'done') return;
    if (action.type === 'material') {
      const item = scopedAgentItems.find(candidate => candidate.id === action.itemId) || items.find(candidate => candidate.id === action.itemId);
      if (!item) {
        showToast('未找到原始资讯，无法沉淀素材');
        return;
      }
      if (!materials.some(m => m.originalItemId === item.id)) {
        const newMaterial = {
          id: Date.now(),
          type: detectMaterialType(item),
          title: item.title,
          content: item.summary || item.recommendation || item.title,
          fullContent: item.content || item.summary || item.title,
          source: item.source || '智能体工作流',
          url: item.url || '',
          tags: [...new Set([...(item.tags || []), '智能体'])],
          originalItemId: item.id,
          note: '由智能体行动队列沉淀',
          createdAt: new Date().toISOString()
        };
        setMaterials(prev => [...prev, newMaterial]);
      }
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已沉淀到素材库');
      return;
    }

    if (action.type === 'track') {
      const term = action.term || action.title;
      if (!term) return;
      setFollowKeywords(prev => prev.includes(term) ? prev : [term, ...prev].slice(0, 20));
      setRecommendationFeedback(prev => ({
        ...prev,
        trackedTerms: {
          ...(prev.trackedTerms || {}),
          [term]: ((prev.trackedTerms || {})[term] || 0) + 1
        }
      }));
      updateWorkflowActionStatus(action.id, 'done');
      showToast(`已开始追踪「${term}」`);
      return;
    }

    if (action.type === 'article') {
      const newArticle = {
        id: Date.now(),
        title: action.title || `智能体草稿 · ${new Date().toLocaleDateString('zh-CN')}`,
        content: `# ${action.title || '智能体草稿'}\n\n## 任务\n${action.prompt || agentWorkflowPrompt || '智能体工作流'}\n\n## 输出\n${action.content || agentWorkflowResult.content || ''}`,
        template: 'blank',
        materials: [],
        tags: ['智能体', '工作流'],
        status: 'draft',
        spaceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        images: []
      };
      setArticles(prev => [newArticle, ...prev]);
      setCurrentArticleId(newArticle.id);
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已生成内容创作草稿');
      return;
    }

    if (action.type === 'profile') {
      setDailyProfileSnapshots(prev => [
        { ...todayProfileSnapshot, generatedAt: new Date().toISOString(), workflowRunId: agentWorkflowRun.id || '' },
        ...prev.filter(item => item.date !== todayProfileSnapshot.date)
      ].slice(0, 30));
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已记录今日画像快照');
      return;
    }

    if (action.type === 'note') {
      addManualMaterial({
        title: action.title,
        content: action.content || action.desc,
        type: 'analysis',
        source: '智能体行动队列',
        url: '',
        tags: '智能体,多媒体审计',
        note: action.desc,
        spaceId: null
      });
      updateWorkflowActionStatus(action.id, 'done');
      showToast('已保存审计记录');
    }
  }, [scopedAgentItems, items, materials, detectMaterialType, updateWorkflowActionStatus, agentWorkflowPrompt, agentWorkflowResult.content, todayProfileSnapshot, agentWorkflowRun.id]);

  // (useBookmarkMaterial moved above useArticleEditor — provides materials which the latter consumes)

  const runAgentWorkflow = useCallback(async (mission, customPrompt = '') => {
    const selectedMission = mission || intelligenceMissions[0];
    if (!selectedMission) return;
    const agent = agents.find(a => a.id === selectedMission.agentId) || agents.find(a => a.id === 'orchestrator') || agents[0];
    const workflowNodes = enabledWorkflowNodes.length ? enabledWorkflowNodes : agentWorkflowDraft.nodes;
    const blueprintSummary = workflowNodes.map((node, index) => `${index + 1}. ${node.title}｜${node.role}｜${node.prompt}`).join('\n');
    const prompt = customPrompt.trim() || selectedMission.prompt;
    const runId = `run-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const baseTrace = workflowNodes.map((node, index) => ({
      id: `${runId}-${node.id}`,
      nodeId: node.id,
      title: node.title,
      type: node.type,
      order: index + 1,
      status: index === 0 ? 'running' : 'queued',
      detail: node.role,
      prompt: node.prompt,
      inputKey: node.inputKey || (index === 0 ? 'context' : `step_${index}`),
      outputKey: node.outputKey || `step_${index + 1}`
    }));

    if (!workflowValidation.ready) {
      const issueText = workflowValidation.blockingIssues.map(issue => `- ${issue.label}：${issue.detail || '未通过'}`).join('\n');
      setCurrentAgent(agent?.id || 'orchestrator');
      setAgentWorkflowPrompt(prompt);
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: `工作流尚未就绪，请先处理以下问题：\n${issueText}`,
        missionId: selectedMission.id
      });
      setAgentWorkflowRun({
        id: runId,
        status: 'blocked',
        missionLabel: selectedMission.label,
        startedAt,
        finishedAt: new Date().toISOString(),
        trace: baseTrace.map((step, index) => ({
          ...step,
          status: index === 0 ? 'blocked' : 'skipped',
          detail: index === 0 ? workflowValidation.blockingIssues[0]?.label || '工作流未就绪' : step.detail
        }))
      });
      if (workflowValidation.blockingIssues.some(issue => issue.id === 'llm-config')) setShowLlmQuickConfig(true);
      return;
    }

    setCurrentAgent(agent?.id || 'orchestrator');
    setAgentWorkflowPrompt(prompt);
    setAgentWorkflowResult({ loading: true, content: '', error: '', missionId: selectedMission.id });
    setAgentWorkflowRun({
      id: runId,
      status: 'running',
      missionLabel: selectedMission.label,
      startedAt,
      finishedAt: '',
      trace: baseTrace
    });

    const requiresLlm = workflowNodes.some(node => node.type === 'llm');
    if (requiresLlm && (!llmConfig.baseUrl || !llmConfig.selectedModel)) {
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: '请先配置大模型，才能运行智能体工作流。',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'blocked',
        finishedAt: new Date().toISOString(),
        trace: prev.trace.map((step, index) => ({
          ...step,
          status: index === 0 ? 'blocked' : 'skipped',
          detail: index === 0 ? '等待配置大模型后继续运行。' : step.detail
        }))
      }));
      setShowLlmQuickConfig(true);
      return;
    }

    const systemPrompt = `${agent?.systemPrompt || '你是个人情报智能体。'}

你正在宽屏智能体工作流中工作，不是闲聊窗口。请基于用户画像、今日推荐资讯和任务目标输出可执行结果。
要求：
1. 先给一句话结论和优先级。
2. 明确事实、推断、不确定性。
3. 输出下一步动作，能进入追踪、阅读或创作。
4. 回答结构清晰，避免泛泛总结。`;

    let localTrace = baseTrace.map(step => ({ ...step }));
    let activeNodeId = '';

    const setTraceStep = (nodeId, patch) => {
      localTrace = localTrace.map(step => step.nodeId === nodeId ? { ...step, ...patch } : step);
      setAgentWorkflowRun(prev => ({
        ...prev,
        trace: prev.trace.map(step => step.nodeId === nodeId ? { ...step, ...patch } : step)
      }));
    };

    const getCategoryLabel = (categoryId) => categories.find(c => c.id === categoryId)?.label || categoryId || '未分类';
    const trackedTerms = intelligenceProfile.tracked || [];
    const mediaItems = scopedAgentItems.filter(item => item.imageUrl || item.videoUrl);
    const savedScopedItems = scopedAgentItems.filter(item =>
      bookmarks.some(b => b.itemId === item.id) || materials.some(m => m.originalItemId === item.id)
    );
    const materialCandidates = scopedAgentItems.filter(item => !materials.some(m => m.originalItemId === item.id)).slice(0, 5);
    const formatItemLine = (item, index) => {
      const score = Number.isFinite(item.mustReadScore) ? Math.round(item.mustReadScore) : 0;
      return `${index + 1}. ${item.title}｜${item.source || '未知来源'}｜${getCategoryLabel(item.category)}｜推荐分 ${score}`;
    };
    const formatItemLinks = (list) => list.map((item, index) => `${index + 1}. ${item.title}（${item.source || '未知来源'}）${item.url ? `\n   ${item.url}` : ''}`).join('\n');
    const workflowMetrics = {
      itemCount: scopedAgentItems.length,
      mediaCount: mediaItems.length,
      materialCount: materials.length,
      savedCount: savedScopedItems.length,
      focusCount: scopedAgentItems.filter(item => selectedInterests.includes(item.category)).length,
      githubCount: scopedAgentItems.filter(item =>
        /github/i.test(`${item.source || ''} ${item.url || ''} ${item.category || ''}`)
      ).length
    };
    const compareWorkflowMetric = (left, operator, right) => {
      switch (operator) {
        case '>': return left > right;
        case '<': return left < right;
        case '<=': return left <= right;
        case '==': return left === right;
        case '>=':
        default:
          return left >= right;
      }
    };
    const buildEvidencePack = () => {
      const evidenceLinks = scopedAgentItems.slice(0, 6);
      return {
        evidenceLinks,
        output: `证据包整理完成：\n${formatItemLinks(evidenceLinks) || '暂无可引用链接'}\n\n已保留来源、分类、摘要、推荐分和原文链接，后续节点可以直接引用。`
      };
    };
    const buildMediaAudit = () => {
      const imageUrls = mediaItems.map(item => item.imageUrl).filter(Boolean);
      const duplicateImages = imageUrls.filter((url, index) => imageUrls.indexOf(url) !== index);
      const missingMedia = Math.max(0, scopedAgentItems.length - mediaItems.length);
      return {
        imageUrls,
        duplicateImages,
        mediaAudit: {
          imageCount: imageUrls.length,
          videoCount: mediaItems.filter(item => item.videoUrl).length,
          missingMediaCount: missingMedia,
          duplicateImageCount: new Set(duplicateImages).size
        },
        output: `多媒体审计完成：图片 ${imageUrls.length} 条，视频 ${mediaItems.filter(item => item.videoUrl).length} 条，缺少多媒体 ${missingMedia} 条，重复图片 ${new Set(duplicateImages).size} 条。\n建议优先补齐高推荐分卡片的正文图片，避免使用 logo、favicon 或站点默认图。`
      };
    };
    const buildMaterialExtraction = () => {
      const candidates = materialCandidates.slice(0, 5);
      const lines = candidates.map((item, index) => {
        const type = item.imageUrl ? '图文素材' : (item.summary || '').length > 120 ? '观点素材' : '线索素材';
        return `${index + 1}. ${type}｜${item.title}｜${item.source || '未知来源'}`;
      }).join('\n');
      return {
        candidates,
        output: `素材候选提取完成：${candidates.length} 条。\n${lines || '暂无新的素材候选'}\n\n这些素材可以进入素材库，继续支撑智能体分析和内容创作。`
      };
    };
    const buildProfileMemory = () => {
      const terms = [...new Set([
        ...trackedTerms,
        ...scopedAgentItems.slice(0, 5).flatMap(item => item.tags || []),
        ...scopedAgentItems.slice(0, 3).map(item => getCategoryLabel(item.category))
      ])].filter(Boolean).slice(0, 8);
      return {
        terms,
        output: `画像记忆建议：\n- 建议追踪：${terms.join('、') || '暂无'}\n- 强化领域：${intelligenceProfile.focusLabels.join('、') || '未设置'}\n- 本次行为依据：${scopedAgentItems.length} 条资讯、${savedScopedItems.length} 条收藏/素材命中、${mediaItems.length} 条多媒体线索。`
      };
    };
    const buildArticleOutline = () => {
      const topReads = scopedAgentItems.slice(0, 3);
      return {
        topReads,
        output: `文章草稿架构：\n# ${selectedMission.label || '智能体选题'}\n\n## 核心论点\n基于今日高价值信号，提炼一个清晰判断，而不是罗列资讯。\n\n## 可用素材\n${topReads.map((item, index) => `${index + 1}. ${item.title}｜${item.source || '未知来源'}`).join('\n') || '暂无'}\n\n## 建议结构\n背景 -> 关键事实 -> 对用户的影响 -> 风险与不确定性 -> 下一步行动。`
      };
    };
    const buildGithubEvaluation = () => {
      const repos = scopedAgentItems
        .filter(item => /github/i.test(`${item.source || ''} ${item.url || ''} ${item.category || ''}`))
        .slice(0, 5);
      const targets = repos.length ? repos : scopedAgentItems.slice(0, 5);
      return {
        repos: targets,
        output: `GitHub 项目评估：\n${targets.map((item, index) => `${index + 1}. ${item.title}\n   用途判断：${item.summary || item.recommendation || '需要结合 README 继续分析'}\n   应用场景：可作为技术选型、原型验证或知识库素材。\n   证据：${item.url || '暂无链接'}`).join('\n') || '暂无项目'}`
      };
    };

    const runLocalNode = (node, previousOutput) => {
      const sourceItems = scopedAgentItems.slice(0, 5).map(formatItemLine).join('\n');
      if (node.type === 'input') {
        const categoryMap = scopedAgentItems.reduce((acc, item) => {
          const key = getCategoryLabel(item.category);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        return {
          output: `已载入输入上下文：\n- 日期：${selectedNewsDate}\n- 范围：${agentWorkflowScope}\n- 推荐资讯：${scopedAgentItems.length} 条\n- 关注领域：${intelligenceProfile.focusLabels.join('、') || '未设置'}\n- 收藏/素材命中：${savedScopedItems.length} 条\n- 多媒体线索：${mediaItems.length} 条\n\n领域分布：${Object.entries(categoryMap).map(([name, count]) => `${name} ${count}`).join('、') || '暂无'}\n\n优先素材：\n${sourceItems || '暂无'}`,
          structured: {
            date: selectedNewsDate,
            scope: agentWorkflowScope,
            itemCount: scopedAgentItems.length,
            focus: intelligenceProfile.focusLabels,
            categories: categoryMap,
            mediaCount: mediaItems.length,
            savedCount: savedScopedItems.length
          }
        };
      }
      if (node.type === 'classifier') {
        const labels = String(node.classifierLabels || '必读,追踪,素材,创作,降噪').split(',').map(item => item.trim()).filter(Boolean);
        const mustRead = scopedAgentItems
          .filter(item => (item.mustReadScore || 0) >= 65 || item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A'))
          .slice(0, 4);
        const followUp = scopedAgentItems
          .filter(item => trackedTerms.some(term => `${item.title} ${item.summary}`.toLowerCase().includes(term.toLowerCase())))
          .slice(0, 4);
        const materialReady = scopedAgentItems
          .filter(item => item.imageUrl || item.videoUrl || (item.summary || '').length > 100 || savedScopedItems.some(saved => saved.id === item.id))
          .slice(0, 5);
        const creationReady = scopedAgentItems
          .filter(item => (item.summary || '').length > 120 || (item.recommendationReasons || []).some(reason => /创作|机会|应用|落地|风险/.test(reason)))
          .slice(0, 4);
        const ignore = scopedAgentItems
          .filter(item => (item.mustReadScore || 0) < 25 && !selectedInterests.includes(item.category))
          .slice(0, 3);
        const buckets = labels.reduce((acc, label) => ({ ...acc, [label]: [] }), {});
        const assignBucket = (label, list) => {
          if (!buckets[label]) buckets[label] = [];
          buckets[label] = list.map(item => item.title);
        };
        assignBucket(labels[0] || '必读', mustRead);
        assignBucket(labels[1] || '追踪', followUp);
        assignBucket(labels[2] || '素材', materialReady);
        assignBucket(labels[3] || '创作', creationReady);
        assignBucket(labels[4] || '降噪', ignore);
        return {
          output: `分类结果：\n${Object.entries(buckets).map(([label, list]) => `- ${label}：${list.join('；') || (label === (labels[1] || '追踪') ? trackedTerms.join('、') : '') || '暂无'}`).join('\n')}\n\n依据上一节点：\n${previousOutput.slice(0, 600)}`,
          structured: {
            labels,
            buckets,
            mustRead: mustRead.map(item => item.id),
            followUp: followUp.map(item => item.id),
            materialReady: materialReady.map(item => item.id),
            creationReady: creationReady.map(item => item.id),
            ignore: ignore.map(item => item.id)
          }
        };
      }
      if (node.type === 'condition') {
        const metric = node.conditionMetric || 'itemCount';
        const operator = node.conditionOperator || '>=';
        const threshold = Number(node.conditionValue ?? 1);
        const current = Number(workflowMetrics[metric] ?? 0);
        const metricLabel = WORKFLOW_CONDITION_METRICS.find(item => item.id === metric)?.label || metric;
        const checks = [{
          label: `${metricLabel} ${operator} ${threshold}（当前 ${current}）`,
          passed: compareWorkflowMetric(current, operator, threshold)
        }];
        const shouldContinue = checks.every(check => check.passed);
        return {
          output: `条件判断：${shouldContinue ? '通过，继续执行后续链路' : '未通过，后续节点将跳过'}。\n${checks.map(check => `- ${check.passed ? '通过' : '未通过'}：${check.label}`).join('\n')}\n\n条件依据：${node.prompt}`,
          shouldContinue,
          structured: { checks, metric, operator, threshold, current, action: shouldContinue ? 'continue' : 'skip-rest' }
        };
      }
      if (node.type === 'skill') {
        const skillId = node.skillId || 'evidence-pack';
        const skillMeta = getWorkflowSkillMeta(skillId);
        const evidencePack = buildEvidencePack();
        const mediaAudit = buildMediaAudit();
        const materialExtraction = buildMaterialExtraction();
        const profileMemory = buildProfileMemory();
        const articleOutline = buildArticleOutline();
        const githubEvaluation = buildGithubEvaluation();
        const skillOutputs = {
          'evidence-pack': evidencePack,
          'media-audit': mediaAudit,
          'material-extractor': materialExtraction,
          'profile-memory': profileMemory,
          'article-outline': articleOutline,
          'github-evaluator': githubEvaluation
        };
        const selectedSkillOutput = skillOutputs[skillId] || evidencePack;
        const combinedOutput = skillId === 'evidence-pack'
          ? `${evidencePack.output}\n\n${mediaAudit.output}\n\n${materialExtraction.output}`
          : selectedSkillOutput.output;
        return {
          output: `工具 Skills 执行结果：${skillMeta.label}\n${skillMeta.description}\n\n${combinedOutput}\n\n工具说明：${node.prompt}`,
          structured: {
            skillId,
            skillLabel: skillMeta.label,
            evidenceLinks: evidencePack.evidenceLinks.map(item => ({ title: item.title, source: item.source, url: item.url })),
            mediaAudit: mediaAudit.mediaAudit,
            materialCandidates: materialExtraction.candidates.map(item => item.id),
            profileTerms: profileMemory.terms,
            githubItems: githubEvaluation.repos.map(item => item.id),
            articleItems: articleOutline.topReads.map(item => item.id)
          }
        };
      }
      if (node.type === 'reply') {
        return {
          output: `${node.prompt}\n\n固定回复基于上一节点：\n${previousOutput.slice(0, 700)}`,
          structured: { mode: 'fixed-reply' }
        };
      }
      if (node.type === 'output') {
        const topReads = scopedAgentItems.slice(0, 3);
        const followActions = [...new Set([
          ...trackedTerms,
          ...scopedAgentItems.slice(0, 3).flatMap(item => item.tags || [])
        ])].filter(Boolean).slice(0, 6);
        return {
          output: `输出节点完成：\n- 任务：${selectedMission.label}\n- 工作流：${agentWorkflowDraft.name}\n- 优先阅读：${topReads.map(item => item.title).join('；') || '暂无'}\n- 建议追踪：${followActions.join('、') || '暂无'}\n- 素材沉淀：${materialCandidates.slice(0, 3).map(item => item.title).join('；') || '暂无'}\n- 创作转化：可导出到内容创作，形成私有知识库资产\n\n参考链接：\n${formatItemLinks(topReads) || '暂无'}\n\n最终输入摘要：\n${previousOutput.slice(0, 900)}`,
          structured: {
            topReads: topReads.map(item => item.id),
            followActions,
            materialCandidates: materialCandidates.slice(0, 3).map(item => item.id)
          }
        };
      }
      return {
        output: `${node.title} 已处理。\n${previousOutput.slice(0, 700)}`,
        structured: { type: node.type }
      };
    };

    try {
      let previousOutput = buildWorkbenchContext(prompt);
      const workflowVariables = {
        user_context: previousOutput,
        context: previousOutput,
        mission: prompt
      };
      const nodeOutputs = [];
      let haltedByCondition = null;

      for (let index = 0; index < workflowNodes.length; index++) {
        const node = workflowNodes[index];
        activeNodeId = node.id;
        const inputKey = node.inputKey || (index === 0 ? 'context' : `step_${index}`);
        const outputKey = node.outputKey || `step_${index + 1}`;
        const nodeInput = workflowVariables[inputKey] || previousOutput;
        localTrace = localTrace.map(step => {
          if (step.nodeId === node.id) return { ...step, status: 'running' };
          if (step.status === 'running') return { ...step, status: 'completed' };
          return step;
        });
        setAgentWorkflowRun(prev => ({
          ...prev,
          trace: prev.trace.map(step => {
            if (step.nodeId === node.id) return { ...step, status: 'running' };
            if (step.status === 'running') return { ...step, status: 'completed' };
            return step;
          })
        }));

        let output = '';
        let structured = null;
        let shouldContinue = true;
        if (node.type === 'llm') {
          const response = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              baseUrl: llmConfig.baseUrl,
              apiKey: llmConfig.apiKey,
              model: llmConfig.selectedModel,
              action: 'chat',
              content: `工作流任务：${prompt}

当前节点：${node.title}
节点职责：${node.role}
节点指令：${node.prompt}
输入变量：${inputKey}
输出变量：${outputKey}

上游输出：
${nodeInput}

完整蓝图：
${blueprintSummary}`,
              systemPrompt,
              messages: [
                { role: 'user', content: String(nodeInput).slice(-6000) }
              ]
            })
          });
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          output = data.content || `${node.title} 暂无输出`;
        } else {
          const localResult = runLocalNode(node, nodeInput);
          output = typeof localResult === 'string' ? localResult : localResult.output;
          structured = typeof localResult === 'string' ? null : localResult.structured;
          shouldContinue = typeof localResult === 'string' ? true : localResult.shouldContinue !== false;
        }

        workflowVariables[outputKey] = output;
        nodeOutputs.push({ nodeId: node.id, title: node.title, type: node.type, inputKey, outputKey, input: nodeInput, output, structured });
        previousOutput = output;
        setTraceStep(node.id, {
          status: 'completed',
          detail: output.slice(0, 220),
          output,
          structured,
          inputKey,
          outputKey,
          variablePreview: `${inputKey} → ${outputKey}`
        });

        if (node.type === 'condition' && !shouldContinue) {
          haltedByCondition = node;
          localTrace = localTrace.map(step => {
            if (step.status === 'queued') {
              return { ...step, status: 'skipped', detail: '条件未通过，已跳过。' };
            }
            return step;
          });
          setAgentWorkflowRun(prev => ({
            ...prev,
            trace: prev.trace.map(step => step.status === 'queued' ? { ...step, status: 'skipped', detail: '条件未通过，已跳过。' } : step)
          }));
          break;
        }
      }

      const finalContent = [
        ...nodeOutputs.map((item, index) => `## ${index + 1}. ${item.title}\n\n${item.output}`),
        haltedByCondition ? `## 条件分支\n\n“${haltedByCondition.title}”未通过，后续节点已跳过。你可以调整条件、扩大资讯范围或补充素材后重新运行。` : ''
      ].filter(Boolean).join('\n\n---\n\n');
      const finishedAt = new Date().toISOString();
      const workflowActions = createWorkflowActions({
        runId,
        mission: selectedMission,
        prompt,
        content: finalContent || previousOutput || '暂无结果',
        nodeOutputs
      });
      setAgentWorkflowResult({
        loading: false,
        content: finalContent || previousOutput || '暂无结果',
        error: '',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'completed',
        finishedAt,
        trace: localTrace.map(step => {
          if (step.status === 'running') return { ...step, status: 'completed' };
          if (step.status === 'queued') return { ...step, status: haltedByCondition ? 'skipped' : 'completed' };
          return step;
        })
      }));
      setAgentWorkflowActions(workflowActions);
      setAgentWorkflowHistory(prev => [{
        id: runId,
        status: 'completed',
        missionId: selectedMission.id,
        missionLabel: selectedMission.label,
        workflowName: agentWorkflowDraft.name,
        prompt,
        scope: agentWorkflowScope,
        startedAt,
        finishedAt,
        content: finalContent || previousOutput || '暂无结果',
        trace: localTrace,
        nodeOutputs,
        variables: Object.keys(workflowVariables),
        actions: workflowActions,
        haltedByCondition: haltedByCondition?.title || ''
      }, ...prev.filter(item => item.id !== runId)].slice(0, 12));
    } catch (e) {
      const failedAt = new Date().toISOString();
      const failedActions = createWorkflowActions({
        runId,
        mission: selectedMission,
        prompt,
        content: '',
        nodeOutputs: []
      });
      setAgentWorkflowResult({
        loading: false,
        content: '',
        error: e.message || '智能体工作流运行失败',
        missionId: selectedMission.id
      });
      setAgentWorkflowRun(prev => ({
        ...prev,
        status: 'failed',
        finishedAt: failedAt,
        trace: prev.trace.map(step => {
          if (step.nodeId === activeNodeId || step.status === 'running') {
            return { ...step, status: 'failed', detail: e.message || '智能体工作流运行失败' };
          }
          if (step.status === 'queued') return { ...step, status: 'skipped' };
          return step;
        })
      }));
      setAgentWorkflowActions(failedActions);
      setAgentWorkflowHistory(prev => [{
        id: runId,
        status: 'failed',
        missionId: selectedMission.id,
        missionLabel: selectedMission.label,
        workflowName: agentWorkflowDraft.name,
        prompt,
        scope: agentWorkflowScope,
        startedAt,
        finishedAt: failedAt,
        content: '',
        error: e.message || '智能体工作流运行失败',
        trace: localTrace.map(step => {
          if (step.nodeId === activeNodeId || step.status === 'running') return { ...step, status: 'failed', detail: e.message || '智能体工作流运行失败' };
          if (step.status === 'queued') return { ...step, status: 'skipped' };
          return step;
        }),
        nodeOutputs: [],
        actions: failedActions
      }, ...prev.filter(item => item.id !== runId)].slice(0, 12));
    }
  }, [agents, intelligenceMissions, llmConfig, buildWorkbenchContext, enabledWorkflowNodes, agentWorkflowDraft.nodes, agentWorkflowDraft.name, scopedAgentItems, selectedNewsDate, agentWorkflowScope, intelligenceProfile.focusLabels, intelligenceProfile.tracked, bookmarks, materials, selectedInterests, createWorkflowActions]);

  const { getFeedbackTerm, handleRecommendationFeedback } = useRecommendationFeedback({
    recommendationFeedback, setRecommendationFeedback,
    recommendationFeedbackEvents, setRecommendationFeedbackEvents,
    selectedInterests, setSelectedInterests,
    followKeywords, setFollowKeywords,
  });

  const { calendarDays, calendarHeatMap, calendarInsights } = useCalendarMemos(calendarDate, items, events);

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
      // Ctrl+K / Cmd+K 全局唤出命令面板（任何上下文都可触发）
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowCommandPalette(v => !v);
        return;
      }
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

  function loadNews(b = blocked, append = false, searchQuery = '', options = {}) {
    if (!append) { setLoading(true); setError(''); setNewsPage(0); setNewsHasMore(true); setRenderLimit(40); }
    const page = append ? newsPage + 1 : 0;
    const customParams = customSources.map(s => `custom=${encodeURIComponent(JSON.stringify(s))}`).join('&');
    const disabledParam = disabledSources.length > 0 ? `&disabledSources=${encodeURIComponent(disabledSources.join(','))}` : '';
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    // 兴趣过滤
    let interestsParam = '';
    if (nav === 'recommendations' && isLoggedIn && selectedInterests.length > 0) {
      interestsParam = `&interests=${encodeURIComponent(selectedInterests.join(','))}`;
    }
    // 用户主动点"刷新"按钮时强制刷新（绕过缓存）；后台预取走 SWR
    const forceRefreshParam = options.forceRefresh ? '&forceRefresh=1' : '';
    fetch(`/api/news?blocked=${encodeURIComponent(b)}&page=${page}&pageSize=40${searchParam}${disabledParam}${interestsParam}${customParams ? '&' + customParams : ''}${forceRefreshParam}`)
      .then(r => r.json())
      .then(d => {
        if (d.items && d.items.length > 0) {
          const sampleRegions = d.items.slice(0, 3).map(i => ({ title: i.title?.substring(0, 30), region: i.region }));
        }
        
        // isChinaFocused 已由后端 /api/news 预计算（getNews 中 computeIsChinaFocused），直接消费
        const itemsWithChinaTag = d.items || [];

        if (append) {
          setItems(prev => [...prev, ...itemsWithChinaTag]);
        } else {
          setItems(itemsWithChinaTag);
        }
        setStats({ ...d, items: undefined });
        setNewsHasMore(d.hasMore ?? false);
        setNewsPage(page);
      })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }

  useEffect(() => {
    if (nav === 'recommendations') loadExternalIntelligence(selectedInterests);
  }, [nav, selectedInterests]);
  function loadMoreNews() {
    if (!newsHasMore || loadingMore || loading) return;
    setLoadingMore(true);
    loadNews(blocked, true, debouncedQuery);
  }



  // loadTrending / loadGithub 已提取至 useTrending hook

  // 书签与素材操作已提取至 useBookmarkMaterial hook

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


  // 简报导出操作（保存到素材库 / 导出为本地文件 / 导出到创作中心）
  const { saveBriefToMaterials, exportBriefToFile, exportBriefToEditor } = useBriefingOps({
    aiBrief, setMaterials, setArticles, setCurrentArticleId, setNav
  });

  const {
    readingStatsData,
    exportFilteredBookmarks,
    sortedFollowKeywords,
    matchCountPerKeyword,
  } = useReadingStatsMemos({
    bookmarks, filtered, followKeywords, pinnedKeywords,
    exportCategory, exportRange,
  });

  const {
    filteredMaterials,
    allMaterialSources,
    allMaterialTags,
    materialRefCounts,
    filteredArticles,
    filteredExportArticles,
  } = useMaterialsMemos({
    materials, materialSpaceFilter, materialFilter, materialTimeRange,
    materialSourceFilter, materialSearch, materialTags,
    articles, articleSpaceFilter, articleSearch,
    articleStatusFilter, articleTemplateFilter, articleSort, articleExportFilter,
  });

  // selectAllMaterials depends on filteredMaterials (from useMaterialsMemos above),
  // so it must be defined here rather than inside useBookmarkMaterial.
  const selectAllMaterials = useCallback(() => {
    setSelectedMaterials(filteredMaterials.map(m => m.id));
  }, [filteredMaterials, setSelectedMaterials]);

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

  function addTrackTarget() {
    if (!newTrackTarget.trim()) return;
    const id = Date.now().toString();
    setTrackTargets(prev => [...prev, { id, keyword: newTrackTarget.trim(), aliases: [], createdAt: new Date().toISOString() }]);
    setNewTrackTarget('');
  }

  function recordReading(item) {
    // 阅读行为单独进入行为校准，不得覆盖用户显式设置的领域/信源等级。
    setReadingHistory(prev => {
      const filtered = prev.filter(h => h.id !== item.id);
      return [{
        id: item.id,
        title: item.title,
        source: item.source,
        category: item.category,
        tags: item.tags || [],
        summary: item.summary || '',
        url: item.url || '',
        imageUrl: item.imageUrl || '',
        videoUrl: item.videoUrl || '',
        sourceGradeLabel: item.sourceGradeLabel || item.grade || '',
        readAt: new Date().toISOString()
      }, ...filtered].slice(0, 100);
    });
  }


  // GitHub 项目 AI 情报：实时调 LLM 生成应用场景/适合谁/落地难度/价值判断
  const {
    githubInsights, setGithubInsights,
    githubInsightLoading, setGithubInsightLoading,
    requestGithubInsight,
  } = useGithubInsight({ llmConfig });

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

  // addEvent/removeEvent moved to useCalendar

  const navToPrimary = {
    home: 'home',
    recommendations: 'recommendations',
    all: 'all',
    stock: 'stock',
    tracker: 'profile-center',
    trends: 'profile-center',
    calendar: 'profile-center',
    studio: 'studio',
    editor: 'studio',
    materials: 'studio',
    agents: 'studio',
    square: 'square',
    'profile-center': 'profile-center',
    github: 'github',
  };
  const activePrimaryNav = navToPrimary[nav] || 'home';
  const activeContextSection = navContextSections[activePrimaryNav] || navContextSections.home;
  const activeContextItems = activeContextSection.items.map(id => navItems.find(item => item.id === id)).filter(Boolean);
  const goNav = (nextNav) => {
    if (nextNav === 'agents') {
      setCurrentAgent('orchestrator');
      setElfQuotedContext({
        id: Date.now(),
        title: '智能体工作台',
        agentId: 'orchestrator',
        content: buildWorkbenchContext('请作为情报总控，先查看我的今日情报上下文和个人画像。'),
        suggestedPrompt: '请介绍当前智能体团队能为我做什么，并建议今天应该先运行哪个任务。'
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.set('view', nextNav);
    window.history.pushState({ view: nextNav }, '', url);
    setNav(nextNav);
    setFocusedIndex(-1);
    setMobileMenuOpen(false);
  };

  // 路由 hover prefetch：鼠标悬停导航按钮时预取该路由的数据/lazy chunk
  // fire-and-forget，去重保证同一路由会话内只预取一次
  const prefetchedNavsRef = useRef(new Set());
  const prefetchNav = useCallback((nextNav) => {
    if (!nextNav || prefetchedNavsRef.current.has(nextNav)) return;
    prefetchedNavsRef.current.add(nextNav);
    try {
      switch (nextNav) {
        case 'all':
          // 资讯列表（如果首页 backgroundLoadedRef 已预取则服务端缓存命中）
          if (items.length === 0) loadNews(blocked, false, debouncedQuery);
          break;
        case 'stock':
          // 预取 StockPage lazy chunk + dashboard API 填充服务端缓存
          import('./components/StockPage.jsx').catch(() => {});
          fetch('/api/stock/dashboard').catch(() => {});
          break;
        case 'github':
          if (githubRepos.length === 0) loadGithub();
          break;
        case 'trending':
          if (trendingItems.length === 0) loadTrending();
          break;
        case 'studio':
          // 智创中心 lazy chunk
          import('./components/StudioPage.jsx').catch(() => {});
          break;
        case 'square':
          // 社区广场 lazy chunk + 帖子列表
          import('./components/CommunityPage.jsx').catch(() => {});
          break;
        case 'recommendations':
          // 推荐页依赖 trending + briefing，已由 backgroundLoadedRef 预取
          break;
        case 'home':
          // AI 工作站 lazy chunk
          import('./AiElf.jsx').catch(() => {});
          break;
        default:
          break;
      }
    } catch { /* ignore prefetch errors */ }
  }, [items.length, githubRepos.length, trendingItems.length, blocked, debouncedQuery, loadNews, loadGithub, loadTrending]);
  const wideWorkspaceNavs = ['home', 'recommendations', 'studio', 'agents', 'editor', 'materials', 'square', 'profile-center'];
  // 右侧面板：「全部动态」显示关注关键词；「AI 情报首页」显示情报时间线；「精准推荐」显示日期竖向时间线
  const showRightPanel = nav === 'recommendations';
  const showStatsBar = showRightPanel && nav !== 'home' && nav !== 'recommendations';

  return (
    <div data-active-nav={nav} className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${panelCollapsed ? 'panel-collapsed' : ''} ${!showRightPanel ? 'no-right-panel' : ''} ${editorFullscreen ? 'editor-fullscreen' : ''}`}>
      <div className="particle-layer" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => <span key={i} className="particle" style={{ '--i': i }} />)}
      </div>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
<Sidebar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} mobileMenuOpen={mobileMenuOpen} nav={nav} goNav={goNav} addRecentVisit={addRecentVisit} onPrefetchNav={prefetchNav} activePrimaryNav={activePrimaryNav} activeContextItems={activeContextItems} contextGroupOpen={contextGroupOpen} setContextGroupOpen={setContextGroupOpen} agents={agents} currentAgent={currentAgent} setCurrentAgent={setCurrentAgent} setElfQuotedContext={setElfQuotedContext} buildWorkbenchContext={buildWorkbenchContext} showFollowDropdown={showFollowDropdown} setShowFollowDropdown={setShowFollowDropdown} followKeywords={followKeywords} sortedFollowKeywords={sortedFollowKeywords} pinnedKeywords={pinnedKeywords} pinFollowKeyword={pinFollowKeyword} unpinFollowKeyword={unpinFollowKeyword} removeFollowKeyword={removeFollowKeyword} executeSearch={executeSearch} newKeyword={newKeyword} setNewKeyword={setNewKeyword} addFollowKeyword={addFollowKeyword} bookmarks={bookmarks} filtered={filtered} isLoggedIn={isLoggedIn} user={user} setShowProfileModal={setShowProfileModal} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} setShowThemePicker={setShowThemePicker} setShowSettings={setShowSettings} setShowShortcuts={setShowShortcuts} PRODUCT_NAME={PRODUCT_NAME} PRODUCT_TAGLINE={PRODUCT_TAGLINE} PRIMARY_NAV_ITEMS={primaryNavItems} />

      {/* Theme picker modal */}
      <ThemePicker mode={themeMode} setMode={setThemeMode} palette={palette} setPalette={setPalette} show={showThemePicker} onClose={() => setShowThemePicker(false)} />

      {/* Main */}
      <main data-nav={nav} className={`main ${(nav === 'home' || nav === 'recommendations') ? 'main-workbench' : ''}`}>
        <header className={`topbar ${nav === 'all' ? 'topbar-all' : ''} ${nav === 'stock' ? 'topbar-stock' : ''} ${(nav === 'trending' || nav === 'recommendations') ? 'topbar-trending' : ''}`}>
          {/* 滚动资讯热点区域 - 置于最顶部，连续滚动 + 可手动拖动 */}
          {nav === 'all' && scrollingNews.length > 0 && (
            <div className="scrolling-news-container">
              <div className="scrolling-news-header">
                <span className="scrolling-news-label">热门资讯</span>
                <span className="scrolling-news-icon">{ICONS.fire}</span>
              </div>
              <div
                ref={scrollingNewsRef}
                className="scrolling-news-content"
                onMouseEnter={() => setScrollingNewsPaused(true)}
                onMouseLeave={() => setScrollingNewsPaused(false)}
                onMouseDown={handleScrollingNewsMouseDown}
              >
                <div className="scrolling-news-track">
                  {[...scrollingNews, ...scrollingNews].map((item, index) => (
                    <div key={`${item.id}-${index}`} className="scrolling-news-item">
                      {item.hot && <span className="scrolling-news-hot">HOT</span>}
                      <span className="scrolling-news-title">{item.title}</span>
                      <span className="scrolling-news-meta">
                        <span className="scrolling-news-source">{item.source}</span>
                        <span className="scrolling-news-time">{item.time}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            {ICONS.menu}
          </button>
          <div className={`topbar-main ${nav === 'all' ? 'topbar-main-all' : ''}`}>
            <div className={`topbar-main-row ${nav === 'all' ? 'topbar-main-row-all' : ''}`}>
              {nav === 'all' && (
            <div className="topbar-brand">
              <span className="brand-title">{PRODUCT_NAME}</span>
              <span className="brand-theme-icon" aria-hidden="true" title={themeMode === 'dark' ? '深色模式' : '浅色模式'}>{themeMode === 'dark' ? ICONS.moon : ICONS.sun}</span>
            </div>
          )}
              {nav === 'all' && (
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
              )}
            </div>
            <div className={`topbar-actions ${(nav === 'trending' || nav === 'recommendations') ? 'singleline' : ''} ${nav === 'all' ? 'topbar-actions-all' : ''}`}>
              {nav === 'all' && (
                <div className="category-dropdown-wrap">
                  <button className="category-dropdown-btn" onClick={() => setCategoryOpen(o => !o)}>
                    <span>{category === 'all' ? '全部赛道' : categories.find(c => c.id === category)?.label || '全部赛道'}</span>
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
                                const cat = categories.find(c => c.id === catId);
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
                  <div className="region-filter-wrap">
                    <button className={`region-filter-btn ${regionFilter === 'all' ? 'active' : ''}`} onClick={() => setRegionFilter('all')}>全部</button>
                    <button className={`region-filter-btn ${regionFilter === 'domestic' ? 'active' : ''}`} onClick={() => setRegionFilter('domestic')}>国内</button>
                    <button className={`region-filter-btn ${regionFilter === 'overseas' ? 'active' : ''}`} onClick={() => setRegionFilter('overseas')}>国外</button>
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
                <>
                  {nav === 'all' && (
                    <button className="globe-entry-btn" onClick={() => setGlobeFullscreenOpen(true)} title="全球科技大屏">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      全球大屏
                    </button>
                  )}
                  <button className={`btn-refresh ${nav === 'all' ? 'btn-refresh-all' : ''}`} onClick={() => { if (nav === 'all') loadNews(blocked, false, debouncedQuery, { forceRefresh: true }); else if (nav === 'trending') loadTrending(false, trendingPlatform, trendingType); else if (nav === 'github') loadGithub(); }}>
                    {ICONS.refresh}
                  </button>
                  {nav === 'trending' && (
                    <>
                      <div className="trending-type-tabs">
                        {TRENDING_TYPES.map(t => (
                          <button key={t.id} className={`trending-type-tab ${trendingType === t.id ? 'active' : ''}`} onClick={() => { setTrendingType(t.id); loadTrending(false, trendingPlatform, t.id); }}>
                            <span className="trending-type-icon">{t.icon}</span>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="trending-platform-topbar">
                        <select
                          className="platform-dropdown-topbar"
                          value={trendingPlatform}
                          onChange={(e) => { setTrendingPlatform(e.target.value); loadTrending(false, e.target.value, trendingType); }}
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
                    </>
                  )}
                </>
              )}
              {/* 语言切换器：所有页面顶部右侧均可见，点击切换中英文 */}
              <LanguageSwitcher variant="compact" />
          </div>
        </div>
        </header>

        {showStatsBar && <div className="stats-bar">
          {nav === 'all' && <><div className="stat-item"><span className="stat-value">{items.length}</span><span className="stat-label">资讯总数</span></div><div className="stat-item"><span className="stat-value highlight">{filtered.length}</span><span className="stat-label">筛选结果</span></div><div className="stat-item"><span className="stat-value live">{stats.sourceCount - stats.failedSources}</span><span className="stat-label">活跃源</span></div></>}
          {nav === 'trending' && <><div className="stat-item"><span className="stat-value highlight">{trendingItems.length}</span><span className="stat-label">热门榜单</span></div><div className="stat-item"><span className="stat-value live">热门</span><span className="stat-label">全网热搜</span></div></>}
          {nav === 'github' && <><div className="stat-item"><span className="stat-value highlight">{githubRepos.length}</span><span className="stat-label">热门项目</span></div><div className="stat-item"><span className="stat-value live">{GITHUB_PERIODS.find(p => p.id === githubSince)?.label || '周榜'}</span><span className="stat-label">当前榜单</span></div></>}
          {nav === 'reading-list' && <><div className="stat-item"><span className="stat-value highlight">{bookmarks.length}</span><span className="stat-label">收藏总数</span></div><div className="stat-item"><span className="stat-value live">{bookmarks.filter(b => !b.isRead).length}</span><span className="stat-label">未读</span></div></>}
          {nav === 'calendar' && <><div className="stat-item"><span className="stat-value highlight">{events.length}</span><span className="stat-label">日程事件</span></div></>}
          {nav === 'recommendations' && <><div className="stat-item"><span className="stat-value highlight">{filtered.length}</span><span className="stat-label">推荐内容</span></div><div className="stat-item"><span className="stat-value live">{selectedInterests.length}</span><span className="stat-label">兴趣领域</span></div></>}
          <div className="stat-item time">{ICONS.clock}<span>{stats.updatedAt ? formatTime(stats.updatedAt) : '--'}</span></div>
          <button className="panel-toggle" onClick={() => setPanelCollapsed(c => !c)}>{panelCollapsed ? ICONS.chevronLeft : ICONS.chevronRight}</button>
        </div>}

        <div className={`feed custom-scrollbar ${(nav === 'home' || nav === 'recommendations') ? 'feed-workbench' : ''} ${nav === 'stock' ? 'feed-stock' : ''}`} ref={feedRef}>
          {nav === 'home' && (
            <AiChatPanel
              variant="main"
              llmConfig={llmConfig}
              intelligenceProfile={intelligenceProfile}
              workbenchItems={workbenchItems}
              selectedInterests={selectedInterests}
              categories={categories}
              allLlmModels={allLlmModels}
              onOpenLlmConfig={() => setShowLlmQuickConfig(true)}
              pendingMessage={copilotPendingMessage}
              onMessageSent={() => setCopilotPendingMessage('')}
              intelligenceContext={{
                date: selectedNewsDate,
                briefing: algorithmBriefing,
                items: [...externalIntelligenceItems, ...recommendationLanes.public, ...recommendationLanes.personal].slice(0, 16),
              }}
              onOpenNewspaper={() => setShowNewspaperOverlay(true)}
              todayBriefing={todayBriefing}
              todayLanes={todayLanes}
              materials={materials}
              agent={agents.find(a => a.id === currentAgent) || agents[0]}
              onUpdateAgent={updateAgent}
            />
          )}

          {nav === 'studio' && (
            <StudioPage
              goNav={goNav}
              creativeWorkspace={creativeWorkspace}
              materials={materials}
              articles={articles}
              agents={agents}
              createArticle={createArticle}
              setCurrentArticleId={setCurrentArticleId}
              setEditorTab={setEditorTab}
              setEditingAgent={setEditingAgent}
              setNewAgent={setNewAgent}
              setShowAgentForm={setShowAgentForm}
            />
          )}

          {nav === 'agents' && (
            <AgentsPage
              agents={agents}
              currentAgent={currentAgent}
              intelligenceMissions={intelligenceMissions}
              intelligenceProfile={intelligenceProfile}
              runAgentWorkflow={runAgentWorkflow}
              agentWorkflowScopes={agentWorkflowScopes}
              agentWorkflowScope={agentWorkflowScope}
              setAgentWorkflowScope={setAgentWorkflowScope}
              agentWorkflowResult={agentWorkflowResult}
              agentWorkflowPrompt={agentWorkflowPrompt}
              setAgentWorkflowPrompt={setAgentWorkflowPrompt}
              setSettingsTab={setSettingsTab}
              setShowSettings={setShowSettings}
              workflowTemplates={workflowTemplates}
              activeWorkflowId={activeWorkflowId}
              switchWorkflowTemplate={switchWorkflowTemplate}
              saveWorkflowAsTemplate={saveWorkflowAsTemplate}
              deleteWorkflowTemplate={deleteWorkflowTemplate}
              workflowImportInputRef={workflowImportInputRef}
              importWorkflowJson={importWorkflowJson}
              installWorkflowTemplate={installWorkflowTemplate}
              workflowValidation={workflowValidation}
              agentWorkflowDraft={agentWorkflowDraft}
              updateWorkflowDraft={updateWorkflowDraft}
              draggingWorkflowNodeId={draggingWorkflowNodeId}
              setDraggingWorkflowNodeId={setDraggingWorkflowNodeId}
              reorderWorkflowNode={reorderWorkflowNode}
              workflowTypeMeta={workflowTypeMeta}
              selectedWorkflowNodeId={selectedWorkflowNodeId}
              setSelectedWorkflowNodeId={setSelectedWorkflowNodeId}
              newWorkflowNodeType={newWorkflowNodeType}
              setNewWorkflowNodeType={setNewWorkflowNodeType}
              addWorkflowNode={addWorkflowNode}
              exportWorkflowToMaterials={exportWorkflowToMaterials}
              downloadWorkflowJson={downloadWorkflowJson}
              resetWorkflowDraft={resetWorkflowDraft}
              selectedWorkflowNode={selectedWorkflowNode}
              moveWorkflowNode={moveWorkflowNode}
              updateWorkflowNode={updateWorkflowNode}
              removeWorkflowNode={removeWorkflowNode}
              selectedWorkflowConnections={selectedWorkflowConnections}
              enabledWorkflowNodes={enabledWorkflowNodes}
              agentWorkflowRun={agentWorkflowRun}
              workflowRunStatusMeta={workflowRunStatusMeta}
              agentWorkflowHistory={agentWorkflowHistory}
              clearAgentWorkflowHistory={clearAgentWorkflowHistory}
              restoreAgentWorkflowHistory={restoreAgentWorkflowHistory}
              agentWorkflowActions={agentWorkflowActions}
              executeWorkflowAction={executeWorkflowAction}
              addManualMaterial={addManualMaterial}
              workflowBlueprintText={workflowBlueprintText}
              exportWorkflowResultToEditor={exportWorkflowResultToEditor}
              sendWorkbenchToElf={sendWorkbenchToElf}
              setShowLlmQuickConfig={setShowLlmQuickConfig}
            />
          )}

          {/* ALL NEWS */}
          {nav === 'all' && (
            <NewsPage
              key="all"
              eventClusters={eventClusters}
              category={category}
              mode={mode}
              query={query}
              expandedEvents={expandedEvents}
              setExpandedEvents={setExpandedEvents}
              viewMode={viewMode}
              focusedIndex={focusedIndex}
              filtered={filtered}
              loading={loading}
              error={error}
              allFeedItems={allFeedItems}
              allActiveFilters={allActiveFilters}
              items={items}
              renderLimit={renderLimit}
              expandedSummary={expandedSummary}
              summaryLoading={summaryLoading}
              followKeywords={followKeywords}
              translationOpen={translationOpen}
              translatingItems={translatingItems}
              newsHasMore={newsHasMore}
              loadingMore={loadingMore}
              getSummaryEntry={getSummaryEntry}
              isBookmarked={isBookmarked}
              isInMaterials={isInMaterials}
              toggleBookmark={toggleBookmark}
              toggleMaterial={toggleMaterial}
              handleSummaryToggle={handleSummaryToggle}
              clearAllFilters={clearAllFilters}
              loadNews={loadNews}
              recordReading={recordReading}
              requestTranslation={requestTranslation}
              getTranslation={getTranslation}
              setLightbox={setLightbox}
              setTranslationOpen={setTranslationOpen}
            />
          )}

          {/* TRENDING */}
          {nav === 'trending' && (
            <TrendingPage key="trending" viewMode={viewMode} trendingLoading={trendingLoading} trendingItems={trendingItems} isBookmarked={isBookmarked} isInMaterials={isInMaterials} toggleBookmark={toggleBookmark} toggleMaterial={toggleMaterial} setLightbox={setLightbox} translationOpen={translationOpen} setTranslationOpen={setTranslationOpen} requestTranslation={requestTranslation} translatingItems={translatingItems} getTranslation={getTranslation} trendingLoadingMore={trendingLoadingMore} trendingHasMore={trendingHasMore} loadTrending={loadTrending} trendingPlatform={trendingPlatform} trendingType={trendingType} />
          )}

          {/* SMART RECOMMENDATIONS - 当日满足用户关注/画像的资讯卡片流（右栏竖向时间线见 panel） */}
          {nav === 'recommendations' && (
            <RecommendationsPage
              externalIntelligenceItems={externalIntelligenceItems}
              externalIntelligenceOpportunities={externalIntelligenceOpportunities}
              externalIntelligenceWeeklySectors={externalIntelligenceWeeklySectors}
              externalIntelligenceAlerts={externalIntelligenceAlerts}
              externalIntelligenceLoading={externalIntelligenceLoading}
              externalIntelligenceError={externalIntelligenceError}
              externalIntelligenceUpdatedAt={externalIntelligenceUpdatedAt}
              loadExternalIntelligence={loadExternalIntelligence}
              displayRecommendationLanes={displayRecommendationLanes}
              loading={loading}
              error={error}
              isLoggedIn={isLoggedIn}
              selectedInterests={selectedInterests}
              categories={categories}
              renderLimit={renderLimit}
              viewMode={viewMode}
              recommendationCandidates={recommendationCandidates}
              selectedRecommendationSnapshot={selectedRecommendationSnapshot}
              loadMoreNews={loadMoreNews}
              loadingMore={loadingMore}
              newsHasMore={newsHasMore}
              loadNews={loadNews}
              setShowInterestModal={setShowInterestModal}
              setAuthMode={setAuthMode}
              setShowAuthModal={setShowAuthModal}
              focusedIndex={focusedIndex}
              expandedSummary={expandedSummary}
              summaryLoading={summaryLoading}
              translationOpen={translationOpen}
              translatingItems={translatingItems}
              followKeywords={followKeywords}
              getSummaryEntry={getSummaryEntry}
              isBookmarked={isBookmarked}
              isInMaterials={isInMaterials}
              toggleBookmark={toggleBookmark}
              toggleMaterial={toggleMaterial}
              handleSummaryToggle={handleSummaryToggle}
              recordReading={recordReading}
              getTranslation={getTranslation}
              requestTranslation={requestTranslation}
              setTranslationOpen={setTranslationOpen}
              setLightbox={setLightbox}
            />
          )}
          {/* recommendations-legacy 已删除（死代码，无导航入口） */}

          {/* GITHUB */}
          {nav === 'github' && (
            <GithubPage
              githubSince={githubSince}
              githubLoading={githubLoading}
              githubRepos={githubRepos}
              isBookmarked={isBookmarked}
              isInMaterials={isInMaterials}
              toggleBookmark={toggleBookmark}
              toggleMaterial={toggleMaterial}
              translationOpen={translationOpen}
              toggleGithubTranslation={toggleGithubTranslation}
              getTranslation={getTranslation}
              githubInsights={githubInsights}
              requestGithubInsight={requestGithubInsight}
              githubInsightLoading={githubInsightLoading}
              setLightbox={setLightbox}
            />
          )}

          {nav === 'stock' && (
            <Suspense fallback={<div className="empty-state"><p>加载股市终端...</p></div>}>
              <StockPage llmConfig={llmConfig} onOpenLlmConfig={() => setShowLlmQuickConfig(true)} />
            </Suspense>
          )}

          {nav === 'square' && <CommunityPage user={user} onRequireAuth={() => { setAuthMode('login'); setShowAuthModal(true); }} />}

          {nav === 'profile-center' && (
            <ProfilePage
              intelligenceProfile={intelligenceProfile}
              bookmarks={bookmarks}
              readingHistory={readingHistory}
              dailyProfileSnapshots={dailyProfileSnapshots}
              profileLearningEngine={profileLearningEngine}
              profilePriorityItems={profilePriorityItems}
              setDomainTiers={setDomainTiers}
              sourcePriorityItems={sourcePriorityItems}
              setSourceTiers={setSourceTiers}
              specialFollows={specialFollows}
              setSpecialFollows={setSpecialFollows}
              specialFollowForm={specialFollowForm}
              setSpecialFollowForm={setSpecialFollowForm}
              editingSpecialFollowId={editingSpecialFollowId}
              setEditingSpecialFollowId={setEditingSpecialFollowId}
              profileCalibrationSignals={profileCalibrationSignals}
              generateDailyProfileSnapshot={generateDailyProfileSnapshot}
              setShowInterestModal={setShowInterestModal}
              selectedInterests={selectedInterests}
            />
          )}

          {/* READING LIST - 阅读列表 */}
          {nav === 'reading-list' && (
            <ReadingListPage
              bookmarks={bookmarks}
              categories={categories}
              toggleRead={toggleRead}
              setBookmarks={setBookmarks}
            />
          )}

          {/* CUSTOM URL - 自定义抓取 */}
          {nav === 'custom-url' && (
            <CustomUrlPage
              onSaveToArticle={(article) => {
                setArticles(prev => [article, ...prev]);
                setCurrentArticleId(article.id);
                setNav('editor');
              }}
              onSaveToMaterial={(material) => {
                setMaterials(prev => [material, ...prev]);
                setNav('materials');
              }}
            />
          )}

          {/* CALENDAR - 日历管理 */}
          {nav === 'calendar' && (
            <CalendarPage
              events={events}
              setEvents={setEvents}
              removeEvent={removeEvent}
              showEventForm={showEventForm}
              setShowEventForm={setShowEventForm}
            />
          )}

           {/* 洞察分析 - 统一仪表盘 */}
          {(nav === 'briefing' || nav === 'tracker' || nav === 'trends' || nav === 'reading-stats') && (
            <InsightDashboardPage
              nav={nav}
              setNav={setNav}
              insightData={insightData}
              trackerData={trackerData}
              readingProfile={readingProfile}
              items={items}
              aiBrief={aiBrief}
              saveBriefToMaterials={saveBriefToMaterials}
              exportBriefToFile={exportBriefToFile}
              exportBriefToEditor={exportBriefToEditor}
              generateAiBrief={generateAiBrief}
              followKeywords={followKeywords}
              followKeywordUpdates={followKeywordUpdates}
              todayMustRead={todayMustRead}
              setCategory={setCategory}
              categories={categories}
              executeSearch={executeSearch}
              newTrackTarget={newTrackTarget}
              setNewTrackTarget={setNewTrackTarget}
              addTrackTarget={addTrackTarget}
              trackTargets={trackTargets}
              setTrackTargets={setTrackTargets}
            />
          )}

          {nav === 'materials' && (
            <MaterialsPage
              materials={materials}
              materialSpaces={materialSpaces}
              materialSearch={materialSearch}
              setMaterialSearch={setMaterialSearch}
              materialFilter={materialFilter}
              setMaterialFilter={setMaterialFilter}
              materialSpaceFilter={materialSpaceFilter}
              setMaterialSpaceFilter={setMaterialSpaceFilter}
              materialTimeRange={materialTimeRange}
              setMaterialTimeRange={setMaterialTimeRange}
              materialSourceFilter={materialSourceFilter}
              setMaterialSourceFilter={setMaterialSourceFilter}
              allMaterialSources={allMaterialSources}
              materialTags={materialTags}
              setMaterialTags={setMaterialTags}
              allMaterialTags={allMaterialTags}
              filteredMaterials={filteredMaterials}
              selectedMaterials={selectedMaterials}
              exportMaterials={exportMaterials}
              importMaterials={importMaterials}
              toggleMaterialStar={toggleMaterialStar}
              removeMaterial={removeMaterial}
              batchRemoveMaterials={batchRemoveMaterials}
              assignMaterialsToSpace={assignMaterialsToSpace}
              clearMaterialSelection={clearMaterialSelection}
              selectAllMaterials={selectAllMaterials}
              toggleMaterialSelection={toggleMaterialSelection}
              continueMaterialInWorkbench={continueMaterialInWorkbench}
              materialRefCounts={materialRefCounts}
              showSpaceForm={showSpaceForm}
              setShowSpaceForm={setShowSpaceForm}
              newSpaceName={newSpaceName}
              setNewSpaceName={setNewSpaceName}
              createMaterialSpace={createMaterialSpace}
              showAddMaterial={showAddMaterial}
              setShowAddMaterial={setShowAddMaterial}
              addManualMaterial={addManualMaterial}
              setLightbox={setLightbox}
            />
          )}
          <AddMaterialModal showAddMaterial={showAddMaterial} setShowAddMaterial={setShowAddMaterial} addManualMaterial={addManualMaterial} materialSpaces={materialSpaces} />

{nav === 'editor' && <ArticleEditor editorFullscreen={editorFullscreen} setEditorFullscreen={setEditorFullscreen} editorTextareaRef={editorTextareaRef} imageInputRef={imageInputRef} articles={articles} setArticles={setArticles} currentArticleId={currentArticleId} setCurrentArticleId={setCurrentArticleId} editorTab={editorTab} setEditorTab={setEditorTab} editorCursorPos={editorCursorPos} setEditorCursorPos={setEditorCursorPos} showTemplateMenu={showTemplateMenu} setShowTemplateMenu={setShowTemplateMenu} showAiPanel={showAiPanel} setShowAiPanel={setShowAiPanel} showImagePanel={showImagePanel} setShowImagePanel={setShowImagePanel} aiResult={aiResult} setAiResult={setAiResult} aiCustomPrompt={aiCustomPrompt} setAiCustomPrompt={setAiCustomPrompt} autoSaveTimer={autoSaveTimer} setAutoSaveTimer={setAutoSaveTimer} lastSavedAt={lastSavedAt} setLastSavedAt={setLastSavedAt} articleTagInput={articleTagInput} setArticleTagInput={setArticleTagInput} editingArticleTag={editingArticleTag} setEditingArticleTag={setEditingArticleTag} articleSpaces={articleSpaces} setArticleSpaces={setArticleSpaces} materialSpaces={materialSpaces} setMaterialSpaces={setMaterialSpaces} articleSpaceFilter={articleSpaceFilter} setArticleSpaceFilter={setArticleSpaceFilter} articleMaterialSpaceFilter={articleMaterialSpaceFilter} setArticleMaterialSpaceFilter={setArticleMaterialSpaceFilter} articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen} newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName} articleSpaceForNewArticle={articleSpaceForNewArticle} setArticleSpaceForNewArticle={setArticleSpaceForNewArticle} articleSearch={articleSearch} setArticleSearch={setArticleSearch} articleStatusFilter={articleStatusFilter} setArticleStatusFilter={setArticleStatusFilter} articleTemplateFilter={articleTemplateFilter} setArticleTemplateFilter={setArticleTemplateFilter} articleSort={articleSort} setArticleSort={setArticleSort} filteredArticles={filteredArticles} articleExportFilter={articleExportFilter} setArticleExportFilter={setArticleExportFilter} createArticle={createArticle} updateArticle={updateArticle} deleteArticle={deleteArticle} duplicateArticle={duplicateArticle} addArticleTag={addArticleTag} removeArticleTag={removeArticleTag} triggerAutoSave={triggerAutoSave} handleContentChange={handleContentChange} handleTitleChange={handleTitleChange} insertAtCursor={insertAtCursor} insertMaterialAtCursor={insertMaterialAtCursor} removeLinkedMaterial={removeLinkedMaterial} handleImageUpload={handleImageUpload} handlePaste={handlePaste} createArticleSpace={createArticleSpace} deleteArticleSpace={deleteArticleSpace} assignArticleToSpace={assignArticleToSpace} batchAssignArticlesToSpace={batchAssignArticlesToSpace} insertAiResult={insertAiResult} clearAiResult={clearAiResult} exportArticleToFile={exportArticleToFile} copyArticleAsRichText={copyArticleAsRichText} workspace={creativeWorkspace} materials={materials} llmConfig={llmConfig} />}

          <ArticleSpaceModal articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen} newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName} createArticleSpace={createArticleSpace} />

          {nav === 'knowledge-export' && (
            <KnowledgeExportPage
              articles={filteredExportArticles}
              bookmarks={exportFilteredBookmarks}
              articleExportFilter={articleExportFilter}
              setArticleExportFilter={setArticleExportFilter}
              exportCategory={exportCategory}
              setExportCategory={setExportCategory}
              exportRange={exportRange}
              setExportRange={setExportRange}
              categories={categories}
              exportArticle={exportArticle}
            />
          )}

          {/* Event Form Modal */}
          <EventFormModal showEventForm={showEventForm} setShowEventForm={setShowEventForm} setEvents={setEvents} />
        </div>

        {/* Copilot — AI 情报与每日速报共享同一段有界证据上下文 */}
      </main>

      {/* 今日速报抽屉：从右侧滑入，点遮罩或 ✕ 关闭 */}
      <NewspaperOverlay showNewspaperOverlay={showNewspaperOverlay} setShowNewspaperOverlay={setShowNewspaperOverlay} todayBriefing={todayBriefing} todayLanes={todayLanes} recommendationCandidates={recommendationCandidates} loading={loading} loadNews={loadNews} goNav={goNav} recordReading={recordReading} toggleMaterial={toggleMaterial} recommendationSnapshots={recommendationSnapshots} selectedNewsDate={selectedNewsDate} setSelectedNewsDate={setSelectedNewsDate} translations={translations} translationOpen={translationOpen} setTranslationOpen={setTranslationOpen} translatingItems={translatingItems} requestTranslation={requestTranslation} isEnglishText={isEnglishText} />

      {/* Right Panel */}
<RightPanel showRightPanel={showRightPanel} panelCollapsed={panelCollapsed} nav={nav} recommendationSnapshots={recommendationSnapshots} selectedNewsDate={selectedNewsDate} setSelectedNewsDate={setSelectedNewsDate} loading={loading} loadNews={loadNews} followKeywords={followKeywords} sortedFollowKeywords={sortedFollowKeywords} matchCountPerKeyword={matchCountPerKeyword} pinnedKeywords={pinnedKeywords} pinFollowKeyword={pinFollowKeyword} unpinFollowKeyword={unpinFollowKeyword} removeFollowKeyword={removeFollowKeyword} newKeyword={newKeyword} setNewKeyword={setNewKeyword} addFollowKeyword={addFollowKeyword} hotTags={hotTags} executeSearch={executeSearch} items={items} setGlobeFullscreenOpen={setGlobeFullscreenOpen} followKeywordUpdates={followKeywordUpdates} todayMustRead={todayMustRead} selectedInterests={selectedInterests} aiInsights={aiInsights} fetchAiInsights={fetchAiInsights} llmConfig={llmConfig} setShowLlmQuickConfig={setShowLlmQuickConfig} llmTesting={llmTesting} />

      {/* Settings Modal */}
      {/* Lightbox */}
      <Lightbox lightbox={lightbox} setLightbox={setLightbox} />

      {showSettings && (
        <SettingsModal
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          stats={stats}
          blocked={blocked}
          setBlocked={setBlocked}
          allSources={allSources}
          customSources={customSources}
          setCustomSources={setCustomSources}
          disabledSources={disabledSources}
          setDisabledSources={setDisabledSources}
          sourceGrades={sourceGrades}
          sourceHealth={sourceHealth}
          setSourceHealth={setSourceHealth}
          newSource={newSource}
          setNewSource={setNewSource}
          editingSource={editingSource}
          setEditingSource={setEditingSource}
          showSourceForm={showSourceForm}
          setShowSourceForm={setShowSourceForm}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          customSourceFilter={customSourceFilter}
          setCustomSourceFilter={setCustomSourceFilter}
          regionFilter={regionFilter}
          setRegionFilter={setRegionFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          gradeFilter={gradeFilter}
          setGradeFilter={setGradeFilter}
          sourceTypeTab={sourceTypeTab}
          setSourceTypeTab={setSourceTypeTab}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          addCustomSource={addCustomSource}
          removeCustomSource={removeCustomSource}
          verifySource={verifySource}
          sourceVerifying={sourceVerifying}
          sourceVerifyResult={sourceVerifyResult}
          sourceDiscoveryUrl={sourceDiscoveryUrl}
          setSourceDiscoveryUrl={setSourceDiscoveryUrl}
          sourceDiscoveryState={sourceDiscoveryState}
          discoverSource={discoverSource}
          addDiscoveredSource={addDiscoveredSource}
          verifyAllSources={verifyAllSources}
          verifySingleSource={verifySingleSource}
          exportSources={exportSources}
          importSources={importSources}
          verifyingAllSources={verifyingAllSources}
          allSourcesVerifyResults={allSourcesVerifyResults}
          setAllSourcesVerifyResults={setAllSourcesVerifyResults}
          autoMonitorEnabled={autoMonitorEnabled}
          setAutoMonitorEnabled={setAutoMonitorEnabled}
          monitorInterval={monitorInterval}
          setMonitorInterval={setMonitorInterval}
          monitorAlerts={monitorAlerts}
          showAlertPanel={showAlertPanel}
          setShowAlertPanel={setShowAlertPanel}
          clearAlerts={clearAlerts}
          llmConfig={llmConfig}
          setLlmConfig={setLlmConfig}
          llmModels={llmModels}
          llmFetching={llmFetching}
          llmFetchError={llmFetchError}
          llmTestResult={llmTestResult}
          llmTesting={llmTesting}
          llmManualInput={llmManualInput}
          setLlmManualInput={setLlmManualInput}
          showLlmQuickConfig={showLlmQuickConfig}
          setShowLlmQuickConfig={setShowLlmQuickConfig}
          allLlmModels={allLlmModels}
          fetchLlmModels={fetchLlmModels}
          addManualModel={addManualModel}
          removeManualModel={removeManualModel}
          testLlmConnection={testLlmConnection}
          handleSelectPreset={handleSelectPreset}
          handleQuickSave={handleQuickSave}
          handleQuickTest={handleQuickTest}
          agents={agents}
          setAgents={setAgents}
          currentAgent={currentAgent}
          setCurrentAgent={setCurrentAgent}
          showAgentForm={showAgentForm}
          setShowAgentForm={setShowAgentForm}
          editingAgent={editingAgent}
          setEditingAgent={setEditingAgent}
          newAgent={newAgent}
          setNewAgent={setNewAgent}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          agentPromptRefining={agentPromptRefining}
          setAgentPromptRefining={setAgentPromptRefining}
          elfAvatar={elfAvatar}
          setElfAvatar={setElfAvatar}
          elfAvatarHistory={elfAvatarHistory}
          setElfAvatarHistory={setElfAvatarHistory}
          elfName={elfName}
          setElfName={setElfName}
          formatRelative={formatRelative}
          loadNews={loadNews}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        navItems={primaryNavItems}
        onNavigate={(navId) => goNav(navId)}
        onSearch={(q) => executeSearch(q)}
        recentVisits={recentVisits}
        actions={[
          { id: 'refresh', label: '刷新资讯', icon: 'refresh', hint: '动作', run: () => loadNews(blocked, false, debouncedQuery, { forceRefresh: true }) },
          { id: 'theme', label: '切换主题', icon: 'palette', hint: '动作', run: () => setShowThemePicker(true) },
          { id: 'settings', label: '打开设置', icon: 'settings', hint: '动作', run: () => setShowSettings(true) },
        ]}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts} />

      {/* LLM Quick Config Modal */}
      <LlmQuickConfigModal showLlmQuickConfig={showLlmQuickConfig} setShowLlmQuickConfig={setShowLlmQuickConfig} llmConfig={llmConfig} setLlmConfig={setLlmConfig} allLlmModels={allLlmModels} fetchLlmModels={fetchLlmModels} llmFetching={llmFetching} llmFetchError={llmFetchError} llmTestResult={llmTestResult} llmTesting={llmTesting} handleSelectPreset={handleSelectPreset} handleQuickSave={handleQuickSave} handleQuickTest={handleQuickTest} llmPresets={llmPresets} activePresetId={activePresetId} activatePreset={activatePreset} removePreset={removePreset} upsertPreset={upsertPreset} llmPresetName={llmPresetName} setLlmPresetName={setLlmPresetName} />

      {/* Back to Top */}
      <button className={`back-to-top ${showBackToTop ? 'visible' : ''}`} onClick={scrollToTop} title="回到顶部">
        {ICONS.chevronLeft ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg> : ICONS.chevronUp}
      </button>

      {/* AI精灵助手 */}
      <Suspense fallback={null}>
      <AiElf
        llmConfig={llmConfig}
        avatarImage={elfAvatar}
        elfName={elfName}
        agents={agents}
        currentAgent={currentAgent}
        onChangeAgent={setCurrentAgent}
        externalQuotedContext={elfQuotedContext}
        intelligenceProfile={intelligenceProfile}
        intelligenceMissions={intelligenceMissions}
        onContinueInWorkbench={(payload, savedMaterial) => {
          const material = savedMaterial || addManualMaterial({
            title: String(payload.title || 'AI 精灵研究记录').slice(0, 100),
            content: String(payload.content || '').slice(0, 5000),
            fullContent: payload.fullContent || payload.content || '',
            type: payload.type || 'viewpoint',
            source: payload.source || 'AI 精灵',
            url: payload.url || '',
            tags: payload.tags || ['AI精灵', 'AI工作站'],
            note: payload.note || '由 AI 精灵保存，可在 AI 工作站继续研究。',
            spaceId: payload.spaceId || null,
            imageUrl: payload.imageUrl || '',
            insight: payload.insight || null,
            metadata: payload.metadata || null
          });
          setMaterialSearch(material.title || payload.title || '');
          setMaterialFilter('all');
          setMaterialSourceFilter('all');
          setMaterialSpaceFilter('all');
          if (material.id) setSelectedMaterials([material.id]);
          setCopilotPendingMessage([
            `请基于刚从 AI 精灵保存的研究素材继续深化：${material.title || payload.title}`,
            '',
            '【素材内容】',
            String(material.fullContent || material.content || payload.fullContent || payload.content || '').slice(0, 3500),
            '',
            '请输出：1）核心判断 2）仍需验证的证据 3）下一步研究清单 4）可沉淀为文章的结构。'
          ].join('\n'));
          goNav('home');
          showToast('已转入 AI 工作站继续研究');
        }}
        onExportToMaterials={(data) => {
        return addManualMaterial({
          title: String(data.title || 'AI 精灵分析素材').slice(0, 100),
          content: String(data.content || '').slice(0, 5000),
          fullContent: data.fullContent || data.content || '',
          type: data.type || 'analysis',
          source: data.source || 'AI精灵',
          url: data.url || '',
          tags: data.tags || ['AI分析', 'AI精灵'],
          note: data.note || '',
          spaceId: data.spaceId || null,
          imageUrl: data.imageUrl || '',
          insight: data.insight || null,
          metadata: data.metadata || null
        });
      }} />
      </Suspense>

      {/* 登录/注册弹窗 */}
<AuthModal showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} handleLogin={handleLogin} handleRegister={handleRegister} authLoading={authLoading} authError={authError} setAuthError={setAuthError} />

      {/* 个人资料弹窗 */}
      <ProfileModal showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} user={user} setUser={setUser} profileForm={profileForm} setProfileForm={setProfileForm} selectedInterests={selectedInterests} categories={categories} updateUserProfile={updateUserProfile} setShowInterestModal={setShowInterestModal} setShowUserMenu={setShowUserMenu} handleLogout={handleLogout} showToast={showToast} />

      {/* 兴趣选择弹窗 */}
<InterestModal showInterestModal={showInterestModal} setShowInterestModal={setShowInterestModal} selectedInterests={selectedInterests} setSelectedInterests={setSelectedInterests} categories={categories} CATEGORY_GROUPS={CATEGORY_GROUPS} updateUserInterests={updateUserInterests} />

      {/* 全球科技大屏全屏 */}
      {globeFullscreenOpen && (
        <Suspense fallback={<div className="page-loading-skeleton" />}>
          <GlobeView items={items} externalFullscreen={globeFullscreenOpen} onFullscreenChange={setGlobeFullscreenOpen} />
        </Suspense>
      )}
    </div>
  );

  // source 相关函数（addCustomSource/removeCustomSource/truncateUrl/truncateText/
  // getSourceHealthIndicator/verifySingleSource/exportSources/importSources/clearAlerts）
  // 及自动监控/健康检查 useEffect 已移至 useSourceManager

  // fetchCustomUrl moved to useCustomUrl

}

export default App;
