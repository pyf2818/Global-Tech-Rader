import { ICONS } from '../constants/index.jsx';

export default function Sidebar({ sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, nav, goNav, addRecentVisit, activePrimaryNav, activeContextItems, contextGroupOpen, setContextGroupOpen, agents, currentAgent, setCurrentAgent, setElfQuotedContext, buildWorkbenchContext, showFollowDropdown, setShowFollowDropdown, followKeywords, sortedFollowKeywords, pinnedKeywords, pinFollowKeyword, unpinFollowKeyword, removeFollowKeyword, executeSearch, newKeyword, setNewKeyword, addFollowKeyword, bookmarks, filtered, isLoggedIn, user, setShowProfileModal, setAuthMode, setShowAuthModal, setShowThemePicker, setShowSettings, setShowShortcuts, PRODUCT_NAME, PRODUCT_TAGLINE, PRIMARY_NAV_ITEMS }) {
  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
<div className="logo-icon">
              <svg viewBox="0 0 48 48" fill="none" className="logo-svg">
                <defs>
                  <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2ff"/>
                    <stop offset="50%" stopColor="#00a8ff"/>
                    <stop offset="100%" stopColor="#7c00ff"/>
                  </linearGradient>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f2ff"/>
                    <stop offset="100%" stopColor="#7c00ff"/>
                  </linearGradient>
                  <filter id="techGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="techGlowStrong" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3" result="blur1"/>
                    <feGaussianBlur stdDeviation="6" result="blur2"/>
                    <feMerge>
                      <feMergeNode in="blur2"/>
                      <feMergeNode in="blur1"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <g className="logo-core-glow">
                  <circle cx="24" cy="24" r="14" fill="url(#coreGrad)" opacity="0.15" filter="url(#techGlow)"/>
                </g>
                <g className="logo-rings">
                  <circle cx="24" cy="24" r="20" stroke="url(#ringGrad)" strokeWidth="0.5" fill="none" opacity="0.4" strokeDasharray="3 2"/>
                  <circle cx="24" cy="24" r="16" stroke="url(#ringGrad)" strokeWidth="1" fill="none" opacity="0.6"/>
                  <circle cx="24" cy="24" r="12" stroke="url(#ringGrad)" strokeWidth="0.5" fill="none" opacity="0.5" strokeDasharray="2 3"/>
                </g>
                <g className="logo-core">
                  <polygon points="24,10 31,13.5 31,20.5 31,27.5 24,31 17,27.5 17,20.5 17,13.5" stroke="url(#coreGrad)" strokeWidth="1.5" fill="rgba(0,242,255,0.1)"/>
                  <polygon points="24,14 27,16 27,19 27,22 24,24 21,22 21,19 21,16" stroke="#00f2ff" strokeWidth="1" fill="rgba(0,242,255,0.2)" filter="url(#techGlow)"/>
                  <circle cx="24" cy="19" r="1.5" fill="#00f2ff" filter="url(#techGlowStrong)"/>
                </g>
                <g className="logo-data-flow">
                  <line x1="24" y1="5" x2="24" y2="8" stroke="#00f2ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="24" y1="31" x2="24" y2="34" stroke="#00f2ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="5" y1="19" x2="8" y2="19" stroke="#7c00ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="40" y1="19" x2="43" y2="19" stroke="#7c00ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="10" y1="10" x2="12.5" y2="12.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="38" y1="10" x2="35.5" y2="12.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="10" y1="28" x2="12.5" y2="25.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                  <line x1="38" y1="28" x2="35.5" y2="25.5" stroke="#00a8ff" strokeWidth="1.5" opacity="0.9"/>
                </g>
                <g className="logo-nodes" filter="url(#techGlow)">
                  <circle cx="24" cy="5" r="2" fill="#00f2ff"/>
                  <circle cx="24" cy="43" r="2" fill="#00f2ff"/>
                  <circle cx="5" cy="19" r="2" fill="#7c00ff"/>
                  <circle cx="43" cy="19" r="2" fill="#7c00ff"/>
                  <circle cx="10" cy="10" r="1.5" fill="#00a8ff"/>
                  <circle cx="38" cy="10" r="1.5" fill="#00a8ff"/>
                  <circle cx="10" cy="28" r="1.5" fill="#00a8ff"/>
                  <circle cx="38" cy="28" r="1.5" fill="#00a8ff"/>
                </g>
                <g className="logo-particles">
                  <circle cx="24" cy="2" r="0.8" fill="#00f2ff" opacity="0.8"/>
                  <circle cx="46" cy="19" r="0.8" fill="#7c00ff" opacity="0.8"/>
                  <circle cx="24" cy="46" r="0.8" fill="#00f2ff" opacity="0.8"/>
                  <circle cx="2" cy="19" r="0.8" fill="#7c00ff" opacity="0.8"/>
                </g>
              </svg>
            </div>
            {!sidebarCollapsed && (
              <span className="logo-copy">
                <span className="logo-text">{PRODUCT_NAME}</span>
                <small>{PRODUCT_TAGLINE}</small>
              </span>
            )}
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(c => !c)} title={sidebarCollapsed ? '展开' : '收起'}>
            {sidebarCollapsed ? ICONS.chevronRight : ICONS.chevronLeft}
          </button>
        </div>

        <nav className="nav-menu">
          <div className="nav-primary-group">
            {!sidebarCollapsed && <div className="nav-group-title-static">主工作区</div>}
            {PRIMARY_NAV_ITEMS.map(item => {
              const isActive = activePrimaryNav === item.id;
              const showContext = isActive && !sidebarCollapsed && activeContextItems.length > 1;

              return (
                <div key={item.id} className={`nav-primary-entry ${isActive ? 'active' : ''}`}>
                  <button
                    className={`nav-item nav-primary-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      goNav(item.nav);
                      addRecentVisit('nav', item.nav, item.label);
                      setContextGroupOpen(current => isActive ? !current : true);
                    }}
                    title={sidebarCollapsed ? item.label : undefined}
                    aria-expanded={showContext ? contextGroupOpen : undefined}
                  >
                    <span className="nav-icon">{ICONS[item.icon]}</span>
                    {sidebarCollapsed && item.short && (
                      <span className="nav-short-label">{item.short}</span>
                    )}
                    {!sidebarCollapsed && (
                      <span className="nav-label-wrap">
                        <span className="nav-label">{item.label}</span>
                        <small>{item.desc}</small>
                      </span>
                    )}
                    {showContext && (
                      <span className={`nav-primary-chevron ${contextGroupOpen ? 'open' : ''}`} aria-hidden="true">
                        {ICONS.chevronDown}
                      </span>
                    )}
                  </button>
                  {showContext && contextGroupOpen && (
                    <div className="nav-context-group nav-context-inline">
                      {activeContextItems.map(contextItem => (
                        <button
                          key={contextItem.id}
                          className={`nav-item nav-sub-item ${nav === contextItem.id ? 'active' : ''}`}
                          onClick={() => { goNav(contextItem.id); addRecentVisit('nav', contextItem.id, contextItem.label); }}
                        >
                          <span className="nav-icon">{ICONS[contextItem.icon]}</span>
                          <span className="nav-label">{contextItem.label}</span>
                          {contextItem.id === 'reading-list' && <span className="nav-count">{bookmarks.length}</span>}
                          {contextItem.id === 'all' && <span className="nav-count">{filtered.length}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            </div>

          {!sidebarCollapsed && nav === 'agents' && (
            <div className="nav-context-group agent-nav-summary">
              <div className="nav-group-title-static">智能体生态</div>
              {agents.slice(0, 5).map(agent => (
                <button
                  key={agent.id}
                  className={`nav-item nav-sub-item ${currentAgent === agent.id ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentAgent(agent.id);
                    setElfQuotedContext({
                      id: Date.now(),
                      title: `智能体：${agent.name}`,
                      agentId: agent.id,
                      content: buildWorkbenchContext(`请作为${agent.name}，基于我的今日情报上下文进入待命。`),
                      suggestedPrompt: `请作为${agent.name}，告诉我你能如何帮助我处理今天的情报。`
                    });
                  }}
                >
                  <span className="nav-icon">{ICONS.bot}</span>
                  <span className="nav-label">{agent.name}</span>
                </button>
              ))}
            </div>
          )}


          {!sidebarCollapsed && activePrimaryNav === 'profile-center' && (
            <div className="nav-group nav-follow-group">
              <button className="nav-group-toggle" onClick={() => setShowFollowDropdown(v => !v)}>
                <span className="nav-group-title">追踪关键词</span>
                {followKeywords.length > 0 && <span className="nav-group-follow-count">{followKeywords.length}</span>}
                <span className={`nav-group-chevron ${showFollowDropdown ? 'open' : ''}`}>{ICONS.chevronDown}</span>
              </button>
              {showFollowDropdown && (
                <div className="nav-follow-list">
                  {followKeywords.length === 0 && <p className="nav-follow-empty">暂无关注关键词</p>}
                  {sortedFollowKeywords.map(kw => (
                    <div key={kw} className={`nav-follow-item ${pinnedKeywords.includes(kw) ? 'nav-follow-item-pinned' : ''}`}>
                      <button className="nav-follow-name" onClick={() => executeSearch(kw)}>
                        {pinnedKeywords.includes(kw) && <span className="nav-follow-pin-dot" />}
                        {kw}
                      </button>
                      <div className="nav-follow-btns">
                        <button className={`nav-follow-pin-btn ${pinnedKeywords.includes(kw) ? 'pinned' : ''}`} onClick={() => pinnedKeywords.includes(kw) ? unpinFollowKeyword(kw) : pinFollowKeyword(kw)} title={pinnedKeywords.includes(kw) ? '取消置顶' : '置顶'}>
                          <svg viewBox="0 0 16 16" width="12" height="12" fill={pinnedKeywords.includes(kw) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M3 13l5-5 5 5M8 1v7"/></svg>
                        </button>
                        <button className="nav-follow-del-btn" onClick={() => removeFollowKeyword(kw)} title="删除">
                          <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="nav-follow-add">
                    <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="关键词" onKeyDown={e => e.key === 'Enter' && addFollowKeyword()} />
                    <button className="nav-follow-add-btn" onClick={() => addFollowKeyword()}>{ICONS.plus}</button>
                  </div>
                </div>
        </nav>

        <div className="sidebar-footer">
          {isLoggedIn ? (
            <button className="sidebar-action" onClick={() => setShowProfileModal(true)}>
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="sidebar-user-avatar-btn" />
              ) : (
                <span className="sidebar-user-avatar-small">{(user?.displayName || user?.username)?.[0]?.toUpperCase() || 'U'}</span>
              )}
              {!sidebarCollapsed && <span>{user?.displayName || user?.username}</span>}
            </button>
          ) : (
            <button className="sidebar-action" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
              {ICONS.user}
              {!sidebarCollapsed && <span>登录</span>}
            </button>
          )}
          <button className="sidebar-action" onClick={() => setShowThemePicker(true)}>
            {ICONS.palette}
            {!sidebarCollapsed && <span>主题</span>}
          </button>
          <button className="sidebar-action" onClick={() => setShowSettings(true)}>
            {ICONS.settings}
            {!sidebarCollapsed && <span>设置</span>}
          </button>
          <button className="sidebar-action" onClick={() => setShowShortcuts(s => !s)}>
            {ICONS.keyboard}
            {!sidebarCollapsed && <span>快捷键</span>}
          </button>
        </div>
      </aside>
  );
}
