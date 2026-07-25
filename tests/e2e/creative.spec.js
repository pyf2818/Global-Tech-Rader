import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

const asset = {
  id: 'creative-asset-1',
  originalItemId: 'source-creative-1',
  title: 'Creative source material',
  content: 'Evidence paragraph from fixture.',
  fullContent: 'Evidence paragraph from fixture.',
  source: 'Fixture Lab',
  tags: ['fixture'],
  citation: {
    id: 'creative-asset-1',
    title: 'Creative source material',
    source: 'Fixture Lab',
    url: 'https://example.test/source',
    publishedAt: '2026-07-14T01:00:00Z',
  },
  createdAt: '2026-07-14T01:00:00Z',
  updatedAt: '2026-07-14T01:00:00Z',
};

const baseDocument = {
  id: 'creative-doc-1',
  title: 'Creative draft',
  draftContent: '# Original baseline\n\nEvidence paragraph from fixture.',
  status: 'draft',
  assetIds: ['creative-asset-1'],
  citations: [asset.citation],
  createdAt: '2026-07-14T01:00:00Z',
  updatedAt: '2026-07-14T01:00:00Z',
  versionNumber: 1,
};

const baseVersion = {
  id: 'creative-version-1',
  documentId: 'creative-doc-1',
  number: 1,
  title: 'Creative draft',
  content: '# Original baseline\n\nEvidence paragraph from fixture.',
  assetIds: ['creative-asset-1'],
  citations: [asset.citation],
  reason: 'manual',
  clientOperationId: 'creative-op-1',
  createdAt: '2026-07-14T01:00:00Z',
};

async function openApp(page, seed = null) {
  await installExternalFixtures(page);
  await page.addInitScript(seedState => {
    for (const key of [
      'materials',
      'creativeAssets:v1',
      'creativeDocuments:v1',
      'creativeVersions:v1',
      'creativeWorkspaceMigration:v1',
    ]) {
      localStorage.removeItem(key);
    }
    if (!seedState) return;
    localStorage.setItem('creativeAssets:v1', JSON.stringify(seedState.assets || []));
    localStorage.setItem('creativeDocuments:v1', JSON.stringify(seedState.documents || []));
    localStorage.setItem('creativeVersions:v1', JSON.stringify(seedState.versions || {}));
    localStorage.setItem('creativeWorkspaceMigration:v1', JSON.stringify({ done: true }));
  }, seed);
  await page.goto('/');
}

async function openStudio(page) {
  await page.locator('.nav-primary-item').filter({ hasText: '智创' }).click();
  await expect(page.locator('main[data-nav="studio"]')).toBeVisible();
}

test('turns a news card into a creative asset and document with provenance', async ({ page }) => {
  await openApp(page);
  await page.locator('.nav-primary-item').filter({ hasText: '动态' }).click();
  const allPage = page.locator('main[data-nav="all"]');
  await expect(allPage.locator('.feed-list')).toContainText('OpenAI releases new Agent platform');

  await allPage.locator('.feed-list .add-material-btn').first().click();
  await openStudio(page);

  await expect(page.locator('.creative-asset-list')).toContainText('OpenAI releases new Agent platform');
  await expect(page.locator('.creative-asset-provenance')).toContainText('TechCrunch');
  await expect(page.locator('.creative-asset-provenance')).toContainText('https://techcrunch.com/openai-agent');

  await page.getByRole('button', { name: 'Create from asset' }).click();
  await expect(page.locator('.creative-document-panel')).toContainText('OpenAI releases new Agent platform draft');
  await expect(page.locator('.creative-document-panel')).toContainText('1 linked assets');
});

test('restores an older creative version as a new immutable snapshot', async ({ page }) => {
  await openApp(page, {
    assets: [asset],
    documents: [baseDocument],
    versions: { 'creative-doc-1': [baseVersion] },
  });
  await openStudio(page);

  await page.locator('.creative-proposal-panel textarea').fill('Second version paragraph [asset:creative-asset-1]');
  await page.getByRole('button', { name: 'Insert as new version' }).click();
  await expect(page.locator('.creative-document-panel')).toContainText('Second version paragraph');
  await expect(page.locator('.creative-document-panel')).toContainText('2 versions');

  await page.getByRole('button', { name: 'Restore v1' }).click();
  await expect(page.locator('.creative-document-panel')).toContainText('Original baseline');
  await expect(page.locator('.creative-document-panel')).toContainText('3 versions');
});

test('downloads markdown json and html exports with sources and escaped html', async ({ page }) => {
  const hostileDocument = {
    ...baseDocument,
    draftContent: '# Export target\n\n<script>alert("x")</script>\n\nEvidence [asset:creative-asset-1]',
  };
  await openApp(page, {
    assets: [asset],
    documents: [hostileDocument],
    versions: { 'creative-doc-1': [{ ...baseVersion, content: hostileDocument.draftContent }] },
  });
  await openStudio(page);

  for (const format of ['md', 'json', 'html']) {
    await page.locator('.creative-export-row select').selectOption(format);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export local' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    const content = await readFile(path, 'utf8');

    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
    expect(content).toContain('Creative source material');
    expect(content).toContain('Fixture Lab');
    expect(content).toContain('https://example.test/source');
    if (format === 'html') {
      expect(content).not.toContain('<script>alert("x")</script>');
      expect(content).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    }
  }
});
