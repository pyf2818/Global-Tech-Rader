# AGENTS.md

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on 0.0.0.0:5175
npm run build                  # Production build -> dist/
npm run preview                # Preview production build on 0.0.0.0
python scrapling_server.py     # Flask API on port 5000 (optional, for Scrapling scraping)
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

## Architecture

- **Single-file frontend**: `src/App.jsx` (~7900 lines) — all state, rendering, and logic. Inline components: `NewsItem`, `GithubRepoCard`, `HexRadarChart`, `Lightbox`.
- **AI Elf**: `src/AiElf.jsx` (~1100 lines) — AI assistant with per-Agent localStorage (50 messages, 20 history sessions max, quota-safe). Multi-turn conversation + quoted references.
- **3D Globe**: `src/GlobeView.jsx` (~900 lines) — `react-globe.gl` / Three.js. Fullscreen uses `createPortal` to `document.body`.
- **API Layer**: Dual implementation:
  - Dev: `server/newsPlugin.js` (~3400 lines) as Vite middleware plugin
  - Prod: `api/*.js` serverless functions (5 files: `news.js`, `meta.js`, `trending.js`, `github-trending.js`, `ai-generate.js`)
- **Scrapling Server**: `scrapling_server.py` (Flask on port 5000) — basic/dynamic/stealth modes
- **Entrypoint**: `src/main.jsx` mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **Styling**: `src/styles.css` (~7400 lines) with CSS custom properties for dark/light themes. Tailwind config only sets content paths — no Tailwind utilities used.
- **Dev server port**: **5175** (`vite.config.js` `server.port: 5175`).
- **Vite proxy**: `/api/scrape` -> `http://localhost:5000`.

## Key Duplication (Must Update Both Files)

Categories, regions, source grades, and tag rules are defined independently in **both** `server/newsPlugin.js` and `src/App.jsx`:

| | `server/newsPlugin.js` | `src/App.jsx` |
|---|---|---|
| Categories | Starts with `{ id: 'all', ... }` (28 items) | Starts with `{ id: 'ai-models', ... }` (no 'all', 27 items) |
| Regions | `CATEGORY_RULES` regex map for `detectCategory()` | Hard-coded `REGION_MAP = { domestic: '国内', overseas: '海外', global: '全球' }` |
| Source Grades | `SOURCE_GRADES` with weight/color/badge info | `sourceGrades` state + `gradeColors` in `renderSourceGrade` |

Additionally, `DEFAULT_SOURCES` and `CATEGORIES` are duplicated between `server/newsPlugin.js` and `api/news.js` (shorter source list in api/ — only update if production parity needed).

## Grade Badge

NewsItem grade badge: single `<div className="news-item-source-grade">` with CSS custom properties `--grade-primary` and `--grade-glow`. No outer wrapper `<span>`.

App.jsx `gradeColors` (line ~7587): S=#ff0000, A=#ff8800, B=#00cc00, C=#0088ff, D=#666666.
Server `SOURCE_GRADES` colors (line ~566): S=#dc2626, A=#ea580c, B=#16a34a, C=#2563eb, D=#64748b. **These differ** — badge renders App.jsx colors.

Settings page uses separate `<span className="source-grade-badge">` with `sourceGrades[grade].color`.

## Missing Functions & Dependencies

**Critical Helper Functions**: These functions must exist at the top level of `server/newsPlugin.js` (file scope, not inside functions):
- `LAZY_LOAD_ATTRS`: Array of lazy-loading image attributes
- `isGoodImageUrl(url, htmlContext)`: Validates image URLs and filters out ads/placeholders
- `extractVideoUrl(content)`: Extracts video URLs from content
- `parseSrcset(srcset)`: Parses srcset attributes and selects largest image
- `optimizeImageUrl(url)`: Removes optimization parameters from image URLs

**Missing these causes**: Runtime errors when parsing RSS feeds or extracting images, leading to complete source failures.

**Location**: These should be defined before `DEFAULT_SOURCES` and after `MEDIA_CONFIG` in `server/newsPlugin.js`.

## Media Config

All image resolution controlled by `MEDIA_CONFIG` at top of `server/newsPlugin.js`. Key tunable values:

- `MAX_RESOLVE_ITEMS: 80`, `RESOLVE_TIMEOUT: 12000ms`
- `USE_SCRAPLING: true`, `SCRAPLING_MODE: 'dynamic'`, `SCRAPLING_TIMEOUT: 15000ms`
- `MIN_IMAGE_SCORE: 25`, `MIN_IMAGE_WIDTH: 300`, `MIN_IMAGE_HEIGHT: 200`
- `MAX_IMAGE_REUSE: 2` (global dedup — same image used max 2 times across articles)

Global tracking: `globalImageUsage` Map tracks per-URL usage count. `resetGlobalImageUsage()` called in `getNews()` each cycle.

Image resolution pipeline: `resolveImageWithScrapling()` (Scrapling dynamic render) -> falls back to `resolveImageFromArticle()` (direct fetch + scoring). `validateImageUrl()` rejects images <10KB as placeholders.

## API Endpoints

