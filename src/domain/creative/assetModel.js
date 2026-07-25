function randomId(prefix = 'asset') {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))];
  if (typeof tags === 'string') return [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))];
  return [];
}

function buildCitationPayload(input, originalItemId, title) {
  const metadataCitation = input.citation && typeof input.citation === 'object' ? input.citation : null;
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  return Object.freeze({
    id: String(metadataCitation?.id || input.originalItemId || input.id || originalItemId),
    title,
    source: String(metadataCitation?.source || input.source || '未知来源'),
    url: String(metadataCitation?.url || input.url || ''),
    publishedAt: metadataCitation?.publishedAt || input.publishedAt || input.createdAt || null,
    origin: metadataCitation?.origin || metadata.origin || null,
    agentName: metadataCitation?.agentName || metadata.agentName || null,
    sessionId: metadataCitation?.sessionId || metadata.sessionId || null,
  });
}

export function normalizeAsset(input = {}, now = new Date().toISOString()) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('ASSET_TITLE_REQUIRED');

  const originalItemId = String(input.originalItemId || input.id || input.metadata?.sourceId || randomId('source'));
  const citation = buildCitationPayload(input, originalItemId, title);

  return Object.freeze({
    id: String(input.assetId || input.materialId || input.id || randomId('asset')),
    originalItemId,
    title,
    content: String(input.content || input.summary || ''),
    fullContent: String(input.fullContent || input.content || input.summary || ''),
    type: input.type || 'news',
    source: String(input.source || citation.source || '未知来源'),
    url: String(input.url || citation.url || ''),
    tags: Object.freeze(normalizeTags(input.tags)),
    citation,
    metadata: Object.freeze({ ...(input.metadata || {}) }),
    createdAt: input.createdAt || now,
    updatedAt: now,
  });
}

export function buildCitation(asset, index = 1) {
  const c = asset?.citation || {};
  const title = c.title || asset?.title || 'Untitled';
  const source = c.source || asset?.source || '未知来源';
  const date = c.publishedAt ? ` (${String(c.publishedAt).slice(0, 10)})` : '';
  const url = c.url ? ` ${c.url}` : '';
  return `[${index}] ${title} - ${source}${date}${url}`;
}

export function isAiElfAsset(asset = {}) {
  const tags = Array.isArray(asset.tags) ? asset.tags : [];
  return asset.metadata?.origin === 'ai-elf'
    || asset.citation?.origin === 'ai-elf'
    || String(asset.source || '').includes('AI精灵')
    || String(asset.source || '').includes('AI 精灵')
    || tags.some(tag => String(tag).includes('AI精灵') || String(tag).includes('AI工作站'));
}
