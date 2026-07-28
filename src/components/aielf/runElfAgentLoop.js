// AiElf Agent Loop：工具调用循环执行
// 从 src/AiElf.jsx 抽离
// 流程：发请求 → 若返回 tool_calls 则执行工具并把结果回灌 → 重新请求，直到无 tool_calls 或达到最大轮数
// 原地更新末尾的 placeholder assistant 消息（通过 setAgentMessages 回调）

import { executeAgentTool } from '../../utils/agentTools.js';
import { getRootHandle } from '../../utils/workspaceHandleStore.js';

/**
 * @param {Object} params
 * @param {string} params.activeAgentId
 * @param {Array} params.baseMessages - 初始消息列表
 * @param {Array} params.toolSchemas - 工具 schema 列表
 * @param {string} params.systemPrompt
 * @param {Object} params.llmConfig - { baseUrl, apiKey, selectedModel }
 * @param {Function} params.setAgentMessages - React setState，用于原地更新消息
 * @returns {Promise<{role:string,content:string,toolCalls:Array,toolCallCount:number,loading:boolean,timestamp:number}>}
 */
export async function runElfAgentLoop({ activeAgentId, baseMessages, toolSchemas, systemPrompt, llmConfig, setAgentMessages }) {
  const MAX_ITERATIONS = 6;
  const toolCtx = { rootHandle: getRootHandle() };
  const conversationMessages = baseMessages.map(m => ({ role: m.role, content: m.content }));
  const toolCallTrace = [];
  let finalContent = '';

  const patchLast = (patch) => {
    setAgentMessages(prev => {
      const list = prev[activeAgentId] || [];
      if (list.length === 0) return prev;
      const lastIdx = list.length - 1;
      const replaced = list.map((m, idx) => idx === lastIdx ? { ...m, ...patch } : m);
      return { ...prev, [activeAgentId]: replaced };
    });
  };

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter += 1) {
      patchLast({
        content: finalContent,
        toolCalls: toolCallTrace.slice(),
        thinking: iter === 0 ? '正在思考...' : '继续推理...',
        loading: true,
      });

      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action: 'chat',
          systemPrompt,
          messages: conversationMessages.slice(-30),
          max_tokens: 4000,
          tools: toolSchemas,
          tool_choice: 'auto',
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(typeof errData.error === 'string' ? errData.error : errData.error?.message || `AI 请求失败 (${response.status})`);
      }
      const data = await response.json();
      if (data.ok === false) throw new Error(data.error || 'AI 请求失败');

      // 若无 tool_calls，本次即为最终答案
      if (!Array.isArray(data.tool_calls) || data.tool_calls.length === 0) {
        finalContent = data.content || '（无内容返回）';
        break;
      }

      // 有 tool_calls：先把 assistant 的 tool_calls 消息追加到 conversation
      conversationMessages.push({
        role: 'assistant',
        content: data.content || '',
        tool_calls: data.tool_calls,
      });
      if (data.content) finalContent = data.content;

      // 逐个执行工具调用
      for (const tc of data.tool_calls) {
        const toolName = tc?.function?.name || 'unknown';
        let args = {};
        try { args = JSON.parse(tc?.function?.arguments || '{}'); } catch { args = {}; }

        toolCallTrace.push({
          id: tc.id,
          name: toolName,
          args,
          status: 'running',
          startedAt: Date.now(),
        });
        patchLast({
          content: finalContent,
          toolCalls: toolCallTrace.slice(),
          thinking: `正在调用工具：${toolName}`,
          loading: true,
        });

        let result;
        try {
          result = await executeAgentTool(toolName, args, toolCtx);
        } catch (err) {
          result = `工具执行失败：${err?.message || String(err)}`;
        }

        const traceItem = toolCallTrace.find(t => t.id === tc.id);
        if (traceItem) {
          traceItem.status = 'done';
          traceItem.result = String(result).slice(0, 4000);
          traceItem.completedAt = Date.now();
        }
        patchLast({
          content: finalContent,
          toolCalls: toolCallTrace.slice(),
          thinking: `工具 ${toolName} 已返回，继续推理...`,
          loading: true,
        });

        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: String(result).slice(0, 20000),
        });
      }
    }
  } catch (err) {
    // 任何错误：保留已完成的 toolCalls 痕迹，写入错误信息
    if (!finalContent) {
      finalContent = `分析失败: ${err?.message || String(err)}`;
    }
  }

  if (!finalContent) finalContent = '（agent 达到最大轮数仍未给出最终回复）';

  return {
    role: 'assistant',
    content: finalContent,
    toolCalls: toolCallTrace.slice(),
    toolCallCount: toolCallTrace.length,
    loading: false,
    timestamp: Date.now(),
  };
}
