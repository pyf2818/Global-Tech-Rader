// 沙箱配置面板：网络出口白名单 + 工具审批闸门
// 从 SettingsModal.jsx 抽离，独立函数组件无外部 props 依赖
import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast.js';
import {
  getAllTools, subscribeTools,
  getApprovalOverride, setApprovalOverride, subscribeApprovalOverride,
} from '../../utils/toolRegistry.js';
import {
  getEgressAllowlist, setEgressAllowlist, subscribeEgressAllowlist,
} from '../../utils/sandbox.js';

export default function SandboxPanel() {
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
