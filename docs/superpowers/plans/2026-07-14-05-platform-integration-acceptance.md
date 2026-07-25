# Platform Integration and Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the complete AI intelligence platform satisfies all seven product requirements across deterministic logic, PostgreSQL persistence, development/production APIs, browser interactions, failure modes and production build.

**Architecture:** Unit tests prove pure domain invariants, PostgreSQL integration tests prove persistence and cross-user behavior, handler tests prove API parity, and Playwright proves critical browser journeys. A generated acceptance report maps every approved requirement to commands and observed evidence; no item is marked complete from indirect evidence.

**Tech Stack:** Vitest, PostgreSQL 15, Playwright, React 19, Vite 8, Node.js 20+

---

## Current verification update

2026-07-25: the platform verifier passed with local Docker PostgreSQL and Edge E2E:

```powershell
$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'
$env:RUN_E2E='1'
node scripts\verify-platform.mjs
```

Observed result: unit passed (24 files, 221 tests), build passed, integration passed (1 file, 3 tests), E2E passed (5 Edge tests). A later focused E2E run passed 8 Edge tests after adding stock failure-mode coverage. This proves the configured suites, but the detailed unchecked browser scenarios below remain open until covered directly.

## File map

- Create `tests/integration/platform.integration.test.js` and database test helpers.
- Create `tests/e2e/ai-home.spec.js`, `recommendations.spec.js`, `stock.spec.js`, `creative.spec.js`, `community.spec.js`, `profile.spec.js`.
- Create `playwright.config.js`, `scripts/verify-platform.mjs`.
- Modify `package.json`, `vitest.config.js`, `.gitignore`.
- Create `docs/acceptance/2026-07-14-platform-acceptance.md` during the final task with actual results.

### Task 1: Add separate integration and browser test commands

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.js`
- Create: `playwright.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: Install Playwright test runtime**

Run: `npm install --save-dev @playwright/test@^1.55.0`

Run: `npx playwright install chromium`

Expected: Chromium browser installation succeeds.

- [x] **Step 2: Add non-overlapping scripts**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.js",
    "test:e2e": "playwright test",
    "verify:platform": "node scripts/verify-platform.mjs"
  }
}
```

- [x] **Step 3: Configure Playwright**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', timeout: 30_000, retries: 1, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5175', reuseExistingServer: true, timeout: 120_000 },
});
```

- [x] **Step 4: Isolate integration tests**

Create `vitest.integration.config.js` with `include: ['tests/integration/**/*.test.js']`, `environment: 'node'`, `fileParallelism: false`, and a 30-second timeout. Keep normal unit tests independent from PostgreSQL.

- [x] **Step 5: Ignore generated artifacts and commit**

Ignore `playwright-report/`, `test-results/`, `.superpowers/`, and `.data/` without changing existing user ignore rules.

```bash
git add package.json package-lock.json playwright.config.js vitest.config.js vitest.integration.config.js .gitignore
git commit -m "test: add integration and browser acceptance harnesses"
```

### Task 2: Prove PostgreSQL persistence and cross-user invariants

**Files:**
- Create: `tests/integration/dbTestUtils.js`
- Create: `tests/integration/platform.integration.test.js`

- [x] **Step 1: Create isolated database test helpers**

`withTestDatabase` requires `TEST_DATABASE_URL`, creates a unique schema `test_<random>`, sets `search_path`, applies all migrations, and drops the schema in `finally`. Refuse to run when the database name does not contain `test` or the URL is missing `TEST_DATABASE_URL`.

- [x] **Step 2: Write the two-account community scenario**

```js
it('persists a cross-user post and idempotent interactions', async () => {
  const alice = await auth.register({ username: 'alice_test', email: 'alice@example.test', password: 'long-password-a' });
  const bob = await auth.register({ username: 'bob_test', email: 'bob@example.test', password: 'long-password-b' });
  const post = await community.createPost({ userId: alice.user.id, input: { type: 'article', title: 'Shared intelligence', body: 'Evidence and analysis', visibility: 'public' } });
  await community.setLike({ userId: bob.user.id, postId: post.id, liked: true });
  await community.setLike({ userId: bob.user.id, postId: post.id, liked: true });
  await community.createComment({ userId: bob.user.id, postId: post.id, input: { body: 'Useful evidence' } });
  expect((await community.getPost({ postId: post.id, viewerId: bob.user.id })).likeCount).toBe(1);
  expect((await community.listComments({ postId: post.id, viewerId: alice.user.id }))).toHaveLength(1);
});
```

- [x] **Step 3: Write profile/snapshot immutability tests**

Save profile version 1, create a dated snapshot, change tiers to create profile version 2, and assert the stored snapshot still references version 1 with unchanged item positions and score parts.

- [x] **Step 4: Write creative ownership/version tests**

Save a document and two versions as Alice, assert Bob cannot read it, restore version 1, and assert a third version is inserted rather than version 2 being overwritten.

- [x] **Step 5: Run against local PostgreSQL and commit**

Run: `$env:DB_PASSWORD='meridian_test'; docker compose up -d postgres`

Expected: `tech-radar-db` is healthy and was initialized with the dedicated local test password.

