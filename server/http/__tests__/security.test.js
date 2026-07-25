import { describe, expect, it } from 'vitest';
import { createCreativeService } from '../../creative/creativeService.js';
import { handleCreativeRequest } from '../creativeHandlers.js';
import { readJsonBody, routeError } from '../httpUtils.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value = '') {
      this.body += value;
      this.json = value ? JSON.parse(value) : null;
    },
  };
}

function createRequest({ method = 'GET', url = '/', body = {}, cookie = '' } = {}) {
  return {
    method,
    url,
    body,
    headers: cookie ? { cookie } : {},
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {},
  };
}

function createMemoryCreativeRepository() {
  const documents = [{ id: '22222222-2222-4222-8222-222222222222', ownerId: USER_ID, title: 'Draft', draftContent: 'one' }];
  return {
    async getState() {
      return { assets: [], documents, versions: [] };
    },
    async getDocument(documentId) {
      return documents.find(document => document.id === documentId) || null;
    },
    async upsertAsset(userId, asset) {
      return { ...asset, ownerId: userId };
    },
    async upsertDocument(userId, document) {
      return { ...document, ownerId: userId };
    },
    async appendVersion() {
      throw new Error('appendVersion should not be called by invalid requests');
    },
    async listVersions() {
      return [];
    },
  };
}

describe('HTTP security contracts', () => {
  it('rejects oversized JSON bodies with 413', async () => {
    await expect(readJsonBody(createRequest({ body: JSON.stringify({ value: 'x'.repeat(2 * 1024 * 1024 + 1) }) })))
      .rejects.toMatchObject({ code: 'BODY_TOO_LARGE', status: 413 });
  });

  it('requires authentication for creative APIs', async () => {
    const res = createResponse();
    await handleCreativeRequest(createRequest({ method: 'GET', url: '/api/creative/state' }), res, {
      path: ['state'],
      authService: { authenticate: async () => null },
      service: createCreativeService(createMemoryCreativeRepository()),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid creative document identifiers before writes', async () => {
    const res = createResponse();
    await handleCreativeRequest(createRequest({ method: 'POST', url: '/api/creative/documents/not-a-uuid/versions', body: {} }), res, {
      path: ['documents', 'not-a-uuid', 'versions'],
      authService: { authenticate: async () => ({ id: USER_ID }) },
      service: createCreativeService(createMemoryCreativeRepository()),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json.error.code).toBe('INVALID_DOCUMENT_ID');
  });

  it('normalizes internal errors without leaking stack traces', () => {
    const res = createResponse();
    routeError(res, Object.assign(new Error('database password=secret stack line'), { code: 'DATABASE_UNAVAILABLE' }));

    expect(res.statusCode).toBe(503);
    expect(res.json.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(JSON.stringify(res.json)).not.toContain('secret');
    expect(JSON.stringify(res.json)).not.toContain('stack');
  });
});
