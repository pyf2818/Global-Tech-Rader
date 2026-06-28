# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                              # Install dependencies
npm run dev                              # Dev server on 0.0.0.0:5175 (with API middleware)
npm run build                            # Production build -> dist/
npm run preview                          # Preview production build (static only, no API)
python scrapling_server.py               # Flask API on port 5000 (optional, for Scrapling scraping)
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

**Important**: `vite preview` only serves static files — it does NOT run `server/newsPlugin.js`. Use `npm run dev` for a working instance with API endpoints. The `vite.config.js` port is **5175**, not the default 5173.

## Architecture

**Tech Stack**: React 19 + Vite 8 + Tailwind CSS 3 + Three.js (react-globe.gl)

**Data Flow**: Vite middleware plugin (`server/news/plugin.js`) intercepts `/api/*` routes at dev-server level. Frontend uses native `fetch` to call these APIs. There is no Express/Koa — the plugin registers middleware directly on the Vite dev server.

**v2 Direction**: See `docs/wanban-silicon-valley-v2-blueprint.md`. The product is migrating from "news aggregator" to a "personal intelligence & creation OS" centered on daily briefing, user profile, materials library, agent workflows, and content creation. Current branch `codex/intelligence-workbench-redesign` implements this.

### Frontend (`src/`)

- **`App.jsx`** (10302 lines) — Main component containing ~180 useState hooks, routing logic, settings modal, and all page views. Being incrementally split into hooks below.
- **`AiElf.jsx`** (1354 lines) — AI assistant with multi-Agent conversation, drag-to-analyze, history management. Uses localStorage per-agent (50 messages, 20 sessions max).
- **`GlobeView.jsx`** (999 lines) — 3D globe via `react-globe.gl`/Three.js. Fullscreen uses `createPortal` to `document.body`. Canvas needs `min-height: 420px`.
- **`main.jsx`** — Mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **`styles.css`** (14560 lines) — CSS custom properties for dark/light themes. Tailwind config only sets content paths — no Tailwind utilities used in practice.
- **`themes.css`** (884 lines) — Multi-palette theme definitions.

#### Extracted Modules (Phase 1 refactoring)

Components, utilities, constants, and hooks extracted from App.jsx. Currently imported but App.jsx also has inline copies — these will diverge as App.jsx is further refactored.

```
src/components/
  NewsItem.jsx          News card with grade badge, translation, media
  SkeletonCard.jsx      Loading skeleton
  HexRadarChart.jsx     SVG radar/spider chart
  TrendLineChart.jsx    SVG line chart with hover
  GithubRepoCard.jsx    GitHub repo card
  SettingsModal.jsx     Settings modal (1377 lines, deeply nested tabs)
  AiChatPanel.jsx       AI chat panel
  ArticleEditor.jsx     Markdown article editor
  ColorfulBubbles.jsx   Decorative bubble animation
  SourceOpsPanel.jsx    Source operations panel
  ThemePicker.jsx       Multi-palette theme selector
src/utils/
  localStorage.js       loadLS/saveLS/clearStaleLS
  format.js             formatTime/formatRelative/formatStars
  toast.js              showToast DOM notification
  markdown.jsx          renderMarkdown/renderMarkdownWithImages/renderBriefMarkdown/renderInline
src/constants/
  index.jsx             All constants + ICONS (SVG icon map with JSX)
src/hooks/
  useLocalStorage.js    Auto-syncing localStorage hook
  useAuth.js            认证与用户会话（user/token/auth表单/interests + 持久化 + handler）
  useLlmConfig.js       LLM配置与模型管理（config/models/test + allLlmModels useMemo）
```

#### v2 Intelligence Workbench Modules

New pages and engines wired into App.jsx (imported at top, used via `workflowEngine` hook and `useMemo`-derived briefing/profile data):

```
src/components/
  DailyReportPage.jsx   每日汇报页 — AI-generated daily briefing (summary, must-reads, impact, signals, material cards)
  ProfileCenterPage.jsx 用户画像页 — focus labels, depth, reading/materials/bookmarks history, profile snapshot
  StudioPage.jsx        智创中心页 — materials library + content creation hub
  WorkflowCanvas.jsx    智能体工作流画布 — node DAG editor + run viewer (uses reactflow-style nodes/edges)
  WorkflowNodeCard.jsx  画布节点卡片
  WorkflowEdge.jsx      画布连线
src/hooks/
  useWorkflowEngine.js  React wrapper over WorkflowEngine: run/result/history/actions state, persists to localStorage `agentWorkflowHistory` (max 12)
src/utils/
  workflowEngine.js     Pure-logic DAG executor. LLM nodes call POST /api/ai-generate (chat action); local nodes (input/classifier/condition/skill/output/reply) run synchronously with no React dependency. Condition nodes halt the rest of the chain on failure.
  profileModel.js       computeIntelligenceProfile / computeReadingProfile / computeProfileLearningEngine / computeTodayProfileSnapshot — derive profile from bookmarks, reading history, materials, interests
src/constants/
  workflowConstants.js  DEFAULT_AGENT_WORKFLOW, WORKFLOW_NODE_TYPES, WORKFLOW_SKILL_CATALOG, WORKFLOW_CONDITION_METRICS, WORKFLOW_TEMPLATE_LIBRARY (3 templates: daily-briefing / github-evaluator / material-to-article), and template instance/normalize/validate helpers
```

