import { expect, test } from '@playwright/test';
import { ensureE2eDatabase } from './db.js';
import { installExternalFixtures } from './fixtures.js';

test.skip(!process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL is required for profile persistence E2E');

test.beforeAll(async () => {
  await ensureE2eDatabase();
});

async function openCommunity(page) {
  await installExternalFixtures(page, { community: false });
  await page.goto('/?view=square');
}

async function register(page, username) {
  await page.getByTestId('community-open-composer').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await page.getByTestId('auth-register-tab').click();
  await page.getByTestId('auth-username').fill(username);
  await page.getByTestId('auth-email').fill(`${username}@example.test`);
  await page.getByTestId('auth-password').fill('password123');
  await page.getByTestId('auth-confirm-password').fill('password123');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0);
}

async function installProfileSignals(page) {
  await page.evaluate(() => {
    localStorage.setItem('selectedInterests', JSON.stringify(['ai', 'chips']));
    const reads = [
      {
        id: 'read-openai-1',
        title: 'OpenAI releases a new agent platform today',
        source: 'OpenAI Blog',
        category: 'ai',
        summary: 'Official agent platform release.',
        publishedAt: '2026-07-14T01:00:00Z',
        readAt: new Date().toISOString(),
        isRead: true,
      },
      {
        id: 'read-openai-2',
        title: 'OpenAI releases new Agent platform',
        source: 'TechCrunch',
        category: 'ai',
        summary: 'Media coverage of the same agent platform.',
        publishedAt: '2026-07-14T02:00:00Z',
        readAt: new Date().toISOString(),
        isRead: true,
      },
      {
        id: 'read-nvidia-1',
        title: 'NVIDIA expands AI accelerator supply',
        source: 'NVIDIA Blog',
        category: 'chips',
        summary: 'Accelerator supply update.',
        publishedAt: '2026-07-14T04:00:00Z',
        readAt: new Date().toISOString(),
        isRead: true,
      },
    ];
    localStorage.setItem('readingHistory', JSON.stringify(reads));
    localStorage.setItem('bookmarks', JSON.stringify(reads));
  });
}

async function profileState(page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/profile/state', { credentials: 'include' });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload?.error?.message || 'profile state failed');
    return payload.data;
  });
}

function tierButton(page, kind, id, tier) {
  const rowAttr = kind === 'domain' ? 'data-domain-id' : 'data-source-id';
  return page.locator(`[data-testid="profile-${kind}-row"][${rowAttr}="${id}"] [data-testid="profile-${kind}-tier"][data-tier="${tier}"]`);
}

test('persists profile tiers and applies them to recommendation scoring and snapshots', async ({ page }) => {
  const suffix = Date.now().toString(36);
  await openCommunity(page);
  await register(page, `profile_${suffix}`);
  await installProfileSignals(page);

  await page.goto('/?view=profile-center');
  await expect(page.locator('[data-testid="profile-domain-row"][data-domain-id="ai"]')).toBeVisible();
  await expect(page.locator('[data-testid="profile-source-row"][data-source-id="TechCrunch"]')).toBeVisible();

  await tierButton(page, 'domain', 'ai', 'focus').click();
  await tierButton(page, 'domain', 'chips', 'explore').click();
  await tierButton(page, 'source', 'TechCrunch', 'focus').click();
  await page.getByTestId('profile-special-type').selectOption('source');
  await page.getByTestId('profile-special-target').fill('TechCrunch');
  await page.getByTestId('profile-special-note').fill('fixture source follow');
  await page.getByTestId('profile-special-submit').click();
  await expect(page.getByTestId('profile-special-follows')).toContainText('TechCrunch');

  await expect.poll(async () => {
    const state = await profileState(page);
    return {
      ai: state.domains.find(row => row.id === 'ai')?.tier,
      chips: state.domains.find(row => row.id === 'chips')?.tier,
      openai: state.sources.find(row => row.id === 'TechCrunch')?.tier,
      special: state.specialFollows.some(row => row.type === 'source' && row.target === 'TechCrunch'),
      version: state.version,
    };
  }, { timeout: 10_000 }).toEqual(expect.objectContaining({
    ai: 'focus',
    chips: 'explore',
    openai: 'focus',
    special: true,
  }));
  await page.evaluate(() => localStorage.removeItem('intelligenceSnapshots:v1'));

  await page.goto('/?view=recommendations');
  await page.locator('.recommendation-date-rail [data-date="2026-07-14"]').click();
  await expect(page.locator('main')).toContainText('TechCrunch');

  await expect.poll(async () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('intelligenceSnapshots:v1') || '{"snapshots":{}}');
    return Boolean(state.snapshots['2026-07-14']);
  }), { timeout: 10_000 }).toBeTruthy();
  const storedSnapshot = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('intelligenceSnapshots:v1') || '{"snapshots":{}}');
    return state.snapshots['2026-07-14'];
  });
  const openAiSnapshotItem = [...(storedSnapshot.lanes?.public || []), ...(storedSnapshot.lanes?.personal || [])]
    .find(item => item.source === 'TechCrunch');
  expect(openAiSnapshotItem?.title).toBe('OpenAI releases new Agent platform');
  expect(openAiSnapshotItem.scoreParts.personal.domain).toBe(25);
  expect(openAiSnapshotItem.scoreParts.personal.source).toBe(20);
  expect(openAiSnapshotItem.scoreParts.personal.specialFollow).toBe(25);
  const frozenTitle = storedSnapshot.lanes.personal[0].title;

  await page.goto('/?view=profile-center');
  await tierButton(page, 'domain', 'ai', 'explore').click();
  await expect.poll(async () => {
    const state = await profileState(page);
    return state.domains.find(row => row.id === 'ai')?.tier;
  }, { timeout: 10_000 }).toBe('explore');

  await page.goto('/?view=recommendations');
  await page.locator('.recommendation-date-rail [data-date="2026-07-14"]').click();
  const replayedSnapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('intelligenceSnapshots:v1')).snapshots['2026-07-14']);
  expect(replayedSnapshot.lanes.personal[0].title).toBe(frozenTitle);
});
