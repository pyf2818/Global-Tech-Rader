import { describe, it, expect } from 'vitest';
import { deriveRepoInsight } from '../repoInsight.js';

describe('deriveRepoInsight', () => {
  it('从 language 推断适用人群', () => {
    const r = deriveRepoInsight({ language: 'Python', topics: [], description: '', totalStars: 100 });
    expect(r.audience).toContain('数据工程师 / AI 研究者');
  });

  it('从 topics 推断应用场景', () => {
    const r = deriveRepoInsight({ language: 'TypeScript', topics: ['react', 'ui'], description: 'a ui lib', totalStars: 200 });
    expect(r.scenarios).toContain('前端开发');
  });

  it('AI 主题同时加 AI 场景和 AI 受众', () => {
    const r = deriveRepoInsight({ language: 'Python', topics: ['llm', 'gpt'], description: 'llm toolkit', totalStars: 5000 });
    expect(r.scenarios).toContain('AI / 机器学习');
    expect(r.audience).toContain('AI 应用开发者');
  });

  it('无匹配时降级为通用开发 + 全栈工程师', () => {
    const r = deriveRepoInsight({ language: '', topics: [], description: 'something', totalStars: 10 });
    expect(r.scenarios).toEqual(['通用开发']);
    expect(r.audience).toEqual(['全栈工程师']);
  });

  it('stars 量级决定技术价值文案', () => {
    expect(deriveRepoInsight({ totalStars: 60000 }, 'daily').techValue).toContain('行业级基础设施');
    expect(deriveRepoInsight({ totalStars: 15000 }, 'weekly').techValue).toContain('主流技术栈');
    expect(deriveRepoInsight({ totalStars: 4000 }, 'monthly').techValue).toContain('稳步增长');
    expect(deriveRepoInsight({ totalStars: 800 }, 'weekly').techValue).toContain('新兴上升');
    expect(deriveRepoInsight({ totalStars: 100 }, 'daily').techValue).toContain('小众但活跃');
  });

  it('since 周期映射到文案', () => {
    expect(deriveRepoInsight({ totalStars: 100 }, 'daily').techValue).toMatch(/今日/);
    expect(deriveRepoInsight({ totalStars: 100 }, 'monthly').techValue).toMatch(/本月/);
    expect(deriveRepoInsight({ totalStars: 100 }, 'weekly').techValue).toMatch(/本周/);
  });

  it('scenarios 和 audience 数量有上限', () => {
    const r = deriveRepoInsight({
      language: 'Python',
      topics: ['api', 'cli', 'ml', 'docker', 'security', 'game', 'database'],
      description: 'everything framework tool',
      totalStars: 100,
    });
    expect(r.scenarios.length).toBeLessThanOrEqual(3);
    expect(r.audience.length).toBeLessThanOrEqual(2);
  });

  it('description 关键词也能触发场景', () => {
    const r = deriveRepoInsight({ language: 'Go', topics: [], description: 'a fast blockchain node', totalStars: 100 });
    expect(r.scenarios).toContain('区块链');
  });

  it('缺失字段不报错', () => {
    const r = deriveRepoInsight({});
    expect(r.scenarios.length).toBeGreaterThan(0);
    expect(r.audience.length).toBeGreaterThan(0);
    expect(typeof r.techValue).toBe('string');
  });
});
