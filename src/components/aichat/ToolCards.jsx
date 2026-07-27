import React, { useState } from 'react';

/* 工具元信息：友好名称 + 简短图标，用于工具调用卡片展示 */
const TOOL_META = {
  read_workspace_file: { label: '读取文件', icon: '📄' },
  write_workspace_file: { label: '写入文件', icon: '✍️' },
  search_news: { label: '检索资讯', icon: '🔍' },
  web_search: { label: '联网搜索', icon: '🔎' },
  fetch_page: { label: '抓取网页', icon: '🌐' },
  get_stock_quote: { label: '股票行情', icon: '📈' },
  get_stock_kline: { label: 'K 线数据', icon: '📊' },
};

function summarizeArgs(name, args) {
  try {
    const a = args || {};
    if (name === 'read_workspace_file' || name === 'write_workspace_file') return a.path || '';
    if (name === 'search_news') return a.keyword || '';
    if (name === 'web_search') return a.query || a.keyword || '';
    if (name === 'fetch_page') return a.url || '';
    if (name === 'get_stock_quote' || name === 'get_stock_kline') return a.code || '';
    return JSON.stringify(a);
  } catch { return ''; }
}

/* 工具调用卡片：展示工具名 / 参数摘要 / 状态 / 可展开结果 */
export function ToolCallCard({ tc }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[tc.name] || { label: tc.name, icon: '⚙️' };
  const summary = summarizeArgs(tc.name, tc.args);
  const isRunning = tc.status === 'running';
  // 检测工具结果是否为错误（约定：以"错误："或"工具执行失败"开头）
  const isError = !isRunning && typeof tc.result === 'string' &&
    /^(错误：|工具执行失败)/.test(tc.result.trim());
  const statusLabel = isRunning ? '执行中…' : (isError ? '出错' : '已完成');
  const statusClass = isError ? 'error' : tc.status;
  return (
    <div className={`tool-call tool-call-${statusClass}`}>
      <div className="tool-call-header" onClick={() => setExpanded(v => !v)} role="button" tabIndex={0}>
        <span className="tool-call-icon">{meta.icon}</span>
        <span className="tool-call-name">{meta.label}</span>
        {summary && <span className="tool-call-arg-summary" title={summary}>{summary}</span>}
        <span className={`tool-call-status tool-call-status-${statusClass}`}>
          {statusLabel}
        </span>
        <span className={`tool-call-chevron${expanded ? ' is-open' : ''}`}>▾</span>
      </div>
      {expanded && (
        <div className="tool-call-body">
          <div className="tool-call-section">
            <div className="tool-call-section-label">参数</div>
            <pre className="tool-call-args">{JSON.stringify(tc.args || {}, null, 2)}</pre>
          </div>
          {tc.result && (
            <div className="tool-call-section">
              <div className="tool-call-section-label">返回结果</div>
              <pre className={`tool-call-result${isError ? ' tool-call-result-error' : ''}`}>{tc.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 沙箱审批卡片：工具调用前展示，用户决策 Allow once / Allow always / Deny */
const APPROVAL_TOOL_META = {
  read_workspace_file: { label: '读取文件', icon: '📄' },
  write_workspace_file: { label: '写入文件', icon: '✍️' },
  fetch_page: { label: '抓取网页', icon: '🌐' },
  web_search: { label: '联网搜索', icon: '🔎' },
  execute_command: { label: '执行命令', icon: '⌨️' },
};

export function ApprovalCard({ approval, onRespond }) {
  const { id, request } = approval;
  const meta = APPROVAL_TOOL_META[request.toolName] || { label: request.toolName, icon: '⚙️' };
  const argsPreview = request.summary || JSON.stringify(request.args || {}).slice(0, 120);
  return (
    <div className="approval-card">
      <div className="approval-card-header">
        <span className="approval-card-icon">{meta.icon}</span>
        <span className="approval-card-title">沙箱审批请求</span>
        <span className="approval-card-tool">{meta.label}</span>
      </div>
      <div className="approval-card-body">
        <div className="approval-card-row">
          <span className="approval-card-label">工具：</span>
          <code className="approval-card-code">{request.toolName}</code>
        </div>
        {argsPreview && (
          <div className="approval-card-row">
            <span className="approval-card-label">参数：</span>
            <code className="approval-card-code">{argsPreview}</code>
          </div>
        )}
        {request.agentName && (
          <div className="approval-card-row">
            <span className="approval-card-label">智能体：</span>
            <span className="approval-card-text">{request.agentName}</span>
          </div>
        )}
        <div className="approval-card-hint">
          工具调用前需要你确认。点「允许」本次会话内同工具免再问。
        </div>
      </div>
      <div className="approval-card-actions">
        <button type="button" className="approval-btn approval-btn-once" onClick={() => onRespond(id, 'allow-once')}>
          允许一次
        </button>
        <button type="button" className="approval-btn approval-btn-always" onClick={() => onRespond(id, 'allow-always')}>
          本会话免问
        </button>
        <button type="button" className="approval-btn approval-btn-deny" onClick={() => onRespond(id, 'deny')}>
          拒绝
        </button>
      </div>
    </div>
  );
}
