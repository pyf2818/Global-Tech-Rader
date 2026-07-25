# Platform Acceptance Evidence

Generated: 2026-07-25

## Verification Commands

| Command | Result | Evidence |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run src/domain/intelligence/__tests__/adversarial.test.js server/http/__tests__/security.test.js server/creative/__tests__/creativeService.test.js` | Pass | 3 files, 11 tests passed |
| `npm run test:integration` without `TEST_DATABASE_URL` | Skipped | 1 file, 3 tests skipped by design |
| `node scripts/verify-platform.mjs` | Pass with skips | Unit and build passed; integration skipped because `TEST_DATABASE_URL` is unset; E2E skipped when `RUN_E2E` is not `1` |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; $env:RUN_E2E='1'; node scripts\verify-platform.mjs` | Pass | Unit passed: 24 files, 221 tests, 7.3s. Build passed, 6.9s. Integration passed: 1 file, 3 tests, 3.2s. E2E passed: 5 Edge tests, 15.4s |
| `npm run test:e2e -- tests/e2e/creative.spec.js` | Pass | E2E passed: 3 Edge tests, 15.2s, covering news-to-asset document creation, restore-as-new-version semantics, and Markdown/JSON/HTML download contents |
| `npm run test:e2e -- tests/e2e/recommendations.spec.js` | Pass | E2E passed: 3 Edge tests, 14.3s, covering newspaper structure, duplicate OpenAI event clusters with both sources, and immutable historical snapshot replay |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; npm run test:e2e` | Pass | E2E passed: 14 Edge tests, 58.6s, including recommendation newspaper/history coverage, stock algorithm/failure modes and creative asset lineage/export downloads |

## Requirement Audit

| Requirement | Authoritative evidence | Result | Known limitation |
|---|---|---|---|
| Unit-level platform logic | `npm run test` through `verify-platform` | Passed: 24 files, 221 tests | Browser journeys are covered separately |
| Production build | `npm run build` through `verify-platform` | Passed | Existing Vite large chunk warning remains |
| PostgreSQL cross-user persistence | `tests/integration/platform.integration.test.js`; configured `TEST_DATABASE_URL` run through `verify-platform` | Passed: community cross-user post/comment/like, immutable recommendation snapshot, creative ownership/version restore | The disposable database is local Docker PostgreSQL on port 5433 |
| Creative ownership, lineage, append-only versions, and local exports | `server/creative/__tests__/creativeService.test.js`; `tests/integration/platform.integration.test.js`; `tests/e2e/creative.spec.js`; `tests/e2e/platform-pages.spec.js` | Passed at service, integration, and browser levels: browser covers news-to-asset document creation, restore to a third version, and downloaded Markdown/JSON/HTML citation contents with escaped hostile HTML | Uses deterministic browser fixtures rather than live upstream news |
| Security and adversarial behavior | `src/domain/intelligence/__tests__/adversarial.test.js`; `server/http/__tests__/security.test.js` | Passed | Does not replace full browser security testing |
| Browser AI home fixture flow | `tests/e2e/fixtures.js`; `tests/e2e/ai-home.spec.js`; configured `verify-platform` E2E run | Passed with system Edge | Uses deterministic fixtures, not live upstream services |
| Browser recommendation newspaper, dedupe and history flows | `tests/e2e/recommendations.spec.js`; `npm run test:e2e -- tests/e2e/recommendations.spec.js`; current full `npm run test:e2e` run | Passed: newspaper masthead/lead/columns/domain/risk/source citations, capped visible source repetition, duplicate OpenAI event expansion with both source links, and archived snapshot replay with algorithm/profile metadata | Uses deterministic browser fixtures and localStorage snapshots rather than live upstream services |
| Browser platform page smoke | `tests/e2e/platform-pages.spec.js`; configured `verify-platform` E2E run | Passed: recommendation/all dynamics, stock algorithm fixture, creative provenance/export controls, community/profile page open | Not a full substitute for every detailed Plan 5 browser case |
| Stock analysis and failure modes | `tests/e2e/stock.spec.js`; `$env:TEST_DATABASE_URL=...; npm run test:e2e` | Passed: algorithm mode without LLM configuration, stale cache state with timestamp, unavailable market data disables analysis | Uses deterministic market fixtures rather than live upstream services |
| Final acceptance completeness | `scripts/verify-platform.mjs` JSON summary and current E2E run | Improved but still partial against the full Plan 5 checklist | Remaining unchecked items include two-context community/profile browser persistence and final worktree/deployment audit |

## Current Notes

`npx playwright install chromium` timed out twice, including after approval for network access. The Playwright project now uses the installed Microsoft Edge channel, and the configured E2E suite passes.

The local Docker PostgreSQL container is `siliconstream-db` on port 5433. The disposable test database used for the passing run is `silicon_meridian_test`.

The active goal should not be marked complete until the remaining detailed browser scenarios in Plan 5 have direct evidence or are intentionally descoped by the user.
