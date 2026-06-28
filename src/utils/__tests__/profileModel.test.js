import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  computeIntelligenceProfile,
  computeReadingProfile,
  computeProfileLearningEngine,
  computeTodayProfileSnapshot,
} from '../profileModel.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mkBookmark(overrides = {}) {
  return {
    id: 'b1',
    category: 'ai',
    source: 'TechCrunch',
    tags: ['tag1'],
    readAt: '2026-06-28T10:00:00.000Z',
    summary: 'A short summary',
    isRead: true,
    ...overrides,
  };
}

function mkReading(overrides = {}) {
  return {
    id: 'r1',
    category: 'ai',
    source: 'TechCrunch',
    tags: ['tag1'],
    readAt: '2026-06-28T10:00:00.000Z',
    ...overrides,
  };
}

function mkMaterial(overrides = {}) {
  return {
    id: 'm1',
    category: 'ai',
    source: 'TechCrunch',
    tags: ['tag1'],
    ...overrides,
  };
}

// ===========================================================================
// computeIntelligenceProfile
// ===========================================================================
describe('computeIntelligenceProfile', () => {
  it('returns correct shape with all defaults', () => {
    const r = computeIntelligenceProfile({});
    expect(r).toEqual({
      focusLabels: [],
      boosted: [],
      muted: [],
      tracked: [],
      depth: '探索校准',
      outputGoal: '阅读判断',
    });
  });

  // --- depth branching ---
  describe('depth', () => {
    it('深度聚焦 when workbenchItemCount > 0 and ratio > 0.5', () => {
      const r = computeIntelligenceProfile({ workbenchItemCount: 10, focusMatches: 6 });
      expect(r.depth).toBe('深度聚焦');
    });

    it('深度聚焦 at boundary ratio exactly 1.0', () => {
      const r = computeIntelligenceProfile({ workbenchItemCount: 1, focusMatches: 1 });
      expect(r.depth).toBe('深度聚焦');
    });

    it('探索校准 when ratio == 0.5 (not strictly greater)', () => {
      const r = computeIntelligenceProfile({ workbenchItemCount: 10, focusMatches: 5 });
      expect(r.depth).toBe('探索校准');
    });

    it('探索校准 when workbenchItemCount is 0', () => {
      const r = computeIntelligenceProfile({ workbenchItemCount: 0, focusMatches: 100 });
      expect(r.depth).toBe('探索校准');
    });
  });

  // --- outputGoal branching ---
  describe('outputGoal', () => {
    it('素材沉淀 when materials.length > bookmarks.length', () => {
      const r = computeIntelligenceProfile({ materials: [1, 2, 3], bookmarks: [1] });
      expect(r.outputGoal).toBe('素材沉淀');
    });

    it('阅读判断 when materials.length == bookmarks.length', () => {
      const r = computeIntelligenceProfile({ materials: [1], bookmarks: [1] });
      expect(r.outputGoal).toBe('阅读判断');
    });

    it('阅读判断 when materials.length < bookmarks.length', () => {
      const r = computeIntelligenceProfile({ materials: [1], bookmarks: [1, 2] });
      expect(r.outputGoal).toBe('阅读判断');
    });
  });

  // --- focusLabels ---
  describe('focusLabels', () => {
    it('maps selectedInterests directly', () => {
      const r = computeIntelligenceProfile({ selectedInterests: ['ai', 'cloud', 'crypto'] });
      expect(r.focusLabels).toEqual(['ai', 'cloud', 'crypto']);
    });
  });

  // --- boosted ---
  describe('boosted', () => {
    it('takes top 3 boosted categories sorted by value desc', () => {
      const r = computeIntelligenceProfile({
        recommendationFeedback: { boostedCategories: { a: 1, c: 10, b: 5, d: 0 } },
      });
      expect(r.boosted).toEqual(['c', 'b', 'a']);
    });

    it('handles empty boostedCategories', () => {
      const r = computeIntelligenceProfile({ recommendationFeedback: {} });
      expect(r.boosted).toEqual([]);
    });
  });

  // --- muted ---
  describe('muted', () => {
    it('limits muted sources to 3', () => {
      const r = computeIntelligenceProfile({
        recommendationFeedback: {
          mutedSources: { src1: 1, src2: 2, src3: 3, src4: 4 },
        },
      });
      expect(r.muted).toHaveLength(3);
    });
  });

  // --- tracked ---
  describe('tracked', () => {
    it('deduplicates followKeywords and trackedTerms keys', () => {
      const r = computeIntelligenceProfile({
        followKeywords: ['ai', 'llm', 'ai'],
        recommendationFeedback: { trackedTerms: { ai: 5, ml: 3 } },
      });
      expect(r.tracked.filter(t => t === 'ai')).toHaveLength(1);
    });

    it('limits to 8 items', () => {
      const r = computeIntelligenceProfile({
        followKeywords: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
      });
      expect(r.tracked).toHaveLength(8);
    });

    it('empty when no followKeywords and no trackedTerms', () => {
      const r = computeIntelligenceProfile({});
      expect(r.tracked).toEqual([]);
    });
  });
});

