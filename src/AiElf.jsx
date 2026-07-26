import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

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
  const formatProfileList = (value, fallback = '暂无') => Array.isArray(value) && value.length ? value.join('、') : fallback;
  const agentById = (id) => agents.find(agent => agent.id === id);
  const relayAgents = ['orchestrator', 'memory-agent', 'risk-scout', 'creation-agent', 'analyst']
    .map(agentById)
    .filter(agent => agent && agent.id !== activeAgentId);

  const buildPersonalContext = () => `【用户画像】
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

  const buildAgenticSystemPrompt = useMemo(() => {
    const basePrompt = activeAgent?.systemPrompt || '';
    const missionText = missions.slice(0, 5).map(mission => {
      const missionAgent = agentById(mission.agentId);
      return `- ${mission.label}：${missionAgent?.name || '智能体'}`;
    }).join('\n') || '- 暂无预设任务';

    return `${basePrompt}

${buildPersonalContext()}

【当前智能体】
- 名称：${activeAgent?.name || 'AI精灵'}
- 专长：${activeAgent?.description || '综合分析'}
- 可接力任务：
${missionText}`;
  }, [activeAgent, missions, agents, profile]);

  const runMission = (mission) => {
    if (!mission) return;
    if (mission.agentId) handleChangeAgent(mission.agentId);
    setInputText(mission.prompt || mission.label || '');
  };

  const buildRelayPrompt = (targetAgent, sourceMessage) => {
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

  // 生成Agent专属的分析Prompt
  const buildAnalysisPrompt = (itemData, pageContent) => {
    const agent = agents.find(a => a.id === activeAgentId) || agents[0];
    const hasFullContent = pageContent && pageContent.length > 100;
    const baseContent = `【资讯信息】
标题：${itemData.title}
摘要：${itemData.summary || '暂无摘要'}
来源：${itemData.source || '未知来源'}
${hasFullContent ? '【网页全文】\n' + pageContent.slice(0, 6000) + '\n\n' : ''}`;

    // 资讯分析师使用五个维度模板
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

    // 技术顾问
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

    // 商业分析师
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

    // 写作助手
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

    // 翻译专家
    if (activeAgentId === 'translator') {
      return `请将以下资讯内容翻译成英文，保持专业术语准确，表达自然流畅：

${baseContent}

翻译要求：
1. 保留原文的专业术语，必要时附注中文
2. 译文要符合英语母语者的表达习惯
3. 标题要翻译得简洁有力
4. 摘要要精炼准确`;
    }

    // 代码审查员
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

    // 学习教练
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

    // 辩论大师
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

    // 其他Agent使用通用分析模板
    return `${agent?.name || 'AI精灵'}分析以下资讯：

${baseContent}

