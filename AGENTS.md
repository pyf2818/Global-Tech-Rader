# AGENTS.md

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on 0.0.0.0:5175
npm run build                  # Production build -> dist/
npm run preview                # Preview production build on 0.0.0.0

# Scrapling server (Python/Flask for custom web scraping)
python scrapling_server.py     # Starts Flask API on port 5000 (needed for custom scraping)
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

## Architecture

- **Single-file frontend**: `src/App.jsx` (~8000 lines) — all state, rendering, and logic. Inline components: `NewsItem`, `GithubRepoCard`, `HexRadarChart`, `Lightbox`.
- **AI Elf component**: `src/AiElf.jsx` (~960 lines) — AI assistant with Agent system, per-Agent localStorage storage with quota limits (50 messages, 20 history sessions).
- **3D Globe component**: `src/GlobeView.jsx` (~900 lines) — `react-globe.gl` based interactive 3D earth visualization.
- **API Layer**: Dual implementation:
  - Development: `server/newsPlugin.js` (~2400 lines) as Vite middleware plugin
  - Production: `api/*.js` serverless functions (Vercel deployment)
- **Scrapling Server**: `scrapling_server.py` (Flask on port 5000) — custom web scraping with basic/dynamic/stealth modes
- **Entrypoint**: `src/main.jsx` mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **Styling**: `src/styles.css` (~6600 lines) with CSS custom properties for dark/light themes. Tailwind config only sets content paths — no Tailwind utilities used in components.
- **Dev server port**: Fixed to **5175** in `vite.config.js` (`server.port: 5175`).
- **Vite proxy**: `/api/scrape` requests forward to `http://localhost:5000` (Scrapling API).

## New Features (Recent)

