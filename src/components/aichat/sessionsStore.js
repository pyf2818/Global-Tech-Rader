function loadSessions() {
  try {
    const raw = localStorage.getItem('aiCopilotSessions');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions) {
  try { localStorage.setItem('aiCopilotSessions', JSON.stringify(sessions)); } catch {}
}

// ===== 模块级 sessions store：组件 unmount 后流式 fetch 继续，重新 mount 从 store 恢复 =====
const sessionsStore = {
  state: {
    sessions: loadSessions(),
    activeSessionId: null,
    isStreaming: false,
  },
  subscribers: new Set(),
  subscribe(fn) { this.subscribers.add(fn); return () => this.subscribers.delete(fn); },
  notify() { this.subscribers.forEach(fn => fn(this.state)); },
  setState(patch) {
    this.state = { ...this.state, ...patch };
    // sessions 变化时持续写回 localStorage（即使组件已卸载）
    if (patch.sessions !== undefined) saveSessions(patch.sessions);
    this.notify();
  },
};

export { loadSessions, saveSessions, sessionsStore };
