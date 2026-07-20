import { expect, it } from 'vitest';
import { buildAlgorithmBriefing, mergeAiBriefing } from '../briefingEngine.js';

const lanes = {
  public: [{ id: 'p1', title: 'Public', category: 'ai', source: 'A' }],
  personal: [{ id: 'u1', title: 'Personal', category: 'chips', source: 'B', reasons: ['匹配关注领域'] }],
};

it('builds a usable model-free newspaper', () => {
  const result = buildAlgorithmBriefing({ date: '2026-07-14', lanes });
  expect(result.mode).toBe('algorithm');
  expect(result.sections.public[0].id).toBe('p1');
  expect(result.citationIds).toEqual(['p1', 'u1']);
});

it('rejects AI citations outside selected evidence', () => {
  const base = buildAlgorithmBriefing({ date: '2026-07-14', lanes });
  const merged = mergeAiBriefing(base, { oneLine: 'claim', citationIds: ['missing'] });
  expect(merged.mode).toBe('algorithm');
  expect(merged.aiValidationError).toContain('missing');
});
