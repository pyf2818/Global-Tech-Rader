# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                              # Install dependencies
npm run dev                              # Dev server on 0.0.0.0:5175 (with API middleware)
npm run build                            # Production build -> dist/
npm start                                # Production Node server (dist + full API, default port 3000)
npm run preview                          # Preview production build (static only, no API)
npm test                                 # Run unit tests (vitest) — 168 tests across src/utils, src/domain, src/hooks/__tests__/
npm run test:watch                       # Watch mode
node node_modules/vitest/vitest.mjs run <file>  # Run a single test file (bin symlink not created on Windows)
npm run db:migrate
python scrapling_server.py               # Flask API on port 5000 (optional, for Scrapling scraping)
```

No lint, typecheck, or formatter commands exist.

**Important**: `vite preview` only serves static files — it does NOT run `server/newsPlugin.js`. Use `npm run dev` for a working instance with API endpoints. The `vite.config.js` port is **5175**, not the default 5173.

**Vitest on Windows**: `npx vitest` fails (bin symlink not created); use `node node_modules/vitest/vitest.mjs run` instead. If esbuild throws `EBUSY`, kill stale processes: `taskkill //F //IM esbuild.exe`. Vitest 4.x triggers rolldown native binding failures — pin to **vitest 3.x**.

## Architecture

**Tech Stack**: React 19 + Vite 7 + Tailwind CSS 3 + Three.js (react-globe.gl) + klinecharts (stock charts)

**Data Flow**: Vite middleware plugin (`server/news/plugin.js`) intercepts `/api/*` routes at dev-server level. Frontend uses native `fetch` to call these APIs. There is no Express/Koa — the plugin registers middleware directly on the Vite dev server.

**v2 Direction**: See `docs/wanban-silicon-valley-v2-blueprint.md`. The product is migrating from "news aggregator" to a "personal intelligence & creation OS" centered on daily briefing, user profile, materials library, agent workflows, and content creation. Current branch `codex/intelligence-workbench-redesign` implements this.

### Frontend (`src/`)

- **`App.jsx`** (10174 lines) - Main component containing ~140 useState hooks, routing logic, settings modal, and all page views. Being incrementally split into hooks and `src/blocks/`. Several UI sub-components (`SkeletonCard`, `NewsItem`, `GithubRepoCard`) are still **inline functions** at the bottom of App.jsx (lines ~9660/9702/10077), not separate files.
- **`AiElf.jsx`** (1354 lines) - AI assistant with multi-Agent conversation, drag-to-analyze, history management. Uses localStorage per-agent (50 messages, 20 sessions max). Lazy-loaded via `React.lazy`.
- **`GlobeView.jsx`** (999 lines) - 3D globe via `react-globe.gl`/Three.js. Fullscreen uses `createPortal` to `document.body`. Canvas needs `min-height: 420px`. Lazy-loaded.
- **`main.jsx`** - Mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **`styles.css`** (16052 lines) - CSS custom properties for dark/light themes. Tailwind config only sets content paths - no Tailwind utilities used in practice.
- **`themes.css`** (884 lines) - Multi-palette theme definitions.

#### Code Splitting

`GlobeView`, `AiElf`, and `StockPage` are loaded via `React.lazy` + `Suspense` (see top of App.jsx) so Three.js / klinecharts stay out of the first-screen bundle.

#### UI Architecture: Shell -> Page -> Block (in progress)

A Feishu-inspired three-layer refactor is underway. Block = reusable building-block system; Shell = global surfaces; Pages are being migrated incrementally (P1-P4 done, P5 page migration pending).

```
src/shell/
  CommandPalette.jsx    Global Ctrl+K / Cmd+K palette: page nav (9 main routes), news search, quick actions. Controlled component (open/onClose/onNavigate/onSearch/recentVisits props). Toggled via Ctrl/Cmd+K in App.jsx (~line 4117).
src/blocks/
  index.js              Barrel: exports BlockGrid, BlockPanel, BlockList, BlockToolbar, BlockStat
  BlockGrid.jsx         Grid container with .Card sub-component (<BlockGrid columns={3}><BlockGrid.Card .../></BlockGrid>)
  BlockPanel.jsx        Titled panel with optional action slot
  BlockList.jsx         List block
  BlockToolbar.jsx      Toolbar with .Pills sub-component; <BlockToolbar hidden> renders visually hidden
  BlockStat.jsx         Stat block (value/label/desc/size/variant/trendDir)
```

