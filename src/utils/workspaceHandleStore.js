/**
 * workspaceHandleStore - 模块级工作空间 rootHandle 共享 store
 *
 * WorkspacePanel 在 rootHandle 变化时调用 setRootHandle，
 * AiChatPanel 在 agent loop 执行工具时通过 getRootHandle 读取，
 * 避免在组件树中层层透传 prop。
 */

let currentHandle = null;
const listeners = new Set();

export function getRootHandle() {
  return currentHandle;
}

export function setRootHandle(handle) {
  currentHandle = handle || null;
  listeners.forEach(fn => {
    try { fn(currentHandle); } catch { /* ignore */ }
  });
}

export function subscribeWorkspaceHandle(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
