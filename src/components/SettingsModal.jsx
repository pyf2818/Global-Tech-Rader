import React from 'react';
import { ICONS, REGION_MAP, AGENT_CATEGORIES } from '../constants/index.jsx';
import { showToast } from '../utils/toast.js';

// Helper functions (local to this component)
function truncateUrl(url, maxLength) {
  if (!url) return '';
  return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function getSourceHealthIndicator(sourceHealth, sourceId) {
  const health = sourceHealth[sourceId];
  if (!health) {
    return <span className="health-indicator health-unknown" title="未验证">?</span>;
  }
  if (health.status === 'healthy') {
    return <span className="health-indicator health-good" title="健康">✓</span>;
  } else if (health.status === 'warning') {
    return <span className="health-indicator health-warning" title="警告">!</span>;
  } else if (health.status === 'error') {
    return <span className="health-indicator health-bad" title="错误">✗</span>;
  }
  return <span className="health-indicator health-unknown" title="未验证">?</span>;
}

export default function SettingsModal({
  // Settings tab control
  settingsTab, setSettingsTab,
  showSettings, setShowSettings,

  // Stats
  stats,

  // Blocked words
  blocked, setBlocked,

  // Source management
  allSources, customSources, setCustomSources, disabledSources, setDisabledSources, sourceGrades,
  newSource, setNewSource, editingSource, setEditingSource,
  showSourceForm, setShowSourceForm,
  searchQuery, setSearchQuery,
  customSourceFilter, setCustomSourceFilter,
  regionFilter, setRegionFilter,
  statusFilter, setStatusFilter,
  gradeFilter, setGradeFilter,
  sourceTypeTab, setSourceTypeTab,
  sourceHealth, setSourceHealth,
  sourceFilter, setSourceFilter,

  // Source operations
  addCustomSource, removeCustomSource, verifySource, verifyAllSources,
  verifySingleSource, exportSources, importSources,
  verifyingAllSources, allSourcesVerifyResults, setAllSourcesVerifyResults,

  // Monitor
  autoMonitorEnabled, setAutoMonitorEnabled,
  monitorInterval, setMonitorInterval,
  monitorAlerts, showAlertPanel, setShowAlertPanel, clearAlerts,

  // LLM Config
  llmConfig, setLlmConfig, llmModels, llmFetching, llmFetchError,
  llmTestResult, llmTesting, llmManualInput, setLlmManualInput,
  showLlmQuickConfig, setShowLlmQuickConfig,
  allLlmModels,
  fetchLlmModels, addManualModel, removeManualModel, testLlmConnection,
  handleSelectPreset, handleQuickSave, handleQuickTest,

  // Agents
  agents, setAgents, currentAgent, setCurrentAgent,
  showAgentForm, setShowAgentForm, editingAgent, setEditingAgent,
  newAgent, setNewAgent, agentFilter, setAgentFilter,
  agentPromptRefining, setAgentPromptRefining,
  elfAvatar, setElfAvatar, elfAvatarHistory, setElfAvatarHistory,
  elfName, setElfName,

  // Misc
  formatRelative,
  loadNews,
}) {
  if (!showSettings) return null;

  return (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="modal modal-lg settings-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><h3>设置</h3><button className="modal-close" onClick={() => setShowSettings(false)}>{ICONS.x}</button></div>
              <div className="modal-body settings-sidebar-body">
                <div className="settings-sidebar">
                  <button className={`settings-nav-item ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>通用设置</button>
                  <button className={`settings-nav-item ${settingsTab === 'sources' ? 'active' : ''}`} onClick={() => setSettingsTab('sources')}>信息源</button>
                  <button className={`settings-nav-item ${settingsTab === 'llm' ? 'active' : ''}`} onClick={() => setSettingsTab('llm')}>大模型</button>
                  <button className={`settings-nav-item ${settingsTab === 'agents' ? 'active' : ''}`} onClick={() => setSettingsTab('agents')}>Agent管理</button>
                </div>
                <div className="settings-content">
                {settingsTab === 'general' && (
                  <div className="setting-item"><label>关键词屏蔽</label><textarea value={blocked} onChange={e => setBlocked(e.target.value)} placeholder="输入屏蔽词，逗号分隔" /><p className="setting-note">已过滤 {stats.blockedCount} 条资讯</p></div>
                )}

                {settingsTab === 'sources' && (
                  <>
                    {/* 源类型切换 */}
                    <div className="source-type-tabs">
                      <button
                        className={`source-type-tab ${sourceTypeTab === 'builtin' ? 'active' : ''}`}
                        onClick={() => setSourceTypeTab('builtin')}
                      >
                        内置信息源
                      </button>
                      <button
                        className={`source-type-tab ${sourceTypeTab === 'custom' ? 'active' : ''}`}
                        onClick={() => setSourceTypeTab('custom')}
                      >
                        自定义信息源
                      </button>
                    </div>

                    {/* 等级统计面板 - 所有源都显示 */}
                    {Object.keys(sourceGrades).length > 0 && (
                      <div className="grade-stats-panel">
                        <div className="grade-stats-header">
                          <span className="grade-stats-title">信息源等级分布</span>
                          <span className="grade-stats-total">总计: {sourceTypeTab === 'builtin' ? allSources.length : customSources.length}个源</span>
                        </div>
                        <div className="grade-stats-grid">
                          {['S', 'A', 'B', 'C', 'D'].map(grade => {
                            const gradeInfo = sourceGrades[grade];
                            const currentSources = sourceTypeTab === 'builtin' ? allSources : customSources;
                            const count = currentSources.filter(s => s.grade === grade).length;
                            const percentage = currentSources.length > 0 ? (count / currentSources.length * 100).toFixed(1) : 0;
                            return (
                              <div key={grade} className="grade-stat-card">
                                <div className="grade-stat-badge" style={{backgroundColor: gradeInfo?.color || '#ccc'}}>
                                  {grade}
                                </div>
                                <div className="grade-stat-content">
                                  <div className="grade-stat-label">{gradeInfo?.label?.split('-')[1] || '未知'}</div>
                                  <div className="grade-stat-stats">
                                    <span className="grade-stat-count">{count}个</span>
                                    <span className="grade-stat-percent">{percentage}%</span>
                                  </div>
                                  <div className="grade-stat-desc">{gradeInfo?.description || ''}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

  {/* 内置信息源管理 */}
                    {sourceTypeTab === 'builtin' && (
                      <div className="setting-item">
                        <label>内置信息源管理</label>
                        <p className="setting-desc">管理系统内置的266个权威信息源，支持等级筛选和批量启用/禁用操作</p>

                        {/* 统计面板 */}
                        <div className="builtin-stats-panel">
                          <div className="builtin-stat-item enabled">
                            <div className="builtin-stat-icon">✓</div>
                            <div className="builtin-stat-content">
                              <div className="builtin-stat-value">{allSources.length - disabledSources.length}</div>
                              <div className="builtin-stat-label">已启用</div>
                            </div>
                          </div>
                          <div className="builtin-stat-item disabled">
                            <div className="builtin-stat-icon">×</div>
                            <div className="builtin-stat-content">
                              <div className="builtin-stat-value">{disabledSources.length}</div>
                              <div className="builtin-stat-label">已禁用</div>
                            </div>
                          </div>
                          <div className="builtin-stat-item total">
                            <div className="builtin-stat-icon">∑</div>
                            <div className="builtin-stat-content">
                              <div className="builtin-stat-value">{allSources.length}</div>
                              <div className="builtin-stat-label">总计</div>
                            </div>
                          </div>
                        </div>

                        {/* 操作栏 */}
  <div className="builtin-operations-bar">
                           {/* 左侧：显示当前筛选结果数量 */}
                           <div className="builtin-operations-left">
                             <div className="filtered-results-count">
                               当前显示 <strong>{allSources.filter(source => {
                                 if (!source || !source.name) return false;
                                 const searchLower = searchQuery.toLowerCase();
                                 const matchesSearch = !searchQuery ||
                                   source.name.toLowerCase().includes(searchLower) ||
                                   source.region?.toLowerCase().includes(searchLower);
                                 const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;
                                 const matchesRegion = regionFilter === 'all' || source.region === regionFilter;
                                 const isDisabled = disabledSources.includes(source.name);
                                 const matchesStatus = statusFilter === 'all' ||
                                   (statusFilter === 'enabled' && !isDisabled) ||
                                   (statusFilter === 'disabled' && isDisabled);
                                 return matchesSearch && matchesGrade && matchesRegion && matchesStatus;
                               }).length}</strong> 个源
                             </div>
                           </div>

                           {/* 右侧：批量操作按钮 */}
                           <div className="builtin-operations-right">
                             <button
                               className="batch-action-btn disable"
                               onClick={() => {
                                 const filteredSources = allSources.filter(source => {
                                   if (!source || !source.name) return false;
                                   const searchLower = searchQuery.toLowerCase();
                                   const matchesSearch = !searchQuery ||
                                     source.name.toLowerCase().includes(searchLower) ||
                                     source.region?.toLowerCase().includes(searchLower);
                                   const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;
                                   const matchesRegion = regionFilter === 'all' || source.region === regionFilter;
                                   const isDisabled = disabledSources.includes(source.name);
                                   const matchesStatus = statusFilter === 'all' ||
                                     (statusFilter === 'enabled' && !isDisabled) ||
                                     (statusFilter === 'disabled' && isDisabled);
                                   return matchesSearch && matchesGrade && matchesRegion && matchesStatus && !isDisabled;
                                 });
                                 if (filteredSources.length > 0 && confirm(`确定禁用当前筛选的 ${filteredSources.length} 个已启用源？`)) {
                                   setDisabledSources(prev => [...prev, ...filteredSources.map(s => s.name)]);
                                 }
                               }}
                             >
                               <span className="btn-icon">🚫</span>
                               <span>批量禁用当前</span>
                             </button>
                             <button
                               className="batch-action-btn enable"
                               onClick={() => {
                                 const filteredSources = allSources.filter(source => {
                                   if (!source || !source.name) return false;
                                   const searchLower = searchQuery.toLowerCase();
                                   const matchesSearch = !searchQuery ||
                                     source.name.toLowerCase().includes(searchLower) ||
                                     source.region?.toLowerCase().includes(searchLower);
                                   const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;
                                   const matchesRegion = regionFilter === 'all' || source.region === regionFilter;
                                   const isDisabled = disabledSources.includes(source.name);
                                   const matchesStatus = statusFilter === 'all' ||
                                     (statusFilter === 'enabled' && !isDisabled) ||
                                     (statusFilter === 'disabled' && isDisabled);
                                   return matchesSearch && matchesGrade && matchesRegion && matchesStatus && isDisabled;
                                 });
                                 if (filteredSources.length > 0 && confirm(`确定启用当前筛选的 ${filteredSources.length} 个已禁用源？`)) {
                                   setDisabledSources(prev => prev.filter(name => !filteredSources.some(s => s.name === name)));
                                 }
                               }}
                             >
                               <span className="btn-icon">✓</span>
                               <span>批量启用当前</span>
                             </button>
                           </div>
                         </div>

                        {/* 筛选栏 */}
                        <div className="source-filter-bar">
                          <input
                            type="text"
                            placeholder="搜索源名称、地区..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="source-search-input"
                          />
                          <select
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value)}
                            className="source-filter-select"
                          >
                            <option value="all">全部等级</option>
                            {Object.keys(sourceGrades).map(grade => (
                              <option key={grade} value={grade}>{grade}级 - {sourceGrades[grade].label?.split('-')[1]}</option>
                            ))}
                          </select>
                          <select
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            className="source-filter-select"
                          >
                            <option value="all">全部地区</option>
                            <option value="overseas">海外</option>
                            <option value="domestic">国内</option>
                            <option value="global">全球</option>
                          </select>
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="source-filter-select"
                          >
                            <option value="all">全部状态</option>
                            <option value="enabled">已启用</option>
                            <option value="disabled">已禁用</option>
                          </select>
                        </div>

                        {/* 内置源列表 */}
                        <div className="builtin-sources-grid">
                          {allSources.length === 0 ? (
                            <div className="empty-state">
                              <p>正在加载内置信息源...</p>
                            </div>
                          ) : (
                            allSources.filter(source => {
                              if (!source || !source.name) return false;

                              // 搜索匹配
                              const searchLower = searchQuery.toLowerCase();
                              const matchesSearch = !searchQuery ||
                                source.name.toLowerCase().includes(searchLower) ||
                                source.region?.toLowerCase().includes(searchLower);

                              // 等级筛选
                              const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;

                              // 地区筛选
                              const matchesRegion = regionFilter === 'all' || source.region === regionFilter;

                              // 状态筛选
                              const isDisabled = disabledSources.includes(source.name);
                              const matchesStatus = statusFilter === 'all' ||
                                (statusFilter === 'enabled' && !isDisabled) ||
                                (statusFilter === 'disabled' && isDisabled);

                              return matchesSearch && matchesGrade && matchesRegion && matchesStatus;
  }).map(source => (
                               <div
                                 key={source.name}
                                 className={`source-card ${disabledSources.includes(source.name) ? 'disabled' : ''}`}
                               >
                                 <div className="source-card-main">
                                   <div className="source-card-header">
                                    <div className="source-card-title-row">
                                      <span className="source-card-name">{source.name}</span>
                                      {source.grade && sourceGrades[source.grade] && (
                                        <span
                                          className="source-grade-badge"
                                          style={{
                                            backgroundColor: sourceGrades[source.grade].color,
                                            color: '#fff'
                                          }}
                                        >
                                          {source.grade}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      className="source-toggle-btn"
                                      onClick={() => {
                                        if (disabledSources.includes(source.name)) {
                                          setDisabledSources(prev => prev.filter(name => name !== source.name));
                                        } else {
                                          setDisabledSources(prev => [...prev, source.name]);
                                        }
                                      }}
                                    >
                                      {disabledSources.includes(source.name) ? '启用' : '禁用'}
                                    </button>
                                  </div>
                                  <div className="source-card-info">
                                    <div className="source-card-meta">
                                      <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                      <span className="source-card-category">{source.grade || 'N/A'}级</span>
                                    </div>
                                    {source.gradeInfo && (
                                      <div className="source-card-desc">{source.gradeInfo.description}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                       </div>
                    )}

                    {/* 自定义信息源管理 */}
                    {sourceTypeTab === 'custom' && (
                      <>
                        <div className="setting-item">
                          <label>自定义信息源</label>
                          <p className="setting-desc">管理 RSS/Atom 订阅源，支持编辑、批量操作和健康监控</p>

                      {/* 数据加载状态指示 */}
                      {(!allSources || allSources.length === 0) && (
                        <div className="loading-indicator">
                          <p>正在加载内置信息源...</p>
                        </div>
                      )}

                      {/* 自动监控控制面板 */}
                      <div className="monitor-control-panel">
                        <div className="monitor-toggle">
                          <label className="monitor-switch">
                            <input
                              type="checkbox"
                              checked={autoMonitorEnabled}
                              onChange={(e) => setAutoMonitorEnabled(e.target.checked)}
                            />
                            <span>自动监控</span>
                          </label>
                          <select
                            value={monitorInterval}
                            onChange={(e) => setMonitorInterval(Number(e.target.value))}
                            className="monitor-interval-select"
                            disabled={!autoMonitorEnabled}
                          >
                            <option value="30">每30分钟</option>
                            <option value="60">每小时</option>
                            <option value="120">每2小时</option>
                            <option value="360">每6小时</option>
                            <option value="720">每12小时</option>
                          </select>
                        </div>

                        {/* 警告面板 */}
                        {monitorAlerts.length > 0 && (
                          <div className="monitor-alerts-panel">
                            <div className="alerts-header">
                              <span className="alerts-title">⚠️ 健康警告 ({monitorAlerts.length})</span>
                              <button className="alerts-clear-btn" onClick={clearAlerts}>清除</button>
                            </div>
                            <div className="alerts-list">
                              {monitorAlerts.map(alert => (
                                <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                                  <span className="alert-message">{alert.message}</span>
                                  <span className="alert-time">
                                    {new Date(alert.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

  {/* 批量操作栏 */}
                        <div className="source-batch-actions">
                          <span className="source-count">{customSources.length} 个自定义源</span>
                        </div>

  {/* 高级搜索和筛选 */}
                       <div className="source-filter-bar">
                         <input
                           type="text"
                           placeholder="搜索源名称、URL、标签..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="source-search-input"
                         />
                         <select
                           value={customSourceFilter}
                           onChange={(e) => setCustomSourceFilter(e.target.value)}
                           className="source-filter-select"
                         >
                           <option value="all">全部状态</option>
                           <option value="enabled">已启用</option>
                           <option value="disabled">已禁用</option>
                           <option value="healthy">健康</option>
                           <option value="warning">警告</option>
                           <option value="error">异常</option>
                         </select>
                         <select
                           value={gradeFilter}
                           onChange={(e) => setGradeFilter(e.target.value)}
                           className="source-filter-select"
                         >
                           <option value="all">全部等级</option>
  {Object.keys(sourceGrades).length > 0 && Object.entries(sourceGrades).map(([grade, info]) => (
                              <option key={grade} value={grade}>
                                {grade}级 - {info.label?.split('-')[1] || '未知'}
                              </option>
                            ))}
                         </select>
                         <select
                           value={regionFilter}
                           onChange={(e) => setRegionFilter(e.target.value)}
                           className="source-filter-select"
                         >
                           <option value="all">全部地区</option>
                           <option value="overseas">仅海外</option>
                           <option value="domestic">仅国内</option>
                           <option value="global">全球</option>
                         </select>
                       </div>

                      {/* 自定义源列表 */}
                      <div className="custom-sources-grid">
                        {customSources.length === 0 ? (
                          <div className="empty-state">
                            <p>暂无自定义信息源</p>
                            <button className="source-action-btn primary" onClick={() => setShowSourceForm(true)}>
                              {ICONS.plus} 添加第一个源
                            </button>
                          </div>
                        ) : (
                          (customSources || []).filter(source => {
                            if (!source || !source.name || !source.url) return false;

                            // 搜索匹配
                            const searchLower = searchQuery.toLowerCase();
                            const matchesSearch = !searchQuery || 
                              source.name.toLowerCase().includes(searchLower) ||
                              source.url.toLowerCase().includes(searchLower) ||
                              (source.tags && source.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
                              (source.category && source.category.toLowerCase().includes(searchLower));

                            // 启用状态筛选
                            const isDisabled = disabledSources.includes(source.name);
                            const matchesStatus = customSourceFilter === 'all' ||
                              (customSourceFilter === 'enabled' && !isDisabled) ||
                              (customSourceFilter === 'disabled' && isDisabled);

  // 地区筛选
                             const matchesRegion = regionFilter === 'all' || source.region === regionFilter;

                             // 等级筛选
                             const matchesGrade = gradeFilter === 'all' || source.grade === gradeFilter;

                             // 健康状态筛选
                             const health = sourceHealth[source.id];
                             const matchesHealth = customSourceFilter === 'all' ||
                               customSourceFilter === 'enabled' ||
                               customSourceFilter === 'disabled' ||
                               (customSourceFilter === 'healthy' && health?.status === 'healthy') ||
                               (customSourceFilter === 'warning' && health?.status === 'warning') ||
                               (customSourceFilter === 'error' && health?.status === 'error');

                             return matchesSearch && matchesStatus && matchesRegion && matchesGrade && matchesHealth;
  }).map(source => (
                             <div
                               key={source.id}
                               className="source-card"
                             >
                               <div className="source-card-main">
                                   <div className="source-card-header">
                                    <div className="source-card-title-row">
                                      <span className="source-card-name">{source.name}</span>
                                      {source.grade && sourceGrades[source.grade] && (
                                        <span
                                          className="source-grade-badge"
                                          style={{
                                            backgroundColor: sourceGrades[source.grade].color,
                                            color: '#fff'
                                          }}
                                        >
                                          {sourceGrades[source.grade].icon} {source.grade}级
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      className="source-toggle-btn"
                                      onClick={() => {
                                        if (disabledSources.includes(source.name)) {
                                          setDisabledSources(prev => prev.filter(name => name !== source.name));
                                        } else {
                                          setDisabledSources(prev => [...prev, source.name]);
                                        }
                                      }}
                                    >
                                      {disabledSources.includes(source.name) ? '启用' : '禁用'}
                                    </button>
                                  </div>
                                 <div className="source-card-info">
                                   <div className="source-card-url" title={source.url}>
                                     {truncateUrl(source.url, 40)}
                                   </div>
                                   <div className="source-card-meta">
                                     <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                     {source.category && (
                                       <span className="source-card-category">{source.category}</span>
                                     )}
                                     {(source.tags || []).slice(0, 3).map((tag, i) => (
                                       <span key={i} className="source-card-tag">{tag}</span>
                                     ))}
                                   </div>
                                   {source.notes && (
                                     <p className="source-card-notes" title={source.notes}>
                                       {truncateText(source.notes, 50)}
                                     </p>
                                   )}
  </div>
                                 <div className="source-card-actions">
                                   <button
                                     className="source-icon-btn"
                                     title="验证"
                                     onClick={() => verifySingleSource(source)}
                                   >
                                     {ICONS.check || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 12 20 12" /></svg>}
                                   </button>
                                   <button
                                     className="source-icon-btn"
                                     title="编辑"
                                     onClick={() => setEditingSource(source)}
                                   >
                                     {ICONS.edit || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0 0-2 2v14a2 2 0 0 0 0 2h7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1 1 4 4z" /></svg>}
                                   </button>
                                   <button
                                     className="source-icon-btn danger"
                                     title="删除"
                                     onClick={() => {
                                       if (confirm(`确定删除「${source.name}」？`)) {
                                         setCustomSources(prev => prev.filter(s => s.id !== source.id));
                                         setSourceHealth(prev => {
                                           const newHealth = { ...prev };
                                           delete newHealth[source.id];
                                           return newHealth;
                                         });
                                       }
                                     }}
                                   >
                                     {ICONS.x || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                                   </button>
                                 </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                         </div>

                      {/* 编辑/添加源表单 */}
                      {showSourceForm && (
                        <div className="source-form-modal-overlay">
                          <div className="source-form-modal">
                            <div className="source-form-header">
                              <h3>{editingSource ? '编辑信息源' : '添加信息源'}</h3>
                              <button className="source-form-close" onClick={() => {
                                setShowSourceForm(false);
                                setEditingSource(null);
                                setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                              }}>{ICONS.x}</button>
                            </div>
                            <div className="source-form-body">
                              <div className="source-form-group">
                                <label>名称 *</label>
                                <input
                                  type="text"
                                  value={editingSource ? editingSource.name : newSource.name}
                                  onChange={e => {
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, name: e.target.value }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, name: e.target.value }));
                                    }
                                  }}
                                  placeholder="如：TechCrunch"
                                  className="source-form-input"
                                />
                              </div>
                              <div className="source-form-group">
                                <label>RSS/Atom URL *</label>
                                <input
                                  type="text"
                                  value={editingSource ? editingSource.url : newSource.url}
                                  onChange={e => {
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, url: e.target.value }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, url: e.target.value }));
                                    }
                                  }}
                                  placeholder="https://example.com/feed.xml"
                                  className="source-form-input"
                                />
                              </div>
                              <div className="source-form-group">
                                <label>地区</label>
                                <select
                                  value={editingSource ? editingSource.region : newSource.region}
                                  onChange={e => {
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, region: e.target.value }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, region: e.target.value }));
                                    }
                                  }}
                                  className="source-form-select"
                                >
                                  <option value="overseas">海外</option>
                                  <option value="domestic">国内</option>
                                  <option value="global">全球</option>
                                </select>
                              </div>
                              <div className="source-form-group">
                                <label>分类</label>
                                <input
                                  type="text"
                                  value={editingSource ? editingSource.category || '' : newSource.category}
                                  onChange={e => {
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, category: e.target.value }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, category: e.target.value }));
                                    }
                                  }}
                                  placeholder="如：AI、硬件、开源"
                                  className="source-form-input"
                                />
                              </div>
                              <div className="source-form-group">
                                <label>标签（逗号分隔）</label>
                                <input
                                  type="text"
                                  value={editingSource ? (editingSource.tags || []).join(', ') : newSource.tags}
                                  onChange={e => {
                                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, tags }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, tags }));
                                    }
                                  }}
                                  placeholder="如：科技, AI, 机器学习"
                                  className="source-form-input"
                                />
                              </div>
                              <div className="source-form-group">
                                <label>备注</label>
                                <textarea
                                  value={editingSource ? editingSource.notes || '' : newSource.notes}
                                  onChange={e => {
                                    if (editingSource) {
                                      setEditingSource(prev => ({ ...prev, notes: e.target.value }));
                                    } else {
                                      setNewSource(prev => ({ ...prev, notes: e.target.value }));
                                    }
                                  }}
                                  rows={3}
                                  placeholder="可选备注信息..."
                                  className="source-form-textarea"
                                />
                              </div>
                            </div>
                            <div className="source-form-footer">
                              <button className="btn-cancel" onClick={() => {
                                setShowSourceForm(false);
                                setEditingSource(null);
                                setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                              }}>取消</button>
                              <button
                                className="btn-save"
                                onClick={() => {
                                  if (editingSource) {
                                    setCustomSources(prev => prev.map(s => s.id === editingSource.id ? editingSource : s));
                                    setEditingSource(null);
                                  } else {
                                    if (!newSource.name.trim() || !newSource.url.trim()) {
                                      alert('请填写名称和 URL');
                                      return;
                                    }
                                    const source = {
                                      ...newSource,
                                      id: Date.now(),
                                      tags: newSource.tags ? newSource.tags.split(',').map(t => t.trim()).filter(Boolean) : []
                                    };
                                    setCustomSources(prev => [...prev, source]);
                                    setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
                                  }
                                  setShowSourceForm(false);
                                }}
                              >
                                {editingSource ? '保存修改' : '添加'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    <div className="setting-item">
                      <label>内置信息源</label>
                      <p className="setting-desc">管理系统预设的信息源，支持批量操作和健康监控</p>

  {/* 内置源工具栏 */}
                       <div className="source-batch-actions">
                         <button className="source-action-btn" onClick={verifyAllSources} disabled={verifyingAllSources}>
                           {verifyingAllSources ? '验证中...' : '验证所有源'}
                         </button>
                       </div>

                      {/* 搜索和筛选 */}
                      <div className="source-filter-bar">
                        <input
                          type="text"
                          placeholder="搜索信息源名称..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="source-search-input"
                        />
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="source-filter-select"
                        >
                          <option value="all">全部地区</option>
                          <option value="overseas">仅海外</option>
                          <option value="domestic">仅国内</option>
                          <option value="healthy">健康</option>
                          <option value="warning">警告</option>
                          <option value="error">异常</option>
                        </select>
                      </div>

                      {/* 内置源卡片列表 */}
                      <div className="builtin-sources-grid">
                        {!allSources || allSources.length === 0 ? (
                          <div className="empty-state">
                            <p>暂无内置信息源</p>
                          </div>
                        ) : (
                          (allSources || []).filter(s => {
                            if (!s || !s.name || !s.url) return false;

                            const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesFilter = sourceFilter === 'all' || 
                              (sourceFilter === 'overseas' && s.region === 'overseas') ||
                              (sourceFilter === 'domestic' && s.region !== 'overseas') ||
                              (sourceFilter === s.health && sourceHealth[s.name]?.status === sourceFilter);
                            return matchesSearch && matchesFilter;
                          }).map(source => {
                            const isDisabled = disabledSources.includes(source.name);
  const health = sourceHealth[source.name];

                             return (
                              <div
                                key={source.name}
  className={`source-card builtin ${isDisabled ? 'disabled' : ''} ${health?.status ? `health-${health.status}` : ''}`}
                              >
                                 <div className="source-card-main">
                                  <div className="source-card-header">
                                    <span className="source-card-name">{source.name}</span>
                                    <div className="source-card-status">
                                      {getSourceHealthIndicator(sourceHealth, source.name)}
                                      {health && health.responseTime && (
                                        <span className="response-time">{health.responseTime}ms</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="source-card-info">
                                    <div className="source-card-url" title={source.url}>
                                      {truncateUrl(source.url, 40)}
                                    </div>
                                    <div className="source-card-meta">
                                      <span className="source-card-region">{REGION_MAP[source.region] || source.region}</span>
                                      <span className="source-card-category">{source.defaultCategory}</span>
                                    </div>
                                    {health && health.itemCount > 0 && (
                                      <div className="source-card-stats">
                                        <span className="stats-item">
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 4 4" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                          {health.itemCount} 条
                                        </span>
                                        {health.lastCheck && (
                                          <span className="stats-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 16 12" /><line x1="12" y1="8" x2="12" y2="12" /></svg>
                                            {new Date(health.lastCheck).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="source-card-actions">
                                    <button
                                      className="source-icon-btn"
                                      title={isDisabled ? '启用' : '禁用'}
                                      onClick={() => {
                                        if (isDisabled) {
                                          setDisabledSources(prev => prev.filter(name => name !== source.name));
                                        } else {
                                          setDisabledSources(prev => [...prev, source.name]);
                                        }
                                      }}
                                    >
                                      {isDisabled ? ICONS.power || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="5" width="22" height="14" rx="2" ry="2" /><line x1="1" y1="22" x2="23" y2="22" /></svg> : ICONS.power || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.72 0" /><line x1="12" y1="2" x2="12" y2="22" /><path d="M12 2v20" /></svg>}
                                    </button>
                                    <button
                                      className="source-icon-btn"
                                      title="验证"
                                      onClick={() => verifySingleSource(source, 'builtin')}
                                    >
                                      {ICONS.check || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 12 20 12" /></svg>}
                                    </button>
                                    <button
                                      className="source-icon-btn"
                                      title="复制URL"
                                      onClick={() => {
                                        navigator.clipboard.writeText(source.url);
                                        alert('URL 已复制到剪贴板');
                                      }}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="6" height="6" /><path d="M7 17.94l3.47-3.47" /><path d="M9 12.94l3.47-3.47" /><path d="M10.5 2H9" /><path d="M9 2L3.5 6" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* 验证结果面板 */}
                      {allSourcesVerifyResults && (
                        <div className="all-sources-verify-results">
                          <div className="verify-results-header">
                            <p className="verify-results-title">
                              {verifyingAllSources ? `验证中... (${allSourcesVerifyResults?.length || 0}/${allSources.length})` : '验证结果'}
                            </p>
                            {!verifyingAllSources && allSourcesVerifyResults && (
                              <button className="verify-results-close" onClick={() => setAllSourcesVerifyResults(null)}>{ICONS.x}</button>
                            )}
                          </div>
                          <div className="verify-results-list">
                            {allSourcesVerifyResults.map((r, i) => (
                              <div key={i} className={`verify-result-item ${r.ok ? 'verify-ok' : 'verify-fail'}`}>
                                <div className="verify-result-main">
                                  <span className="verify-result-name">{r.name}</span>
                                  <span className={`verify-result-status ${r.ok ? 'status-ok' : 'status-fail'}`}>
                                    {r.ok ? '✓ 有效' : '✗ ' + (r.message || '无效')}
                                  </span>
                                </div>
                                {r.itemCount && (
                                  <div className="verify-result-detail">
                                    {r.itemCount} 条内容
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {settingsTab === 'llm' && (
                  <div className="setting-item">
                    <label>大模型配置</label>
                    <p className="setting-desc">配置 OpenAI 兼容 API，自动拉取或手动输入模型</p>
                    <div className="llm-config-form">
                      <div className="llm-config-row">
                        <input type="text" placeholder="API Base URL (如 https://api.openai.com)" value={llmConfig.baseUrl} onChange={e => setLlmConfig(prev => ({ ...prev, baseUrl: e.target.value }))} className="llm-input url-input" />
                        <input type="password" placeholder="API Key (可选)" value={llmConfig.apiKey} onChange={e => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))} className="llm-input" />
                        <button className="fetch-models-btn" onClick={fetchLlmModels} disabled={llmFetching || !llmConfig.baseUrl}>{llmFetching ? '拉取中...' : '拉取模型'}</button>
                      </div>
                      {llmFetchError && <div className="llm-fetch-error">{llmFetchError}</div>}
                      <div className="llm-config-row">
                        <select className="llm-model-select" value={llmConfig.selectedModel} onChange={e => setLlmConfig(prev => ({ ...prev, selectedModel: e.target.value }))}>
                          <option value="">选择模型</option>
                          {allLlmModels.map(m => <option key={m.id} value={m.id}>{m.name}{m.owned_by ? ` (${m.owned_by})` : ''}</option>)}
                        </select>
                        <input type="text" placeholder="手动输入模型名称" value={llmManualInput} onChange={e => setLlmManualInput(e.target.value)} className="llm-input" />
                        <button className="add-source-btn" onClick={addManualModel} disabled={!llmManualInput.trim()}>{ICONS.plus}</button>
                      </div>
                      {(llmConfig.manualModels || []).length > 0 && (
                        <div className="manual-models-list">
                          {(llmConfig.manualModels || []).map(m => <div key={m.id} className="custom-source-item"><div className="custom-source-info"><span className="custom-source-name">{m.name}</span><span className="custom-source-region">手动</span></div><button className="remove-source-btn" onClick={() => removeManualModel(m.id)}>{ICONS.x}</button></div>)}
                        </div>
                      )}
                      <div className="llm-config-row">
                        <button className="test-llm-btn" onClick={testLlmConnection} disabled={llmTesting || !llmConfig.baseUrl || !llmConfig.selectedModel}>{llmTesting ? '测试中...' : '测试连接'}</button>
                      </div>
                      {llmTestResult && (
                        <div className={`source-verify-result ${llmTestResult.ok ? 'verify-ok' : 'verify-fail'}`}>
                          {llmTestResult.ok ? <>{ICONS.check} 连接成功 ({llmTestResult.model}): {llmTestResult.reply}</> : <>连接失败: {llmTestResult.message}</>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {settingsTab === 'agents' && (
                  <>
                    <div className="setting-item">
                      <label>AI精灵名称</label>
                      <p className="setting-desc">自定义AI精灵在聊天窗口中的显示名称</p>
                      <input 
                        type="text" 
                        value={elfName} 
                        onChange={e => setElfName(e.target.value || 'AI精灵')}
                        placeholder="AI精灵"
                        className="elf-name-input"
                        maxLength={20}
                      />
                    </div>
                    <div className="setting-item">
                      <label>AI精灵头像</label>
                      <p className="setting-desc">自定义AI精灵的头像图片</p>
                      <div className="elf-avatar-setting">
                        <div className="elf-avatar-preview">
                          {elfAvatar ? (
                            <img src={elfAvatar} alt="AI精灵头像" />
                          ) : (
                            <div className="elf-avatar-default">AI</div>
                          )}
                        </div>
                        <div className="elf-avatar-actions">
                          <label htmlFor="elf-avatar-upload" className="elf-avatar-upload-btn">选择图片</label>
                          <input
                            id="elf-avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const base64 = ev.target.result;
                                setElfAvatar(base64);
                                showToast('头像已更新');
                              };
                              reader.readAsDataURL(file);
                            }}
                            style={{ display: 'none' }}
                          />
                          {elfAvatar && (
                            <button
                              className="elf-avatar-reset-btn"
                              onClick={() => {
                                setElfAvatar('');
                                showToast('已恢复默认头像');
                              }}
                            >
                              恢复默认
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="setting-item">
                      <label>Agent管理</label>
                      <p className="setting-desc">选择和管理AI精灵的智能体，每个Agent有不同的专长和提示词</p>
                      <div className="agent-filter-bar">
                        {AGENT_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            className={`agent-filter-btn ${agentFilter === cat ? 'active' : ''}`}
                            onClick={() => setAgentFilter(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="agent-list">
                        {agents.filter(a => agentFilter === '全部' || a.category === agentFilter).map(agent => (
                          <div key={agent.id} className={`agent-card ${currentAgent === agent.id ? 'active' : ''}`}>
                            <div className="agent-card-main">
                              <img src={agent.avatar || '/ai-elf-avatar.png'} alt={agent.name} className="agent-card-avatar" />
                              <div className="agent-card-info">
                                <span className="agent-card-name">{agent.name}</span>
                              <span className="agent-card-desc">{agent.description}</span>
                              <div className="agent-card-tags">
                                <span className="agent-card-category">{agent.category}</span>
                                {(agent.tags || []).map((tag, i) => (
                                  <span key={i} className="agent-card-tag">{tag}</span>
                                ))}
                              </div>
                              </div>
                            </div>
                            <div className="agent-card-actions">
                              <button
                                className={`agent-card-select ${currentAgent === agent.id ? 'selected' : ''}`}
                                onClick={() => setCurrentAgent(agent.id)}
                              >
                                {currentAgent === agent.id ? '使用中' : '选择'}
                              </button>
                              <button
                                className="agent-card-detail-btn"
                                onClick={() => setEditingAgent(agent)}
                              >
                                详情
                              </button>
                              {agent.isCustom && (
                                <button className="agent-card-delete" onClick={() => {
                                  if (confirm(`确定删除Agent「${agent.name}」？`)) {
                                    setAgents(prev => prev.filter(a => a.id !== agent.id));
                                    if (currentAgent === agent.id) setCurrentAgent('analyst');
                                  }
                                }}>
                                  {ICONS.x}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="agent-create-btn" onClick={() => setShowAgentForm(true)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:16,height:16,marginRight:6}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        创建自定义Agent
                      </button>
                    </div>

                    {showAgentForm && (
                      <div className="agent-form-overlay">
                        <div className="agent-form">
                          <div className="agent-form-header">
                            <h4>创建自定义Agent</h4>
                            <button className="agent-form-close" onClick={() => setShowAgentForm(false)}>{ICONS.x}</button>
                          </div>
                          <div className="agent-form-body">
                            <div className="agent-form-avatar-section">
                              <img src={newAgent.avatar || '/ai-elf-avatar.png'} alt="预览" className="agent-form-avatar-preview" />
                              <div className="agent-form-avatar-actions">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id="agent-avatar-upload-new"
                                  className="elf-avatar-file-input"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setNewAgent(prev => ({ ...prev, avatar: ev.target.result }));
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <label htmlFor="agent-avatar-upload-new" className="elf-avatar-upload-btn">选择图片</label>
                                {newAgent.avatar && (
                                  <button className="elf-avatar-reset-btn" onClick={() => setNewAgent(prev => ({ ...prev, avatar: '' }))}>恢复默认</button>
                                )}
                              </div>
                            </div>
                            <label>名称</label>
                            <input
                              type="text"
                              value={newAgent.name}
                              onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="如：产品经理助手"
                              className="agent-form-input"
                            />
                            <label>分类</label>
                            <select
                              value={newAgent.category}
                              onChange={e => setNewAgent(prev => ({ ...prev, category: e.target.value }))}
                              className="agent-form-select"
                            >
                              {AGENT_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <label>描述</label>
                            <input
                              type="text"
                              value={newAgent.description}
                              onChange={e => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="简短描述这个Agent的用途"
                              className="agent-form-input"
                            />
                            <label>标签（逗号分隔）</label>
                            <input
                              type="text"
                              value={(newAgent.tags || []).join(', ')}
                              onChange={e => setNewAgent(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                              placeholder="如：资讯分析, 结构化思维"
                              className="agent-form-input"
                            />
                            <label>系统提示词</label>
                            <textarea
                              value={newAgent.systemPrompt}
                              onChange={e => setNewAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                              placeholder="定义这个Agent的角色、技能和回答风格..."
                              rows={6}
                              className="agent-form-textarea"
                            />
                            <button
                              className="agent-refine-btn"
                              onClick={async () => {
                                if (!newAgent.systemPrompt.trim() || !llmConfig.baseUrl) return;
                                setAgentPromptRefining(true);
                                try {
                                  const res = await fetch('/api/ai-generate', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      baseUrl: llmConfig.baseUrl,
                                      apiKey: llmConfig.apiKey,
                                      model: llmConfig.selectedModel,
                                      action: 'chat',
                                      content: `请帮我优化以下AI Agent的系统提示词，使其更加专业、清晰、有效。保持原意，但让提示词更加精炼有力。直接输出优化后的提示词，不要添加额外说明：

  ${newAgent.systemPrompt}`
                                    })
                                  });
                                  const data = await res.json();
                                  if (data.content) {
                                    setNewAgent(prev => ({ ...prev, systemPrompt: data.content.trim() }));
                                  }
                                } catch (e) {
                                  alert('润色失败: ' + e.message);
                                } finally {
                                  setAgentPromptRefining(false);
                                }
                              }}
                              disabled={agentPromptRefining || !newAgent.systemPrompt.trim() || !llmConfig.baseUrl}
                            >
                              {agentPromptRefining ? '润色中...' : 'AI润色提示词'}
                            </button>
                          </div>
                          <div className="agent-form-footer">
                            <button className="btn-cancel" onClick={() => setShowAgentForm(false)}>取消</button>
                            <button
                              className="btn-save"
                              onClick={() => {
                                if (!newAgent.name.trim() || !newAgent.systemPrompt.trim()) return;
                                const agent = {
                                  id: 'custom-' + Date.now(),
                                  name: newAgent.name.trim(),
                                  description: newAgent.description.trim() || '自定义Agent',
                                  systemPrompt: newAgent.systemPrompt.trim(),
                                  category: newAgent.category,
                                  tags: newAgent.tags || [],
                                  avatar: newAgent.avatar || '',
                                  isDefault: false,
                                  isCustom: true
                                };
                                setAgents(prev => [...prev, agent]);
                                 setNewAgent({ name: '', description: '', systemPrompt: '', category: '分析', tags: [], avatar: '' });
                                setShowAgentForm(false);
                              }}
                              disabled={!newAgent.name.trim() || !newAgent.systemPrompt.trim()}
                            >
                              创建
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Agent详情编辑 */}
                    {editingAgent && (
                      <div className="agent-form-overlay">
                        <div className="agent-form">
                          <div className="agent-form-header">
                            <h4>Agent详情</h4>
                            <button className="agent-form-close" onClick={() => setEditingAgent(null)}>{ICONS.x}</button>
                          </div>
                          <div className="agent-form-body">
                            <div className="agent-form-avatar-section">
                              <img src={editingAgent.avatar || '/ai-elf-avatar.png'} alt={editingAgent.name} className="agent-form-avatar-preview" />
                              <div className="agent-form-avatar-actions">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id="agent-avatar-upload-edit"
                                  className="elf-avatar-file-input"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setEditingAgent(prev => ({ ...prev, avatar: ev.target.result }));
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                <label htmlFor="agent-avatar-upload-edit" className="elf-avatar-upload-btn">选择图片</label>
                                {editingAgent.avatar && (
                                  <button className="elf-avatar-reset-btn" onClick={() => setEditingAgent(prev => ({ ...prev, avatar: '' }))}>恢复默认</button>
                                )}
                              </div>
                            </div>
                            <label>ID</label>
                            <input type="text" value={editingAgent.id} disabled className="agent-form-input" />
                            <label>名称</label>
                            <input
                              type="text"
                              value={editingAgent.name}
                              onChange={e => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                              className="agent-form-input"
                            />
                            <label>描述</label>
                            <input
                              type="text"
                              value={editingAgent.description}
                              onChange={e => setEditingAgent(prev => ({ ...prev, description: e.target.value }))}
                              className="agent-form-input"
                            />
                            <label>分类</label>
                            <select
                              value={editingAgent.category}
                              onChange={e => setEditingAgent(prev => ({ ...prev, category: e.target.value }))}
                              className="agent-form-select"
                            >
                              {AGENT_CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <label>标签（逗号分隔）</label>
                            <input
                              type="text"
                              value={(editingAgent.tags || []).join(', ')}
                              onChange={e => setEditingAgent(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                              placeholder="如：资讯分析, 结构化思维"
                              className="agent-form-input"
                            />
                            <label>系统提示词</label>
                            <textarea
                              value={editingAgent.systemPrompt}
                              onChange={e => setEditingAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                              rows={6}
                              className="agent-form-textarea"
                            />
                          </div>
                          <div className="agent-form-footer">
                            <button className="btn-cancel" onClick={() => setEditingAgent(null)}>取消</button>
                            <button
                              className="btn-save"
                              onClick={() => {
                                setAgents(prev => {
                                  const updated = prev.map(a => a.id === editingAgent.id ? editingAgent : a);
                                  // 保存自定义agents到localStorage
                                  const customAgents = updated.filter(a => a.isCustom);
                                  try {
                                    localStorage.setItem('elfAgents', JSON.stringify(customAgents));
                                  } catch (e) {
                                    console.warn('Failed to save custom agents to localStorage:', e);
                                  }
                                  return updated;
                                });
                                setEditingAgent(null);
                              }}
                            >
                              保存修改
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              </div>
              <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowSettings(false)}>取消</button><button className="btn-save" onClick={() => { loadNews(); setShowSettings(false); }}>保存并刷新</button></div>
            </div>
          </div>

  );
}