App.jsx consumes `BlockGrid, BlockPanel, BlockStat, BlockToolbar` from `./blocks/index.js` and `CommandPalette` from `./shell/CommandPalette.jsx`.

#### Extracted Modules (Phase 1-3 refactoring)

State has been progressively moved into hooks. Some logic (e.g. `generateDailyBriefing`, `intelligenceProfile` derivation, `buildWorkbenchContext`) still lives inline in App.jsx as `useMemo`s rather than standalone page modules.

**Standalone component files (actual, in `src/components/`):**
```
src/components/
  SettingsModal.jsx     (1377 lines, deeply nested tabs)
  ArticleEditor.jsx     Markdown article editor
  StockPage.jsx         股市动向三栏行情终端（637 lines; 分时/K线/五档/AI诊断）
  AiChatPanel.jsx       AI chat panel
  SourceOpsPanel.jsx    Source operations panel
  ColorfulBubbles.jsx   Decorative bubble animation
  WorkflowNodeCard.jsx  画布节点卡片
  WorkflowEdge.jsx      画布连线
  AiBriefingHome.jsx    AI 早报首页（基于 briefingEngine 的 lane 渲染）
  TodayNewspaper.jsx    今日情报报页
  RecommendationTimeline.jsx  推荐时间轴
  CommunityPage.jsx     社区广场页（nav='square'，发帖/评论/点赞/收藏/关注）
  CommunityPostDetail.jsx    社区帖子详情（被 CommunityPage 使用）
```

**NOT separate files (inline in App.jsx or located elsewhere):**
- `NewsItem`, `SkeletonCard`, `GithubRepoCard` are **inline functions** in App.jsx (bottom of file, ~lines 9660/9702/10077).
- `ThemePicker.jsx` lives at `src/ThemePicker.jsx` (NOT `src/components/`); exports default `ThemePicker` + named `PALETTES`.
- `HexRadarChart`, `TrendLineChart` are not present as files; rendering is inline.
- v2 pages `DailyReportPage`, `ProfileCenterPage`, `StudioPage`, `WorkflowCanvas` listed in older docs are **not separate files**. The daily briefing / intelligence profile / studio / workflow functionality is implemented inline in App.jsx via `useMemo` (`dailyBriefing` ~line 1770, `intelligenceProfile` ~line 2551), the `useWorkflowEngine` hook, and `nav === 'studio'` branches (~lines 1522/6150). Only `WorkflowNodeCard.jsx` + `WorkflowEdge.jsx` are extracted.

**Utility / hook / constant files (actual):**
```
src/utils/
  localStorage.js       loadLS/saveLS/clearStaleLS
  format.js             formatTime/formatRelative/formatStars + getGradeColors/hexToRgba
  toast.js              showToast DOM notification
  markdown.jsx          renderMarkdown/renderMarkdownWithImages/renderBriefMarkdown/renderInline
  repoInsight.js        deriveRepoInsight (本地规则派生 GitHub 项目情报)
  githubMaterial.js     buildGithubMaterial (construct material from GitHub repo)
  workflowEngine.js     Pure-logic DAG executor. LLM nodes call POST /api/ai-generate (chat action); local nodes (input/classifier/condition/skill/output/reply) run synchronously with no React dependency. Condition nodes halt the rest of the chain on failure.
  profileModel.js       computeIntelligenceProfile / computeReadingProfile / computeProfileLearningEngine / computeTodayProfileSnapshot - derive profile from bookmarks, reading history, materials, interests
src/constants/
  index.jsx             All constants + ICONS (SVG icon map with JSX)
  workflowConstants.js  DEFAULT_AGENT_WORKFLOW, WORKFLOW_NODE_TYPES, WORKFLOW_SKILL_CATALOG, WORKFLOW_CONDITION_METRICS, WORKFLOW_TEMPLATE_LIBRARY (3 templates: daily-briefing / github-evaluator / material-to-article) + template instance/normalize/validate helpers
src/hooks/
  useLocalStorage.js    Auto-syncing localStorage hook
  useAuth.js            认证与用户会话（user/token/auth表单/interests + 持久化 + handler）
  useLlmConfig.js       LLM配置与模型管理（config/models/test + allLlmModels useMemo）
  useTrending.js        热门榜单 + GitHub trending（items/loading/filter/page + loadTrending/loadGithub）
  useSourceManager.js   信息源管理（customSources/disabledSources/health/verify/discovery + 4 handler）
  useCustomUrl.js       自定义URL抓取（input/result/loading/error/mode + fetchCustomUrl）
  useCalendar.js        日历管理（calendarDate/events/eventForm + addEvent/removeEvent）
  useUI.js              纯UI开关（showFollowDropdown/mobileMenuOpen/showBackToTop/moreNavOpen）
  useStockWatchlist.js  股票自选列表（localStorage 持久化，add/remove/toggle/move）
  useStockAi.js         股市AI智能模块（诊断/早报/监控，联动LLM）
  useWorkflowEngine.js  React wrapper over WorkflowEngine: run/result/history/actions state, persists to localStorage `agentWorkflowHistory` (max 12)
  useCommunity.js       社区广场数据（posts/comments/likes，调用 /api/community/*）
  useProfileSync.js     画像分层同步（domainTiers/sourceTiers/specialFollows <-> /api/profile/state）
```

