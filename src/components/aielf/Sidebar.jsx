// AiElf 左侧边栏 - Agent 生态 + 个人画像 + 历史会话
// 从 src/AiElf.jsx 抽离，纯展示组件

export default function Sidebar({
  avatarImage,
  activeAgent,
  agents,
  activeAgentId,
  activeAgentSessions,
  profile,
  agentHistory,
  expandedAgent,
  handleChangeAgent,
  toggleAgentExpand,
  setCurrentSessionId,
  setAgentMessages,
  setAgentHistory,
}) {
  return (
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
  );
}