Actual local evidence used `siliconstream-db` on port 5433 with password `meridian-local-dev-2026-strong`.

Run: `docker exec tech-radar-db createdb -U meridian silicon_meridian_test`

Expected: the disposable test database is created; if it already exists, verify it is dedicated to tests before continuing.

Run: `$env:TEST_DATABASE_URL='postgresql://meridian:meridian_test@localhost:5432/silicon_meridian_test'; npm run test:integration`

Expected: all integration tests pass and temporary schemas are removed.

Actual result: `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; npm run test:integration` passed 1 file and 3 tests.

```bash
git add tests/integration
git commit -m "test: prove platform persistence invariants"
```

### Task 3: Add deterministic browser API fixtures

**Files:**
- Create: `tests/e2e/fixtures.js`

- [x] **Step 1: Define fixed news and profile fixtures**

Use 12 items across AI, chips, cloud and robotics, with at least six sources, fixed 2026-07-14 timestamps, two duplicate canonical event IDs, one special-follow source, and public/personal score inputs.

- [x] **Step 2: Intercept unstable external reads only**

Export `installExternalFixtures(page)` that fulfills `/api/news`, `/api/meta`, `/api/trending`, `/api/github-trending`, and market upstream-facing browser routes. Do not intercept auth/community/profile/creative APIs in persistence tests.

- [x] **Step 3: Add fixture contract assertions**

Assert IDs are unique, duplicate canonical IDs are intentional, dates are fixed, and every item has title/source/category/publishedAt.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/fixtures.js
git commit -m "test: add deterministic intelligence browser fixtures"
```

### Task 4: Verify AI home, newspaper and recommendation timeline

**Files:**
- Create: `tests/e2e/ai-home.spec.js`
- Create: `tests/e2e/recommendations.spec.js`

- [x] **Step 1: Test model-free default home**

```js
import { test, expect } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

