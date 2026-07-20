import { expect, it } from 'vitest';
import { analyzeStock } from '../algorithmAnalysis.js';

it('classifies a rising sequence with evidence', () => {
  const klines = Array.from({ length: 30 }, (_, index) => ({ close: 100 + index, open: 99 + index, high: 101 + index, low: 98 + index, volume: 1000 + index * 50 }));
  const result = analyzeStock({ stock: { name: '示例', code: 'TEST' }, realtime: { price: 129, changePct: 1.2 }, klines });
  expect(result.rating).toBe('强势');
  expect(result.evidence.some(item => item.key === 'maAlignment')).toBe(true);
  expect(result.disclaimer).toContain('不构成投资建议');
});

it('refuses to manufacture analysis from missing bars', () => {
  expect(analyzeStock({ stock: {}, realtime: null, klines: [] }).status).toBe('insufficient_data');
});
