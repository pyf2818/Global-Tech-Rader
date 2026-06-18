import React from 'react';

function truncateUrl(url, maxLength) {
  if (!url) return '';
  return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
}

function normalizeSourceUrl(url) {
  return (url || '').replace(/\/$/, '').toLowerCase();
}

export default function SourceOpsPanel({
  allSources,
  customSources,
  disabledSources,
  sourceHealth,
  setSourceTypeTab,
  setGradeFilter,
  setStatusFilter,
  setCustomSourceFilter,
  sourceDiscoveryUrl,
  setSourceDiscoveryUrl,
  sourceDiscoveryState,
  discoverSource,
  addDiscoveredSource,
  verifyAllSources,
  verifyingAllSources,
}) {
  const managedSources = [...(allSources || []), ...(customSources || [])].filter(source => source?.name || source?.url);
  const enabledSources = managedSources.filter(source => !disabledSources.includes(source.name));
  const healthValues = Object.values(sourceHealth || {});
  const healthyCount = healthValues.filter(health => health.status === 'healthy').length;
  const warningCount = healthValues.filter(health => health.status === 'warning').length;
  const errorCount = healthValues.filter(health => health.status === 'error').length;
  const urlCounts = managedSources.reduce((map, source) => {
    if (!source.url) return map;
    const key = normalizeSourceUrl(source.url);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());
  const duplicateUrlCount = [...urlCounts.values()].filter(count => count > 1).length;
  const premiumSourceCount = managedSources.filter(source => ['S', 'A'].includes(source.grade)).length;
  const disabledCount = managedSources.length - enabledSources.length;
  const customCount = customSources?.length || 0;
  const reviewCount = warningCount + errorCount;
  const premiumRatio = managedSources.length ? Math.round((premiumSourceCount / managedSources.length) * 100) : 0;
  const healthCoverageRatio = managedSources.length ? Math.round((healthValues.length / managedSources.length) * 100) : 0;

  const resetCommonFilters = () => {
    setGradeFilter?.('all');
    setStatusFilter?.('all');
    setCustomSourceFilter?.('all');
  };

  const focusActions = [
    {
      id: 'premium',
      label: 'High Value',
      value: premiumSourceCount,
      note: 'S/A sources',
      onClick: () => {
        setSourceTypeTab('builtin');
        setGradeFilter?.('S');
        setStatusFilter?.('all');
      },
    },
    {
      id: 'review',
      label: 'Needs Review',
      value: reviewCount,
      note: 'warning/error',
      attention: reviewCount > 0,
      onClick: () => {
        setSourceTypeTab('custom');
        setCustomSourceFilter?.(errorCount > 0 ? 'error' : 'warning');
      },
    },
    {
      id: 'disabled',
      label: 'Disabled',
      value: disabledCount,
      note: 'not in feed',
      onClick: () => {
        setSourceTypeTab('builtin');
        setStatusFilter?.('disabled');
        setGradeFilter?.('all');
      },
    },
    {
      id: 'custom',
      label: 'Custom',
      value: customCount,
      note: 'user sources',
      onClick: () => {
        setSourceTypeTab('custom');
        resetCommonFilters();
      },
    },
    {
      id: 'verified',
      label: 'Verified',
      value: `${healthCoverageRatio}%`,
      note: 'health coverage',
      onClick: () => verifyAllSources?.(),
      disabled: verifyingAllSources,
    },
  ];

  const recommendedActions = [
    reviewCount > 0 && {
      title: 'Review unstable sources first',
      detail: `${reviewCount} source health signals need attention before expanding coverage.`,
      action: 'Open review',
      onClick: () => {
        setSourceTypeTab('custom');
        setCustomSourceFilter?.(errorCount > 0 ? 'error' : 'warning');
      },
    },
    duplicateUrlCount > 0 && {
      title: 'Reduce duplicate feeds',
      detail: `${duplicateUrlCount} feed URLs repeat across the library and can waste fetch quota.`,
      action: 'Show sources',
      onClick: () => {
        setSourceTypeTab('builtin');
        resetCommonFilters();
      },
    },
    premiumRatio < 35 && {
      title: 'Increase high-grade density',
      detail: `Only ${premiumRatio}% of managed sources are S/A grade. Prioritize trusted sources over broad coverage.`,
      action: 'View S grade',
      onClick: () => {
        setSourceTypeTab('builtin');
        setGradeFilter?.('S');
      },
    },
    customCount === 0 && {
      title: 'Add your first focused source',
      detail: 'Use source discovery to add niche feeds that match the user profile.',
      action: 'Custom sources',
      onClick: () => {
        setSourceTypeTab('custom');
        resetCommonFilters();
      },
    },
  ].filter(Boolean).slice(0, 3);

  return (
    <>
      <div className="source-ops-dashboard">
        <div className="source-ops-header">
          <div>
            <span>Operations View</span>
            <strong>Manage fewer, better sources</strong>
          </div>
          <div className="source-ops-actions">
            <button type="button" onClick={() => setSourceTypeTab('custom')}>Custom</button>
            <button type="button" onClick={() => { setGradeFilter('S'); setSourceTypeTab('builtin'); }}>S grade</button>
            <button type="button" onClick={verifyAllSources} disabled={verifyingAllSources}>
              {verifyingAllSources ? 'Checking...' : 'Verify'}
            </button>
          </div>
        </div>
        <div className="source-ops-grid">
          <div className="source-ops-card"><span>Total</span><strong>{managedSources.length}</strong><small>{enabledSources.length} enabled</small></div>
          <div className="source-ops-card"><span>Premium</span><strong>{premiumSourceCount}</strong><small>{premiumRatio}% S/A grade</small></div>
          <div className="source-ops-card"><span>Health</span><strong>{healthyCount}</strong><small>{warningCount} warning / {errorCount} error</small></div>
          <div className={`source-ops-card ${duplicateUrlCount ? 'attention' : ''}`}><span>Duplicates</span><strong>{duplicateUrlCount}</strong><small>{duplicateUrlCount ? 'Review repeated feeds' : 'No repeated feeds'}</small></div>
        </div>
        <div className="source-focus-strip" aria-label="Source focus filters">
          {focusActions.map(action => (
            <button
              key={action.id}
              type="button"
              className={action.attention ? 'attention' : ''}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <span>{action.label}</span>
              <strong>{action.value}</strong>
              <small>{action.note}</small>
            </button>
          ))}
        </div>
        {recommendedActions.length > 0 && (
          <div className="source-action-queue">
            <div className="source-action-queue-title">
              <span>Next Best Actions</span>
              <strong>Keep the source library smaller and smarter</strong>
            </div>
            <div className="source-action-list">
              {recommendedActions.map(action => (
                <div key={action.title} className="source-action-item">
                  <div>
                    <strong>{action.title}</strong>
                    <p>{action.detail}</p>
                  </div>
                  <button type="button" onClick={action.onClick}>{action.action}</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="source-discovery-panel">
        <div className="source-discovery-copy">
          <span>Source Discovery</span>
          <strong>Find reliable RSS / Atom feeds</strong>
          <p>Enter a homepage or feed URL. The system discovers candidates, verifies them, and lets you add the best one.</p>
        </div>
        <div className="source-discovery-form">
          <input
            type="text"
            value={sourceDiscoveryUrl}
            onChange={event => setSourceDiscoveryUrl(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') discoverSource(); }}
            placeholder="https://example.com"
            className="source-search-input"
          />
          <button type="button" onClick={discoverSource} disabled={sourceDiscoveryState.loading}>
            {sourceDiscoveryState.loading ? 'Discovering...' : 'Discover'}
          </button>
        </div>
        {sourceDiscoveryState.error && (
          <div className="source-discovery-error">{sourceDiscoveryState.error}</div>
        )}
        {sourceDiscoveryState.result?.candidates?.length > 0 && (
          <div className="source-discovery-results">
            {sourceDiscoveryState.result.candidates.map(candidate => (
              <div key={candidate.url} className="source-discovery-card">
                <div className="source-discovery-main">
                  <strong>{candidate.title}</strong>
                  <span title={candidate.url}>{truncateUrl(candidate.url, 76)}</span>
                  <p>{candidate.description || candidate.message || 'Verified feed candidate'}</p>
                </div>
                <div className="source-discovery-meta">
                  <span>{candidate.itemCount || 0} items</span>
                  <span>{candidate.suggestedGrade || 'D'} grade</span>
                  <span>{candidate.score || 0}/100</span>
                </div>
                <div className="source-discovery-actions">
                  <button type="button" onClick={() => addDiscoveredSource(candidate)}>Add</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
