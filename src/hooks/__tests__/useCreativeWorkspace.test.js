import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CREATIVE_ASSETS_KEY,
  CREATIVE_DOCUMENTS_KEY,
  CREATIVE_MIGRATION_KEY,
  initializeCreativeWorkspace,
  migrateLegacyCreativeState,
} from '../useCreativeWorkspace.js';

function installLocalStorage() {
  const store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(key => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn(key => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  });
}

describe('useCreativeWorkspace migration helpers', () => {
  beforeEach(() => {
    installLocalStorage();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => `id-${Math.random().toString(36).slice(2, 8)}`) });
  });

  it('migrates legacy materials and articles into creative assets and documents', () => {
    const result = migrateLegacyCreativeState({
      now: '2026-07-14T01:00:00Z',
      legacyMaterials: [{
        id: 'm1',
        title: 'Material',
        content: 'Content',
        source: 'Source',
        url: 'https://example.com',
        tags: ['AI'],
      }],
      legacyArticles: [{
        id: 'a1',
        title: 'Article',
        content: 'Draft',
        materials: ['m1'],
        createdAt: '2026-07-14T00:00:00Z',
      }],
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].citation.title).toBe('Material');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].draftContent).toBe('Draft');
    expect(result.documents[0].assetIds).toEqual(['m1']);
  });

  it('initializes from legacy localStorage once and then reuses creative keys', () => {
    localStorage.setItem('materials', JSON.stringify([{ id: 'm1', title: 'Material', content: 'Content' }]));
    localStorage.setItem('articles', JSON.stringify([{ id: 'a1', title: 'Article', content: 'Draft' }]));

    const first = initializeCreativeWorkspace('2026-07-14T01:00:00Z');
    expect(first.assets).toHaveLength(1);
    expect(first.documents).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(CREATIVE_MIGRATION_KEY)).done).toBe(true);

    localStorage.setItem('materials', JSON.stringify([{ id: 'm2', title: 'Late legacy', content: 'Ignored' }]));
    const second = initializeCreativeWorkspace('2026-07-14T02:00:00Z');
    expect(second.assets.map(asset => asset.id)).toEqual(['m1']);
    expect(JSON.parse(localStorage.getItem(CREATIVE_ASSETS_KEY))).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(CREATIVE_DOCUMENTS_KEY))).toHaveLength(1);
  });
});
