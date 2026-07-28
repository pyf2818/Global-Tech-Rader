// Agent Loop：tool_calls 循环执行
// 流程：发请求 → 若返回 tool_calls 则执行工具并把结果回灌 → 重新请求，直到无 tool_calls 或达到最大轮数
// 用户点"停止"时通过 controller.abort() 中断当前 fetch；已完成的 toolCalls 痕迹保留展示
// 从 src/components/AiChatPanel.jsx 抽离，纯函数（无 React 依赖）

import { generateSessionSummary, retrieveRelevantMemories } from '../../utils/sessionMemory.js';
import { observeReply, observeToolUsage } from '../../utils/profileLearning.js';
import { evolveMemory } from '../../utils/memoryEvolver.js';
import { extractTodos } from '../../utils/todoExtractor.js';
import { executeAgentTool } from '../../utils/agentTools.js';
import { getRootHandle } from '../../utils/workspaceHandleStore.js';
import { buildSessionContextText, appendHistory } from '../../utils/sessionStore.js';

/**
 * @param {object} opts
 * @param {string} opts.targetId 当前会话 ID
 * @param {{role:string, content:string}} opts.userMessage 用户消息
 * @param {AbortController} opts.controller 中断控制器
 * @param {Array} opts.toolSchemas 工具 schema 列表
 * @param {Array<{role:string, content:string}>} opts.baseMessages 起始消息列表
 * @param {string} opts.systemPrompt 系统提示词
 * @param {object} opts.llmConfig LLM 配置（baseUrl/apiKey/tavilyKey 等）
 * @param {string} opts.selectedModel 模型名
 * @param {object} opts.intelligenceContext 情报上下文
 * @param {object} opts.agent 当前智能体配置
 * @param {Array} opts.sessions 当前所有会话
 * @param {Array} opts.messages 当前会话消息
 * @param {(updater:any)=>void} opts.setSessions 会话状态 setter
 * @param {(v:any)=>any} opts.setLearnedVersion 学习画像版本 setter
 * @param {(v:any)=>any} opts.setAutoTodos 自动待办 setter
 * @param {(v:any)=>any} opts.setMemoriesVersion 记忆版本 setter
 */
