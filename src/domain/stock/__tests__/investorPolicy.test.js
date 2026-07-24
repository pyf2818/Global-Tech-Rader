import { describe, expect, it } from 'vitest';
import { evaluatePolicyFit, normalizeInvestorPolicy } from '../investorPolicy.js';

describe('investor policy', () => {
  it('normalizes unsafe numeric input', () => {
    const policy = normalizeInvestorPolicy({ capital: -1, riskPerTrade: 99, maxPosition: 0 });
    expect(policy.capital).toBe(1000);
    expect(policy.riskPerTrade).toBe(10);
    expect(policy.maxPosition).toBe(1);
  });

  it('excludes growth boards when the investor disables them', () => {
    const fit = evaluatePolicyFit({ code: 'sz300750', name: '宁德时代', price: 200 }, { allowGrowthBoards: false });
    expect(fit.eligible).toBe(false);
    expect(fit.flags).toContain('超出允许市场范围');
  });

  it('penalizes high volatility for conservative investors', () => {
    const fit = evaluatePolicyFit({ code: 'sh600000', price: 10, high: 10.5, low: 9.5, changePct: 5 }, { riskTolerance: 'conservative' });
    expect(fit.adjustment).toBeLessThan(0);
    expect(fit.flags.length).toBeGreaterThan(0);
  });
});
