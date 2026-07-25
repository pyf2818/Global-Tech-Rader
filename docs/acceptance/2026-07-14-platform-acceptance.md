# Platform Acceptance Evidence

Generated: 2026-07-25

## Verification Commands

| Command | Result | Evidence |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run src/domain/intelligence/__tests__/adversarial.test.js server/http/__tests__/security.test.js server/creative/__tests__/creativeService.test.js` | Pass | 3 files, 11 tests passed |
| `npm run test:integration` without `TEST_DATABASE_URL` | Skipped | 1 file, 3 tests skipped by design |
| `node scripts/verify-platform.mjs` | Pass with skips | Unit and build passed; integration skipped because `TEST_DATABASE_URL` is unset; E2E skipped when `RUN_E2E` is not `1` |
| `$env:RUN_E2E='1'; node scripts\verify-platform.mjs` | Pass with integration skip | Unit passed: 24 files, 221 tests. Build passed. E2E passed: 1 Edge test. Integration skipped because `TEST_DATABASE_URL` is unset |

## Requirement Audit

| Requirement | Authoritative evidence | Result | Known limitation |
|---|---|---|---|
| Unit-level platform logic | `npm run test` through `verify-platform` | Passed: 24 files, 221 tests | Browser journeys are not covered by unit tests |
| Production build | `npm run build` through `verify-platform` | Passed | Existing Vite large chunk warning remains |
| PostgreSQL cross-user persistence | `tests/integration/platform.integration.test.js` | Test coverage added | Requires `TEST_DATABASE_URL` to execute against a disposable test database |
| Creative ownership and append-only versions | `server/creative/__tests__/creativeService.test.js`; `tests/integration/platform.integration.test.js` | Unit passed; integration coverage added | Integration execution pending local test database |
| Security and adversarial behavior | `src/domain/intelligence/__tests__/adversarial.test.js`; `server/http/__tests__/security.test.js` | Passed | Does not replace full browser security testing |
| Browser AI home fixture flow | `tests/e2e/fixtures.js`; `tests/e2e/ai-home.spec.js`; `$env:RUN_E2E='1'; node scripts\verify-platform.mjs` | Passed with system Edge | This is a smoke journey, not the full browser matrix from Plan 5 |
| Final acceptance completeness | `scripts/verify-platform.mjs` JSON summary | Partial | Final completion still requires configured integration tests and the remaining browser scenarios |

## Current Limitation

`npx playwright install chromium` timed out twice, including after approval for network access. The Playwright project now uses the installed Microsoft Edge channel, and the current E2E smoke test passes.

Docker is not running and no local PostgreSQL listener is available on ports 5432 or 5433, so `TEST_DATABASE_URL` cannot currently point to a disposable local database from this environment.

The active goal should not be marked complete until:

- `TEST_DATABASE_URL` points to a disposable PostgreSQL test database and `npm run test:integration` passes.
- The remaining browser scenarios in Plan 5 are implemented and `RUN_E2E=1 npm run test:e2e` passes.
- `RUN_E2E=1 TEST_DATABASE_URL=... npm run verify:platform` reports every required configured suite as passed.
