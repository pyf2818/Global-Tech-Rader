import { expect, it, vi } from 'vitest';
import { runStockAnalysis } from '../useStockAi.js';

const input = {
  stock: { name: '示例', code: 'TEST' },
  realtime: { price: 129 },
  klines: Array.from({ length: 30 }, (_, index) => ({ close: 100 + index, high: 101 + index, low: 98 + index, volume: 1000 + index * 50 })),
};

it('returns algorithm analysis without LLM configuration', async () => {
  const result = await runStockAnalysis({ input, llmConfig: {}, callLlm: vi.fn() });
  expect(result.mode).toBe('algorithm');
  expect(result.rating).toBe('强势');
});

it('keeps algorithm evidence when AI enhancement fails', async () => {
  const result = await runStockAnalysis({
    input,
    llmConfig: { baseUrl: 'x', apiKey: 'x', selectedModel: 'x' },
    callLlm: vi.fn().mockRejectedValue(new Error('timeout')),
  });
  expect(result.mode).toBe('algorithm');
  expect(result.rating).toBe('强势');
  expect(result.aiError).toBe('timeout');
  expect(result.metrics.ma20).not.toBeNull();
});
