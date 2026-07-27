import { useState, useMemo, useCallback, useEffect } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';

const DEFAULT_LLM_CONFIG = {
  baseUrl: '',
  apiKey: '',
  selectedModel: '',
  manualModels: [],
  provider: 'custom',
  tavilyKey: '', // 联网搜索 Tavily API Key（可选，未填则自动 fallback 到 DuckDuckGo 免费搜索）
};

const CONFIG_KEY = 'llmConfig';
const PRESETS_KEY = 'llmPresets:v1';
const ACTIVE_KEY = 'llmActivePreset:v1';

function createPresetId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizePreset(preset = {}) {
  return {
    id: preset.id || createPresetId(),
    name: String(preset.name || preset.selectedModel || '未命名模型').trim(),
    provider: preset.provider || 'custom',
    baseUrl: preset.baseUrl || '',
    apiKey: preset.apiKey || '',
    selectedModel: preset.selectedModel || '',
    manualModels: Array.isArray(preset.manualModels) ? preset.manualModels : [],
    updatedAt: Date.now(),
  };
}

function loadConfig() {
  return { ...DEFAULT_LLM_CONFIG, ...loadLS(CONFIG_KEY, DEFAULT_LLM_CONFIG) };
}

function loadPresets() {
  const presets = loadLS(PRESETS_KEY, []);
  return Array.isArray(presets) ? presets.map(normalizePreset) : [];
}

export function useLlmConfig() {
  const [llmConfig, setLlmConfig] = useState(loadConfig);
  const [llmPresets, setLlmPresets] = useState(loadPresets);
  const [activePresetId, setActivePresetId] = useState(() => loadLS(ACTIVE_KEY, null));
  const [llmModels, setLlmModels] = useState([]);
  const [llmFetching, setLlmFetching] = useState(false);
  const [llmFetchError, setLlmFetchError] = useState('');
  const [llmTestResult, setLlmTestResult] = useState(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmManualInput, setLlmManualInput] = useState('');
  const [showLlmQuickConfig, setShowLlmQuickConfig] = useState(false);

  const allLlmModels = useMemo(() => {
    const models = [...llmModels, ...(llmConfig.manualModels || [])];
    if (llmConfig.selectedModel && !models.some(model => model.id === llmConfig.selectedModel)) {
      models.push({ id: llmConfig.selectedModel, name: llmConfig.selectedModel });
    }
    return models;
  }, [llmModels, llmConfig.manualModels, llmConfig.selectedModel]);

  useEffect(() => { saveLS(CONFIG_KEY, llmConfig); }, [llmConfig]);
  useEffect(() => { saveLS(PRESETS_KEY, llmPresets); }, [llmPresets]);
  useEffect(() => { saveLS(ACTIVE_KEY, activePresetId); }, [activePresetId]);

  const upsertPreset = useCallback((preset, options = {}) => {
    if (!preset?.name && !preset?.selectedModel) return null;
    const draft = normalizePreset(preset);
    let savedId = draft.id;

    setLlmPresets(prev => {
      const idx = prev.findIndex(item => item.id === draft.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...draft, id: next[idx].id };
        savedId = next[idx].id;
        if (options.activate) setActivePresetId(savedId);
        return next;
      }

      if (options.activate) setActivePresetId(savedId);
      return [...prev, draft];
    });

    return savedId;
  }, []);

  const removePreset = useCallback((id) => {
    setLlmPresets(prev => prev.filter(preset => preset.id !== id));
    setActivePresetId(prev => (prev === id ? null : prev));
  }, []);

  const activatePreset = useCallback((preset) => {
    if (!preset) return;
    const normalized = normalizePreset(preset);
    setActivePresetId(normalized.id);
    setLlmConfig(prev => ({
      ...prev,
      provider: normalized.provider,
      baseUrl: normalized.baseUrl,
      apiKey: normalized.apiKey,
      selectedModel: normalized.selectedModel,
      manualModels: normalized.manualModels,
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