export async function runAgentLoop({
  targetId,
  userMessage,
  controller,
  toolSchemas,
  baseMessages,
  systemPrompt,
  llmConfig,
  selectedModel,
  intelligenceContext,
  agent,
  sessions,
  messages,
  setSessions,
  setLearnedVersion,
  setAutoTodos,
  setMemoriesVersion,
}) {
  const MAX_ITERATIONS = 6; // 防止无限循环
  const toolCtx = {
    rootHandle: getRootHandle(),
    sessionId: targetId,
    agentId: agent?.id || '',
    agentName: agent?.name || '',
    agentTools: Array.isArray(agent?.tools) ? agent.tools : [],
    // 联网搜索 Tavily Key（用户在设置面板配置；未配置则后端使用环境变量）
    tavilyKey: llmConfig?.tavilyKey || '',
    llmConfig,
  };
  // 工作中的消息列表（包含 user / assistant / tool 三种角色），逐步累积
  const conversationMessages = baseMessages.map(m => ({ role: m.role, content: m.content }));
  // 给 UI 用的工具调用记录（不带原始 messages 结构，便于渲染卡片）
  const toolCallTrace = [];
  let finalContent = '';
  let aborted = false;

  const updateAssistantMsg = (patch) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch, loading: true };
      return { ...s, messages: msgs };
    }));
  };

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter += 1) {
      // 更新 UI：当前轮次的"思考中"状态
      updateAssistantMsg({
        content: finalContent,
        toolCalls: toolCallTrace.slice(),
        thinking: iter === 0 ? '正在思考...' : '继续推理...',
        toolCallCount: toolCallTrace.length,
      });

      // 注入会话级状态（执行计划 / 变量 / 黑板 / 最近工具调用），让 LLM 看到上下文
      const sessionContextText = buildSessionContextText(targetId);
      const fullSystemPrompt = sessionContextText
        ? `${systemPrompt}\n\n【会话状态】你正在执行一个多步任务，以下是当前会话的状态快照，可作为接力推理的依据：\n${sessionContextText}`
        : systemPrompt;

      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: selectedModel,
          action: 'chat',
          systemPrompt: fullSystemPrompt,
          messages: conversationMessages.slice(-30),
          max_tokens: 4000,
          tools: toolSchemas,
          tool_choice: 'auto',
        }),
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
      // 若 LLM 同时返回了文本，更新到 UI
      if (data.content) finalContent = data.content;

      // 逐个执行工具调用
      for (const tc of data.tool_calls) {
        const toolName = tc?.function?.name || 'unknown';
        let args = {};
        try { args = JSON.parse(tc?.function?.arguments || '{}'); } catch { args = {}; }

        // 更新 UI：开始执行工具
        toolCallTrace.push({
          id: tc.id,
          name: toolName,
          args,
          status: 'running',
          startedAt: Date.now(),
        });
        // 画像学习：记录用户偏好的工具
        observeToolUsage([toolName]);
        updateAssistantMsg({
          content: finalContent,
          toolCalls: toolCallTrace.slice(),
          thinking: `正在调用工具：${toolName}`,
          toolCallCount: toolCallTrace.length,
        });

        // 执行工具（executeAgentTool 内部已 try/catch，不抛异常；但 fetch 自身可能因 abort 抛出）
        let result;
        try {
          result = await executeAgentTool(toolName, args, toolCtx);
        } catch (err) {
          // abort 时 fetch 抛 AbortError，向上传播让外层捕获
          if (err?.name === 'AbortError') throw err;
          result = `工具执行失败：${err?.message || String(err)}`;
        }

        // 更新 UI：工具执行完成
        const traceItem = toolCallTrace.find(t => t.id === tc.id);
        if (traceItem) {
          traceItem.status = 'done';
          traceItem.result = String(result).slice(0, 4000);
          traceItem.completedAt = Date.now();
        }
        updateAssistantMsg({
          content: finalContent,
          toolCalls: toolCallTrace.slice(),
          thinking: `工具 ${toolName} 已返回，继续推理...`,
          toolCallCount: toolCallTrace.length,
        });

        // 追加到会话历史（sessionStore），供后续轮次的 LLM 看到「最近调用」
        try {
          appendHistory(targetId, {
            toolName,
            args,
            result: String(result).slice(0, 1000),
            status: String(result).startsWith('错误：') ? 'failed' : 'done',
          });
        } catch { /* ignore */ }

        // 把工具结果作为 tool message 追加到 conversation
        conversationMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: String(result).slice(0, 20000),
        });

        // 用户已 abort：停止后续工具调用
        if (controller.signal.aborted) {
          aborted = true;
          break;
        }
      }
      // 用户已 abort：跳出 LLM 循环
      if (controller.signal.aborted) {
        aborted = true;
        break;
      }
      // 进入下一轮：LLM 看到 tool 结果后继续推理
    }
  } catch (err) {
    // abort：标记并保留已有内容与 toolCalls
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      aborted = true;
    } else {
      // 其他错误：向上传播，由 sendMessage 的 catch 统一处理
      throw err;
    }
  }

  if (aborted) {
    if (!finalContent) finalContent = '（已停止）';
    // 写入最终消息：保留 toolCalls 痕迹，标记 stopped
    setSessions(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const msgs = [...s.messages];
      msgs[msgs.length - 1] = {
        role: 'assistant',
        content: finalContent,
        toolCalls: toolCallTrace.slice(),
        toolCallCount: toolCallTrace.length,
        loading: false,
        stopped: true,
      };
      return { ...s, messages: msgs, updatedAt: Date.now() };
    }));
    return;
  }

  if (!finalContent) finalContent = '（agent 达到最大轮数仍未给出最终回复）';

  // 引用校验（与流式路径一致）
  const allowedCitationIds = new Set((intelligenceContext?.items || []).map(item => String(item.id)));
  const citedIds = [...finalContent.matchAll(/\[资讯:([^\]]+)\]/g)].map(match => match[1].trim());
  const invalidIds = [...new Set(citedIds.filter(id => !allowedCitationIds.has(id)))];
  const finalFinalContent = invalidIds.length
    ? `${finalContent}\n\n> 引用校验失败：以下资讯 ID 不在当前证据集中：${invalidIds.join('、')}`
    : finalContent;

  // 写入最终 assistant 消息（保留 toolCalls 痕迹供 UI 展示）
  setSessions(prev => prev.map(s => {
    if (s.id !== targetId) return s;
    const msgs = [...s.messages];
    msgs[msgs.length - 1] = {
      role: 'assistant',
      content: finalFinalContent,
      toolCalls: toolCallTrace.slice(),
      loading: false,
    };
    return { ...s, messages: msgs, updatedAt: Date.now() };
  }));

  // 画像学习与摘要（与流式路径一致）
  observeReply(finalFinalContent);
  setLearnedVersion(v => v + 1);
  const extracted = extractTodos(finalFinalContent);
  if (extracted.length > 0) setAutoTodos(extracted);

  const currentSession = sessions.find(s => s.id === targetId) || { id: targetId, messages: [...messages, userMessage, { role: 'assistant', content: finalFinalContent }] };
  const totalRounds = currentSession.messages.filter(m => m.role === 'user').length;
  if (totalRounds >= 3) {
    generateSessionSummary(currentSession, { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, selectedModel }).then(mem => {
      if (mem) setMemoriesVersion(v => v + 1);
    });
    // 自我进化记忆闭环：每 N 轮触发 LLM 总结用户行为，写入服务端 persona_summary
    // fire-and-forget，失败不影响对话流
    evolveMemory({
      messages: currentSession.messages,
      sessionId: targetId,
      agentId: agent?.id || 'orchestrator',
      llmConfig: { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, selectedModel },
      totalRounds,
    }).catch(() => { /* 静默失败 */ });
  }
}
