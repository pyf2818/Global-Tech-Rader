import { describe, expect, it } from 'vitest';
import { buildRecommendation, clusterEvents, selectBriefingLanes } from '../recommendationEngine.js';

describe('adversarial intelligence inputs', () => {
  it('keeps scores finite and bounded under extreme profile signals', () => {
    const item = buildRecommendation(
      {
        id: 'future',
        title: 'Future dated model launch',
        summary: 'x'.repeat(10_000),
        source: 'One Source',
        category: 'ai',
        publishedAt: '2999-01-01T00:00:00Z',
        sourceQualityScore: 9999,
      },
      {
        now: Date.parse('2026-07-14T00:00:00Z'),
        behaviorSignal: 9999,
        trendVelocity: 9999,
        independentSourceCount: 9999,
        domainTiers: { ai: 'focus' },
        sourceTiers: { 'One Source': 'focus' },
        specialFollows: Array.from({ length: 100 }, (_, index) => ({ type: 'keyword', target: index === 0 ? 'model' : `noise-${index}` })),
      },
    );

    expect(Number.isFinite(item.publicScore)).toBe(true);
    expect(Number.isFinite(item.personalScore)).toBe(true);
    expect(item.publicScore).toBeGreaterThanOrEqual(0);
    expect(item.publicScore).toBeLessThanOrEqual(100);
    expect(item.personalScore).toBeGreaterThanOrEqual(0);
    expect(item.personalScore).toBeLessThanOrEqual(100);
  });

  it('caps one-source flooding and duplicate canonical events in briefing lanes', () => {
    const flooded = Array.from({ length: 50 }, (_, index) => ({
      id: `same-${index}`,
      canonicalId: index < 10 ? 'shared-event' : `event-${index}`,
      source: 'Single Source',
      category: index % 2 ? 'ai' : 'chips',
      publicScore: 100 - index,
      personalScore: 100 - index,
    }));

    const lanes = selectBriefingLanes(flooded, { perLane: 8, maxPerSource: 2, maxCategoryRatio: 0.5 });
    expect(lanes.public.filter(item => item.source === 'Single Source')).toHaveLength(8);
    expect(new Set(lanes.public.map(item => item.canonicalId || item.id)).size).toBe(lanes.public.length);
    expect(lanes.diagnostics.rejectedDuplicates).toBeGreaterThan(0);
  });

  it('clusters copied content with changed tracking URLs without losing evidence', () => {
    const clusters = clusterEvents([
      { id: 'a', source: 'Lab', title: 'OpenAI releases a new agent platform today', publishedAt: '2026-07-14T01:00:00Z', url: 'https://example.com/a?utm_source=x' },
      { id: 'b', source: 'Media', title: 'OpenAI releases new Agent platform', publishedAt: '2026-07-14T02:00:00Z', url: 'https://example.com/a?utm_medium=y' },
      { id: 'c', source: 'Other', title: 'Robotics supply chain update', publishedAt: '2026-07-14T02:00:00Z' },
    ]);

    const openAiCluster = clusters.find(cluster => cluster.itemIds.includes('a'));
    expect(clusters).toHaveLength(2);
    expect(openAiCluster.independentSourceCount).toBe(2);
    expect(openAiCluster.itemIds).toEqual(expect.arrayContaining(['a', 'b']));
  });
});