test('opens on a model-free AI daily briefing', async ({ page }) => {
  await installExternalFixtures(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /今日情报/ })).toBeVisible();
  await expect(page.getByText('公共热点')).toBeVisible();
  await expect(page.getByText('个人必看')).toBeVisible();
  await expect(page.getByText(/算法分析|算法简报/)).toBeVisible();
});
```

- [ ] **Step 2: Test newspaper structure**

Navigate to 今日速报 and assert headline, both lanes, domain sections, risk section, source citations and updated time exist. Assert no more than two visible items share one source.

- [ ] **Step 3: Test duplicate grouping in 全部动态**

Navigate to 全部动态 and assert the two paraphrased OpenAI fixture items render as one event card labeled “2 个独立来源”. Expand it and assert both original links and source names remain accessible.

- [ ] **Step 4: Test immutable historical timeline**

Create the 2026-07-14 local snapshot, change profile tiers, navigate away/back, and assert the 2026-07-14 item order is unchanged. A 2026-07-13 date without a snapshot shows an empty state rather than current items.

- [ ] **Step 5: Run and commit**

Run: `npx playwright test tests/e2e/ai-home.spec.js tests/e2e/recommendations.spec.js`

Expected: PASS.

```bash
git add tests/e2e/ai-home.spec.js tests/e2e/recommendations.spec.js
git commit -m "test: cover AI briefing and recommendation history"
```

### Task 5: Verify stock analysis and failure modes

**Files:**
- Create: `tests/e2e/stock.spec.js`

- [x] **Step 1: Test algorithm mode without configuration**

Fulfill fixed quotes and 120 rising K-line bars, navigate to 股市动向, select the stock, run analysis, and assert `算法分析`, `强势`, MA values, support, resistance, risk and disclaimer are visible.

- [x] **Step 2: Test stale cache state**

Fulfill a normalized `{ ok: true, stale: true, source: 'cache' }` response and assert the UI displays “缓存行情” and the timestamp.

- [x] **Step 3: Test unavailable data**

Fulfill `{ ok: false, error: { code: 'MARKET_DATA_UNAVAILABLE' } }`; assert analysis is disabled and no rating is shown.

- [x] **Step 4: Run and commit**

Run: `npx playwright test tests/e2e/stock.spec.js`

Expected: PASS.

Actual result: `npm run test:e2e -- tests/e2e/stock.spec.js` passed 3 Edge tests, and the full `npm run test:e2e` suite passed 8 Edge tests.

```bash
git add tests/e2e/stock.spec.js
git commit -m "test: cover stock fallback and stale data states"
```

### Task 6: Verify creative asset lineage and exports

**Files:**
- Create: `tests/e2e/creative.spec.js`

- [ ] **Step 1: Test news-to-asset-to-document flow**

Open a fixture news item, add it to materials, enter 智创空间, create a document from it, and assert the source title, publisher and URL remain visible.

- [ ] **Step 2: Test version restore semantics**

Save content A, save content B, restore A, and assert version count becomes three and content A is active.

- [ ] **Step 3: Test downloaded formats**

Use Playwright download events for Markdown, JSON and HTML. Read each file and assert the source citation exists; assert HTML contains no executable `<script>` from hostile editor text.

- [ ] **Step 4: Run and commit**

Run: `npx playwright test tests/e2e/creative.spec.js`

Expected: PASS.

```bash
git add tests/e2e/creative.spec.js
git commit -m "test: cover creative provenance versions and exports"
```

### Task 7: Verify real community and profile tiers in the browser

**Files:**
- Create: `tests/e2e/community.spec.js`
- Create: `tests/e2e/profile.spec.js`

- [ ] **Step 1: Test two browser contexts against PostgreSQL**

Use two isolated contexts. Alice registers and publishes; Bob registers, opens the same post, comments, likes, bookmarks and follows. Reload both contexts and assert persisted counts and comment content.

- [ ] **Step 2: Test unauthorized and rollback behavior**

Signed-out interaction opens auth. Simulate a 503 write response and assert optimistic count returns to its previous value with an error message.

- [ ] **Step 3: Test three-tier profile effects**

Set AI domain/source to 一级, chips to 三级, add one special follow, generate the next date's snapshot, and assert score explanations contain the correct tier components. Change tiers and assert the prior date is unchanged.

- [ ] **Step 4: Run and commit**

Run: `npx playwright test tests/e2e/community.spec.js tests/e2e/profile.spec.js`

Expected: PASS with `TEST_DATABASE_URL` and `DATABASE_URL` pointing to the disposable test database.

```bash
git add tests/e2e/community.spec.js tests/e2e/profile.spec.js
git commit -m "test: cover community persistence and profile tiers"
```

### Task 8: Add adversarial platform verification

**Files:**
- Create: `scripts/verify-platform.mjs`
- Create: `src/domain/intelligence/__tests__/adversarial.test.js`
- Create: `server/http/__tests__/security.test.js`

- [x] **Step 1: Add recommendation attacks**

Test one source submitting 50 articles, copied content with changed titles, future timestamps, malformed dates, 100 special-follow rules and extreme behavior signals. Assert source/category caps, canonical dedupe, finite scores and behavior/special-follow limits.

- [x] **Step 2: Add prompt-injection and citation attacks**

Use a community post containing “ignore previous instructions” and nonexistent citation IDs. Assert the content remains delimited as evidence, invalid citations are rejected, and algorithm briefing remains visible.

- [x] **Step 3: Add HTTP attacks**

Test oversized JSON, invalid UUIDs, stored script tags, duplicate relationships, unauthorized ownership, expired sessions and missing database configuration. Assert 400/401/403/409/413/503 responses and no secrets in payloads.

- [x] **Step 4: Implement the verification orchestrator**

`verify-platform.mjs` runs, in order, unit tests, build, integration tests when `TEST_DATABASE_URL` exists, and E2E tests when `RUN_E2E=1`. It prints a JSON summary and exits nonzero on any required failure; skipped external suites are explicitly `skipped`, never `passed`.

- [x] **Step 5: Run and commit**

Run: `npm run verify:platform`

Expected: unit and build pass; integration/E2E pass when configured or are explicitly reported skipped.

```bash
git add scripts/verify-platform.mjs src/domain/intelligence/__tests__/adversarial.test.js server/http/__tests__/security.test.js
git commit -m "test: add adversarial platform verification"
```

### Task 9: Execute the final requirement-by-requirement audit

**Files:**
- Create: `docs/acceptance/2026-07-14-platform-acceptance.md`

- [x] **Step 1: Run all authoritative commands**

```powershell
npm run test
npm run build
$env:TEST_DATABASE_URL='postgresql://meridian:meridian_test@localhost:5432/silicon_meridian_test'; npm run test:integration
$env:RUN_E2E='1'; npm run test:e2e
```

Expected: every command exits 0. Record exact test counts, durations and build output.

Actual result: configured full verifier passed with `TEST_DATABASE_URL` and `RUN_E2E=1`; exact counts are recorded in `docs/acceptance/2026-07-14-platform-acceptance.md`.

- [x] **Step 2: Audit each approved requirement**

Create a table with columns `Requirement`, `Authoritative evidence`, `Result`, `Known limitation`. Include separate rows for all seven modules, AI fallback, dev/prod parity, history immutability, security, failure states and local export citations.

- [ ] **Step 3: Inspect the final worktree and deployment configuration**

Run: `git status --short`, `git diff --check`, and inspect `.env.example`, `vercel.json`, Docker PostgreSQL health check and every new API function path. Unrelated pre-existing user changes remain untouched and are listed separately.

- [ ] **Step 4: Fix any failed or weak evidence**

Do not mark a requirement complete until its named unit, integration and/or E2E evidence covers the full behavior. Add a focused regression test with the fix, rerun the smallest suite, then rerun the final verification set.

- [x] **Step 5: Commit the acceptance record**

```bash
git add docs/acceptance/2026-07-14-platform-acceptance.md
git commit -m "docs: record platform acceptance evidence"
```

## Final completion gate

- Every approved requirement has direct evidence in the acceptance report.
- No requirement relies only on code presence or a broad build check.
- Unit, integration, E2E and build commands pass.
- PostgreSQL persistence is tested across restart-capable storage.
- AI absence/failure and upstream data failure are exercised.
- No unresolved high-severity security or data-loss issue remains.
