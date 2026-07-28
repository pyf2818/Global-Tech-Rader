import { ICONS } from '../../constants/index.jsx';

/**
 * SettingsModal > 大模型 Tab
 * - OpenAI 兼容 API 配置（Base URL / Key / 模型列表 / 测试连接）
 * - Tavily API Key（联网搜索，留空时 fallback DuckDuckGo）
 */
export default function LlmTab({
  llmConfig,
  setLlmConfig,
  llmFetching,
  llmFetchError,
  allLlmModels,
  llmManualInput,
  setLlmManualInput,
  addManualModel,
  removeManualModel,
  fetchLlmModels,
  testLlmConnection,
  llmTesting,
  llmTestResult,
}) {
  return (
    <>
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
    </>
  );
}
