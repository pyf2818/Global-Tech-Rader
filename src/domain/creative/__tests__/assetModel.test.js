import { describe, expect, it } from 'vitest';
import { buildCitation, isAiElfAsset, normalizeAsset } from '../assetModel.js';

describe('creative asset model', () => {
  it('preserves source evidence when news becomes a material', () => {
    const asset = normalizeAsset({
      id: 'n1',
      title: 'Model update',
      url: 'https://example.com/a',
      source: 'Example',
      publishedAt: '2026-07-14T01:00:00Z',
      summary: 'Summary',
      tags: ['AI', 'AI'],
    }, '2026-07-14T02:00:00Z');

    expect(asset.originalItemId).toBe('n1');
    expect(asset.citation).toEqual({
      id: 'n1',
      title: 'Model update',
      source: 'Example',
      url: 'https://example.com/a',
      publishedAt: '2026-07-14T01:00:00Z',
      origin: null,
      agentName: null,
      sessionId: null,
    });
    expect(asset.tags).toEqual(['AI']);
    expect(buildCitation(asset, 1)).toContain('[1] Model update - Example');
  });

  it('preserves AI Elf handoff provenance', () => {
    const asset = normalizeAsset({
      id: 'elf-1',
      title: 'AI research note',
      source: 'AI 精灵 / 风险雷达',
      content: 'A structured conclusion.',
      tags: ['AI精灵', 'AI工作站'],
      metadata: {
        origin: 'ai-elf',
        agentName: '风险雷达',
        sessionId: 'session-1',
      },
    }, '2026-07-14T02:00:00Z');

    expect(isAiElfAsset(asset)).toBe(true);
    expect(asset.citation.origin).toBe('ai-elf');
    expect(asset.citation.agentName).toBe('风险雷达');
    expect(asset.fullContent).toBe('A structured conclusion.');
  });

  it('rejects assets without a stable title', () => {
    expect(() => normalizeAsset({ id: 'n1' })).toThrow('ASSET_TITLE_REQUIRED');
  });
});
