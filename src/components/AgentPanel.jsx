/**
 * AgentPanel - AI 工作站右侧智能管理面板
 *
 * 三层布局（方案 C）：
 * 1. 顶部固定卡：当前任务 + 智能体状态（运行时高频，永远可见）
 * 2. 中部 Tab 区：任务｜智能体｜记忆（按需切换，避免堆砌）
 *    - 任务 tab：待办清单（移到此处，不再 sticky 底部）+ 执行计划（仅 agent loop 模式）
 *    - 智能体 tab：工具能力 + 定时任务 + 用户画像（平台主体依据）
 *    - 记忆 tab：上下文召回（相关记忆 + 工作空间文件，合并）+ 学习偏好（基于对话总结的习惯）
 * 3. 无底部 sticky：待办已在「任务」tab 内常驻
 *
 * 角色/灵魂设定入口已移至 chat-header 的 PersonaDrawer，本面板不承载
 */
import { useMemo, useState, useEffect } from 'react';
import { setLearningEnabled } from '../utils/profileLearning.js';
import { AGENT_TOOL_SCHEMAS, getToolMetaByName } from '../utils/agentTools.js';
import { useAgentSession } from '../hooks/useAgentSession.js';
import AgentJobsSection from './agent/AgentJobsSection.jsx';

/* 工具元信息：从 toolRegistry 派生，无法找到时使用 fallback */
function getToolDisplay(name) {
  const meta = getToolMetaByName(name);
  return { label: meta?.label || name, icon: meta?.icon || '⚙️' };
}

function todosKey(sessionId) { return `aiTodos_${sessionId || 'default'}`; }

