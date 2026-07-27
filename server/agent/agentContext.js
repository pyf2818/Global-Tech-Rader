// agentContext.js - 智能体上下文构建（后端版）
// 用于「定时任务」「/api/agent/run」等非对话模式触发的 agent 执行
// 设计原则：最小可用，先支持定时任务必需字段，后续可逐步迁移前端逻辑

import { getPersonaSummary, getAgentMemories, searchAgentMemories } from './agentMemoryService.js';
import { getNews } from '../news/services/newsService.js';

/**
 * 获取智能体定义（从 localStorage 风格的默认列表查）
 * 注：服务端没有 React state，这里维护一份默认 agent 列表的镜像
 * 自定义 agent 仅前端可见，定时任务目前仅支持默认 agent
 */
const DEFAULT_AGENTS = [
  { id: 'orchestrator', name: '情报总控', systemPrompt: '你是用户的个人情报智能体总控。你要基于用户画像、今日资讯、历史反馈和当前任务，调度不同分析视角完成判断。输出必须包含：一句话结论、优先级、关键依据、下一步动作。',
    persona: { traits: ['全局视野', '逻辑严密', '决策果断'], background: '资深情报分析总监', values: ['准确性', '效率'] },
    soul: '好的情报不是堆砌信息，而是把信息变成决策。',
    voice: { tone: '专业但不冷漠', pace: '紧凑', formality: '适中' },
    habits: ['先给结论再展开依据', '复杂任务必先拆解为执行计划', '每次回复末尾给出明确的下一步动作'] },
  { id: 'analyst', name: '资讯分析师', systemPrompt: '你是一位资深资讯分析师。对用户提供的信息进行结构化分析，输出格式清晰、内容精炼的分析报告。',
    persona: { traits: ['结构化思维', '客观中立'], background: '前咨询公司分析师', values: ['客观', '结构化'] },
    soul: '分析的价值在于把混沌变成秩序。',
    voice: { tone: '冷静理性', pace: '稳定', formality: '正式' },
    habits: ['先概述再展开影响分析', '区分事实与推断'] },
  { id: 'risk-scout', name: '风险雷达', systemPrompt: '你是风险雷达智能体。从资讯中识别政策监管、市场变化、竞争格局、安全事件和技术路线风险。输出克制、具体，区分事实、推断和不确定性。',
    persona: { traits: ['谨慎克制', '边界敏感'], background: '前风控合规官', values: ['克制', '具体', '可证伪'] },
    soul: '我宁可错报也不漏报，但绝不为了显得专业而夸大。',
    voice: { tone: '严肃克制', pace: '稳健', formality: '正式' },
    habits: ['区分事实/推断/不确定', '每个风险必给触发信号'] },
  { id: 'business-analyst', name: '商业分析师', systemPrompt: '你是一位资深商业分析师。从商业视角分析资讯，评估市场机会、竞争格局和商业模式。',
    persona: { traits: ['商业嗅觉', '数据驱动'], background: '前投行分析师', values: ['商业价值', '可执行结论'] },
    soul: '商业分析不是讲道理，是算账。',
    voice: { tone: '直接果断', pace: '紧凑', formality: '正式' },
    habits: ['关键判断必配数据', '主动算 ROI'] },
];

export function getAgentDefinition(agentId) {
  return DEFAULT_AGENTS.find(a => a.id === agentId) || DEFAULT_AGENTS[0];
}

/**
 * 构建后端 systemPrompt（定时任务用）
 * 与前端 AiChatPanel.jsx 的拼接逻辑保持一致，但仅注入后端可获取的字段
 * @param {Object} params
 * @param {string} params.agentId - 智能体 id
 * @param {string} params.userId - 用户 id
 * @param {string} params.missionPrompt - 任务目标（注入到 user 消息）
 */