**Workflow node types**: `input`, `llm`, `skill`, `condition`, `classifier`, `reply`, `output`. Each node has `inputKey`/`outputKey` forming a variable chain; the first node's input is `buildWorkbenchContext()` (today's recommended items + profile + tracked terms + saved materials). `skill` nodes map to local builders: `evidence-pack`, `media-audit`, `material-extractor`, `profile-memory`, `article-outline`, `github-evaluator`.

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
    imageResolver.js          Image resolution pipeline with Scrapling fallback (~21KB)
  parsing/
    feedParser.js             RSS/Atom feed parsing and normalization
  auth/
    userAuth.js               Dev-only in-memory user auth
  utils/
    httpUtils.js              SSRF protection (isSafeUrl), sendJson, parseBody
    textProcessing.js         Text processing helpers
```

**Route handling**: `plugin.js` uses `if (pathname === '/api/xxx')` pattern for each endpoint. When adding new API routes, add the handler in `plugin.js` and import services from the appropriate module.

**Production API**: `api/*.js` contains Vercel serverless functions. `api/meta.js` and `api/news.js` now复用 `server/news/config/constants.js`；其他文件仍为 plugin 逻辑的手工副本。When changing API behavior, update **both** `server/news/plugin.js` and the corresponding `api/*.js` file for production parity.

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
| `/api/auth/register` | POST | `username`, `password`, `email`, `interests` | Dev-only, in-memory |
| `/api/auth/login` | POST | `username`, `password` | Dev-only |
| `/api/scrape` | POST | `url`, `mode`, `timeout` | Proxied to Scrapling Flask on :5000 |

### Security

`isSafeUrl()` blocks requests to localhost, private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x). Applied to `/api/verify-source`, `/api/fetch-page`, and `/api/llm-models` routes.

### Caching

- `newsCache`: 5 min TTL, keyed by blocked/disabled/interests params
- `trendingCache`: 10 min TTL
- `githubCaches`: 30 min TTL, keyed by `${lang}-${since}`
- `imageResolveCache`: session-scoped (no TTL, in-memory only)

## Deployment

- **Vercel**: `vercel.json` maps `/api/*` to serverless functions in `api/`; static build served from `dist/`
- **Docker**: Multi-stage `Dockerfile` — Node 20 builds frontend, Python 3.11 runs Scrapling + Gunicorn, Nginx serves static files (ports 80 + 5000)
- **Docker Compose**: `docker-compose.yml` with optional PostgreSQL/Redis (commented out)
- **Nginx**: `nginx.conf` — SPA routing, Scrapling proxy, static asset caching, security headers

## Critical Duplication (Must Update Both)

Categories, source grades, and tag rules are defined **independently** in both `server/news/config/constants.js` and `src/App.jsx`:

| | `server/news/config/constants.js` | `src/App.jsx` |
|---|---|---|
| Categories | 28 items with `all` | 27 items (no `all`) |
| Source Grades | `SOURCE_GRADES` with color/icon | `gradeColors` object (different hex values!) |
| Grade Badge Colors | S=#dc2626, A=#ea580c, B=#16a34a, C=#2563eb, D=#64748b | S=#ff0000, A=#ff8800, B=#00cc00, C=#0088ff, D=#666666 |

> **Note**: Phase 1 统一了分级色值——App.jsx 和 NewsItem.jsx 已改用服务端 `SOURCE_GRADES` 权威色（#dc2626 系）。`api/news.js` 和 `api/meta.js` 已复用 `server/news/config/constants.js`。App.jsx 内的 `CATEGORIES` 副本仍存在，是唯一剩余的双源问题。

## Known Issues

- **No tests** — zero unit, integration, or E2E tests exist
- **RSS failure rate ~40-50%** — many sources return 403/404 or HTML instead of RSS
- **Auth is dev-only** — register/login routes exist in newsPlugin.js but have no serverless equivalents in `api/`
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
- The monolithic `App.jsx` (10440 lines) imports the v2 modules but ALSO retains inline copies of some logic — when editing workflow/profile/briefing behavior, check whether App.jsx calls the extracted module or its inline copy. Prefer the extracted module.
- Runtime `ReferenceError: useMemo is not defined` means a component file uses `useMemo` without importing it from `react` — add `import { useMemo } from 'react'` to that file.
