// useSourceManager — 信息源管理，从 App.jsx 1094-1110 + 9166-9276 行提取
// 含 12 个 useState + 4 个 handler (verifySource/discoverSource/addDiscoveredSource/verifyAllSources)
// allSources 由外部 /api/meta 提供，通过参数注入

import { useState } from 'react';
import { loadLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';

function normalizeSourceUrl(url) {
  return (url || '').replace(/\/$/, '').toLowerCase();
}

export function useSourceManager({ allSources = [] } = {}) {
  const [customSources, setCustomSources] = useState(() => loadLS('customSources', []));
  const [disabledSources, setDisabledSources] = useState(() => loadLS('disabledSources', []));
  const [newSource, setNewSource] = useState({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
  const [sourceVerifyResult, setSourceVerifyResult] = useState(null);
  const [sourceVerifying, setSourceVerifying] = useState(false);
  const [sourceDiscoveryUrl, setSourceDiscoveryUrl] = useState('');
  const [sourceDiscoveryState, setSourceDiscoveryState] = useState({ loading: false, result: null, error: '' });
  const [verifyingAllSources, setVerifyingAllSources] = useState(false);
  const [allSourcesVerifyResults, setAllSourcesVerifyResults] = useState(null);
  const [sourceHealth, setSourceHealth] = useState(() => loadLS('sourceHealth', {}));
  const [editingSource, setEditingSource] = useState(null);
  const [showSourceForm, setShowSourceForm] = useState(false);

  function verifySource() {
    if (!newSource.url) return;
    setSourceVerifying(true);
    setSourceVerifyResult(null);
    fetch(`/api/verify-source?url=${encodeURIComponent(newSource.url)}`).then(r => r.json()).then(d => {
      setSourceVerifyResult(d);
      if (d.ok && !newSource.name && d.title) {
        setNewSource(prev => ({ ...prev, name: d.title }));
      }
    }).catch(() => {
      setSourceVerifyResult({ ok: false, message: 'Network error' });
    }).finally(() => setSourceVerifying(false));
  }

  async function discoverSource() {
    const url = sourceDiscoveryUrl.trim();
    if (!url) return;
    setSourceDiscoveryState({ loading: true, result: null, error: '' });
    try {
      const response = await fetch(`/api/discover-source?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      setSourceDiscoveryState({ loading: false, result: data, error: data.ok ? '' : data.message || 'No feed discovered' });
    } catch (error) {
      setSourceDiscoveryState({ loading: false, result: null, error: error.message || 'Network error' });
    }
  }

  function addDiscoveredSource(candidate) {
    if (!candidate?.url) return;
    const candidateUrl = normalizeSourceUrl(candidate.url);
    const exists = customSources.some(source => normalizeSourceUrl(source.url) === candidateUrl) || allSources.some(source => normalizeSourceUrl(source.url) === candidateUrl);
    if (exists) {
      showToast('Source already exists');
      return;
    }
    const source = {
      id: Date.now(),
      name: candidate.title || candidate.name || 'Custom Feed',
      url: candidate.url,
      region: candidate.suggestedRegion || 'global',
      category: candidate.suggestedCategory || '',
      grade: candidate.suggestedGrade || 'D',
      tags: candidate.tags || ['discovered'],
      notes: `Discovered via ${candidate.discoveredVia || 'source discovery'}`
    };
    setCustomSources(prev => [...prev, source]);
    setSourceHealth(prev => ({
      ...prev,
      [source.id]: {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 0,
        failCount: 0,
        itemCount: candidate.itemCount || 0
      }
    }));
    showToast('Source added');
  }

  function verifyAllSources() {
    if (!allSources || !allSources.length) return;
    setVerifyingAllSources(true);
    setAllSourcesVerifyResults(null);
    const results = [];
    let completed = 0;
    allSources.forEach(source => {
      if (!source.url) return;
      fetch(`/api/verify-source?url=${encodeURIComponent(source.url)}`)
        .then(r => r.json())
        .then(d => { results.push({ name: source.name, ...d }); })
        .catch(() => { results.push({ name: source.name, ok: false, message: 'Network error' }); })
        .finally(() => {
          completed++;
          if (completed === allSources.length) {
            setAllSourcesVerifyResults(results);
            setVerifyingAllSources(false);
          }
        });
    });
  }

  return {
    customSources, setCustomSources,
    disabledSources, setDisabledSources,
    newSource, setNewSource,
    sourceVerifyResult, sourceVerifying,
    sourceDiscoveryUrl, setSourceDiscoveryUrl,
    sourceDiscoveryState,
    verifyingAllSources, allSourcesVerifyResults, setAllSourcesVerifyResults,
    sourceHealth, setSourceHealth,
    editingSource, setEditingSource,
    showSourceForm, setShowSourceForm,
    verifySource, discoverSource, addDiscoveredSource, verifyAllSources,
  };
}
