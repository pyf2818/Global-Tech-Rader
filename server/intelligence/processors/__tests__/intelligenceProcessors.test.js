import { describe, expect, it } from 'vitest';
import { normalizeAiHotItem, normalizeRssItem } from '../normalizeItem.js';
import { scoreIntelligenceItem } from '../impactScore.js';
import { clusterIntelligenceEvents } from '../eventCluster.js';
import { buildDailyIntelligenceBriefing } from '../dailyBriefing.js';
import { buildEntityProfiles, findEntityProfile } from '../entityExtract.js';
import { buildOpportunitySignals } from '../opportunityAnalysis.js';
import { applyPersonalScores } from '../personalScore.js';
import { buildWeeklySectorAnalysis } from '../weeklySectorAnalysis.js';

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

  it('builds entity profiles from clustered intelligence events', () => {
    const events = [
      {
        id: 'event-1',
        title: 'OpenAI releases GPT-5 agent model',
        summary: 'Major model release.',
        category: 'ai-models',
        categoryLabel: 'Models',
        entities: ['OpenAI'],
        sources: ['OpenAI Blog', 'The Verge'],
        heatScore: 82,
        impactScore: 92,
        intelligenceScore: 88,
        firstSeenAt: '2026-07-24T00:00:00.000Z',
        lastSeenAt: '2026-07-24T02:00:00.000Z',
        citations: [{ id: 'a', title: 'source', url: 'https://example.com' }],
      },
      {
        id: 'event-2',
        title: 'OpenAI expands enterprise deployment',
        summary: 'Enterprise controls were updated.',
        category: 'ai-products',
        categoryLabel: 'Products',
        entities: ['OpenAI'],
        sources: ['OpenAI Blog'],
        heatScore: 65,
        impactScore: 72,
        intelligenceScore: 74,
        firstSeenAt: '2026-07-23T00:00:00.000Z',
        lastSeenAt: '2026-07-23T01:00:00.000Z',
      },
    ];

    const profiles = buildEntityProfiles(events);
    const openai = findEntityProfile(events, 'openai');

    expect(profiles).toHaveLength(1);
    expect(openai.name).toBe('OpenAI');
    expect(openai.type).toBe('company');
    expect(openai.eventCount).toBe(2);
    expect(openai.sourceCount).toBe(2);
    expect(openai.impactScore).toBe(92);
    expect(openai.relatedEvents[0].id).toBe('event-1');
  });

  it('builds opportunity and risk signals from intelligence events', () => {
    const signals = buildOpportunitySignals([
      {
        id: 'event-market',
        title: 'NVIDIA announces enterprise AI cloud partnership',
        summary: 'The deployment expands enterprise customers and cloud revenue opportunities.',
        entities: ['NVIDIA'],
        sources: ['NVIDIA Blog', 'Reuters'],
        independentSourceCount: 2,
        heatScore: 80,
        impactScore: 88,
        intelligenceScore: 84,
        confidence: 78,
        lastSeenAt: '2026-07-24T02:00:00.000Z',
        citations: [{ id: 'a', url: 'https://example.com' }],
      },
      {
        id: 'event-risk',
        title: 'AI model faces copyright lawsuit',
        summary: 'A lawsuit raises copyright and policy risk for training data.',
        entities: ['OpenAI'],
        sources: ['Reuters'],
        independentSourceCount: 1,
        heatScore: 70,
        impactScore: 82,
        intelligenceScore: 77,
        confidence: 70,
        lastSeenAt: '2026-07-24T01:00:00.000Z',
      },
    ]);

    expect(signals[0].type).toBe('market');
    expect(signals[0].label).toBe('Market Opportunity');
    expect(signals.some(signal => signal.type === 'risk')).toBe(true);
    expect(signals[0].score).toBeGreaterThan(70);
  });

  it('applies personal scores to matching intelligence events', () => {
    const events = applyPersonalScores([
      {
        id: 'robotics',
        title: 'Robotics startup launches warehouse agent',
        summary: 'A new robotics deployment reaches enterprise customers.',
        category: 'robotics',
        categoryLabel: 'Robotics',
        intelligenceScore: 60,
        confidence: 80,
        independentSourceCount: 2,
        entities: ['NVIDIA'],
        sources: ['NVIDIA Blog'],
      },
      {
        id: 'generic',
        title: 'Generic AI roundup',
        summary: 'Several updates happened.',
        category: 'industry',
        intelligenceScore: 65,
        confidence: 30,
        independentSourceCount: 1,
        entities: [],
        sources: ['Personal Blog'],
      },
    ], { interests: 'robotics,NVIDIA' });

    expect(events[0].id).toBe('robotics');
    expect(events[0].personalScore).toBeGreaterThan(events[1].personalScore);
    expect(events[0].personalReasons).toContain('interest:robotics');
  });

  it('builds weekly sector analysis with opportunities and risks', () => {
    const now = Date.parse('2026-07-24T12:00:00.000Z');
    const analysis = buildWeeklySectorAnalysis([
      {
        id: 'model-launch',
        title: 'OpenAI releases developer agent API',
        summary: 'Developer launch expands enterprise adoption.',
        category: 'ai-models',
        categoryLabel: 'Models',
        entities: ['OpenAI'],
        sources: ['OpenAI Blog', 'The Verge'],
        heatScore: 90,
        impactScore: 92,
        intelligenceScore: 88,
        confidence: 82,
        lastSeenAt: '2026-07-24T02:00:00.000Z',
      },
      {
        id: 'model-risk',
        title: 'AI model faces copyright lawsuit',
        summary: 'Regulation and copyright risk increase.',
        category: 'ai-models',
        categoryLabel: 'Models',
        entities: ['OpenAI'],
        sources: ['Reuters'],
        heatScore: 72,
        impactScore: 84,
        intelligenceScore: 78,
        confidence: 76,
        lastSeenAt: '2026-07-23T02:00:00.000Z',
      },
      {
        id: 'robotics',
        title: 'Robotics company announces warehouse deployment',
        summary: 'Enterprise deployment reaches new customers.',
        category: 'robotics',
        categoryLabel: 'Robotics',
        entities: ['NVIDIA'],
        sources: ['NVIDIA Blog'],
        heatScore: 64,
        impactScore: 74,
        intelligenceScore: 72,
        lastSeenAt: '2026-07-22T02:00:00.000Z',
      },
      {
        id: 'old',
        title: 'Old AI update',
        category: 'ai-models',
        heatScore: 99,
        impactScore: 99,
        intelligenceScore: 99,
        lastSeenAt: '2026-06-01T02:00:00.000Z',
      },
    ], { now, days: 7 });

    expect(analysis.ok).toBe(true);
    expect(analysis.eventCount).toBe(3);
    expect(analysis.sectors[0].category).toBe('ai-models');
    expect(analysis.sectors[0].eventCount).toBe(2);
    expect(analysis.sectors[0].keyEntities[0]).toEqual({ name: 'OpenAI', count: 2 });
    expect(analysis.opportunities.some(signal => signal.id === 'model-launch')).toBe(true);
    expect(analysis.risks.some(signal => signal.id === 'model-risk')).toBe(true);
  });
});
