import { describe, expect, it } from 'vitest';
import { buildCandidateRadar, buildDecisionCard, buildMarketEvidence } from '../intelligenceRadar.js';

describe('intelligence radar', () => {
  it('ranks momentum and liquidity with transparent reasons', () => {
    const rows = buildCandidateRadar([
      { code: 'a', name: '强势', price: 10, high: 10.2, low: 9, changePct: 4, amount: 900, timestamp: 1000 },
      { code: 'b', name: '弱势', price: 8, high: 9, low: 7.9, changePct: -4, amount: 100, timestamp: 1000 },
    ], { now: 1000, limit: 2 });
    expect(rows[0].code).toBe('a');
    expect(rows[0].reasons.join(' ')).toContain('动量');
    expect(rows[1].risks.join(' ')).toContain('回撤');
  });

  it('labels incomplete data instead of inventing confidence', () => {
    const [row] = buildCandidateRadar([{ code: 'a', price: 10, changePct: 0, amount: 0 }], { now: 1000 });
    expect(row.confidence).toBe('低');
    expect(row.risks.join(' ')).toContain('成交额未提供');
  });

  it('summarizes market evidence and coverage limits', () => {
    const evidence = buildMarketEvidence({
      indices: [{ changePct: 1 }, { changePct: -0.2 }],
      sectors: [{ name: '算力', changePct: 2 }],
      coverage: { label: '活跃成交样本' },
    });
    expect(evidence.indexTone).toBe('指数分化');
    expect(evidence.leaders[0].name).toBe('算力');
    expect(evidence.limitation).toContain('不代表');
  });

  it('keeps facts, counter evidence and missing data separate', () => {
    const card = buildDecisionCard({
      realtime: { price: 12.3, changePct: 1.2 },
      diagnosis: { status: 'ready', rating: '观察', risk: 'medium', metrics: { excessReturn20: 2.1, volumeTrend: 'expanding' }, bullCase: ['趋势改善'], bearCase: ['波动较高'], invalidation: ['跌破支撑'] },
    });
    expect(card.facts[0]).toContain('现价');
    expect(card.counter).toEqual(['波动较高']);
    expect(card.missing.join(' ')).toContain('财务');
  });
});