function loadTodos(sessionId) {
  if (!sessionId) return [];
  try {
    const raw = localStorage.getItem(todosKey(sessionId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/* Tab 配置：图标 + label + 可见的 badge 计算 */
const TABS = [
  { id: 'task', label: '任务', icon: '✓' },
  { id: 'agent', label: '智能体', icon: '⚙' },
  { id: 'memory', label: '记忆', icon: '✨' },
];


export default function AgentPanel({
  messages = [],
  activeSessionId,
  llmConfig,
  selectedModel,
  isStreaming,
  intelligenceProfile,
  relevantMemories = [],
  recalledFiles = [],
  onAddContextFiles,
  learnedPrefs = {},
  autoTodos = [],
  agent,
}) {
  const [manualTodos, setManualTodos] = useState(() => loadTodos(activeSessionId));
  const [todoInput, setTodoInput] = useState('');
  const [activeTab, setActiveTab] = useState('task'); // task | agent | memory

  // 订阅会话状态（执行计划 / 变量 / 黑板），仅展示
  const sessionState = useAgentSession(activeSessionId);

  // 切换会话时重新加载手动待办
  useEffect(() => {
    setManualTodos(loadTodos(activeSessionId));
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    try { localStorage.setItem(todosKey(activeSessionId), JSON.stringify(manualTodos)); } catch {}
  }, [manualTodos, activeSessionId]);

  // 合并待办：自动提取的 + 手动添加的（去重）
  const todos = useMemo(() => {
    const seen = new Set();
    const merged = [];
    for (const t of autoTodos) {
      if (!seen.has(t.text)) { seen.add(t.text); merged.push({ ...t, id: `auto_${t.text.slice(0, 12)}` }); }
    }
    for (const t of manualTodos) {
      if (!seen.has(t.text)) { seen.add(t.text); merged.push(t); }
    }
    return merged;
  }, [autoTodos, manualTodos]);

  const stats = useMemo(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    const aiMsgs = messages.filter(m => m.role === 'assistant' && !m.error);
    const charCount = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const firstQuestion = userMsgs[0]?.content?.slice(0, 60) || '—';
    // 统计本次会话的工具调用次数（来自 assistant 消息的 toolCalls 字段）
    const toolCallTotal = messages.reduce((sum, m) => sum + (Array.isArray(m.toolCalls) ? m.toolCalls.length : 0), 0);
    return {
      total: messages.length,
      rounds: userMsgs.length,
      aiReplies: aiMsgs.length,
      firstQuestion,
      estTokens: Math.ceil(charCount / 2.5),
      toolCallTotal,
    };
  }, [messages]);

  const hasConfig = Boolean(llmConfig?.baseUrl && selectedModel);

  // 当前 agent 的工具能力清单（用于右栏展示）
  const agentTools = useMemo(() => {
    const names = Array.isArray(agent?.tools) ? agent.tools : [];
    if (names.length === 0) return [];
    return names
      .map(name => {
        const schema = AGENT_TOOL_SCHEMAS.find(s => s.function.name === name);
        const display = getToolDisplay(name);
        return schema ? { name, label: display.label, icon: display.icon, desc: schema.function.description || '' } : null;
      })
      .filter(Boolean);
  }, [agent]);

  // agent loop 模式：plan/variables/blackboard 任一有内容则视为活跃
  const hasSessionState = sessionState.plan.length > 0
    || Object.keys(sessionState.variables).length > 0
    || Object.keys(sessionState.blackboard).length > 0;

  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    setManualTodos(prev => [...prev, { id: Date.now(), text, done: false, source: 'manual' }]);
    setTodoInput('');
  };
  const toggleTodo = id => {
    // auto 待办切换时自动转为手动持久化
    setManualTodos(prev => {
      const existing = prev.find(t => t.id === id);
      if (existing) return prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      const autoItem = todos.find(t => t.id === id);
      if (autoItem) return [...prev, { ...autoItem, id: Date.now(), done: true, source: 'manual' }];
      return prev;
    });
  };
  const removeTodo = id => setManualTodos(prev => prev.filter(t => t.id !== id));
  const adoptTodo = id => {
    const autoItem = todos.find(t => t.id === id);
    if (autoItem) setManualTodos(prev => [...prev, { ...autoItem, id: Date.now(), source: 'manual' }]);
  };

  const pendingCount = todos.filter(t => !t.done).length;

  // 各 tab 的 badge 计算（用于 tab 标题右上角小红点）
  const tabBadges = useMemo(() => ({
    task: pendingCount,
    agent: 0, // 智能体配置类，无未读概念
    memory: relevantMemories.length + recalledFiles.length,
  }), [pendingCount, relevantMemories.length, recalledFiles.length]);

  // 自动切换 tab 的策略：agent loop 启动时切到「任务」tab（让用户看到执行计划展开）
  useEffect(() => {
    if (hasSessionState && activeTab !== 'task') setActiveTab('task');
  }, [hasSessionState]);

  return (
    <aside className="agent-panel custom-scrollbar">
      {/* ============ 顶部固定卡：当前任务 + 智能体状态合并（永远可见） ============ */}
      <div className="agent-topcard">
        <div className="agent-topcard-head">
          <span className="agent-topcard-label">当前任务</span>
          {isStreaming && <span className="agent-live-dot" title="生成中">运行中</span>}
        </div>
        <p className="agent-topcard-title" title={stats.firstQuestion}>{stats.firstQuestion}</p>
        <div className="agent-topcard-stats">
          <div className="agent-topcard-stat" title="对话轮次">
            <span className="agent-topcard-stat-value">{stats.rounds}</span>
            <span className="agent-topcard-stat-label">轮次</span>
          </div>
          <div className="agent-topcard-stat" title="AI 回复数">
            <span className="agent-topcard-stat-value">{stats.aiReplies}</span>
            <span className="agent-topcard-stat-label">回复</span>
          </div>
          {stats.toolCallTotal > 0 && (
            <div className="agent-topcard-stat" title="工具调用次数">
              <span className="agent-topcard-stat-value">{stats.toolCallTotal}</span>
              <span className="agent-topcard-stat-label">工具</span>
            </div>
          )}
          <div className="agent-topcard-stat" title="估算 token 用量">
            <span className="agent-topcard-stat-value">~{stats.estTokens}</span>
            <span className="agent-topcard-stat-label">tokens</span>
          </div>
          <div className="agent-topcard-stat agent-topcard-stat-status" title="模型与连接状态">
            <span className={`agent-status-led ${hasConfig ? 'ok' : 'warn'}`} />
            <span className="agent-topcard-stat-label">{selectedModel ? selectedModel.split('/').pop() : '未配置'}</span>
          </div>
        </div>
      </div>

      {/* ============ Tab 导航 ============ */}
      <nav className="agent-tabs" role="tablist">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const badge = tabBadges[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`agent-tab${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span className="agent-tab-icon">{tab.icon}</span>
              <span className="agent-tab-label">{tab.label}</span>
              {badge > 0 && <span className="agent-tab-badge">{badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* ============ Tab 内容区 ============ */}
      <div className="agent-tab-panes custom-scrollbar">
        {/* ---------- 任务 tab ---------- */}
        {activeTab === 'task' && (
          <div className="agent-tab-pane" role="tabpanel">
            {/* 执行计划：仅 agent loop 模式有内容时显示 */}
            {hasSessionState && (
              <section className="agent-section">
                <header className="agent-section-head">
                  <h3>执行计划</h3>
                  {sessionState.plan.length > 0 && (
                    <span className="agent-badge">
                      {sessionState.plan.filter(t => t.status === 'done').length}/{sessionState.plan.length}
                    </span>
                  )}
                </header>
                <div className="session-state-panel">
                  {sessionState.plan.length > 0 && (
                    <ol className="session-plan-list">
                      {sessionState.plan.map(t => {
                        const icon = { pending: '⏳', running: '▶️', done: '✅', failed: '❌', skipped: '⏭️' }[t.status] || '❓';
                        return (
                          <li key={t.id} className={`session-plan-item is-${t.status}`}>
                            <span className="session-plan-icon">{icon}</span>
                            <div className="session-plan-text">
                              <div className="session-plan-title">{t.title}</div>
                              {t.result && <div className="session-plan-result">{t.result}</div>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {Object.keys(sessionState.variables).length > 0 && (
                    <div className="session-variables">
                      <div className="session-state-label">变量空间</div>
                      <ul className="session-variable-list">
                        {Object.entries(sessionState.variables).slice(0, 10).map(([k, v]) => (
                          <li key={k} className="session-variable-item">
                            <span className="session-variable-key">{k}</span>
                            <span className="session-variable-value">{typeof v === 'string' ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Object.keys(sessionState.blackboard).length > 0 && (
                    <div className="session-blackboard">
                      <div className="session-state-label">黑板（工具产出共享）</div>
                      <ul className="session-variable-list">
                        {Object.entries(sessionState.blackboard).slice(0, 10).map(([k, entry]) => (
                          <li key={k} className="session-variable-item">
                            <span className="session-variable-key">{k}</span>
                            <span className="session-variable-value">
                              {typeof entry?.value === 'string' ? entry.value.slice(0, 80) : JSON.stringify(entry?.value).slice(0, 80)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sessionState.history.length > 0 && (
                    <div className="session-history">
                      <div className="session-state-label">最近工具调用（{sessionState.history.length}）</div>
                      <ul className="session-history-list">
                        {sessionState.history.slice(-3).reverse().map(h => (
                          <li key={h.id} className="session-history-item">
                            <span className="session-history-tool">{h.toolName}</span>
                            <span className="session-history-status">{h.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 待办清单 */}
            <section className="agent-section">
              <header className="agent-section-head">
                <h3>待办清单</h3>
                {pendingCount > 0 && <span className="agent-badge">{pendingCount}</span>}
              </header>
              <div className="agent-todo-input-row">
                <input
                  className="agent-todo-input"
                  value={todoInput}
                  onChange={e => setTodoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                  placeholder="添加待办..."
                />
                <button type="button" className="agent-todo-add" onClick={addTodo}>+</button>
              </div>
              <ul className="agent-todo-list">
                {todos.length === 0 && <li className="agent-todo-empty">对话中 AI 提出的行动项会自动出现在这里，也可手动添加</li>}
                {todos.map(t => (
                  <li key={t.id} className={`agent-todo-item ${t.done ? 'done' : ''} ${t.source === 'auto' ? 'auto' : ''}`}>
                    <button type="button" className="agent-todo-check" onClick={() => toggleTodo(t.id)} title={t.done ? '标记未完成' : '标记完成'}>
                      {t.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <span className="agent-todo-text">{t.text}</span>
                    {t.source === 'auto' && !t.done && (
                      <button type="button" className="agent-todo-adopt" onClick={() => adoptTodo(t.id)} title="采纳为我的待办">采纳</button>
                    )}
                    <button type="button" className="agent-todo-del" onClick={() => removeTodo(t.id)} title="删除">×</button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ---------- 智能体 tab ---------- */}
        {activeTab === 'agent' && (
          <div className="agent-tab-pane" role="tabpanel">
            {/* Agent 工具能力：当智能体配置了 tools 白名单时展示 */}
            {agentTools.length > 0 && (
              <section className="agent-section">
                <header className="agent-section-head">
                  <h3>工具能力</h3>
                  <span className="agent-badge agent-badge-tool">{agentTools.length}</span>
                </header>
                <div className="agent-capabilities">
                  {agentTools.map(t => (
                    <div key={t.name} className="agent-capability-chip" title={t.desc}>
                      <span className="agent-capability-icon">{t.icon}</span>
                      <span className="agent-capability-name">{t.label}</span>
                    </div>
                  ))}
                  <p className="agent-capabilities-hint">
                    该智能体走 Agent Loop 模式：可主动调用工具并基于返回结果继续推理。
                  </p>
                </div>
              </section>
            )}

            {/* 定时任务：cron 触发的 agent 任务，跨会话持久化在服务端 */}
            <AgentJobsSection agent={agent} />

            {/* 用户画像：平台主体依据 */}
            {intelligenceProfile && (
              <section className="agent-section">
                <header className="agent-section-head">
                  <h3>用户画像</h3>
                  <span className="agent-profile-confidence" title="画像置信度">{intelligenceProfile.confidence || 0}%</span>
                </header>
                <div className="agent-profile-card">
                  {intelligenceProfile.focusLabels?.length > 0 && (
                    <div className="agent-profile-row">
                      <span className="agent-profile-label">关注</span>
                      <div className="agent-profile-tags">
                        {intelligenceProfile.focusLabels.map(l => <span key={l} className="agent-profile-tag">{l}</span>)}
                      </div>
                    </div>
                  )}
                  {intelligenceProfile.tracked?.length > 0 && (
                    <div className="agent-profile-row">
                      <span className="agent-profile-label">追踪</span>
                      <div className="agent-profile-tags">
                        {intelligenceProfile.tracked.map(t => <span key={t} className="agent-profile-tag tracked">{t}</span>)}
                      </div>
                    </div>
                  )}
                  <div className="agent-profile-row">
                    <span className="agent-profile-label">深度</span>
                    <span className="agent-profile-value">{intelligenceProfile.depth || 'standard'}</span>
                  </div>
                  <div className="agent-profile-row">
                    <span className="agent-profile-label">目标</span>
                    <span className="agent-profile-value">{intelligenceProfile.outputGoal || 'daily briefing'}</span>
                  </div>
                  {intelligenceProfile.muted?.length > 0 && (
                    <div className="agent-profile-row">
                      <span className="agent-profile-label">降权</span>
                      <span className="agent-profile-value muted">{intelligenceProfile.muted.join('、')}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 智能体状态：在智能体 tab 内更详细展示 */}
            <section className="agent-section">
              <header className="agent-section-head"><h3>智能体状态</h3></header>
              <div className="agent-status-card">
                <div className="agent-status-row">
                  <span className="agent-status-label">当前模型</span>
                  <span className="agent-status-value">{selectedModel || '未选择'}</span>
                </div>
                <div className="agent-status-row">
                  <span className="agent-status-label">连接状态</span>
                  <span className={`agent-status-value agent-status-pill ${hasConfig ? 'ok' : 'warn'}`}>
                    <span className="agent-status-led" />
                    {hasConfig ? '已连接' : '未配置'}
                  </span>
                </div>
                <div className="agent-status-row">
                  <span className="agent-status-label">运行状态</span>
                  <span className={`agent-status-value agent-status-pill ${isStreaming ? 'run' : 'idle'}`}>
                    <span className="agent-status-led" />
                    {isStreaming ? '生成中' : '空闲'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ---------- 记忆 tab ---------- */}
        {activeTab === 'memory' && (
          <div className="agent-tab-pane" role="tabpanel">
            {/* 上下文召回：相关记忆 + 工作空间文件 合并展示 */}
            {(relevantMemories.length > 0 || recalledFiles.length > 0) && (
              <section className="agent-section">
                <header className="agent-section-head">
                  <h3>上下文召回</h3>
                  <span className="agent-memory-count" title="已自动注入上下文">
                    {relevantMemories.length + recalledFiles.length}
                  </span>
                </header>
                <div className="agent-memory-list">
                  {relevantMemories.map(m => (
                    <div key={m.sessionId} className="agent-memory-item" title={`来自会话：${m.title}`}>
                      <span className="agent-memory-topic">💭 {m.topic}</span>
                      {m.conclusions.map((c, i) => (
                        <span key={i} className="agent-memory-conclusion">{c}</span>
                      ))}
                      <span className="agent-memory-date">{new Date(m.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ))}
                  {recalledFiles.map(f => (
                    <div key={f.path} className="agent-recall-item" title={f.path}>
                      <span className="agent-recall-name">📄 {f.name}</span>
                      <button
                        type="button"
                        className="agent-recall-add"
                        onClick={() => onAddContextFiles?.([{ name: f.name, path: f.path, content: f.content }])}
                        title="加入上下文"
                      >加入</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 学习偏好：基于对话总结出的用户习惯（11 维度动态展示） */}
            {learnedPrefs.hasData && (
              <section className="agent-section agent-learn-section">
                <header className="agent-section-head">
                  <h3>学习偏好</h3>
                  <label className="agent-learn-toggle" title="自动学习开关">
                    <input
                      type="checkbox"
                      checked={learnedPrefs.learningEnabled !== false}
                      onChange={e => setLearningEnabled(e.target.checked)}
                    />
                    <span>自动学习</span>
                  </label>
                </header>
                <div className="agent-insights">
                  {(() => {
                    const ins = learnedPrefs.insights || {};
                    const rows = [];
                    // 兴趣领域（按观测次数排序的标签云）
                    if (ins.domains?.length > 0) {
                      rows.push(
                        <div key="domains" className="agent-insight-row">
                          <span className="agent-insight-label">兴趣领域</span>
                          <div className="agent-insight-tags">
                            {ins.domains.map(d => (
                              <span key={d.key} className="agent-insight-tag" title={`观测 ${d.count} 次`}>
                                {d.label} <em>×{d.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 提问模式
                    if (ins.patterns?.length > 0) {
                      rows.push(
                        <div key="patterns" className="agent-insight-row">
                          <span className="agent-insight-label">提问模式</span>
                          <div className="agent-insight-tags">
                            {ins.patterns.map(p => (
                              <span key={p.key} className="agent-insight-tag" title={`观测 ${p.count} 次`}>
                                {p.label} <em>×{p.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 高频主题（带权重）
                    if (ins.topics?.length > 0) {
                      rows.push(
                        <div key="topics" className="agent-insight-row">
                          <span className="agent-insight-label">高频主题</span>
                          <div className="agent-insight-tags">
                            {ins.topics.map(t => (
                              <span key={t.key} className="agent-insight-tag" title={`count=${t.count}, weight=${t.weight}`}>
                                {t.key} <em>·{t.weight}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 最近关注实体（短期记忆）
                    if (ins.recentEntities?.length > 0) {
                      rows.push(
                        <div key="entities" className="agent-insight-row">
                          <span className="agent-insight-label">最近关注</span>
                          <div className="agent-insight-tags">
                            {ins.recentEntities.map(e => (
                              <span key={e.entity} className="agent-insight-tag entity" title={`提及 ${e.count} 次`}>
                                {e.entity} <em>×{e.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 偏好汇总：格式/深度/长度/语言
                    const prefs = [];
                    if (ins.format) prefs.push(<span key="fmt" className="agent-insight-mini">{ins.format.label}</span>);
                    if (ins.depth) prefs.push(<span key="depth" className="agent-insight-mini">{ins.depth.label}</span>);
                    if (ins.length) prefs.push(<span key="len" className="agent-insight-mini">{ins.length.label}</span>);
                    if (ins.language) prefs.push(<span key="lang" className="agent-insight-mini">{ins.language.label}</span>);
                    if (prefs.length > 0) {
                      rows.push(
                        <div key="prefs" className="agent-insight-row">
                          <span className="agent-insight-label">回复偏好</span>
                          <div className="agent-insight-prefs">{prefs}</div>
                        </div>
                      );
                    }
                    // 时段偏好
                    if (ins.time?.length > 0) {
                      rows.push(
                        <div key="time" className="agent-insight-row">
                          <span className="agent-insight-label">活跃时段</span>
                          <div className="agent-insight-tags">
                            {ins.time.map(t => (
                              <span key={t.key} className="agent-insight-tag" title={`${t.count} 次提问`}>
                                {t.label} <em>×{t.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 工具偏好
                    if (ins.tools?.length > 0) {
                      rows.push(
                        <div key="tools" className="agent-insight-row">
                          <span className="agent-insight-label">常用工具</span>
                          <div className="agent-insight-tags">
                            {ins.tools.map(t => (
                              <span key={t.key} className="agent-insight-tag tool" title={`调用 ${t.count} 次`}>
                                {t.key} <em>×{t.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 负面反馈信号
                    if (ins.negatives?.length > 0) {
                      rows.push(
                        <div key="neg" className="agent-insight-row agent-insight-row-neg">
                          <span className="agent-insight-label">反馈信号</span>
                          <div className="agent-insight-tags">
                            {ins.negatives.map(n => (
                              <span key={n.pattern} className="agent-insight-tag negative" title={`${n.count} 次表达`}>
                                {n.pattern} <em>×{n.count}</em>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    // 会话统计
                    if (ins.sessionStats?.totalSessions > 0) {
                      const s = ins.sessionStats;
                      rows.push(
                        <div key="stats" className="agent-insight-row">
                          <span className="agent-insight-label">会话统计</span>
                          <div className="agent-insight-prefs">
                            <span className="agent-insight-mini" title="总会话数">{s.totalSessions} 次会话</span>
                            <span className="agent-insight-mini" title="平均轮次">平均 {s.avgRounds} 轮</span>
                            {s.maxRounds > 0 && <span className="agent-insight-mini" title="最长会话">最长 {s.maxRounds} 轮</span>}
                          </div>
                        </div>
                      );
                    }
                    return rows;
                  })()}
                </div>
                {learnedPrefs.updatedAt > 0 && (
                  <div className="agent-learn-updated">
                    最后学习：{new Date(learnedPrefs.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </section>
            )}

            {/* 空状态 */}
            {relevantMemories.length === 0 && recalledFiles.length === 0 && !learnedPrefs.hasData && (
              <div className="agent-tab-empty">
                <div className="agent-tab-empty-icon">✨</div>
                <div className="agent-tab-empty-text">
                  还没有记忆数据。<br />
                  随着你与智能体对话，它会自动总结你的习惯、想法、需求并保留在这里，越来越懂你。
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
