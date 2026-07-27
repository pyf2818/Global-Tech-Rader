import React, { useState } from 'react';

/* 工具元信息：友好名称 + 简短图标，与 AiChatPanel 内保持一致 */
const TOOL_META = {
  read_workspace_file: { label: '读取文件', icon: '📄' },
  write_workspace_file: { label: '写入文件', icon: '✍️' },
  search_news: { label: '检索资讯', icon: '🔍' },
  fetch_page: { label: '抓取网页', icon: '🌐' },
  get_stock_quote: { label: '股票行情', icon: '📈' },
  get_stock_kline: { label: 'K 线数据', icon: '📊' },
};

function summarizeToolArgs(name, args) {
  try {
    const a = args || {};
    if (name === 'read_workspace_file' || name === 'write_workspace_file') return a.path || '';
    if (name === 'search_news') return a.keyword || '';
    if (name === 'fetch_page') return a.url || '';
    if (name === 'get_stock_quote' || name === 'get_stock_kline') return a.code || '';
    return JSON.stringify(a);
  } catch { return ''; }
}

/* AiElf 内联工具调用卡片：可展开查看参数与返回结果 */
export function ElfToolCallCard({ tc, meta, summary, statusLabel, statusClass, isError }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`tool-call tool-call-${statusClass}`}>
      <div className="tool-call-header" onClick={() => setExpanded(v => !v)} role="button" tabIndex={0}>
        <span className="tool-call-icon">{meta.icon}</span>
        <span className="tool-call-name">{meta.label}</span>
        {summary && <span className="tool-call-arg-summary" title={summary}>{summary}</span>}
        <span className={`tool-call-status tool-call-status-${statusClass}`}>{statusLabel}</span>
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

export { TOOL_META, summarizeToolArgs };
