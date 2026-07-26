import { ICONS, LLM_PRESETS } from '../constants/index.jsx';

export default function LlmQuickConfigModal({
  showLlmQuickConfig,
  setShowLlmQuickConfig,
  llmConfig,
  setLlmConfig,
  allLlmModels,
  fetchLlmModels,
  llmFetching,
  llmFetchError,
  llmTestResult,
  llmTesting,
  handleSelectPreset,
  handleQuickSave,
  handleQuickTest,
  llmPresets,
  activePresetId,
  activatePreset,
  removePreset,
  upsertPreset,
  llmPresetName,
  setLlmPresetName,
}) {
  if (!showLlmQuickConfig) return null;
  return (
    <div className="modal-overlay llm-config-overlay" onClick={() => setShowLlmQuickConfig(false)}>
      <div className="llm-config-modal" onClick={e => e.stopPropagation()}>
        <div className="llm-config-header">
          <div className="llm-config-title">
            <div>
              <h3>大模型配置</h3>
              <p>选择服务商并填入凭证，开启 AI 智能助手</p>
            </div>
          </div>
          <button className="llm-config-close" onClick={() => setShowLlmQuickConfig(false)} aria-label="关闭">{ICONS.x}</button>
        </div>

        <div className="llm-config-body">
          <div className="llm-provider-grid">
            {LLM_PRESETS.map(preset => (
              <button
                key={preset.id}
                className={`llm-provider-card ${llmConfig.provider === preset.id ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                <span className="provider-card-badge" aria-hidden="true">{preset.abbrev}</span>
                <span className="provider-card-name">{preset.name}</span>
                <span className="provider-card-tag">{preset.id === 'custom' ? '自定义' : '云端'}</span>
              </button>
            ))}
          </div>

          <div className="llm-config-fields">
            <div className="llm-field">
              <div className="llm-field-head">
                <label>已保存模型</label>
              </div>
              <div className="llm-saved-row">
                <select
                  className="llm-model-select"
                  value={activePresetId || ''}
                  onChange={e => {
                    const preset = llmPresets.find(item => item.id === e.target.value);
                    if (preset) activatePreset(preset);
                  }}
                >
                  <option value="">选择已保存配置</option>
                  {llmPresets.map(preset => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="llm-fetch-btn"
                  onClick={() => {
                    const preset = llmPresets.find(item => item.id === activePresetId);
                    if (preset) activatePreset(preset);
                  }}
                  disabled={!activePresetId}
                >
                  套用
                </button>
              </div>
            </div>

            <div className="llm-field">
              <label>服务商</label>
              <select
                className="llm-model-select"
                value={llmConfig.provider}
                onChange={e => {
                  const preset = LLM_PRESETS.find(item => item.id === e.target.value);
                  if (preset) handleSelectPreset(preset);
                }}
              >
                {LLM_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            </div>

            <div className="llm-field">
              <label>API Base URL</label>
              <input
                type="text"
                placeholder={llmConfig.provider === 'custom' ? 'https://...' : '已自动填充'}
                value={llmConfig.baseUrl}
                onChange={e => setLlmConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                className="llm-input"
              />
            </div>

            <div className="llm-field">
              <label>API Key</label>
              <input
                type="password"
                placeholder={LLM_PRESETS.find(p => p.id === llmConfig.provider)?.placeholder || 'sk-...'}
                value={llmConfig.apiKey}
                onChange={e => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                className="llm-input"
              />
            </div>

            <div className="llm-field">
              <div className="llm-field-head">
                <label>选择模型</label>
                <button type="button" className="llm-fetch-btn" onClick={fetchLlmModels} disabled={!llmConfig.baseUrl || llmFetching}>{llmFetching ? '拉取中...' : '拉取模型列表'}</button>
              </div>
              {llmFetchError ? <p className="llm-fetch-error">{llmFetchError}</p> : null}
              <select
                className="llm-model-select"
                value={llmConfig.selectedModel}
                onChange={e => setLlmConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
              >
                <option value="">选择模型</option>
                {allLlmModels.map(m => (
                  <option key={m.id} value={m.id}>{m.name}{m.owned_by ? ` (${m.owned_by})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {llmTestResult && (
            <div className={`llm-test-result ${llmTestResult.ok ? 'success' : 'fail'}`}>
              {llmTestResult.ok ? (
                <><span className="result-icon">{ICONS.check}</span> 连接成功 ({llmTestResult.model}): {llmTestResult.reply}</>
              ) : (
                <><span className="result-icon">⚠</span> 连接失败：{llmTestResult.message}</>
              )}
            </div>
          )}
        </div>

        <div className="llm-config-footer">
          <select className="llm-preset-select" value={activePresetId || ''} onChange={e => { const p = llmPresets.find(x => x.id === e.target.value); if (p) activatePreset(p); }} title="切换已保存预设">
            <option value="">切换预设...</option>
            {llmPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {activePresetId ? <button type="button" className="llm-btn-preset-del" onClick={() => { removePreset(activePresetId); }} title="删除当前激活的预设">删除预设</button> : null}
          <input className="llm-preset-name-input" type="text" placeholder="预设名称（可选）" value={llmPresetName} onChange={e => setLlmPresetName(e.target.value)} />
          <button className="llm-btn-secondary" onClick={() => setShowLlmQuickConfig(false)}>取消</button>
          <button
            type="button"
            className="llm-btn-preset-save"
            disabled={!llmConfig.baseUrl}
            onClick={() => {
              const fallback = (LLM_PRESETS.find(p => p.id === llmConfig.provider)?.name || '自定义') + '-' + (llmConfig.selectedModel || 'model').slice(0, 10);
              const name = llmPresetName.trim() || fallback;
              upsertPreset({ id: llmPresetName.trim() ? undefined : activePresetId || undefined, name, provider: llmConfig.provider || 'custom', baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, selectedModel: llmConfig.selectedModel, manualModels: llmConfig.manualModels || [] }, { activate: true });
              setLlmPresetName('');
            }}
            title="把当前配置保存为命名预设，方便下次一键切换"
          >另存为预设</button>
          <button
            className="llm-btn-test"
            onClick={handleQuickTest}
            disabled={llmTesting || !llmConfig.baseUrl || !llmConfig.selectedModel}
          >
            {llmTesting ? '测试中...' : '测试连接'}
          </button>
          <button
            className="llm-btn-primary"
            onClick={handleQuickSave}
            disabled={!llmConfig.baseUrl || !llmConfig.selectedModel}
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