请根据你的专业身份，给出结构化的分析。`;
  };

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

      const systemPrompt = buildAgenticSystemPrompt();

      const currentMessages = agentMessages[activeAgentId] || [];

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

  // 渲染Markdown内容
  const renderMarkdown = (text) => {
    if (!text) return '';

    let processed = text.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="ai-elf-code-block"><code>${escapeHtml(code)}</code></pre>`;
    });

    processed = processed.split('\n').map(line => {
      if (line.match(/^#{3}\s/)) return `<h4 class="ai-elf-heading">${escapeHtml(line.replace(/^#{3}\s/, ''))}</h4>`;
      if (line.match(/^#{2}\s/)) return `<h3 class="ai-elf-heading">${escapeHtml(line.replace(/^#{2}\s/, ''))}</h3>`;
      if (line.match(/^#{1}\s/)) return `<h2 class="ai-elf-heading">${escapeHtml(line.replace(/^#{1}\s/, ''))}</h2>`;
      return line;
    }).join('\n');

    const lines = processed.split('\n');
    const result = [];
    let inList = false;
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const tableMatch = line.match(/^\|(.+)\|$/);
      if (tableMatch) {
        const cells = tableMatch[1].split('|').map(cell => cell.trim());
        const isSeparator = cells.every(cell => cell.match(/^[-:]+$/));

        if (!inTable) {
          inTable = true;
          tableRows = [];
        }

        if (isSeparator) {
          if (tableRows.length === 1) {
            result.push('<table class="ai-elf-table"><thead><tr>');
            tableRows[0].forEach(cell => {
              result.push(`<th>${escapeHtml(cell)}</th>`);
            });
            result.push('</tr></thead><tbody>');
          }
          tableRows = [];
        } else {
          tableRows.push(cells);
        }
      } else {
        if (inTable) {
          if (tableRows.length > 0) {
            tableRows.forEach(row => {
              result.push('<tr>');
              row.forEach(cell => {
                result.push(`<td>${processInlineStyles(escapeHtml(cell))}</td>`);
              });
              result.push('</tr>');
            });
          }
          result.push('</tbody></table>');
          inTable = false;
          tableRows = [];
        }

        const listMatch = line.match(/^-\s(.+)$/);
        if (listMatch) {
          if (!inList) {
            result.push('<ul class="ai-elf-list">');
            inList = true;
          }
          result.push(`<li>${processInlineStyles(escapeHtml(listMatch[1]))}</li>`);
        } else if (line.trim() === '' && inList) {
          result.push('</ul>');
          inList = false;
          result.push('');
        } else {
          if (inList) {
            result.push('</ul>');
            inList = false;
          }
          result.push(line);
        }
      }
    }

    if (inTable) {
      if (tableRows.length > 0) {
        tableRows.forEach(row => {
          result.push('<tr>');
          row.forEach(cell => {
            result.push(`<td>${processInlineStyles(escapeHtml(cell))}</td>`);
          });
          result.push('</tr>');
        });
      }
      result.push('</tbody></table>');
    }

    if (inList) result.push('</ul>');
    processed = result.join('\n');

    processed = processInlineStyles(processed);

    const paragraphs = processed.split(/\n{2,}/);
    processed = paragraphs.map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<ul') || trimmed.startsWith('<table')) {
        return trimmed;
      }
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed;
      return `<p class="ai-elf-para">${trimmed.replace(/\n/g, ' ')}</p>`;
    }).join('');

    return processed;
  };

  const escapeHtml = (str) => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const processInlineStyles = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="ai-elf-inline-code">$1</code>');
  };

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
            <div className="ai-elf-sidebar">
              {/* 当前Agent信息卡片 */}
              <div className="ai-elf-sidebar-agent-info">
                <img
                  src={activeAgent.avatar || avatarImage || '/ai-elf-avatar.png'}
                  alt={activeAgent.name}
                  className="ai-elf-sidebar-avatar"
                />
                <div className="ai-elf-sidebar-agent-name">{activeAgent.name}</div>
                <div className="ai-elf-sidebar-agent-desc">{activeAgent.description}</div>
                <div className="ai-elf-sidebar-agent-tags">
                  <span className="ai-elf-sidebar-tag">{activeAgent.category}</span>
                  {(activeAgent.tags || []).slice(0, 2).map((tag, i) => (
                    <span key={i} className="ai-elf-sidebar-tag">{tag}</span>
                  ))}
                </div>
                <div className="ai-elf-os-metrics">
                  <div><strong>{agents.length}</strong><span>智能体</span></div>
                  <div><strong>{activeAgentSessions}</strong><span>会话</span></div>
                  <div><strong>{profile?.tracked?.length || 0}</strong><span>记忆</span></div>
                </div>
              </div>
              <div className="ai-elf-memory-panel">
                <div className="ai-elf-memory-title">个人画像</div>
                <div className="ai-elf-memory-line"><span>模式</span><strong>{profile.depth || '探索校准'}</strong></div>
                <div className="ai-elf-memory-line"><span>目标</span><strong>{profile.outputGoal || '阅读判断'}</strong></div>
                <div className="ai-elf-memory-tags">
                  {(profile.focusLabels || []).slice(0, 3).map(label => <span key={label}>{label}</span>)}
                  {!(profile.focusLabels || []).length && <span>待设置关注</span>}
                </div>
              </div>
              <div className="ai-elf-sidebar-header">
                <span>智能体生态</span>
              </div>
              <div className="ai-elf-sidebar-content">
                {agents.map(agent => (
                  <div key={agent.id} className="ai-elf-agent-group">
                    {/* Agent主项 */}
                    <div
                      className={`ai-elf-agent-item ${activeAgentId === agent.id ? 'active' : ''}`}
                      onClick={() => handleChangeAgent(agent.id)}
                    >
                      <img
                        src={agent.avatar || avatarImage || '/ai-elf-avatar.png'}
                        alt={agent.name}
                        className="ai-elf-agent-item-avatar"
                      />
                      <div className="ai-elf-agent-item-info">
                        <div className="ai-elf-agent-item-name">{agent.name}</div>
                        <div className="ai-elf-agent-item-desc">{agent.description}</div>
                      </div>
                      <button
                        className="ai-elf-agent-expand-btn"
                        onClick={(e) => toggleAgentExpand(agent.id, e)}
                        title="查看历史"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ transform: expandedAgent === agent.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                    {/* Agent历史记录 */}
                    {expandedAgent === agent.id && (
                      <div className="ai-elf-agent-history-list">
                        {(!agentHistory[agent.id] || !Array.isArray(agentHistory[agent.id]) || agentHistory[agent.id].length === 0) ? (
                          <div className="ai-elf-agent-history-empty">暂无历史记录</div>
                        ) : (
                          agentHistory[agent.id].map(session => {
                            const lastMessage = session.messages[session.messages.length - 1];
                            const messageCount = session.messages.length;
                            const lastMessagePreview = lastMessage?.content?.slice(0, 60) || '';
                            
                            return (
                              <div
                                key={session.id}
                                className="ai-elf-agent-history-item"
                                onClick={() => {
                                  handleChangeAgent(agent.id);
                                  setCurrentSessionId(session.id);
                                  setAgentMessages(prev => ({
                                    ...prev,
                                    [agent.id]: session.messages
                                  }));
                                }}
                              >
                                <div className="ai-elf-agent-history-item-title">{session.title}</div>
                                {lastMessagePreview && (
                                  <div className="ai-elf-agent-history-item-preview">{lastMessagePreview}...</div>
                                )}
                                <div className="ai-elf-agent-history-item-meta">
                                  <span>{new Date(session.timestamp).toLocaleDateString('zh-CN')}</span>
                                  <span>{new Date(session.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span>{messageCount} 条消息</span>
                                </div>
                                <button
                                  className="ai-elf-agent-history-item-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAgentHistory(prev => ({
                                      ...prev,
                                      [agent.id]: (prev[agent.id] || []).filter(s => s.id !== session.id)
                                    }));
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 右侧主区域 */}
          <div className="ai-elf-main">
            {/* 头部 */}
            <div className="ai-elf-chat-header">
              <div className="ai-elf-chat-header-left">
                <button
                  className="ai-elf-sidebar-toggle"
                  onClick={() => setShowSidebar(!showSidebar)}
                  title={showSidebar ? '收起边栏' : '展开边栏'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <img
                  src={activeAgent?.avatar || avatarImage || '/ai-elf-avatar.png'}
                  alt={activeAgent?.name}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    objectFit: 'cover'
                  }}
                />
                <span>{elfName || 'AI精灵'} · {activeAgent?.name}</span>
              </div>
              <div className="ai-elf-chat-actions">
                <button className="ai-elf-btn" onClick={clearConversation} title="新建会话">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button className="ai-elf-btn" onClick={exportConversation} title="导出对话">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                {onContinueInWorkbench && (
                  <button className="ai-elf-btn" onClick={() => saveConversationToMaterials('workbench')} title="保存并在 AI 工作站继续研究">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M4 4h16v16H4z" />
                      <path d="M8 9h8M8 13h5M15 16l3 3" />
                    </svg>
                  </button>
                )}
                {onExportToMaterials && (
                  <button className="ai-elf-btn" onClick={() => saveConversationToMaterials('archive')} title="保存到素材库">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  </button>
                )}
                <button className="ai-elf-btn" onClick={clearConversation} title="清空对话">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
                <button className="ai-elf-btn" onClick={() => setIsOpen(false)} title="关闭">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 聊天内容区域 */}
            <div className="ai-elf-chat-body">
              {missions.length > 0 && (
                <div className="ai-elf-mission-panel">
                  <div>
                    <span className="ai-elf-mission-kicker">INTELLIGENCE OS</span>
                    <strong>{elfName || 'AI精灵'} 已接入你的今日情报上下文</strong>
                  </div>
                  <div className="ai-elf-mission-grid">
                    {missions.slice(0, 4).map(mission => (
                      <button key={mission.id} onClick={() => runMission(mission)}>
                        <span>{mission.label}</span>
                        <small>{agents.find(agent => agent.id === mission.agentId)?.name || '智能体'}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.length === 0 && (
                <div className="ai-elf-chat-empty">
                  <img
                    src={activeAgent?.avatar || avatarImage || '/ai-elf-avatar.png'}
                    alt={activeAgent?.name}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      marginBottom: 12
                    }}
                  />
                  <p>{activeAgent?.name || 'AI精灵'}待命中</p>
                  <p>{activeAgent?.description || '拖拽资讯卡片到此处'}</p>
                  <p>我会结合你的关注、反馈和今日情报一起判断</p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`ai-elf-message ${msg.role}`}>
                  <div className="ai-elf-message-avatar">
                    {msg.role === 'user' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <img
                        src={activeAgent?.avatar || avatarImage || '/ai-elf-avatar.png'}
                        alt="AI"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                  </div>
                  <div className="ai-elf-message-content">
                    <div
                      className="ai-elf-message-text"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                    {msg.role === 'assistant' && (
                      <div className="ai-elf-message-actions">
                        <button
                          className="ai-elf-action-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content).then(() => {
                              const btn = document.querySelector(`[data-copy-index="${index}"]`);
                              if (btn) btn.textContent = '已复制';
                              setTimeout(() => { if (btn) btn.textContent = '复制'; }, 2000);
                            });
                          }}
                          data-copy-index={index}
                          title="复制内容"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          复制
                        </button>
                        <button
                          className="ai-elf-action-btn"
                          onClick={() => {
                            setQuotedContext({
                              messageIndex: index,
                              content: msg.content.slice(0, 120) + (msg.content.length > 120 ? '...' : ''),
                              fullContent: msg.content
                            });
                            setInputText('');
                            document.querySelector('.ai-elf-chat-input')?.focus();
                          }}
                          title="引用此分析继续深入探讨"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                          </svg>
                          继续深入
                        </button>
                        {onContinueInWorkbench && (
                          <button
                            className="ai-elf-action-btn"
                            onClick={() => saveConversationToMaterials('workbench', msg)}
                            title="存入工作站继续研究"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M4 4h16v16H4z" />
                              <path d="M8 9h8M8 13h5M15 16l3 3" />
                            </svg>
                            存入工作站
                          </button>
                        )}
                        {relayAgents.slice(0, 4).map(agent => (
                          <button
                            key={agent.id}
                            className="ai-elf-action-btn ai-elf-handoff-btn"
                            onClick={() => handoffToAgent(agent.id, msg)}
                            title={`交给${agent.name}继续处理`}
                          >
                            <span>交给</span>
                            <strong>{agent.name.replace(/智能体|Agent/g, '').slice(0, 6)}</strong>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="ai-elf-message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="ai-elf-message assistant">
                  <div className="ai-elf-message-avatar">
                    <img
                      src={activeAgent?.avatar || avatarImage || '/ai-elf-avatar.png'}
                      alt="AI"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  <div className="ai-elf-message-content">
                    <div className="ai-elf-message-loading">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="ai-elf-chat-input-area">
              {quotedContext && (
                <div className="ai-elf-quoted-context">
                  <div className="ai-elf-quoted-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>{quotedContext.title || '引用上下文'}</span>
                  </div>
                  <div className="ai-elf-quoted-content">{quotedContext.content}</div>
                  <button
                    className="ai-elf-quoted-clear"
                    onClick={() => setQuotedContext(null)}
                    title="清除引用"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
              <textarea
                className="ai-elf-chat-input"
                placeholder={quotedContext ? `基于以上情报继续追问...` : `给${activeAgent?.name}下达任务，例如：只解释对我的影响 / 生成选题 / 更新追踪记忆`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
              />
              {missions.length > 0 && !quotedContext && (
                <div className="ai-elf-input-suggestions">
                  {missions.slice(0, 3).map(mission => (
                    <button key={mission.id} onClick={() => runMission(mission)}>
                      {mission.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="ai-elf-send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !inputText.trim()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
