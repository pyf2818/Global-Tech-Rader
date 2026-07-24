import { describe, expect, it } from 'vitest';
import { normalizeAiHotItem, normalizeRssItem } from '../normalizeItem.js';
import { scoreIntelligenceItem } from '../impactScore.js';
import { clusterIntelligenceEvents } from '../eventCluster.js';
import { buildDailyIntelligenceBriefing } from '../dailyBriefing.js';

describe('intelligence processors', () => {
  it('normalizes AI HOT items into the Meridian intelligence item shape', () => {
    const item = normalizeAiHotItem({
      id: 'item-1',
      title: 'OpenAI releases a new agent model',
      summary: 'The update improves reasoning and developer API workflows.',
      url: 'https://example.com/openai-agent',
      source: 'OpenAI Blog',
      category: 'ai-models',
      publishedAt: '2026-07-24T00:00:00.000Z',
    });

    expect(item.id).toBe('aihot:item-1');
    expect(item.provider).toBe('aihot');
    expect(item.categoryLabel).toBe('Models');
    expect(item.entities).toContain('OpenAI');
    expect(item.tags).toContain('Models');
    expect(item.evidence.provider).toBe('AI HOT');
  });

  it('normalizes RSS intelligence items with traceable evidence', () => {
    const item = normalizeRssItem({
      id: 'rss-1',
      title: 'Anthropic updates Claude for enterprise teams',
      summary: 'Enterprise controls and deployment features were updated.',
      url: 'https://example.com/claude-enterprise',
      source: 'Anthropic News',
      sourceUrl: 'https://www.anthropic.com/news/rss.xml',
      category: 'ai-products',
      sourceTier: 'official',
      publishedAt: '2026-07-24T00:00:00.000Z',
    });

    expect(item.id).toBe('rss:rss-1');
    expect(item.provider).toBe('rss');
    expect(item.sourceTier).toBe('official');
    expect(item.entities).toContain('Anthropic');
    expect(item.evidence.provider).toBe('RSS');
  });

  it('scores official model updates above generic items', () => {
    const official = scoreIntelligenceItem({
      title: 'OpenAI releases GPT-5 agent API for enterprise developers',
      summary: 'The model improves reasoning, API workflows, and enterprise deployment.',
      source: 'OpenAI Blog',
      publishedAt: new Date().toISOString(),
    });

    const generic = scoreIntelligenceItem({
      title: 'A small plugin adds a new theme',
      summary: 'A community plugin ships a visual update.',
      source: 'Personal Blog',
      publishedAt: new Date(Date.now() - 7 * 24 * 3_600_000).toISOString(),
    });

    expect(official.heatScore).toBeGreaterThan(generic.heatScore);
    expect(official.impactScore).toBeGreaterThan(generic.impactScore);
    expect(official.reasons).toContain('official source');
  });

  it('clusters similar items into intelligence events', () => {
    const base = {
      category: 'ai-models',
      categoryLabel: 'Models',
      publishedAt: '2026-07-24T00:00:00.000Z',
      heatScore: 60,
      impactScore: 80,
      intelligenceScore: 74,
      entities: ['OpenAI'],
    };
    const events = clusterIntelligenceEvents([
      {
        ...base,
        id: 'a',
        title: 'OpenAI releases GPT-5 agent model',
        summary: 'Official launch.',
        source: 'OpenAI Blog',
        url: 'https://openai.com/gpt-5',
      },
      {
        ...base,
        id: 'b',
        title: 'OpenAI launches GPT-5 agent model for developers',
        summary: 'Developer API coverage.',
        source: 'The Verge',
        url: 'https://www.theverge.com/openai-gpt-5',
        intelligenceScore: 66,
      },
      {
        ...base,
        id: 'c',
        title: 'Anthropic updates Claude enterprise controls',
        source: 'Anthropic News',
        url: 'https://anthropic.com/claude-enterprise',
        entities: ['Anthropic'],
      },
    ]);

    expect(events).toHaveLength(2);
    expect(events[0].articleIds).toContain('a');
    expect(events[0].articleIds).toContain('b');
    expect(events[0].independentSourceCount).toBe(2);
  });

  it('builds a daily intelligence briefing from events', () => {
    const briefing = buildDailyIntelligenceBriefing({
      date: '2026-07-24',
      events: [
        {
          id: 'event-1',
          title: 'OpenAI releases GPT-5 agent model',
          summary: 'Major model release.',
          category: 'ai-models',
          categoryLabel: 'Models',
          entities: ['OpenAI'],
          sources: ['OpenAI Blog'],
          impactScore: 92,
          intelligenceScore: 88,
          confidence: 78,
          citations: [{ id: 'a', title: 'source', url: 'https://example.com' }],
        },
      ],
    });

    expect(briefing.ok).toBe(true);
    expect(briefing.date).toBe('2026-07-24');
    expect(briefing.lead.id).toBe('event-1');
    expect(briefing.sections[0].label).toBe('Model Releases');
    expect(briefing.watchEntities).toContain('OpenAI');
  });
});
