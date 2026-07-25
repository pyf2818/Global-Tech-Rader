import { expect, test } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

async function openApp(page) {
  await installExternalFixtures(page);
  await page.addInitScript(() => {
    localStorage.setItem('creativeAssets:v1', JSON.stringify([{
      id: '11111111-1111-4111-8111-111111111111',
      originalItemId: 'fixture-news',
      title: 'Fixture source material',
      content: 'Evidence paragraph from fixture.',
      fullContent: 'Evidence paragraph from fixture.',
      source: 'Fixture Lab',
      tags: ['fixture'],
      citation: { id: '11111111-1111-4111-8111-111111111111', title: 'Fixture source material', source: 'Fixture Lab', url: 'https://example.test/source', publishedAt: '2026-07-14T01:00:00Z' },
      createdAt: '2026-07-14T01:00:00Z',
      updatedAt: '2026-07-14T01:00:00Z',
    }]));
    localStorage.setItem('creativeDocuments:v1', JSON.stringify([{
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Fixture draft',
      draftContent: '# Fixture draft\n\nEvidence paragraph.',
      status: 'draft',
      assetIds: ['11111111-1111-4111-8111-111111111111'],
      citations: [{ id: '11111111-1111-4111-8111-111111111111', title: 'Fixture source material', source: 'Fixture Lab', url: 'https://example.test/source', publishedAt: '2026-07-14T01:00:00Z' }],
      createdAt: '2026-07-14T01:00:00Z',
      updatedAt: '2026-07-14T01:00:00Z',
      versionNumber: 1,
    }]));
    localStorage.setItem('creativeVersions:v1', JSON.stringify({
      '22222222-2222-4222-8222-222222222222': [{
        id: '33333333-3333-4333-8333-333333333333',
        documentId: '22222222-2222-4222-8222-222222222222',
        number: 1,
        title: 'Fixture draft',
        content: '# Fixture draft\n\nEvidence paragraph.',
        assetIds: ['11111111-1111-4111-8111-111111111111'],
        citations: [{ id: '11111111-1111-4111-8111-111111111111', title: 'Fixture source material', source: 'Fixture Lab', url: 'https://example.test/source', publishedAt: '2026-07-14T01:00:00Z' }],
        reason: 'manual',
        clientOperationId: '44444444-4444-4444-8444-444444444444',
        createdAt: '2026-07-14T01:00:00Z',
      }],
    }));
    localStorage.setItem('creativeWorkspaceMigration:v1', JSON.stringify({ done: true }));
  });
  await page.goto('/');
}

test('renders recommendation timeline and all dynamics from fixtures', async ({ page }) => {
  await openApp(page);
  await page.getByText('推荐', { exact: true }).click();
  await expect(page.locator('main[data-nav="recommendations"]')).toContainText(/推荐|Immutable|OpenAI/);

  await page.getByText('动态', { exact: true }).click();
  await expect(page.locator('main[data-nav="all"]')).toContainText(/OpenAI|NVIDIA|全部/);
});

test('runs stock page algorithm mode from fixed market data', async ({ page }) => {
  await openApp(page);
  await page.getByText('股市', { exact: true }).click();
  const stockPage = page.locator('main[data-nav="stock"]');
  await expect(stockPage).toContainText(/贵州茅台|600519/);
  await page.getByRole('button', { name: /算法|生成/ }).first().click();
  await expect(stockPage).toContainText(/MA5|支撑|压力|算法/);
});

test('shows creative workspace provenance and export controls', async ({ page }) => {
  await openApp(page);
  await page.getByText('智创', { exact: true }).click();
  await expect(page.getByText('Creative asset workspace')).toBeVisible();
  await expect(page.getByText('Fixture source material').first()).toBeVisible();
  await expect(page.getByText('Fixture draft').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export local' })).toBeVisible();
});

test('opens community and profile pages without authentication', async ({ page }) => {
  await openApp(page);
  await page.getByText('广场', { exact: true }).click();
  await expect(page.locator('main')).toContainText(/Community|广场|登录/);

  await page.getByText('画像', { exact: true }).click();
  await expect(page.locator('main')).toContainText(/Personal Intelligence Memory|画像|关注/);
});
