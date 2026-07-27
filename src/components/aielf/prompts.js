// AiElf Prompt 构造器集合
// 从 src/AiElf.jsx 抽离，纯函数接收状态参数
// 依赖 ElfToolCard 暴露的 TOOL_META 用于工具能力声明

import { TOOL_META } from './ElfToolCard.jsx';

function formatProfileList(value, fallback = '暂无') {
  return Array.isArray(value) && value.length ? value.join('、') : fallback;
}

/**
 * 构造个人画像上下文片段
 * @param {object} profile - 用户画像
 */
export function buildPersonalContext(profile = {}) {
  return `【用户画像】
- 当前深度：${profile.depth || '探索校准'}
- 输出目标：${profile.outputGoal || '阅读判断'}
- 重点关注：${formatProfileList(profile.focusLabels, '未设置')}
- 最近强化：${formatProfileList(profile.boosted)}
- 降权来源：${formatProfileList(profile.muted)}
- 追踪记忆：${formatProfileList(profile.tracked)}

【协作要求】
1. 先判断这件事对用户是否重要，不要平均用力。
2. 明确区分事实、推断和建议。
3. 尽量给出下一步动作，让用户能继续阅读、追踪或创作。
4. 如果任务更适合其他智能体，要在回答末尾说明建议接力给谁。`;
}

/**
 * 构造 Agent 的系统 Prompt（含画像、当前智能体、可接力任务、工具能力）
 * @param {object} activeAgent - 当前激活的智能体
 * @param {Array}  missions     - 任务列表
 * @param {Array}  agents       - 全部智能体（用于查找 mission.agentId）
 * @param {object} profile      - 用户画像
 */
export function buildAgenticSystemPrompt(activeAgent, missions = [], agents = [], profile = {}) {
  const basePrompt = activeAgent?.systemPrompt || '';
  const missionText = missions.slice(0, 5).map(mission => {
    const missionAgent = agents.find(agent => agent.id === mission.agentId);
    return `- ${mission.label}：${missionAgent?.name || '智能体'}`;
  }).join('\n') || '- 暂无预设任务';

  const toolNames = Array.isArray(activeAgent?.tools) ? activeAgent.tools : [];
  const toolSection = toolNames.length > 0
    ? `\n【工具能力】你被配置为 Agent Loop 模式，可通过 function calling 主动调用以下工具，无需用户授权：\n${toolNames.map(n => `- ${n}：${(TOOL_META[n]?.label || n)}`).join('\n')}\n当问题需要外部数据或文件操作时（如查询股价、检索资讯、读写工作空间文件、抓取网页），请主动调用对应工具获取信息后再回答。工具返回的数据是事实依据，应直接采纳。`
    : '';

  return `${basePrompt}

${buildPersonalContext(profile)}

【当前智能体】
- 名称：${activeAgent?.name || 'AI精灵'}
- 专长：${activeAgent?.description || '综合分析'}
- 可接力任务：
${missionText}${toolSection}`;
}

/**
 * 构造接力智能体的引导 Prompt
 */
export function buildRelayPrompt(targetAgent, _sourceMessage) {
  const name = targetAgent?.name || '智能体';
  if (targetAgent?.id === 'memory-agent') {
    return '请基于上一个智能体的分析更新我的追踪记忆：应该新增哪些关键词、强化哪些领域、降低哪些来源或主题权重？请给出可执行的推荐调整。';
  }
  if (targetAgent?.id === 'risk-scout') {
    return '请基于上一个智能体的分析继续做风险扫描：区分事实、推断和不确定性，列出需要持续观察的触发信号。';
  }
  if (targetAgent?.id === 'creation-agent') {
    return '请把上一个智能体的分析转化为可创作资产：给出选题、标题、核心观点、文章结构和可放入素材库的摘要卡片。';
  }
  if (targetAgent?.id === 'orchestrator') {
    return '请作为情报总控整合上一个智能体的分析，给出一句话判断、优先级、下一步动作和是否需要继续接力。';
  }
  return `请作为${name}，基于上一个智能体的分析继续深入，输出更贴近我个人关注和当前任务的判断。`;
}

/**
 * 构造资讯分析的 Prompt（按 activeAgentId 选择模板）
 * @param {string} activeAgentId - 当前激活智能体 ID
 * @param {Array}  agents        - 全部智能体（用于查找当前 agent）
 * @param {object} itemData      - 资讯条目
 * @param {string} pageContent   - 网页全文（可选）
 */