- **Editor Fullscreen Mode**: Toggle via button in article editor. Hides sidebar, topbar, stats-bar, and right panel; expands editor to full viewport. ESC key exits fullscreen.
- **Reading List Page**: Displays bookmarked news items with read/unread toggle and remove functionality. Shows bookmark count and unread count in stats bar. Stored in `localStorage` under `bookmarks` key.
- **Calendar Page**: Event management with date picker grid, event list, and add-event modal. Events stored in `localStorage` under `calendarEvents` key with shape `{id, title, date, time, description, color}`.
- **Source Grading System**: 5-tier grading (S/A/B/C/D) with weights 1.0/0.95/0.85/0.75/0.65. Grade badges displayed with colors (S=#dc2626, A=#ea580c, B=#16a34a, C=#2563eb, D=#64748b). No emoji icons.
- **Builtin Source Management**: Settings page "信息源" tab has builtin/custom sub-tabs. Builtin tab shows all 266 sources with grade filter, region filter, status filter, enable/disable toggle, batch operations.
- **Custom Web Scraping**: "自定义抓取" page in navigation menu. Uses Scrapling framework (Python Flask on port 5000). Three modes: basic (fast), dynamic (JS rendering), stealth (anti-bot). Save scraped content to materials or editor.
- **Sidebar Compression**: Sidebar header, quick-access bar, nav menu, and footer paddings reduced to increase scrollable area for the "管理沉淀" module.
- **Navigation Groups**: NAV_GROUPS now includes "管理沉淀" category with `['calendar', 'reading-list', 'knowledge-export']` items.

## Agent System (AI Elf)

The AI Elf component implements a multi-Agent system for news analysis:

- **8 predefined Agents**: Defined in `DEFAULT_AGENTS` array (App.jsx), each with id, name, description, system prompt, category, tags, and avatar.
- **Agent Categories**: `AGENT_CATEGORIES` = ['全部', '分析', '技术', '商业', '创作', '语言', '教育', '思辨']
- **Per-Agent Storage**: Messages and history stored in `localStorage` under keys `ai-elf-agent-messages` and `ai-elf-agent-history`, keyed by `agentId`.
- **Custom Agents**: Users can create custom Agents via settings modal; stored with `isCustom: true` flag.
- **Analysis Templates**: Each Agent uses `buildAnalysisPrompt()` to generate domain-specific prompts (e.g., `analyst` uses 5-dimension template, `tech-advisor` uses tech-focused template).
- **Export to Materials**: AI Elf analysis can be saved to the materials library via `onExportToMaterials` callback.
- **Settings Integration**: Agent management merged into "Agent管理" settings tab with independent avatar upload, prompt editing, and AI prompt refinement.

## Key Duplication (Must Update Both Files)

Categories, modes, region labels, tag rules, and **source grading data** are defined independently in **both** `server/newsPlugin.js` and `src/App.jsx`. The two files diverge in structure:

| | `server/newsPlugin.js` | `src/App.jsx` |
|---|---|---|
| Categories | Starts with `{ id: 'all', ... }` | Starts with `{ id: 'ai-models', ... }` (no 'all') |
| Regions | `CATEGORY_RULES` regex map for `detectCategory()` | Hard-coded `REGION_MAP` object |
| Source Grades | `SOURCE_GRADES` with weight/color/badge info | `sourceGrades` state, grade display logic |

Adding or changing a category, region, or grade requires updating both files.

Additionally, `DEFAULT_SOURCES` and `CATEGORIES` are duplicated between `server/newsPlugin.js` and `api/news.js` (the Vercel serverless version). The `api/` copy has a shorter source list — only update it if you need production parity.

## API Endpoints

| Endpoint | Method | Params | Notes |
|---|---|---|---|
| `/api/news` | GET | `blocked=word1,word2`, `custom=<JSON>` | Aggregated RSS feed |
| `/api/meta` | GET | — | Categories, modes, sources metadata |
| `/api/trending` | GET | — | AI-filtered trending items |
| `/api/github-trending` | GET | `lang=python`, `since=daily\|weekly\|monthly` | GitHub Search API, caches 30 min |
| `/api/verify-source` | GET | `url=<RSS_URL>` | Checks if URL is valid RSS/Atom |
| `/api/llm-models` | GET | `baseUrl`, `apiKey` | Fetches available models from LLM provider |
| `/api/llm-test` | POST | `baseUrl`, `model`, `apiKey` | Tests LLM API connectivity |
| `/api/ai-insights` | POST | `baseUrl`, `apiKey`, `model`, `items[]` | Analyzes top 30 news items via LLM, returns `{trends, correlations, signals}` |
| `/api/ai-generate` | POST | `baseUrl`, `apiKey`, `model`, `action`, `content` | LLM content generation (continue, rewrite, expand, simplify, translate, title, summary) |
| `/api/ai/*`, `/api/translate/*`, `/api/subscriptions/*`, `/api/bookmarks/*` | — | — | Stub endpoints returning 501 |

## LLM Config

`LLM_PRESETS` in `src/App.jsx` defines 5 providers with built-in base URLs and model list: OpenAI, DeepSeek, Moonshot, 智谱 AI, 自定义. The quick-config modal lets users pick a preset, enter API key, and select a model in 3 steps. Config persists in `localStorage` as `llmConfig`.

AI insights are triggered on `items` change (auto) or via manual refresh button. They POST to `/api/ai-insights` with the top 30 items and display `{trends, correlations, signals}` in the right panel.

## Source Config

All RSS/Atom sources live in `DEFAULT_SOURCES` and `TRENDING_SOURCES` arrays at the top of `server/newsPlugin.js`. Each source needs `name`, `url`, `region` (`domestic`/`overseas`/`global`), and `defaultCategory`.

## Caching

- `newsCache` and `trendingCache`: in-memory objects with `expiresAt` timestamps.
- `githubCaches`: keyed by `${lang}-${since}`, TTL = 30 minutes. Reduces GitHub Search API calls.
- GitHub README fetch: only first 5 repos per request, uses `Accept: application/vnd.github.raw` for plaintext (avoids base64 decode overhead).

## Deployment

`vercel.json` maps `/api/*` to itself. The `api/` directory contains serverless function files (`news.js`, `meta.js`, `trending.js`, `github-trending.js`, `ai-generate.js`) that are a **partial copy** of `newsPlugin.js` logic. If you change API logic in `newsPlugin.js`, check whether `api/*.js` also needs updating.

Build command: `npm run build`, output: `dist/`.

## CI/CD Workflows

- **verify-sources.yml**: Daily (6:00 UTC) cron job verifies RSS source health by fetching and validating XML. Fails workflow if any sources are broken.
- **update-news.yml**: Hourly cron job warms production cache by fetching `/api/news`, `/api/trending`, and `/api/meta` endpoints.

Both workflows use Node.js 20 and `npm ci` for dependency installation.

## Gotchas

- `package.json` sets `"type": "module"` — all `.js` files use ESM.
- Many dependencies pinned to `"latest"` rather than specific versions.
- `vite.config.js` already includes `allowedHosts: ['.monkeycode-ai.online']`.
- Dev server port is **5175** (changed from default 5173).
- GitHub API unauthenticated rate limit is 60 requests/hour. When rate-limited, README image/tutorial data will be empty until the limit resets (~1 hour). The 30-minute cache mitigates this.
- GitHub README images: uses a scoring system (badge/shield/icon/logo keywords = excluded; screenshot/demo/preview alt text or path = +2; `/img/`/`/assets/`/`/media/` paths = +1). Only the top-scoring image is shown.
- Tutorial extraction (`extractTutorial`): only returns text if >=2 meaningful lines found in Installation/Usage/Getting Started sections. Otherwise returns empty string and the card hides the tutorial block.
- PWA: `public/sw.js` and `public/manifest.json` exist; `index.html` registers the service worker.
- `index.html` has a global `onerror` handler that replaces the page with an error display and a "Clear localStorage & Reload" button.
- **AI Elf localStorage quota**: AI Elf wraps all `localStorage.setItem` calls in try-catch to handle `QuotaExceededError`. Limits messages to 50 per Agent and history to 20 sessions per Agent to prevent quota issues.
- `LLM_PRESETS` must be defined at file scope (top level of App.jsx), not inside a function — putting it inside `generateSummary` caused a `ReferenceError`.
- `/api/ai-insights` prompts LLM for concise JSON output (max 800 tokens, 30 chars per item). Truncated responses are caught with a retry-friendly error message.
- **GlobeView**: Uses `react-globe.gl` which renders a Three.js canvas. The fullscreen mode uses `createPortal` to render at `document.body` level. Ensure the canvas has sufficient `min-height` (420px) or the globe won't render.
- **Globe interaction**: The old `.globe-bg` wrapper blocked mouse events on the fullscreen globe. Always use `.globe-bg-decoration` with `pointer-events: none` for background effects, and render the `Globe` component directly at the root level.
- **Image upload in editor**: `App.jsx` supports image upload (click image button or paste Ctrl+V) and stores images as Base64 in `article.images` array. The editor uses placeholder syntax `![alt](#{id})` to avoid cluttering the text with long Base64 strings. Use `renderMarkdownWithImages(text, images)` to replace placeholders with actual Base64 data during preview/export.
- **Editor layout**: A duplicate `.editor-split-view` CSS rule was previously overriding mode-specific grid layouts. Only one rule should exist at line ~1394 in `styles.css`. Ensure split mode uses `grid-template-columns: 1fr 1fr` and both editor/preview panes have `flex: 1` with `min-height: 0` for proper flex behavior.
- **Settings modal navigation**: Uses left sidebar (120px width) with 4 tabs: 通用设置, 信息源, 大模型, Agent管理. The old top tab navigation has been removed.
- **AI Elf chat window**: Adaptive size (520px wide when sidebar collapsed, 720px when expanded; height fixed at 560px). Messages stored per-Agent in `localStorage`. Drag-drop news cards trigger analysis.
- **Agent history**: Each Agent has independent conversation history, accessible via expand/collapse in AI Elf sidebar. History sessions stored as `{id, title, timestamp, messages}` arrays, max 20 per Agent.
- **Agent avatars**: Stored as Base64 strings in Agent objects. Default avatar `public/ai-elf-avatar.png`. Avatar upload uses FileReader and stores Base64 in localStorage.
- **NewsItem translation**: All `NewsItem` instances across the app (main feed, trending, recommendations, event clusters) must pass translation props: `showTranslation`, `onToggleTranslation`, `onRequestTranslation`, `isTranslating`, `translation`.
- **Image manager panel**: Redesigned as a grid layout (`image-manager-grid`) with card-based items. Each card shows: thumbnail, used/unused badge, filename, dimensions, width/height inputs (vertical layout), and a hover-reveal delete button. Clicking a thumbnail scrolls the editor to the corresponding placeholder.
- **renderMarkdown**: The function now protects existing `<img>` tags before HTML-escaping, then restores them after processing. This ensures `renderMarkdownWithImages()` outputs valid `<img src="...">` tags that render in the preview pane.
- **Source grading state declarations**: When adding source grading features, always declare all related useState hooks: `sourceGrades`, `gradeFilter`, `sourceTypeTab`, `statusFilter`, `searchQuery`, `regionFilter`, `selectedSources`, `disabledSources`, `batchMode`. Missing any will cause ReferenceError at runtime.
- **Settings modal JSX structure**: The settings modal uses a complex nested structure with multiple tabs and fragments. When modifying, ensure: 1) Each tab (general, sources, llm, agents) is a sibling inside `<div className="settings-content">`, 2) Fragment `<>...</>` closes with matching `</>`, 3) Conditional `{xxx && (...)}` closes with matching `)}`. The builtin/custom tabs are nested inside the sources tab.
- **Source grade rendering**: `NewsItem.renderSourceGrade` uses `item.sourceGradeColor` (NOT `gradeColor`). Never use the undefined `gradeColor` variable.

