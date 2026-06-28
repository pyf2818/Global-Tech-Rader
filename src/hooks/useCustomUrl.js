// useCustomUrl — 自定义 URL 抓取，从 App.jsx 1243-1247 + 9437-9472 行提取

import { useState } from 'react';

export function useCustomUrl() {
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customUrlResult, setCustomUrlResult] = useState(null);
  const [customUrlLoading, setCustomUrlLoading] = useState(false);
  const [customUrlError, setCustomUrlError] = useState('');
  const [customUrlMode, setCustomUrlMode] = useState('basic');

  async function fetchCustomUrl(url, mode = customUrlMode) {
    if (!url.trim()) {
      setCustomUrlError('请输入 URL');
      return;
    }
    setCustomUrlLoading(true);
    setCustomUrlError('');
    setCustomUrlResult(null);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), mode, timeout: 30 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '抓取失败');
      setCustomUrlResult(data);
    } catch (error) {
      setCustomUrlError(error.message || '抓取失败，请稍后重试');
    } finally {
      setCustomUrlLoading(false);
    }
  }

  return {
    customUrlInput, setCustomUrlInput,
    customUrlResult, setCustomUrlResult,
    customUrlLoading, setCustomUrlLoading,
    customUrlError, setCustomUrlError,
    customUrlMode, setCustomUrlMode,
    fetchCustomUrl,
  };
}
