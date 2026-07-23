/**
 * AgentPanel - AI 工作站右侧智能管理面板
 *
 * 任务+待办导向的三段式：
 * - 当前任务：活跃会话摘要（消息数/首条问题/耗时）
 * - 待办清单：可手动增删勾选，localStorage 持久化（per-session）
 * - 智能体状态：当前模型、连接状态、本次会话用量估算
 */
import { useMemo, useState, useEffect } from 'react';

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
}) {
  const [todos, setTodos] = useState(() => loadTodos(activeSessionId));
  const [todoInput, setTodoInput] = useState('');

  // 切换会话时重新加载待办
  useEffect(() => {
    setTodos(loadTodos(activeSessionId));
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    try { localStorage.setItem(todosKey(activeSessionId), JSON.stringify(todos)); } catch {}
  }, [todos, activeSessionId]);

  const stats = useMemo(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    const aiMsgs = messages.filter(m => m.role === 'assistant' && !m.error);
    const charCount = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const firstQuestion = userMsgs[0]?.content?.slice(0, 60) || '—';
    return {
      total: messages.length,
      rounds: userMsgs.length,
      aiReplies: aiMsgs.length,
      firstQuestion,
      estTokens: Math.ceil(charCount / 2.5),
    };
  }, [messages]);

  const hasConfig = Boolean(llmConfig?.baseUrl && selectedModel);

  const addTodo = () => {
    const text = todoInput.trim();
    if (!text) return;
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
    setTodoInput('');
  };
  const toggleTodo = id => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTodo = id => setTodos(prev => prev.filter(t => t.id !== id));

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
          </dl>
        </div>
      </section>

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
          {todos.length === 0 && <li className="agent-todo-empty">暂无待办，可记录本次对话衍生的行动项</li>}
          {todos.map(t => (
            <li key={t.id} className={`agent-todo-item ${t.done ? 'done' : ''}`}>
              <button type="button" className="agent-todo-check" onClick={() => toggleTodo(t.id)} title={t.done ? '标记未完成' : '标记完成'}>
                {t.done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <span className="agent-todo-text">{t.text}</span>
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
