// memoryEvolver.js - 自我进化记忆闭环
// 每轮对话结束后异步触发：LLM 总结用户行为/偏好/需求 → 写入 agent_memories + 深化 persona_summary
// 设计原则：
//   1. 不阻塞对话流（fire-and-forget）
//   2. 失败静默（不影响用户当前会话）
//   3. 限频（同一会话每 N 轮才总结一次，避免 token 浪费）
//   4. 限长（只取最近 6 轮对话，避免上下文爆炸）

const EVOLVE_INTERVAL_ROUNDS = 3; // 每 3 轮总结一次
const EVOLVE_MAX_MESSAGES = 12;   // 取最近 12 条消息（6 user + 6 assistant）

const EVOLVE_SYSTEM_PROMPT = `你是一个用户行为分析专家。基于以下用户与 AI 助手的对话记录，识别用户的：
1. 习惯（user_habit）：高频行为模式（如"喜欢先看结论"、"经常问技术细节"）
2. 想法（user_thought）：用户表达的观点、态度、立场
3. 性格（user_trait）：从对话推断的性格特征（如"务实"、"谨慎"、"求知欲强"）
4. 需求（user_need）：用户真正想要达成的目标（不仅限于字面诉求）
5. agent 洞察（agent_insight）：作为 AI 助手对用户的整体观察

输出 JSON 数组，每个元素 { memory_type, content, evidence, weight }：
- memory_type: user_habit / user_thought / user_trait / user_need / agent_insight 之一
- content: 简明陈述（不超过 100 字）
- evidence: 支撑证据（消息片段数组，每条 ≤ 50 字）
- weight: 1-10，重要/反复出现 → 高权重

严格输出 JSON 数组，不要其他解释。如果对话内容贫乏无可总结，输出 []。`;

/**
 * 触发记忆进化：异步总结对话 → 批量写入记忆 → 增量更新 persona_summary
 * @param {Object} params
 * @param {Array} params.messages - 完整对话历史 [{role, content, toolCalls?}]
 * @param {string} params.sessionId - 会话 id
 * @param {string} params.agentId - 智能体 id
 * @param {Object} params.llmConfig - { baseUrl, apiKey, selectedModel }
 * @param {number} params.totalRounds - 当前对话总轮数
 * @param {boolean} params.force - 强制触发（忽略轮数限制）
 * @returns {Promise<{memories: number, personaUpdated: boolean}>}
 */
export async function evolveMemory({ messages, sessionId, agentId, llmConfig, totalRounds = 0, force = false }) {
  // 限频：每 N 轮总结一次（force=true 时跳过）
  if (!force && totalRounds > 0 && totalRounds % EVOLVE_INTERVAL_ROUNDS !== 0) {
    return { skipped: true, reason: `not yet (round ${totalRounds}, interval ${EVOLVE_INTERVAL_ROUNDS})` };
  }

  // 必须有 LLM 配置
  if (!llmConfig?.baseUrl || !llmConfig?.selectedModel) {
    return { skipped: true, reason: 'no llm config' };
  }

  // 取最近 N 条消息（user + assistant）构建 transcript
  const recent = (messages || [])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-EVOLVE_MAX_MESSAGES);
  if (recent.length < 4) {
    return { skipped: true, reason: 'too few messages' };
  }

  const transcript = recent.map(m => {
    const role = m.role === 'user' ? '用户' : '助手';
    const content = String(m.content || '').slice(0, 500);
    return `[${role}] ${content}`;
  }).join('\n\n');

  // 调用 LLM 总结
  let memories = [];
  try {
    const resp = await fetch('/api/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        model: llmConfig.selectedModel,
        action: 'chat',
        systemPrompt: EVOLVE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `请分析以下对话记录并提取用户记忆：\n\n${transcript}` }],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return { skipped: true, reason: `llm http ${resp.status}` };
    const data = await resp.json();
    const text = data?.content || data?.message || '';
    // 提取 JSON 数组（容错：LLM 可能包裹在 ```json ... ``` 中）
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      memories = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error('[evolveMemory] LLM summary failed:', err.message);
    return { skipped: true, reason: `llm error: ${err.message}` };
  }

  if (!Array.isArray(memories) || memories.length === 0) {
    return { skipped: true, reason: 'no memories extracted' };
  }

  // 批量写入记忆到服务端
  try {
    const batchResp = await fetch('/api/agent-memory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memories: memories.map(m => ({
          agentId: agentId || 'orchestrator',
          sessionId,
          memoryType: m.memory_type,
          content: String(m.content || '').slice(0, 200),
          evidence: Array.isArray(m.evidence) ? m.evidence.map(e => String(e).slice(0, 100)) : [],
          weight: Math.max(1, Math.min(10, Number(m.weight) || 1)),
        })),
      }),
    });
    if (!batchResp.ok) {
      return { skipped: true, reason: `batch write http ${batchResp.status}` };
    }
  } catch (err) {
    console.error('[evolveMemory] batch write failed:', err.message);
    return { skipped: true, reason: `batch write error: ${err.message}` };
  }

  // 增量更新 persona_summary（合并式）
  // 提取最有价值的 1-2 条作为 persona patch
  const topInsights = memories
    .filter(m => ['user_trait', 'user_need', 'user_habit'].includes(m.memory_type))
    .sort((a, b) => (b.weight || 1) - (a.weight || 1))
    .slice(0, 2);

  if (topInsights.length > 0) {
    try {
      const patch = {};
      // 合并到对应字段：habits 数组 / traits 数组 / needs 数组
      const habits = memories.filter(m => m.memory_type === 'user_habit').map(m => m.content);
      const traits = memories.filter(m => m.memory_type === 'user_trait').map(m => m.content);
      const needs = memories.filter(m => m.memory_type === 'user_need').map(m => m.content);
      if (habits.length) patch.habits = habits;
      if (traits.length) patch.traits = traits;
      if (needs.length) patch.needs = needs;
      patch.lastEvolvedAt = new Date().toISOString();

      await fetch('/api/agent-memory/persona', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch }),
      });
      return { memories: memories.length, personaUpdated: true };
    } catch (err) {
      console.error('[evolveMemory] persona patch failed:', err.message);
    }
  }

  return { memories: memories.length, personaUpdated: false };
}

/**
 * 检索用户记忆并注入到 systemPrompt
 * 用于「记忆上服务端」后让 agent 知道用户的历史记忆
 */
export async function fetchRelevantMemories(query, limit = 5) {
  try {
    const url = `/api/agent-memory/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.memories || [];
  } catch {
    return [];
  }
}

/**
 * 读取用户的 persona_summary（用于初始化 systemPrompt 时注入用户性格画像）
 */
export async function fetchPersonaSummary() {
  try {
    const resp = await fetch('/api/agent-memory/persona');
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.personaSummary || null;
  } catch {
    return null;
  }
}
