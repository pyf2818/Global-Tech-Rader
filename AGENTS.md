# AGENTS.md

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on 0.0.0.0:5175 (port set in vite.config.js)
npm run build                  # Production build -> dist/
npm run preview                # Preview production build on 0.0.0.0
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

## Architecture

- **Single-file frontend**: `src/App.jsx` (~4500 lines) — all state, rendering, and logic. Inline components: `NewsItem`, `GithubRepoCard`, `HexRadarChart`, `Lightbox`. No component splitting.
- **3D Globe component**: `src/GlobeView.jsx` (~880 lines) — `react-globe.gl` based interactive 3D earth visualization with fullscreen dashboard mode. Used within App.jsx.
- **API is a Vite plugin**: `server/newsPlugin.js` (~1150 lines) is a Vite middleware (`newsPlugin()`) that intercepts `/api/*` during dev. No separate backend server. Production uses `vercel.json` + `api/*.js` serverless functions.
- **Entrypoint**: `src/main.jsx` mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **Styling**: `src/styles.css` (~2080 lines) with CSS custom properties for dark/light themes. Tailwind config only sets `content` paths and `fontFamily.sans` — no Tailwind utility classes in the component; all styling is custom CSS.
- **Dev server port**: Fixed to **5175** in `vite.config.js` (`server.port: 5175`).

## Key Duplication (Must Update Both Files)

Categories, modes, region labels, and tag rules are defined independently in **both** `server/newsPlugin.js` and `src/App.jsx`. The two files diverge in structure:

| | `server/newsPlugin.js` | `src/App.jsx` |
|---|---|---|
| Categories | Starts with `{ id: 'all', ... }` | Starts with `{ id: 'ai-models', ... }` (no 'all') |
| Regions | `CATEGORY_RULES` regex map for `detectCategory()` | Hard-coded `REGION_MAP` object |

Adding or changing a category requires updating both files.

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
| `/api/ai/*`, `/api/translate/*`, `/api/subscriptions/*`, `/api/bookmarks/*` | — | — | Stub endpoints returning 501 |

## LLM Config

`LLM_PRESETS` in `src/App.jsx` defines 5 providers with built-in base URLs and model lists: OpenAI, DeepSeek, Moonshot, 智谱 AI, 自定义. The quick-config modal lets users pick a preset, enter API key, and select a model in 3 steps. Config persists in `localStorage` as `llmConfig`.

AI insights are triggered on `items` change (auto) or via manual refresh button. They POST to `/api/ai-insights` with the top 30 items and display `{trends, correlations, signals}` in the right panel.

## Source Config

All RSS/Atom sources live in `DEFAULT_SOURCES` and `TRENDING_SOURCES` arrays at the top of `server/newsPlugin.js`. Each source needs `name`, `url`, `region` (`domestic`/`overseas`/`global`), and `defaultCategory`.

## Caching

- `newsCache` and `trendingCache`: in-memory objects with `expiresAt` timestamps.
- `githubCaches`: keyed by `${lang}-${since}`, TTL = 30 minutes. Reduces GitHub Search API calls.
- GitHub README fetch: only first 5 repos per request, uses `Accept: application/vnd.github.raw` for plaintext (avoids base64 decode overhead).

## Deployment

`vercel.json` maps `/api/*` to itself. The `api/` directory contains serverless function files (`news.js`, `meta.js`, `trending.js`, `github-trending.js`) that are a **partial copy** of `newsPlugin.js` logic. If you change API logic in `newsPlugin.js`, check whether `api/*.js` also needs updating.

Build command: `npm run build`, output: `dist/`.

## Gotchas

- `package.json` sets `"type": "module"` — all `.js` files use ESM.
- Many dependencies pinned to `"latest"` rather than specific versions.
- `vite.config.js` already includes `allowedHosts: ['.monkeycode-ai.online']`.
- Dev server port is **5175** (changed from default 5173).
- GitHub API unauthenticated rate limit is 60 requests/hour. When rate-limited, README image/tutorial data will be empty until the limit resets (~1 hour). The 30-minute cache mitigates this.
- GitHub README images: uses a scoring system (badge/shield/icon/logo keywords = excluded; screenshot/demo/preview alt text or path = +2; `/img/`/`/assets/`/`/media/` paths = +1). Only the top-scoring image is shown.
- Tutorial extraction (`extractTutorial`): only returns text if ≥2 meaningful lines found in Installation/Usage/Getting Started sections. Otherwise returns empty string and the card hides the tutorial block.
- PWA: `public/sw.js` and `public/manifest.json` exist; `index.html` registers the service worker.
- `index.html` has a global `onerror` handler that replaces the page with an error display and a "Clear localStorage & Reload" button.
- `LLM_PRESETS` must be defined at file scope (top level of App.jsx), not inside a function — putting it inside `generateSummary` caused a `ReferenceError`.
- `/api/ai-insights` prompts LLM for concise JSON output (max 800 tokens, 30 chars per item). Truncated responses are caught with a retry-friendly error message.
- **GlobeView**: Uses `react-globe.gl` which renders a Three.js canvas. The fullscreen mode uses `createPortal` to render at `document.body` level. Ensure the canvas has sufficient `min-height` (420px) or the globe won't render.
- **Globe interaction**: The old `.globe-bg` wrapper blocked mouse events on the fullscreen globe. Always use `.globe-bg-decoration` with `pointer-events: none` for background effects, and render the `Globe` component directly at the root level.
- **Image upload in editor**: `App.jsx` supports image upload (click image button or paste Ctrl+V) and stores images as Base64 in `article.images` array. The editor uses placeholder syntax `![alt](#{id})` to avoid cluttering the text with long Base64 strings. Use `renderMarkdownWithImages(text, images)` to replace placeholders with actual Base64 data during preview/export.
- **Editor layout**: A duplicate `.editor-split-view` CSS rule was previously overriding mode-specific grid layouts. Only one rule should exist at line ~1394 in `styles.css`. Ensure split mode uses `grid-template-columns: 1fr 1fr` and both editor/preview panes have `flex: 1` with `min-height: 0` for proper flex behavior.