export async function buildAgentSystemPrompt({ agentId, userId }) {
  const agent = getAgentDefinition(agentId);

  // 1. 用户画像 persona_summary
  let personaLines = [];
  let learnedLines = [];
  let memoryLines = [];
  try {
    const persona = await getPersonaSummary(userId);
    if (persona.personaSummary) {
      const ps = persona.personaSummary;
      if (ps.habits?.length) personaLines.push(`  - 用户习惯：${ps.habits.join('；')}`);
      if (ps.traits?.length) personaLines.push(`  - 用户性格：${ps.traits.join('；')}`);
      if (ps.needs?.length) personaLines.push(`  - 用户需求：${ps.needs.join('；')}`);
    }
    if (persona.learnedPreferences) {
      const lp = persona.learnedPreferences;
      if (lp.frequentTopics?.length) learnedLines.push(`  - 高频关注主题：${lp.frequentTopics.join('、')}`);
      if (lp.preferredFormat) learnedLines.push(`  - 偏好回复格式：${lp.preferredFormat}`);
      if (lp.preferredDepth) learnedLines.push(`  - 偏好深度：${lp.preferredDepth}`);
    }
  } catch (err) {
    console.error('[buildAgentSystemPrompt] persona load failed:', err.message);
  }

  // 2. 最近 agent 记忆（取最近 5 条）
  try {
    const memories = await getAgentMemories(userId, { agentId, limit: 5 });
    if (memories.length > 0) {
      memoryLines = memories.map(m => `  - [${m.memoryType}] ${m.content}`);
    }
  } catch (err) {
    console.error('[buildAgentSystemPrompt] memories load failed:', err.message);
  }

  // 3. 拼接
  const parts = [
    agent.systemPrompt,
    agent.persona ? `【角色设定】\n  - 性格特质：${(agent.persona.traits || []).join('、')}\n  - 背景：${agent.persona.background || ''}\n  - 价值观：${(agent.persona.values || []).join('、')}` : '',
    agent.soul ? `【灵魂】${agent.soul}` : '',
    agent.voice ? `【语气】${[agent.voice.tone, agent.voice.pace && `节奏：${agent.voice.pace}`, agent.voice.formality && `正式度：${agent.voice.formality}`].filter(Boolean).join('；')}` : '',
    agent.habits?.length ? `【行为习惯】回复时请遵循以下习惯：\n${agent.habits.map(h => `  - ${h}`).join('\n')}` : '',
    personaLines.length ? `【用户性格画像】基于历史对话总结的用户性格（重要：回复时主动贴合）：\n${personaLines.join('\n')}` : '',
    learnedLines.length ? `【学习偏好】根据用户历史交互，你观察到以下偏好：\n${learnedLines.join('\n')}` : '',
    memoryLines.length ? `【历史记忆】你之前关于用户的观察：\n${memoryLines.join('\n')}` : '',
    '当需要展示数据时使用 markdown 表格。回复必须使用中文。',
  ].filter(Boolean);

  return parts.join('\n');
}

/**
 * 构建定时任务的初始 user 消息（注入今日资讯 + 任务目标）
 * @param {Object} params
 * @param {string} params.missionPrompt - 任务目标 prompt
 * @param {Object} params.newsContext - 可选的资讯上下文 { blocked, interests }
 */
export async function buildAgentUserMessage({ missionPrompt, newsContext = null }) {
  let newsLines = [];
  if (newsContext) {
    try {
      const news = await getNews(
        newsContext.blocked || [],
        [],
        1,
        30,
        '',
        [],
        newsContext.interests || [],
      );
      if (news?.items?.length > 0) {
        newsLines = news.items.slice(0, 12).map((item, i) =>
          `[资讯:${i + 1}] ${item.title}\n  来源：${item.source || ''} | ${item.publishedAt ? new Date(item.publishedAt).toLocaleString('zh-CN') : ''}\n  摘要：${String(item.summary || '').slice(0, 200)}`
        );
      }
    } catch (err) {
      console.error('[buildAgentUserMessage] news fetch failed:', err.message);
    }
  }

  const parts = [
    newsLines.length > 0 ? `以下是今日可参考的资讯：\n${newsLines.join('\n\n')}` : '',
    `任务：${missionPrompt}`,
  ].filter(Boolean);

  return parts.join('\n\n');
}
