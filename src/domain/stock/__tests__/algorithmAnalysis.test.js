import { expect, it } from 'vitest';
import { analyzeStock } from '../algorithmAnalysis.js';

it('classifies a rising sequence with evidence', () => {
  const klines = Array.from({ length: 30 }, (_, index) => ({ close: 100 + index, open: 99 + index, high: 101 + index, low: 98 + index, volume: 1000 + index * 50 }));
  const result = analyzeStock({ stock: { name: '示例', code: 'TEST' }, realtime: { price: 129, changePct: 1.2 }, klines });
  expect(result.rating).toBe('强势');
  expect(result.evidence.some(item => item.key === 'maAlignment')).toBe(true);
  expect(result.bullCase.length).toBeGreaterThan(0);
  expect(result.invalidation.length).toBeGreaterThan(0);
  expect(result.metrics.atr14).toBeGreaterThan(0);
  expect(result.metrics.position20).toBe(100);
  expect(result.dataQuality.bars).toBe(30);
  expect(result.dataQuality.limitations.length).toBeGreaterThan(0);
  expect(result.disclaimer).toContain('不构成投资建议');
});

it('refuses to manufacture analysis from missing bars', () => {
  expect(analyzeStock({ stock: {}, realtime: null, klines: [] }).status).toBe('insufficient_data');
});

it('adds benchmark-relative evidence when matching data is available', () => {
  const klines = Array.from({ length: 30 }, (_, index) => ({ close: 100 + index, open: 99 + index, high: 101 + index, low: 98 + index, volume: 1000 }));
  const benchmarkKlines = Array.from({ length: 30 }, (_, index) => ({ close: 100 + index * 0.3, open: 99 + index * 0.3, high: 101 + index * 0.3, low: 98 + index * 0.3, volume: 1000 }));
  const result = analyzeStock({ stock: { name: 'Example', code: 'TEST' }, realtime: { price: 129 }, klines, benchmarkKlines });
  expect(result.metrics.excessReturn20).toBeGreaterThan(0);
  expect(result.dataQuality.benchmark).toEqual({ code: 'sh000001', name: '上证指数' });
  expect(result.bullCase.some(item => item.includes('跑赢基准'))).toBe(true);
});
