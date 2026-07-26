import { useEffect, useMemo, useState, useRef, useCallback, lazy, Suspense } from 'react';
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
import { useCustomUrl } from './hooks/useCustomUrl.js';
import { useCalendar } from './hooks/useCalendar.js';
import { useUI } from './hooks/useUI.js';
import { useCreativeWorkspace } from './hooks/useCreativeWorkspace.js';
import { useCalendarMemos } from './hooks/useCalendarMemos.js';
import { useMaterialsMemos } from './hooks/useMaterialsMemos.js';
import { useAgents } from './hooks/useAgents.js';
import { useExternalIntelligence } from './hooks/useExternalIntelligence.js';
import { BlockGrid, BlockPanel, BlockStat, BlockToolbar } from './blocks/index.js';
import CommandPalette from './shell/CommandPalette.jsx';
import IntelligenceSidebar from './components/IntelligenceSidebar.jsx';
import IntelligenceFeedPanel from './components/IntelligenceFeedPanel.jsx';
import RecommendationFeed from './components/RecommendationFeed.jsx';
import RecommendationDateRail from './components/RecommendationDateRail.jsx';
import TodayNewspaper from './components/TodayNewspaper.jsx';
import CommunityPage from './components/CommunityPage.jsx';
import RecommendationsPage from './components/RecommendationsPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import StudioPage from './components/StudioPage.jsx';
import NewsPage from './components/NewsPage.jsx';
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
import {
  PROFILE_TIER_OPTIONS,
  PROFILE_TIERS,
  SPECIAL_FOLLOW_TYPES,
  domainTierScore,
  migratePreferenceState,
  migrateSpecialFollows,
  sourceTierScore,
} from './domain/intelligence/profileTiers.js';
import { buildRecommendation, clusterEvents, selectBriefingLanes } from './domain/intelligence/recommendationEngine.js';
import { buildAlgorithmBriefing } from './domain/intelligence/briefingEngine.js';
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

const NAV_ITEMS = [
  { id: 'home', label: 'AI 工作站', icon: 'sparkle' },
  { id: 'recommendations', label: '精准推荐', icon: 'calendar' },
  { id: 'all', label: '全部动态', icon: 'grid' },
  { id: 'stock', label: '股市动向', icon: 'trendingUp' },

  { id: 'github', label: 'GitHub 热门', icon: 'github' },
  { id: 'materials', label: '素材库', icon: 'layers' },
  { id: 'studio', label: '智创中心', icon: 'edit' },
  { id: 'agents', label: '智能体', icon: 'bot' },
  { id: 'editor', label: '内容创作', icon: 'edit' },
  { id: 'square', label: '用户广场', icon: 'user' },
  { id: 'profile-center', label: '用户画像', icon: 'target' },
];

const PRIMARY_NAV_ITEMS = [
  { id: 'home', label: 'AI 工作站', desc: '今日总判断', short: '情报', icon: 'cpu', nav: 'home', children: ['home'] },
  { id: 'recommendations', label: '精准推荐', desc: '日历时间线', short: '推荐', icon: 'calendar', nav: 'recommendations', children: ['recommendations'] },
  { id: 'all', label: '全部动态', desc: '扩展视野', short: '动态', icon: 'grid', nav: 'all', children: ['all'] },
  { id: 'stock', label: '股市动向', desc: '行情分析', short: '股市', icon: 'trendingUp', nav: 'stock', children: [] },
  { id: 'github', label: 'GitHub 热门', desc: '三榜项目', short: '开源', icon: 'github', nav: 'github', children: ['github'] },
  { id: 'studio', label: '智创中心', desc: '素材智能体创作', short: '智创', icon: 'edit', nav: 'studio', children: ['materials', 'agents', 'editor'] },
  { id: 'square', label: '用户广场', desc: '分享交流', short: '广场', icon: 'user', nav: 'square', children: ['square'] },
  { id: 'profile-center', label: '用户画像', desc: '越用越懂你', short: '画像', icon: 'target', nav: 'profile-center', children: ['profile-center'] }
];

const NAV_CONTEXT_SECTIONS = {
  home: {
    label: 'AI 工作站',
    items: ['home']
  },
  recommendations: {
    label: '精准推荐',
    items: ['recommendations']
  },
  all: {
    label: '多领域资讯',
    items: ['all']
  },
  github: {
    label: '开源发现',
    items: ['github']
  },
  stock: {
    label: '行情分析',
    items: []
  },
  studio: {
    label: '智创中心',
    items: ['materials', 'agents', 'editor']
  },
  square: {
    label: '社区生态',
    items: ['square']
  },
  'profile-center': {
    label: '个人生态',
    items: ['profile-center']
  },
};


const DEFAULT_AGENT_WORKFLOW = {
  name: '个人情报协作流',
  description: '把每日汇报、用户画像和素材库交给多个智能体协作，输出可阅读、可追踪、可创作的结果。',
  nodes: [
    {
      id: 'wf-input',
      type: 'input',
      title: '输入',
      role: '接收今日推荐、用户画像、追踪关键词和已收藏素材。',
      prompt: '读取今日情报工作台、用户画像、素材库和用户补充指令。',
      inputKey: 'user_context',
      outputKey: 'briefing_context',
      enabled: true
    },
    {
      id: 'wf-analyst',
      type: 'llm',
      title: '大模型分析',
      role: '识别重要事实、机会、风险和不确定性。',
      prompt: '请基于输入资料输出事实、推断、不确定性和优先级。',
      inputKey: 'briefing_context',
      outputKey: 'analysis',
      enabled: true
    },
    {
      id: 'wf-classifier',
      type: 'classifier',
      title: '分类判断',
      role: '按领域、质量等级、应用场景和风险等级给内容分流。',
      prompt: '将内容分类为：必读、追踪、素材、创作、忽略，并说明原因。',
      classifierLabels: '必读,追踪,素材,创作,降噪',
      inputKey: 'analysis',
      outputKey: 'classified_signals',
      enabled: true
    },
    {
      id: 'wf-skill',
      type: 'skill',
      title: '工具 Skills',
      role: '调用搜索、摘要、正文抽取、导出和格式化等工具能力。',
      prompt: '需要时调用工具补充证据、提取正文图片、整理参考链接。',
      skillId: 'evidence-pack',
      inputKey: 'classified_signals',
      outputKey: 'evidence_pack',
      enabled: true
    },
    {
      id: 'wf-output',
      type: 'output',
      title: '输出',
      role: '生成今日简报、素材卡片、追踪记忆和创作选题。',
      prompt: '输出结构：一句话判断、优先阅读、风险、行动、可沉淀素材。',
      inputKey: 'evidence_pack',
      outputKey: 'final_briefing',
      enabled: true
    }
  ]
};

const WORKFLOW_NODE_TYPES = ['input', 'llm', 'skill', 'condition', 'classifier', 'reply', 'output'];

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

const WORKFLOW_TEMPLATE_LIBRARY = [
  {
    id: 'daily-briefing-copilot',
    name: '每日情报简报工作流',
    description: '从用户画像、今日资讯、收藏素材中提取高价值信号，生成可追踪的每日汇报。',
    source: '参考 Dify / Langflow 的模板化工作流设计',
    tags: ['每日汇报', '用户画像', '可执行'],
    nodes: [
      {
        id: 'tpl-daily-input',
        type: 'input',
        title: '汇总输入',
        role: '收集今日推荐、关注领域、阅读历史、收藏素材和用户补充任务。',
        prompt: '读取当前日期、用户画像、今日推荐列表、追踪关键词、收藏和素材库，形成完整任务上下文。',
        inputKey: 'user_context',
        outputKey: 'briefing_context',
        enabled: true
      },
      {
        id: 'tpl-daily-rank',
        type: 'classifier',
        title: '信号分层',
        role: '把信息分为必读、追踪、素材、创作、降噪五类，并说明分层依据。',
        prompt: '按照质量等级、用户兴趣、来源可信度、可行动性和新鲜度给资讯分层，避免平均用力。',
        classifierLabels: '必读,追踪,素材,创作,降噪',
        inputKey: 'briefing_context',
        outputKey: 'ranked_signals',
        enabled: true
      },
      {
        id: 'tpl-daily-llm',
        type: 'llm',
        title: '大模型解读',
        role: '把高价值信号解释成对用户有意义的判断、机会、风险和下一步行动。',
        prompt: '输出一段清晰的每日汇报：一句话结论、三条必读、风险提醒、行动建议、可沉淀素材。',
        inputKey: 'ranked_signals',
        outputKey: 'briefing_analysis',
        enabled: true
      },
      {
        id: 'tpl-daily-actions',
        type: 'skill',
        title: '行动沉淀',
        role: '生成可执行动作：收藏素材、追踪关键词、生成创作草稿、记录画像快照。',
        prompt: '根据分析结果生成后续动作队列，并标明每个动作的触发原因和预期价值。',
        skillId: 'profile-memory',
        inputKey: 'briefing_analysis',
        outputKey: 'action_queue',
        enabled: true
      },
      {
        id: 'tpl-daily-output',
        type: 'output',
        title: '结构化输出',
        role: '生成可阅读、可追踪、可导出的最终汇报。',
        prompt: '输出 Markdown 结构，包含结论、依据、引用来源、行动清单和素材沉淀建议。',
        inputKey: 'action_queue',
        outputKey: 'final_briefing',
        enabled: true
      }
    ]
  },
  {
    id: 'github-project-evaluator',
    name: 'GitHub 项目评估工作流',
    description: '评估热门开源项目的真实用途、成熟度、适用人群和可落地场景。',
    source: '参考 Flowise / Langflow 的节点化评估链路',
    tags: ['GitHub', '开源评估', '项目场景'],
    nodes: [
      {
        id: 'tpl-github-input',
        type: 'input',
        title: '项目输入',
        role: '读取 GitHub 榜单、README 摘要、Stars、更新时间、语言和媒体线索。',
        prompt: '聚合项目元数据、README 介绍、图片线索、仓库活跃度和当前用户关注领域。',
        inputKey: 'github_items',
        outputKey: 'repo_context',
        enabled: true
      },
      {
        id: 'tpl-github-condition',
        type: 'condition',
        title: '质量门槛',
        role: '过滤过期、描述空泛、缺少应用场景或证据不足的项目。',
        prompt: '至少需要 3 个项目；优先保留有 README、近期更新、明确应用场景和可解释价值的项目。',
        conditionMetric: 'githubCount',
        conditionOperator: '>=',
        conditionValue: 3,
        inputKey: 'repo_context',
        outputKey: 'quality_pass',
        enabled: true
      },
      {
        id: 'tpl-github-skill',
        type: 'skill',
        title: '证据增强',
        role: '整理 README 图片、官网截图、演示视频、引用链接和重复媒体风险。',
        prompt: '生成媒体质量审计：正文图片优先，过滤 logo/小图标，记录缺图、重复图和可引用链接。',
        skillId: 'github-evaluator',
        inputKey: 'quality_pass',
        outputKey: 'evidence_pack',
        enabled: true
      },
      {
        id: 'tpl-github-llm',
        type: 'llm',
        title: '应用场景判断',
        role: '用大模型解释项目解决什么问题、适合谁、能落地到什么业务场景。',
        prompt: '为每个项目输出：核心价值、适用人群、典型应用场景、集成难度、风险和下一步试用建议。',
        inputKey: 'evidence_pack',
        outputKey: 'repo_judgement',
        enabled: true
      },
      {
        id: 'tpl-github-output',
        type: 'output',
        title: '项目卡片输出',
        role: '形成可以进入资讯卡片、素材库和内容创作的项目洞察。',
        prompt: '输出项目对比表和推荐排序，保留来源链接、图片线索和可沉淀素材字段。',
        inputKey: 'repo_judgement',
        outputKey: 'final_repo_cards',
        enabled: true
      }
    ]
  },
  {
    id: 'material-to-article',
    name: '素材转文章工作流',
    description: '把资讯卡片、每日汇报和本地素材转成可继续编辑的文章草稿。',
    source: '参考 n8n 的可执行自动化与 Langflow 的多 Agent 协作',
    tags: ['素材库', '内容创作', '知识资产'],
    nodes: [
      {
        id: 'tpl-article-input',
        type: 'input',
        title: '素材读取',
        role: '读取素材库、收藏资讯、今日汇报、用户选题和目标读者。',
        prompt: '把可用素材按主题、来源、观点、证据、媒体资源分类，形成写作输入包。',
        inputKey: 'material_pool',
        outputKey: 'writing_context',
        enabled: true
      },
      {
        id: 'tpl-article-classifier',
        type: 'classifier',
        title: '选题聚类',
        role: '把素材聚类为可写选题，并区分观点型、教程型、趋势型和复盘型文章。',
        prompt: '输出 3 个候选选题，每个选题给出核心论点、关键证据、目标读者和缺口。',
        classifierLabels: '观点型,教程型,趋势型,复盘型,资料型',
        inputKey: 'writing_context',
        outputKey: 'topic_candidates',
        enabled: true
      },
      {
        id: 'tpl-article-llm',
        type: 'llm',
        title: '文章架构',
        role: '生成完整大纲、段落目的、引用安排和需要补充的证据。',
        prompt: '选择最有价值的选题，生成类似 Word 文档的文章结构：标题、摘要、正文大纲、引用、结尾行动。',
        inputKey: 'topic_candidates',
        outputKey: 'article_outline',
        enabled: true
      },
      {
        id: 'tpl-article-reply',
        type: 'reply',
        title: '写作风格约束',
        role: '确保文章不是资讯堆砌，而是清晰、有判断、有证据的成稿。',
        prompt: '保持简洁、可信、可读；每个观点必须对应素材或来源；避免空泛口号。',
        inputKey: 'article_outline',
        outputKey: 'style_guardrails',
        enabled: true
      },
      {
        id: 'tpl-article-output',
        type: 'output',
        title: '导出草稿',
        role: '输出可进入内容创作中心继续编辑、导出和沉淀为私有知识库的草稿。',
        prompt: '输出 Markdown 草稿，包含素材引用清单、图片建议、标签和知识库归档建议。',
        inputKey: 'style_guardrails',
        outputKey: 'final_article_draft',
        enabled: true
      }
    ]
  }
];

