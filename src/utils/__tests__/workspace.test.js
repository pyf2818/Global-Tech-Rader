import { describe, expect, it } from 'vitest';
import { materialToMarkdown } from '../workspace.js';

describe('workspace exports', () => {
  it('exports AI Elf materials with citation and handoff provenance', () => {
    const markdown = materialToMarkdown({
      id: 'm1',
      title: 'AI Elf research note',
      source: 'AI 精灵 / 风险雷达',
      content: 'A concise conclusion.',
      fullContent: 'A concise conclusion with more detail.',
      tags: ['AI精灵', 'AI工作站'],
      metadata: {
        origin: 'ai-elf',
        agentName: '风险雷达',
        sessionId: 's1',
      },
      createdAt: '2026-07-14T02:00:00Z',
    });

    expect(markdown).toContain('**交接来源**: AI 精灵 -> AI 工作站');
    expect(markdown).toContain('## 来源引用');
    expect(markdown).toContain('[1] AI Elf research note - AI 精灵 / 风险雷达');
    expect(markdown).toContain('"origin": "ai-elf"');
  });
});
