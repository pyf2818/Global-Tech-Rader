import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

const NAV_ITEMS = [
  { id: 'all', label: '全部动态', icon: 'grid' },
  { id: 'recommendations', label: '智能推荐', icon: 'sparkle' },
  { id: 'briefing', label: '每日简报', icon: 'document' },
  { id: 'tracker', label: '公司追踪', icon: 'follow' },
  { id: 'trending', label: '热门榜单', icon: 'fire' },
  { id: 'github', label: 'GitHub 热门', icon: 'github' },
  { id: 'materials', label: '素材库', icon: 'layers' },
  { id: 'editor', label: '创作中心', icon: 'edit' },
  { id: 'calendar', label: '日历管理', icon: 'calendar' },
  { id: 'reading-list', label: '阅读列表', icon: 'bookmark' },
  { id: 'trends', label: '趋势分析', icon: 'chart' },
  { id: 'reading-stats', label: '阅读统计', icon: 'rows' },
  { id: 'knowledge-export', label: '导出发布', icon: 'link' }
];

const NAV_GROUPS = [
  { id: 'core', label: '资讯中心', items: ['all', 'recommendations', 'trending', 'github'] },
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
  { id: 'automotive', label: '智能汽车', icon: 'auto' }
];

const CATEGORY_GROUPS = [
  { id: 'tech-frontier', label: '科技前沿', icon: 'flask', categories: ['ai-models', 'research', 'open-source', 'data-science', 'quantum', 'cybersecurity'] },
  { id: 'hardware-compute', label: '计算硬件', icon: 'chip', categories: ['chips-compute', 'devices', 'robotics', 'iot-5g'] },
  { id: 'industry-economy', label: '产业经济', icon: 'building', categories: ['silicon-valley', 'china-tech', 'policy-finance', 'fintech'] },
  { id: 'emerging-fields', label: '新兴领域', icon: 'rocket', categories: ['space', 'new-energy', 'climate-esg', 'gaming', 'metaverse-xr'] },
  { id: 'industry-apps', label: '行业应用', icon: 'globe', categories: ['healthcare', 'education-tech', 'agriculture-tech', 'cloud', 'automotive'] }
];

