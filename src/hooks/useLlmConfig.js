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

export function useLlmConfig({ LLM_PRESETS = [], onQuickSaveSuccess } = {}) {
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
  const [llmPresetName, setLlmPresetName] = useState('');

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

  function fetchLlmModels() {
    if (!llmConfig.baseUrl) return;
    setLlmFetching(true);
    setLlmFetchError('');
    const params = new URLSearchParams({ baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey });
    fetch(`/api/llm-models?${params}`).then(r => r.json()).then(d => {
      if (d.ok) {
        setLlmModels(d.models || []);
      } else {
        setLlmFetchError(d.message || 'Failed to fetch models');
        setLlmModels([]);
      }
    }).catch(() => {
      setLlmFetchError('Network error');
      setLlmModels([]);
    }).finally(() => setLlmFetching(false));
  }

  function addManualModel() {
    if (!llmManualInput.trim()) return;
    setLlmConfig(prev => ({
      ...prev,
      manualModels: [...(prev.manualModels || []), { id: llmManualInput.trim(), name: llmManualInput.trim() }],
      selectedModel: prev.selectedModel || llmManualInput.trim()
    }));
    setLlmManualInput('');
  }

  function removeManualModel(modelId) {
    setLlmConfig(prev => ({
      ...prev,
      manualModels: (prev.manualModels || []).filter(m => m.id !== modelId),
      selectedModel: prev.selectedModel === modelId ? '' : prev.selectedModel
    }));
  }

  function testLlmConnection() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    setLlmTesting(true);
    setLlmTestResult(null);
    fetch('/api/llm-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.selectedModel })
    }).then(r => r.json()).then(d => {
      setLlmTestResult(d);
    }).catch(() => {
      setLlmTestResult({ ok: false, message: 'Network error' });
    }).finally(() => setLlmTesting(false));
  }

  function handleSelectPreset(preset) {
    setActivePresetId(null);
    setLlmConfig(prev => ({
      ...prev,
      provider: preset.id,
      baseUrl: preset.baseUrl,
      apiKey: ''
    }));
    setLlmModels(preset.models.map(m => ({ id: m, name: m, owned_by: preset.name })));
  }

  function handleQuickSave() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    const providerName = LLM_PRESETS.find(p => p.id === llmConfig.provider)?.name || '自定义';
    const fallbackName = `${providerName}-${llmConfig.selectedModel}`;
    const name = llmPresetName.trim() || fallbackName;
    upsertPreset({
      id: llmPresetName.trim() ? undefined : activePresetId || undefined,
      name,
      provider: llmConfig.provider || 'custom',
      baseUrl: llmConfig.baseUrl,
      apiKey: llmConfig.apiKey,
      selectedModel: llmConfig.selectedModel,
      manualModels: llmConfig.manualModels || [],
    }, { activate: true });
    setLlmPresetName('');
    setShowLlmQuickConfig(false);
    if (typeof onQuickSaveSuccess === 'function') onQuickSaveSuccess();
  }

  function handleQuickTest() {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) return;
    testLlmConnection();
  }

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
    llmPresetName, setLlmPresetName,
    allLlmModels,
    fetchLlmModels, addManualModel, removeManualModel, testLlmConnection,
    handleSelectPreset, handleQuickSave, handleQuickTest,
  };
}
