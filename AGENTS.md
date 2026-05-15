# AGENTS.md

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on 0.0.0.0:5173
npm run build                  # Production build -> dist/
npm run preview                # Preview production build on 0.0.0.0
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

## Architecture

- **Single-file frontend**: `src/App.jsx` (~2000 lines) — all state, rendering, and logic. Inline components: `NewsItem`, `GithubRepoCard`, `HexRadarChart`, `Lightbox`. No component splitting.
- **API is a Vite plugin**: `server/newsPlugin.js` (~740 lines) is a Vite middleware (`newsPlugin()`) that intercepts `/api/*` during dev. No separate backend server. Production uses `vercel.json` + `api/*.js` serverless functions.
- **Entrypoint**: `src/main.jsx` mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **Styling**: `src/styles.css` (~800 lines) with CSS custom properties for dark/light themes. Tailwind config only sets `content` paths and `fontFamily.sans` — no Tailwind utility classes in the component; all styling is custom CSS.

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
| `/api/github-trending` | GET | `lang=python`, `since=daily|weekly|monthly` | GitHub Search API, caches 30 min |
| `/api/verify-source` | GET | `url=<RSS_URL>` | Checks if URL is valid RSS/Atom |
| `/api/llm-models` | GET | — | Returns curated LLM provider/model list |
| `/api/llm-test` | POST | `endpoint`, `model`, `apiKey` | Tests LLM API connectivity |
| `/api/ai/*`, `/api/translate/*`, `/api/subscriptions/*`, `/api/bookmarks/*` | — | — | Stub endpoints returning 501 |

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
- GitHub API unauthenticated rate limit is 60 requests/hour. When rate-limited, README image/tutorial data will be empty until the limit resets (~1 hour). The 30-minute cache mitigates this.
- GitHub README images: uses a scoring system (badge/shield/icon/logo keywords = excluded; screenshot/demo/preview alt text or path = +2; `/img/`/`/assets/`/`/media/` paths = +1). Only the top-scoring image is shown.
- Tutorial extraction (`extractTutorial`): only returns text if ≥2 meaningful lines found in Installation/Usage/Getting Started sections. Otherwise returns empty string and the card hides the tutorial block.
- PWA: `public/sw.js` and `public/manifest.json` exist; `index.html` registers the service worker.
- `index.html` has a global `onerror` handler that replaces the page with an error display and a "Clear localStorage & Reload" button.