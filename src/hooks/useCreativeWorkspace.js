import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeAsset } from '../domain/creative/assetModel.js';
import { exportDocument as exportCreativeDocument } from '../domain/creative/exportEngine.js';
import {
  createDocument as createCreativeDocument,
  createVersion,
  loadCreativeVersions,
  persistCreativeVersion,
  restoreVersion as restoreCreativeVersion,
} from '../domain/creative/versionStore.js';

export const CREATIVE_ASSETS_KEY = 'creativeAssets:v1';
export const CREATIVE_DOCUMENTS_KEY = 'creativeDocuments:v1';
export const CREATIVE_VERSIONS_KEY = 'creativeVersions:v1';
export const CREATIVE_MIGRATION_KEY = 'creativeWorkspaceMigration:v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    if (error?.name === 'QuotaExceededError') return { ok: false, code: 'LOCAL_STORAGE_QUOTA' };
    return { ok: false, code: 'LOCAL_STORAGE_ERROR', message: error?.message || 'localStorage write failed' };
  }
}

function uniqueById(items = []) {
  const seen = new Set();
  return items.filter(item => {
    const id = String(item.id || '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function versionMapToList(map = {}) {
  return Object.values(map).flat().filter(Boolean);
}

function listToVersionMap(versions = []) {
  return versions.reduce((groups, version) => {
    const documentId = String(version.documentId || version.document_id || '');
    if (!documentId) return groups;
    groups[documentId] = [...(groups[documentId] || []), version];
    return groups;
  }, {});
}

function findDocumentConflicts(localDocuments = [], remoteDocuments = []) {
  return remoteDocuments.filter(remote => {
    const local = localDocuments.find(document => String(document.id) === String(remote.id));
    if (!local) return false;
    const localTime = Date.parse(local.updatedAt || local.createdAt || 0);
    const remoteTime = Date.parse(remote.updatedAt || remote.createdAt || 0);
    if (remoteTime <= localTime) return false;
    return String(local.title || '') !== String(remote.title || '')
      || String(local.draftContent || '') !== String(remote.draftContent || '');
  }).map(document => ({ id: document.id, title: document.title, remoteUpdatedAt: document.updatedAt }));
}

async function requestCreativeJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data?.error?.message || 'Creative sync failed');
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data.data || data;
}

export function migrateLegacyCreativeState({
  legacyMaterials = [],
  legacyArticles = [],
  existingAssets = [],
  existingDocuments = [],
  now = new Date().toISOString(),
} = {}) {
  const assets = uniqueById([
    ...existingAssets,
    ...legacyMaterials.flatMap(material => {
      try { return [normalizeAsset(material, material.updatedAt || material.createdAt || now)]; } catch { return []; }
    }),
  ]);

  const documents = uniqueById([
    ...existingDocuments,
    ...legacyArticles.map(article => createCreativeDocument({
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status || 'draft',
      materials: article.materials || [],
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      versionNumber: article.versionNumber || 0,
    }, article.createdAt || now)),
  ]);

  return { assets, documents };
}

export function initializeCreativeWorkspace(now = new Date().toISOString()) {
  const migrated = readJson(CREATIVE_MIGRATION_KEY, null);
  const existingAssets = readJson(CREATIVE_ASSETS_KEY, []);
  const existingDocuments = readJson(CREATIVE_DOCUMENTS_KEY, []);
  if (migrated?.done) {
    return { assets: existingAssets, documents: existingDocuments, migration: migrated };
  }

  const legacyMaterials = readJson('materials', []);
  const legacyArticles = readJson('articles', []);
  const next = migrateLegacyCreativeState({
    legacyMaterials,
    legacyArticles,
    existingAssets,
    existingDocuments,
    now,
  });
  writeJson(CREATIVE_ASSETS_KEY, next.assets);
  writeJson(CREATIVE_DOCUMENTS_KEY, next.documents);
  const migration = {
    done: true,
    migratedAt: now,
    materialCount: legacyMaterials.length,
    articleCount: legacyArticles.length,
  };
  writeJson(CREATIVE_MIGRATION_KEY, migration);
  return { ...next, migration };
}

export function useCreativeWorkspace({ syncEnabled = false } = {}) {
  const initial = useMemo(() => initializeCreativeWorkspace(), []);
  const [assets, setAssets] = useState(initial.assets);
  const [documents, setDocuments] = useState(initial.documents);
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id || null);
  const [lastError, setLastError] = useState(null);
  const [syncState, setSyncState] = useState({ status: syncEnabled ? 'idle' : 'local', error: null, syncedAt: null, conflicts: [] });
  const [syncRevision, setSyncRevision] = useState(0);

  const persistAssets = useCallback((nextAssets) => {
    const result = writeJson(CREATIVE_ASSETS_KEY, nextAssets);
    if (!result.ok) setLastError(result);
    return result;
  }, []);

  const persistDocuments = useCallback((nextDocuments) => {
    const result = writeJson(CREATIVE_DOCUMENTS_KEY, nextDocuments);
    if (!result.ok) setLastError(result);
    return result;
  }, []);

  const activeDocument = useMemo(
    () => documents.find(document => String(document.id) === String(activeDocumentId)) || null,
    [documents, activeDocumentId],
  );

  const versions = useMemo(() => activeDocument ? loadCreativeVersions(activeDocument.id) : [], [activeDocument, syncRevision]);

  const mergeRemoteState = useCallback((state = {}) => {
    if (Array.isArray(state.assets)) {
      setAssets(prev => {
        const next = uniqueById([...state.assets, ...prev]);
        persistAssets(next);
        return next;
      });
    }
    if (Array.isArray(state.documents)) {
      setDocuments(prev => {
        const next = uniqueById([...state.documents, ...prev]);
        persistDocuments(next);
        return next;
      });
    }
    if (Array.isArray(state.versions)) {
      const localMap = loadCreativeVersions();
      const remoteMap = listToVersionMap(state.versions);
      const nextMap = { ...localMap };
      Object.entries(remoteMap).forEach(([documentId, remoteVersions]) => {
        nextMap[documentId] = uniqueById([...remoteVersions, ...(nextMap[documentId] || [])]);
      });
      writeJson(CREATIVE_VERSIONS_KEY, nextMap);
      setSyncRevision(revision => revision + 1);
    }
  }, [persistAssets, persistDocuments]);

  const syncNow = useCallback(async ({ resolve = 'detect' } = {}) => {
    if (!syncEnabled) return { ok: false, code: 'SYNC_DISABLED' };
    setSyncState({ status: 'syncing', error: null, syncedAt: null, conflicts: [] });
    try {
      const remote = await requestCreativeJson('/api/creative/state');
      const conflicts = findDocumentConflicts(documents, remote.documents || []);
      if (conflicts.length && resolve === 'remote') {
        mergeRemoteState(remote);
        const syncedAt = new Date().toISOString();
        setSyncState({ status: 'synced', error: null, syncedAt, conflicts: [] });
        return { ok: true, data: remote, syncedAt };
      }
      if (conflicts.length) {
        if (resolve !== 'local') {
          setSyncState({ status: 'conflict', error: null, syncedAt: null, conflicts });
          return { ok: false, code: 'CREATIVE_SYNC_CONFLICT', conflicts };
        }
      }

      const allVersions = versionMapToList(loadCreativeVersions());
      const payload = {
        assets: assets.filter(asset => isUuid(asset.id)),
        documents: documents.filter(document => isUuid(document.id)),
        versions: allVersions.filter(version => isUuid(version.documentId) && isUuid(version.clientOperationId)),
      };
      const result = await requestCreativeJson('/api/creative/sync', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      mergeRemoteState(result.state || result);
      const syncedAt = new Date().toISOString();
      setSyncState({ status: 'synced', error: null, syncedAt, conflicts: [] });
      return { ok: true, data: result, syncedAt };
    } catch (error) {
      const next = { code: error.code || 'CREATIVE_SYNC_FAILED', message: error.message };
      setSyncState({ status: 'error', error: next, syncedAt: null, conflicts: [] });
      setLastError(next);
      return { ok: false, ...next };
    }
  }, [assets, documents, mergeRemoteState, syncEnabled]);

  useEffect(() => {
    if (syncEnabled) return;
    setSyncState(state => state.status === 'local' ? state : { status: 'local', error: null, syncedAt: null, conflicts: [] });
  }, [syncEnabled]);

  const addAsset = useCallback((input) => {
    const asset = normalizeAsset(input);
    setAssets(prev => {
      const next = uniqueById([asset, ...prev]);
      persistAssets(next);
      return next;
    });
    return asset;
  }, [persistAssets]);

  const removeAsset = useCallback((assetId) => {
    setAssets(prev => {
      const next = prev.filter(asset => String(asset.id) !== String(assetId) && String(asset.originalItemId || '') !== String(assetId));
      persistAssets(next);
      return next;
    });
  }, [persistAssets]);

  const createDocument = useCallback((input = {}) => {
    const document = createCreativeDocument(input);
    setDocuments(prev => {
      const next = [document, ...prev];
      persistDocuments(next);
      return next;
    });
    setActiveDocumentId(document.id);
    return document;
  }, [persistDocuments]);

  const updateDraft = useCallback((documentId, updates = {}) => {
    let updated = null;
    setDocuments(prev => {
      const next = prev.map(document => {
        if (String(document.id) !== String(documentId)) return document;
        updated = {
          ...document,
          ...updates,
          draftContent: updates.draftContent ?? updates.content ?? document.draftContent,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      });
      persistDocuments(next);
      return next;
    });
    return updated;
  }, [persistDocuments]);

  const saveVersion = useCallback((documentId, input = {}) => {
    const document = documents.find(item => String(item.id) === String(documentId));
    if (!document) return { ok: false, code: 'DOCUMENT_NOT_FOUND' };
    const result = createVersion(document, input);
    const persisted = persistCreativeVersion(result.document, result.version);
    if (!persisted.ok) {
      setLastError(persisted);
      return { ...persisted, ...result };
    }
    setDocuments(prev => {
      const next = prev.map(item => String(item.id) === String(documentId) ? result.document : item);
      persistDocuments(next);
      return next;
    });
    return { ok: true, ...result };
  }, [documents, persistDocuments]);

  const restoreVersion = useCallback((documentId, version) => {
    const document = documents.find(item => String(item.id) === String(documentId));
    if (!document) return { ok: false, code: 'DOCUMENT_NOT_FOUND' };
    const result = restoreCreativeVersion(document, version);
    const persisted = persistCreativeVersion(result.document, result.version);
    if (!persisted.ok) {
      setLastError(persisted);
      return { ...persisted, ...result };
    }
    setDocuments(prev => {
      const next = prev.map(item => String(item.id) === String(documentId) ? result.document : item);
      persistDocuments(next);
      return next;
    });
    return { ok: true, ...result };
  }, [documents, persistDocuments]);

  const linkAsset = useCallback((documentId, assetId) => updateDraft(documentId, {
    assetIds: uniqueById([...(documents.find(item => String(item.id) === String(documentId))?.assetIds || []).map(id => ({ id })), { id: assetId }]).map(item => item.id),
  }), [documents, updateDraft]);

  const unlinkAsset = useCallback((documentId, assetId) => {
    const document = documents.find(item => String(item.id) === String(documentId));
    return updateDraft(documentId, { assetIds: (document?.assetIds || []).filter(id => String(id) !== String(assetId)) });
  }, [documents, updateDraft]);

  const exportDocument = useCallback((documentId, format = 'md') => {
    const document = documents.find(item => String(item.id) === String(documentId));
    if (!document) return { ok: false, code: 'DOCUMENT_NOT_FOUND' };
    return {
      ok: true,
      ...exportCreativeDocument({
        id: document.id,
        title: document.title,
        content: document.draftContent || '',
        updatedAt: document.updatedAt,
        status: document.status,
        citations: document.citations || [],
      }, format),
    };
  }, [documents]);

  return {
    assets,
    documents,
    versions,
    activeDocument,
    activeDocumentId,
    setActiveDocumentId,
    lastError,
    syncState,
    addAsset,
    removeAsset,
    createDocument,
    updateDraft,
    saveVersion,
    restoreVersion,
    linkAsset,
    unlinkAsset,
    exportDocument,
    syncNow,
  };
}