#### Domain Layer (`src/domain/`)

Pure-logic domain engines (no React, no HTTP), unit-tested in-place. App.jsx imports these directly.

```
src/domain/intelligence/
  profileTiers.js          PROFILE_TIERS (focus/normal/explore), SPECIAL_FOLLOW_TYPES, tier migration/score helpers
  recommendationEngine.js  buildRecommendation, selectBriefingLanes, clusterEvents, freshnessScore, matchSpecialFollow
  briefingEngine.js        buildAlgorithmBriefing (lane-based), mergeAiBriefing
  snapshotStore.js         createSnapshotStore (localStorage-backed daily recommendation/briefing snapshots)
src/domain/stock/
  indicators.js            simpleMovingAverage, annualizedVolatility, supportResistance, volumeTrend, priceMomentum
  algorithmAnalysis.js     analyzeStock (local technical analysis, no-LLM fallback for stock diagnosis)
```

#### v2 Intelligence Workbench (inline in App.jsx)

The v2 features described in `docs/wanban-silicon-valley-v2-blueprint.md` are wired into App.jsx (imported at top, used via `workflowEngine` hook and `useMemo`-derived briefing/profile data), NOT as separate page files. The engines themselves live in `src/utils/workflowEngine.js` + `src/utils/profileModel.js` + `src/constants/workflowConstants.js` (see above).

**Workflow node types**: `input`, `llm`, `skill`, `condition`, `classifier`, `reply`, `output`. Each node has `inputKey`/`outputKey` forming a variable chain; the first node's input is `buildWorkbenchContext()` (today's recommended items + profile + tracked terms + saved materials). `skill` nodes map to local builders: `evidence-pack`, `media-audit`, `material-extractor`, `profile-memory`, `article-outline`, `github-evaluator`.

### Stock Market Module (股市动向)

Three-column quote terminal (`src/components/StockPage.jsx`): left list (watchlist/hot tabs) | center chart (timeline/K-line) | right orderbook + metrics. AI diagnosis panel below the three columns.

```
src/components/StockPage.jsx   Three-column terminal: TimelineChart (SVG) + KLineChart (klinecharts) + OrderBook + AI panel
src/hooks/useStockWatchlist.js localStorage watchlist (add/remove/toggle/move)
src/hooks/useStockAi.js        AI modules: diagnoseStock / generateMorningBrief / checkAlerts (calls /api/ai-generate)
server/news/services/stockService.js  East Money (primary) + Tencent (fallback) data source
```

**Data source failover**: `getRealtime`/`getRealtimeBatch` try East Money `push2.eastmoney.com` first; on empty/error fall back to Tencent `qt.gtimg.cn` (GBK encoded, decoded via `TextDecoder('gbk')`). Tencent returns 88 `~`-separated fields; correct indices: 1=name 2=code 3=price 4=prevClose 5=open 6=volume 9-18=bids 19-28=asks 30=time 31=change 32=changePct 33=high 34=low.

**klinecharts v10 API**: `init(el, options)` -> Chart; use `chart.setSymbol()` + `chart.setPeriod()` + `chart.setDataLoader({ getBars })` (v10 removed `applyNewData`). Main pane stacks MA(5/10/20), VOL as sub-pane. A-share colors: red up / green down.

**AI compliance**: system prompts forbid buy/sell advice; all outputs suffixed with "仅供参考，不构成投资建议". No-LLM config shows a "配置大模型" guide (no algorithmic fallback for signals).

