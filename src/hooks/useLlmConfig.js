// useLlmConfig - LLM 配置与模型管理
// 支持多套 provider 预设：保存/切换/删除，当前激活的一套同步到 llmConfig 供全局使用。

import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';

const DEFAULT_LLM_CONFIG = { baseUrl: '', apiKey: '', selectedModel: '', manualModels: [], provider: '' };

const PRESETS_KEY = 'llmPresets:v1';
const ACTIVE_KEY = 'llmActivePreset:v1';

function loadPresets() {
  return loadLS(PRESETS_KEY, []);
}
function loadActiveId() {
  return loadLS(ACTIVE_KEY, null);
}

export function useLlmConfig() {
  const [llmConfig, setLlmConfig] = useState(() => loadLS('llmConfig', DEFAULT_LLM_CONFIG));
  const [llmPresets, setLlmPresets] = useState(loadPresets);
  const [activePresetId, setActivePresetId] = useState(loadActiveId);
  const [llmModels, setLlmModels] = useState([]);
  const [llmFetching, setLlmFetching] = useState(false);
  const [llmFetchError, setLlmFetchError] = useState('');
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmManualInput, setLlmManualInput] = useState('');
  const [showLlmQuickConfig, setShowLlmQuickConfig] = useState(false);

  const allLlmModels = useMemo(
    () => [...llmModels, ...(llmConfig.manualModels || [])],
    [llmModels, llmConfig.manualModels]
  );

  // 预设持久化
  useEffect(() => { saveLS(PRESETS_KEY, llmPresets); }, [llmPresets]);
  useEffect(() => { saveLS(ACTIVE_KEY, activePresetId); }, [activePresetId]);

  // 新增/更新预设（同 name 视为更新）
  const upsertPreset = useCallback((preset) => {
    if (!preset?.name) return;
    setLlmPresets(prev => {
      const idx = prev.findIndex(p => p.id === preset.id || p.name === preset.name);
      const enriched = { id: preset.id || `p_${Date.now().toString(36)}`, ...preset };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...enriched };
        return next;
      }
      return [...prev, enriched];
    });
  }, []);

  const removePreset = useCallback((id) => {
    setLlmPresets(prev => prev.filter(p => p.id !== id));
    setActivePresetId(prev => (prev === id ? null : prev));
  }, []);

  // 切换激活预设：同步到 llmConfig
  const activatePreset = useCallback((preset) => {
    if (!preset) return;
    setActivePresetId(preset.id);
    setLlmConfig(prev => ({
      ...prev,
      provider: preset.provider || 'custom',
      baseUrl: preset.baseUrl || '',
      apiKey: preset.apiKey || '',
      selectedModel: preset.selectedModel || '',
      manualModels: preset.manualModels || [],
    }));
    setLlmModels([]);
    setLlmTestResult(null);
  }, []);

  return {
    llmConfig, setLlmConfig,
    llmPresets, setLlmPresets, upsertPreset, removePreset, activatePreset,
    activePresetId, setActivePresetId,
    llmModels, setLlmModels,
    llmFetching, setLlmFetching,
    llmFetchError, setLlmFetchError,
    llmTestResult, setLlmTestResult,
    llmTesting, setLlmTesting,
    llmManualInput, setLlmManualInput,
    showLlmQuickConfig, setShowLlmQuickConfig,
    allLlmModels,
  };
}