function createWorkflowTemplateInstance(template, options = {}) {
  const suffix = options.suffix || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const rawNodes = Array.isArray(template?.nodes) ? template.nodes : [];
  if (!rawNodes.length) throw new Error('工作流至少需要一个节点');

  const seenNodeIds = new Set();
  const nodes = rawNodes.map((node, index) => {
    const type = WORKFLOW_NODE_TYPES.includes(node?.type) ? node.type : 'llm';
    const baseId = String(node?.id || `${type}-${index + 1}`).replace(/[^\w-]/g, '') || `${type}-${index + 1}`;
    const id = options.preserveNodeIds && !seenNodeIds.has(baseId) ? baseId : `${baseId}-${suffix}`;
    seenNodeIds.add(id);
    return {
      id,
      type,
      title: String(node?.title || `节点 ${index + 1}`).trim(),
      role: String(node?.role || '').trim(),
      prompt: String(node?.prompt || '').trim(),
      skillId: type === 'skill' ? (node?.skillId || 'evidence-pack') : node?.skillId,
      conditionMetric: type === 'condition' ? (node?.conditionMetric || 'itemCount') : node?.conditionMetric,
      conditionOperator: type === 'condition' ? (node?.conditionOperator || '>=') : node?.conditionOperator,
      conditionValue: type === 'condition' ? Number(node?.conditionValue ?? 1) : node?.conditionValue,
      classifierLabels: type === 'classifier' ? (node?.classifierLabels || '必读,追踪,素材,创作,降噪') : node?.classifierLabels,
      inputKey: String(node?.inputKey || (index === 0 ? 'context' : `step_${index}`)).trim(),
      outputKey: String(node?.outputKey || (type === 'output' ? 'final' : `step_${index + 1}`)).trim(),
      enabled: node?.enabled !== false
    };
  });

  return {
    id: options.id || `${options.idPrefix || template?.id || 'workflow'}-${suffix}`,
    name: String(template?.name || '未命名工作流').trim(),
    description: String(template?.description || '').trim(),
    source: String(options.source || template?.source || 'custom').trim(),
    tags: Array.isArray(template?.tags) ? template.tags.filter(Boolean) : [],
    updatedAt: new Date().toISOString(),
    nodes
  };
}

function validateWorkflowImportPayload(payload) {
  const workflow = payload?.workflow && typeof payload.workflow === 'object' ? payload.workflow : payload;
  if (!workflow || typeof workflow !== 'object') throw new Error('JSON 不是有效的工作流对象');
  if (!String(workflow.name || '').trim()) throw new Error('导入失败：缺少工作流名称 name');
  if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) throw new Error('导入失败：nodes 必须是非空数组');

  workflow.nodes.forEach((node, index) => {
    const label = `第 ${index + 1} 个节点`;
    if (!WORKFLOW_NODE_TYPES.includes(node?.type)) throw new Error(`${label} 的 type 不受支持`);
    if (!String(node?.title || '').trim()) throw new Error(`${label} 缺少 title`);
    if (!String(node?.role || '').trim()) throw new Error(`${label} 缺少 role`);
    if (!String(node?.prompt || '').trim()) throw new Error(`${label} 缺少 prompt`);
  });

  return createWorkflowTemplateInstance(workflow, { idPrefix: 'imported-workflow', source: 'imported-json' });
}

