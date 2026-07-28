// 自定义 HTTP 工具管理面板
// 从 SettingsModal.jsx 抽离，独立函数组件无外部 props 依赖
import React, { useState, useEffect, useMemo } from 'react';
import { showToast } from '../../utils/toast.js';
import {
  getAllTools, subscribeTools, registerCustomHttpTool,
  deleteCustomTool, updateCustomHttpTool, testCustomHttpTool,
  setToolEnabled,
} from '../../utils/toolRegistry.js';

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

export default function CustomToolsPanel() {
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