// ===========================================================================
// computeReadingProfile
// ===========================================================================
describe('computeReadingProfile', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('returns correct shape with empty array', () => {
    const r = computeReadingProfile([]);
    expect(r.streak).toBe(0);
    expect(r.peakHour).toBeGreaterThanOrEqual(0);
    expect(r.peakHour).toBeLessThan(24);
    expect(r.hourDist).toHaveLength(24);
    expect(r.topInterests).toEqual([]);
    expect(r.topSources).toEqual([]);
    expect(r.topTags).toEqual([]);
    expect(r.totalBookmarks).toBe(0);
    expect(r.readRate).toBe(0);
    expect(r.deepReads).toBe(0);
    expect(r.shallowReads).toBe(0);
    expect(r.avgSummaryLength).toBe(0);
    expect(r.maxTrend).toBe(1); // Math.max(...[], 1)
    expect(r.trendData).toHaveLength(30);
    expect(r.day30).toHaveLength(30);
  });

  it('handles undefined input via default parameter', () => {
    const r = computeReadingProfile();
    expect(r.totalBookmarks).toBe(0);
  });

  // --- streak ---
  describe('streak', () => {
    it('counts consecutive days including today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-28T15:00:00.000Z'));

      const bookmarks = [
        mkBookmark({ readAt: '2026-06-28T10:00:00Z' }),
        mkBookmark({ id: 'b2', readAt: '2026-06-27T10:00:00Z' }),
        mkBookmark({ id: 'b3', readAt: '2026-06-26T10:00:00Z' }),
      ];
      expect(computeReadingProfile(bookmarks).streak).toBe(3);
    });

    it('starts from yesterday when no read today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-28T15:00:00.000Z'));

      const bookmarks = [
        mkBookmark({ readAt: '2026-06-27T10:00:00Z' }),
        mkBookmark({ id: 'b2', readAt: '2026-06-26T10:00:00Z' }),
      ];
      expect(computeReadingProfile(bookmarks).streak).toBe(2);
    });

    it('is 1 when only today read', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-28T15:00:00.000Z'));

      const bookmarks = [mkBookmark({ readAt: '2026-06-28T10:00:00Z' })];
      expect(computeReadingProfile(bookmarks).streak).toBe(1);
    });

    it('is 0 when no reads in recent days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-28T15:00:00.000Z'));

      const bookmarks = [mkBookmark({ readAt: '2026-06-20T10:00:00Z' })];
      expect(computeReadingProfile(bookmarks).streak).toBe(0);
    });

    it('is 0 when bookmarks have no readAt', () => {
      const bookmarks = [mkBookmark({ readAt: undefined })];
      expect(computeReadingProfile(bookmarks).streak).toBe(0);
    });
  });

  // --- topInterests ---
  describe('topInterests', () => {
    it('sorts by count desc, computes pct relative to bookmarks.length', () => {
      const bookmarks = [
        mkBookmark({ category: 'ai' }),
        mkBookmark({ id: 'b2', category: 'ai' }),
        mkBookmark({ id: 'b3', category: 'cloud' }),
      ];
      const r = computeReadingProfile(bookmarks);
      expect(r.topInterests[0]).toEqual({ id: 'ai', count: 2, pct: 67 });
      expect(r.topInterests[1]).toEqual({ id: 'cloud', count: 1, pct: 33 });
    });

    it('defaults missing category to unknown', () => {
      const bookmarks = [mkBookmark({ category: undefined })];
      const r = computeReadingProfile(bookmarks);
      expect(r.topInterests[0].id).toBe('unknown');
    });
  });

  // --- topSources ---
  describe('topSources', () => {
    it('sorts by count desc', () => {
      const bookmarks = [
        mkBookmark({ source: 'A' }),
        mkBookmark({ id: 'b2', source: 'A' }),
        mkBookmark({ id: 'b3', source: 'B' }),
      ];
      const r = computeReadingProfile(bookmarks);
      expect(r.topSources[0]).toEqual({ name: 'A', count: 2, pct: 67 });
    });

    it('defaults missing source to 未知来源', () => {
      const bookmarks = [mkBookmark({ source: undefined })];
      const r = computeReadingProfile(bookmarks);
      expect(r.topSources[0].name).toBe('未知来源');
    });
  });

  // --- topTags ---
  describe('topTags', () => {
    it('computes pct relative to total tag count', () => {
      const bookmarks = [
        mkBookmark({ tags: ['x', 'y'] }),
        mkBookmark({ id: 'b2', tags: ['x'] }),
      ];
      const r = computeReadingProfile(bookmarks);
      // x:2 y:1 => totalTagCount=3, x pct=round(2/3*100)=67
      expect(r.topTags[0]).toEqual({ name: 'x', count: 2, pct: 67 });
    });

    it('handles bookmarks with no tags', () => {
      const bookmarks = [mkBookmark({ tags: [] }), mkBookmark({ id: 'b2', tags: undefined })];
      const r = computeReadingProfile(bookmarks);
      expect(r.topTags).toEqual([]);
    });
  });

  // --- deepReads / shallowReads ---
  describe('deepReads and shallowReads', () => {
    it('deepReads counts summaries > 200 chars', () => {
      const bookmarks = [
        mkBookmark({ summary: 'x'.repeat(201) }),
        mkBookmark({ id: 'b2', summary: 'short' }),
      ];
      expect(computeReadingProfile(bookmarks).deepReads).toBe(1);
    });

    it('shallowReads counts summaries <= 100 chars', () => {
      const bookmarks = [
        mkBookmark({ summary: 'x'.repeat(100) }),
        mkBookmark({ id: 'b2', summary: 'x'.repeat(201) }),
      ];
      expect(computeReadingProfile(bookmarks).shallowReads).toBe(1);
    });

    it('avgSummaryLength computes correctly', () => {
      const bookmarks = [
        mkBookmark({ summary: 'abc' }),    // length 3
        mkBookmark({ id: 'b2', summary: 'ab' }), // length 2
      ];
      // round((3+2)/2) = 3
      expect(computeReadingProfile(bookmarks).avgSummaryLength).toBe(3);
    });
  });

  // --- readRate ---
  describe('readRate', () => {
    it('computes percentage of isRead bookmarks', () => {
      const bookmarks = [
        mkBookmark({ isRead: true }),
        mkBookmark({ id: 'b2', isRead: true }),
        mkBookmark({ id: 'b3', isRead: false }),
      ];
      expect(computeReadingProfile(bookmarks).readRate).toBe(67);
    });
  });

  // --- hourDist / peakHour ---
  describe('hourDist and peakHour', () => {
    it('peakHour is the hour with most reads', () => {
      vi.useFakeTimers();
      // Use a fixed timezone-independent approach: all at same local hour
      // We mock Date so new Date('...') returns a predictable local hour
      const baseMs = Date.now();
      const hour10Local = new Date(baseMs);
      hour10Local.setHours(10, 0, 0, 0);
      const hour14Local = new Date(baseMs);
      hour14Local.setHours(14, 0, 0, 0);

      const bookmarks = [
        mkBookmark({ readAt: hour10Local.toISOString() }),
        mkBookmark({ id: 'b2', readAt: hour10Local.toISOString() }),
        mkBookmark({ id: 'b3', readAt: hour14Local.toISOString() }),
      ];
      const r = computeReadingProfile(bookmarks);
      expect(r.peakHour).toBe(10);
      expect(r.hourDist[10]).toBe(2);
      expect(r.hourDist[14]).toBe(1);
      vi.useRealTimers();
    });
  });

  // --- trendData ---
  describe('trendData', () => {
    it('has 30 entries and day30 array', () => {
      const r = computeReadingProfile([mkBookmark()]);
      expect(r.trendData).toHaveLength(30);
      expect(r.day30).toHaveLength(30);
      // Each entry in day30 is a YYYY-MM-DD string
      expect(r.day30[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

// ===========================================================================
// computeProfileLearningEngine
// ===========================================================================
describe('computeProfileLearningEngine', () => {
  it('returns correct shape with all defaults', () => {
    const r = computeProfileLearningEngine({});
    expect(r.confidence).toBe(0);
    expect(r.confidenceLabel).toBe('需要校准');
    expect(r.behaviorDepth).toBe('探索校准型');
    expect(r.topCategories).toEqual([]);
    expect(r.topSources).toEqual([]);
    expect(r.topTags).toEqual([]);
    expect(Array.isArray(r.blindSpots)).toBe(true);
    expect(Array.isArray(r.nextActions)).toBe(true);
    expect(typeof r.summary).toBe('string');
  });

  // --- weighted scoring ---
  describe('weighted scoring', () => {
    it('readingHistory weight=3, bookmarks weight=4, materials weight=5', () => {
      const r = computeProfileLearningEngine({
        readingHistory: [{ category: 'ai', source: 'A', tags: ['t1'] }],
        bookmarks: [{ category: 'ai', source: 'A', tags: ['t1'] }],
        materials: [{ category: 'ai', source: 'A', tags: ['t1'] }],
      });
      expect(r.topCategories.find(c => c.id === 'ai').score).toBe(12); // 3+4+5
      expect(r.topSources.find(s => s.name === 'A').score).toBe(12);
      expect(r.topTags.find(t => t.name === 't1').score).toBe(12);
    });

    it('items without category/source are handled gracefully', () => {
      const r = computeProfileLearningEngine({
        readingHistory: [{ tags: ['x'] }],
      });
      expect(r.topCategories).toEqual([]);
      expect(r.topSources).toEqual([]);
      expect(r.topTags.find(t => t.name === 'x').score).toBe(3);
    });
  });

  // --- domainPriorities ---
  describe('domainPriorities', () => {
    it('adds domainPriority * 2 for each selectedInterest', () => {
      const r = computeProfileLearningEngine({
        selectedInterests: ['ai'],
        domainPriorities: { ai: 5 },
      });
      expect(r.topCategories.find(c => c.id === 'ai').score).toBe(10);
    });

    it('defaults domainPriority to 3 when not specified', () => {
      const r = computeProfileLearningEngine({
        selectedInterests: ['ai'],
      });
      expect(r.topCategories.find(c => c.id === 'ai').score).toBe(6); // 3*2
    });
  });

  // --- boostedCategories ---
  describe('boostedCategories', () => {
    it('adds count * 6 to category score', () => {
      const r = computeProfileLearningEngine({
        recommendationFeedback: { boostedCategories: { cloud: 3 } },
      });
      expect(r.topCategories.find(c => c.id === 'cloud').score).toBe(18);
    });
  });

  // --- mutedSources ---
  describe('mutedSources', () => {
    it('reduces source score by count * 8, floored at 0', () => {
      const r = computeProfileLearningEngine({
        readingHistory: [{ source: 'bad' }], // score 3
        recommendationFeedback: { mutedSources: { bad: 1 } }, // -8 => max(0, 3-8) = 0
      });
      expect(r.topSources.find(s => s.name === 'bad').score).toBe(0);
    });

    it('heavily muted source gets pushed to bottom of ranking', () => {
      const r = computeProfileLearningEngine({
        readingHistory: [
          { source: 'bad' },    // weight 3
          { source: 'good' },   // weight 3
        ],
        recommendationFeedback: { mutedSources: { bad: 5 } }, // -40 => floor 0
      });
      const goodEntry = r.topSources.find(s => s.name === 'good');
      const badEntry = r.topSources.find(s => s.name === 'bad');
      expect(goodEntry.score).toBeGreaterThan(badEntry.score);
    });
  });

  // --- followKeywords ---
  describe('followKeywords', () => {
    it('adds 4 to tag score per keyword', () => {
      const r = computeProfileLearningEngine({ followKeywords: ['llm'] });
      expect(r.topTags.find(t => t.name === 'llm').score).toBe(4);
    });
  });

  // --- trackedTerms ---
  describe('trackedTerms', () => {
    it('adds count * 5 to tag score', () => {
      const r = computeProfileLearningEngine({
        recommendationFeedback: { trackedTerms: { ai: 3 } },
      });
      expect(r.topTags.find(t => t.name === 'ai').score).toBe(15);
    });
  });

  // --- sourcePriorities ---
  describe('sourcePriorities', () => {
    it('adds priority * 2 to source score', () => {
      const r = computeProfileLearningEngine({ sourcePriorities: { TC: 5 } });
      expect(r.topSources.find(s => s.name === 'TC').score).toBe(10);
    });
  });

  // --- confidence ---
  describe('confidence', () => {
    it('caps at 96 with large data', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(30).fill({ category: 'ai' }),
        bookmarks: Array(20).fill({ category: 'ai' }),
        materials: Array(20).fill({ category: 'ai' }),
        selectedInterests: ['ai', 'cloud'],
        followKeywords: ['llm', 'ml'],
      });
      expect(r.confidence).toBe(96);
    });

    it('scales proportionally with data', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(5).fill({ category: 'ai' }),
        bookmarks: Array(5).fill({ category: 'ai' }),
        materials: Array(5).fill({ category: 'ai' }),
      });
      // 5*1.4 + 5*1.3 + 5*1.8 = 7 + 6.5 + 9 = 22.5 => round = 23
      expect(r.confidence).toBe(23);
    });
  });

  // --- confidenceLabel ---
  describe('confidenceLabel', () => {
    it('需要校准 when confidence < 45', () => {
      const r = computeProfileLearningEngine({ readingHistory: [{ category: 'ai' }] });
      expect(r.confidenceLabel).toBe('需要校准');
    });

    it('持续学习中 when 45 <= confidence < 75', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(25).fill({ category: 'ai' }),
        bookmarks: Array(15).fill({ category: 'ai' }),
      });
      // 25*1.4 + 15*1.3 = 35 + 19.5 = 54.5 => 55
      expect(r.confidenceLabel).toBe('持续学习中');
    });

    it('高可信 when confidence >= 75', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(30).fill({ category: 'ai' }),
        bookmarks: Array(20).fill({ category: 'ai' }),
        materials: Array(10).fill({ category: 'ai' }),
        selectedInterests: ['ai', 'cloud', 'crypto'],
        followKeywords: ['llm', 'ml'],
      });
      expect(r.confidenceLabel).toBe('高可信');
    });
  });

  // --- behaviorDepth ---
  describe('behaviorDepth', () => {
    it('资产沉淀型 when materials >= bookmarks and materials > 0', () => {
      const r = computeProfileLearningEngine({
        materials: [mkMaterial(), mkMaterial({ id: 'm2' })],
        bookmarks: [{ category: 'ai' }],
      });
      expect(r.behaviorDepth).toBe('资产沉淀型');
    });

    it('收藏复盘型 when savedRatio >= 50 and no material dominance', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(10).fill({ category: 'ai' }),
        bookmarks: Array(5).fill({ category: 'ai' }),
      });
      // savedRatio = round(5/10*100) = 50 >= 50, materials empty so first condition false
      expect(r.behaviorDepth).toBe('收藏复盘型');
    });

    it('高频扫描型 when recent reads >= 6', () => {
      const now = Date.now();
      const recent = Array(8).fill(null).map((_, i) => ({
        category: 'ai',
        readAt: new Date(now - i * 86400000).toISOString(),
      }));
      const r = computeProfileLearningEngine({ readingHistory: recent });
      expect(r.behaviorDepth).toBe('高频扫描型');
    });

    it('探索校准型 as default fallback', () => {
      const r = computeProfileLearningEngine({
        readingHistory: [{ category: 'ai', readAt: '2020-01-01T00:00:00Z' }],
      });
      expect(r.behaviorDepth).toBe('探索校准型');
    });
  });

  // --- blindSpots ---
  describe('blindSpots', () => {
    it('includes recommendations for empty state', () => {
      const r = computeProfileLearningEngine({});
      const text = r.blindSpots.join(' ');
      expect(text).toContain('尚未建立阅读偏好');
      expect(text).toContain('行为数据不足');
      expect(text).toContain('尚未设置追踪词汇');
    });

    it('skips blind spots when data is sufficient', () => {
      const r = computeProfileLearningEngine({
        selectedInterests: ['ai'],
        followKeywords: ['llm'],
        readingHistory: Array(10).fill({ category: 'ai' }),
        bookmarks: Array(5).fill({ category: 'ai' }),
        materials: Array(5).fill({ category: 'ai' }),
      });
      expect(r.blindSpots).toHaveLength(0);
    });
  });

  // --- nextActions ---
  describe('nextActions', () => {
    it('includes basic actions for empty state', () => {
      const r = computeProfileLearningEngine({});
      const text = r.nextActions.join(' ');
      expect(text).toContain('设置关注领域');
      expect(text).toContain('添加追踪关键词');
      expect(text).toContain('先阅读今日推荐');
    });

    it('suggests expanding interests when focusMatchCount < 3', () => {
      const r = computeProfileLearningEngine({
        selectedInterests: ['ai'],
        followKeywords: ['llm'],
        readingHistory: Array(5).fill({ category: 'cloud' }),
      });
      expect(r.nextActions.join(' ')).toContain('扩充关注领域');
    });

    it('default action when all conditions met', () => {
      const r = computeProfileLearningEngine({
        selectedInterests: ['ai', 'cloud', 'crypto'],
        followKeywords: ['llm', 'ml', 'nlp'],
        readingHistory: Array(10).fill({ category: 'ai' }),
      });
      expect(r.nextActions.join(' ')).toContain('今日情报已接入推荐');
    });

    it('limits to 4 actions', () => {
      const r = computeProfileLearningEngine({});
      expect(r.nextActions.length).toBeLessThanOrEqual(4);
    });
  });

  // --- summary ---
  describe('summary', () => {
    it('confidence >= 45 returns detailed summary with category/tag/source', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(30).fill({ category: 'ai', source: 'TC' }),
        bookmarks: Array(15).fill({ category: 'ai' }),
      });
      expect(r.summary).toContain('系统判断');
    });

    it('20 <= confidence < 45 returns learning summary', () => {
      const r = computeProfileLearningEngine({
        readingHistory: Array(10).fill({ category: 'ai' }),
        bookmarks: Array(5).fill({ category: 'ai' }),
        materials: Array(5).fill({ category: 'ai' }),
      });
      // confidence ~ 29 => in [20, 45)
      expect(r.summary).toContain('正在学习');
    });

    it('confidence < 20 returns insufficient data message', () => {
      const r = computeProfileLearningEngine({});
      expect(r.summary).toContain('行为数据不足');
    });
  });
});

