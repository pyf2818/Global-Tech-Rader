// useLlmConfig — LLM 配置与模型管理，从 App.jsx 1115-1122 行提取

import { useState, useMemo } from 'react';
import { loadLS } from '../utils/localStorage.js';

const DEFAULT_LLM_CONFIG = { baseUrl: '', apiKey: '', selectedModel: '', manualModels: [], provider: '' };

export function useLlmConfig() {
  const [llmConfig, setLlmConfig] = useState(() => loadLS('llmConfig', DEFAULT_LLM_CONFIG));
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

  return {
    llmConfig, setLlmConfig,
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