**localStorage keys**: `stockWatchlist` (array of {code,name,secid,market}), `stockAlertConditions` (map of code->conditionId).

### Backend (`server/news/`)


The backend has been modularized. `server/newsPlugin.js` is now a **16-line re-export shim** that points to `server/news/plugin.js`. All real logic lives in the `server/news/` tree:

```
server/newsPlugin.js          Re-export shim (16 lines)
server/news/
  plugin.js                   Vite plugin: registers middleware, routes /api/* requests (450 lines)
  config/
    constants.js              MEDIA_CONFIG, SOURCE_WEIGHTS, SOURCE_GRADES, DEFAULT_SOURCES (~52KB)
    sourceGrades.js           Source grade lookup utilities
  services/
    newsService.js            News aggregation, feed fetching, caching
    trendingService.js        Trending + GitHub trending (10min/30min caches)
    externalFetchers.js       Source fetching logic
    sourceDiscovery.js        Auto-discover RSS feeds from websites
  images/
    imageProcessing.js        Image extraction, scoring, validation (~21KB)
    imageResolver.js          Image resolution pipeline with Scrapling fallback (~21KB). Returns { imageUrl, videoUrl, images[] } - images is top-4 scored article images for grid display
  parsing/
    feedParser.js             RSS/Atom feed parsing and normalization
  utils/
    httpUtils.js              SSRF protection (isSafeUrl), sendJson, parseBody
    textProcessing.js         Text processing helpers
```

> **Note**: Auth no longer lives under `server/news/` - it moved to the platform layer (`server/auth/` + `server/http/authHandlers.js`). The old `server/news/auth/userAuth.js` was deleted.

**Route handling**: `plugin.js` uses `if (pathname === '/api/xxx')` pattern for each endpoint. When adding new API routes, add the handler in `plugin.js` and import services from the appropriate module.

**Production API**: `api/*.js` contains Vercel serverless functions. `api/meta.js` and `api/news.js` reuse `server/news/config/constants.js`. `api/auth/[action].js`, `api/community/[...path].js`, `api/profile/[...path].js` delegate to the **same** `server/http/*Handlers.js` as the dev plugin (no manual copy). `api/stock/[action].js` reuses `server/news/services/stockService.js` directly. When changing API behavior, prefer updating the shared handler/service; only `api/news.js`-style files that hand-copy plugin logic need both-side updates.

### Platform Backend (server/auth, server/community, server/profile, server/db, server/http)

PostgreSQL-backed platform layer (users, sessions, profiles, community, recommendation/briefing snapshots). Separate from the news-only `server/news/` tree. Requires `DATABASE_URL` + `npm run db:migrate`.

```
server/db/
  client.js                  pg Pool (reads DATABASE_URL and DATABASE_SSL)
  migrate.js                 Runs migrations (npm run db:migrate)
  migrations/001_platform.sql  Schema: users, sessions, user_profiles, profile_domains,
    profile_sources, special_follows, posts, comments, post_likes, post_bookmarks,
    user_follows, recommendation_snapshots, recommendation_items, briefing_snapshots,
    creation_assets, creation_documents, creation_versions
  migrations/002_runtime_indexes.sql  Runtime indexes for feeds, sessions, social counts, and creation assets
server/http/                 Shared HTTP handlers (used by BOTH dev plugin.js and api/ serverless)
  httpUtils.js               sendJsonResponse, readJsonBody, parseCookies, sessionCookie, routeError
  authHandlers.js            handleAuthRequest - register/login/logout/me/profile/interests
  communityHandlers.js       handleCommunityRequest - posts/comments/likes/bookmarks/follows
  profileHandlers.js         handleProfileRequest - profile state, tiers, special follows
server/auth/                 authService + authRepository + passwords (argon2-style hashing)
server/community/            communityService + communityRepository
server/profile/              profileService + profileRepository
```

### API Endpoints