| Endpoint | Method | Params | Notes |
|---|---|---|---|
| `/api/news` | GET | `blocked`, `custom`, `disabledSources` | Aggregated RSS feed |
| `/api/meta` | GET | — | Categories, modes, sources metadata |
| `/api/trending` | GET | — | AI-filtered trending items |
| `/api/github-trending` | GET | `lang`, `since` | GitHub Search API, caches 30 min |
| `/api/ai-generate` | POST | `baseUrl`, `apiKey`, `model`, `action`, `content`, `messages?`, `systemPrompt?` | **chat** action requires `messages` array |
| `/api/scrape` | POST | `url`, `mode`, `timeout` | Proxied to Scrapling Flask |
| `/api/auth/register`, `/api/auth/login`, `/api/auth/me` | — | — | Dev-only auth (no serverless equivalents) |

## Caching

- `newsCache`: 5 min TTL, `trendingCache`: 10 min TTL
- `githubCaches`: keyed by `${lang}-${since}`, 30 min TTL
- `imageResolveCache`: object keyed by article URL, no TTL (in-memory, session-scoped)

## Deployment

`vercel.json` maps `/api/*` to itself. `api/` serverless functions are a partial copy of `newsPlugin.js` logic — check parity when changing API logic.

Build: `npm run build`, output: `dist/`.

## Git History & Known Issues

**Current HEAD**: `bcab533` - "enhance today's must-read recommendation algorithm with multi-dimensional scoring"

**Recent Rollback (2026-06-10)**: Repository was rolled back from `8c3d3d0` to `bcab533`, removing 8 commits that attempted to fix RSS source failures and improve image extraction. The rollback restored the multi-dimensional recommendation algorithm but reintroduced RSS source reliability issues.

**Known Issues**:
- High RSS source failure rate (~46% based on recent logs)
- Many DEFAULT_SOURCES entries are duplicates (e.g., IEEE Spectrum appears 5+ times)
- Some sources return HTML instead of RSS feeds
- Chinese sources frequently return 403 (anti-scraping)

## CI/CD

- **verify-sources.yml**: Daily 6:00 UTC — validates RSS source health
- **update-news.yml**: Hourly — warms production cache (`/api/news`, `/api/trending`, `/api/meta`)
- Both use Node.js 20 and `npm ci`

## Gotchas

- `package.json` sets `"type": "module"` — all `.js` files use ESM. The CI workflow `verify-sources.yml` uses `require()` on an ESM module and **will crash** — it needs dynamic `import()`.
- Dependencies pinned to `"latest"` — no version locking.
- Dev server port is **5175** (not default 5173).
- `vite.config.js` already includes `allowedHosts: ['.monkeycode-ai.online']`.
- GitHub API unauthenticated rate limit: 60 req/hr. README image/tutorial data empty when rate-limited. 30-min cache mitigates this.
- `LLM_PRESETS` must be defined at **file scope** (top level of App.jsx), not inside a function — caused `ReferenceError` when inside `generateSummary`.
- `/api/ai-generate` chat action: must pass `messages` array (last 20) and `systemPrompt`. Missing these causes contextless single-turn responses.
- **GlobeView**: Canvas needs `min-height: 420px` or globe won't render. Fullscreen uses `createPortal` to `document.body`. Background effects must use `pointer-events: none`.
- **Auth is dev-only**: register/login/profile/interest routes exist in `newsPlugin.js` but have **no serverless equivalents** in `api/`. Auth UI will fail silently in production.
- **AI Elf localStorage quota**: All `localStorage.setItem` calls wrapped in try-catch for `QuotaExceededError`. 50 messages per Agent, 20 history sessions per Agent.
- **Source grading state hooks**: When adding source grading features, declare: `sourceGrades`, `gradeFilter`, `sourceTypeTab`, `statusFilter`, `searchQuery`, `regionFilter`, `disabledSources`. Do NOT add `selectedSources` or `batchMode` — these do not exist (batch ops are filter-based, no selection state).
- **Settings modal JSX**: Complex nested structure. Each tab is a sibling inside `<div className="settings-content">`. Fragment `<>...</>` must close with matching `</>`. Conditional `{xxx && (...)}` must close with matching `)}`.
- **renderSourceGrade**: uses `item.sourceGradeColor` (NOT `gradeColor`). Never use undefined `gradeColor` variable.
- **Grade badge**: single `<div>` with `className="news-item-source-grade"`, no outer `<span>` wrapper.
- **Editor image upload**: Uses placeholder syntax `![alt](#{id})`. Call `renderMarkdownWithImages(text, images)` for preview/export.
- **Duplicate sources in DEFAULT_SOURCES**: Some sources appear multiple times (e.g. IEEE Spectrum 5 times). Dedup happens downstream by URL, not at fetch time — wastes API calls.

## RSS Source Management

**Current State**: 289 sources configured (current HEAD: bcab533), but many are invalid. Expect 40-50% failure rate in production.

**Validation**: Test individual sources with `timeout 10 curl -I <url>`. Common failure patterns:
- 404/403: URL expired or access restricted
- Returns HTML instead of RSS: site changed feed format
- Timeout: rate limiting or server issues

**Reliable Sources** (verified working):
- ArXiv series: `export.arxiv.org/rss/cs.*`
- TechCrunch: `techcrunch.com/feed/`
- GitHub Blog: `github.blog/feed/`
- Hacker News: `hnrss.org/frontpage`, `hnrss.org/best`
- 36氪: `36kr.com/feed`

**Known Problem Sources** (avoid or fix URLs):
- Anthropic: 404 (no RSS available)
- Google DeepMind: 404 (no RSS available)
- Meta AI Blog: no response
- Stanford HAI: returns HTML not RSS
- Many Chinese sources: 403 (anti-scraping)

**When Updating Sources**: Update in **both** `server/newsPlugin.js` and `api/news.js` for production parity. Test locally before deploying.