const LLM_PRESETS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo'], icon: '🟢', placeholder: 'sk-...' },
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder'], icon: '🔵', placeholder: 'sk-...' },
  { id: 'moonshot', name: 'Moonshot', baseUrl: 'https://api.moonshot.cn', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'], icon: '🌙', placeholder: 'sk-...' },
  { id: 'zhipu', name: '智谱 AI', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash', 'glm-4-air'], icon: '🟣', placeholder: '请输入 API Key' },
  { id: 'custom', name: '自定义', baseUrl: '', models: [], icon: '⚙️', placeholder: 'https://...' }
];

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
  const [stats, setStats] = useState({ sourceCount: 40, failedSources: 0, updatedAt: '', blockedCount: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [panelCollapsed, setPanelCollapsed] = useState(() => localStorage.getItem('panelCollapsed') === 'true');
  const [customSources, setCustomSources] = useState(() => loadLS('customSources', []));
  const [newSource, setNewSource] = useState({ name: '', url: '', region: 'overseas' });
  const [sourceVerifyResult, setSourceVerifyResult] = useState(null);
  const [sourceVerifying, setSourceVerifying] = useState(false);
  const [llmConfig, setLlmConfig] = useState(() => loadLS('llmConfig', { baseUrl: '', apiKey: '', selectedModel: '', manualModels: [], provider: '' }));
  const [llmModels, setLlmModels] = useState([]);
  const [llmFetching, setLlmFetching] = useState(false);
  const [llmFetchError, setLlmFetchError] = useState('');
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmManualInput, setLlmManualInput] = useState('');
  const [showLlmQuickConfig, setShowLlmQuickConfig] = useState(false);

  const allLlmModels = useMemo(() => [...llmModels, ...(llmConfig.manualModels || [])], [llmModels, llmConfig.manualModels]);
  const [allSources, setAllSources] = useState([]);
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
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [articleSpaces, setArticleSpaces] = useState(() => loadLS('articleSpaces', []));
  const [articleSpaceFilter, setArticleSpaceFilter] = useState('all');
  const [articleSpaceFormOpen, setArticleSpaceFormOpen] = useState(false);
  const [newArticleSpaceName, setNewArticleSpaceName] = useState('');
  const [articleSpaceForNewArticle, setArticleSpaceForNewArticle] = useState('all');
  const editorTextareaRef = useRef(null);

  const feedRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed)); }, [sidebarCollapsed]);
  useEffect(() => { localStorage.setItem('panelCollapsed', String(panelCollapsed)); }, [panelCollapsed]);
  useEffect(() => { saveLS('customSources', customSources); }, [customSources]);
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
    if (nav !== 'all') return;
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

  useEffect(() => { fetch('/api/meta').then(r => r.json()).then(d => setAllSources(d.sources || [])).catch(() => {}); }, []);
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

    // 赛道增长率（近7天 vs 前7天）
    const categoryGrowth = CATEGORIES.map(cat => {
      const recent = day7.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length).reduce((a, b) => a + b, 0);
      const prev = day7prev.map(d => items.filter(i => i.category === cat.id && i.publishedAt?.slice(0, 10) === d).length).reduce((a, b) => a + b, 0);
      const growth = prev === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - prev) / prev) * 100);
      return { id: cat.id, label: cat.label, recent, prev, growth };
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
      day7,
      day7prev,
      day3,
      day14
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

    // 阅读时段分布
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

    return {
      streak,
      peakHour,
      hourDist,
      topInterests,
      avgDailyRead,
      readRate,
      heatData,
      maxHeat,
      day7
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
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
    fetch(`/api/news?blocked=${encodeURIComponent(b)}&page=${page}&pageSize=40${searchParam}${customParams ? '&' + customParams : ''}`)
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
    let html = text;
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
    return `<p>${html}</p>`;
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

  // 素材库操作
  function toggleMaterial(item, type = 'quote', note = '') {
    if (isInMaterials(item.id)) {
      setMaterials(prev => prev.filter(m => m.originalItemId !== item.id));
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '已从素材库移除';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } else {
      const newMaterial = {
        id: Date.now(),
        type,
        content: item.summary || item.title,
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

  function addManualMaterial({ title, content, type, source, url, tags, note }) {
    const newMaterial = {
      id: Date.now(),
      type,
      title,
      content,
      source: source || '手动添加',
      url: url || '',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      note,
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
      version: 1
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
        setAiResult({ loading: false, content: data.content, error: '', action });
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

  function translateText(text) {
    const dict = {
      'AI': '人工智能', 'LLM': '大语言模型', 'GPT': 'GPT', 'Model': '模型', 'Training': '训练', 'Inference': '推理',
      'Open Source': '开源', 'Startup': '创业公司', 'Funding': '融资', 'Investment': '投资', 'IPO': '上市',
      'Chip': '芯片', 'GPU': '图形处理器', 'Cloud': '云计算', 'API': '接口', 'Release': '发布',
      'announces': '宣布', 'launches': '推出', 'introduces': '引入', 'reports': '报告', 'says': '称',
      'technology': '技术', 'company': '公司', 'platform': '平台', 'users': '用户', 'developers': '开发者'
    };
    let result = text;
    Object.entries(dict).forEach(([en, zh]) => {
      result = result.replace(new RegExp(en, 'gi'), zh);
    });
    return result;
  }

  function getTranslation(item) {
    if (translations[item.id]) return translations[item.id];
    const isEnglish = /^[a-zA-Z0-9\s\-.,!?'"():]+$/.test(item.title);
    if (!isEnglish) return null;
    const translated = {
      title: translateText(item.title),
      summary: translateText(item.summary || '')
    };
    setTranslations(prev => ({ ...prev, [item.id]: translated }));
    return translated;
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
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${panelCollapsed ? 'panel-collapsed' : ''}`}>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="4 2"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
            </div>
            <span className="logo-text">Tech Radar</span>
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
                          {cluster.items.map((item, ci) => <NewsItem key={item.id} item={item} index={ci} viewMode={viewMode} isFocused={focusedIndex === filtered.indexOf(item)} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}
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
                {filtered.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} translation={getTranslation(item)} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}
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
              {!trendingLoading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{trendingItems.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} isFollowed={false} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />)}</div>}

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

          {/* SMART RECOMMENDATIONS */}
          {nav === 'recommendations' && (
            <>
              <div className="section-header">
                <h2 className="section-title">{ICONS.sparkle} 智能推荐</h2>
                <p className="section-desc">基于你的阅读历史，为你推荐可能感兴趣的内容</p>
              </div>
              {readingHistory.length === 0 && (
                <div className="empty-state">
                  <p>暂无阅读历史，多阅读一些文章后我们会为你推荐更精准的内容</p>
                </div>
              )}
              {readingHistory.length > 0 && smartRecommendations.length === 0 && (
                <div className="empty-state">
                  <p>暂无新的推荐内容，请稍后再来查看</p>
                </div>
              )}
              <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
                {smartRecommendations.map((item, i) => (
                  <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => setExpandedSummary(p => ({ ...p, [item.id]: !p[item.id] }))} isSummaryOpen={expandedSummary[item.id]} summaryText={generateSummary(item)} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} onOpenLightbox={(src, title) => setLightbox({ open: true, src, title })} />
                ))}
              </div>
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

          {/* 洞察分析 - 统一仪表盘 */}
          {(nav === 'briefing' || nav === 'tracker' || nav === 'trends' || nav === 'reading-stats') && (() => {
            const insightTab = nav === 'trends' ? 'trends' : nav === 'tracker' ? 'tracker' : nav === 'reading-stats' ? 'profile' : 'overview';
            const setInsightTab = (t) => {
              const map = { overview: 'briefing', trends: 'trends', tracker: 'tracker', profile: 'reading-stats' };
              setNav(map[t]);
            };

            // 态势等级
            const severityLevel = insightData.anomalies.length >= 3 ? { label: '爆发', color: '#ef4444', icon: '🔴' }
              : insightData.anomalies.length >= 1 || insightData.todayCount > insightData.yesterdayCount * 1.5 ? { label: '活跃', color: '#f59e0b', icon: '🟡' }
              : { label: '正常', color: '#10b981', icon: '🟢' };

            // 赛道态势标签
            const getSectorStatus = (c) => {
              if (c.growth > 80) return { label: '突增信号', icon: '⚡', color: '#f59e0b' };
              if (c.growth > 30) return { label: '持续升温', icon: '🔥', color: '#10b981' };
              if (c.growth > 5) return { label: '稳步增长', icon: '↗', color: '#22d3ee' };
              if (c.growth > -5) return { label: '持平', icon: '—', color: '#6b7280' };
              if (c.growth > -30) return { label: '小幅降温', icon: '↘', color: '#f87171' };
              return { label: '显著降温', icon: '❄️', color: '#ef4444' };
            };

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
                    { id: 'overview', label: '今日态势', icon: '📊' },
                    { id: 'trends', label: '赛道矩阵', icon: '📈' },
                    { id: 'tracker', label: '我的追踪', icon: '👁️' },
                    { id: 'profile', label: '阅读画像', icon: '📖' }
                  ].map(tab => (
                    <button key={tab.id} className={`insight-tab ${insightTab === tab.id ? 'active' : ''}`} onClick={() => setInsightTab(tab.id)}>
                      <span className="insight-tab-icon">{tab.icon}</span>
                      <span className="insight-tab-label">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* ====== 概览页 ====== */}
                {insightTab === 'overview' && (
                  <>
                    {/* 态势总览条 */}
                    <div className="insight-status-bar" style={{ borderLeft: `4px solid ${severityLevel.color}` }}>
                      <div className="insight-status-main">
                        <span className="insight-status-icon">{severityLevel.icon}</span>
                        <span className="insight-status-text">科技资讯态势<strong style={{ color: severityLevel.color }}> {severityLevel.label} </strong>今日收录 <strong>{insightData.todayCount}</strong> 条
                          {insightData.dailyChange !== 0 && <span className={insightData.dailyChange > 0 ? 'text-up' : 'text-down'}> {insightData.dailyChange > 0 ? '↑' : '↓'}{Math.abs(insightData.dailyChange)}% vs 昨日</span>}
                        </span>
                      </div>
                      <div className="insight-status-meta">
                        {insightData.categoryRanking[0] && <span>🔥 {insightData.categoryRanking[0].label} ({insightData.categoryRanking[0].recent}条)</span>}
                        {insightData.anomalies.length > 0 && <span>⚡ {insightData.anomalies.length} 个信号</span>}
                        {readingProfile.streak > 0 && <span>📖 连续{readingProfile.streak}天</span>}
                      </div>
                    </div>

                    {/* 赛道态势矩阵 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">赛道态势</h3>
                      <div className="insight-sector-list">
                        {insightData.categoryGrowth.map(c => {
                          const status = getSectorStatus(c);
                          const maxCount = Math.max(...insightData.categoryGrowth.map(x => x.recent), 1);
                          return (
                            <div key={c.id} className="insight-sector-row" onClick={() => { setCategory(c.id); setNav('all'); }}>
                              <span className="insight-sector-name">{c.label}</span>
                              <div className="insight-sector-bar-wrap">
                                <div className="insight-sector-bar" style={{ width: `${(c.recent / maxCount) * 100}%` }} />
                              </div>
                              <span className="insight-sector-count">{c.recent}条</span>
                              <span className={`insight-sector-change ${c.growth > 0 ? 'up' : c.growth < 0 ? 'down' : ''}`}>
                                {c.growth > 0 ? '+' : ''}{c.growth}%
                              </span>
                              <span className="insight-sector-status" style={{ color: status.color }}>{status.icon} {status.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    {/* 信号中心 */}
                    {insightData.anomalies.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">信号中心 <span className="insight-signal-count">{insightData.anomalies.length}</span></h3>
                        <div className="insight-signals">
                          {insightData.anomalies.map(a => (
                            <div key={a.id} className={`insight-signal-card ${a.type}`}>
                              <div className="insight-signal-accent" style={{ background: a.type === 'surge' ? '#10b981' : '#ef4444' }} />
                              <span className="insight-signal-icon">{a.type === 'surge' ? '🔥' : '❄️'}</span>
                              <div className="insight-signal-body">
                                <span className="insight-signal-name">{a.label} {a.type === 'surge' ? '升温' : '降温'}</span>
                                <span className="insight-signal-desc">前7天 {a.prev}条 → 近7天 {a.recent}条</span>
                              </div>
                              <span className={`insight-signal-pct ${a.type === 'surge' ? 'up' : 'down'}`}>{a.growth > 0 ? '+' : ''}{a.growth}%</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 头条要闻 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">头条要闻</h3>
                      <div className="insight-top-news">
                        {dailyBriefing.topNews.slice(0, 5).map((item, i) => (
                          <div key={item.id} className="insight-news-item" onClick={() => window.open(item.url, '_blank')}>
                            <span className="insight-news-num">{i + 1}</span>
                            <div className="insight-news-body">
                              <span className="insight-news-title">{item.title}</span>
                              <span className="insight-news-meta">{item.source} · {formatRelative(item.publishedAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                {/* ====== 趋势页 ====== */}
                {insightTab === 'trends' && (
                  <>
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

                    {trendData.topKeywords.length > 0 && (
                      <section className="insight-section">
                        <h3 className="insight-section-title">活跃关键词</h3>
                        <div className="insight-keywords">
                          {trendData.topKeywords.slice(0, 20).map(([kw, count]) => {
                            const maxC = trendData.topKeywords[0]?.[1] || 1;
                            const size = 12 + (count / maxC) * 14;
                            return <button key={kw} className="insight-kw" style={{ fontSize: `${size}px` }} onClick={() => executeSearch(kw)}>{kw}</button>;
                          })}
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
                        if (st.isSurge) { statusLabel = '今日突增'; statusColor = '#f59e0b'; statusIcon = '⚡'; }
                        else if (st.isStreak) { statusLabel = '连续增长'; statusColor = '#10b981'; statusIcon = '🔥'; }
                        else if (st.isDrop) { statusLabel = '显著降温'; statusColor = '#ef4444'; statusIcon = '❄️'; }
                        else if (st.growth > 0) { statusLabel = '小幅增长'; statusColor = '#22d3ee'; statusIcon = '↗'; }
                        else if (st.growth < 0) { statusLabel = '小幅下降'; statusColor = '#f87171'; statusIcon = '↘'; }

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
                        <span className="reading-metric-icon">🔥</span>
                        <span className="reading-metric-value">{readingProfile.streak}</span>
                        <span className="reading-metric-label">连续天数</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-icon">📖</span>
                        <span className="reading-metric-value">{readingProfile.avgDailyRead}</span>
                        <span className="reading-metric-label">日均阅读</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-icon">✅</span>
                        <span className="reading-metric-value">{readingProfile.readRate}%</span>
                        <span className="reading-metric-label">读完率</span>
                      </div>
                      <div className="reading-metric">
                        <span className="reading-metric-icon">🕐</span>
                        <span className="reading-metric-value">{String(readingProfile.peakHour).padStart(2, '0')}:00</span>
                        <span className="reading-metric-label">阅读高峰</span>
                      </div>
                    </div>

                    {/* 7日阅读热力 */}
                    <section className="insight-section">
                      <h3 className="insight-section-title">近7日阅读热力</h3>
                      <div className="reading-heat-row">
                        {readingProfile.day7.map((d, idx) => {
                          const count = readingProfile.heatData[idx];
                          const intensity = count / readingProfile.maxHeat;
                          return (
                            <div key={d} className="reading-heat-cell">
                              <div className="reading-heat-block" style={{ background: intensity > 0.7 ? 'rgba(167, 139, 250, 0.7)' : intensity > 0.4 ? 'rgba(167, 139, 250, 0.4)' : intensity > 0.1 ? 'rgba(167, 139, 250, 0.18)' : 'rgba(167, 139, 250, 0.05)', height: `${Math.max(intensity * 50, 4)}px` }} />
                              <span className="reading-heat-day">{d.slice(5)}</span>
                              <span className="reading-heat-count">{count}</span>
                            </div>
                          );
                        })}
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

              {/* 活跃关键词 */}
              {insightData.risingKeywords.length > 0 && (
                <div className="intel-section">
                  <h3 className="intel-section-title">{ICONS.sparkle} 活跃关键词</h3>
                  <div className="intel-keyword-cloud">
                    {insightData.risingKeywords.map(([kw, count]) => {
                      const maxC = insightData.risingKeywords[0]?.[1] || 1;
                      const size = 12 + (count / maxC) * 14;
                      return <button key={kw} className="intel-keyword" style={{ fontSize: `${size}px` }} onClick={() => executeSearch(kw)}>{kw} <span className="intel-keyword-count">{count}</span></button>;
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* COMPANY TRACKER */}
          {nav === 'tracker' && (
            <>
              <div className="section-header">
                <h2 className="section-title">{ICONS.follow} 公司/技术追踪</h2>
                <p className="section-desc">追踪你关注的公司和技术动态，实时监控提及频次与趋势</p>
              </div>
              <div className="tracker-add-form">
                <input type="text" placeholder="输入公司名或技术关键词（如 OpenAI、React、LLM）" value={newTrackTarget} onChange={e => setNewTrackTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrackTarget()} />
                <button className="tracker-add-btn" onClick={addTrackTarget}>{ICONS.plus} 添加追踪</button>
              </div>
              <div className="tracker-presets">
                <span className="tracker-preset-label">快速添加：</span>
                {['OpenAI', 'Google', '字节跳动', '华为', 'React', 'LLM', 'RISC-V'].map(name => (
                  <button key={name} className="tracker-preset-btn" onClick={() => { setNewTrackTarget(name); }}>{name}</button>
                ))}
              </div>
              {trackTargets.length === 0 && <div className="empty-state"><p>暂无追踪目标，添加你想关注的公司或技术</p></div>}
              <div className="tracker-grid">
                {trackTargets.map(target => {
                  const data = trackerData[target.id] || { total: 0, weekly: 0, last7Days: [], last30Days: [] };
                  const day7 = Array.from({ length: 7 }).map((_, idx) => {
                    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - idx));
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  });
                  const dailyCounts = day7.map(d => items.filter(i => {
                    const text = `${i.title} ${i.summary}`.toLowerCase();
                    return (text.includes(target.keyword.toLowerCase()) || target.aliases?.some(a => text.includes(a.toLowerCase()))) && i.publishedAt?.slice(0, 10) === d;
                  }).length);
                  const totalRecent = dailyCounts.slice(0, 3).reduce((a, b) => a + b, 0);
                  const totalPrev = dailyCounts.slice(3).reduce((a, b) => a + b, 0);
                  const growthRate = totalPrev === 0 ? (totalRecent > 0 ? 100 : 0) : Math.round(((totalRecent - totalPrev) / totalPrev) * 100);
                  const momentum = dailyCounts.reduce((sum, c, idx) => sum + c * (idx + 1), 0);
                  const isSurge = growthRate > 50 && totalRecent > 0;
                  return (
                    <div key={target.id} className={`tracker-card ${isSurge ? 'tracker-surge' : ''}`}>
                      {isSurge && <div className="tracker-surge-badge">🔥 突增</div>}
                      <div className="tracker-card-header">
                        <h3 className="tracker-name">{target.keyword}</h3>
                        <button className="tracker-remove-btn" onClick={() => setTrackTargets(prev => prev.filter(t => t.id !== target.id))}>{ICONS.x}</button>
                      </div>
                      <div className="tracker-momentum-row">
                        <div className="tracker-momentum-item">
                          <span className="tracker-momentum-value">{data.weekly}</span>
                          <span className="tracker-momentum-label">本周</span>
                        </div>
                        <div className="tracker-momentum-item">
                          <span className={`tracker-momentum-value ${growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : ''}`}>{growthRate > 0 ? '+' : ''}{growthRate}%</span>
                          <span className="tracker-momentum-label">增长率</span>
                        </div>
                        <div className="tracker-momentum-item">
                          <span className="tracker-momentum-value">{momentum}</span>
                          <span className="tracker-momentum-label">动量</span>
                        </div>
                      </div>
                      <div className="tracker-sparkline">
                        {dailyCounts.map((c, idx) => (
                          <div key={idx} className="tracker-spark-bar" style={{ height: `${Math.max(c * 18, 4)}px` }} title={`${day7[idx].slice(5)}: ${c}条`}>
                            {c > 0 && <span className="tracker-spark-dot" />}
                          </div>
                        ))}
                        <div className="tracker-spark-labels">
                          {day7.map(d => <span key={d}>{d.slice(5).slice(3)}</span>)}
                        </div>
                      </div>
                      {data.last7Days.length > 0 && (
                        <div className="tracker-recent">
                          <h4 className="tracker-recent-title">最近动态</h4>
                          {data.last7Days.slice(0, 4).map(item => (
                            <div key={item.id} className="tracker-recent-item" onClick={() => window.open(item.url, '_blank')}>
                              <span className="tracker-recent-time">{formatRelative(item.publishedAt)}</span>
                              <span className="tracker-recent-title-text">{item.title}</span>
                              <span className="tracker-recent-source">{item.source}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* READING LIST */}
          {nav === 'reading-list' && (
            <>
              <div className="section-header"><h2 className="section-title">{ICONS.bookmark} 阅读列表</h2><p className="section-desc">你收藏的资讯文章</p></div>
              {bookmarks.length === 0 && <div className="empty-state"><p>暂无收藏，浏览资讯时点击星标按钮即可收藏</p></div>}
              <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
                {bookmarks.map((b, i) => (
                  <article key={b.id} className={`news-item bookmark-item view-${viewMode} ${b.isRead ? 'is-read' : ''}`}>
                    <div className="item-left">
                      <div className="item-tags">
                        <span className={`item-mode mode-${b.mode}`}>{MODE_MAP[b.mode]}</span>
                        <span className={`item-region region-${b.region}`}>{REGION_MAP[b.region]}</span>
                      </div>
                      <button className={`bookmark-btn active`} onClick={() => toggleBookmark({ id: b.itemId })}>{ICONS.bookmarkFill}</button>
                    </div>
                    <div className="item-main">
                      <h2 className="item-title">{b.title}</h2>
                      <p className="item-summary">{b.summary}</p>
                      <div className="item-meta">
                        <div className="item-footer">
                          <span className="item-source">{b.source}</span>
                          <div className="item-actions">
                            <button className="read-toggle" onClick={() => toggleRead(b.id)}>
                              {b.isRead ? ICONS.eye : <span>标记已读</span>}
                            </button>
                            <a href={b.url} target="_blank" rel="noreferrer" className="item-link">阅读原文 {ICONS.arrowRight}</a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* CALENDAR */}
          {nav === 'calendar' && (
            <div className="calendar-page">
              <div className="calendar-insights">
                <div className="calendar-insight-card"><span className="calendar-insight-value">{calendarInsights.monthTotal}</span><span className="calendar-insight-label">本月日程</span></div>
                <div className="calendar-insight-card"><span className="calendar-insight-value">{calendarInsights.activeDays}</span><span className="calendar-insight-label">活跃天数</span></div>
                <div className="calendar-insight-card"><span className="calendar-insight-value">{calendarInsights.upcoming.length}</span><span className="calendar-insight-label">待办事项</span></div>
              </div>
              <div className="calendar-nav">
                <button className="cal-nav-btn" onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>{ICONS.leftArrow}</button>
                <h2 className="cal-title">{calendarDate.getFullYear()}年 {MONTHS[calendarDate.getMonth()]}</h2>
                <button className="cal-nav-btn" onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>{ICONS.rightArrow}</button>
                <button className="cal-today-btn" onClick={() => setCalendarDate(new Date())}>今天</button>
              </div>
              <div className="calendar-grid">
                <div className="cal-weekdays">{WEEKDAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}</div>
                <div className="cal-days">
                  {calendarDays.map((dayInfo, i) => {
                    const dayEvents = getEventsForDay(dayInfo);
                    const today = isToday(dayInfo);
                    const heat = dayInfo.isCurrentMonth ? getHeatLevel(dayInfo.day) : 0;
                    const isSelected = selectedDate && selectedDate.day === dayInfo.day && selectedDate.month === dayInfo.month;
                    return (
                      <div key={i} className={`cal-day ${!dayInfo.isCurrentMonth ? 'other-month' : ''} ${today ? 'today' : ''} ${isSelected ? 'selected' : ''} heat-${heat}`} onClick={() => dayInfo.isCurrentMonth && setSelectedDate(dayInfo)}>
                        <span className="cal-day-num">{dayInfo.day}</span>
                        {dayEvents.slice(0, 2).map(e => <div key={e.id} className="cal-event-dot" style={{ background: e.color }}>{e.title.slice(0, 4)}</div>)}
                        {dayEvents.length > 2 && <div className="cal-event-more">+{dayEvents.length - 2}</div>}
                        {heat > 0 && dayInfo.isCurrentMonth && <div className="cal-heat-indicator">{calendarHeatMap.get(dayInfo.day)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {calendarInsights.upcoming.length > 0 && (
                <div className="calendar-upcoming">
                  <h3 className="calendar-upcoming-title">近期安排</h3>
                  <div className="calendar-upcoming-list">
                    {calendarInsights.upcoming.map(item => (
                      <div key={item.id} className="calendar-upcoming-item">
                        <span className="calendar-upcoming-dot" style={{ background: item.color }} />
                        <div className="calendar-upcoming-main">
                          <span className="calendar-upcoming-name">{item.title}</span>
                          <span className="calendar-upcoming-time">{item.date}{item.time ? ` ${item.time}` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedDate && (
                <div className="cal-day-detail">
                  <div className="cal-day-header">
                    <h3>{selectedDate.month + 1}月{selectedDate.day}日</h3>
                    <button className="add-event-btn" onClick={() => setShowEventForm(true)}>{ICONS.plus}<span>添加事件</span></button>
                  </div>
                  {(() => { const de = getEventsForDay(selectedDate); return de.length === 0 ? <p className="no-events">暂无日程</p> : <div className="event-list">{de.map(e => <div key={e.id} className="event-item"><div className="event-color" style={{ background: e.color }} /><div className="event-info"><span className="event-title">{e.title}</span>{e.time && <span className="event-time">{e.time}</span>}</div><button className="event-remove" onClick={() => removeEvent(e.id)}>{ICONS.trash}</button></div>)}</div>; })()}
                </div>
              )}
              {showEventForm && (
                <div className="modal-overlay" onClick={() => setShowEventForm(false)}>
                  <div className="modal modal-sm event-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header event-modal-header"><h3>添加日程</h3><button className="modal-close" onClick={() => setShowEventForm(false)}>{ICONS.x}</button></div>
                    <div className="modal-body">
                      <div className="setting-item"><label>事件标题</label><input type="text" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="输入事件标题" className="event-input" /></div>
                      <div className="setting-item"><label>时间</label><input type="time" value={eventForm.time} onChange={e => setEventForm(p => ({ ...p, time: e.target.value }))} className="event-input" /></div>
                      <div className="setting-item"><label>颜色标签</label><div className="color-picker">{['#22d3ee', '#3b82f6', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#e879f9'].map(c => <button key={c} className={`color-dot ${eventForm.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setEventForm(p => ({ ...p, color: c }))} />)}</div></div>
                    </div>
                    <div className="modal-footer event-modal-footer"><button className="btn-cancel" onClick={() => setShowEventForm(false)}>取消</button><button className="btn-save" onClick={addEvent}>添加</button></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRENDS Dashboard */}
          {nav === 'trends' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.chart}<span>全局洞察 Hub</span></h2>
                <p className="trends-desc">基于 {items.length} 条资讯的实时趋势分析与异常检测</p>
              </div>

              {/* 全局概览指标 */}
              <div className="insight-overview-row">
                <div className="insight-overview-card">
                  <span className="insight-overview-icon">📊</span>
                  <div className="insight-overview-main">
                    <span className="insight-overview-value">{items.length}</span>
                    <span className="insight-overview-label">数据总量</span>
                  </div>
                </div>
                <div className="insight-overview-card">
                  <span className="insight-overview-icon">🔥</span>
                  <div className="insight-overview-main">
                    <span className="insight-overview-value">{insightData.categoryRanking[0]?.label || '-'}</span>
                    <span className="insight-overview-label">最热赛道</span>
                  </div>
                </div>
                <div className="insight-overview-card">
                  <span className="insight-overview-icon">⚡</span>
                  <div className="insight-overview-main">
                    <span className="insight-overview-value">{insightData.anomalies.length}</span>
                    <span className="insight-overview-label">异常信号</span>
                  </div>
                </div>
                <div className="insight-overview-card">
                  <span className="insight-overview-icon">🌍</span>
                  <div className="insight-overview-main">
                    <span className="insight-overview-value">{insightData.regionPct.global}%</span>
                    <span className="insight-overview-label">全球覆盖</span>
                  </div>
                </div>
              </div>

              {/* 赛道热力矩阵 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.grid} 赛道热力矩阵（7日）</h3>
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

              {/* 赛道热度排行 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.trend} 赛道热度排行</h3>
                <div className="insight-ranking-list">
                  {insightData.categoryRanking.map((c, idx) => (
                    <div key={c.id} className={`insight-ranking-row ${idx === 0 ? 'rank-first' : ''}`}>
                      <span className="insight-rank-num">{idx + 1}</span>
                      <div className="insight-rank-main">
                        <span className="insight-rank-name">{c.label}</span>
                        <div className="insight-rank-bar-wrap">
                          <div className="insight-rank-bar" style={{ width: `${insightData.categoryRanking[0]?.heatScore > 0 ? (c.heatScore / insightData.categoryRanking[0].heatScore * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div className="insight-rank-metrics">
                        <span className="insight-rank-count">{c.recent} 条</span>
                        <span className={`insight-rank-growth ${c.growth > 0 ? 'up' : c.growth < 0 ? 'down' : ''}`}>{c.growth > 0 ? '+' : ''}{c.growth}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 异常信号检测 */}
              {insightData.anomalies.length > 0 && (
                <section className="trends-section">
                  <h3 className="trends-section-title">{ICONS.alert} 异常信号检测</h3>
                  <p className="trends-note">变化幅度超过 50% 的赛道（近7天 vs 前7天）</p>
                  <div className="insight-anomaly-list">
                    {insightData.anomalies.map(a => (
                      <div key={a.id} className={`insight-anomaly-card ${a.type}`}>
                        <span className="anomaly-icon">{a.type === 'surge' ? '🔥' : '❄️'}</span>
                        <div className="anomaly-content">
                          <span className="anomaly-name">{a.label}</span>
                          <span className="anomaly-desc">{a.type === 'surge' ? '显著升温' : '明显降温'}：前7天 {a.prev} 条 → 近7天 {a.recent} 条</span>
                        </div>
                        <span className={`anomaly-pct ${a.type === 'surge' ? 'up' : 'down'}`}>{a.growth > 0 ? '+' : ''}{a.growth}%</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 区域分布 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.globe} 区域分布</h3>
                <div className="insight-region-bars">
                  {[
                    { key: 'domestic', label: '国内', pct: insightData.regionPct.domestic, count: insightData.regionDistribution.domestic },
                    { key: 'overseas', label: '海外', pct: insightData.regionPct.overseas, count: insightData.regionDistribution.overseas },
                    { key: 'global', label: '全球', pct: insightData.regionPct.global, count: insightData.regionDistribution.global }
                  ].map(r => (
                    <div key={r.key} className="insight-region-row">
                      <span className="insight-region-label">{r.label}</span>
                      <div className="insight-region-bar-wrap">
                        <div className="insight-region-bar" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="insight-region-pct">{r.pct}%</span>
                      <span className="insight-region-count">{r.count} 条</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 趋势走势图 */}
              <section className="trends-section">
                <h3 className="trends-section-title">赛道热度走势（7日）</h3>
                <TrendLineChart labels={trendData.dayLabels} series={trendData.categorySeries.map(s => ({ name: CATEGORIES.find(c => c.id === s.id)?.label || s.id, values: s.values }))} />
              </section>

              {/* 关键词云 */}
              <section className="trends-section">
                <h3 className="trends-section-title">活跃关键词</h3>
                <div className="keyword-cloud">
                  {trendData.topKeywords.slice(0, 25).map(([keyword, count]) => {
                    const maxCount = trendData.topKeywords[0]?.[1] || 1;
                    const size = 12 + (count / maxCount) * 16;
                    return (
                      <button key={keyword} className="keyword-tag" style={{ fontSize: `${size}px` }} onClick={() => executeSearch(keyword)}>
                        {keyword} <span className="keyword-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {nav === 'reading-stats' && (
            <div className="trends-dashboard">
              <div className="trends-header"><h2>{ICONS.rows}<span>阅读画像</span></h2><p className="trends-desc">你的阅读行为、偏好与习惯深度分析</p></div>

              {/* 核心指标 */}
              <div className="reading-overview-row">
                <div className="reading-metric-card">
                  <span className="reading-metric-icon">🔥</span>
                  <span className="reading-metric-value">{readingProfile.streak}</span>
                  <span className="reading-metric-label">连续阅读天数</span>
                </div>
                <div className="reading-metric-card">
                  <span className="reading-metric-icon">📖</span>
                  <span className="reading-metric-value">{readingProfile.avgDailyRead}</span>
                  <span className="reading-metric-label">日均阅读</span>
                </div>
                <div className="reading-metric-card">
                  <span className="reading-metric-icon">✅</span>
                  <span className="reading-metric-value">{readingProfile.readRate}%</span>
                  <span className="reading-metric-label">收藏转阅读</span>
                </div>
                <div className="reading-metric-card">
                  <span className="reading-metric-icon">🕐</span>
                  <span className="reading-metric-value">{String(readingProfile.peakHour).padStart(2, '0')}:00</span>
                  <span className="reading-metric-label">阅读高峰</span>
                </div>
              </div>

              {/* 7日阅读热力图 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.calendar} 近7日阅读热力</h3>
                <div className="reading-heat-row">
                  {readingProfile.day7.map((d, idx) => {
                    const count = readingProfile.heatData[idx];
                    const intensity = count / readingProfile.maxHeat;
                    return (
                      <div key={d} className="reading-heat-cell">
                        <div className="reading-heat-block" style={{ background: intensity > 0.7 ? 'rgba(167, 139, 250, 0.7)' : intensity > 0.4 ? 'rgba(167, 139, 250, 0.4)' : intensity > 0.1 ? 'rgba(167, 139, 250, 0.18)' : 'rgba(167, 139, 250, 0.05)', height: `${Math.max(intensity * 60, 4)}px` }} />
                        <span className="reading-heat-day">{d.slice(5)}</span>
                        <span className="reading-heat-count">{count} 篇</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 阅读趋势 */}
              <section className="trends-section">
                <h3 className="trends-section-title">近7日阅读趋势</h3>
                <TrendLineChart labels={readingStatsData.labels7} series={readingStatsData.series7} />
              </section>

              {/* 兴趣画像 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.target} 兴趣画像</h3>
                <p className="trends-note">基于 {bookmarks.length} 条收藏的赛道分布</p>
                <div className="reading-interest-list">
                  {readingProfile.topInterests.map((interest, idx) => (
                    <div key={interest.id} className={`reading-interest-row ${idx === 0 ? 'interest-first' : ''}`}>
                      <span className="reading-interest-rank">{idx + 1}</span>
                      <span className="reading-interest-name">{interest.label}</span>
                      <div className="reading-interest-bar-wrap">
                        <div className="reading-interest-bar" style={{ width: `${readingProfile.topInterests[0]?.count > 0 ? (interest.count / readingProfile.topInterests[0].count * 100) : 0}%` }} />
                      </div>
                      <span className="reading-interest-count">{interest.count} 篇</span>
                      <span className="reading-interest-pct">{interest.pct}%</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 阅读时段分布 */}
              <section className="trends-section">
                <h3 className="trends-section-title">{ICONS.clock} 阅读时段分布</h3>
                <div className="reading-hour-chart">
                  {readingProfile.hourDist.map((count, hour) => {
                    const maxH = Math.max(...readingProfile.hourDist, 1);
                    const intensity = count / maxH;
                    return (
                      <div key={hour} className={`reading-hour-bar ${hour === readingProfile.peakHour ? 'peak' : ''}`}>
                        <div className="reading-hour-block" style={{ height: `${Math.max(intensity * 50, 2)}px`, opacity: 0.2 + intensity * 0.8 }} />
                        <span className="reading-hour-label">{String(hour).padStart(2, '0')}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 近30日趋势 */}
              <section className="trends-section">
                <h3 className="trends-section-title">近30日阅读趋势</h3>
                <TrendLineChart labels={readingStatsData.labels30} series={readingStatsData.series30} />
              </section>
            </div>
          )}

          {nav === 'materials' && (
            <div className="trends-dashboard">
              <div className="trends-header">
                <h2>{ICONS.layers}<span>素材库</span></h2>
                <p className="trends-desc">从资讯中收集的素材，共 {materials.length} 条</p>
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
                        全部 ({materials.length})
                      </button>
                      {materialSpaces.map(space => {
                        const count = materials.filter(m => m.spaceId === space.id).length;
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
                        <p className="material-content">{m.content}</p>
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
                    note: fd.get('note') || ''
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
                            <button className="editor-tool-btn" title="图片" onClick={() => insertAtCursor(article, '', '![描述](图片URL)', '')}>{ICONS.image}</button>
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
                                placeholder="开始写作...&#10;&#10;支持 Markdown 格式：&#10;# 标题&#10;**粗体** *斜体*&#10;- 列表&#10;> 引用&#10;`代码`&#10;![图片](url)"
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
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
                              />
                            </div>
                          )}
                        </div>

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
                              {materials.filter(m => !article.materials.includes(m.id)).slice(0, 20).map(m => (
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
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>设置</h3><button className="modal-close" onClick={() => setShowSettings(false)}>{ICONS.x}</button></div>
            <div className="modal-body">
              <div className="setting-item"><label>关键词屏蔽</label><textarea value={blocked} onChange={e => setBlocked(e.target.value)} placeholder="输入屏蔽词，逗号分隔" /><p className="setting-note">已过滤 {stats.blockedCount} 条资讯</p></div>

              <div className="setting-item">
                <label>自定义信息源</label>
                <p className="setting-desc">添加 RSS/Atom 订阅源，可验证连接有效性</p>
                <div className="custom-sources-list">{customSources.map(source => <div key={source.id} className="custom-source-item"><div className="custom-source-info"><span className="custom-source-name">{source.name}</span><span className="custom-source-region">{REGION_MAP[source.region] || source.region}</span></div><button className="remove-source-btn" onClick={() => removeCustomSource(source.id)}>{ICONS.x}</button></div>)}</div>
                <div className="add-source-form">
                  <input type="text" placeholder="名称" value={newSource.name} onChange={e => setNewSource(prev => ({ ...prev, name: e.target.value }))} />
                  <input type="text" placeholder="RSS/Atom URL" value={newSource.url} onChange={e => { setNewSource(prev => ({ ...prev, url: e.target.value })); setSourceVerifyResult(null); }} className="url-input" />
                  <select value={newSource.region} onChange={e => setNewSource(prev => ({ ...prev, region: e.target.value }))}><option value="overseas">海外</option><option value="domestic">国内</option><option value="global">全球</option></select>
                  <button className="verify-source-btn" onClick={verifySource} disabled={sourceVerifying || !newSource.url} title="验证连接">{sourceVerifying ? '...' : '验证'}</button>
                  <button className="add-source-btn" onClick={addCustomSource}>{ICONS.plus}</button>
                </div>
                {sourceVerifyResult && (
                  <div className={`source-verify-result ${sourceVerifyResult.ok ? 'verify-ok' : 'verify-fail'}`}>
                    {sourceVerifyResult.ok ? <>{ICONS.check} 有效: {sourceVerifyResult.title} ({sourceVerifyResult.itemCount} 条内容)</> : <>无效: {sourceVerifyResult.message}</>}
                  </div>
                )}
                <div className="builtin-sources"><p className="builtin-title">内置信息源 ({allSources.length})</p><div className="builtin-list">{allSources.slice(0, 8).map((s, i) => <span key={i} className="builtin-source">{s.name}</span>)}{allSources.length > 8 && <span className="builtin-more">+{allSources.length - 8} 更多</span>}</div></div>
              </div>

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

function NewsItem({ item, index, viewMode = 'standard', isFocused = false, isBookmarked = false, isInMaterials = false, onBookmark, onSummary, isSummaryOpen, summaryText, isFollowed = false, onRead, showTranslation, onToggleTranslation, translation, onOpenLightbox, onAddMaterial }) {
  const isCompact = viewMode === 'compact';
  const isCard = viewMode === 'card';
  const hasMedia = item.imageUrl || item.videoUrl;

  const isEnglish = /^[a-zA-Z0-9\s\-.,!?'"():]+$/.test(item.title);

  return (
    <article className={`news-item view-${viewMode} ${isFocused ? 'focused' : ''} ${isFollowed ? 'followed' : ''}`} style={{ animationDelay: `${index * 40}ms` }} data-index={index}>
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
          {isEnglish && onToggleTranslation && <button className={`translate-btn ${showTranslation ? 'active' : ''}`} onClick={onToggleTranslation} title="中英对照">{ICONS.globe}</button>}
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
            <span className="item-source">{item.source}{item.platform ? ` · ${item.platform}` : ''}</span>
            <a href={item.url} target="_blank" rel="noreferrer" className="item-link" onClick={() => onRead?.(item)}>阅读原文 {ICONS.arrowRight}</a>
          </div>
        </div>}
        {isCompact && <div className="item-footer compact-footer">
          <span className="item-source">{item.source}</span>
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
  const isEnglish = /^[a-zA-Z0-9\s\-.,!?'"():]+$/.test(repo.fullName) || /^[a-zA-Z0-9\s\-.,!?'"():]+$/.test(repo.description);
  return (
    <article className="github-card" style={{ animationDelay: `${index * 60}ms` }}>
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