| Endpoint | Method | Params | Notes |
|---|---|---|---|
| `/api/news` | GET | `blocked`, `custom`, `disabledSources`, `page`, `pageSize`, `search`, `interests` | Aggregated RSS feed with pagination |
| `/api/meta` | GET | — | Categories, modes, sources with grade info |
| `/api/trending` | GET | `platform`, `page`, `pageSize` | Hot-trending items |
| `/api/github-trending` | GET | `lang`, `since` | GitHub trending repos (30min cache) |
| `/api/verify-source` | GET | `url` | Validate RSS/Atom feed URL |
| `/api/discover-source` | GET | `url` | Auto-discover RSS feeds from a webpage |
| `/api/llm-models` | GET | `baseUrl`, `apiKey` | List available LLM models |
| `/api/llm-test` | POST | `baseUrl`, `apiKey`, `model`, `prompt` | Test LLM connection |
| `/api/ai-insights` | POST | `baseUrl`, `apiKey`, `model`, `items[]` | AI trend analysis on top 30 items |
| `/api/ai-generate` | POST | `baseUrl`, `apiKey`, `model`, `action`, `content`, `messages[]`, `systemPrompt` | Content generation; **chat** action requires `messages` array |
| `/api/fetch-page` | GET | `url` | Fetch webpage text content (SSRF-protected) |
| `/api/auth/{register,login,logout,me}` | POST/GET | `username`, `password`, `email`, `interests` | PG-backed; session cookie `meridian_session`. Dev + prod share `authHandlers.js` |
| `/api/user/{profile,interests}` | POST | `token`(cookie), `displayName`, `avatar`, `signature`, `interests` | Profile/interests update |
| `/api/community/{...path}` | GET/POST | varies | Posts, comments, likes, bookmarks, follows (PG-backed) |
| `/api/profile/state` | GET | - | Profile tiers (focus/normal/explore), special follows |
| `/api/stock/dashboard` | GET | - | Indices + hot stocks (60s cache, East Money + Tencent fallback) |
| `/api/stock/realtime` | GET | `code` | Realtime quote with 5-level order book (bids/asks) |
| `/api/stock/kline` | GET | `code`, `period` (101/102/103), `count` | K-line data (10min cache) |
| `/api/stock/timeline` | GET | `code` | Intraday minute timeline (60s cache) |
| `/api/stock/sectors` | GET | `type` (industry/concept) | Sector gainers/losers (60s cache) |
| `/api/stock/search` | GET | `keyword` | Stock code/name search |
| `/api/scrape` | POST | `url`, `mode`, `timeout` | Proxied to Scrapling Flask on :5000 |

### Security

`server/security/urlSafety.js` resolves DNS and blocks localhost/private/link-local/reserved addresses, credential-bearing URLs, and upstream redirects. Shared AI/page gateways also enforce body limits, timeouts, rate limits, and optional `AI_ALLOWED_HOSTS`. Legacy feed discovery routes additionally use `isSafeUrl()`.

### Caching

- `newsCache`: 5 min TTL, keyed by blocked/disabled/interests params
- `trendingCache`: 10 min TTL
- `githubCaches`: 30 min TTL, keyed by `${lang}-${since}`
- `imageResolveCache`: session-scoped (no TTL, in-memory only)
- Stock caches: realtime 60s, kline 10min, timeline 60s, sectors 60s

## Deployment

- **Vercel**: `vercel.json` maps `/api/*` to serverless functions in `api/`; static build served from `dist/`
- **Node**: `server/productionServer.js` serves `dist/` and the complete shared API on `PORT` (default 3000)
- **Docker**: Multi-stage Node 22 image; startup runs migrations and then the production server
- **Docker Compose**: application + PostgreSQL 15; Scrapling is an optional external service configured by `SCRAPLING_URL`
- **Vercel**: use Node/Docker for the complete long-lived platform; serverless-compatible routes remain in `api/`

## Critical Duplication (Must Update Both)

Categories, source grades, and tag rules are defined **independently** in both `server/news/config/constants.js` and `src/App.jsx`:

| | `server/news/config/constants.js` | `src/App.jsx` |
|---|---|---|
| Categories | 28 items with `all` | 27 items (no `all`) |
| Source Grades | `SOURCE_GRADES` with color/icon | `gradeColors` object (different hex values!) |
| Grade Badge Colors | S=#dc2626, A=#ea580c, B=#16a34a, C=#2563eb, D=#64748b | S=#ff0000, A=#ff8800, B=#00cc00, C=#0088ff, D=#666666 |

> **Note**: Phase 1 统一了分级色值——App.jsx 和 NewsItem（App.jsx 内联组件） 已改用服务端 `SOURCE_GRADES` 权威色（#dc2626 系）。`api/news.js` 和 `api/meta.js` 已复用 `server/news/config/constants.js`。App.jsx 的 `categories` 现从 `/api/meta` 加载（`serverCategories`），离线时降级到 `FALLBACK_CATEGORIES`——双源问题已消除。

