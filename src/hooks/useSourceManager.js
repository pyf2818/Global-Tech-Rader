// useSourceManager — 信息源管理，从 App.jsx 提取
// 含 state + source 操作函数 + 自动监控 useEffect
// allSources 由外部 /api/meta 提供，通过参数注入

import React, { useState, useEffect } from 'react';
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
  const [autoMonitorEnabled, setAutoMonitorEnabled] = useState(() => loadLS('autoMonitorEnabled', false));
  const [monitorInterval, setMonitorInterval] = useState(() => loadLS('monitorInterval', 60));
  const [monitorAlerts, setMonitorAlerts] = useState([]);

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

  function addCustomSource() {
    if (!newSource.name || !newSource.url) return;
    const nextUrl = normalizeSourceUrl(newSource.url);
    const exists = customSources.some(source => normalizeSourceUrl(source.url) === nextUrl) || allSources.some(source => normalizeSourceUrl(source.url) === nextUrl);
    if (exists) {
      showToast('Source already exists');
      return;
    }
    setCustomSources(prev => [...prev, { ...newSource, id: Date.now() }]);
    setNewSource({ name: '', url: '', region: 'overseas' });
    setSourceVerifyResult(null);
  }

  function removeCustomSource(id) {
    setCustomSources(prev => prev.filter(s => s.id !== id));
  }

  // 辅助函数：截断 URL
  function truncateUrl(url, maxLength) {
    if (!url) return '';
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  }

  // 辅助函数：截断文本
  function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  // 辅助函数：获取健康度指示器
  function getSourceHealthIndicator(sourceId, type) {
    const health = sourceHealth[sourceId];
    if (!health) {
      return React.createElement('span', { className: 'health-indicator health-unknown', title: '未验证' }, '?');
    }

    if (health.status === 'healthy') {
      return React.createElement('span', { className: 'health-indicator health-good', title: '健康' }, '✓');
    } else if (health.status === 'warning') {
      return React.createElement('span', { className: 'health-indicator health-warning', title: '警告' }, '!');
    } else if (health.status === 'error') {
      return React.createElement('span', { className: 'health-indicator health-bad', title: '错误' }, '✗');
    }
    return React.createElement('span', { className: 'health-indicator health-unknown', title: '未验证' }, '?');
  }

  // 验证单个源
  function verifySingleSource(source, isBuiltin = false) {
    if (!source || !source.url) {
      console.warn('verifySingleSource: Invalid source', source);
      return;
    }

    const url = source.url;
    const sourceKey = isBuiltin ? source.name : source.id;
    const startTime = Date.now();
    setSourceVerifying(true);

    fetch(`/api/verify-source?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        const responseTime = Date.now() - startTime;
        const previousHealth = sourceHealth[sourceKey];
        const failCount = d.ok ? 0 : (previousHealth?.failCount || 0) + 1;

        // 健康状态判断逻辑
        let status = 'healthy';
        if (!d.ok) {
          status = 'error';
        } else if (responseTime > 3000) {
          // 响应时间超过3秒视为警告
          status = 'warning';
        } else if (failCount >= 2) {
          // 即使验证成功，但之前有失败记录也标记为警告
          status = 'warning';
        }

        setSourceHealth(prev => ({
          ...prev,
          [sourceKey]: {
            status,
            lastCheck: Date.now(),
            responseTime,
            failCount,
            itemCount: d.itemCount || 0
          }
        }));
      })
      .catch(e => {
        console.error('verifySingleSource: Error for', source.name || sourceKey, ':', e);
        setSourceHealth(prev => ({
          ...prev,
          [sourceKey]: {
            status: 'error',
            lastCheck: Date.now(),
            responseTime: 0,
            failCount: (prev[sourceKey]?.failCount || 0) + 1,
            itemCount: 0
          }
        }));
      })
      .finally(() => {
        setSourceVerifying(false);
      });
  }

  // 导出配置
  function exportSources() {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      customSources: customSources,
      sourceHealth: sourceHealth,
      disabledSources: disabledSources
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sources-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 导入配置
  function importSources(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);

        if (config.version && config.customSources) {
          const confirmed = confirm(
            `即将导入 ${config.customSources.length} 个自定义源。\n\n` +
            `注意：这将覆盖现有的自定义源配置。\n\n` +
            `是否继续？`
          );

          if (confirmed) {
            setCustomSources(config.customSources);
            if (config.sourceHealth) {
              setSourceHealth(config.sourceHealth);
            }
            if (config.disabledSources) {
              setDisabledSources(config.disabledSources);
            }
            alert('导入成功！');
          }
        } else {
          alert('配置文件格式错误！');
        }
      } catch (error) {
        alert('导入失败：文件解析错误');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // 重置文件输入
  }

  // 清除警告
  function clearAlerts() {
    setMonitorAlerts([]);
  }

  // 自动监控相关函数
  useEffect(() => {
    if (!autoMonitorEnabled) return;

    const interval = setInterval(() => {
      // 自动验证所有启用的源
      const allEnabledSources = [...(customSources || []).filter(s => !disabledSources.includes(s.name)), ...(allSources || []).filter(s => !disabledSources.includes(s.name))];

      // 只验证有健康记录的源，避免首次验证所有源
      const sourcesToMonitor = allEnabledSources.filter(source => {
        const key = source.id || source.name;
        return sourceHealth[key] && sourceHealth[key].lastCheck;
      });

      if (sourcesToMonitor.length > 0) {
        sourcesToMonitor.forEach(source => {
          verifySingleSource(source, !source.id);
        });
      }
    }, monitorInterval * 60 * 1000); // 分钟转换为毫秒

    return () => clearInterval(interval);
  }, [autoMonitorEnabled, monitorInterval, customSources, allSources, disabledSources, sourceHealth]);

  // 检查健康状态并发送警告
  useEffect(() => {
    const newAlerts = [];

    // 检查自定义源
    customSources.forEach(source => {
      const health = sourceHealth[source.id];
      if (health && health.failCount >= 3) {
        newAlerts.push({
          id: source.id,
          name: source.name,
          type: 'error',
          message: `${source.name} 连续失败 ${health.failCount} 次`,
          timestamp: health.lastCheck
        });
      } else if (health && health.status === 'warning') {
        newAlerts.push({
          id: source.id,
          name: source.name,
          type: 'warning',
          message: `${source.name} 响应较慢：${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      }
    });

    // 检查内置源
    allSources.forEach(source => {
      const health = sourceHealth[source.name];
      if (health && health.failCount >= 3) {
        newAlerts.push({
          id: source.name,
          name: source.name,
          type: 'error',
          message: `${source.name} 连续失败 ${health.failCount} 次`,
          timestamp: health.lastCheck
        });
      } else if (health && health.status === 'warning') {
        newAlerts.push({
          id: source.name,
          name: source.name,
          type: 'warning',
          message: `${source.name} 响应较慢：${health.responseTime}ms`,
          timestamp: health.lastCheck
        });
      }
    });

    // 只显示最近10条警告
    setMonitorAlerts(newAlerts.slice(-10));
  }, [sourceHealth, customSources, allSources]);

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
    addCustomSource, removeCustomSource,
    truncateUrl, truncateText,
    getSourceHealthIndicator,
    verifySingleSource,
    exportSources, importSources,
    clearAlerts,
    autoMonitorEnabled, setAutoMonitorEnabled,
    monitorInterval, setMonitorInterval,
    monitorAlerts, setMonitorAlerts,
  };
}
