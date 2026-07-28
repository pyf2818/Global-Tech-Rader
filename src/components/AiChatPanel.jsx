/**
 * AiChatPanel - AI 工作站三栏布局容器
 *
 * 三栏：SessionSidebar（左·会话管理）+ 对话主区（中）+ AgentPanel（右·智能管理）
 * - 撑满 feed 容器，内部 CSS grid 三栏
 * - 流式回复 / 引用校验 / 快捷指令 / 附件 / 消息操作栏
 * - 接收 pendingMessage（来自右栏「剖析」或其它入口）做深度分析
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { renderMarkdown } from '../utils/markdown.jsx';
import SessionSidebar from './SessionSidebar.jsx';
import AgentPanel from './AgentPanel.jsx';
import { retrieveRelevantMemories } from '../utils/sessionMemory.js';
import { searchFiles } from '../utils/workspaceIndex.js';
import { observeQuestion, observeReply, observeFeedback, getLearnedPreferences } from '../utils/profileLearning.js';
import { evolveMemory, fetchPersonaSummary } from '../utils/memoryEvolver.js';
import { extractTodos } from '../utils/todoExtractor.js';
import { selectToolSchemas } from '../utils/agentTools.js';
import {
  subscribePending, getPendingApprovals, respondApproval, cancelAllPending,
} from '../utils/sandbox.js';
import { PersonaDrawer } from './PersonaEditor.jsx';
import { ToolCallCard, ApprovalCard } from './aichat/ToolCards.jsx';
import { sessionsStore, loadSessions, saveSessions } from './aichat/sessionsStore.js';
import { WELCOME_MSGS, EMPTY_MESSAGES, SUGGEST_ICONS } from './aichat/constants.jsx';
import { buildMaterialContext } from './aichat/buildMaterialContext.js';
import { buildSystemPrompt } from './aichat/buildSystemPrompt.js';
import { buildQuickActions } from './aichat/buildQuickActions.js';
import { runAgentLoop as runAgentLoopImpl } from './aichat/runAgentLoop.js';
import { useInputHistory } from './aichat/useInputHistory.js';
import ChatHeader from './aichat/ChatHeader.jsx';

// 模块级 abortController，跨组件生命周期保持
let activeAbortController = null;

export default function AiChatPanel({
  llmConfig,
  intelligenceProfile,
  workbenchItems,
  selectedInterests,
  categories,
  allLlmModels,
  onOpenLlmConfig,
  user,
  pendingMessage,
  onMessageSent,
  intelligenceContext,
  onOpenNewspaper,
  todayBriefing,
  todayLanes,
  materials,
  agent,
  onUpdateAgent,
  variant = 'copilot',
}) {
  // 订阅模块级 sessionsStore：组件 unmount 后流式 fetch 继续更新 store，
  // 重新 mount 时 useState 初始化从 store 读取最新状态
  const [storeSnapshot, setStoreSnapshot] = useState(sessionsStore.state);
  useEffect(() => sessionsStore.subscribe(setStoreSnapshot), []);
  const sessions = storeSnapshot.sessions;
  const activeSessionId = storeSnapshot.activeSessionId
    || (storeSnapshot.sessions.length > 0 ? storeSnapshot.sessions[0].id : null);
  const isStreaming = storeSnapshot.isStreaming;
  // 暴露给原 setSessions 调用点的兼容函数：写入 store + 持久化
  const setSessions = useCallback((updater) => {
    const prev = sessionsStore.state.sessions;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    sessionsStore.setState({ sessions: next });
  }, []);
  const setActiveSessionId = useCallback((id) => sessionsStore.setState({ activeSessionId: id }), []);
  const setIsStreaming = useCallback((v) => sessionsStore.setState({ isStreaming: v }), []);

  const [workspaceFiles, setWorkspaceFiles] = useState([]); // 工作空间加入上下文的文件
  const [memoriesVersion, setMemoriesVersion] = useState(0); // 会话记忆版本（摘要生成后刷新）
  const [learnedVersion, setLearnedVersion] = useState(0); // 学习画像版本（观测后刷新）
  const [autoTodos, setAutoTodos] = useState([]); // 对话自动提取的行动项
  const [excludeAllEvidence, setExcludeAllEvidence] = useState(false); // 一键排除全部情报上下文

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(llmConfig?.selectedModel || '');
  const [attachments, setAttachments] = useState([]);
  const [sessionCollapsed, setSessionCollapsed] = useState(false);

  // 输入历史：上下键浏览之前发送的消息（Claude Code / shell 风格）
  // 已抽离至 aichat/useInputHistory.js，下方通过 hook 注入
  // inputHistoryRef/draftRef/historyIndexRef 由 hook 内部管理；handleKeyDown 由 hook 返回

  // 沙箱审批：订阅 pending 列表，UI 在聊天流末尾渲染审批卡片
  const [pendingApprovals, setPendingApprovals] = useState(() => getPendingApprovals());
  useEffect(() => subscribePending(() => setPendingApprovals(getPendingApprovals())), []);
  // 切换会话时取消所有未决审批（避免错乱）
  useEffect(() => {
    return () => { /* 不在切换时取消，让 abort 流程自己处理 */ };
  }, [activeSessionId]);

  // 角色设定侧滑面板：从 chat-header 入口打开，编辑当前 agent 的 persona/soul/voice/habits
  const [showPersonaDrawer, setShowPersonaDrawer] = useState(false);
  const handleSavePersona = useCallback((agentId, patch) => {
    if (!onUpdateAgent) {
      console.warn('[AiChatPanel] onUpdateAgent prop 未传入，无法保存角色设定');
      return;
    }
    onUpdateAgent(agentId, patch);
  }, [onUpdateAgent]);

  // Sync model selection when llmConfig changes externally (e.g. from LLM modal)
  useEffect(() => {
    if (llmConfig?.selectedModel && llmConfig.selectedModel !== selectedModel) {
      setSelectedModel(llmConfig.selectedModel);
    }
  }, [llmConfig?.selectedModel]);

  const [welcomeMsg] = useState(() => WELCOME_MSGS[Math.floor(Math.random() * WELCOME_MSGS.length)]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // 消息队列：流式生成中允许用户继续输入下一条消息并排队，流结束后自动发送
  // 类似 Codex / Claude Code 的多消息排队体验
  const messageQueueRef = useRef([]);
  const [queueCount, setQueueCount] = useState(0);
  const abortControllerRef = useRef(null);

  const currentSession = sessions.find(s => s.id === activeSessionId);
  const messages = currentSession?.messages || EMPTY_MESSAGES;
  const userName = user?.username || '你';

  // 检索与当前输入相关的历史记忆（跨对话不失忆）
  const relevantMemories = useMemo(() => {
    const query = input || messages.filter(m => m.role === 'user').pop()?.content || '';
    return retrieveRelevantMemories(query, activeSessionId, 3);
  }, [input, messages, activeSessionId, memoriesVersion]);

  // 学习画像：从用户行为观测到的偏好（高频主题/格式/深度）
  const learnedPrefs = useMemo(() => getLearnedPreferences(), [learnedVersion]);

  const materialContext = useMemo(() => buildMaterialContext(materials), [materials]);

  // 工作空间召回：异步检索相关文件（IndexedDB），debounce 避免频繁查询
  const [recalledFiles, setRecalledFiles] = useState([]);

  // 用户性格画像：从服务端 persona_summary 加载，让 agent 跨会话「记得」用户
  const [personaSummary, setPersonaSummary] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchPersonaSummary().then(ps => {
      if (!cancelled && ps) setPersonaSummary(ps);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [memoriesVersion]); // memoriesVersion 变化时重新拉取（记忆进化后刷新画像）

  useEffect(() => {
    const query = input || messages.filter(m => m.role === 'user').pop()?.content || '';
    if (!query || query.length < 4) { setRecalledFiles([]); return; }
    const timer = setTimeout(async () => {
      const results = await searchFiles(query, 3);
      // 排除已手动加入上下文的文件
      const existing = new Set(workspaceFiles.map(f => f.name));
      setRecalledFiles(results.filter(r => !existing.has(r.name)));
    }, 500);
    return () => clearTimeout(timer);
  }, [input, messages, workspaceFiles]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // sessions 持久化由 sessionsStore.setState 自动处理（流式过程中持续写回）

  // Build system prompt：已抽离至 aichat/buildSystemPrompt.js
  const systemPrompt = useMemo(() => buildSystemPrompt({
    selectedInterests, categories, intelligenceProfile, workbenchItems, intelligenceContext,
    workspaceFiles, relevantMemories, recalledFiles, learnedPrefs,
    excludeAllEvidence, materialContext, agent, personaSummary,
  }), [selectedInterests, categories, intelligenceProfile, workbenchItems?.length, intelligenceContext, workspaceFiles, relevantMemories, recalledFiles, learnedPrefs, excludeAllEvidence, materialContext, agent, personaSummary]);

  // 情境化快捷建议：已抽离至 aichat/buildQuickActions.js
  const quickActions = useMemo(() => buildQuickActions(intelligenceContext, workbenchItems, materialContext), [intelligenceContext, workbenchItems, materialContext]);

  // 用户消息节点列表（用于侧边导航跳转）
  const userMessageNodes = useMemo(() => messages
    .map((m, i) => m.role === 'user' ? { idx: i, content: m.content } : null)
    .filter(Boolean), [messages]);
  const jumpToMessage = useCallback((idx) => {
    const el = document.getElementById(`chat-msg-${idx}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const createSession = useCallback(() => {
    const newSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  }, []);

  const deleteSession = useCallback((id) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeSessionId]);

  const switchSession = useCallback((id) => {
    setActiveSessionId(id);
  }, []);

  // 双击会话项重命名
  const renameSession = useCallback((id, title) => {
    const next = window.prompt('重命名对话', title);
    if (next !== null && next.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: next.trim() } : s));
    }
  }, []);

  // Agent loop：tool_calls 循环执行（已抽离至 aichat/runAgentLoop.js）
  const runAgentLoop = useCallback(async ({ targetId, userMessage, controller, toolSchemas, baseMessages }) => {
    return runAgentLoopImpl({
      targetId, userMessage, controller, toolSchemas, baseMessages,
      systemPrompt, llmConfig, selectedModel,
      intelligenceContext, agent, sessions, messages,
      setSessions, setLearnedVersion, setAutoTodos, setMemoriesVersion,
    });
  }, [llmConfig, selectedModel, systemPrompt, intelligenceContext, sessions, messages, setSessions, setLearnedVersion, setAutoTodos, setMemoriesVersion]);

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    // 队列模式：流式生成中允许排队，不阻塞用户输入
    if (isStreaming) {
      messageQueueRef.current.push(msg);
      setQueueCount(messageQueueRef.current.length);
      setInput('');
      return;
    }
    if (!llmConfig?.baseUrl || !selectedModel) {
      onOpenLlmConfig?.();
      return;
    }

    let targetId = activeSessionId;
    if (!targetId) {
      const newSession = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: msg.slice(0, 24),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      targetId = newSession.id;
      setActiveSessionId(targetId);
    }

    const userMessage = { role: 'user', content: msg };
    const assistantPlaceholder = { role: 'assistant', content: '', loading: true };

    setSessions(prev => prev.map(s => {
      if (s.id !== targetId) return s;
      const title = s.messages.length === 0 ? msg.slice(0, 24) : s.title;
      return { ...s, title, messages: [...s.messages, userMessage, assistantPlaceholder], updatedAt: Date.now() };
    }));

    // 画像学习：观测用户提问主题 + 兴趣领域 + 提问模式 + 时段 + 实体
    observeQuestion(msg);
    // 负面反馈信号识别：用户的"不对/太长/再想想"等
    observeFeedback(msg);
    setLearnedVersion(v => v + 1);
    setInput('');

    // 记录到输入历史（去重最新项，最多保留 50 条）
    const hist = inputHistoryRef.current;
    if (hist.length === 0 || hist[hist.length - 1] !== msg) {
      hist.push(msg);
      if (hist.length > 50) hist.shift();
    }
    draftRef.current = '';
    historyIndexRef.current = null;

    // 标记流式生成中：触发 send 按钮变为 stop 按钮，输入框允许继续输入排队
    setIsStreaming(true);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      activeAbortController = controller; // 模块级引用，组件 unmount 后仍可 abort

      // Agent 模式：当前智能体配置了 tools 时走 agent loop（非流式 + tool_calls 循环）
      const toolSchemas = agent?.tools?.length ? selectToolSchemas(agent.tools) : [];
      if (toolSchemas.length > 0) {
        await runAgentLoop({
          targetId,
          userMessage,
          controller,
          toolSchemas,
          baseMessages: [...messages, userMessage],
        });
        return;
      }

      const response = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: selectedModel,
          action: 'chat',
          systemPrompt,
          messages: [...messages, userMessage].slice(-20).map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4000,
          stream: true,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(typeof errData.error === 'string' ? errData.error : errData.error?.message || `AI 请求失败 (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let rawContent = '';
      let streamError = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') { buffer = ''; continue; }
          try {
            const json = JSON.parse(payload);
            if (json.ok === false) { streamError = json.error || 'AI 请求失败'; break; }
            if (json.delta) {
              rawContent += json.delta;
              // 逐字更新最后一条 assistant 消息
              setSessions(prev => prev.map(s => {
                if (s.id !== targetId) return s;
                const msgs = [...s.messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: rawContent, loading: false };
                return { ...s, messages: msgs };
              }));
            }
          } catch { /* 跳过不完整行 */ }
        }
        if (streamError) break;
      }

      if (streamError) throw new Error(streamError);
      if (!rawContent) rawContent = '未能获取回复内容。';

      // 引用校验
      const allowedCitationIds = new Set((intelligenceContext?.items || []).map(item => String(item.id)));
      const citedIds = [...rawContent.matchAll(/\[资讯:([^\]]+)\]/g)].map(match => match[1].trim());
      const invalidIds = [...new Set(citedIds.filter(id => !allowedCitationIds.has(id)))];
      const finalContent = invalidIds.length
        ? `${rawContent}\n\n> 引用校验失败：以下资讯 ID 不在当前证据集中：${invalidIds.join('、')}`
        : rawContent;

      setSessions(prev => prev.map(s => {
        if (s.id !== targetId) return s;
        const msgs = [...s.messages];
        msgs[msgs.length - 1] = { role: 'assistant', content: finalContent, loading: false };
        return { ...s, messages: msgs, updatedAt: Date.now() };
      }));

      // 画像学习：观测 AI 回复格式与深度
      observeReply(finalContent);
      setLearnedVersion(v => v + 1);
      // 自动提取行动项
      const extracted = extractTodos(finalContent);
      if (extracted.length > 0) setAutoTodos(extracted);

      // 会话记忆：异步生成摘要（不阻塞对话），累积 3 轮以上才生成
      const currentSession = sessions.find(s => s.id === targetId) || { ...session, id: targetId, messages: [...messages, userMessage, { role: 'assistant', content: finalContent }] };
      const totalRounds = currentSession.messages.filter(m => m.role === 'user').length;
      if (totalRounds >= 3) {
        generateSessionSummary(currentSession, { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, selectedModel }).then(mem => {
          if (mem) setMemoriesVersion(v => v + 1);
        });
        // 自我进化记忆闭环：流式 chat 路径也触发
        evolveMemory({
          messages: currentSession.messages,
          sessionId: targetId,
          agentId: agent?.id || 'orchestrator',
          llmConfig: { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, selectedModel },
          totalRounds,
        }).catch(() => { /* 静默失败 */ });
      }
    } catch (err) {
      const aborted = err?.name === 'AbortError';
      setSessions(prev => prev.map(s => {
        if (s.id !== targetId) return s;
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (aborted && last?.role === 'assistant' && last.content) {
          // 用户主动停止：保留已生成内容，标记已停止
          msgs[msgs.length - 1] = { ...last, loading: false, stopped: true };
        } else {
          msgs[msgs.length - 1] = { role: 'assistant', content: `请求失败：${err.message}`, loading: false, error: true };
        }
        return { ...s, messages: msgs };
      }));
    } finally {
      // 先捕获 abort 状态再清空 ref（避免 race）
      const wasAborted = abortControllerRef.current?.signal?.aborted || activeAbortController?.signal?.aborted || false;
      abortControllerRef.current = null;
      activeAbortController = null;
      setIsStreaming(false);
      // 消费消息队列：若用户在流式生成期间排队了下一条消息，自动发送
      // 仅当本次非用户主动停止时才消费（避免停止后还自动发下一条）
      if (!wasAborted && messageQueueRef.current.length > 0) {
        const nextMsg = messageQueueRef.current.shift();
        setQueueCount(messageQueueRef.current.length);
        // 异步触发下一条，避免在 finally 中嵌套调用
        setTimeout(() => sendMessage(nextMsg), 50);
      } else if (wasAborted) {
        // 用户主动停止：清空队列
        messageQueueRef.current = [];
        setQueueCount(0);
      }
    }
  }, [input, messages, isStreaming, llmConfig, selectedModel, systemPrompt, onOpenLlmConfig, activeSessionId, intelligenceContext, agent, runAgentLoop]);

  // 停止生成：同时取消所有未决审批，让 Agent Loop 解除阻塞
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort() || activeAbortController?.abort();
    cancelAllPending('用户停止生成');
  }, []);

  // 复制消息内容到剪贴板
  const copyMessage = useCallback(async (content, e) => {
    try {
      await navigator.clipboard.writeText(content);
      const btn = e?.currentTarget;
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => { btn.textContent = orig; }, 1200);
      }
    } catch {}
  }, []);

  // 沙箱审批响应
  const handleRespondApproval = useCallback((id, decision) => {
    respondApproval(id, decision);
    setPendingApprovals(getPendingApprovals());
  }, []);

  // 重新生成最后一条 AI 回复：移除末尾 assistant 消息后重发上一条 user 消息
  const regenerateLast = useCallback(() => {
    if (isStreaming || !activeSessionId) return;
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session || session.messages.length < 2) return;
    const lastUser = [...session.messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    // 移除末尾的 assistant 消息
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const msgs = [...s.messages];
      while (msgs.length && msgs[msgs.length - 1].role === 'assistant') msgs.pop();
      return { ...s, messages: msgs, updatedAt: Date.now() };
    }));
    // 用上一条 user 消息重新发送（不带 input，避免清空逻辑干扰）
    sendMessage(lastUser.content);
  }, [isStreaming, activeSessionId, sessions, sendMessage]);

  // 引用追问：直接发送带引用的追问消息（不再填入输入框，避免长内容污染输入区）
  // 走 sendMessage，自动复用队列逻辑：流式中自动排队，空闲时立即发送
  const quoteReply = useCallback((content) => {
    const snippet = content.length > 300 ? content.slice(0, 300) + '…' : content;
    // 直接发起一次追问，引用原文并要求深入分析
    sendMessage(`请基于以下内容深入分析，提炼关键信息、影响和后续值得关注的信号：\n\n> ${snippet}`);
  }, [sendMessage]);

  // 工作空间文件加入对话上下文
  const handleAddContextFiles = useCallback((files) => {
    setWorkspaceFiles(prev => {
      const existing = new Set(prev.map(f => f.path));
      return [...prev, ...files.filter(f => !existing.has(f.path))];
    });
  }, []);

  // Watch for pending messages from external triggers (e.g. 右栏「剖析」按钮 / 快捷入口)
  useEffect(() => {
    if (pendingMessage && !isStreaming) {
      sendMessage(pendingMessage);
      onMessageSent?.();
    }
  }, [pendingMessage, isStreaming, sendMessage, onMessageSent]);

  // 输入历史导航 hook（已抽离至 aichat/useInputHistory.js）
  // inputHistoryRef/draftRef/historyIndexRef 由 hook 内部管理，handleKeyDown 由 hook 返回
  const { inputHistoryRef, draftRef, historyIndexRef, handleKeyDown } = useInputHistory({
    inputRef, input, setInput, sendMessage,
  });

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments(prev => [...prev, { name: file.name, type: file.type, size: file.size, dataUrl: reader.result }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const hasConfig = Boolean(llmConfig?.baseUrl && selectedModel);

  return (
    <div className={`ai-chat-panel ${variant === 'main' ? 'ai-chat-panel-main' : ''} ${variant === 'main' && sessionCollapsed ? 'session-collapsed' : ''}`}>
      {/* 左栏：会话管理（可折叠） */}
      {variant === 'main' && !sessionCollapsed && (
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onCreate={createSession}
          onSwitch={switchSession}
          onDelete={deleteSession}
          onRename={renameSession}
          onOpenNewspaper={onOpenNewspaper}
          todayBriefing={todayBriefing}
          todayLanes={todayLanes}
          selectedDate={intelligenceContext?.date}
          materials={materials}
          onAddContextFiles={handleAddContextFiles}
        />
      )}

      {/* 中栏：对话主区 */}
      <div className="chat-main-col">
      {/* Header（已抽离至 aichat/ChatHeader.jsx） */}
      <ChatHeader
        variant={variant}
        sessionCollapsed={sessionCollapsed}
        setSessionCollapsed={setSessionCollapsed}
        agent={agent}
        setShowPersonaDrawer={setShowPersonaDrawer}
        onOpenLlmConfig={onOpenLlmConfig}
      />

      {/* Messages area + 侧边节点导航 */}
      <div className="chat-messages-wrap">
      <div className="chat-messages custom-scrollbar">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-greeting">
              <span className="chat-welcome-typed">{userName}，{welcomeMsg}</span>
            </div>
            <p className="chat-welcome-meta">
              已加载 {workbenchItems?.length || 0} 条资讯 · {materialContext.total} 条素材{materialContext.hasElf ? `（AI 精灵 ${materialContext.elfCount}）` : ''} · {selectedInterests?.length || 0} 个关注领域 · {intelligenceProfile?.confidence || 0}% 置信度
            </p>
            <p className="chat-welcome-tip">万般硅川汇集于此，亦可取一瓢独饮</p>
            <div className="chat-welcome-cards">
              {quickActions.map(action => (
                <button key={action.label} className="chat-suggest-card" onClick={() => sendMessage(action.prompt)}>
                  <span className="chat-suggest-icon">{SUGGEST_ICONS[action.icon] || SUGGEST_ICONS.sparkle}</span>
                  <span className="chat-suggest-text">
                    <strong>{action.label}</strong>
                    <small>{action.desc}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} id={`chat-msg-${i}`} className={`chat-msg chat-msg-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="chat-avatar">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="21" cy="23" r="1.5" fill="var(--accent-cyan)"/>
                  <circle cx="27" cy="23" r="1.5" fill="var(--accent-cyan)"/>
                  <path d="M21 28C21 28 22.5 30 24 30C25.5 30 27 28 27 28" stroke="var(--accent-cyan)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            )}
            <div className={`chat-bubble ${msg.error ? 'chat-bubble-error' : ''}${msg.toolCalls?.length ? ' chat-bubble-has-tools' : ''}`}>
              {/* Agent 工具调用痕迹：agent loop 进行中与完成后均展示 */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="chat-tool-calls">
                  {msg.thinking && msg.loading && (
                    <div className="chat-tool-thinking">
                      <span className="chat-tool-thinking-dot" />
                      {msg.thinking}
                    </div>
                  )}
                  {msg.toolCalls.map((tc, idx) => (
                    <ToolCallCard key={tc.id || idx} tc={tc} />
                  ))}
                </div>
              )}
              {msg.loading ? (
                msg.toolCalls && msg.toolCalls.length > 0 ? (
                  // agent loop 进行中：展示已有内容片段（可能为空），不再显示三点动画
                  msg.content ? (
                    <div
                      className="chat-bubble-content is-streaming"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : null
                ) : (
                  <div className="chat-typing"><span /><span /><span /></div>
                )
              ) : (
                <div
                  className={`chat-bubble-content${(isStreaming && i === messages.length - 1) ? ' is-streaming' : ''}${msg.stopped ? ' is-stopped' : ''}`}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                />
              )}
            </div>
            {msg.role === 'assistant' && !msg.loading && !msg.error && (
              <div className="chat-msg-actions">
                <button type="button" className="chat-action-btn" title="复制" onClick={e => copyMessage(msg.content, e)}>复制</button>
                <button type="button" className="chat-action-btn" title="重新生成" onClick={() => regenerateLast()} disabled={isStreaming}>重新生成</button>
                <button type="button" className="chat-action-btn" title="引用追问" onClick={() => quoteReply(msg.content)}>引用追问</button>
              </div>
            )}
          </div>
        ))}
        {/* 沙箱审批卡片：当前会话有 pending 时在聊天流末尾渲染 */}
        {pendingApprovals.length > 0 && (
          <div className="approval-cards-wrap">
            {pendingApprovals.map(approval => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onRespond={handleRespondApproval}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 侧边节点导航：记录用户每条消息，点击跳转 */}
      {userMessageNodes.length > 0 && (
        <nav className="chat-side-rail custom-scrollbar" aria-label="对话节点导航">
          <div className="chat-side-rail-label">节点</div>
          {userMessageNodes.map((node, n) => (
            <button
              key={node.idx}
              type="button"
              className="chat-side-rail-node"
              onClick={() => jumpToMessage(node.idx)}
              title={node.content}
            >
              <span className="chat-side-rail-num">{n + 1}</span>
              <span className="chat-side-rail-text">{node.content}</span>
            </button>
          ))}
        </nav>
      )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="chat-attachments">
          {attachments.map((att, i) => (
            <div key={i} className="chat-attachment-chip">
              <span>{att.name}</span>
              <button onClick={() => removeAttachment(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input - ChatGPT 风格大圆角容器，工具按钮内嵌底部 */}
      <div className="chat-composer">
        {/* 顶部行：左侧情报上下文胶囊 + 右侧快捷指令，同一高度 */}
        <div className="chat-composer-top">
          <div className="chat-context-group">
            {intelligenceContext?.items?.length > 0 && (
              <div className="chat-context-wrap">
                <button type="button" className={`chat-context-pill chat-context-pill-toggle ${excludeAllEvidence ? 'excluded' : ''}`} onClick={() => setExcludeAllEvidence(v => !v)} title={excludeAllEvidence ? '已排除情报上下文，点击恢复' : '已附加情报上下文，点击排除'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {excludeAllEvidence ? '已排除情报上下文' : `已附加 ${intelligenceContext.items.length} 条情报`}
                </button>
              </div>
            )}
            {workspaceFiles.length > 0 && (
              <div className="chat-context-pill chat-context-pill-file" title={workspaceFiles.map(f => f.name).join(', ')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                工作空间文件 {workspaceFiles.length}
                <button type="button" className="chat-context-pill-clear" onClick={() => setWorkspaceFiles([])} title="清除">✕</button>
              </div>
            )}
            {materialContext.total > 0 && (
              <div className={`chat-context-pill chat-context-pill-material ${materialContext.hasElf ? 'has-elf' : ''}`} title={`已附加 ${materialContext.selected.length} 条素材上下文`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
                {materialContext.hasElf ? `AI 精灵素材 ${materialContext.elfCount}` : `素材库 ${materialContext.total}`}
              </div>
            )}
          </div>
          {messages.length > 0 && (
            <div className="chat-quick-bar">
              {quickActions.map(action => (
                <button key={action.label} className="chat-quick-pill" onClick={() => sendMessage(action.prompt)} disabled={isStreaming}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="chat-input-area">
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()} title="上传附件" disabled={!hasConfig}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <textarea ref={inputRef} className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={hasConfig ? (isStreaming ? "正在生成中，输入下一条消息自动排队…" : "给智能体发消息…  (Shift+Enter 换行)") : "请先配置大模型"} rows={1} disabled={!hasConfig} />
          {queueCount > 0 && (
            <span className="chat-queue-indicator" title={`${queueCount} 条消息排队中`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {queueCount}
            </span>
          )}
          {isStreaming && (
            <button className="chat-stop-btn" onClick={stopGeneration} title="停止生成" aria-label="停止生成">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
          )}
          <button className="chat-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || !hasConfig} title={isStreaming ? '排队发送' : '发送'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      </div>{/* /.chat-main-col */}

      {/* 右栏：智能管理面板 */}
      {variant === 'main' && (
        <AgentPanel
          messages={messages}
          activeSessionId={activeSessionId}
          llmConfig={llmConfig}
          selectedModel={selectedModel}
          isStreaming={isStreaming}
          intelligenceProfile={intelligenceProfile}
          relevantMemories={relevantMemories}
          recalledFiles={recalledFiles}
          onAddContextFiles={handleAddContextFiles}
          learnedPrefs={learnedPrefs}
          autoTodos={autoTodos}
          agent={agent}
        />
      )}
      <PersonaDrawer
        open={showPersonaDrawer}
        onClose={() => setShowPersonaDrawer(false)}
        agent={agent}
        onChange={handleSavePersona}
      />
    </div>
  );
}
