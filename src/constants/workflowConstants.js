// Workflow constants extracted from App.jsx (lines 106-508)

export const DEFAULT_AGENT_WORKFLOW = {
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

export const WORKFLOW_NODE_TYPES = ['input', 'llm', 'skill', 'condition', 'classifier', 'reply', 'output', 'subworkflow', 'parallel', 'router'];

/* ============ 多 agent 编排节点元信息（方案 C Phase 5） ============ */

export const WORKFLOW_NODE_META = {
  input:       { label: '输入', icon: '📥', color: '#3b82f6', category: 'flow' },
  llm:         { label: 'LLM', icon: '🤖', color: '#8b5cf6', category: 'agent' },
  skill:       { label: '技能', icon: '⚡', color: '#f59e0b', category: 'agent' },
  condition:   { label: '条件', icon: '🔀', color: '#ef4444', category: 'flow' },
  classifier:  { label: '分类器', icon: '🏷️', color: '#10b981', category: 'flow' },
  reply:       { label: '回复', icon: '💬', color: '#06b6d4', category: 'output' },
  output:      { label: '输出', icon: '📤', color: '#06b6d4', category: 'output' },
  subworkflow: { label: '子工作流', icon: '🧩', color: '#ec4899', category: 'orchestration' },
  parallel:    { label: '并行', icon: '⚡', color: '#f97316', category: 'orchestration' },
  router:      { label: '路由', icon: '🧭', color: '#a855f7', category: 'orchestration' },
};

/* 路由规则支持的比较操作 */
export const WORKFLOW_ROUTER_OPERATORS = [
  { id: 'contains',   label: '包含' },
  { id: 'not_contains', label: '不包含' },
  { id: 'equals',     label: '等于' },
  { id: 'starts_with', label: '前缀匹配' },
  { id: 'regex',      label: '正则匹配' },
];

/* 并行节点的合并策略 */
export const WORKFLOW_PARALLEL_MERGE_STRATEGIES = [
  { id: 'concat',    label: '拼接（保留各分支输出）' },
  { id: 'first',     label: '取首个完成的分支' },
  { id: 'last',      label: '取最后完成的分支' },
  { id: 'summarize', label: '让 LLM 汇总（生成综述）' },
];

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

export const WORKFLOW_TEMPLATE_LIBRARY = [
  {
    id: 'daily-briefing-copilot',
    name: '每日情报简报工作流',
    description: '从用户画像、今日资讯、收藏素材中提取高价值信号，生成可追踪的每日汇报。',
    source: '参考 Dify / Langflow 的模板化工作流设计',
    tags: ['每日汇报', '用户画像', '可执行'],
    nodes: [
      {
        id: 'tpl-daily-input', type: 'input', title: '汇总输入',
        role: '收集今日推荐、关注领域、阅读历史、收藏素材和用户补充任务。',
        prompt: '读取当前日期、用户画像、今日推荐列表、追踪关键词、收藏和素材库，形成完整任务上下文。',
        inputKey: 'user_context', outputKey: 'briefing_context', enabled: true
      },
      {
        id: 'tpl-daily-rank', type: 'classifier', title: '信号分层',
        role: '把信息分为必读、追踪、素材、创作、降噪五类，并说明分层依据。',
        prompt: '按照质量等级、用户兴趣、来源可信度、可行动性和新鲜度给资讯分层，避免平均用力。',
        classifierLabels: '必读,追踪,素材,创作,降噪',
        inputKey: 'briefing_context', outputKey: 'ranked_signals', enabled: true
      },
      {
        id: 'tpl-daily-llm', type: 'llm', title: '大模型解读',
        role: '把高价值信号解释成对用户有意义的判断、机会、风险和下一步行动。',
        prompt: '输出一段清晰的每日汇报：一句话结论、三条必读、风险提醒、行动建议、可沉淀素材。',
        inputKey: 'ranked_signals', outputKey: 'briefing_analysis', enabled: true
      },
      {
        id: 'tpl-daily-actions', type: 'skill', title: '行动沉淀',
        role: '生成可执行动作：收藏素材、追踪关键词、生成创作草稿、记录画像快照。',
        prompt: '根据分析结果生成后续动作队列，并标明每个动作的触发原因和预期价值。',
        skillId: 'profile-memory',
        inputKey: 'briefing_analysis', outputKey: 'action_queue', enabled: true
      },
      {
        id: 'tpl-daily-output', type: 'output', title: '结构化输出',
        role: '生成可阅读、可追踪、可导出的最终汇报。',
        prompt: '输出 Markdown 结构，包含结论、依据、引用来源、行动清单和素材沉淀建议。',
        inputKey: 'action_queue', outputKey: 'final_briefing', enabled: true
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
        id: 'tpl-github-input', type: 'input', title: '项目输入',
        role: '读取 GitHub 榜单、README 摘要、Stars、更新时间、语言和媒体线索。',
        prompt: '聚合项目元数据、README 介绍、图片线索、仓库活跃度和当前用户关注领域。',
        inputKey: 'github_items', outputKey: 'repo_context', enabled: true
      },
      {
        id: 'tpl-github-condition', type: 'condition', title: '质量门槛',
        role: '过滤过期、描述空泛、缺少应用场景或证据不足的项目。',
        prompt: '至少需要 3 个项目；优先保留有 README、近期更新、明确应用场景和可解释价值的项目。',
        conditionMetric: 'githubCount', conditionOperator: '>=', conditionValue: 3,
        inputKey: 'repo_context', outputKey: 'quality_pass', enabled: true
      },
      {
        id: 'tpl-github-skill', type: 'skill', title: '证据增强',
        role: '整理 README 图片、官网截图、演示视频、引用链接和重复媒体风险。',
        prompt: '生成媒体质量审计：正文图片优先，过滤 logo/小图标，记录缺图、重复图和可引用链接。',
        skillId: 'github-evaluator',
        inputKey: 'quality_pass', outputKey: 'evidence_pack', enabled: true
      },
      {
        id: 'tpl-github-llm', type: 'llm', title: '应用场景判断',
        role: '用大模型解释项目解决什么问题、适合谁、能落地到什么业务场景。',
        prompt: '为每个项目输出：核心价值、适用人群、典型应用场景、集成难度、风险和下一步试用建议。',
        inputKey: 'evidence_pack', outputKey: 'repo_judgement', enabled: true
      },
      {
        id: 'tpl-github-output', type: 'output', title: '项目卡片输出',
        role: '形成可以进入资讯卡片、素材库和内容创作的项目洞察。',
        prompt: '输出项目对比表和推荐排序，保留来源链接、图片线索和可沉淀素材字段。',
        inputKey: 'repo_judgement', outputKey: 'final_repo_cards', enabled: true
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
        id: 'tpl-article-input', type: 'input', title: '素材读取',
        role: '读取素材库、收藏资讯、今日汇报、用户选题和目标读者。',
        prompt: '把可用素材按主题、来源、观点、证据、媒体资源分类，形成写作输入包。',
        inputKey: 'material_pool', outputKey: 'writing_context', enabled: true
      },
      {
        id: 'tpl-article-classifier', type: 'classifier', title: '选题聚类',
        role: '把素材聚类为可写选题，并区分观点型、教程型、趋势型和复盘型文章。',
        prompt: '输出 3 个候选选题，每个选题给出核心论点、关键证据、目标读者和缺口。',
        classifierLabels: '观点型,教程型,趋势型,复盘型,资料型',
        inputKey: 'writing_context', outputKey: 'topic_candidates', enabled: true
      },
      {
        id: 'tpl-article-llm', type: 'llm', title: '文章架构',
        role: '生成完整大纲、段落目的、引用安排和需要补充的证据。',
        prompt: '选择最有价值的选题，生成类似 Word 文档的文章结构：标题、摘要、正文大纲、引用、结尾行动。',
        inputKey: 'topic_candidates', outputKey: 'article_outline', enabled: true
      },
      {
        id: 'tpl-article-reply', type: 'reply', title: '写作风格约束',
        role: '确保文章不是资讯堆砌，而是清晰、有判断、有证据的成稿。',
        prompt: '保持简洁、可信、可读；每个观点必须对应素材或来源；避免空泛口号。',
        inputKey: 'article_outline', outputKey: 'style_guardrails', enabled: true
      },
      {
        id: 'tpl-article-output', type: 'output', title: '导出草稿',
        role: '输出可进入内容创作中心继续编辑、导出和沉淀为私有知识库的草稿。',
        prompt: '输出 Markdown 草稿，包含素材引用清单、图片建议、标签和知识库归档建议。',
        inputKey: 'style_guardrails', outputKey: 'final_article_draft', enabled: true
      }
    ]
  },
  /* ====== 方案 C Phase 5：多 agent 编排模板 ====== */
  {
    id: 'parallel-perspective-analysis',
    name: '多视角并行分析工作流',
    description: '输入一条资讯，并行调度三个不同视角（技术、商业、风险）的智能体同时分析，最后由 LLM 汇总成综述。',
    source: '方案 C Phase 5：并行扇出 + LLM 汇总',
    tags: ['多视角', '并行', '综述'],
    nodes: [
      {
        id: 'tpl-par-input', type: 'input', title: '输入资讯',
        role: '聚合待分析的资讯上下文。',
        prompt: '读取今日推荐资讯与用户画像，准备给三个并行分支使用。',
        inputKey: 'context', outputKey: 'raw_input', enabled: true
      },
      {
        id: 'tpl-par-parallel', type: 'parallel', title: '三视角并行',
        role: '技术、商业、风险三个智能体同时分析同一份输入。',
        prompt: '基于输入给出该视角的判断。',
        inputKey: 'raw_input', outputKey: 'parallel_digest', enabled: true,
        branches: [
          { name: '技术视角', prompt: '从技术原理、技术价值、落地可行性角度分析。', agentId: 'tech-advisor' },
          { name: '商业视角', prompt: '从商业模式、市场机会、竞争格局角度分析。', agentId: 'business-analyst' },
          { name: '风险视角', prompt: '从政策、安全、市场风险角度识别潜在问题。', agentId: 'risk-scout' }
        ],
        mergeStrategy: 'summarize'
      },
      {
        id: 'tpl-par-output', type: 'output', title: '综述输出',
        role: '把汇总结果作为最终结论输出。',
        prompt: '输出包含三视角判断的综述。',
        inputKey: 'parallel_digest', outputKey: 'final_summary', enabled: true
      }
    ]
  },
  {
    id: 'router-dispatcher',
    name: '路由分发工作流',
    description: '根据输入内容（含 GitHub 关键词 / 含股价代码 / 其他）路由到对应子工作流。',
    source: '方案 C Phase 5：路由 + 子工作流',
    tags: ['路由', '子工作流', '条件分发'],
    nodes: [
      {
        id: 'tpl-rout-input', type: 'input', title: '输入待分发内容',
        role: '聚合原始内容，准备路由判断。',
        prompt: '读取用户输入或资讯摘要。',
        inputKey: 'context', outputKey: 'dispatch_input', enabled: true
      },
      {
        id: 'tpl-rout-router', type: 'router', title: '内容路由',
        role: '按内容特征路由到对应子工作流。',
        prompt: '检测输入是否包含 GitHub 关键词、股票代码或普通资讯。',
        inputKey: 'dispatch_input', outputKey: 'routed_branch', enabled: true,
        routes: [
          { match: { op: 'contains', value: 'github' }, target: 'github-project-evaluator', targetName: 'GitHub 评估' },
          { match: { op: 'regex', value: '\\d{6}' }, target: 'github-project-evaluator', targetName: '含股票代码（占位：股票评估子工作流）' }
        ],
        default: { target: 'daily-briefing-copilot', targetName: '每日简报（默认）' }
      },
      {
        id: 'tpl-rout-output', type: 'output', title: '路由结果输出',
        role: '输出路由命中后的子工作流结果。',
        prompt: '输出最终结果。',
        inputKey: 'routed_branch', outputKey: 'final_dispatched', enabled: true
      }
    ]
  }
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

export function createWorkflowTemplateInstance(template, options = {}) {
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

export function validateWorkflowImportPayload(payload) {
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

export function normalizeWorkflowTemplate(workflow, fallback = DEFAULT_AGENT_WORKFLOW) {
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

export function createWorkflowNode(type, index, existingNodesLength, workflowNodeType = 'llm') {
  const meta = WORKFLOW_NODE_TYPES.includes(type) ? type : 'llm';
  return {
    id: `wf-${type}-${Date.now()}`,
    type: meta,
    title: `节点 ${index + 1}`,
    role: '描述这个节点负责的判断、工具或输出职责。',
    prompt: '在这里填写该节点的执行指令。',
    skillId: meta === 'skill' ? 'evidence-pack' : undefined,
    conditionMetric: meta === 'condition' ? 'itemCount' : undefined,
    conditionOperator: meta === 'condition' ? '>=' : undefined,
    conditionValue: meta === 'condition' ? 1 : undefined,
    classifierLabels: meta === 'classifier' ? '必读,追踪,素材,创作,降噪' : undefined,
    inputKey: `step_${Math.max(existingNodesLength, 1)}`,
    outputKey: `step_${existingNodesLength + 1}`,
    enabled: true
  };
}