## Compliance & Production Notes

- The platform only displays titles, short summaries, sources, publication times, tags, and original links. Content copyright belongs to the original publishers.
- When deploying to production, consider adding: source whitelisting, caching strategies, rate limiting, robots.txt review, and Terms of Service audit.

## Scrapling Integration

The platform now includes **custom web scraping capabilities** using the Scrapling framework:

### Architecture
- **Backend API**: Flask server (`scrapling_server.py`) on port 5000 with `/api/scrape` endpoint
- **Proxy Configuration**: Vite proxy forwards `/api/scrape` requests to Scrapling API
- **Frontend Feature**: New "自定义抓取" (Custom Scrape) page in navigation menu under "资讯中心" group

### Scrapling Capabilities
- **Three modes**:
  - `basic`: Fast HTTP requests for static pages
  - `dynamic`: Browser rendering for JavaScript-heavy pages
  - `stealth`: Anti-bot bypass for protected sites (Cloudflare, etc.)
- **Content extraction**: Titles, summaries, authors, dates, images, links, paragraphs
- **Performance**: Up to 784x faster than BeautifulSoup, 92% test coverage

### API Usage
```bash
# POST /api/scrape
{
  "url": "https://example.com",
  "mode": "basic|dynamic|stealth",
  "timeout": 30
}

# Returns structured data:
{
  "url": "https://example.com",
  "status": 200,
  "title": "Page Title",
  "summary": "Content summary...",
  "description": "Meta description",
  "author": "Author name",
  "published_date": "2026-05-31",
  "images": [{"src": "...", "alt": "..."}],
  "links": [{"url": "...", "text": "..."}],
  "paragraphs_count": 10,
  "content_length": 5000
}
```

