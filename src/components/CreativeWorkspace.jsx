import { useMemo, useState } from 'react';

function parseCitationIds(text = '') {
  return [...String(text).matchAll(/\[asset:([^\]]+)\]/gi)]
    .map(match => String(match[1]).trim())
    .filter(Boolean);
}

function downloadExport(result) {
  const blob = new Blob([result.content], { type: result.mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename || 'creative-export.md';
  anchor.click();
  URL.revokeObjectURL(url);
}

function mergeCitations(current = [], assets = [], citationIds = []) {
  const byId = new Map(current.map(citation => [String(citation.id), citation]));
  citationIds.forEach(id => {
    if (byId.has(String(id))) return;
    const asset = assets.find(item => String(item.id) === String(id) || String(item.originalItemId) === String(id));
    if (asset?.citation) byId.set(String(id), { ...asset.citation, id: String(id) });
  });
  return [...byId.values()];
}

export default function CreativeWorkspace({ workspace, onOpenEditor, onOpenMaterials }) {
  const [selectedAssetId, setSelectedAssetId] = useState(workspace?.assets?.[0]?.id || '');
  const [proposal, setProposal] = useState('');
  const [exportFormat, setExportFormat] = useState('md');

  const assets = workspace?.assets || [];
  const documents = workspace?.documents || [];
  const activeDocument = workspace?.activeDocument || documents[0] || null;
  const selectedAsset = assets.find(asset => String(asset.id) === String(selectedAssetId)) || assets[0] || null;
  const activeVersions = workspace?.versions || [];

  const assetIdSet = useMemo(() => new Set(assets.flatMap(asset => [
    String(asset.id),
    String(asset.originalItemId || ''),
  ]).filter(Boolean)), [assets]);

  const proposalCitationIds = useMemo(() => parseCitationIds(proposal), [proposal]);
  const invalidCitationIds = proposalCitationIds.filter(id => !assetIdSet.has(String(id)));

  const unresolvedCitations = useMemo(() => {
    if (!activeDocument) return 0;
    const linked = new Set((activeDocument.assetIds || []).map(id => String(id)));
    return (activeDocument.citations || []).filter(citation => citation.id && !linked.has(String(citation.id))).length;
  }, [activeDocument]);

  const createFromAsset = () => {
    if (!selectedAsset || !workspace?.createDocument) return;
    const document = workspace.createDocument({
      title: `${selectedAsset.title || 'Untitled'} draft`,
      content: `# ${selectedAsset.title || 'Untitled'}\n\n${selectedAsset.fullContent || selectedAsset.content || ''}\n\nSource: [asset:${selectedAsset.id}]`,
      assetIds: [selectedAsset.id],
      citations: [selectedAsset.citation].filter(Boolean),
    });
    workspace.saveVersion?.(document.id, {
      title: document.title,
      content: document.draftContent,
      assetIds: document.assetIds,
      citations: document.citations,
      reason: 'manual',
    });
  };

  const insertProposal = () => {
    if (!activeDocument || !proposal.trim() || invalidCitationIds.length) return;
    const nextContent = [activeDocument.draftContent || '', proposal.trim()].filter(Boolean).join('\n\n');
    const nextAssetIds = [...new Set([...(activeDocument.assetIds || []), ...proposalCitationIds])];
    const nextCitations = mergeCitations(activeDocument.citations || [], assets, proposalCitationIds);

    workspace.updateDraft?.(activeDocument.id, {
      draftContent: nextContent,
      assetIds: nextAssetIds,
      citations: nextCitations,
    });
    workspace.saveVersion?.(activeDocument.id, {
      title: activeDocument.title,
      content: nextContent,
      assetIds: nextAssetIds,
      citations: nextCitations,
      reason: 'ai_insert',
    });
    setProposal('');
  };

  const exportActiveDocument = () => {
    if (!activeDocument || !workspace?.exportDocument) return;
    const result = workspace.exportDocument(activeDocument.id, exportFormat);
    if (result?.ok) downloadExport(result);
  };

  return (
    <section className="creative-workspace">
      <div className="creative-workspace-head">
        <div>
          <span>Creative Workspace</span>
          <h2>Creative asset workspace</h2>
        </div>
        <div className="creative-workspace-stats">
          <strong>{assets.length}<span>assets</span></strong>
          <strong>{documents.length}<span>docs</span></strong>
          <strong>{activeVersions.length}<span>versions</span></strong>
          <button
            type="button"
            className="creative-sync-button"
            onClick={() => workspace?.syncNow?.()}
            disabled={!workspace?.syncNow || ['syncing', 'local'].includes(workspace?.syncState?.status)}
          >
            {workspace?.syncState?.status === 'local' ? 'Local' : workspace?.syncState?.status === 'syncing' ? 'Syncing' : 'Sync'}
          </button>
        </div>
      </div>
      {workspace?.syncState?.status === 'conflict' && (
        <div className="creative-sync-alert">
          <span>Remote changes detected for {workspace.syncState.conflicts?.length || 0} document(s).</span>
          <button type="button" onClick={() => workspace.syncNow?.({ resolve: 'local' })}>Keep local</button>
          <button type="button" onClick={() => workspace.syncNow?.({ resolve: 'remote' })}>Use remote</button>
        </div>
      )}
      {workspace?.syncState?.status === 'error' && (
        <div className="creative-sync-alert error">{workspace.syncState.error?.message || 'Creative sync failed'}</div>
      )}

      <div className="creative-workspace-grid">
        <div className="creative-panel">
          <div className="creative-panel-head">
            <h3>Recent assets</h3>
            <button type="button" onClick={onOpenMaterials}>Manage</button>
          </div>
          <div className="creative-asset-list">
            {assets.slice(0, 6).map(asset => (
              <button
                type="button"
                key={asset.id}
                className={String(selectedAsset?.id) === String(asset.id) ? 'active' : ''}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <strong>{asset.title}</strong>
                <span>{asset.source || 'Unknown source'} / {(asset.tags || []).slice(0, 2).join(', ') || 'untagged'}</span>
              </button>
            ))}
            {assets.length === 0 && <p className="creative-empty">No assets yet. Save news cards or AI Elf outputs into the material library first.</p>}
          </div>
          {selectedAsset && (
            <p className="creative-asset-provenance">
              <span>{selectedAsset.citation?.title || selectedAsset.title} / {selectedAsset.citation?.source || selectedAsset.source || 'Unknown source'}</span>
              {(selectedAsset.citation?.url || selectedAsset.url) && (
                <a href={selectedAsset.citation?.url || selectedAsset.url} target="_blank" rel="noreferrer">
                  {selectedAsset.citation?.url || selectedAsset.url}
                </a>
              )}
            </p>
          )}
          <button type="button" className="creative-primary" onClick={createFromAsset} disabled={!selectedAsset}>
            Create from asset
          </button>
        </div>

        <div className="creative-panel creative-document-panel">
          <div className="creative-panel-head">
            <h3>Current document</h3>
            <button type="button" onClick={onOpenEditor}>Edit</button>
          </div>
          {activeDocument ? (
            <>
              <h4>{activeDocument.title}</h4>
              <p>{String(activeDocument.draftContent || '').slice(0, 220) || 'Blank draft'}</p>
              <div className="creative-document-meta">
                <span>{(activeDocument.assetIds || []).length} linked assets</span>
                <span>{activeVersions.length} versions</span>
                <span>{unresolvedCitations} unresolved citations</span>
              </div>
              <div className="creative-export-row">
                <select value={exportFormat} onChange={event => setExportFormat(event.target.value)}>
                  <option value="md">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="html">HTML</option>
                </select>
                <button type="button" onClick={exportActiveDocument}>Export local</button>
              </div>
              {activeVersions.length > 0 && (
                <div className="creative-version-list" aria-label="Version history">
                  {activeVersions.slice(0, 5).map(version => (
                    <button
                      type="button"
                      key={version.id}
                      onClick={() => workspace?.restoreVersion?.(activeDocument.id, version)}
                      aria-label={`Restore v${version.number}`}
                    >
                      <strong>v{version.number}</strong>
                      <span>{version.reason || 'manual'}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="creative-empty">No document yet. Create the first draft from an asset.</p>
          )}
        </div>

        <div className="creative-panel creative-proposal-panel">
          <div className="creative-panel-head">
            <h3>AI proposal review</h3>
            <span>{invalidCitationIds.length ? 'invalid citations' : 'manual insert'}</span>
          </div>
          <textarea
            value={proposal}
            onChange={event => setProposal(event.target.value)}
            placeholder="Paste AI output here. Cite materials as [asset:assetId]."
          />
          {invalidCitationIds.length > 0 && (
            <div className="creative-citation-error">Invalid asset references: {invalidCitationIds.join(', ')}</div>
          )}
          <button type="button" className="creative-primary" onClick={insertProposal} disabled={!proposal.trim() || invalidCitationIds.length > 0 || !activeDocument}>
            Insert as new version
          </button>
        </div>
      </div>
    </section>
  );
}
