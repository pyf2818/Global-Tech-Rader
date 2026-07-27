// AiElf 头部操作栏（侧栏切换、新建、导出、保存、关闭）
// 从 src/AiElf.jsx 抽离，纯展示组件

export default function ChatHeader({
  showSidebar,
  setShowSidebar,
  activeAgent,
  avatarImage,
  elfName,
  clearConversation,
  exportConversation,
  onContinueInWorkbench,
  onExportToMaterials,
  saveConversationToMaterials,
  setIsOpen,
}) {
  return (
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
  );
}
