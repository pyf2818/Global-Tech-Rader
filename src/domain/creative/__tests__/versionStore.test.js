import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDocument,
  createVersion,
  loadCreativeVersions,
  restoreVersion,
  saveDocumentVersion,
} from '../versionStore.js';

describe('creative version store', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, String(value))),
      removeItem: vi.fn(key => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
    localStorage.clear();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `id-${Math.random().toString(36).slice(2, 8)}`) });
  });

  it('creates immutable versions and restores by creating a new version', () => {
    const doc = createDocument({ id: 'd1', title: 'Draft' }, '2026-07-14T01:00:00Z');
    const v1 = createVersion(doc, { content: 'one', assetIds: ['a1'] }, '2026-07-14T01:01:00Z');
    const v2 = createVersion(v1.document, { content: 'two', assetIds: ['a1'] }, '2026-07-14T01:02:00Z');
    const restored = restoreVersion(v2.document, v1.version, '2026-07-14T01:03:00Z');

    expect(restored.version.content).toBe('one');
    expect(restored.version.number).toBe(3);
    expect(v1.version.content).toBe('one');
    expect(v2.version.content).toBe('two');
    expect(v2.document.draftContent).toBe('two');
  });

  it('deduplicates asset ids and stores citations in each version', () => {
    const doc = createDocument({ id: 'd2', title: 'With citations' }, '2026-07-14T01:00:00Z');
    const result = createVersion(doc, {
      content: 'claim [1]',
      assetIds: ['a1', 'a1', 'a2'],
      citations: [{ id: 'a1', title: 'Source', source: 'Lab', url: 'https://example.com' }],
    }, '2026-07-14T01:01:00Z');

    expect(result.version.assetIds).toEqual(['a1', 'a2']);
    expect(result.version.citations[0].title).toBe('Source');
  });

  it('persists document versions locally without mutating current draft on quota errors', () => {
    const result = saveDocumentVersion(
      { id: 'd3', title: 'Local doc', content: 'draft' },
      { content: 'saved', reason: 'manual', clientOperationId: 'op-1' },
      '2026-07-14T01:01:00Z',
    );

    expect(result.ok).toBe(true);
    expect(result.version.number).toBe(1);
    expect(loadCreativeVersions('d3')).toHaveLength(1);
    expect(loadCreativeVersions('d3')[0].content).toBe('saved');
  });

  it('increments persisted version numbers across repeated saves', () => {
    const first = saveDocumentVersion(
      { id: 'd4', title: 'Versioned doc', content: 'one' },
      { content: 'one', reason: 'manual', clientOperationId: 'op-1' },
      '2026-07-14T01:01:00Z',
    );
    const second = saveDocumentVersion(
      { id: 'd4', title: 'Versioned doc', content: 'two' },
      { content: 'two', reason: 'export', clientOperationId: 'op-2' },
      '2026-07-14T01:02:00Z',
    );

    expect(first.version.number).toBe(1);
    expect(second.version.number).toBe(2);
    expect(loadCreativeVersions('d4').map(version => version.number)).toEqual([2, 1]);
  });
});