- **Navigation**: Right context panel (`showRightPanel`) only shows on `nav === 'all'`. Global news search box (`search-wrap` in topbar) also only renders on `all`. Other pages (stock/github/studio/etc) have no right panel and full-width main. `navToPrimary` maps each nav to its primary group; missing entries fall back to `today` (caused stock highlight bug).
- **Multi-image**: NewsItem renders `item.images` (2-4 imgs) as a 2-col grid; lightbox state is `{ open, src, title, images, index }` supporting prev/next nav. `onOpenLightbox` signature: `(src, title, images, index)`.
- **GitHub card**: App.jsx has an **inline** `GithubRepoCard` function (defined near line 10077 in App.jsx, NOT a separate file). Inline version uses `inferGithubScenario/Audience/Difficulty/Value` + `buildGithubMaterial`; `deriveRepoInsight` in repoInsight.js is a parallel implementation. AI insight is collapsible by default.
## Known Issues

- **Tests limited to pure-logic engines** — 168 unit tests cover workflowEngine.js (69) + profileModel.js (70) + src/domain/intelligence (11) + src/domain/stock (3) + hooks/stockAnalysisController (2) + format/repoInsight/smoke (13); no integration/E2E tests, no component tests
- **RSS failure rate ~40-50%** — many sources return 403/404 or HTML instead of RSS
- **Auth requires PostgreSQL** - register/login/me/logout/profile/interests delegate to server/http/authHandlers.js -> server/auth/authService.js (password hashing + session tokens in sessions table). Dev (server/news/plugin.js) and prod (api/auth/[action].js) share the same handler. Without DATABASE_URL, auth endpoints return 503 DATABASE_UNAVAILABLE.
- **`package.json` type: "module"** — all `.js` files use ESM; CI workflows using `require()` will crash
- **GitHub API rate limit** — 60 req/hr unauthenticated; 30-min cache mitigates but README data may be empty when rate-limited

## Gotchas

- Dev server port is **5175** (configured in `vite.config.js`, not the default 5173)
- `vite.config.js` has `allowedHosts: ['.monkeycode-ai.online']`
- `/api/scrape` proxies to Scrapling Flask on port 5000 (must be started separately)
- `LLM_PRESETS` must be defined at **file scope** (top level), not inside a function — causes `ReferenceError` otherwise
- `GlobeView` canvas needs `min-height: 420px`; fullscreen uses `createPortal` to `document.body`; background effects need `pointer-events: none`
- `renderSourceGrade` uses `item.sourceGradeColor` (NOT `gradeColor`)
- Editor image upload uses placeholder syntax `![alt](#{id})`; call `renderMarkdownWithImages(text, images)` for preview
- AI Elf localStorage: all `setItem` calls wrapped in try-catch for `QuotaExceededError`
- When adding source grading features, declare: `sourceGrades`, `gradeFilter`, `sourceTypeTab`, `statusFilter`, `searchQuery`, `regionFilter`, `disabledSources` — do NOT add `selectedSources` or `batchMode` (batch ops are filter-based, no selection state)
- Settings modal JSX is deeply nested; each tab is a sibling inside `<div className="settings-content">`
- `scripts/` contains deployment and test scripts; `docs/reports/` contains historical optimization reports
- v2 localStorage keys: `agentWorkflowHistory` (workflow run records, max 12), `dailyBriefingReport` (last generated briefing). AI Elf uses per-agent keys. All `setItem` calls must be wrapped in try-catch for `QuotaExceededError`.
- WorkflowEngine: `condition` node failure halts the entire rest of the chain (subsequent nodes marked `skipped`), it does NOT branch. LLM nodes require `ctx.llmConfig` (baseUrl/apiKey/selectedModel) and an agent with `systemPrompt`; local nodes ignore LLM config entirely.
- The monolithic `App.jsx` (10174 lines) imports the v2 modules but ALSO retains inline copies of some logic — when editing workflow/profile/briefing behavior, check whether App.jsx calls the extracted module or its inline copy. Prefer the extracted module. State has been progressively extracted into hooks (useAuth/useLlmConfig/useTrending/useSourceManager/useCustomUrl/useCalendar/useUI); ~140 useState remain in App.jsx, mostly cross-domain coupled (bookmarks/materials/agentWorkflow).
- Runtime `ReferenceError: useMemo is not defined` means a component file uses `useMemo` without importing it from `react` — add `import { useMemo } from 'react'` to that file.
