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

**Data Flow**: Vite middleware plugin (`server/newsPlugin.js`) intercepts `/api/*` routes at dev-server level. Frontend uses native `fetch` to call these APIs. There is no Express/Koa — the plugin registers middleware directly on the Vite dev server.

### Frontend (`src/`)

- **`App.jsx`** (~7300 lines) — Main component containing ~150 useState hooks, routing logic, settings modal, and all page views. Being incrementally split into modules below.
- **`AiElf.jsx`** (~1200 lines) — AI assistant with multi-Agent conversation, drag-to-analyze, history management. Uses localStorage per-agent (50 messages, 20 sessions max).
- **`GlobeView.jsx`** (~1000 lines) — 3D globe via `react-globe.gl`/Three.js. Fullscreen uses `createPortal` to `document.body`. Canvas needs `min-height: 420px`.
- **`main.jsx`** — Mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **`styles.css`** (~10000 lines) — CSS custom properties for dark/light themes. Tailwind config only sets content paths — no Tailwind utilities used in practice.

#### Extracted Modules (Phase 1 refactoring)

Components, utilities, constants, and hooks extracted from App.jsx. Currently imported but App.jsx also has inline copies — these will diverge as App.jsx is further refactored.

```
src/components/        Extracted presentational components
  NewsItem.jsx         News card with grade badge, translation, media
  SkeletonCard.jsx     Loading skeleton
  HexRadarChart.jsx    SVG radar/spider chart
  TrendLineChart.jsx   SVG line chart with hover
  GithubRepoCard.jsx   GitHub repo card
src/utils/
  localStorage.js      loadLS/saveLS/clearStaleLS
  format.js            formatTime/formatRelative/formatStars
  toast.js             showToast DOM notification
  markdown.jsx         renderMarkdown/renderMarkdownWithImages/renderBriefMarkdown/renderInline
src/constants/
  index.jsx            All constants + ICONS (SVG icon map with JSX)
src/hooks/
  useLocalStorage.js   Auto-syncing localStorage hook
```

### Backend (`server/newsPlugin.js`, ~3000 lines)

Single Vite plugin exporting `newsPlugin()` which registers one middleware handling all API routes. Key sections top-to-bottom:

1. **MEDIA_CONFIG** — Image resolution settings (timeouts, scores, cache sizes)
2. **SOURCE_WEIGHTS / SOURCE_GRADES / SOURCE_GRADE_MAP** — Source quality ratings (S/A/B/C/D tiers with weights)
3. **Auth system** — In-memory `users`/`userSessions` Maps (dev-only, not persisted)
4. **DEFAULT_SOURCES** — ~200 RSS/Atom source definitions (deduplicated)
5. **TRENDING_SOURCES** — Hot-trending feed sources
6. **CATEGORIES / CATEGORY_RULES / TAG_RULES** — Content classification regex rules
7. **Cache objects** — `newsCache` (5min), `trendingCache` (10min), `githubCaches` (30min), `imageResolveCache` (session)
8. **Route handlers** — Middleware with `if (pathname === '/api/xxx')` pattern
9. **Image pipeline** — `resolveImageWithScrapling()` → `resolveImageFromArticle()` → scoring → validation
10. **Feed parsing** — `parseFeed()` → `normalizeItem()` with category/tag detection

### API Endpoints

| Endpoint | Method | Params | Notes |
|---|---|---|---|
| `/api/news` | GET | `blocked`, `custom`, `disabledSources`, `page`, `pageSize`, `search`, `interests` | Aggregated RSS feed with pagination |
| `/api/meta` | GET | — | Categories, modes, sources with grade info |
| `/api/trending` | GET | `platform`, `page`, `pageSize` | Hot-trending items |
| `/api/github-trending` | GET | `lang`, `since` | GitHub trending repos (30min cache) |
| `/api/verify-source` | GET | `url` | Validate RSS/Atom feed URL |
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

## Critical Duplication (Must Update Both)

Categories, source grades, and tag rules are defined **independently** in both `server/newsPlugin.js` and `src/App.jsx`:

| | `server/newsPlugin.js` | `src/App.jsx` |
|---|---|---|
| Categories | 28 items with `all` | 27 items (no `all`) |
| Source Grades | `SOURCE_GRADES` with color/icon | `gradeColors` object (different hex values!) |
| Grade Badge Colors | S=#dc2626, A=#ea580c, B=#16a34a, C=#2563eb, D=#64748b | S=#ff0000, A=#ff8800, B=#00cc00, C=#0088ff, D=#666666 |

Also `DEFAULT_SOURCES` is partially duplicated in `api/news.js` (shorter list) — update both for production parity.

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
