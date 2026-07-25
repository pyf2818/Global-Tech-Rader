import { expect, test } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

async function openApp(page, view = 'recommendations', init) {
  await installExternalFixtures(page);
  if (init) await page.addInitScript(init);
  await page.goto(`/?view=${view}`);
}

test('renders newspaper structure from the selected recommendation snapshot', async ({ page }) => {
  await openApp(page, 'home', () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('intelligenceSnapshots:v1', JSON.stringify({
      version: 1,
      snapshots: {
        [today]: {
          date: today,
          version: 1,
          createdAt: `${today}T12:00:00Z`,
          profileVersion: 3,
          algorithmVersion: 'newspaper-fixture',
          lanes: {
            public: [
              {
                id: 'np-openai',
                title: 'OpenAI releases a new agent platform today',
                source: 'OpenAI Blog',
                category: 'ai',
                publishedAt: `${today}T01:00:00Z`,
                summary: 'Official agent platform release.',
                url: 'https://openai.com/index/agents',
                mustReadScore: 95,
                reasons: ['fixture'],
              },
              {
                id: 'np-nvidia',
                title: 'NVIDIA expands AI accelerator supply',
                source: 'NVIDIA Blog',
                category: 'chips',
                publishedAt: `${today}T02:00:00Z`,
                summary: 'Accelerator supply update.',
                url: 'https://nvidia.com/blog/ai-chip',
                mustReadScore: 89,
                reasons: ['fixture'],
              },
            ],
            personal: [
              {
                id: 'np-tsmc',
                title: 'TSMC adds advanced packaging capacity',
                source: 'Reuters',
                category: 'chips',
                publishedAt: `${today}T03:00:00Z`,
                summary: 'Packaging capacity expands.',
                url: 'https://reuters.com/tsmc-packaging',
                mustReadScore: 87,
                reasons: ['fixture'],
              },
              {
                id: 'np-google',
                title: 'Google Cloud adds enterprise AI controls',
                source: 'Google Cloud Blog',
                category: 'cloud',
                publishedAt: `${today}T04:00:00Z`,
                summary: 'Enterprise AI control plane.',
                url: 'https://cloud.google.com/blog/ai-controls',
                mustReadScore: 84,
                reasons: ['fixture'],
              },
            ],
          },
          briefing: {
            date: today,
            mode: 'algorithm',
            oneLine: 'Fixture newspaper briefing',
            opportunities: ['Opportunity from fixture'],
            risks: ['Risk from fixture'],
          },
          stats: { total: 4 },
          updates: [],
        },
      },
    }));
  });

  await page.locator('.session-newspaper-btn').click();

  const newspaper = page.locator('.today-newspaper');
  await expect(newspaper).toBeVisible();
  await expect(newspaper.locator('.newspaper-masthead h1')).toBeVisible();
  await expect(newspaper.locator('.newspaper-edition time')).toBeVisible();
  await expect(newspaper.locator('.newspaper-lead')).toBeVisible();
  await expect(newspaper.locator('.newspaper-columns')).toBeVisible();
  await expect(newspaper.locator('.newspaper-domain-band')).toBeVisible();
  await expect(newspaper.locator('.newspaper-judgement-band')).toBeVisible();
  await expect(newspaper.locator('.newspaper-sources')).toBeVisible();
  await expect(newspaper).toContainText(/OpenAI|NVIDIA/);
  await expect(newspaper.locator('.newspaper-columns > section')).toHaveCount(2);

  const sourceCounts = await newspaper.locator('.newspaper-sources li span').evaluateAll(nodes => {
    const counts = new Map();
    for (const node of nodes) {
      const source = node.textContent?.trim();
      if (!source) continue;
      counts.set(source, (counts.get(source) || 0) + 1);
    }
    return [...counts.values()];
  });
  expect(sourceCounts.every(count => count <= 2)).toBe(true);
});

test('groups duplicate event clusters in all dynamics without losing sources', async ({ page }) => {
  await openApp(page, 'all');

  const allPage = page.locator('main[data-nav="all"]');
  const cluster = allPage.locator('.event-cluster-card').filter({ hasText: 'OpenAI' }).first();
  await expect(cluster).toBeVisible();
  await expect(cluster.locator('.cluster-count')).toContainText('2');

  await cluster.locator('.cluster-header').click();

  const clusterItems = cluster.locator('.cluster-items');
  await expect(clusterItems).toContainText('OpenAI releases a new agent platform today');
  await expect(clusterItems).toContainText('OpenAI releases new Agent platform');
  await expect(clusterItems).toContainText('OpenAI Blog');
  await expect(clusterItems).toContainText('TechCrunch');
  await expect(cluster.locator('a[href="https://openai.com/index/agents"]')).toHaveCount(1);
  await expect(cluster.locator('a[href="https://techcrunch.com/openai-agent"]')).toHaveCount(1);
});

test('replays an immutable historical recommendation snapshot', async ({ page }) => {
  await openApp(page, 'recommendations', () => {
    localStorage.setItem('intelligenceSnapshots:v1', JSON.stringify({
      version: 1,
      snapshots: {
        '2026-07-13': {
          date: '2026-07-13',
          version: 1,
          createdAt: '2026-07-13T12:00:00Z',
          profileVersion: 7,
          algorithmVersion: 'fixture-v0',
          lanes: {
            personal: [{
              id: 'hist-personal',
              title: 'Historical immutable personal brief',
              source: 'Archive Lab',
              category: 'ai',
              publishedAt: '2026-07-13T01:00:00Z',
              summary: 'Frozen personal snapshot.',
              mustReadScore: 91,
              reasons: ['archived'],
            }],
            public: [{
              id: 'hist-public',
              title: 'Historical immutable public brief',
              source: 'Archive Wire',
              category: 'chips',
              publishedAt: '2026-07-13T02:00:00Z',
              summary: 'Frozen public snapshot.',
              mustReadScore: 88,
              reasons: ['archived'],
            }],
          },
          briefing: { oneLine: 'Historical frozen briefing' },
          stats: { total: 2 },
          updates: [],
        },
      },
    }));
  });

  const recommendations = page.locator('main[data-nav="recommendations"]');
  await page.locator('.recommendation-date-rail [data-date="2026-07-13"]').click();

  await expect(recommendations).toContainText('Historical immutable personal brief');
  await expect(recommendations).toContainText('Historical immutable public brief');
  await expect(recommendations.locator('.recommendation-snapshot-meta')).toContainText('Snapshot 2026-07-13');
  await expect(recommendations.locator('.recommendation-snapshot-meta')).toContainText('Algorithm fixture-v0');
  await expect(recommendations.locator('.recommendation-snapshot-meta')).toContainText('Profile v7');

  const todayButton = page.locator('.recommendation-date-rail [data-date="2026-07-14"]');
  if (await todayButton.count()) {
    await todayButton.click();
    await page.locator('.recommendation-date-rail [data-date="2026-07-13"]').click();
    await expect(recommendations).toContainText('Historical immutable personal brief');
  }

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('intelligenceSnapshots:v1')).snapshots['2026-07-13']);
  expect(stored.algorithmVersion).toBe('fixture-v0');
  expect(stored.profileVersion).toBe(7);
  expect(stored.lanes.personal[0].title).toBe('Historical immutable personal brief');
});