### Integration Points
- **Save to Materials**: Add scraped content to materials library
- **Save to Editor**: Create article draft from scraped content
- **UI Components**: Custom URL input, mode selector, result display with metadata, images, links

### Server Requirements
- Python 3.10+
- Dependencies: `scrapling[fetchers]`, `flask`, `flask-cors`
- Browser dependencies: Run `scrapling install` after installation
- Production: Use WSGI server (gunicorn) instead of Flask dev server

### Performance Notes
- Stealth mode slower (browser startup), use only when necessary
- Concurrent browser pooling with automatic cleanup
- 30-second timeout with retry logic
- Memory efficient for large-scale scraping

## Deployment

### Quick Deployment
The project supports deployment to any environment (local, server, cloud):

```bash
# Docker deployment (recommended)
chmod +x docker-deploy.sh
./docker-deploy.sh

# Manual installation
chmod +x install_dependencies.sh
./install_dependencies.sh
```

### Cross-Platform Support
- ✅ Linux, macOS, Windows compatible
- ✅ Docker containerization ready
- ✅ Production deployment with Gunicorn + Nginx
- ✅ Scrapling web scraping capabilities included

### Deployment Documentation
- [Quick Deployment Guide](DEPLOYMENT_QUICK.md) - Step-by-step deployment instructions
- [Full Deployment Guide](DEPLOYMENT.md) - Complete deployment documentation
- [Scrapling Integration](SCRAPLING_INTEGRATION.md) - Web scraping integration details

### Key Deployment Features
- 📦 One-click deployment with Docker
- 🔄 Automatic dependency installation (Python, Node.js, browsers)
- 🛠 Simplified configuration with environment templates
- 📊 Built-in health monitoring and logging
- 🔒 Production security configurations and best practices

### Post-Deployment Access
- Frontend: http://localhost (or your domain)
- Scrapling API: http://localhost:5000/api/scrape
- Health Check: http://localhost:5000/api/health
