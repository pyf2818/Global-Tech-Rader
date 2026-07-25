import { expect, test } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

test('opens the intelligence home with deterministic external fixtures', async ({ page }) => {
  await installExternalFixtures(page);
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).toContainText(/AI|GitHub|智能|情报|工作/);
  await expect(page.getByText('OpenAI releases a new agent platform today').or(page.getByText('OpenAI releases new Agent platform')).first()).toBeVisible({ timeout: 15_000 });
});
