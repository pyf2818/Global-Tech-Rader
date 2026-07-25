import { expect, test } from '@playwright/test';
import { ensureE2eDatabase } from './db.js';
import { installExternalFixtures } from './fixtures.js';

test.skip(!process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL is required for community persistence E2E');

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

test('persists community post interactions across two browser contexts', async ({ browser }) => {
  const suffix = Date.now().toString(36);
  const title = `E2E shared intelligence ${suffix}`;
  const comment = `Bob persisted comment ${suffix}`;
  const alice = await browser.newContext();
  const bob = await browser.newContext();
  const alicePage = await alice.newPage();
  const bobPage = await bob.newPage();
  try {
    await openCommunity(alicePage);
    await register(alicePage, `alice_${suffix}`);
    await alicePage.getByTestId('community-open-composer').click();
    await alicePage.getByTestId('community-title-input').fill(title);
    await alicePage.getByTestId('community-body-input').fill('Evidence and analysis from Alice.');
    await alicePage.getByTestId('community-submit-post').click();
    await expect(alicePage.getByTestId('community-post').filter({ hasText: title })).toBeVisible();

    await openCommunity(bobPage);
    await register(bobPage, `bob_${suffix}`);
    const bobPost = bobPage.getByTestId('community-post').filter({ hasText: title });
    await expect(bobPost).toBeVisible();
    await bobPost.click();
    await expect(bobPage.getByTestId('community-detail')).toContainText(title);
    await bobPage.getByTestId('community-comment-input').fill(comment);
    await bobPage.getByTestId('community-submit-comment').click();
    await bobPage.getByTestId('community-detail-like').click();
    await bobPage.getByTestId('community-detail-bookmark').click();
    await bobPage.getByTestId('community-detail-follow').click();

    await expect(bobPage.getByTestId('community-detail')).toContainText(comment);
    await expect(bobPage.getByTestId('community-detail-like')).toContainText('1');
    await expect(bobPage.getByTestId('community-detail-bookmark')).toContainText('1');
    await expect(bobPage.getByTestId('community-detail-follow')).toHaveClass(/active/);

    await bobPage.reload();
    const reloadedBobPost = bobPage.getByTestId('community-post').filter({ hasText: title });
    await expect(reloadedBobPost.getByTestId('community-like')).toContainText('1');
    await expect(reloadedBobPost.getByTestId('community-bookmark')).toContainText('1');
    await expect(reloadedBobPost).toContainText(/1/);

    await alicePage.reload();
    const alicePost = alicePage.getByTestId('community-post').filter({ hasText: title });
    await expect(alicePost.getByTestId('community-like')).toContainText('1');
    await expect(alicePost.getByTestId('community-bookmark')).toContainText('1');
    await expect(alicePost).toContainText(/1/);
    await alicePost.click();
    await expect(alicePage.getByTestId('community-detail')).toContainText(comment);
  } finally {
    await alice.close();
    await bob.close();
  }
});

test('opens auth for signed-out writes and rolls back failed optimistic likes', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const title = `E2E rollback post ${suffix}`;
  await openCommunity(page);

  await page.getByTestId('community-open-composer').click();
  await expect(page.getByTestId('auth-modal')).toBeVisible();
  await page.locator('.modal-close').click();
  await expect(page.getByTestId('auth-modal')).toHaveCount(0);

  await register(page, `rollback_${suffix}`);
  await page.getByTestId('community-open-composer').click();
  await page.getByTestId('community-title-input').fill(title);
  await page.getByTestId('community-body-input').fill('A post used to verify optimistic rollback.');
  await page.getByTestId('community-submit-post').click();
  const post = page.getByTestId('community-post').filter({ hasText: title });
  await expect(post).toBeVisible();

  let failed = false;
  await page.route('**/api/community/posts/*/like', async route => {
    if (!failed && route.request().method() === 'PUT') {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: { code: 'TEST_WRITE_UNAVAILABLE', message: 'write unavailable' } }),
      });
      return;
    }
    await route.continue();
  });

  await post.getByTestId('community-like').click();
  await expect(post.getByTestId('community-like')).toContainText('0');
  await expect(page.getByTestId('community-error')).toContainText('write unavailable');
});
