import { describe, expect, it } from 'vitest';
import { parseListItem, resolveSecid } from '../stockService.js';

describe('stockService quote normalization', () => {
  it('keeps fltt=2 batch quote values at their real scale', () => {
    const item = parseListItem({
      f1: 1,
      f2: 1287.51,
      f3: -1.57,
      f4: -20.49,
      f12: '600519',
      f14: '贵州茅台',
      f15: 1308,
      f16: 1283.24,
      f17: 1300,
      f18: 1308,
    }, ['1.600519']);

    expect(item).toMatchObject({
      secid: '1.600519',
      price: 1287.51,
      change: -20.49,
      changePct: -1.57,
      open: 1300,
      high: 1308,
      low: 1283.24,
      prevClose: 1308,
    });
  });

  it('resolves common A-share, Hong Kong, and US symbols', () => {
    expect(resolveSecid('sh600519')).toBe('1.600519');
    expect(resolveSecid('00700')).toBe('116.00700');
    expect(resolveSecid('AAPL')).toBe('105.AAPL');
  });
});
