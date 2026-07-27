/**
 * sessionStore.js - 智能体会话状态管理（方案 C Phase 3）
 *
 * 跨组件、跨渲染保持的会话级状态：
 * - plan:       执行计划（任务列表，支持依赖、状态、状态机）
 * - variables:  变量空间（跨工具调用传递的键值对）
 * - blackboard: 黑板（工具运行时写入的共享状态，供后续工具读取）
 * - history:    执行轨迹（每次工具调用的入参/出参摘要）
 *
 * 设计要点：
 * - 模块级单例 store，避免 React 重渲染丢失状态
 * - 状态按 sessionId 隔离，多个会话独立
 * - 自动持久化到 localStorage 'agentSessionState'（最近 20 个会话）
 * - subscribe 模式让 UI 自动同步
 */

const STORAGE_KEY = 'agentSessionState';
const MAX_SESSIONS = 20;

/**
 * @typedef {Object} PlanTask
 * @property {string} id
 * @property {string} title - 任务标题
 * @property {string} status - pending | running | done | failed | skipped
 * @property {string[]} deps - 依赖的 task id 列表
 * @property {string} [note] - 备注
 * @property {number} [createdAt]
 * @property {number} [updatedAt]
 * @property {string} [toolName] - 关联的工具名
 * @property {string} [result] - 执行结果摘要
 */

/** 创建空会话状态 */
function createEmptySession() {
  return {
    plan: [],
    variables: {},
    blackboard: {},
    history: [],
    updatedAt: Date.now(),
  };
}

/** 从 localStorage 加载 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

const state = {
  sessions: loadFromStorage(), // { [sessionId]: { plan, variables, blackboard, history, updatedAt } }
  activeSessionId: null,
};

const listeners = new Set();

function notify() {
  listeners.forEach(fn => { try { fn(state); } catch { /* ignore */ } });
}

