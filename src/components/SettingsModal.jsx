import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS, REGION_MAP, AGENT_CATEGORIES } from '../constants/index.jsx';
import { showToast } from '../utils/toast.js';
import SourcesTab from './settings/SourcesTab.jsx';
import AgentsTab from './settings/AgentsTab.jsx';
import CustomToolsPanel from './settings/CustomToolsPanel.jsx';
import SandboxPanel from './settings/SandboxPanel.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
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
  sourceDiscoveryUrl, setSourceDiscoveryUrl, sourceDiscoveryState, discoverSource, addDiscoveredSource,
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
  const [showSourceAdvanced, setShowSourceAdvanced] = React.useState(false);
  const { t } = useTranslation();

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
                  <button className={`settings-nav-item ${settingsTab === 'tools' ? 'active' : ''}`} onClick={() => setSettingsTab('tools')}>自定义工具</button>
                  <button className={`settings-nav-item ${settingsTab === 'sandbox' ? 'active' : ''}`} onClick={() => setSettingsTab('sandbox')}>沙箱</button>
                </div>
                <div className={`settings-content ${settingsTab === 'sources' && !showSourceAdvanced ? 'sources-simple-mode' : ''}`}>
                {settingsTab === 'general' && (
                  <>
                    <div className="setting-item">
                      <label>{t('settings.general.language')}</label>
                      <p className="setting-desc">{t('settings.general.languageDesc')}</p>
                      <div style={{ marginTop: 8 }}>
                        <LanguageSwitcher variant="full" />
                      </div>
                    </div>
                    <div className="setting-item"><label>关键词屏蔽</label><textarea value={blocked} onChange={e => setBlocked(e.target.value)} placeholder="输入屏蔽词，逗号分隔" /><p className="setting-note">已过滤 {stats.blockedCount} 条资讯</p></div>
                  </>
                )}

                {settingsTab === 'sources' && (
                  <SourcesTab
                    allSources={allSources}
                    customSources={customSources}
                    setCustomSources={setCustomSources}
                    disabledSources={disabledSources}
                    setDisabledSources={setDisabledSources}
                    sourceHealth={sourceHealth}
                    setSourceHealth={setSourceHealth}
                    sourceGrades={sourceGrades}
                    newSource={newSource}
                    setNewSource={setNewSource}
                    editingSource={editingSource}
                    setEditingSource={setEditingSource}
                    showSourceForm={showSourceForm}
                    setShowSourceForm={setShowSourceForm}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    customSourceFilter={customSourceFilter}
                    setCustomSourceFilter={setCustomSourceFilter}
                    regionFilter={regionFilter}
                    setRegionFilter={setRegionFilter}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    gradeFilter={gradeFilter}
                    setGradeFilter={setGradeFilter}
                    sourceTypeTab={sourceTypeTab}
                    setSourceTypeTab={setSourceTypeTab}
                    sourceFilter={sourceFilter}
                    setSourceFilter={setSourceFilter}
                    sourceDiscoveryUrl={sourceDiscoveryUrl}
                    setSourceDiscoveryUrl={setSourceDiscoveryUrl}
                    sourceDiscoveryState={sourceDiscoveryState}
                    discoverSource={discoverSource}
                    addDiscoveredSource={addDiscoveredSource}
                    verifyAllSources={verifyAllSources}
                    verifyingAllSources={verifyingAllSources}
                    verifySingleSource={verifySingleSource}
                    allSourcesVerifyResults={allSourcesVerifyResults}
                    setAllSourcesVerifyResults={setAllSourcesVerifyResults}
                    autoMonitorEnabled={autoMonitorEnabled}
                    setAutoMonitorEnabled={setAutoMonitorEnabled}
                    monitorInterval={monitorInterval}
                    setMonitorInterval={setMonitorInterval}
                    monitorAlerts={monitorAlerts}
                    clearAlerts={clearAlerts}
                    truncateUrl={truncateUrl}
                    truncateText={truncateText}
                    getSourceHealthIndicator={getSourceHealthIndicator}
                    showSourceAdvanced={showSourceAdvanced}
                    setShowSourceAdvanced={setShowSourceAdvanced}
                  />
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

                {settingsTab === 'llm' && (
                  <div className="setting-item">
                    <label>联网搜索（Tavily API Key）</label>
                    <p className="setting-desc">
                      Agent 调用 web_search 工具时优先用 Tavily（每月 1000 次免费，<a href="https://tavily.com" target="_blank" rel="noreferrer">tavily.com</a> 注册）。
                      未填写时自动 fallback 到 DuckDuckGo 免费搜索（无需注册）。
                    </p>
                    <div className="llm-config-form">
                      <div className="llm-config-row">
                        <input
                          type="password"
                          placeholder="Tavily API Key（可选，留空使用 DuckDuckGo 免费搜索）"
                          value={llmConfig.tavilyKey || ''}
                          onChange={e => setLlmConfig(prev => ({ ...prev, tavilyKey: e.target.value }))}
                          className="llm-input"
                          autoComplete="off"
                        />
                        {(llmConfig.tavilyKey || '').trim() && (
                          <button
                            className="fetch-models-btn"
                            onClick={() => setLlmConfig(prev => ({ ...prev, tavilyKey: '' }))}
                            title="清空 Tavily Key"
                          >清空</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'agents' && (
                  <AgentsTab
                    elfName={elfName}
                    setElfName={setElfName}
                    elfAvatar={elfAvatar}
                    setElfAvatar={setElfAvatar}
                    agents={agents}
                    setAgents={setAgents}
                    currentAgent={currentAgent}
                    setCurrentAgent={setCurrentAgent}
                    agentFilter={agentFilter}
                    setAgentFilter={setAgentFilter}
                    editingAgent={editingAgent}
                    setEditingAgent={setEditingAgent}
                    showAgentForm={showAgentForm}
                    setShowAgentForm={setShowAgentForm}
                    newAgent={newAgent}
                    setNewAgent={setNewAgent}
                    agentPromptRefining={agentPromptRefining}
                    setAgentPromptRefining={setAgentPromptRefining}
                    llmConfig={llmConfig}
                  />
                )}

                {settingsTab === 'tools' && (
                  <CustomToolsPanel />
                )}

                {settingsTab === 'sandbox' && (
                  <SandboxPanel />
                )}
              </div>
              </div>
              <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowSettings(false)}>取消</button><button className="btn-save" onClick={() => { loadNews(); setShowSettings(false); }}>保存并刷新</button></div>
            </div>
          </div>

  );
}
