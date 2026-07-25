const DOCUMENTS_KEY = 'creativeDocuments:v1';
const VERSIONS_KEY = 'creativeVersions:v1';
const MAX_VERSIONS_PER_DOCUMENT = 50;

function randomId(prefix = 'doc') {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function dedupe(values = []) {
  return [...new Set(values.map(value => String(value)).filter(Boolean))];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCitations(citations = []) {
  return citations
    .filter(Boolean)
    .map(citation => ({
      id: String(citation.id || ''),
      title: String(citation.title || ''),
      source: String(citation.source || ''),
      url: String(citation.url || ''),
      publishedAt: citation.publishedAt || null,
    }))
    .filter(citation => citation.id || citation.title || citation.url);
}

function currentVersionNumber(document = {}) {
  return Number(document.versionNumber || document.version || 0) || 0;
}

export function createDocument(input = {}, now = new Date().toISOString()) {
  const id = String(input.id || input.documentId || randomId('doc'));
  const title = String(input.title || '未命名文档').trim() || '未命名文档';
  return Object.freeze({
    id,
    title,
    draftContent: String(input.draftContent || input.content || ''),
    status: input.status || 'draft',
    assetIds: Object.freeze(dedupe(input.assetIds || input.materials || [])),
    citations: Object.freeze(normalizeCitations(input.citations || [])),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    versionNumber: currentVersionNumber(input),
  });
}

export function createVersion(document, input = {}, now = new Date().toISOString()) {
  const doc = createDocument(document, document.createdAt || now);
  const assetIds = dedupe(input.assetIds || input.materials || doc.assetIds || []);
  const citations = normalizeCitations(input.citations || doc.citations || []);
  const number = currentVersionNumber(doc) + 1;
  const version = Object.freeze({
    id: String(input.id || input.versionId || randomId('version')),
    documentId: doc.id,
    number,
    title: String(input.title || doc.title || '未命名文档'),
    content: String(input.content || input.draftContent || doc.draftContent || ''),
    assetIds: Object.freeze(assetIds),
    citations: Object.freeze(citations),
    reason: input.reason || 'manual',
    clientOperationId: String(input.clientOperationId || randomId('op')),
    createdAt: now,
  });
  const nextDocument = Object.freeze({
    ...doc,
    title: version.title,
    draftContent: version.content,
    assetIds: version.assetIds,
    citations: version.citations,
    updatedAt: now,
    versionNumber: number,
  });
  return { document: nextDocument, version };
}

export function restoreVersion(document, version, now = new Date().toISOString()) {
  return createVersion(document, {
    title: version.title,
    content: version.content,
    assetIds: version.assetIds || [],
    citations: version.citations || [],
    reason: 'restore',
  }, now);
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    if (error?.name === 'QuotaExceededError') return { ok: false, code: 'LOCAL_STORAGE_QUOTA' };
    return { ok: false, code: 'LOCAL_STORAGE_ERROR', message: error?.message || 'localStorage write failed' };
  }
}

export function loadCreativeDocuments() {
  return loadJson(DOCUMENTS_KEY, []);
}

export function loadCreativeVersions(documentId = '') {
  const all = loadJson(VERSIONS_KEY, {});
  if (!documentId) return all;
  return all[String(documentId)] || [];
}

export function persistCreativeVersion(document, version) {
  const documents = loadCreativeDocuments();
  const docIndex = documents.findIndex(item => String(item.id) === String(document.id));
  const nextDocuments = docIndex >= 0
    ? documents.map(item => String(item.id) === String(document.id) ? clone(document) : item)
    : [clone(document), ...documents];

  const allVersions = loadJson(VERSIONS_KEY, {});
  const existing = allVersions[String(document.id)] || [];
  const nextVersions = [clone(version), ...existing.filter(item => item.clientOperationId !== version.clientOperationId)]
    .sort((a, b) => (b.number || 0) - (a.number || 0) || Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
    .slice(0, MAX_VERSIONS_PER_DOCUMENT);

  const docsResult = saveJson(DOCUMENTS_KEY, nextDocuments);
  if (!docsResult.ok) return docsResult;
  return saveJson(VERSIONS_KEY, { ...allVersions, [String(document.id)]: nextVersions });
}

export function saveDocumentVersion(documentInput, versionInput = {}, now = new Date().toISOString()) {
  const existingDocument = loadCreativeDocuments().find(item => String(item.id) === String(documentInput.id || documentInput.documentId));
  const document = createDocument({
    ...existingDocument,
    ...documentInput,
    versionNumber: documentInput.versionNumber ?? existingDocument?.versionNumber ?? 0,
  }, documentInput.createdAt || existingDocument?.createdAt || now);
  const result = createVersion(document, versionInput, now);
  const persisted = persistCreativeVersion(result.document, result.version);
  return { ...persisted, ...result };
}
