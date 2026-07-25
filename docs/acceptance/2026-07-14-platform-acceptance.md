# Platform Acceptance Evidence

Generated: 2026-07-25

## Verification Commands

| Command | Result | Evidence |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run src/domain/intelligence/__tests__/adversarial.test.js server/http/__tests__/security.test.js server/creative/__tests__/creativeService.test.js` | Pass | 3 files, 11 tests passed |
| `npm run test:integration` without `TEST_DATABASE_URL` | Skipped | 1 file, 3 tests skipped by design |
| `node scripts/verify-platform.mjs` | Pass with skips | Unit and build passed; integration skipped because `TEST_DATABASE_URL` is unset; E2E skipped when `RUN_E2E` is not `1` |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; $env:RUN_E2E='1'; node scripts\verify-platform.mjs` | Pass | Unit passed: 24 files, 221 tests, 7.3s. Build passed, 6.9s. Integration passed: 1 file, 3 tests, 3.2s. E2E passed: 5 Edge tests, 15.4s |

## Requirement Audit

| Requirement | Authoritative evidence | Result | Known limitation |
|---|---|---|---|
| Unit-level platform logic | `npm run test` through `verify-platform` | Passed: 24 files, 221 tests | Browser journeys are covered separately |
| Production build | `npm run build` through `verify-platform` | Passed | Existing Vite large chunk warning remains |
| PostgreSQL cross-user persistence | `tests/integration/platform.integration.test.js`; configured `TEST_DATABASE_URL` run through `verify-platform` | Passed: community cross-user post/comment/like, immutable recommendation snapshot, creative ownership/version restore | The disposable database is local Docker PostgreSQL on port 5433 |
| Creative ownership and append-only versions | `server/creative/__tests__/creativeService.test.js`; `tests/integration/platform.integration.test.js`; `tests/e2e/platform-pages.spec.js` | Passed at service, integration, and browser smoke levels | Browser smoke does not yet read downloaded Markdown/JSON/HTML files |
| Security and adversarial behavior | `src/domain/intelligence/__tests__/adversarial.test.js`; `server/http/__tests__/security.test.js` | Passed | Does not replace full browser security testing |
| Browser AI home fixture flow | `tests/e2e/fixtures.js`; `tests/e2e/ai-home.spec.js`; configured `verify-platform` E2E run | Passed with system Edge | Uses deterministic fixtures, not live upstream services |
| Browser platform page smoke | `tests/e2e/platform-pages.spec.js`; configured `verify-platform` E2E run | Passed: recommendation/all dynamics, stock algorithm fixture, creative provenance/export controls, community/profile page open | Not a full substitute for every detailed Plan 5 browser case |
| Final acceptance completeness | `scripts/verify-platform.mjs` JSON summary | Improved but still partial against the full Plan 5 checklist | Remaining unchecked items include stock stale/unavailable states, creative download-file assertions, and two-context community/profile browser persistence |

## Current Notes

`npx playwright install chromium` timed out twice, including after approval for network access. The Playwright project now uses the installed Microsoft Edge channel, and the configured E2E suite passes.

The local Docker PostgreSQL container is `siliconstream-db` on port 5433. The disposable test database used for the passing run is `silicon_meridian_test`.

The active goal should not be marked complete until the remaining detailed browser scenarios in Plan 5 have direct evidence or are intentionally descoped by the user.
