import { useCallback, useMemo, useState } from 'react';
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

export function useCreativeWorkspace() {
  const initial = useMemo(() => initializeCreativeWorkspace(), []);
  const [assets, setAssets] = useState(initial.assets);
  const [documents, setDocuments] = useState(initial.documents);
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id || null);
  const [lastError, setLastError] = useState(null);

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

  const versions = useMemo(() => activeDocument ? loadCreativeVersions(activeDocument.id) : [], [activeDocument]);

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
      const next = prev.filter(asset => String(asset.id) !== String(assetId));
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
    addAsset,
    removeAsset,
    createDocument,
    updateDraft,
    saveVersion,
    restoreVersion,
    linkAsset,
    unlinkAsset,
    exportDocument,
  };
}