function persist() {
  try {
    // 只保留最近 MAX_SESSIONS 个会话，按 updatedAt 倒序
    const entries = Object.entries(state.sessions)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .slice(0, MAX_SESSIONS);
    const obj = Object.fromEntries(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* QuotaExceededError 等忽略 */ }
}

function ensureSession(sessionId) {
  if (!state.sessions[sessionId]) {
    state.sessions[sessionId] = createEmptySession();
  }
  if (!state.activeSessionId || state.activeSessionId !== sessionId) {
    state.activeSessionId = sessionId;
  }
  return state.sessions[sessionId];
}

function touch(sessionId) {
  const s = state.sessions[sessionId];
  if (s) {
    s.updatedAt = Date.now();
    persist();
  }
}

/* ============ API ============ */

export function getSessionState(sessionId) {
  return state.sessions[sessionId] || createEmptySession();
}

export function getActiveSessionId() {
  return state.activeSessionId;
}

export function setActiveSessionId(id) {
  state.activeSessionId = id;
  ensureSession(id);
  notify();
}

/** 订阅 store 变化 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 切换会话时调用，激活对应的会话状态 */
export function activateSession(sessionId) {
  setActiveSessionId(sessionId);
}

/* ============ Plan 操作 ============ */

/** 设置整个执行计划（替换） */
export function setPlan(sessionId, tasks) {
  const s = ensureSession(sessionId);
  s.plan = (Array.isArray(tasks) ? tasks : []).map(t => ({
    id: t.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(t.title || '未命名任务'),
    status: t.status || 'pending',
    deps: Array.isArray(t.deps) ? t.deps : [],
    note: t.note || '',
    toolName: t.toolName || '',
    result: t.result || '',
    createdAt: t.createdAt || Date.now(),
    updatedAt: Date.now(),
  }));
  touch(sessionId);
  notify();
}

/** 添加一个任务到末尾 */
export function addTask(sessionId, task) {
  const s = ensureSession(sessionId);
  const newTask = {
    id: task.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(task.title || '未命名任务'),
    status: task.status || 'pending',
    deps: Array.isArray(task.deps) ? task.deps : [],
    note: task.note || '',
    toolName: task.toolName || '',
    result: task.result || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  s.plan.push(newTask);
  touch(sessionId);
  notify();
  return newTask.id;
}

/** 更新单个任务 */
export function updateTask(sessionId, taskId, patch) {
  const s = ensureSession(sessionId);
  const task = s.plan.find(t => t.id === taskId);
  if (!task) return false;
  Object.assign(task, patch, { updatedAt: Date.now() });
  touch(sessionId);
  notify();
  return true;
}

/** 删除任务 */
export function removeTask(sessionId, taskId) {
  const s = ensureSession(sessionId);
  const before = s.plan.length;
  s.plan = s.plan.filter(t => t.id !== taskId);
  // 同时清理其他任务的 deps 引用
  s.plan.forEach(t => { t.deps = (t.deps || []).filter(d => d !== taskId); });
  if (s.plan.length !== before) {
    touch(sessionId);
    notify();
  }
  return s.plan.length !== before;
}

/** 清空整个计划 */
export function clearPlan(sessionId) {
  const s = ensureSession(sessionId);
  s.plan = [];
  touch(sessionId);
  notify();
}

/* ============ Variables 操作 ============ */

export function setVariable(sessionId, key, value) {
  const s = ensureSession(sessionId);
  s.variables[key] = value;
  touch(sessionId);
  notify();
}

export function setVariables(sessionId, obj) {
  const s = ensureSession(sessionId);
  Object.assign(s.variables, obj || {});
  touch(sessionId);
  notify();
}

export function getVariable(sessionId, key) {
  const s = state.sessions[sessionId];
  return s ? s.variables[key] : undefined;
}

export function getVariables(sessionId) {
  const s = state.sessions[sessionId];
  return s ? { ...s.variables } : {};
}

export function deleteVariable(sessionId, key) {
  const s = ensureSession(sessionId);
  if (key in s.variables) {
    delete s.variables[key];
    touch(sessionId);
    notify();
  }
}

/* ============ Blackboard 操作 ============ */

export function writeBlackboard(sessionId, key, value) {
  const s = ensureSession(sessionId);
  s.blackboard[key] = { value, updatedAt: Date.now() };
  touch(sessionId);
  notify();
}

export function readBlackboard(sessionId, key) {
  const s = state.sessions[sessionId];
  return s?.blackboard[key]?.value;
}

export function getBlackboard(sessionId) {
  const s = state.sessions[sessionId];
  return s ? { ...s.blackboard } : {};
}

export function clearBlackboard(sessionId) {
  const s = ensureSession(sessionId);
  s.blackboard = {};
  touch(sessionId);
  notify();
}

/* ============ History 操作（工具调用轨迹） ============ */

/** 追加一次工具调用记录 */
export function appendHistory(sessionId, entry) {
  const s = ensureSession(sessionId);
  s.history.push({
    id: entry.id || `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    toolName: entry.toolName || '',
    args: entry.args || {},
    result: entry.result || '',
    status: entry.status || 'done',
    timestamp: entry.timestamp || Date.now(),
  });
  // 限制历史长度，最多 50 条
  if (s.history.length > 50) {
    s.history = s.history.slice(-50);
  }
  touch(sessionId);
  notify();
}

export function getHistory(sessionId) {
  const s = state.sessions[sessionId];
  return s ? [...s.history] : [];
}

/** 获取最近一次工具调用结果（便于 LLM 接力推理） */
export function getLastToolResult(sessionId) {
  const s = state.sessions[sessionId];
  if (!s || !s.history.length) return null;
  return s.history[s.history.length - 1];
}

/* ============ 综合操作 ============ */

/** 重置整个会话状态（不清 history） */
export function resetSession(sessionId, keepHistory = false) {
  const s = ensureSession(sessionId);
  const history = keepHistory ? s.history : [];
  state.sessions[sessionId] = { ...createEmptySession(), history };
  touch(sessionId);
  notify();
}

/** 完全删除会话状态 */
export function deleteSession(sessionId) {
  delete state.sessions[sessionId];
  persist();
  notify();
}

/** 导出会话状态（用于调试 / 备份） */
export function exportSession(sessionId) {
  const s = state.sessions[sessionId];
  return s ? JSON.parse(JSON.stringify(s)) : null;
}

/** 把当前会话的 plan / variables / blackboard 摘要成文本（用于注入 LLM context） */
export function buildSessionContextText(sessionId) {
  const s = state.sessions[sessionId];
  if (!s) return '';
  const lines = [];
  if (s.plan.length > 0) {
    lines.push('【执行计划】');
    s.plan.forEach((t, i) => {
      const statusIcon = { pending: '⏳', running: '▶️', done: '✅', failed: '❌', skipped: '⏭️' }[t.status] || '❓';
      const deps = t.deps?.length ? ` (依赖: ${t.deps.join(', ')})` : '';
      lines.push(`  ${i + 1}. ${statusIcon} ${t.title}${deps}${t.result ? ` → ${t.result}` : ''}`);
    });
  }
  if (Object.keys(s.variables || {}).length > 0) {
    lines.push('【变量空间】');
    Object.entries(s.variables).forEach(([k, v]) => {
      const vStr = typeof v === 'string' ? v : JSON.stringify(v);
      lines.push(`  - ${k}: ${String(vStr).slice(0, 200)}`);
    });
  }
  if (Object.keys(s.blackboard || {}).length > 0) {
    lines.push('【黑板（工具产出共享）】');
    Object.entries(s.blackboard).forEach(([k, entry]) => {
      const vStr = typeof entry?.value === 'string' ? entry.value : JSON.stringify(entry?.value);
      lines.push(`  - ${k}: ${String(vStr).slice(0, 200)}`);
    });
  }
  if (s.history?.length > 0) {
    lines.push(`【最近调用】（共 ${s.history.length} 次）`);
    s.history.slice(-3).forEach(h => {
      const argStr = JSON.stringify(h.args).slice(0, 100);
      const resStr = String(h.result || '').slice(0, 100);
      lines.push(`  - ${h.toolName}(${argStr}) → ${resStr}`);
    });
  }
  return lines.join('\n');
}
