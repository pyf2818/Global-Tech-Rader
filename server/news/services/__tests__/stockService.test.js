import { afterEach, describe, expect, it, vi } from 'vitest';
import { getKline, parseListItem, parseMarketPoolItem, resolveSecid } from '../stockService.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('normalizes dynamic A-share market-pool rows', () => {
    expect(parseMarketPoolItem({
      f2: 38.91, f3: 0.52, f4: 0.2, f5: 1234, f6: 567890,
      f12: '600036', f13: 1, f14: '招商银行', f15: 38.99,
      f16: 38.45, f17: 38.68, f18: 38.71,
    })).toMatchObject({
      secid: '1.600036', code: 'sh600036', name: '招商银行',
      price: 38.91, changePct: 0.52, amount: 567890,
    });
    expect(parseMarketPoolItem({ f12: 'invalid' })).toBeNull();
  });

  it('keeps different adjustment modes in separate K-line cache entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          code: '999999',
          name: '测试标的',
          klines: ['2026-07-22,10,11,12,9,1000,11000,3'],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getKline('1.999999', { period: '101', count: 20, adjust: '0' });
    await getKline('1.999999', { period: '101', count: 20, adjust: '1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('fqt=0');
    expect(fetchMock.mock.calls[1][0]).toContain('fqt=1');
  });
});
