import { createCreativeRepository } from './creativeRepository.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['draft', 'review', 'published', 'archived']);
const REASONS = new Set(['manual', 'ai_insert', 'restore', 'export', 'sync']);

function fail(code, message, status = 400) {
  throw Object.assign(new Error(message), { code, status });
}

function requireUser(userId) {
  if (!userId) fail('UNAUTHORIZED', 'Please sign in first', 401);
}

function optionalUuid(value, code = 'INVALID_ID') {
  if (value === undefined || value === null || value === '') return null;
  const id = String(value);
  if (!UUID_RE.test(id)) fail(code, 'Invalid identifier', 400);
  return id;
}

function requireUuid(value, code = 'INVALID_ID') {
  return optionalUuid(value, code) || fail(code, 'Invalid identifier', 400);
}

function text(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

function jsonArray(value, max = 200) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function normalizeAsset(input = {}) {
  const title = text(input.title);
  if (!title) fail('INVALID_ASSET_TITLE', 'Asset title is required', 400);
  return {
    id: optionalUuid(input.id || input.assetId),
    originalItemId: text(input.originalItemId || input.id || input.sourceId, 300) || title,
    type: text(input.type || 'news', 24) || 'news',
    title,
    content: String(input.fullContent || input.content || '').slice(0, 250000),
    citation: input.citation && typeof input.citation === 'object' ? input.citation : {},
    tags: jsonArray(input.tags, 100).map(tag => String(tag).slice(0, 80)).filter(Boolean),
  };
}

function normalizeDocument(input = {}) {
  const title = text(input.title || 'Untitled');
  if (!title) fail('INVALID_DOCUMENT_TITLE', 'Document title is required', 400);
  const status = input.status || 'draft';
  if (!STATUSES.has(status)) fail('INVALID_DOCUMENT_STATUS', 'Document status is unsupported', 400);
  return {
    id: optionalUuid(input.id || input.documentId),
    title,
    draftContent: String(input.draftContent ?? input.content ?? '').slice(0, 500000),
    status,
  };
}

function normalizeVersion(input = {}, documentId) {
  const clientOperationId = requireUuid(input.clientOperationId || input.operationId || crypto.randomUUID(), 'INVALID_OPERATION_ID');
  const reason = input.reason || 'sync';
  if (!REASONS.has(reason)) fail('INVALID_VERSION_REASON', 'Version reason is unsupported', 400);
  return {
    id: optionalUuid(input.id || input.versionId),
    documentId: requireUuid(input.documentId || documentId, 'INVALID_DOCUMENT_ID'),
    clientOperationId,
    title: text(input.title || 'Untitled'),
    content: String(input.content ?? input.draftContent ?? '').slice(0, 500000),
    assetIds: jsonArray(input.assetIds || input.materials, 200).map(id => String(id)).filter(Boolean),
    citations: jsonArray(input.citations, 200),
    reason,
  };
}

export function createCreativeService(repository = createCreativeRepository()) {
  async function ensureOwnedDocument(userId, documentId) {
    const document = await repository.getDocument(documentId);
    if (!document) fail('DOCUMENT_NOT_FOUND', 'Document not found', 404);
    if (String(document.ownerId) !== String(userId)) fail('FORBIDDEN', 'Document belongs to another user', 403);
    return document;
  }

  async function ensureOwnedAssetRefs(userId, version) {
    const referenced = new Set([
      ...version.assetIds.map(id => String(id)),
      ...version.citations.map(citation => String(citation?.id || '')).filter(Boolean),
    ]);
    if (!referenced.size) return;
    const state = await repository.getState(userId);
    const owned = new Set((state.assets || []).flatMap(asset => [
      String(asset.id),
      String(asset.originalItemId || ''),
    ]).filter(Boolean));
    const invalid = [...referenced].filter(id => !owned.has(id));
    if (invalid.length) fail('INVALID_CITATION_ASSET', 'Version references assets not owned by this user', 400);
  }

  async function saveDocumentForUser(userId, input) {
    requireUser(userId);
    const document = normalizeDocument(input);
    if (document.id) {
      const existing = await repository.getDocument(document.id);
      if (existing && String(existing.ownerId) !== String(userId)) fail('FORBIDDEN', 'Document belongs to another user', 403);
    }
    return repository.upsertDocument(userId, document);
  }

  return {
    async getState(userId) {
      requireUser(userId);
      return repository.getState(userId);
    },

    async listAssets(userId) {
      requireUser(userId);
      return (await repository.getState(userId)).assets;
    },

    async listDocuments(userId) {
      requireUser(userId);
      return (await repository.getState(userId)).documents;
    },

    async saveAsset(userId, input) {
      requireUser(userId);
      return repository.upsertAsset(userId, normalizeAsset(input));
    },

    saveDocument: saveDocumentForUser,

    async saveVersion(userId, documentId, input) {
      requireUser(userId);
      await ensureOwnedDocument(userId, requireUuid(documentId, 'INVALID_DOCUMENT_ID'));
      const version = normalizeVersion(input, documentId);
      await ensureOwnedAssetRefs(userId, version);
      return repository.appendVersion(userId, version);
    },

    async listVersions(userId, documentId) {
      requireUser(userId);
      await ensureOwnedDocument(userId, requireUuid(documentId, 'INVALID_DOCUMENT_ID'));
      return repository.listVersions(documentId);
    },

    async syncState(userId, input = {}) {
      requireUser(userId);
      const savedAssets = [];
      const savedDocuments = [];
      const savedVersions = [];

      for (const assetInput of jsonArray(input.assets, 1000)) {
        savedAssets.push(await repository.upsertAsset(userId, normalizeAsset(assetInput)));
      }
      for (const documentInput of jsonArray(input.documents, 500)) {
        savedDocuments.push(await saveDocumentForUser(userId, documentInput));
      }
      for (const versionInput of jsonArray(input.versions, 2000)) {
        const version = normalizeVersion(versionInput, versionInput.documentId);
        await ensureOwnedDocument(userId, version.documentId);
        await ensureOwnedAssetRefs(userId, version);
        savedVersions.push(await repository.appendVersion(userId, version));
      }

      return {
        saved: {
          assets: savedAssets.length,
          documents: savedDocuments.length,
          versions: savedVersions.length,
        },
        state: await repository.getState(userId),
      };
    },
  };
}
