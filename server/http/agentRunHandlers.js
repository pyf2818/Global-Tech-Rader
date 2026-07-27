// agentRunHandlers.js - 智能体执行端点（定时任务调用 + 前端主动调用）
// 路由: POST /api/agent/run
// 接收: { agentId, missionPrompt, newsContext?: { blocked, interests }, conversationId?: string }
// 鉴权: 必须登录（从 session cookie 拿 userId）
import { buildAgentSystemPrompt, buildAgentUserMessage } from '../agent/agentContext.js';
import { addAgentMemory } from '../agent/agentMemoryService.js';
import { sendJsonResponse, readJsonBody } from './httpUtils.js';
import { getUserIdFromRequest } from './agentAuth.js';

async function requireUserId(req) {
  return getUserIdFromRequest(req);
}

/**
 * 执行一次 agent 任务（无前端交互，用于定时任务或后台触发）
 * 返回 agent 的最终回复
 */
export async function runAgentOnce({ agentId, missionPrompt, userId, llmConfig, newsContext = null, sessionId = null, toolSchemas = null }) {
  // 1. 构建 systemPrompt
  const systemPrompt = await buildAgentSystemPrompt({ agentId, userId });

  // 2. 构建 user 消息（含今日资讯）
  const userMessage = await buildAgentUserMessage({ missionPrompt, newsContext });

  // 3. 调用 LLM（复用 aiHandlers 的 handleAiGenerateRequest 内部逻辑）
  // 直接 fetch 自己的 /api/ai-generate（避免重复实现 LLM 调用）
  // 注：定时任务场景没有 req/res，直接走内部函数
  const llmResp = await fetch(`${llmConfig.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(llmConfig.apiKey ? { 'Authorization': `Bearer ${llmConfig.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: llmConfig.selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      tools: toolSchemas?.length ? toolSchemas : undefined,
      tool_choice: toolSchemas?.length ? 'auto' : undefined,
      max_tokens: 4000,
      temperature: 0.6,
    }),
  });

  if (!llmResp.ok) {
    const errText = await llmResp.text();
    throw new Error(`LLM API ${llmResp.status}: ${errText.slice(0, 200)}`);
  }

  const llmData = await llmResp.json();
  const assistantMsg = llmData.choices?.[0]?.message;
  const output = assistantMsg?.content || '';

  // 4. 把这次任务产物写入 agent 记忆（agent_insight 类型）
  if (output && userId) {
    try {
      await addAgentMemory({
        userId,
        agentId,
        sessionId,
        memoryType: 'agent_insight',
        content: `[定时任务] ${missionPrompt.slice(0, 80)}... → ${output.slice(0, 200)}`,
        evidence: [missionPrompt.slice(0, 100)],
        weight: 5,
      });
    } catch (err) {
      console.error('[runAgentOnce] memory write failed:', err.message);
    }
  }

  return {
    output,
    toolCalls: assistantMsg?.tool_calls || [],
    tokensUsed: llmData.usage?.total_tokens,
  };
}

/**
 * HTTP handler: POST /api/agent/run
 * 用户主动调用 agent 执行（也可被 cron 守护调用）
 */
export async function handleAgentRunRequest(req, res) {
  const userId = await requireUserId(req);
  if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });

  const body = await readJsonBody(req);
  if (!body.agentId) return sendJsonResponse(res, 400, { ok: false, error: 'agentId is required' });
  if (!body.missionPrompt) return sendJsonResponse(res, 400, { ok: false, error: 'missionPrompt is required' });
  if (!body.llmConfig?.baseUrl || !body.llmConfig?.selectedModel) {
    return sendJsonResponse(res, 400, { ok: false, error: 'llmConfig.baseUrl and llmConfig.selectedModel are required' });
  }

  try {
    const result = await runAgentOnce({
      agentId: body.agentId,
      missionPrompt: body.missionPrompt,
      userId,
      llmConfig: body.llmConfig,
      newsContext: body.newsContext || null,
      sessionId: body.sessionId || null,
      toolSchemas: body.toolSchemas || null,
    });
    return sendJsonResponse(res, 200, { ok: true, ...result });
  } catch (err) {
    console.error('[handleAgentRunRequest] failed:', err.message);
    return sendJsonResponse(res, 500, { ok: false, error: err.message });
  }
}
