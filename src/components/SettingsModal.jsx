import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS, REGION_MAP, AGENT_CATEGORIES } from '../constants/index.jsx';
import { showToast } from '../utils/toast.js';
import SourcesTab from './settings/SourcesTab.jsx';
import AgentsTab from './settings/AgentsTab.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  getAllTools, subscribeTools, registerCustomHttpTool,
  deleteCustomTool, updateCustomHttpTool, testCustomHttpTool,
  setToolEnabled, getApprovalOverride, setApprovalOverride, subscribeApprovalOverride,
} from '../utils/toolRegistry.js';
import {
  getEgressAllowlist, setEgressAllowlist, subscribeEgressAllowlist,
} from '../utils/sandbox.js';

/* ============ 自定义工具管理面板 ============ */

const EMPTY_TOOL_FORM = {
  name: '',
  label: '',
  description: '',
  method: 'GET',
  url: '',
  headers: 'Accept: application/json',
  bodyTemplate: '',
  jsonPath: '',
  maxBytes: 12000,
};

/** 把多行 headers 文本解析为对象 */
function parseHeaders(text) {
  const headers = {};
  String(text || '').split(/\r?\n/).forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) headers[k] = v;
    }
  });
  return headers;
}

function CustomToolsPanel() {
  const [tools, setTools] = useState(() => getAllTools());
  useEffect(() => subscribeTools(setTools), []);
  const [form, setForm] = useState(EMPTY_TOOL_FORM);
  const [editingName, setEditingName] = useState(null); // 编辑模式下的工具名
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testArgs, setTestArgs] = useState('{}');

  // 自定义工具列表（仅 custom-http）
  const customTools = tools.filter(t => t.source === 'custom-http');

  // 预览自动派生的参数
  const previewParams = useMemo(() => {
    const urlParams = (form.url || '').match(/\{\{(\w+)\}\}/g) || [];
    const bodyParams = (form.bodyTemplate || '').match(/\{\{(\w+)\}\}/g) || [];
    const names = [...new Set([...urlParams.map(p => p.slice(2, -2)), ...bodyParams.map(p => p.slice(2, -2))])];
    return names;
  }, [form.url, form.bodyTemplate]);

  const resetForm = () => {
    setForm(EMPTY_TOOL_FORM);
    setEditingName(null);
    setTestResult(null);
    setTestArgs('{}');
  };

  const handleEdit = (entry) => {
    setForm({
      name: entry.name,
      label: entry.meta?.label || entry.name,
      description: entry.meta?.description || '',
      method: entry.config?.method || 'GET',
      url: entry.config?.url || '',
      headers: Object.entries(entry.config?.headers || {})
        .map(([k, v]) => `${k}: ${v}`).join('\n'),
      bodyTemplate: entry.config?.bodyTemplate || '',
      jsonPath: entry.config?.jsonPath || '',
      maxBytes: entry.config?.maxBytes || 12000,
    });
    setEditingName(entry.name);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) { showToast('请填写工具名', 'warn'); return; }
    if (!form.url.trim()) { showToast('请填写 URL', 'warn'); return; }
    if (!/^https?:\/\//.test(form.url)) { showToast('URL 必须以 http:// 或 https:// 开头', 'warn'); return; }
    const config = {
      method: form.method,
      url: form.url.trim(),
      headers: parseHeaders(form.headers),
      bodyTemplate: form.bodyTemplate.trim(),
      jsonPath: form.jsonPath.trim(),
      maxBytes: Number(form.maxBytes) || 12000,
    };
    const meta = {
      label: form.label.trim() || form.name,
      icon: '🔧',
      description: form.description.trim(),
    };
    try {
      if (editingName) {
        updateCustomHttpTool(editingName, config, meta);
        showToast(`已更新工具：${editingName}`, 'success');
      } else {
        registerCustomHttpTool(form.name.trim(), config, meta);
        showToast(`已创建工具：${form.name}`, 'success');
      }
      resetForm();
    } catch (e) {
      showToast(e.message || '保存失败', 'error');
    }
  };

  const handleDelete = (name) => {
    if (!confirm(`确认删除自定义工具 "${name}"？\n已配置此工具的智能体仍可保留勾选，但工具将不可用。`)) return;
    if (deleteCustomTool(name)) {
      showToast(`已删除工具：${name}`, 'success');
      if (editingName === name) resetForm();
    } else {
      showToast('删除失败（内置工具不可删除）', 'error');
    }
  };

  const handleToggleEnabled = (name, enabled) => {
    setToolEnabled(name, enabled);
  };

  const handleTest = async () => {
    if (!form.url.trim()) { showToast('请填写 URL 后测试', 'warn'); return; }
    let args = {};
    try { args = JSON.parse(testArgs || '{}'); }
    catch { showToast('测试参数 JSON 格式错误', 'error'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const config = {
        method: form.method,
        url: form.url.trim(),
        headers: parseHeaders(form.headers),
        bodyTemplate: form.bodyTemplate.trim(),
        jsonPath: form.jsonPath.trim(),
        maxBytes: Number(form.maxBytes) || 12000,
      };
      const result = await testCustomHttpTool(config, args);
      setTestResult(result);
    } catch (e) {
      setTestResult(`错误：${e.message || String(e)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="custom-tools-panel">
      <div className="custom-tools-intro">
        <strong>自定义 HTTP 工具</strong>
        <p>为智能体注册可调用的 HTTP 工具。URL 和 body 中使用 <code>{'{{param}}'}</code> 占位符自动生成参数 schema，例如 <code>{'https://api.example.com/{{id}}'}</code> 或 <code>{'{"q": "{{keyword}}"}'}</code>。</p>
      </div>

      <div className="custom-tools-layout">
        {/* 左：工具列表 */}
        <div className="custom-tools-list">
          <div className="custom-tools-list-header">
            <span>已注册工具（{customTools.length}）</span>
            <button className="btn-mini" onClick={resetForm}>+ 新建</button>
          </div>
          {customTools.length === 0 && (
            <div className="custom-tools-empty">尚无自定义工具，使用右侧表单创建</div>
          )}
          {customTools.map(entry => (
            <div
              key={entry.name}
              className={`custom-tool-item${editingName === entry.name ? ' is-active' : ''}`}
              onClick={() => handleEdit(entry)}
            >
              <div className="custom-tool-item-row">
                <span className="custom-tool-item-icon">{entry.meta?.icon || '🔧'}</span>
                <span className="custom-tool-item-name">{entry.name}</span>
                <span className={`custom-tool-item-status${entry.enabled ? ' is-on' : ' is-off'}`}>
                  {entry.enabled ? '启用' : '禁用'}
                </span>
              </div>
              <div className="custom-tool-item-meta">
                <span>{entry.meta?.label}</span>
                <span className="custom-tool-item-method">{entry.config?.method} {entry.config?.url?.slice(0, 40)}</span>
              </div>
              <div className="custom-tool-item-actions">
                <button
                  className="btn-mini"
                  onClick={(e) => { e.stopPropagation(); handleToggleEnabled(entry.name, !entry.enabled); }}
                >
                  {entry.enabled ? '禁用' : '启用'}
                </button>
                <button
                  className="btn-mini btn-danger-mini"
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.name); }}
                >删除</button>
              </div>
            </div>
          ))}
        </div>

        {/* 右：表单 */}
        <div className="custom-tool-form">
          <div className="custom-tool-form-row">
            <label>工具名 {editingName && <em>（编辑中）</em>}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="如 github_repo_info，小写字母开头，仅含小写字母/数字/下划线"
              disabled={!!editingName}
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>显示名（label）</label>
            <input
              type="text"
              value={form.label}
              onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="如 GitHub 仓库信息"
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>描述（送给 LLM 的工具说明）</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="如 查询 GitHub 仓库的 stars/forks/issues 信息"
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>HTTP 方法</label>
            <select
              value={form.method}
              onChange={e => setForm(prev => ({ ...prev, method: e.target.value }))}
              className="settings-input"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="custom-tool-form-row">
            <label>URL（支持 <code>{'{{param}}'}</code> 占位符）</label>
            <input
              type="text"
              value={form.url}
              onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="如 https://api.github.com/repos/{{owner}}/{{repo}}"
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>请求头（每行一个，格式 Key: Value）</label>
            <textarea
              value={form.headers}
              onChange={e => setForm(prev => ({ ...prev, headers: e.target.value }))}
              rows={3}
              placeholder="Accept: application/json&#10;Authorization: Bearer xxx"
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>请求体模板（POST/PUT 时使用，支持 <code>{'{{param}}'}</code>）</label>
            <textarea
              value={form.bodyTemplate}
              onChange={e => setForm(prev => ({ ...prev, bodyTemplate: e.target.value }))}
              rows={3}
              placeholder='如 {"q": "{{keyword}}", "limit": 10}'
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>JSON 路径（可选，如 data.items）</label>
            <input
              type="text"
              value={form.jsonPath}
              onChange={e => setForm(prev => ({ ...prev, jsonPath: e.target.value }))}
              placeholder="如 data.items 或 result.list"
              className="settings-input"
            />
          </div>
          <div className="custom-tool-form-row">
            <label>响应最大字节</label>
            <input
              type="number"
              value={form.maxBytes}
              onChange={e => setForm(prev => ({ ...prev, maxBytes: Number(e.target.value) }))}
              min="1000"
              max="50000"
              className="settings-input"
            />
          </div>

          {/* 参数预览 */}
          <div className="custom-tool-params-preview">
            <strong>自动派生参数：</strong>
            {previewParams.length === 0
              ? <span>（无占位符，工具将不接受参数）</span>
              : <code>{previewParams.join(', ')}</code>}
          </div>

          {/* 测试 */}
          <div className="custom-tool-test">
            <label>测试参数（JSON）</label>
            <textarea
              value={testArgs}
              onChange={e => setTestArgs(e.target.value)}
              rows={2}
              placeholder='如 {"owner": "facebook", "repo": "react"}'
              className="settings-input"
            />
            <div className="custom-tool-test-actions">
              <button
                className="btn-secondary"
                onClick={handleTest}
                disabled={testing || !form.url}
              >{testing ? '测试中...' : '试运行'}</button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={!form.name || !form.url}
              >{editingName ? '保存修改' : '创建工具'}</button>
              {editingName && (
                <button className="btn-cancel" onClick={resetForm}>取消编辑</button>
              )}
            </div>
            {testResult != null && (
              <div className="custom-tool-test-result">
                <div className="custom-tool-test-result-label">返回结果：</div>
                <pre>{String(testResult).slice(0, 2000)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 沙箱配置面板 ============ */

function SandboxPanel() {
  // 网络出口白名单
  const [egressList, setEgressList] = useState(() => getEgressAllowlist());
  const [egressInput, setEgressInput] = useState('');
  useEffect(() => subscribeEgressAllowlist(setEgressList), []);

  // 工具审批覆写
  const [tools, setTools] = useState(() => getAllTools());
  const [override, setOverride] = useState(() => getApprovalOverride());
  useEffect(() => subscribeTools(setTools), []);
  useEffect(() => subscribeApprovalOverride(setOverride), []);

  const addEgress = () => {
    const v = egressInput.trim().toLowerCase();
    if (!v) return;
    if (egressList.includes(v)) {
      showToast('域名已在白名单中');
      return;
    }
    const next = [...egressList, v];
    setEgressAllowlist(next);
    setEgressList(next);
    setEgressInput('');
    showToast(`已添加 ${v} 到出口白名单`);
  };
  const removeEgress = (host) => {
    const next = egressList.filter(h => h !== host);
    setEgressAllowlist(next);
    setEgressList(next);
    showToast(`已从白名单移除 ${host}`);
  };
  const clearEgress = () => {
    setEgressAllowlist([]);
    setEgressList([]);
    showToast('已清空出口白名单（放行全部 http/https URL）');
  };

  // 工具审批覆写：三态切换 default / on / off
  const cycleApproval = (name) => {
    const currentDefault = tools.find(t => t.name === name)?.meta?.requiresApproval ?? false;
    const currentValue = override.hasOwnProperty(name) ? override[name] : null;
    // null = 用默认；true = 强制开启；false = 强制关闭
    let next;
    if (currentValue === null) {
      next = !currentDefault; // 切换到与默认相反
    } else if (currentValue === true) {
      next = false;
    } else {
      next = null; // 回到默认
    }
    setApprovalOverride(name, next);
    setOverride(getApprovalOverride());
  };

  const getApprovalState = (name) => {
    const currentDefault = tools.find(t => t.name === name)?.meta?.requiresApproval ?? false;
    if (!override.hasOwnProperty(name)) return { label: `默认${currentDefault ? '（需审批）' : '（直接执行）'}`, state: 'default', effective: currentDefault };
    if (override[name] === true) return { label: '需审批', state: 'on', effective: true };
    return { label: '免审批', state: 'off', effective: false };
  };

  const builtinTools = tools.filter(t => t.source === 'builtin').sort((a, b) => a.name.localeCompare(b.name));
  const customToolList = tools.filter(t => t.source !== 'builtin').sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="sandbox-panel">
      <div className="sandbox-intro">
        <h4>沙箱设定</h4>
        <p>向 Claude Code / OpenClaw 靠齐：限制工作空间读写边界、敏感工具调用前用户审批、网络出口域名白名单。</p>
      </div>

      {/* 网络出口白名单 */}
      <section className="sandbox-section">
        <header className="sandbox-section-head">
          <h5>网络出口白名单</h5>
          <span className="sandbox-badge">{egressList.length} 个域名</span>
        </header>
        <p className="sandbox-section-desc">
          仅当 URL 的 hostname 精确匹配或为下列域名的子域名时，<code>fetch_page</code> 工具才会放行。
          留空 = 放行全部 http/https URL。
        </p>
        <div className="sandbox-egress-input-row">
          <input
            type="text"
            value={egressInput}
            onChange={e => setEgressInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEgress(); } }}
            placeholder="如 openai.com / github.com / *.example.org"
            className="sandbox-egress-input"
          />
          <button type="button" className="sandbox-egress-add-btn" onClick={addEgress}>添加</button>
        </div>
        {egressList.length === 0 ? (
          <p className="sandbox-empty-hint">当前未配置白名单 → 所有 http/https URL 都会放行</p>
        ) : (
          <ul className="sandbox-egress-list">
            {egressList.map(host => (
              <li key={host} className="sandbox-egress-item">
                <code className="sandbox-egress-code">{host}</code>
                <button type="button" className="sandbox-egress-remove" onClick={() => removeEgress(host)} title="移除">×</button>
              </li>
            ))}
          </ul>
        )}
        {egressList.length > 0 && (
          <button type="button" className="sandbox-clear-btn" onClick={clearEgress}>清空白名单（放行全部）</button>
        )}
      </section>

      {/* 工具审批开关 */}
      <section className="sandbox-section">
        <header className="sandbox-section-head">
          <h5>工具调用审批闸门</h5>
          <span className="sandbox-badge">{Object.keys(override).length} 项已覆写</span>
        </header>
        <p className="sandbox-section-desc">
          标记为「需审批」的工具在执行前会暂停 Agent Loop，等你点击允许后才放行。
          点击某项可在 <strong>默认 / 需审批 / 免审批</strong> 三态间循环切换。
        </p>
        <div className="sandbox-tools-list">
          {builtinTools.map(t => {
            const state = getApprovalState(t.name);
            return (
              <div key={t.name} className={`sandbox-tool-row sandbox-tool-state-${state.state}`}>
                <span className="sandbox-tool-icon">{t.meta?.icon || '⚙️'}</span>
                <span className="sandbox-tool-name">{t.name}</span>
                <span className="sandbox-tool-label">{t.meta?.label || ''}</span>
                <button
                  type="button"
                  className={`sandbox-approval-toggle sandbox-approval-${state.state}`}
                  onClick={() => cycleApproval(t.name)}
                  title="点击切换 默认 / 需审批 / 免审批"
                >
                  {state.label}
                </button>
              </div>
            );
          })}
          {customToolList.length > 0 && (
            <>
              <div className="sandbox-tools-group-label">自定义工具</div>
              {customToolList.map(t => {
                const state = getApprovalState(t.name);
                return (
                  <div key={t.name} className={`sandbox-tool-row sandbox-tool-state-${state.state}`}>
                    <span className="sandbox-tool-icon">{t.meta?.icon || '⚙️'}</span>
                    <span className="sandbox-tool-name">{t.name}</span>
                    <span className="sandbox-tool-label">{t.meta?.label || ''}</span>
                    <button
                      type="button"
                      className={`sandbox-approval-toggle sandbox-approval-${state.state}`}
                      onClick={() => cycleApproval(t.name)}
                      title="点击切换 默认 / 需审批 / 免审批"
                    >
                      {state.label}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <p className="sandbox-section-desc" style={{ marginTop: '8px' }}>
          提示：默认配置为 <code>write_workspace_file / fetch_page / execute_command</code> 等高敏感工具需审批；
          会话内点击「本会话免问」后该工具在当前会话内免再问。
        </p>
      </section>
    </div>
  );
}

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