function normalizeWorkflowTemplate(workflow, fallback = DEFAULT_AGENT_WORKFLOW) {
  const base = { ...fallback, ...(workflow || {}) };
  const rawNodes = Array.isArray(base.nodes) && base.nodes.length ? base.nodes : fallback.nodes;
  const nodes = rawNodes.map((node, index) => {
    const type = WORKFLOW_NODE_TYPES.includes(node?.type) ? node.type : 'llm';
    const previousOutputKey = index > 0 ? (rawNodes[index - 1]?.outputKey || `step_${index}`) : 'context';
    return {
      id: node?.id || `wf-${type}-${index + 1}`,
      type,
      title: node?.title || `节点 ${index + 1}`,
      role: node?.role || '描述这个节点负责的判断、工具或输出职责。',
      prompt: node?.prompt || '在这里填写该节点的执行指令。',
      skillId: type === 'skill' ? (node?.skillId || 'evidence-pack') : node?.skillId,
      conditionMetric: type === 'condition' ? (node?.conditionMetric || 'itemCount') : node?.conditionMetric,
      conditionOperator: type === 'condition' ? (node?.conditionOperator || '>=') : node?.conditionOperator,
      conditionValue: type === 'condition' ? Number(node?.conditionValue ?? 1) : node?.conditionValue,
      classifierLabels: type === 'classifier' ? (node?.classifierLabels || '必读,追踪,素材,创作,降噪') : node?.classifierLabels,
      inputKey: String(node?.inputKey || previousOutputKey).trim(),
      outputKey: String(node?.outputKey || (type === 'output' ? 'final_output' : `step_${index + 1}`)).trim(),
      enabled: node?.enabled !== false
    };
  });

  return {
    ...base,
    name: base.name || fallback.name,
    description: base.description || fallback.description,
    nodes
  };
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
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
  const [palette, setPalette] = useState(() => {
    const saved = localStorage.getItem('palette');
    return (saved && PALETTES.some(p => p.id === saved)) ? saved : 'champagne';
  });
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [nav, setNav] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    return NAV_ITEMS.some(item => item.id === requested) ? requested : 'recommendations';
  });
  const [category, setCategory] = useState('all');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [verticalChannel, setVerticalChannel] = useState('all');
  const [mode, setMode] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedNewsDate, setSelectedNewsDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState(() => loadLS('viewMode', 'standard'));
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const { externalIntelligenceItems, setExternalIntelligenceItems, externalIntelligenceOpportunities, setExternalIntelligenceOpportunities, externalIntelligenceWeeklySectors, setExternalIntelligenceWeeklySectors, externalIntelligenceAlerts, setExternalIntelligenceAlerts, externalIntelligenceLoading, externalIntelligenceError, externalIntelligenceUpdatedAt, loadExternalIntelligence } = useExternalIntelligence();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newsPage, setNewsPage] = useState(0);
  const [newsHasMore, setNewsHasMore] = useState(true);
  const [renderLimit, setRenderLimit] = useState(30);
  const filteredRef = useRef(0);
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
  const { agents, setAgents, currentAgent, setCurrentAgent, showAgentForm, setShowAgentForm, editingAgent, setEditingAgent, newAgent, setNewAgent } = useAgents();
  const [agentFilter, setAgentFilter] = useState('全部');
  const [agentPromptRefining, setAgentPromptRefining] = useState(false);
  const [agentWorkflowResult, setAgentWorkflowResult] = useState(() => {
    const saved = loadLS('agentWorkflowResult', null);
    return {
      loading: false,
      content: saved?.content || '',
      error: saved?.error || '',
      missionId: saved?.missionId || ''
    };
  });
  const [agentWorkflowRun, setAgentWorkflowRun] = useState(() => loadLS('agentWorkflowRun', {
    id: '',
    status: 'idle',
    missionLabel: '',
    startedAt: '',
    finishedAt: '',
    trace: []
  }));
  const [agentWorkflowHistory, setAgentWorkflowHistory] = useState(() => {
    const saved = loadLS('agentWorkflowHistory', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [agentWorkflowActions, setAgentWorkflowActions] = useState(() => {
    const saved = loadLS('agentWorkflowActions', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [agentWorkflowPrompt, setAgentWorkflowPrompt] = useState('');
  const [agentWorkflowScope, setAgentWorkflowScope] = useState('daily');
  const [agentWorkflowDraft, setAgentWorkflowDraft] = useState(() => {
    const saved = loadLS('agentWorkflowDraft', DEFAULT_AGENT_WORKFLOW);
    if (!saved || !Array.isArray(saved.nodes) || saved.nodes.length === 0) return normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
    return normalizeWorkflowTemplate(saved);
  });
  const [workflowTemplates, setWorkflowTemplates] = useState(() => {
    const savedTemplates = loadLS('agentWorkflowTemplates', null);
    if (Array.isArray(savedTemplates) && savedTemplates.length > 0) return savedTemplates.map(template => normalizeWorkflowTemplate(template));
    const savedDraft = loadLS('agentWorkflowDraft', DEFAULT_AGENT_WORKFLOW);
    const baseDraft = savedDraft && Array.isArray(savedDraft.nodes) && savedDraft.nodes.length > 0 ? normalizeWorkflowTemplate(savedDraft) : normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
    return [{ ...baseDraft, id: baseDraft.id || 'default-workflow', updatedAt: new Date().toISOString() }];
  });
  const [activeWorkflowId, setActiveWorkflowId] = useState(() => loadLS('activeWorkflowId', 'default-workflow'));
  const [selectedWorkflowNodeId, setSelectedWorkflowNodeId] = useState(() => loadLS('selectedWorkflowNodeId', 'wf-analyst'));
  const [newWorkflowNodeType, setNewWorkflowNodeType] = useState('llm');
  const [draggingWorkflowNodeId, setDraggingWorkflowNodeId] = useState('');
  const [stats, setStats] = useState({ sourceCount: 40, failedSources: 0, updatedAt: '', blockedCount: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // 首次访问（无存储）默认缩进，腾出视觉空间；用户切换后记住偏好
    const stored = localStorage.getItem('sidebarCollapsed');
    return stored === null ? true : stored === 'true';
  });
  const motivationalQuote = useMemo(() => {
    const idx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[idx];
  }, []);
  const [panelCollapsed, setPanelCollapsed] = useState(() => localStorage.getItem('panelCollapsed') === 'true');
  // 导航分组下拉展开：记录哪些主模块展开了细分项
  const [expandedNavGroups, setExpandedNavGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('expandedNavGroups') || '[]'); } catch { return []; }
  });
  const toggleNavGroup = useCallback((id) => {
    setExpandedNavGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);
  useEffect(() => { localStorage.setItem('expandedNavGroups', JSON.stringify(expandedNavGroups)); }, [expandedNavGroups]);
  // 细分模块下拉折叠状态（默认展开）
  const [contextGroupOpen, setContextGroupOpen] = useState(() => localStorage.getItem('contextGroupOpen') !== 'false');
  useEffect(() => { localStorage.setItem('contextGroupOpen', String(contextGroupOpen)); }, [contextGroupOpen]);
  // source management states moved to useSourceManager hook (called after allSources)
  
  const [searchQuery, setSearchQuery] = useState('');
  const [customSourceFilter, setCustomSourceFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  
  const [autoMonitorEnabled, setAutoMonitorEnabled] = useState(() => loadLS('autoMonitorEnabled', false));
  const [monitorInterval, setMonitorInterval] = useState(() => loadLS('monitorInterval', 60)); // 分钟
  const [monitorAlerts, setMonitorAlerts] = useState([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const {
    llmConfig, setLlmConfig,
    llmModels, setLlmModels,
    llmFetching, setLlmFetching,
    llmFetchError, setLlmFetchError,
    llmTestResult, setLlmTestResult,
    llmTesting, setLlmTesting,
    llmManualInput, setLlmManualInput,
    showLlmQuickConfig, setShowLlmQuickConfig,
    allLlmModels,
    llmPresets, upsertPreset, removePreset, activatePreset, activePresetId, setActivePresetId,
  } = useLlmConfig();

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

  const [profilePage, setProfilePage] = useState(1);
  const [copilotPendingMessage, setCopilotPendingMessage] = useState('');
  const [showNewspaperOverlay, setShowNewspaperOverlay] = useState(false);
  const [llmPresetName, setLlmPresetName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', signature: '' });
  const [domainTiers, setDomainTiers] = useState(() => migratePreferenceState({
    'domainTiers:v1': loadLS('domainTiers:v1', null),
    domainPriorities: loadLS('domainPriorities', {}),
  }, 'domain'));
  const [sourceTiers, setSourceTiers] = useState(() => migratePreferenceState({
    'sourceTiers:v1': loadLS('sourceTiers:v1', null),
    sourcePriorities: loadLS('sourcePriorities', {}),
  }, 'source'));
  const [dailyProfileSnapshots, setDailyProfileSnapshots] = useState(() => loadLS('dailyProfileSnapshots', []));
  const [specialFollows, setSpecialFollows] = useState(() => migrateSpecialFollows(
    loadLS('specialFollows:v2', null) ?? loadLS('specialFollows', [])
  ));
  const [specialFollowForm, setSpecialFollowForm] = useState({ type: 'source', target: '', note: '' });
  const [editingSpecialFollowId, setEditingSpecialFollowId] = useState(null);
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

  // user/token/selectedInterests 持久化由 useAuth 内部处理，此处不再重复
  useEffect(() => {
    saveLS('domainTiers:v1', domainTiers);
    saveLS('sourceTiers:v1', sourceTiers);
    saveLS('dailyProfileSnapshots', dailyProfileSnapshots);
    saveLS('specialFollows:v2', specialFollows);
  }, [domainTiers, sourceTiers, dailyProfileSnapshots, specialFollows]);


  // 认证函数已抽取至 useAuth — 这里不再定义

  const [allSources, setAllSources] = useState([]);
  const [sourceGrades, setSourceGrades] = useState({});
  const [serverCategories, setServerCategories] = useState([]);

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

  const [gradeFilter, setGradeFilter] = useState('all');
  const [sourceTypeTab, setSourceTypeTab] = useState('builtin');
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
  const {
    customUrlInput, setCustomUrlInput,
    customUrlResult, setCustomUrlResult,
    customUrlLoading, setCustomUrlLoading,
    customUrlError, setCustomUrlError,
    customUrlMode, setCustomUrlMode,
    fetchCustomUrl,
  } = useCustomUrl();
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
  } = useSourceManager({ allSources });  // githubLang/githubSince 已移入 useTrending
  // calendar states moved to useCalendar hook

  const [bookmarks, setBookmarks] = useState(() => loadLS('bookmarks', []));
  const [materials, setMaterials] = useState(() => loadLS('materials', []));
  const [articles, setArticles] = useState(() => loadLS('articles', []));
  const creativeWorkspace = useCreativeWorkspace({ syncEnabled: isLoggedIn });
  const [expandedSummary, setExpandedSummary] = useState({});
  const [summaryCache, setSummaryCache] = useState(() => loadLS('summaryCache', {}));
  const [summaryLoading, setSummaryLoading] = useState({});
  const [followKeywords, setFollowKeywords] = useState(() => loadLS('followKeywords', []));
  const [pinnedKeywords, setPinnedKeywords] = useState(() => loadLS('pinnedKeywords', []));
  const [recommendationFeedback, setRecommendationFeedback] = useState(() => loadLS('recommendationFeedback', {
    hiddenIds: [],
    boostedCategories: {},
    mutedSources: {},
    trackedTerms: {}
  }));
  const [recommendationFeedbackEvents, setRecommendationFeedbackEvents] = useState(() => loadLS('recommendationFeedback:v2', []));
  const snapshotStoreRef = useRef(null);
  if (!snapshotStoreRef.current) snapshotStoreRef.current = createSnapshotStore(localStorage);
  const [recommendationSnapshots, setRecommendationSnapshots] = useState(() => snapshotStoreRef.current.list());
  const [newKeyword, setNewKeyword] = useState('');
  const [searchHistory, setSearchHistory] = useState(() => loadLS('searchHistory', []));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchSort, setSearchSort] = useState('time');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [lightbox, setLightbox] = useState({ open: false, src: '', title: '', images: [], index: 0 });
  const [expandedEvents, setExpandedEvents] = useState({});
  const [exportCategory, setExportCategory] = useState('all');
  const [exportRange, setExportRange] = useState('all');

  // customUrl states moved to useCustomUrl hook
  // UI switch states (showFollowDropdown/mobileMenuOpen/showBackToTop) moved to useUI
  const [trackTargets, setTrackTargets] = useState(() => loadLS('trackTargets', []));
  const [briefingConfig, setBriefingConfig] = useState(() => loadLS('briefingConfig', { length: 'standard', includeRead: false }));
  const [newTrackTarget, setNewTrackTarget] = useState('');
  const [readingHistory, setReadingHistory] = useState(() => loadLS('readingHistory', []));
  const [translations, setTranslations] = useState(() => loadLS('translations', {}));
  useEffect(() => { saveLS('translations', translations); }, [translations]);
  useEffect(() => { saveLS('recommendationFeedback:v2', recommendationFeedbackEvents); }, [recommendationFeedbackEvents]);
  const [aiInsights, setAiInsights] = useState({ loading: false, data: null, error: '' });
  const [elfQuotedContext, setElfQuotedContext] = useState(null);
  const [translationOpen, setTranslationOpen] = useState({});
  const [translatingItems, setTranslatingItems] = useState({});
  // GitHub 项目 AI 情报实时分析（per-repo，localStorage 持久化）
  const [githubInsights, setGithubInsights] = useState(() => loadLS('githubInsights', {}));
  const [githubInsightLoading, setGithubInsightLoading] = useState({});
  // moreNavOpen moved to useUI
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
  
  // 滚动资讯热点状态：从实时 items 派生热门资讯，保证数据准确实时
  const [scrollingNewsPaused, setScrollingNewsPaused] = useState(false);
  const scrollingNewsRef = useRef(null);
  const scrollingNews = useMemo(() => {
    const sorted = [...items]
      .filter(item => item.title)
      .sort((a, b) => (b.mustReadScore || b.hot || 0) - (a.mustReadScore || a.hot || 0))
      .slice(0, 12);
    if (sorted.length > 0) return sorted.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      source: item.source || '',
      time: item.publishedAt ? formatRelative(item.publishedAt) : '',
      hot: (item.mustReadScore || 0) >= 60,
    }));
    return [];
  }, [items]);

  const editorTextareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const workflowImportInputRef = useRef(null);

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

  const [recentVisits, setRecentVisits] = useState(() => loadLS('recentVisits', []));

  // 30+ 个 saveLS 合并为一个统一同步 effect — 任何 state 变化只触发一次写入
  useEffect(() => {
    const map = {
      customSources, sourceHealth, disabledSources, calendarEvents: events,
      bookmarks, materials, materialSpaces, articleSpaces, articles,
      summaryCache, followKeywords, pinnedKeywords, recommendationFeedback,
      searchHistory, viewMode, recentVisits, trackTargets, briefingConfig,
      readingHistory, translations, llmConfig,
    };
    for (const [key, val] of Object.entries(map)) saveLS(key, val);
    // localStorage 直写的字段
    localStorage.setItem('elfAvatar', elfAvatar || '');
    if (!elfAvatar) localStorage.removeItem('elfAvatar');
    localStorage.setItem('elfAvatarHistory', JSON.stringify(elfAvatarHistory));
    localStorage.setItem('elfName', elfName);
  }, [
    customSources, sourceHealth, disabledSources, events, bookmarks, materials,
    materialSpaces, articleSpaces, articles, summaryCache, followKeywords,
    pinnedKeywords, recommendationFeedback, searchHistory, viewMode, recentVisits,
    trackTargets, briefingConfig, readingHistory, translations, llmConfig,
    elfAvatar, elfAvatarHistory, elfName,
  ]);
  useEffect(() => {
    saveLS('agentWorkflowDraft', agentWorkflowDraft);
    saveLS('agentWorkflowTemplates', workflowTemplates);
    saveLS('activeWorkflowId', activeWorkflowId);
    saveLS('agentWorkflowRun', agentWorkflowRun);
    if (!agentWorkflowResult.loading) saveLS('agentWorkflowResult', agentWorkflowResult);
    saveLS('agentWorkflowHistory', agentWorkflowHistory);
    saveLS('agentWorkflowActions', agentWorkflowActions);
    saveLS('selectedWorkflowNodeId', selectedWorkflowNodeId);
  }, [agentWorkflowDraft, workflowTemplates, activeWorkflowId, agentWorkflowRun, agentWorkflowResult, agentWorkflowHistory, agentWorkflowActions, selectedWorkflowNodeId]);

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
        // 优先增加渲染数（渲染分页），已加载数据渲染完才请求 API 加载更多
        if (filteredRef.current > renderLimit) {
          setRenderLimit(r => r + 30);
        } else if (newsHasMore && !loadingMore) {
          loadMoreNews();
        }
      },
      { root: el, rootMargin: '200px' }
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

    if (followKeywords.length > 0) {
      result.sort((a, b) => {
        const aFollow = followKeywords.some(kw => `${a.title} ${a.summary}`.toLowerCase().includes(kw.toLowerCase())) ? 0 : 1;
        const bFollow = followKeywords.some(kw => `${b.title} ${b.summary}`.toLowerCase().includes(kw.toLowerCase())) ? 0 : 1;
        return aFollow - bFollow;
      });
    }

    return result;
  }, [items, category, mode, sourceFilter, followKeywords, regionFilter]);

  // 同步 filtered.length 到 ref，供 IntersectionObserver 回调读取（避免 TDZ）
  filteredRef.current = filtered.length;

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
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [filtered]);

  const sourceStats = useMemo(() => items.reduce((s, i) => ({ ...s, [i.region]: (s[i.region] || 0) + 1 }), { domestic: 0, overseas: 0, global: 0 }), [items]);

  const availableNewsDates = useMemo(() => {
    const dates = [...new Set(items.map(item => item.publishedAt?.slice(0, 10)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return dates.slice(0, 14);
  }, [items]);

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
    const categoryTrend30 = categories.map(cat => {
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
      const label1 = categories.find(c => c.id === cat1)?.label || cat1;
      const label2 = categories.find(c => c.id === cat2)?.label || cat2;
      categoryCorrelations.push({ cat1, cat2, label1, label2, count });
    });
    categoryCorrelations.sort((a, b) => b.count - a.count);

    // 赛道增长率（近7天 vs 前7天）+ 7日趋势线
    const categoryGrowth = categories.map(cat => {
      const daily7 = day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length);
      const recent = daily7.reduce((a, b) => a + b, 0);
      const prev = day7prev.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length).reduce((a, b) => a + b, 0);
      const growth = prev === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - prev) / prev) * 100);
      return { id: cat.id, label: cat.label, recent, prev, growth, daily7 };
    }).sort((a, b) => b.growth - a.growth);

    // 赛道动量分数（近3天加权）
    const day3 = day7.slice(4);
    const categoryMomentum = categories.map(cat => {
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
    const techRadar = categories.map(cat => {
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
      id, label: categories.find(c => c.id === id)?.label || id, count,
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

  // 统一推荐引擎：系统A(用户权重)+系统B(AI算法)+系统C(动态行为)
  const todayMustRead = useMemo(() => {
    const readIds = new Set(readingHistory.map(h => h.id));
    const bookmarkIds = new Set(bookmarks.map(b => b.itemId || b.id));
    
    // 领域热度统计（基于当前所有文章）
    const categoryPopularity = new Map();
    items.forEach(item => {
      if (item.category) {
        categoryPopularity.set(item.category, (categoryPopularity.get(item.category) || 0) + 1);
      }
    });
    const maxCategoryPop = Math.max(...categoryPopularity.values(), 1);

    // 热门关键词统计
    const keywordFrequency = new Map();
    items.forEach(item => {
      const text = `${item.title} ${item.summary || ''}`.toLowerCase();
      const words = text.match(/\b[a-z\u4e00-\u9fa5]{2,}\b/g) || [];
      words.forEach(word => {
        if (!/^[a-z]{2}$/.test(word)) { // 过滤过短的英文单词
          keywordFrequency.set(word, (keywordFrequency.get(word) || 0) + 1);
        }
      });
    });
    const topKeywords = [...keywordFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
    const eventClusters = clusterEvents(items);
    const clusterByItemId = new Map();
    eventClusters.forEach(cluster => cluster.itemIds.forEach(id => clusterByItemId.set(id, cluster)));
    const effectiveDomainTiers = selectedInterests.reduce(
      (tiers, id) => ({ ...tiers, [id]: tiers[id] || 'normal' }),
      { ...domainTiers }
    );
    const effectiveSpecialFollows = [
      ...specialFollows,
      ...followKeywords.map(target => ({ type: 'keyword', target })),
    ];

    return items
      .filter(item => !readIds.has(item.id))  // 已读过滤：避免重复推荐
      .map(item => {
        let score = 0;
        
        // 1. 领域匹配分数（用户关注领域）
        const domainPriority = domainTierScore(domainTiers[item.category]);
        if (domainPriority > 0) {
          score += (domainPriority - 3) * 6;
        }
        if (selectedInterests && selectedInterests.length > 0) {
          if (selectedInterests.includes(item.category)) {
            score += 30; // 直接匹配用户关注的领域
          }
          // 检查相关领域
          const relatedCategories = CATEGORY_GROUPS
            .filter(group => group.categories.includes(item.category))
            .flatMap(group => group.categories);
          if (relatedCategories.some(cat => selectedInterests.includes(cat))) {
            score += 15; // 匹配相关领域
          }
        }

        // 2. 关键词匹配分数
        followKeywords.forEach(kw => {
          if (`${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase())) {
            score += 20;
          }
        });

        // 3. 资讯热度分数
        // 3.1 标题质量（长度适中）
        const titleLen = item.title?.length || 0;
        if (titleLen >= 20 && titleLen <= 60) score += 5;
        else if (titleLen > 60) score += 2;
        
        // 3.2 摘要完整性
        if (item.summary && item.summary.length > 50) score += 5;
        
        // 3.3 媒体丰富度
        if (item.imageUrl) score += 5;
        if (item.videoUrl) score += 3;
        
        // 3.4 领域热度（该领域的文章数量）
        const categoryScore = categoryPopularity.get(item.category) || 0;
        score += Math.round((categoryScore / maxCategoryPop) * 10);
        
        // 3.5 热门关键词匹配
        const itemText = `${item.title} ${item.summary || ''}`.toLowerCase();
        const hotKeywordMatches = topKeywords.filter(kw => itemText.includes(kw)).length;
        score += Math.min(hotKeywordMatches * 2, 10);

        // 4. 来源权重
        const highWeightSources = ['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft', 'NVIDIA', 'Tesla', 'SpaceX'];
        if (highWeightSources.some(s => item.source?.includes(s))) score += 10;
        const mediumWeightSources = ['IEEE', 'Nature', 'Science', 'MIT', 'Stanford', 'Berkeley'];
        if (mediumWeightSources.some(s => item.source?.includes(s))) score += 5;
        const sourcePriority = sourceTierScore(sourceTiers[item.source]);
        if (sourcePriority > 0) {
          score += (sourcePriority - 3) * 5;
        }
        // 特别关注来源额外加权
        const sf = specialFollows.find(f => {
          const target = f.target?.toLocaleLowerCase();
          if (!target) return false;
          if (f.type === 'source' || f.type === 'author') return item.source?.toLocaleLowerCase().includes(target);
          if (f.type === 'url') return (item.url || item.link || '').toLocaleLowerCase().includes(target);
          return `${item.title || ''} ${item.summary || ''}`.toLocaleLowerCase().includes(target);
        });
        if (sf) score += 20;

        // 5. 互动热度（基于用户行为）
        if (bookmarkIds.has(item.id)) score += 15; // 已收藏
        // 阅读历史中该类别的阅读频率
        const categoryReadCount = readingHistory.filter(h => h.category === item.category).length;
        if (categoryReadCount > 0) score += Math.min(categoryReadCount * 2, 10);
        const sourceReadCount = readingHistory.filter(h => h.source === item.source).length;
        if (sourceReadCount > 0) score += Math.min(sourceReadCount * 1.5, 8);

        // 6. 新鲜度
        const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        if (age < 1) score += 15; // 1小时内
        else if (age < 3) score += 12; // 3小时内
        else if (age < 6) score += 8; // 6小时内
        else if (age < 12) score += 5; // 12小时内
        else if (age < 24) score += 2; // 24小时内
        // 超过24小时不加分

        const recommendationReasons = [];
        const recommendationScoreParts = {};
        if (selectedInterests.includes(item.category)) {
          recommendationReasons.push('匹配你的关注领域');
          recommendationScoreParts.interest = 30;
        }
        if (domainPriority >= 4) {
          recommendationReasons.push('画像提高了该领域优先级');
          recommendationScoreParts.domainPriority = (domainPriority - 3) * 6;
        }
        if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) {
          recommendationReasons.push('命中你的追踪关键词');
          recommendationScoreParts.keyword = 20;
        }
        if ((categoryScore / maxCategoryPop) >= 0.7) {
          recommendationReasons.push('所在赛道今日热度高');
          recommendationScoreParts.trend = Math.round((categoryScore / maxCategoryPop) * 10);
        }
        if (highWeightSources.some(s => item.source?.includes(s)) || mediumWeightSources.some(s => item.source?.includes(s))) {
          recommendationReasons.push('来自高质量来源');
          recommendationScoreParts.source = highWeightSources.some(s => item.source?.includes(s)) ? 10 : 5;
        }
        if (sourcePriority >= 4) {
          recommendationReasons.push('来自你高信任信号源');
          recommendationScoreParts.sourcePriority = (sourcePriority - 3) * 5;
        }
        if (age < 6) {
          recommendationReasons.push('发布时间较新');
          recommendationScoreParts.freshness = age < 1 ? 15 : age < 3 ? 12 : 8;
        }
        if (bookmarkIds.has(item.id)) {
          recommendationReasons.push('你已收藏，适合继续沉淀');
          recommendationScoreParts.behavior = 15;
        } else if (categoryReadCount > 0) {
          recommendationReasons.push('符合你的历史阅读偏好');
          recommendationScoreParts.behavior = Math.min(categoryReadCount * 2, 10) + Math.min(sourceReadCount * 1.5, 8);
        }
        if (item.imageUrl || item.videoUrl) {
          recommendationReasons.push('素材形态更完整');
          recommendationScoreParts.media = (item.imageUrl ? 5 : 0) + (item.videoUrl ? 3 : 0);
        }
        const uniqueReasons = [...new Set(recommendationReasons)].slice(0, 3);

        const cluster = clusterByItemId.get(item.id);
        const grade = item.sourceGradeLabel?.charAt(0) || item.grade;
        const sourceQualityScore = ({ S: 20, A: 17, B: 13, C: 9, D: 4 })[grade] || 10;
        return buildRecommendation({
          ...item,
          canonicalId: item.canonicalId || cluster?.id,
          sourceQualityScore,
        }, {
          domainTiers: effectiveDomainTiers,
          sourceTiers,
          specialFollows: effectiveSpecialFollows,
          independentSourceCount: cluster?.independentSourceCount || 1,
          trendVelocity: categoryScore / maxCategoryPop,
          behaviorSignal: bookmarkIds.has(item.id)
            ? 10
            : Math.min(categoryReadCount * 1.5 + sourceReadCount, 10),
          isNovel: !readIds.has(item.id),
        });
      })
      .sort((a, b) => b.mustReadScore - a.mustReadScore)
      .slice(0, 80);
  }, [items, followKeywords, readingHistory, bookmarks, selectedInterests, domainTiers, sourceTiers, specialFollows]);

  const recommendationCandidates = useMemo(() => todayMustRead.filter(item =>
    item.publishedAt?.slice(0, 10) === selectedNewsDate
  ), [todayMustRead, selectedNewsDate]);

  const recommendationLanes = useMemo(() => selectBriefingLanes(recommendationCandidates, {
    perLane: 5,
    maxPerSource: 2,
    maxCategoryRatio: 0.4,
  }), [recommendationCandidates]);

  const selectedRecommendationSnapshot = useMemo(() => {
    if (!selectedNewsDate) return null;
    return snapshotStoreRef.current.get(selectedNewsDate);
  }, [selectedNewsDate, recommendationSnapshots]);

  const displayRecommendationLanes = useMemo(() => {
    const liveCount = (recommendationLanes.public?.length || 0) + (recommendationLanes.personal?.length || 0);
    if (liveCount > 0) return recommendationLanes;
    return selectedRecommendationSnapshot?.lanes || recommendationLanes;
  }, [recommendationLanes, selectedRecommendationSnapshot]);

  const algorithmBriefing = useMemo(() => buildAlgorithmBriefing({
    date: selectedNewsDate,
    lanes: recommendationLanes,
  }), [selectedNewsDate, recommendationLanes]);

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

  const workbenchItems = useMemo(() => {
    const seen = new Set();
    const hiddenIds = new Set(recommendationFeedback.hiddenIds || []);
    const boostedCategories = recommendationFeedback.boostedCategories || {};
    const mutedSources = recommendationFeedback.mutedSources || {};
    const trackedTerms = recommendationFeedback.trackedTerms || {};
    const enrichedDateItems = selectedDateItems
      .filter(item => (item.mustReadScore || 0) > 0 || selectedInterests.includes(item.category) || item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A'));
    const fallbackDateItems = selectedDateItems.filter(item => !enrichedDateItems.includes(item));
    const primary = [...todayMustRead, ...enrichedDateItems, ...fallbackDateItems]
      .filter(item => {
        if (!item?.id || seen.has(item.id) || hiddenIds.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map(item => {
        const feedbackBoost = (boostedCategories[item.category] || 0) * 8;
        const sourcePenalty = (mutedSources[item.source] || 0) * 12;
        const trackedBoost = Object.keys(trackedTerms).some(term => `${item.title} ${item.summary}`.toLowerCase().includes(term.toLowerCase())) ? 14 : 0;
        const feedbackScore = feedbackBoost + trackedBoost - sourcePenalty;
        if (item.recommendation) {
          const extraReasons = [];
          if (feedbackBoost > 0) extraReasons.push('你要求更多类似内容');
          if (trackedBoost > 0) extraReasons.push('匹配继续追踪主题');
          if (sourcePenalty > 0) extraReasons.push('已降低此来源权重');
          return {
            ...item,
            mustReadScore: (item.mustReadScore || 0) + feedbackScore,
            recommendationReasons: [...new Set([...(item.recommendationReasons || []), ...extraReasons])].slice(0, 3),
            recommendation: [...new Set([...(item.recommendationReasons || []), ...extraReasons])].slice(0, 3).join(' · ') || item.recommendation
          };
        }
        const reasons = [];
        if (selectedInterests.includes(item.category)) reasons.push('匹配你的关注领域');
        if (followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))) reasons.push('命中你的追踪关键词');
        if (item.sourceGradeLabel?.startsWith('S') || item.sourceGradeLabel?.startsWith('A')) reasons.push('来源质量较高');
        const age = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
        if (age < 6) reasons.push('发布时间较新');
        if (feedbackBoost > 0) reasons.push('你要求更多类似内容');
        if (trackedBoost > 0) reasons.push('匹配继续追踪主题');
        if (sourcePenalty > 0) reasons.push('已降低此来源权重');
        return {
          ...item,
          mustReadScore: Math.max(0, feedbackScore),
          recommendationReasons: reasons.slice(0, 3),
          recommendation: reasons.length ? reasons.slice(0, 3).join(' · ') : '与所选日期和当前筛选条件相关'
        };
      })
      .sort((a, b) => (b.mustReadScore || 0) - (a.mustReadScore || 0));
    return primary;
  }, [todayMustRead, selectedDateItems, selectedInterests, followKeywords, recommendationFeedback]);

  const workbenchStats = useMemo(() => {
    const gradeCounts = workbenchItems.reduce((acc, item) => {
      const grade = item.sourceGradeLabel?.charAt(0) || item.grade || 'N/A';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});
    const focusMatches = workbenchItems.filter(item => selectedInterests.includes(item.category)).length;
    const keywordMatches = workbenchItems.filter(item => followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))).length;
    const savedCount = workbenchItems.filter(item => isBookmarked(item.id) || isInMaterials(item.id)).length;
    return { gradeCounts, focusMatches, keywordMatches, savedCount };
  }, [workbenchItems, selectedInterests, followKeywords, bookmarks, materials]);

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

  const intelligenceProfile = useMemo(() => {
    const focusLabels = selectedInterests.map(id => categories.find(c => c.id === id)?.label || id);
    const boosted = Object.entries(recommendationFeedback.boostedCategories || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => categories.find(c => c.id === id)?.label || id);
    const muted = Object.keys(recommendationFeedback.mutedSources || {}).slice(0, 3);
    const tracked = [...new Set([...followKeywords, ...Object.keys(recommendationFeedback.trackedTerms || {})])].slice(0, 8);

    return {
      focusLabels,
      boosted,
      muted,
      tracked,
      depth: workbenchItems.length > 0 && workbenchStats.focusMatches / Math.max(workbenchItems.length, 1) > 0.5 ? '深度聚焦' : '探索校准',
      outputGoal: materials.length > bookmarks.length ? '素材沉淀' : '阅读判断'
    };
  }, [selectedInterests, recommendationFeedback, followKeywords, workbenchItems.length, workbenchStats.focusMatches, materials.length, bookmarks.length]);


  const profilePriorityItems = useMemo(() => {
    const base = selectedInterests.length ? selectedInterests : categories.slice(0, 6).map(c => c.id);
    return base.slice(0, 8).map((id, index) => {
      const category = categories.find(c => c.id === id);
      return {
        id,
        label: category?.label || id,
        tier: domainTiers[id] || (index < 2 ? 'focus' : index < 5 ? 'normal' : 'explore'),
        icon: category?.icon || 'target'
      };
    });
  }, [selectedInterests, domainTiers, categories]);

  const sourcePriorityItems = useMemo(() => {
    const fallbackSources = Array.isArray(insightData.sourceQuality) ? insightData.sourceQuality : [];
    const sources = readingProfile.topSources.length
      ? readingProfile.topSources
      : fallbackSources.slice(0, 5).map(source => ({ name: source.name, count: source.count }));
    return sources.slice(0, 6).map((source, index) => ({
      name: source.name,
      count: source.count || 0,
      tier: sourceTiers[source.name] || (index < 2 ? 'focus' : index < 4 ? 'normal' : 'explore')
    }));
  }, [readingProfile.topSources, insightData.sourceQuality, sourceTiers]);

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

  const workflowTypeMeta = useMemo(() => ({
    input: { label: '输入', tone: 'blue' },
    llm: { label: '大模型 Prompt', tone: 'cyan' },
    skill: { label: '工具 Skills', tone: 'green' },
    condition: { label: '条件语句', tone: 'amber' },
    classifier: { label: '分类语句', tone: 'violet' },
    reply: { label: '指定回复', tone: 'rose' },
    output: { label: '输出', tone: 'slate' }
  }), []);

  const workflowRunStatusMeta = useMemo(() => ({
    idle: { label: '待运行', tone: 'neutral' },
    running: { label: '运行中', tone: 'running' },
    completed: { label: '已完成', tone: 'success' },
    blocked: { label: '待配置', tone: 'blocked' },
    failed: { label: '失败', tone: 'failed' }
  }), []);

  const selectedWorkflowNode = useMemo(() => {
    return agentWorkflowDraft.nodes.find(node => node.id === selectedWorkflowNodeId) || agentWorkflowDraft.nodes[0] || null;
  }, [agentWorkflowDraft.nodes, selectedWorkflowNodeId]);

  const selectedWorkflowConnections = useMemo(() => {
    const index = agentWorkflowDraft.nodes.findIndex(node => node.id === selectedWorkflowNodeId);
    return {
      previous: index > 0 ? agentWorkflowDraft.nodes[index - 1] : null,
      next: index >= 0 && index < agentWorkflowDraft.nodes.length - 1 ? agentWorkflowDraft.nodes[index + 1] : null
    };
  }, [agentWorkflowDraft.nodes, selectedWorkflowNodeId]);

  const enabledWorkflowNodes = useMemo(() => {
    return agentWorkflowDraft.nodes.filter(node => node.enabled !== false);
  }, [agentWorkflowDraft.nodes]);

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

  const updateWorkflowDraft = useCallback((patch) => {
    setAgentWorkflowDraft(prev => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!agentWorkflowDraft?.nodes?.length) return;
    setWorkflowTemplates(prev => {
      const draftId = activeWorkflowId || agentWorkflowDraft.id || 'default-workflow';
      const nextDraft = { ...agentWorkflowDraft, id: draftId, updatedAt: new Date().toISOString() };
      if (!prev.some(template => template.id === draftId)) return [...prev, nextDraft];
      return prev.map(template => template.id === draftId ? nextDraft : template);
    });
  }, [agentWorkflowDraft, activeWorkflowId]);

  const switchWorkflowTemplate = useCallback((templateId) => {
    const template = workflowTemplates.find(item => item.id === templateId);
    if (!template) return;
    const normalized = normalizeWorkflowTemplate(template);
    setActiveWorkflowId(templateId);
    setAgentWorkflowDraft(normalized);
    setSelectedWorkflowNodeId(normalized.nodes?.[0]?.id || '');
  }, [workflowTemplates]);

  const saveWorkflowAsTemplate = useCallback(() => {
    const id = `workflow-${Date.now()}`;
    const template = {
      ...agentWorkflowDraft,
      id,
      name: `${agentWorkflowDraft.name || '未命名工作流'} 副本`,
      updatedAt: new Date().toISOString()
    };
    setWorkflowTemplates(prev => [template, ...prev]);
    setActiveWorkflowId(id);
    setAgentWorkflowDraft(template);
    showToast('已保存为新的工作流模板');
  }, [agentWorkflowDraft]);

  const installWorkflowTemplate = useCallback((template) => {
    try {
      const instance = normalizeWorkflowTemplate(createWorkflowTemplateInstance(template, { idPrefix: template.id }));
      setWorkflowTemplates(prev => [instance, ...prev.filter(item => item.id !== instance.id)]);
      setActiveWorkflowId(instance.id);
      setAgentWorkflowDraft(instance);
      setSelectedWorkflowNodeId(instance.nodes[0]?.id || '');
      showToast(`已安装模板：${instance.name}`);
    } catch (e) {
      showToast(e.message || '模板安装失败');
    }
  }, []);

  const importWorkflowJson = useCallback(async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const imported = normalizeWorkflowTemplate(validateWorkflowImportPayload(payload));
      setWorkflowTemplates(prev => [imported, ...prev.filter(item => item.id !== imported.id)]);
      setActiveWorkflowId(imported.id);
      setAgentWorkflowDraft(imported);
      setSelectedWorkflowNodeId(imported.nodes[0]?.id || '');
      showToast(`已导入工作流：${imported.name}`);
    } catch (e) {
      showToast(e.message || '导入失败，请检查 JSON 格式');
    } finally {
      if (workflowImportInputRef.current) workflowImportInputRef.current.value = '';
    }
  }, []);

  const deleteWorkflowTemplate = useCallback((templateId) => {
    setWorkflowTemplates(prev => {
      if (prev.length <= 1) {
        showToast('至少保留一个工作流模板');
        return prev;
      }
      const next = prev.filter(template => template.id !== templateId);
      if (activeWorkflowId === templateId) {
        const fallback = normalizeWorkflowTemplate(next[0]);
        setActiveWorkflowId(fallback.id);
        setAgentWorkflowDraft(fallback);
        setSelectedWorkflowNodeId(fallback.nodes?.[0]?.id || '');
      }
      showToast('已删除工作流模板');
      return next;
    });
  }, [activeWorkflowId]);

  const updateWorkflowNode = useCallback((nodeId, patch) => {
    setAgentWorkflowDraft(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => node.id === nodeId ? { ...node, ...patch } : node)
    }));
  }, []);

  const reorderWorkflowNode = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setAgentWorkflowDraft(prev => {
      const fromIndex = prev.nodes.findIndex(node => node.id === fromId);
      const toIndex = prev.nodes.findIndex(node => node.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const nodes = [...prev.nodes];
      const [moved] = nodes.splice(fromIndex, 1);
      nodes.splice(toIndex, 0, moved);
      return { ...prev, nodes };
    });
  }, []);

  const moveWorkflowNode = useCallback((nodeId, direction) => {
    setAgentWorkflowDraft(prev => {
      const index = prev.nodes.findIndex(node => node.id === nodeId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.nodes.length) return prev;
      const nodes = [...prev.nodes];
      const [moved] = nodes.splice(index, 1);
      nodes.splice(targetIndex, 0, moved);
      return { ...prev, nodes };
    });
  }, []);

  const addWorkflowNode = useCallback(() => {
    const meta = workflowTypeMeta[newWorkflowNodeType] || workflowTypeMeta.llm;
    const node = {
      id: `wf-${newWorkflowNodeType}-${Date.now()}`,
      type: newWorkflowNodeType,
      title: meta.label,
      role: '描述这个节点负责的判断、工具或输出职责。',
      prompt: '在这里填写该节点的执行指令。',
      skillId: newWorkflowNodeType === 'skill' ? 'evidence-pack' : undefined,
      conditionMetric: newWorkflowNodeType === 'condition' ? 'itemCount' : undefined,
      conditionOperator: newWorkflowNodeType === 'condition' ? '>=' : undefined,
      conditionValue: newWorkflowNodeType === 'condition' ? 1 : undefined,
      classifierLabels: newWorkflowNodeType === 'classifier' ? '必读,追踪,素材,创作,降噪' : undefined,
      inputKey: `step_${Math.max(agentWorkflowDraft.nodes.length, 1)}`,
      outputKey: `step_${agentWorkflowDraft.nodes.length + 1}`,
      enabled: true
    };
    setAgentWorkflowDraft(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedWorkflowNodeId(node.id);
  }, [newWorkflowNodeType, workflowTypeMeta, agentWorkflowDraft.nodes.length]);

  const removeWorkflowNode = useCallback((nodeId) => {
    setAgentWorkflowDraft(prev => {
      if (prev.nodes.length <= 1) return prev;
      const nodes = prev.nodes.filter(node => node.id !== nodeId);
      if (selectedWorkflowNodeId === nodeId) {
        setSelectedWorkflowNodeId(nodes[0]?.id || '');
      }
      return { ...prev, nodes };
    });
  }, [selectedWorkflowNodeId]);

  const resetWorkflowDraft = useCallback(() => {
    const normalizedDefault = normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
    setAgentWorkflowDraft(normalizedDefault);
    setSelectedWorkflowNodeId(normalizedDefault.nodes[1]?.id || normalizedDefault.nodes[0]?.id || '');
    showToast('已恢复默认工作流模板');
  }, []);

  const exportWorkflowToMaterials = useCallback(() => {
    addManualMaterial({
      title: `${agentWorkflowDraft.name} 工作流蓝图`,
      content: workflowBlueprintText,
      type: 'analysis',
      source: '智能体工作流',
      url: '',
      tags: '智能体,工作流,蓝图',
      note: '从智创中心智能体工作流导出',
      spaceId: null
    });
    showToast('工作流蓝图已存入素材库');
  }, [agentWorkflowDraft.name, workflowBlueprintText]);

  const downloadWorkflowJson = useCallback(() => {
    const payload = JSON.stringify({ ...agentWorkflowDraft, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentWorkflowDraft.name || 'agent-workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agentWorkflowDraft]);

  const exportWorkflowResultToEditor = useCallback(() => {
    if (!agentWorkflowResult.content) return;
    const traceText = (agentWorkflowRun.trace || [])
      .map(step => `- ${step.order}. ${step.title} [${step.status}]：${step.detail || step.prompt || ''}`)
      .join('\n');
    const newArticle = {
      id: Date.now(),
      title: `${agentWorkflowDraft.name || '智能体工作流'} · ${new Date().toLocaleDateString('zh-CN')}`,
      content: `# ${agentWorkflowDraft.name || '智能体工作流'}\n\n## 任务\n${agentWorkflowRun.missionLabel || '自定义任务'}\n\n## 运行轨迹\n${traceText || '暂无轨迹'}\n\n## 输出结果\n${agentWorkflowResult.content}\n\n---\n\n## 工作流蓝图\n${workflowBlueprintText}`,
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
    setArticles(prev => [...prev, newArticle]);
    setCurrentArticleId(newArticle.id);
    setNav('editor');
    showToast('已导出到内容创作');
  }, [agentWorkflowResult.content, agentWorkflowRun, agentWorkflowDraft.name, workflowBlueprintText]);

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

  function getFeedbackTerm(item) {
    const tags = item.tags || [];
    const preferredTag = tags.find(tag => tag && tag.length >= 2 && tag.length <= 24);
    if (preferredTag) return preferredTag;
    const titleWords = (item.title || '').match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,6}/g) || [];
    return titleWords[0] || item.category || item.source || '';
  }

  const handleRecommendationFeedback = useCallback((item, action) => {
    if (!item) return;
    setRecommendationFeedbackEvents(previous => [{
      itemId: item.id,
      action,
      at: new Date().toISOString(),
    }, ...previous].slice(0, 500));
    if (action === 'hide') {
      setRecommendationFeedback(prev => ({
        ...prev,
        hiddenIds: [...new Set([...(prev.hiddenIds || []), item.id])]
      }));
      showToast('已减少这类不感兴趣内容');
      return;
    }

    if (action === 'more-like-this') {
      if (!item.category) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        boostedCategories: {
          ...(prev.boostedCategories || {}),
          [item.category]: ((prev.boostedCategories || {})[item.category] || 0) + 1
        }
      }));
      if (item.category && !selectedInterests.includes(item.category)) {
        setSelectedInterests(prev => [...new Set([...prev, item.category])]);
      }
      showToast('已提高类似内容权重');
      return;
    }

    if (action === 'mute-source') {
      if (!item.source) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        mutedSources: {
          ...(prev.mutedSources || {}),
          [item.source]: ((prev.mutedSources || {})[item.source] || 0) + 1
        }
      }));
      showToast(`已降低 ${item.source || '该来源'} 的推荐权重`);
      return;
    }

    if (action === 'track') {
      const term = getFeedbackTerm(item);
      if (!term) return;
      setRecommendationFeedback(prev => ({
        ...prev,
        trackedTerms: {
          ...(prev.trackedTerms || {}),
          [term]: ((prev.trackedTerms || {})[term] || 0) + 1
        }
      }));
      setFollowKeywords(prev => prev.includes(term) ? prev : [term, ...prev].slice(0, 20));
      showToast(`已开始追踪「${term}」`);
    }
  }, [selectedInterests]);

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

  function loadNews(b = blocked, append = false, searchQuery = '') {
    if (!append) { setLoading(true); setError(''); setNewsPage(0); setNewsHasMore(true); setRenderLimit(30); }
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
        if (d.items && d.items.length > 0) {
          const sampleRegions = d.items.slice(0, 3).map(i => ({ title: i.title?.substring(0, 30), region: i.region }));
        }
        
        // 标记涉华内容
        const chinaFocusedKeywords = ['China', '中国', '中企', '中国企业', '人民币', '华为', '腾讯', '阿里巴巴', '字节跳动', '对华', '涉华', '中美', '中欧', '一带一路', 'RCEP', '东盟'];
        const itemsWithChinaTag = (d.items || []).map(item => {
          const textToMatch = `${item.title} ${item.summary} ${item.tags ? item.tags.join(' ') : ''}`.toLowerCase();
          const isChinaFocused = chinaFocusedKeywords.some(kw => {
            if (/^[a-zA-Z\s]+$/.test(kw)) {
              return textToMatch.includes(kw.toLowerCase()) || textToMatch.includes(kw);
            }
            return textToMatch.includes(kw.toLowerCase());
          });
          return { ...item, isChinaFocused };
        });
        
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
    if (item.materialType) return item.materialType;
    if (item.source === 'GitHub' || item.category === 'open-source' || item.fullName) return 'project';
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
      creativeWorkspace.removeAsset?.(item.id);
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '已从素材库移除';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } else {
      const detectedType = type || detectMaterialType(item);
      const tags = Array.from(new Set([
        ...(item.tags || []),
        ...(item.topics || []),
        item.language,
        item.category
      ].filter(Boolean)));
      const newMaterial = {
        id: Date.now(),
        type: detectedType,
        title: item.title,
        content: item.summary || item.title,
        fullContent: item.fullContent || item.content || item.summary || item.title,
        source: item.source,
        url: item.url,
        tags,
        imageUrl: item.imageUrl || '',
        insight: item.insight || buildNewsCardInsight(item),
        metadata: item.metadata || null,
        originalItemId: item.id,
        note,
        createdAt: new Date().toISOString()
      };
      setMaterials(prev => [...prev, newMaterial]);
      creativeWorkspace.addAsset?.(newMaterial);
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '✓ 已添加到素材库';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  }

  function addManualMaterial({ title, content, type, source, url, tags, note, spaceId, imageUrl, fullContent, insight, metadata }) {
    const newMaterial = {
      id: Date.now(),
      type,
      title,
      content,
      fullContent: fullContent || content,
      source: source || '手动添加',
      url: url || '',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      note,
      spaceId: spaceId ? Number(spaceId) : null,
      imageUrl: imageUrl || '',
      insight: insight || null,
      metadata: metadata || null,
      createdAt: new Date().toISOString()
    };
    setMaterials(prev => [...prev, newMaterial]);
    setShowAddMaterial(false);
    return newMaterial;
  }

  function continueMaterialInWorkbench(material) {
    if (!material) return;
    setSelectedMaterials([material.id]);
    setCopilotPendingMessage([
      `请基于这条素材继续研究：${material.title || '未命名素材'}`,
      '',
      '【素材内容】',
      String(material.fullContent || material.content || '').slice(0, 3500),
      '',
      '请输出：1）核心判断 2）证据缺口 3）下一步研究清单 4）可沉淀为文章的结构。'
    ].join('\n'));
    goNav('home');
    showToast('已发送到 AI 工作站继续研究');
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
    a.download = `siliconstream-materials-${new Date().toISOString().slice(0, 10)}.json`;
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
    saveArticleVersion(newArticle, 'create');
    return newArticle;
  }

  function updateArticle(id, updates) {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  }

  function articleCitations(article) {
    const linkedIds = new Set((article.materials || []).map(id => String(id)));
    return materials
      .filter(material => linkedIds.has(String(material.id)))
      .flatMap(material => {
        try { return [normalizeAsset(material).citation]; } catch { return []; }
      });
  }

  function saveArticleVersion(article, reason = 'manual', content = article.content) {
    const result = saveDocumentVersion({
      id: article.id,
      title: article.title,
      content,
      status: article.status,
      assetIds: article.materials || [],
      citations: articleCitations(article),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      versionNumber: article.versionNumber || 0,
    }, {
      title: article.title,
      content,
      assetIds: article.materials || [],
      citations: articleCitations(article),
      reason,
    });
    if (!result.ok) showToast(result.code === 'LOCAL_STORAGE_QUOTA' ? '版本保存失败：本地空间不足' : '版本保存失败');
    return result;
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
    
    const exportPayload = exportDocument({
      id: article.id,
      title: article.title || '未命名',
      content: `# ${article.title || '未命名'}\n\n> 创建时间: ${new Date(article.createdAt).toLocaleString('zh-CN')}\n> 更新时间: ${new Date(article.updatedAt).toLocaleString('zh-CN')}\n> 模板: ${ARTICLE_TEMPLATES[article.template] || article.template}\n> 状态: ${ARTICLE_STATUS[article.status] || article.status}\n${article.tags.length > 0 ? `> 标签: ${article.tags.join(', ')}\n` : ''}\n---\n\n${exportContent}`,
      status: article.status,
      updatedAt: article.updatedAt,
      citations: articleCitations(article),
    }, 'md');
    saveArticleVersion(article, 'export', exportContent);
    const blob = new Blob([exportPayload.content], { type: exportPayload.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportPayload.filename || `${title}.md`;
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

  function cleanSummaryText(text = '', max = 160) {
    const normalized = String(text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/arXiv:\S+\s+Announce Type:\s*\w+\s+Abstract:\s*/i, '')
      .replace(/Nature [^,]+,\s*Published online:[^;]+;\s*doi:\S+\s*/i, '')
      .replace(/\bdoi:\s*10\.\S+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return '';
    return normalized.length > max ? `${normalized.slice(0, max).trim()}...` : normalized;
  }

  function getSummaryEntry(item) {
    const cached = summaryCache[item.id];
    if (!cached) return null;
    if (typeof cached === 'object' && cached.text) return cached;
    if (typeof cached === 'string') {
      const isOldTemplate = cached.includes('场景:') || cached.includes('行动:') || cached.includes('核心:');
      if (!isOldTemplate && cached.length <= 220) return { text: cached, mode: 'legacy' };
    }
    return null;
  }

  function buildLocalShortSummary(item) {
    const sourceText = item.bodyIntro || item.fullContent || item.content || item.summary || item.title || '';
    const cleaned = cleanSummaryText(sourceText, 140);
    if (cleaned) return cleaned;
    return cleanSummaryText(`${item.title || ''} ${item.source ? `（${item.source}）` : ''}`, 100);
  }

  function buildArticleEvidence(item, scraped = null) {
    const tags = Array.isArray(item.tags) ? item.tags.join('、') : (item.tags || '');
    return [
      `标题：${item.title || ''}`,
      `来源：${item.source || ''}`,
      tags ? `标签：${tags}` : '',
      item.publishedAt ? `发布时间：${item.publishedAt}` : '',
      item.url ? `链接：${item.url}` : '',
      item.summary ? `RSS摘要：${cleanSummaryText(item.summary, 500)}` : '',
      item.bodyIntro ? `RSS正文片段：${cleanSummaryText(item.bodyIntro, 1400)}` : '',
      item.fullContent ? `素材全文：${cleanSummaryText(item.fullContent, 1400)}` : '',
      item.content ? `内容片段：${cleanSummaryText(item.content, 1000)}` : '',
      scraped?.summary ? `网页抓取摘要：${cleanSummaryText(scraped.summary, 1400)}` : '',
      scraped?.description ? `网页描述：${cleanSummaryText(scraped.description, 500)}` : ''
    ].filter(Boolean).join('\n');
  }

  async function scrapeArticleForSummary(item) {
    if (!item.url) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, mode: 'basic', timeout: 8 }),
        signal: controller.signal
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.error) return null;
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeModelSummary(text, fallback) {
    const cleaned = cleanSummaryText(text, 120)
      .replace(/^摘要[:：]\s*/i, '')
      .replace(/^一句话[:：]\s*/i, '')
      .trim();
    return cleaned || fallback;
  }

  async function ensureSummary(item) {
    if (getSummaryEntry(item) || summaryLoading[item.id]) return;
    const fallback = buildLocalShortSummary(item);
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: { text: fallback, mode: 'local', createdAt: new Date().toISOString() }
      }));
      return;
    }

    setSummaryLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const scraped = await scrapeArticleForSummary(item);
      const evidence = buildArticleEvidence(item, scraped);
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'chat',
          systemPrompt: '你是资讯平台的短摘要助手。只能根据用户提供的文章信息总结，不得编造未给出的事实。',
          messages: [{ role: 'user', content: evidence.slice(0, 6000) }],
          content: '请用中文输出一句不超过70字的真实短摘要，只说这条资讯在讲什么，不要写推荐理由、场景、行动，也不要分点。'
        })
      });
      const data = await res.json();
      const text = data.ok ? normalizeModelSummary(data.content, fallback) : fallback;
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: {
          text,
          mode: data.ok ? (scraped ? 'llm-scraped' : 'llm-card') : 'fallback',
          createdAt: new Date().toISOString()
        }
      }));
    } catch {
      setSummaryCache(prev => ({
        ...prev,
        [item.id]: { text: fallback, mode: 'fallback', createdAt: new Date().toISOString() }
      }));
    } finally {
      setSummaryLoading(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  function handleSummaryToggle(item) {
    const willOpen = !expandedSummary[item.id];
    setExpandedSummary(prev => ({ ...prev, [item.id]: willOpen }));
    if (willOpen) ensureSummary(item);
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

  async function requestTranslation(item) {
    const existing = translations[item.id];
    // 如果存在旧翻译且格式正确（有 summary 字段），直接返回；否则重新翻译
    if (existing && existing.title && existing.title !== item.title && existing.summary !== undefined) {
      return existing;
    }
    if (translatingItems[item.id]) {
      return null;
    }

    const isEnglish = isEnglishText(item.title);
    if (!isEnglish) {
      return null;
    }

    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      showToast('请先在设置中配置大模型 API');
      return null;
    }

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

      if (finalLines.length === 0) {
        showToast('翻译返回空内容');
        return null;
      }

      // 第一行作为标题，其余作为摘要
      const title = finalLines[0] || item.title;
      const summary = finalLines.slice(1).join('\n') || '';

      if (!title || title === item.title) {
        showToast('翻译失败：无法获取翻译结果');
        return null;
      }

      // 检查翻译是否包含中文
      const hasChinese = /[\u4e00-\u9fff]/.test(title);
      if (!hasChinese) {
        showToast('翻译结果不包含中文，请重试');
        return null;
      }

      const translated = { title, summary };
      setTranslations(prev => ({ ...prev, [item.id]: translated }));
      return translated;
    } catch (e) {
      showToast(`翻译失败: ${e.message}`);
      return null;
    } finally {
      setTranslatingItems(prev => ({ ...prev, [item.id]: false }));
    }
  }

  function getTranslation(item) {
    return translations[item.id] || null;
  }

  // GitHub 翻译：切换开关 + 打开时触发请求
  function toggleGithubTranslation(repo) {
    const id = repo.id;
    setTranslationOpen(prev => {
      const next = { ...prev, [id]: !prev[id] };
      // 打开且无缓存时触发翻译
      if (next[id] && !translations[id] && !translatingItems[id]) {
        requestTranslation({ id, title: repo.fullName, summary: repo.description });
      }
      return next;
    });
  }

  // GitHub 项目 AI 情报：实时调 LLM 生成应用场景/适合谁/落地难度/价值判断
  async function requestGithubInsight(repo) {
    const id = repo.id;
    if (githubInsights[id] || githubInsightLoading[id]) return;
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      showToast('请先在设置中配置大模型 API');
      return;
    }
    setGithubInsightLoading(prev => ({ ...prev, [id]: true }));
    try {
      const content = `项目：${repo.fullName}\n描述：${repo.description || '暂无'}\n语言：${repo.language || '未知'}\nStars：${repo.totalStars || 0}\nTopics：${(repo.topics || []).join(', ')}`;
      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'github-evaluator',
          content
        })
      });
      const data = await response.json();
      if (data.error) { showToast(`分析失败: ${data.error}`); return; }
      // 解析返回的结构化 JSON（github-evaluator skill 输出）
      let insight;
      try {
        const match = (data.content || '').match(/\{[\s\S]*\}/);
        insight = match ? JSON.parse(match[0]) : null;
      } catch { insight = null; }
      if (!insight) {
        // 降级：按行解析
        const lines = (data.content || '').split('\n').filter(l => l.trim());
        insight = {
          scenario: lines[0] || '分析失败',
          audience: lines[1] || '',
          difficulty: lines[2] || '',
          value: lines[3] || '',
        };
      }
      const normalized = {
        scenario: insight.scenario || insight.application || '暂无',
        audience: insight.audience || insight.targetUsers || '暂无',
        difficulty: insight.difficulty || insight.complexity || '暂无',
        value: insight.value || insight.worth || '暂无',
      };
      setGithubInsights(prev => {
        const next = { ...prev, [id]: normalized };
        saveLS('githubInsights', next);
        return next;
      });
    } catch (e) {
      showToast(`分析失败: ${e.message}`);
    } finally {
      setGithubInsightLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
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

  // addEvent/removeEvent moved to useCalendar

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
  const activeContextSection = NAV_CONTEXT_SECTIONS[activePrimaryNav] || NAV_CONTEXT_SECTIONS.home;
  const activeContextItems = activeContextSection.items.map(id => NAV_ITEMS.find(item => item.id === id)).filter(Boolean);
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
<Sidebar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} mobileMenuOpen={mobileMenuOpen} nav={nav} goNav={goNav} addRecentVisit={addRecentVisit} activePrimaryNav={activePrimaryNav} activeContextItems={activeContextItems} contextGroupOpen={contextGroupOpen} setContextGroupOpen={setContextGroupOpen} agents={agents} currentAgent={currentAgent} setCurrentAgent={setCurrentAgent} setElfQuotedContext={setElfQuotedContext} buildWorkbenchContext={buildWorkbenchContext} showFollowDropdown={showFollowDropdown} setShowFollowDropdown={setShowFollowDropdown} followKeywords={followKeywords} sortedFollowKeywords={sortedFollowKeywords} pinnedKeywords={pinnedKeywords} pinFollowKeyword={pinFollowKeyword} unpinFollowKeyword={unpinFollowKeyword} removeFollowKeyword={removeFollowKeyword} executeSearch={executeSearch} newKeyword={newKeyword} setNewKeyword={setNewKeyword} addFollowKeyword={addFollowKeyword} bookmarks={bookmarks} filtered={filtered} isLoggedIn={isLoggedIn} user={user} setShowProfileModal={setShowProfileModal} setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} setShowThemePicker={setShowThemePicker} setShowSettings={setShowSettings} setShowShortcuts={setShowShortcuts} PRODUCT_NAME={PRODUCT_NAME} PRODUCT_TAGLINE={PRODUCT_TAGLINE} PRIMARY_NAV_ITEMS={PRIMARY_NAV_ITEMS} />

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
          {nav === 'materials' && (
            <MaterialsPage
              materials={materials}
              llmConfig={llmConfig}
              intelligenceProfile={intelligenceProfile}
              workbenchItems={workbenchItems}
              selectedInterests={selectedInterests}
              categories={categories}
              allLlmModels={allLlmModels}
              onOpenLlmConfig={() => setShowLlmQuickConfig(true)}
              pendingMessage={copilotPendingMessage}
              onMessageSent={() => setCopilotPendingMessage('')}
              selectedNewsDate={selectedNewsDate}
              algorithmBriefing={algorithmBriefing}
              externalIntelligenceItems={externalIntelligenceItems}
              recommendationLanes={recommendationLanes}
              onOpenNewspaper={() => setShowNewspaperOverlay(true)}
              todayBriefing={todayBriefing}
              todayLanes={todayLanes}
              materials={materials}
            />
          )}
          {nav === 'today-legacy' && (
            <div className="workbench-shell">
              <section className="workbench-overview">
                <div className="workbench-hero-copy">
                  <div className="workbench-kicker">Personal Intelligence</div>
                  <h1 className="workbench-title">今日情报工作台</h1>
                  <p className="workbench-subtitle">少看一点，理解更深一点。系统会按日期、关注领域和来源质量帮你收敛到真正值得读的内容。</p>
                <div className="hero-briefing-summary">
                  <BlockStat value={insightData.todayCount} label="今日资讯" size="md" />
                  <BlockStat value={topMustRead.length} label="必读推荐" size="md" />
                  <BlockStat value={selectedInterests.length} label="关注领域" size="md" />
                  <BlockStat value={`${Math.abs(insightData.dailyChange || 0)}%`} label="日变化" size="md" trendDir={(insightData.dailyChange || 0) >= 0 ? 'up' : 'down'} />
                </div>
                </div>

                <div className="timeline-manager">
                  <div className="date-manager-head">
                    <span>日期管理</span>
                    <input
                      type="date"
                      value={selectedNewsDate}
                      onChange={e => setSelectedNewsDate(e.target.value)}
                    />
                  </div>
                  <div className="date-pill-row">
                    {availableNewsDates.slice(0, 7).map(date => (
                      <button
                        key={date}
                        className={`date-pill ${selectedNewsDate === date ? 'active' : ''}`}
                        onClick={() => setSelectedNewsDate(date)}
                      >
                        <span>{date.slice(5)}</span>
                        <small>{items.filter(item => item.publishedAt?.slice(0, 10) === date).length}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="workbench-preferences">
                  <div className="workbench-block-title">关注领域</div>
                  <ColorfulBubbles
                    interests={selectedInterests}
                    categories={categories}
                    onBubbleClick={(catId) => setCategory(catId)}
                    onEmptyClick={() => setShowInterestModal(true)}
                  />
                </div>

              </section>

              <section className="workbench-feed-panel">
                <div className="workbench-toolbar">
                  <div>
                    <div className="workbench-section-label">Daily Briefing</div>
                    <h2>今日推荐</h2>
                  </div>
                  <div className="workbench-toolbar-actions">
                    <div className="search-wrap workbench-search">
                      {ICONS.search}
                      <input ref={searchInputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索技术、公司、项目..." />
                    </div>
                    <button className="btn-refresh workbench-refresh" onClick={() => loadNews()}>
                      {ICONS.refresh}
                      <span>刷新</span>
                    </button>
                  </div>
                </div>

                <BlockToolbar hidden>
                  <BlockToolbar.Pills
                    options={[{ id: 'all', label: '全部' }, ...MODES.filter(m => m.id !== 'all').map(m => ({ id: m.id, label: m.label }))]}
                    value={mode}
                    onChange={setMode}
                    ariaLabel="模式筛选"
                  />
                  <BlockToolbar.Pills
                    options={[{ id: 'all', label: '全球' }, { id: 'domestic', label: '国内' }, { id: 'overseas', label: '海外' }]}
                    value={regionFilter}
                    onChange={setRegionFilter}
                    ariaLabel="地区筛选"
                  />
                </BlockToolbar>

                {loading && <div className="feed-list">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} viewMode="standard" />)}</div>}
                {error && <div className="error-state"><p>加载失败: {error}</p><button onClick={() => loadNews()}>重试</button></div>}
                {!loading && !error && workbenchItems.length === 0 && (
                  <div className="empty-state">
                    <p>当前日期还没有匹配资讯</p>
                    <button onClick={() => { setQuery(''); setCategory('all'); setMode('all'); setSourceFilter('all'); }}>重置筛选</button>
                  </div>
                )}
                {!loading && !error && workbenchItems.length > 0 && (
                  <div className="workbench-news-list">
                    <div className="hotspot-list">
                      <div className="hotspot-header">
                        <h3>🔥 当前热点</h3>
                        <span className="hotspot-subtitle">多信源热度 · 随时间消退</span>
                      </div>
                      {topMustRead.slice(0, 5).map((item, i) => (
                        <div
                          key={item.id}
                          className="hotspot-row"
                          onClick={(e) => {
                            e.stopPropagation();
                            recordReading(item);
                            if (item.url) window.open(item.url, '_blank');
                          }}
                          title={item.title}
                        >
                          <span className="hotspot-rank">{i + 1}</span>
                          <span className="hotspot-title">{item.title}</span>
                          <span className="hotspot-meta">
                            {(item.recommendationReasons?.length || 0)} 信源 · {formatTime(item.publishedAt || item.time)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="profile-recommendations">
                      <div className="profile-rec-header">
                        <h3>为你推荐</h3>
                        <span className="hotspot-subtitle">基于你的画像偏好</span>
                      </div>
                      {profileRecommendations.slice(0, profilePage * 10).map((item, i) => (
                        <div key={item.id} className="profile-rec-item-wrap">
                          <NewsItem
                            item={item}
                            index={i}
                            viewMode="standard"
                            isFocused={focusedIndex === i + topMustRead.length}
                            isBookmarked={isBookmarked(item.id)}
                            isInMaterials={isInMaterials(item.id)}
                            onBookmark={() => toggleBookmark(item)}
                            onAddMaterial={() => toggleMaterial(item)}
                            onSummary={() => handleSummaryToggle(item)}
                            isSummaryOpen={expandedSummary[item.id]}
                            summaryText={getSummaryEntry(item)?.text || ''}
                            summaryMode={getSummaryEntry(item)?.mode || ''}
                            summaryLoading={Boolean(summaryLoading[item.id])}
                            isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))}
                            onRead={() => recordReading(item)}
                            showTranslation={translationOpen[item.id]}
                            onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))}
                            onRequestTranslation={() => requestTranslation(item)}
                            isTranslating={translatingItems[item.id]}
                            translation={getTranslation(item)}
                            onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })}
                            onAskAi={sendCopilotAbout}
                            showRecommendation
                          />
                        </div>
                      ))}
                      {profileRecommendations.length > profilePage * 10 && profilePage * 10 < 40 && (
                        <div className="profile-load-more">
                          <button onClick={() => setProfilePage(p => p + 1)}>加载更多</button>
                        </div>
                      )}
                    </div>

                    {/* 滚动加载 sentinel — 让 IntersectionObserver 在 today 视图也能触发 */}
                    {workbenchItems.length > 0 && (
                      <div id="load-more-sentinel" className="load-more-area load-more-sentinel-center">
                        <span className="load-more-hint load-more-sentinel-done">已展示全部推荐内容</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

            </div>
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
          {nav === 'recommendations-legacy' && (
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
                      const cat = categories.find(c => c.id === id);
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
                      {filtered.slice(0, renderLimit).map((item, i) => {
                        const summaryEntry = getSummaryEntry(item);
                        return <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => handleSummaryToggle(item)} isSummaryOpen={expandedSummary[item.id]} summaryText={summaryEntry?.text || ''} summaryMode={summaryEntry?.mode || ''} summaryLoading={Boolean(summaryLoading[item.id])} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} />;
                      })}
                    </div>
                  )}
                  {(newsHasMore || filtered.length > renderLimit) && (
                    <div id="load-more-sentinel" className="load-more-area">
                      {loadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
                      {!loadingMore && <span className="load-more-hint">滚动加载更多</span>}
                    </div>
                  )}
                  {!newsHasMore && filtered.length <= renderLimit && (
                    <div className="load-more-area load-more-done">已全部加载</div>
                  )}
                </>
              )}
            </>
          )}

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
            <CalendarPage
              events={events}
              setEvents={setEvents}
              removeEvent={removeEvent}
              showEventForm={showEventForm}
              setShowEventForm={setShowEventForm}
            />
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
                        {categories.map(cat => {
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
                    )}
          <AddMaterialModal showAddMaterial={showAddMaterial} setShowAddMaterial={setShowAddMaterial} addManualMaterial={addManualMaterial} materialSpaces={materialSpaces} />

{nav === 'editor' && <ArticleEditor editorFullscreen={editorFullscreen} setEditorFullscreen={setEditorFullscreen} editorTextareaRef={editorTextareaRef} imageInputRef={imageInputRef} articles={articles} setArticles={setArticles} currentArticleId={currentArticleId} setCurrentArticleId={setCurrentArticleId} editorTab={editorTab} setEditorTab={setEditorTab} editorCursorPos={editorCursorPos} setEditorCursorPos={setEditorCursorPos} showTemplateMenu={showTemplateMenu} setShowTemplateMenu={setShowTemplateMenu} showAiPanel={showAiPanel} setShowAiPanel={setShowAiPanel} showImagePanel={showImagePanel} setShowImagePanel={setShowImagePanel} aiResult={aiResult} setAiResult={setAiResult} aiCustomPrompt={aiCustomPrompt} setAiCustomPrompt={setAiCustomPrompt} autoSaveTimer={autoSaveTimer} setAutoSaveTimer={setAutoSaveTimer} lastSavedAt={lastSavedAt} setLastSavedAt={setLastSavedAt} articleTagInput={articleTagInput} setArticleTagInput={setArticleTagInput} editingArticleTag={editingArticleTag} setEditingArticleTag={setEditingArticleTag} articleSpaces={articleSpaces} setArticleSpaces={setArticleSpaces} materialSpaces={materialSpaces} setMaterialSpaces={setMaterialSpaces} articleSpaceFilter={articleSpaceFilter} setArticleSpaceFilter={setArticleSpaceFilter} articleMaterialSpaceFilter={articleMaterialSpaceFilter} setArticleMaterialSpaceFilter={setArticleMaterialSpaceFilter} articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen} newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName} articleSpaceForNewArticle={articleSpaceForNewArticle} setArticleSpaceForNewArticle={setArticleSpaceForNewArticle} articleSearch={articleSearch} setArticleSearch={setArticleSearch} articleStatusFilter={articleStatusFilter} setArticleStatusFilter={setArticleStatusFilter} articleTemplateFilter={articleTemplateFilter} setArticleTemplateFilter={setArticleTemplateFilter} articleSort={articleSort} setArticleSort={setArticleSort} filteredArticles={filteredArticles} articleExportFilter={articleExportFilter} setArticleExportFilter={setArticleExportFilter} createArticle={createArticle} updateArticle={updateArticle} deleteArticle={deleteArticle} duplicateArticle={duplicateArticle} addArticleTag={addArticleTag} removeArticleTag={removeArticleTag} triggerAutoSave={triggerAutoSave} handleContentChange={handleContentChange} handleTitleChange={handleTitleChange} insertAtCursor={insertAtCursor} insertMaterialAtCursor={insertMaterialAtCursor} removeLinkedMaterial={removeLinkedMaterial} handleImageUpload={handleImageUpload} handlePaste={handlePaste} createArticleSpace={createArticleSpace} deleteArticleSpace={deleteArticleSpace} assignArticleToSpace={assignArticleToSpace} batchAssignArticlesToSpace={batchAssignArticlesToSpace} insertAiResult={insertAiResult} clearAiResult={clearAiResult} exportArticleToFile={exportArticleToFile} copyArticleAsRichText={copyArticleAsRichText} workspace={creativeWorkspace} materials={materials} llmConfig={llmConfig} />}

          <ArticleSpaceModal articleSpaceFormOpen={articleSpaceFormOpen} setArticleSpaceFormOpen={setArticleSpaceFormOpen} newArticleSpaceName={newArticleSpaceName} setNewArticleSpaceName={setNewArticleSpaceName} createArticleSpace={createArticleSpace} />

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
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
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
                    a.download = `siliconstream-bookmarks-${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>导出 Markdown</button>
                  <button className="btn-refresh" onClick={() => {
                    const data = JSON.stringify(exportFilteredBookmarks, null, 2);
                    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `siliconstream-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
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
                    a.download = `siliconstream-weekly-report-${new Date().toISOString().slice(0, 10)}.md`;
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
        navItems={PRIMARY_NAV_ITEMS}
        onNavigate={(navId) => goNav(navId)}
        onSearch={(q) => executeSearch(q)}
        recentVisits={recentVisits}
        actions={[
          { id: 'refresh', label: '刷新资讯', icon: 'refresh', hint: '动作', run: () => loadNews() },
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

  function addCustomSource() {
    if (!newSource.name || !newSource.url) return;
    const nextUrl = normalizeSourceUrl(newSource.url);
    const exists = customSources.some(source => normalizeSourceUrl(source.url) === nextUrl) || allSources.some(source => normalizeSourceUrl(source.url) === nextUrl);
    if (exists) {
      showToast('Source already exists');
      return;
    }
    setCustomSources(prev => [...prev, { ...newSource, id: Date.now() }]);
    setNewSource({ name: '', url: '', region: 'overseas' });
    setSourceVerifyResult(null);
  }

  function removeCustomSource(id) {
    setCustomSources(prev => prev.filter(s => s.id !== id));
  }

  // source handlers (verifySource/discoverSource/addDiscoveredSource/verifyAllSources) moved to useSourceManager

  // 辅助函数：截断 URL
  function truncateUrl(url, maxLength) {
    if (!url) return '';
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  }

  function normalizeSourceUrl(url) {
    return (url || '').replace(/\/$/, '').toLowerCase();
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
    
    fetch(`/api/verify-source?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        const responseTime = Date.now() - startTime;
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

  // fetchCustomUrl moved to useCustomUrl

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
    setActivePresetId(null);
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
    const providerName = LLM_PRESETS.find(p => p.id === llmConfig.provider)?.name || '自定义';
    const fallbackName = `${providerName}-${llmConfig.selectedModel}`;
    const name = llmPresetName.trim() || fallbackName;
    upsertPreset({
      id: llmPresetName.trim() ? undefined : activePresetId || undefined,
      name,
      provider: llmConfig.provider || 'custom',
      baseUrl: llmConfig.baseUrl,
      apiKey: llmConfig.apiKey,
      selectedModel: llmConfig.selectedModel,
      manualModels: llmConfig.manualModels || [],
    }, { activate: true });
    setLlmPresetName('');
    setShowLlmQuickConfig(false);
    setAiInsights({ loading: false, data: null, error: '' });
  }

  function handleQuickTest() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    testLlmConnection();
  }

  }






export default App;
