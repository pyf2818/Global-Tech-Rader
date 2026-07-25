# Platform Acceptance Evidence

Generated: 2026-07-25

## Verification Commands

| Command | Result | Evidence |
|---|---:|---|
| `node node_modules/vitest/vitest.mjs run src/domain/intelligence/__tests__/adversarial.test.js server/http/__tests__/security.test.js server/creative/__tests__/creativeService.test.js` | Pass | 3 files, 11 tests passed |
| `npm run test:integration` without `TEST_DATABASE_URL` | Skipped | 1 file, 3 tests skipped by design |
| `node scripts/verify-platform.mjs` | Pass with skips | Unit and build passed; integration skipped because `TEST_DATABASE_URL` is unset; E2E skipped when `RUN_E2E` is not `1` |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; $env:RUN_E2E='1'; node scripts\verify-platform.mjs` | Pass | Unit passed: 24 files, 221 tests, 7.37s. Build passed, 11.78s. Integration passed: 1 file, 3 tests, 2.00s. E2E passed: 17 Edge tests, 1.3m. Verifier JSON: unit 11205ms, build 13769ms, integration 3625ms, E2E 78751ms |
| `npm run test:e2e -- tests/e2e/creative.spec.js` | Pass | E2E passed: 3 Edge tests, 15.2s, covering news-to-asset document creation, restore-as-new-version semantics, and Markdown/JSON/HTML download contents |
| `npm run test:e2e -- tests/e2e/recommendations.spec.js` | Pass | E2E passed: 3 Edge tests, 14.3s, covering newspaper structure, duplicate OpenAI event clusters with both sources, and immutable historical snapshot replay |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; npm run test:e2e -- tests/e2e/community.spec.js tests/e2e/profile.spec.js` | Pass | E2E passed: 3 Edge tests, 30.2s, covering two-context community persistence, signed-out auth gating, optimistic rollback on 503, profile tier persistence, recommendation score attribution and immutable snapshot replay |
| `$env:TEST_DATABASE_URL='postgresql://meridian:meridian-local-dev-2026-strong@localhost:5433/silicon_meridian_test'; npm run test:e2e` | Pass | E2E passed: 17 Edge tests, 1.3m, including DB-backed community/profile browser coverage, recommendation newspaper/history coverage, stock algorithm/failure modes and creative asset lineage/export downloads |
| `git status --short`; `git diff --check`; `.env.example`; `vercel.json`; `docker-compose.yml`; API function path inspection | Pass | Worktree inspection found only the intended acceptance work plus unrelated local `server/news/config/constants.js`, `.openanlan/`, and `dev-server.pid`; diff check exited 0 with CRLF warnings only; Docker `siliconstream-db` is healthy; Vercel rewrites `/api/(.*)` to API functions; PostgreSQL env examples and API function delegates were inspected |

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
| Browser community persistence, auth gating and rollback | `tests/e2e/community.spec.js`; focused DB-backed E2E run; current full DB-backed E2E run | Passed: Alice and Bob use isolated browser contexts against PostgreSQL; Alice publishes; Bob comments, likes, bookmarks and follows; reloads preserve counts and comment content; signed-out write opens auth; simulated 503 rolls optimistic like count back to zero and shows the error | Uses the local disposable PostgreSQL test database |
| Browser profile tiers, score attribution and immutable snapshots | `tests/e2e/profile.spec.js`; focused DB-backed E2E run; current full DB-backed E2E run | Passed: profile domain/source tiers and special follows persist through `/api/profile/state`; recommendation snapshot score parts prove focus domain, trusted source and special follow components; changing the profile later leaves the prior snapshot order unchanged | Uses deterministic browser fixtures and localStorage recommendation snapshots |
| Browser platform page smoke | `tests/e2e/platform-pages.spec.js`; configured `verify-platform` E2E run | Passed: recommendation/all dynamics, stock algorithm fixture, creative provenance/export controls, community/profile page open | Not a full substitute for every detailed Plan 5 browser case |
| Stock analysis and failure modes | `tests/e2e/stock.spec.js`; `$env:TEST_DATABASE_URL=...; npm run test:e2e` | Passed: algorithm mode without LLM configuration, stale cache state with timestamp, unavailable market data disables analysis | Uses deterministic market fixtures rather than live upstream services |
| Deployment and API parity audit | `.env.example`; `vercel.json`; `docker-compose.yml`; `api/auth/[action].js`; `api/community/[...path].js`; `api/profile/[...path].js`; `api/creative/[...path].js`; `api/intelligence/[...path].js`; `api/stock/[action].js` | Passed: PostgreSQL env variables are documented, Docker app waits on a healthy PostgreSQL service, Vercel routes API requests to function files, and production function delegates exist for auth, community, profile, creative, intelligence and stock paths | Live hosted deployment was not exercised from this workspace |
| Final acceptance completeness | `scripts/verify-platform.mjs` JSON summary and current E2E run | Passed against the full Plan 5 checklist with unit, build, integration, DB-backed E2E, browser failure modes, worktree/config inspection and requirement-by-requirement evidence | Live upstream services and hosted deployment remain outside this deterministic local acceptance run |

## Current Notes

`npx playwright install chromium` timed out twice, including after approval for network access. The Playwright project now uses the installed Microsoft Edge channel, and the configured E2E suite passes.

The local Docker PostgreSQL container is `siliconstream-db` on port 5433. The disposable test database used for the passing run is `silicon_meridian_test`.

Final DB-backed verifier passed on 2026-07-25 with all required suites enabled. Unrelated local files left untouched: `server/news/config/constants.js`, `.openanlan/`, and `dev-server.pid`.
