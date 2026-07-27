import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS, REGION_MAP, AGENT_CATEGORIES } from '../constants/index.jsx';
import { showToast } from '../utils/toast.js';
import SourceOpsPanel from './SourceOpsPanel.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  getAllTools, subscribeTools, registerCustomHttpTool,
  deleteCustomTool, updateCustomHttpTool, testCustomHttpTool,
  setToolEnabled, getApprovalOverride, setApprovalOverride, subscribeApprovalOverride,
} from '../utils/toolRegistry.js';
import {
  getEgressAllowlist, setEgressAllowlist, subscribeEgressAllowlist,
} from '../utils/sandbox.js';

/* 工具勾选区块：在新建/编辑 Agent 表单中复用。
 * 动态从 toolRegistry 取值（含自定义工具），subscribeTools 自动同步。 */
function AgentToolsSelector({ value, onChange }) {
  const [tools, setTools] = useState(() => getAllTools());
  useEffect(() => subscribeTools(setTools), []);
  const selected = Array.isArray(value) ? value : [];
  const toggle = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter(n => n !== name));
    } else {
      onChange([...selected, name]);
    }
  };
  // 内置工具在前，自定义工具在后
  const sorted = [...tools].sort((a, b) => {
    if (a.source === 'builtin' && b.source !== 'builtin') return -1;
    if (a.source !== 'builtin' && b.source === 'builtin') return 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <div className="agent-form-tools">
      <label>可用工具（勾选后该智能体将走 Agent Loop 模式，可主动调用工具）</label>
      <div className="agent-form-tools-grid">
        {sorted.map(entry => {
          const fn = entry.schema.function;
          const checked = selected.includes(fn.name);
          const isCustom = entry.source !== 'builtin';
          return (
            <label key={fn.name} className={`agent-tool-chip${checked ? ' is-checked' : ''}${isCustom ? ' is-custom' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(fn.name)}
              />
              <span className="agent-tool-chip-icon">{entry.meta?.icon || '⚙️'}</span>
              <span className="agent-tool-chip-name">{fn.name}</span>
              <span className="agent-tool-chip-desc">{fn.description?.slice(0, 40) || ''}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
                  <>
                    <div className="source-strategy-panel">
                      <div>
                        <span>Source Intelligence</span>
                        <strong>信息源不是堆数量，而是控制质量、覆盖和稳定性</strong>
                        <p>建议采用 RSSHub 扩展非标准来源、feedfinder 思路自动发现站点 RSS、Readability/Mercury Parser 思路抽正文与首图，再用健康检测和来源等级决定展示权重。</p>
                      </div>
                      <button onClick={() => verifyAllSources()} disabled={verifyingAllSources}>
                        {verifyingAllSources ? '检测中...' : '检测源健康'}
                      </button>
                    </div>

                    <SourceOpsPanel
                      allSources={allSources}
                      customSources={customSources}
                      disabledSources={disabledSources}
                      sourceHealth={sourceHealth}
                      setSourceTypeTab={setSourceTypeTab}
                      setGradeFilter={setGradeFilter}
                      setStatusFilter={setStatusFilter}
                      setCustomSourceFilter={setCustomSourceFilter}
                      sourceDiscoveryUrl={sourceDiscoveryUrl}
                      setSourceDiscoveryUrl={setSourceDiscoveryUrl}
                      sourceDiscoveryState={sourceDiscoveryState}
                      discoverSource={discoverSource}
                      addDiscoveredSource={addDiscoveredSource}
                      verifyAllSources={verifyAllSources}
                      verifyingAllSources={verifyingAllSources}
                    />

                    <div className="source-simplify-toggle">
                      <button type="button" onClick={() => setShowSourceAdvanced(prev => !prev)}>
                        {showSourceAdvanced ? '收起高级管理' : '展开高级管理'}
                      </button>
                      <p>默认只保留关键操作，复杂筛选和完整列表放在高级区。</p>
                    </div>

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
                          <AgentToolsSelector
                            value={newAgent.tools}
                            onChange={(tools) => setNewAgent(prev => ({ ...prev, tools }))}
                          />
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
                                  tools: Array.isArray(newAgent.tools) ? newAgent.tools : [],
                                  isDefault: false,
                                  isCustom: true
                                };
                                setAgents(prev => [...prev, agent]);
                                 setNewAgent({ name: '', description: '', systemPrompt: '', category: '分析', tags: [], avatar: '', tools: [] });
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
                            <AgentToolsSelector
                              value={editingAgent.tools}
                              onChange={(tools) => setEditingAgent(prev => ({ ...prev, tools }))}
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
