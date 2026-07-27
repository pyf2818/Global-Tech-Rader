/**
 * useAgentSession - 会话状态与执行计划的 React 包装器
 *
 * 方案 C Phase 3：让组件能订阅 sessionStore 中的会话状态，
 * 在 AiChatPanel / AiElf / AgentPanel 中展示执行计划与变量空间。
 *
 * 设计要点：
 * - 输入 sessionId（来自 aiCopilotSessions 或 elfSessions），自动激活
 * - 返回响应式的 plan/variables/blackboard/history（在 store 变化时自动更新）
 * - 返回 actions，所有 actions 已绑定到当前 sessionId
 * - 组件 unmount 后状态不丢失（store 持久化 + 自动同步）
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  subscribe, getSessionState, activateSession,
  setPlan as _setPlan, addTask as _addTask, updateTask as _updateTask,
  removeTask as _removeTask, clearPlan as _clearPlan,
  setVariable as _setVariable, setVariables as _setVariables,
  deleteVariable as _deleteVariable,
  writeBlackboard as _writeBlackboard, clearBlackboard as _clearBlackboard,
  appendHistory as _appendHistory, resetSession as _resetSession,
} from '../utils/sessionStore.js';

export function useAgentSession(sessionId) {
  // 订阅 store 变化
  const [snapshot, setSnapshot] = useState(() => getSessionState(sessionId));
  useEffect(() => subscribe(() => setSnapshot({ ...getSessionState(sessionId) })), []);
  // 切换会话时自动激活
  useEffect(() => {
    if (sessionId) {
      activateSession(sessionId);
      setSnapshot({ ...getSessionState(sessionId) });
    }
  }, [sessionId]);

  // 绑定 sessionId 的 actions
  const actions = useMemo(() => ({
    setPlan: (tasks) => _setPlan(sessionId, tasks),
    addTask: (task) => _addTask(sessionId, task),
    updateTask: (taskId, patch) => _updateTask(sessionId, taskId, patch),
    removeTask: (taskId) => _removeTask(sessionId, taskId),
    clearPlan: () => _clearPlan(sessionId),
    setVariable: (key, value) => _setVariable(sessionId, key, value),
    setVariables: (obj) => _setVariables(sessionId, obj),
    deleteVariable: (key) => _deleteVariable(sessionId, key),
    writeBlackboard: (key, value) => _writeBlackboard(sessionId, key, value),
    clearBlackboard: () => _clearBlackboard(sessionId),
    appendHistory: (entry) => _appendHistory(sessionId, entry),
    reset: (keepHistory = false) => _resetSession(sessionId, keepHistory),
  }), [sessionId]);

  return {
    plan: snapshot.plan || [],
    variables: snapshot.variables || {},
    blackboard: snapshot.blackboard || {},
    history: snapshot.history || [],
    updatedAt: snapshot.updatedAt || 0,
    actions,
  };
}

/** 把 plan 状态字符串映射为图标 */
export const TASK_STATUS_ICON = {
  pending: '⏳',
  running: '▶️',
  done: '✅',
  failed: '❌',
  skipped: '⏭️',
};

/** 状态机：定义合法的状态转换 */
export const TASK_TRANSITIONS = {
  pending: ['running', 'skipped'],
  running: ['done', 'failed'],
  done: [],
  failed: ['pending'],
  skipped: ['pending'],
};

/** 检查任务是否可执行（依赖全部 done） */
export function canRunTask(plan, taskId) {
  const task = plan.find(t => t.id === taskId);
  if (!task) return false;
  if (task.status !== 'pending') return false;
  return (task.deps || []).every(depId => {
    const dep = plan.find(t => t.id === depId);
    return dep && dep.status === 'done';
  });
}
