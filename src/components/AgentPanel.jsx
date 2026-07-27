/**
 * AgentPanel - AI 工作站右侧智能管理面板
 *
 * 任务+待办导向的三段式：
 * - 当前任务：活跃会话摘要（消息数/首条问题/耗时）
 * - 待办清单：可手动增删勾选，localStorage 持久化（per-session）
 * - 智能体状态：当前模型、连接状态、本次会话用量估算
 */
import { useMemo, useState, useEffect } from 'react';
import { setLearningEnabled } from '../utils/profileLearning.js';
import { AGENT_TOOL_SCHEMAS, getToolMetaByName } from '../utils/agentTools.js';
import { useAgentSession } from '../hooks/useAgentSession.js';

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

  return (
    <aside className="agent-panel custom-scrollbar">
      {/* 当前任务 */}
      <section className="agent-section">
        <header className="agent-section-head">
          <h3>当前任务</h3>
          {isStreaming && <span className="agent-live-dot" title="生成中">运行中</span>}
        </header>
        <div className="agent-task-card">
          <p className="agent-task-title">{stats.firstQuestion}</p>
          <dl className="agent-task-stats">
            <div><dt>对话轮次</dt><dd>{stats.rounds}</dd></div>
            <div><dt>AI 回复</dt><dd>{stats.aiReplies}</dd></div>
            <div><dt>用量估算</dt><dd>~{stats.estTokens}</dd></div>
            {stats.toolCallTotal > 0 && (
              <div><dt>工具调用</dt><dd>{stats.toolCallTotal}</dd></div>
            )}
          </dl>
        </div>
      </section>

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

      {/* 会话执行计划（Phase 3）：当存在 plan / variables / blackboard 时展示 */}
      {(sessionState.plan.length > 0 || Object.keys(sessionState.variables).length > 0 || Object.keys(sessionState.blackboard).length > 0) && (
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

      {/* 相关记忆 - 跨对话历史，已自动注入上下文 */}
      {relevantMemories.length > 0 && (
        <section className="agent-section">
          <header className="agent-section-head">
            <h3>相关记忆</h3>
            <span className="agent-memory-count" title="已自动注入历史对话结论">{relevantMemories.length}</span>
          </header>
          <div className="agent-memory-list">
            {relevantMemories.map(m => (
              <div key={m.sessionId} className="agent-memory-item" title={`来自会话：${m.title}`}>
                <span className="agent-memory-topic">{m.topic}</span>
                {m.conclusions.map((c, i) => (
                  <span key={i} className="agent-memory-conclusion">{c}</span>
                ))}
                <span className="agent-memory-date">{new Date(m.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 工作空间召回 - 沉淀文件自动检索，可加入上下文 */}
      {recalledFiles.length > 0 && (
        <section className="agent-section">
          <header className="agent-section-head">
            <h3>工作空间召回</h3>
            <span className="agent-memory-count" title="从本地工作空间检索到的相关文件">{recalledFiles.length}</span>
          </header>
          <div className="agent-memory-list">
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

      {/* 学习偏好 - 从交互中自动学习，可关闭 */}
      {learnedPrefs.hasData && (
        <section className="agent-section">
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
          <div className="agent-profile-card">
            {learnedPrefs.frequentTopics?.length > 0 && (
              <div className="agent-profile-row">
                <span className="agent-profile-label">高频</span>
                <div className="agent-profile-tags">
                  {learnedPrefs.frequentTopics.map(t => <span key={t} className="agent-profile-tag learned">{t}</span>)}
                </div>
              </div>
            )}
            {learnedPrefs.preferredFormat && (
              <div className="agent-profile-row">
                <span className="agent-profile-label">格式</span>
                <span className="agent-profile-value">{learnedPrefs.preferredFormat === 'table' ? '表格' : learnedPrefs.preferredFormat === 'list' ? '列表' : '段落'}</span>
              </div>
            )}
            {learnedPrefs.preferredDepth && (
              <div className="agent-profile-row">
                <span className="agent-profile-label">深度</span>
                <span className="agent-profile-value">{learnedPrefs.preferredDepth === 'deep' ? '深入详细' : learnedPrefs.preferredDepth === 'concise' ? '简洁' : '标准'}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 用户画像 - AI 的记忆，可见可控 */}
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

      {/* 智能体状态 */}
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
    </aside>
  );
}
