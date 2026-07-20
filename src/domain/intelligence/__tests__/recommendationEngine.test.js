import { describe, expect, it } from 'vitest';
import { buildRecommendation, clusterEvents, selectBriefingLanes } from '../recommendationEngine.js';

const now = Date.parse('2026-07-14T08:00:00Z');
const base = { id: 'n1', title: 'Agent update', summary: 'A sufficiently complete summary', source: 'Lab', category: 'ai', publishedAt: '2026-07-14T07:00:00Z' };

describe('recommendation engine', () => {
  it('keeps public and personal scores explainable', () => {
    const result = buildRecommendation(base, {
      now,
      domainTiers: { ai: 'focus' },
      sourceTiers: { Lab: 'normal' },
      specialFollows: [{ type: 'source', target: 'Lab' }],
      independentSourceCount: 3,
      trendVelocity: 0.8,
      behaviorSignal: 999,
    });
    expect(result.scoreParts.personal.specialFollow).toBe(25);
    expect(result.scoreParts.personal.behavior).toBe(10);
    expect(result.publicScore).toBeLessThanOrEqual(100);
    expect(result.personalScore).toBeLessThanOrEqual(100);
  });

  it('builds equal lanes without reusing an event', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `n${index}`,
      canonicalId: index < 2 ? 'same-event' : `event-${index}`,
      source: index < 5 ? 'OneSource' : `Source${index}`,
      category: index < 6 ? 'ai' : 'chips',
      publicScore: 100 - index,
      personalScore: 90 - index,
    }));
    const lanes = selectBriefingLanes(items, { perLane: 4, maxPerSource: 2, maxCategoryRatio: 0.4 });
    expect(lanes.public).toHaveLength(4);
    expect(lanes.personal).toHaveLength(4);
    expect(new Set([...lanes.public, ...lanes.personal].map(item => item.canonicalId)).size).toBe(8);
  });

  it('clusters close independent reports', () => {
    const clusters = clusterEvents([
      { id: 'a', source: 'Lab A', title: 'OpenAI releases a new agent platform today', publishedAt: '2026-07-14T01:00:00Z' },
      { id: 'b', source: 'News B', title: 'OpenAI releases new Agent platform', publishedAt: '2026-07-14T02:00:00Z' },
      { id: 'c', source: 'News C', title: 'A separate chip fabrication story', publishedAt: '2026-07-14T02:00:00Z' },
    ]);
    expect(clusters).toHaveLength(2);
    expect(clusters.find(cluster => cluster.itemIds.includes('a')).independentSourceCount).toBe(2);
  });
});
