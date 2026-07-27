import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { selectToolSchemas, executeAgentTool } from './utils/agentTools.js';
import { getRootHandle } from './utils/workspaceHandleStore.js';
import {
  buildAgenticSystemPrompt as buildAgenticSystemPromptImpl,
  buildRelayPrompt,
  buildAnalysisPrompt as buildAnalysisPromptImpl,
} from './components/aielf/prompts.js';
import Sidebar from './components/aielf/Sidebar.jsx';
import ChatHeader from './components/aielf/ChatHeader.jsx';
import MessageList from './components/aielf/MessageList.jsx';
import InputArea from './components/aielf/InputArea.jsx';

// AI精灵助手组件 - Agent系统 + 历史记录 + 自适应窗口
// embedded=true 时以全屏工作站模式渲染（无悬浮按钮、强制展开、占满父容器）
export default function AiElf({ llmConfig, avatarImage, elfName, onExportToMaterials, onContinueInWorkbench, agents, currentAgent, onChangeAgent, externalQuotedContext, intelligenceProfile, intelligenceMissions, embedded = false }) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState(currentAgent || 'analyst');
  const [showSidebar, setShowSidebar] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);
  
  // 按Agent保存消息 { agentId: [messages] }
  const [agentMessages, setAgentMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ai-elf-agent-messages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 按Agent保存历史会话 { agentId: [{id, title, timestamp, messages}[]] }
  const [agentHistory, setAgentHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ai-elf-agent-history');
      if (!saved) return {};
      
      const history = JSON.parse(saved);
      
      // 数据迁移：将旧的对象结构转换为新的数组结构
      const migrated = {};
      Object.keys(history).forEach(agentId => {
        const sessions = history[agentId];
        // 如果是对象（旧结构），转换为数组
        if (!Array.isArray(sessions)) {
          if (sessions && sessions.messages) {
            migrated[agentId] = [sessions];
          } else {
            migrated[agentId] = [];
          }
        } else {
          // 已经是数组，直接使用
          migrated[agentId] = sessions;
        }
      });
      
      return migrated;
    } catch {
      return {};
    }
  });

  // 当前会话ID（用于追踪当前对话窗口）
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // 引用上下文（用于多轮对话时引用之前的消息）
  const [quotedContext, setQuotedContext] = useState(null);

  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  const AVATAR_SIZE = 56;

  // 当前活跃Agent
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

  // 当前Agent的消息
  const messages = agentMessages[activeAgentId] || [];

  // 当前Agent的历史记录（多个对话窗口）
  const historySessions = agentHistory[activeAgentId] || [];

  const profile = intelligenceProfile || {};
  const missions = Array.isArray(intelligenceMissions) ? intelligenceMissions : [];
  const activeAgentSessions = historySessions.length;
  const agentById = (id) => agents.find(agent => agent.id === id);
  const relayAgents = ['orchestrator', 'memory-agent', 'risk-scout', 'creation-agent', 'analyst']
    .map(agentById)
    .filter(agent => agent && agent.id !== activeAgentId);

  const buildAgenticSystemPrompt = useMemo(
    () => buildAgenticSystemPromptImpl(activeAgent, missions, agents, profile),
    [activeAgent, missions, agents, profile]
  );

  const runMission = (mission) => {
    if (!mission) return;
    if (mission.agentId) handleChangeAgent(mission.agentId);
    setInputText(mission.prompt || mission.label || '');
  };

  const handoffToAgent = (targetAgentId, sourceMessage) => {
    const targetAgent = agentById(targetAgentId);
    if (!targetAgent || !sourceMessage) return;
    const sourceAgentName = activeAgent?.name || '上一位智能体';
    handleChangeAgent(targetAgent.id);
    setQuotedContext({
      title: `智能体接力：${sourceAgentName} → ${targetAgent.name}`,
      content: sourceMessage.content.slice(0, 180) + (sourceMessage.content.length > 180 ? '...' : ''),
      fullContent: sourceMessage.content
    });
    setInputText(buildRelayPrompt(targetAgent, sourceMessage));
    setIsOpen(true);
    setTimeout(() => document.querySelector('.ai-elf-chat-input')?.focus(), 50);
  };

  useEffect(() => {
    if (currentAgent) setActiveAgentId(currentAgent);
  }, [currentAgent]);

  useEffect(() => {
    if (!externalQuotedContext) return;
    if (externalQuotedContext.agentId) {
      setActiveAgentId(externalQuotedContext.agentId);
      onChangeAgent && onChangeAgent(externalQuotedContext.agentId);
    }
    setQuotedContext({
      title: externalQuotedContext.title || '外部上下文',
      content: externalQuotedContext.content || ''
    });
    if (externalQuotedContext.suggestedPrompt) {
      setInputText(externalQuotedContext.suggestedPrompt);
    }
    setIsOpen(true);
  }, [externalQuotedContext?.id]);

  // 生成Agent专属的分析Prompt（来自 prompts.js）
  const buildAnalysisPrompt = (itemData, pageContent) =>
    buildAnalysisPromptImpl(activeAgentId, agents, itemData, pageContent);

  // 初始化位置 - 右下角
  useEffect(() => {
    const updatePosition = () => {
      const margin = 20;
      setPosition({
        x: window.innerWidth - AVATAR_SIZE - margin,
        y: window.innerHeight - AVATAR_SIZE - margin
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // 保存消息历史（带大小限制和错误处理）
  useEffect(() => {
    try {
      const MAX_MESSAGES_PER_AGENT = 50;
      const trimmed = {};
      Object.keys(agentMessages).forEach(key => {
        const msgs = agentMessages[key] || [];
        if (msgs.length > MAX_MESSAGES_PER_AGENT) {
          trimmed[key] = msgs.slice(-MAX_MESSAGES_PER_AGENT);
        } else {
          trimmed[key] = msgs;
        }
      });
      localStorage.setItem('ai-elf-agent-messages', JSON.stringify(trimmed));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded for ai-elf-agent-messages');
      }
    }
  }, [agentMessages]);

  // 保存历史会话（带大小限制和错误处理）
  // 切换Agent时自动加载最近的历史会话
  useEffect(() => {
    const sessions = agentHistory[activeAgentId] || [];
    const validSessions = Array.isArray(sessions) ? sessions : [];
    
    if (validSessions.length > 0) {
      // 加载最近的历史会话
      const recentSession = validSessions[0];
      setCurrentSessionId(recentSession.id);
      setAgentMessages(prev => ({
        ...prev,
        [activeAgentId]: recentSession.messages || []
      }));
    } else {
      // 没有历史会话，清空
      setCurrentSessionId(null);
      setAgentMessages(prev => ({
        ...prev,
        [activeAgentId]: []
      }));
    }
  }, [activeAgentId, agentHistory]);

  // 保存历史会话（带大小限制和错误处理）
  useEffect(() => {
    try {
      const MAX_HISTORY_PER_AGENT = 10;
      const trimmed = {};
      Object.keys(agentHistory).forEach(key => {
        const sessions = agentHistory[key] || [];
        const validSessions = Array.isArray(sessions) ? sessions : [];
        if (validSessions.length > MAX_HISTORY_PER_AGENT) {
          trimmed[key] = validSessions.slice(0, MAX_HISTORY_PER_AGENT);
        } else {
          trimmed[key] = validSessions;
        }
      });
      localStorage.setItem('ai-elf-agent-history', JSON.stringify(trimmed));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded for ai-elf-agent-history');
      }
    }
  }, [agentHistory]);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 计算聊天窗口位置（跟随精灵）
  const getWindowPosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const chatWidth = showSidebar ? 720 : 520;
    const chatHeight = 560;

    let left = position.x - chatWidth + AVATAR_SIZE;
    let top = position.y - chatHeight;

    if (left < 10) left = 10;
    if (left + chatWidth > windowWidth - 10) left = windowWidth - chatWidth - 10;
    if (top < 10) top = position.y + AVATAR_SIZE + 10;
    if (top + chatHeight > windowHeight - 10) top = windowHeight - chatHeight - 10;

    return { left, top };
  };

  // 拖拽开始
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.ai-elf-chat-window') || e.target.closest('.ai-elf-chat-input')) return;
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
      moved: false, // 移动距离超过阈值才视为真正拖拽，避免误触发点击
    };
  }, [position]);

  // 拖拽移动
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // 移动超过 5px 才标记为真拖拽，避免微小抖动被误判
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 5) dragRef.current.moved = true;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - AVATAR_SIZE, dragRef.current.initialX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - AVATAR_SIZE, dragRef.current.initialY + dy))
    });
  }, [isDragging]);

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 点击切换：仅在未真正拖拽时触发
  const handleAvatarClick = useCallback(() => {
    if (dragRef.current.moved) return; // 真拖拽过则不切换 isOpen
    setIsOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 切换Agent
  const handleChangeAgent = (agentId) => {
    setActiveAgentId(agentId);
    onChangeAgent && onChangeAgent(agentId);
  };

  // 展开/收起Agent历史
  const toggleAgentExpand = (agentId, e) => {
    e.stopPropagation();
    setExpandedAgent(prev => prev === agentId ? null : agentId);
  };

  // 获取网页内容
  const fetchPageContent = async (url) => {
    try {
      const response = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.content;
    } catch {
      return null;
    }
  };

  // ===== Agent Loop：工具调用循环（与 AiChatPanel 中 runAgentLoop 等价的 AiElf 版本） =====
  // 流程：发请求 → 若返回 tool_calls 则执行工具并把结果回灌 → 重新请求，直到无 tool_calls 或达到最大轮数
  // 原地更新末尾的 placeholder assistant 消息（content + toolCalls + thinking）
  const runElfAgentLoop = useCallback(async ({ activeAgentId, baseMessages, toolSchemas, systemPrompt }) => {
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
  }, [llmConfig, llmConfig?.selectedModel]);

  // 发送消息给AI
  const sendMessage = async (text = inputText, itemData = null) => {
    if (!text.trim() && !itemData) return;

    const quotedContent = quotedContext?.fullContent || quotedContext?.content || '';
    let messageText = quotedContext
      ? `【引用上下文】\n${quotedContent}\n\n【用户问题】\n${text}`
      : text;

    if (itemData) {
      setIsLoading(true);
      const pageContent = await fetchPageContent(itemData.url);
      messageText = buildAnalysisPrompt(itemData, pageContent);
    }

    const newMessage = {
      role: 'user',
      content: text || `分析资讯：${itemData?.title || ''}`,
      timestamp: Date.now()
    };

    setAgentMessages(prev => ({
      ...prev,
      [activeAgentId]: [...(prev[activeAgentId] || []), newMessage]
    }));
    setInputText('');
    setQuotedContext(null);
    setIsLoading(true);

    try {
      if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
        setAgentMessages(prev => ({
          ...prev,
          [activeAgentId]: [...(prev[activeAgentId] || []), {
            role: 'assistant',
            content: '请先在设置中配置大模型 API。',
            timestamp: Date.now()
          }]
        }));
        setIsLoading(false);
        return;
      }

      const systemPrompt = buildAgenticSystemPrompt;

      const currentMessages = agentMessages[activeAgentId] || [];

      // ===== Agent Loop 模式：当智能体配置了 tools 白名单时走工具调用循环 =====
      const toolSchemas = activeAgent?.tools?.length ? selectToolSchemas(activeAgent.tools) : null;

      if (toolSchemas && toolSchemas.length > 0) {
        // 预先插入一条 placeholder assistant 消息，agent loop 会原地更新它
        const placeholderMsg = {
          role: 'assistant',
          content: '',
          toolCalls: [],
          loading: true,
          timestamp: Date.now()
        };
        setAgentMessages(prev => ({
          ...prev,
          [activeAgentId]: [...(prev[activeAgentId] || []), placeholderMsg]
        }));

        const baseConversation = [
          ...currentMessages.map(msg => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: messageText }
        ];
        const finalAssistant = await runElfAgentLoop({
          activeAgentId,
          baseMessages: baseConversation,
          toolSchemas,
          systemPrompt,
        });

        // 用最终结果替换 placeholder，并保存到 session 历史
        setAgentMessages(prev => {
          const list = prev[activeAgentId] || [];
          const replaced = list.map((m, idx) => idx === list.length - 1 ? finalAssistant : m);
          const allMessages = { ...prev, [activeAgentId]: replaced };

          if (!currentSessionId) {
            const newSessionId = Date.now();
            setCurrentSessionId(newSessionId);
            const session = {
              id: newSessionId,
              title: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
              timestamp: Date.now(),
              messages: replaced
            };
            setAgentHistory(history => {
              const sessions = Array.isArray(history[activeAgentId]) ? history[activeAgentId] : [];
              return { ...history, [activeAgentId]: [session, ...sessions].slice(0, 10) };
            });
          } else {
            setAgentHistory(history => {
              const sessions = Array.isArray(history[activeAgentId]) ? history[activeAgentId] : [];
              const updatedSessions = sessions.map(s =>
                s.id === currentSessionId
                  ? { ...s, messages: replaced, timestamp: Date.now(), title: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : '') }
                  : s
              );
              return { ...history, [activeAgentId]: updatedSessions };
            });
          }
          return allMessages;
        });
      } else {
        // ===== 普通模式：无 tools，单次请求 =====
        const response = await fetch('/api/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: llmConfig.baseUrl,
            apiKey: llmConfig.apiKey,
            model: llmConfig.selectedModel,
            action: 'chat',
            content: messageText,
            systemPrompt,
            messages: currentMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });

        const data = await response.json();
        if (data.error) {
          setAgentMessages(prev => ({
            ...prev,
            [activeAgentId]: [...(prev[activeAgentId] || []), {
              role: 'assistant',
              content: `分析失败: ${data.error}`,
              timestamp: Date.now()
            }]
          }));
        } else {
          setAgentMessages(prev => {
            const updatedMessages = [...(prev[activeAgentId] || []), {
              role: 'assistant',
              content: data.content || '暂无分析结果',
              timestamp: Date.now()
            }];

            const allMessages = {
              ...prev,
              [activeAgentId]: updatedMessages
            };

            // 保存对话历史到当前session
            if (!currentSessionId) {
              const newSessionId = Date.now();
              setCurrentSessionId(newSessionId);
              
              // 创建新session
              const session = {
                id: newSessionId,
                title: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
                timestamp: Date.now(),
                messages: updatedMessages
              };
              setAgentHistory(history => {
                const sessions = Array.isArray(history[activeAgentId]) ? history[activeAgentId] : [];
                return {
                  ...history,
                  [activeAgentId]: [session, ...sessions].slice(0, 10)
                };
              });
            } else {
              // 更新现有session
              setAgentHistory(history => {
                const sessions = Array.isArray(history[activeAgentId]) ? history[activeAgentId] : [];
                const updatedSessions = sessions.map(s =>
                  s.id === currentSessionId
                    ? { ...s, messages: updatedMessages, timestamp: Date.now(), title: newMessage.content.slice(0, 50) + (newMessage.content.length > 50 ? '...' : '') }
                    : s
                );
                return {
                  ...history,
                  [activeAgentId]: updatedSessions
                };
              });
            }

            return allMessages;
          });
        }
      }
    } catch (e) {
      setAgentMessages(prev => ({
        ...prev,
        [activeAgentId]: [...(prev[activeAgentId] || []), {
          role: 'assistant',
          content: `分析失败: ${e.message}`,
          timestamp: Date.now()
        }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // 拖拽处理
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const itemData = e.dataTransfer.getData('application/json');
    if (itemData) {
      try {
        const item = JSON.parse(itemData);
        if (!isOpen) setIsOpen(true);
        sendMessage('', item);
      } catch (err) {
        console.error('解析拖拽数据失败:', err);
      }
    }
  };

  // 导出对话到本地
  const exportConversation = () => {
    const content = messages.map(msg => {
      const role = msg.role === 'user' ? '用户' : (elfName || 'AI精灵');
      const time = new Date(msg.timestamp).toLocaleString();
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${elfName || 'AI精灵'}对话_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildConversationMaterial = (mode = 'archive', sourceMessage = null) => {
    const selectedMessages = sourceMessage ? [sourceMessage] : messages;
    const firstUserMessage = messages.find(message => message.role === 'user');
    const latestAssistant = sourceMessage || [...messages].reverse().find(message => message.role === 'assistant');
    const titleBase = firstUserMessage?.content || latestAssistant?.content || `${elfName || 'AI精灵'}研究记录`;
    const quotedTitle = quotedContext?.title || '';
    const contextText = quotedContext?.fullContent || quotedContext?.content || '';
    const conversationText = selectedMessages.map(message => {
      const role = message.role === 'user' ? '用户' : (activeAgent?.name || elfName || 'AI精灵');
      const time = new Date(message.timestamp || Date.now()).toLocaleString('zh-CN');
      return `## ${role} / ${time}\n\n${message.content}`;
    }).join('\n\n---\n\n');

    const fullContent = [
      `# ${String(titleBase).slice(0, 80)}`,
      `- 来源：${elfName || 'AI精灵'} / ${activeAgent?.name || 'Agent'}`,
      `- 保存模式：${mode === 'workbench' ? '工作站继续研究' : '素材归档'}`,
      `- 保存时间：${new Date().toLocaleString('zh-CN')}`,
      quotedTitle ? `- 引用上下文：${quotedTitle}` : '',
      contextText ? `\n## 引用上下文\n\n${contextText}` : '',
      `\n## 对话分析\n\n${conversationText || '暂无对话内容'}`,
      `\n## 建议下一步\n\n- 在 AI 工作站中结合素材库继续追问\n- 补充原文、数据或反方证据\n- 将稳定结论沉淀为文章或研究清单`,
    ].filter(Boolean).join('\n');

    return {
      title: `AI研究：${String(titleBase).replace(/\s+/g, ' ').slice(0, 60)}`,
      content: latestAssistant?.content || conversationText || contextText || titleBase,
      fullContent,
      type: 'viewpoint',
      source: `${elfName || 'AI精灵'} / ${activeAgent?.name || 'Agent'}`,
      url: '',
      tags: ['AI精灵', 'AI工作站', '研究记录', activeAgent?.name].filter(Boolean),
      note: mode === 'workbench' ? '由 AI 精灵保存，可在 AI 工作站继续研究。' : '由 AI 精灵保存的分析素材。',
      metadata: {
        origin: 'ai-elf',
        agentId: activeAgentId,
        agentName: activeAgent?.name || '',
        sessionId: currentSessionId,
        quotedTitle,
        messageCount: messages.length,
        savedMode: mode,
      },
    };
  };

  const saveConversationToMaterials = (mode = 'archive', sourceMessage = null) => {
    const payload = buildConversationMaterial(mode, sourceMessage);
    if (mode === 'workbench') {
      onContinueInWorkbench && onContinueInWorkbench(payload);
      return;
    }
    if (!onExportToMaterials) return;
    onExportToMaterials(payload);
  };

  // 保存当前会话到历史
  // 加载历史会话
  const loadSession = (session) => {
    setCurrentSessionId(session.id);
    setAgentMessages(prev => ({
      ...prev,
      [activeAgentId]: session.messages
    }));
  };

  // 删除历史会话
  const deleteSession = (id, e) => {
    e.stopPropagation();
    setAgentHistory(prev => ({
      ...prev,
      [activeAgentId]: (prev[activeAgentId] || []).filter(s => s.id !== id)
    }));
  };

// 清空当前Agent对话
  const clearConversation = () => {
    const newSessionId = Date.now();
    const newSession = {
      id: newSessionId,
      title: '新对话',
      timestamp: Date.now(),
      messages: []
    };

    // 如果当前session有消息，保存当前session到历史记录
    if (messages.length > 0 && currentSessionId) {
      const session = {
        id: currentSessionId,
        title: messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : ''),
        timestamp: Date.now(),
        messages: messages
      };
      setAgentHistory(prev => {
        const sessions = Array.isArray(prev[activeAgentId]) ? prev[activeAgentId] : [];
        return {
          ...prev,
          [activeAgentId]: [newSession, session, ...sessions.filter(s => s.id !== currentSessionId)].slice(0, 10)
        };
      });
    } else {
      // 如果当前session没有消息，直接添加新的空session
      setAgentHistory(prev => {
        const sessions = Array.isArray(prev[activeAgentId]) ? prev[activeAgentId] : [];
        return {
          ...prev,
          [activeAgentId]: [newSession, ...sessions].slice(0, 10)
        };
      });
    }
    
    // 切换到新的session
    setCurrentSessionId(newSessionId);
    setAgentMessages(prev => ({
      ...prev,
      [activeAgentId]: []
    }));
  };

  // renderMarkdown / markdown helpers / tool-call card 已抽离至 components/aielf/
  const windowPos = getWindowPosition();

  return (
    <>
      {/* AI精灵悬浮按钮 */}
      <div
        className={`ai-elf-avatar ${isDragging ? 'dragging' : ''} ${isOpen ? 'active' : ''}`}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'grab',
          width: AVATAR_SIZE,
          height: AVATAR_SIZE
        }}
        onMouseDown={handleMouseDown}
        onClick={handleAvatarClick}
        title="AI精灵助手（点击打开 / 拖动移动）"
      >
        <img
          src={avatarImage || '/ai-elf-avatar.png'}
          alt="AI精灵"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid rgba(167, 139, 250, 0.5)'
          }}
        />
        <div className="ai-elf-avatar-pulse" />
      </div>

      {/* AI精灵聊天窗口 */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`ai-elf-chat-window ${isDragOver ? 'drag-over' : ''}`}
          style={{
            position: 'fixed',
            left: windowPos.left,
            top: windowPos.top,
            width: showSidebar ? 720 : 520,
            maxWidth: 'calc(100vw - 40px)',
            height: 560,
            maxHeight: 'calc(100vh - 100px)',
            zIndex: 9998
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 左侧边栏 - Agent列表 + 历史记录 */}
          {showSidebar && (
            <Sidebar
              avatarImage={avatarImage}
              activeAgent={activeAgent}
              agents={agents}
              activeAgentId={activeAgentId}
              activeAgentSessions={activeAgentSessions}
              profile={profile}
              agentHistory={agentHistory}
              expandedAgent={expandedAgent}
              handleChangeAgent={handleChangeAgent}
              toggleAgentExpand={toggleAgentExpand}
              setCurrentSessionId={setCurrentSessionId}
              setAgentMessages={setAgentMessages}
              setAgentHistory={setAgentHistory}
            />
          )}

          {/* 右侧主区域 */}
          <div className="ai-elf-main">
            <ChatHeader
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              activeAgent={activeAgent}
              avatarImage={avatarImage}
              elfName={elfName}
              clearConversation={clearConversation}
              exportConversation={exportConversation}
              onContinueInWorkbench={onContinueInWorkbench}
              onExportToMaterials={onExportToMaterials}
              saveConversationToMaterials={saveConversationToMaterials}
              setIsOpen={setIsOpen}
            />

            {/* 聊天内容区域 */}
            <div className="ai-elf-chat-body">
              <MessageList
                messages={messages}
                avatarImage={avatarImage}
                activeAgent={activeAgent}
                isLoading={isLoading}
                messagesEndRef={messagesEndRef}
                relayAgents={relayAgents}
                onContinueInWorkbench={onContinueInWorkbench}
                setQuotedContext={setQuotedContext}
                setInputText={setInputText}
                saveConversationToMaterials={saveConversationToMaterials}
                handoffToAgent={handoffToAgent}
                elfName={elfName}
                missions={missions}
                agents={agents}
                runMission={runMission}
              />
            </div>

            <InputArea
              quotedContext={quotedContext}
              setQuotedContext={setQuotedContext}
              inputText={inputText}
              setInputText={setInputText}
              sendMessage={sendMessage}
              activeAgent={activeAgent}
              isLoading={isLoading}
              missions={missions}
              runMission={runMission}
            />
          </div>
        </div>
      )}
    </>
  );
}