// ===========================================================================
// computeTodayProfileSnapshot
// ===========================================================================
describe('computeTodayProfileSnapshot', () => {
  const fullInput = {
    date: '2026-06-28',
    intelligenceProfile: {
      focusLabels: ['ai', 'cloud'],
      tracked: ['llm'],
      depth: '深度聚焦',
      outputGoal: '素材沉淀',
    },
    profileLearningEngine: {
      confidence: 80,
      summary: 'test summary',
      behaviorDepth: '资产沉淀型',
      blindSpots: ['spot1', 'spot2'],
      nextActions: ['action1'],
    },
    readingHistory: [{ id: 1 }, { id: 2 }],
    bookmarks: [{ id: 1 }],
    materials: [{ id: 1 }],
    sourcePriorityItems: [{ name: 'TC' }, { name: 'GH' }],
  };

  it('returns complete structure with full data', () => {
    const r = computeTodayProfileSnapshot(fullInput);
    expect(r.date).toBe('2026-06-28');
    expect(r.focus).toEqual(['ai', 'cloud']);
    expect(r.tracked).toEqual(['llm']);
    expect(r.depth).toBe('深度聚焦');
    expect(r.outputGoal).toBe('素材沉淀');
    expect(r.confidence).toBe(80);
    expect(r.learningSummary).toBe('test summary');
    expect(r.behaviorDepth).toBe('资产沉淀型');
    expect(r.blindSpots).toEqual(['spot1', 'spot2']);
    expect(r.nextActions).toEqual(['action1']);
    expect(r.reads).toBe(2);
    expect(r.saved).toBe(1);
    expect(r.materials).toBe(1);
    expect(r.sources).toEqual(['TC', 'GH']);
  });

  it('handles empty/minimal input without throwing', () => {
    const r = computeTodayProfileSnapshot({
      date: '2026-06-28',
      intelligenceProfile: {},
      profileLearningEngine: {},
      readingHistory: [],
      bookmarks: [],
      materials: [],
    });
    expect(r.date).toBe('2026-06-28');
    expect(r.focus).toEqual([]);
    expect(r.tracked).toEqual([]);
    expect(r.depth).toBe('探索校准');
    expect(r.outputGoal).toBe('阅读判断');
    expect(r.confidence).toBe(0);
    expect(r.reads).toBe(0);
    expect(r.sources).toEqual([]);
  });

  it('truncates focus to 5', () => {
    const r = computeTodayProfileSnapshot({
      ...fullInput,
      intelligenceProfile: {
        ...fullInput.intelligenceProfile,
        focusLabels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      },
    });
    expect(r.focus).toHaveLength(5);
  });

  it('truncates tracked to 5', () => {
    const r = computeTodayProfileSnapshot({
      ...fullInput,
      intelligenceProfile: {
        ...fullInput.intelligenceProfile,
        tracked: ['t1', 't2', 't3', 't4', 't5', 't6'],
      },
    });
    expect(r.tracked).toHaveLength(5);
  });

  it('truncates blindSpots to 3', () => {
    const r = computeTodayProfileSnapshot({
      ...fullInput,
      profileLearningEngine: {
        ...fullInput.profileLearningEngine,
        blindSpots: ['s1', 's2', 's3', 's4', 's5'],
      },
    });
    expect(r.blindSpots).toHaveLength(3);
  });

  it('truncates nextActions to 3', () => {
    const r = computeTodayProfileSnapshot({
      ...fullInput,
      profileLearningEngine: {
        ...fullInput.profileLearningEngine,
        nextActions: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
    });
    expect(r.nextActions).toHaveLength(3);
  });

  it('truncates sources to 3', () => {
    const r = computeTodayProfileSnapshot({
      ...fullInput,
      sourcePriorityItems: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
    });
    expect(r.sources).toEqual(['A', 'B', 'C']);
  });
});