export function buildAnalysisPrompt(activeAgentId, agents = [], itemData, pageContent) {
  const agent = agents.find(a => a.id === activeAgentId) || agents[0];
  const hasFullContent = pageContent && pageContent.length > 100;
  const baseContent = `【资讯信息】
标题：${itemData.title}
摘要：${itemData.summary || '暂无摘要'}
来源：${itemData.source || '未知来源'}
${hasFullContent ? '【网页全文】\n' + pageContent.slice(0, 6000) + '\n\n' : ''}`;

  if (activeAgentId === 'analyst') {
    return `请对以下资讯进行深度分析：

${baseContent}
请从以下五个维度进行分析。要求：概述部分（发生了什么、为什么重要）控制在100字以内，简洁有力；影响分析（谁会受影响、普通人容易误判什么、可执行机会）适当展开，每点100-200字，给出具体洞见：

### 发生了什么
（一句话概括事件核心）

### 为什么重要
（这件事的行业/技术/战略意义）

### 谁会受影响
（直接影响的群体、企业或行业）

### 普通人容易误判什么
（常见认知偏差或信息陷阱）

### 有什么可执行机会
（具体行动建议或机会点）`;
  }

  if (activeAgentId === 'tech-advisor') {
    return `请对以下资讯进行技术分析：

${baseContent}
请从以下维度进行技术分析：

### 核心技术原理
（简要解释相关技术原理）

### 技术优劣势
（与传统方案相比的优势和不足）

### 技术成熟度
（处于哪个发展阶段，距离落地还有多远）

### 相关技术栈
（涉及的关键技术和工具链）

### 技术启示
（对开发者和企业的技术决策建议）`;
  }

  if (activeAgentId === 'business-analyst') {
    return `请对以下资讯进行商业分析：

${baseContent}
请从商业视角分析：

### 商业模式
（涉及什么商业模式，如何盈利）

### 市场机会
（存在什么市场空白或增长机会）

### 竞争格局
（主要玩家和竞争态势）

### 投资价值
（是否有投资价值，风险和回报如何）

### 商业建议
（给创业者和投资者的具体建议）`;
  }

  if (activeAgentId === 'writer') {
    return `请对以下资讯进行写作角度的分析：

${baseContent}
请从写作角度分析：

### 核心观点提炼
（一句话概括最有价值的观点）

### 写作角度建议
（可以从哪些角度写这篇文章）

### 标题建议
（给出3-5个吸引人的标题选项）

### 金句提炼
（提炼3-5个金句）

### 结构建议
（建议的文章结构和篇幅分配）`;
  }

  if (activeAgentId === 'translator') {
    return `请将以下资讯内容翻译成英文，保持专业术语准确，表达自然流畅：

${baseContent}

翻译要求：
1. 保留原文的专业术语，必要时附注中文
2. 译文要符合英语母语者的表达习惯
3. 标题要翻译得简洁有力
4. 摘要要精炼准确`;
  }

  if (activeAgentId === 'code-reviewer') {
    return `请对以下资讯进行代码和技术实现角度的分析：

${baseContent}
请从代码和技术实现角度分析：

### 技术实现要点
（核心实现逻辑和技术方案）

### 代码质量评估
（代码可维护性、可扩展性如何）

### 潜在问题
（可能存在的技术风险和安全隐患）

### 优化建议
（可以改进的地方）

### 学习价值
（开发者可以从中学习什么）`;
  }

  if (activeAgentId === 'learning-coach') {
    return `请对以下资讯进行知识拆解，帮助学习者快速理解：

${baseContent}
请从学习角度拆解：

### 核心概念
（涉及的关键概念，用大白话解释）

### 知识图谱
（与其他知识的关联，如何纳入已有知识体系）

### 学习路径
（如果要深入了解，建议的学习顺序和资源）

### 常见误区
（初学者容易犯的错误和理解偏差）

### 实践建议
（如何将这个知识应用到实际中）`;
  }

  if (activeAgentId === 'debate-master') {
    return `请对以下资讯进行多角度的思辨分析：

${baseContent}
请从多个角度分析：

### 正方观点
（支持该资讯观点的主要论据）

### 反方观点
（反对该资讯观点的主要论据）

### 中立视角
（中立的第三方如何评价）

### 关键争议点
（争议的核心是什么）

### 你的判断
（基于证据，给出你的综合判断）`;
  }

  return `${agent?.name || 'AI精灵'}分析以下资讯：

${baseContent}

请根据你的专业身份，给出结构化的分析。`;
}
