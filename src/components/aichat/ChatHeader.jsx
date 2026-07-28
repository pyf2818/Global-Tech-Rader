// AiChatPanel 头部：logo + 标题 + 三按钮（折叠会话栏 / 角色设定 / 配置模型）
// 从 src/components/AiChatPanel.jsx 抽离，纯展示组件

export default function ChatHeader({
  variant,
  sessionCollapsed,
  setSessionCollapsed,
  agent,
  setShowPersonaDrawer,
  onOpenLlmConfig,
}) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-logo">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--accent-cyan)" strokeWidth="2" opacity="0.3"/>
            <path d="M14 24C14 18.477 18.477 14 24 14V14C29.523 14 34 18.477 34 24V24C34 29.523 29.523 34 24 34V34C18.477 34 14 29.523 14 24V24Z" stroke="var(--accent-cyan)" strokeWidth="1.5" opacity="0.6"/>
            <circle cx="24" cy="24" r="8" fill="var(--accent-cyan)" opacity="0.15"/>
            <path d="M20 22C20 22 22 18 24 18C26 18 28 22 28 22" stroke="var(--accent-cyan)" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="21" cy="24" r="1.2" fill="var(--accent-cyan)"/>
            <circle cx="27" cy="24" r="1.2" fill="var(--accent-cyan)"/>
            <path d="M22 27C22 27 23 28 24 28C25 28 26 27 26 27" stroke="var(--accent-cyan)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="chat-header-titles">
          <span className="chat-header-title">SiliconStream 智能体</span>
          <span className="chat-header-sub">对话 · 剖析 · 研判</span>
        </div>
      </div>
      <div className="chat-header-actions">
        {variant === 'main' && (
          <button className="chat-header-btn" onClick={() => setSessionCollapsed(v => !v)} title={sessionCollapsed ? '展开会话栏' : '收起会话栏'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        )}
        <button
          className="chat-header-btn chat-header-persona-btn"
          onClick={() => setShowPersonaDrawer(true)}
          title={`角色设定${agent ? `：${agent.name}` : ''}`}
          disabled={!agent}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
        <button className="chat-header-btn" onClick={onOpenLlmConfig} title="配置模型">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
