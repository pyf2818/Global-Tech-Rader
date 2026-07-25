import { describe, expect, it } from 'vitest';
import { createCreativeService } from '../creativeService.js';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const DOC_ID = '33333333-3333-4333-8333-333333333333';
const OP_ID = '44444444-4444-4444-8444-444444444444';

function createMemoryRepository() {
  const assets = [];
  const documents = [];
  const versions = [];
  return {
    async getState(userId) {
      return {
        assets: assets.filter(asset => asset.ownerId === userId),
        documents: documents.filter(document => document.ownerId === userId),
        versions: versions.filter(version => documents.some(document => document.id === version.documentId && document.ownerId === userId)),
      };
    },
    async getDocument(documentId) {
      return documents.find(document => document.id === documentId) || null;
    },
    async upsertAsset(userId, asset) {
      const existing = assets.find(item => item.ownerId === userId && item.originalItemId === asset.originalItemId);
      if (existing) Object.assign(existing, asset, { ownerId: userId });
      else assets.push({ ...asset, id: asset.id || crypto.randomUUID(), ownerId: userId });
      return existing || assets.at(-1);
    },
    async upsertDocument(userId, document) {
      const existing = documents.find(item => item.id === document.id);
      if (existing) Object.assign(existing, document, { ownerId: userId });
      else documents.push({ ...document, id: document.id || crypto.randomUUID(), ownerId: userId });
      return existing || documents.at(-1);
    },
    async appendVersion(userId, version) {
      const document = documents.find(item => item.id === version.documentId);
      if (!document || document.ownerId !== userId) return null;
      const existing = versions.find(item => item.documentId === version.documentId && item.clientOperationId === version.clientOperationId);
      if (existing) return existing;
      const number = versions.filter(item => item.documentId === version.documentId).length + 1;
      const saved = { ...version, id: version.id || crypto.randomUUID(), number };
      versions.push(saved);
      document.title = version.title;
      document.draftContent = version.content;
      return saved;
    },
    async listVersions(documentId) {
      return versions.filter(version => version.documentId === documentId);
    },
  };
}

describe('createCreativeService', () => {
  it('rejects writes to another user document', async () => {
    const repository = createMemoryRepository();
    const service = createCreativeService(repository);
    await service.saveDocument(USER_A, { id: DOC_ID, title: 'Draft', draftContent: 'one' });

    await expect(service.saveVersion(USER_B, DOC_ID, {
      clientOperationId: OP_ID,
      title: 'Stolen',
      content: 'two',
    })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('appends immutable versions with server-side numbering', async () => {
    const service = createCreativeService(createMemoryRepository());
    await service.saveDocument(USER_A, { id: DOC_ID, title: 'Draft', draftContent: 'one' });

    const first = await service.saveVersion(USER_A, DOC_ID, {
      clientOperationId: OP_ID,
      title: 'Draft',
      content: 'one',
      reason: 'manual',
    });
    const second = await service.saveVersion(USER_A, DOC_ID, {
      clientOperationId: '55555555-5555-4555-8555-555555555555',
      title: 'Draft',
      content: 'two',
      reason: 'ai_insert',
    });

    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
    expect(first.content).toBe('one');
  });

  it('returns the existing version for duplicate client operations', async () => {
    const service = createCreativeService(createMemoryRepository());
    await service.saveDocument(USER_A, { id: DOC_ID, title: 'Draft', draftContent: 'one' });

    const first = await service.saveVersion(USER_A, DOC_ID, {
      clientOperationId: OP_ID,
      title: 'Draft',
      content: 'one',
      reason: 'manual',
    });
    const duplicate = await service.saveVersion(USER_A, DOC_ID, {
      clientOperationId: OP_ID,
      title: 'Draft',
      content: 'changed',
      reason: 'manual',
    });

    expect(duplicate).toEqual(first);
    expect(duplicate.content).toBe('one');
  });

  it('rejects citations that do not belong to the user assets', async () => {
    const service = createCreativeService(createMemoryRepository());
    await service.saveDocument(USER_A, { id: DOC_ID, title: 'Draft', draftContent: 'one' });

    await expect(service.saveVersion(USER_A, DOC_ID, {
      clientOperationId: OP_ID,
      title: 'Draft',
      content: 'one',
      citations: [{ id: 'missing-asset', title: 'Missing' }],
      reason: 'manual',
    })).rejects.toMatchObject({ code: 'INVALID_CITATION_ASSET', status: 400 });
  });
});
