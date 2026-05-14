# AGENTS.md

## Commands

```bash
npm install                    # Install dependencies
npm run dev                    # Dev server on 0.0.0.0:5173
npm run build                  # Production build → dist/
npm run preview                # Preview production build on 0.0.0.0
```

No test, lint, typecheck, or formatter commands exist. Do not run them.

## Architecture

- **Single-file frontend**: `src/App.jsx` (~1700 lines) contains all UI state, rendering, and logic. No component splitting.
- **API is a Vite plugin**: `server/newsPlugin.js` is a Vite middleware plugin (`newsPlugin()`) that intercepts `/api/*` requests during dev. There is no separate backend server. In production, `vercel.json` handles routing.
- **Entrypoint**: `src/main.jsx` mounts `<App />` inside `<ErrorBoundary>` + `<React.StrictMode>`.
- **Styling**: `src/styles.css` (~730 lines) with CSS custom properties for dark/light themes. Tailwind config only sets `content` paths and `fontFamily.sans` — no Tailwind utility classes are used in the component; all styling is custom CSS.

## Key Duplication

Categories, modes, and region labels are defined independently in both `server/newsPlugin.js` (for API responses) and `src/App.jsx` (for UI rendering). Adding or changing a category requires updating both files.

## API Endpoints (dev server only)

- `GET /api/news` — aggregated feed, accepts `blocked=word1,word2` and `custom=<JSON>` params
- `GET /api/meta` — categories, modes, sources metadata
- `GET /api/trending` — AI-filtered trending items
- `GET /api/github-trending` or `/api/github-daily` — GitHub weekly trending repos, accepts `lang=` param
- `/api/ai/*`, `/api/translate/*`, `/api/subscriptions/*`, `/api/bookmarks/*` — reserved stubs returning 501

## Source Config

All RSS/Atom sources live in `DEFAULT_SOURCES` and `TRENDING_SOURCES` arrays at the top of `server/newsPlugin.js`. Each source needs `name`, `url`, `region` (`domestic`/`overseas`/`global`), and `defaultCategory`.

## Deployment

`vercel.json` configures Vercel deployment with `npm run build` as build command and `dist/` as output directory. The rewrites map `/api/*` to itself (Vercel functions would need to replicate the middleware logic for production).

## Gotchas

- `package.json` sets `"type": "module"` — all `.js` files use ESM.
- Many dependencies are pinned to `"latest"` rather than specific versions.
- `vite.config.js` already includes `allowedHosts: ['.monkeycode-ai.online']`.
- PWA: `public/sw.js` and `public/manifest.json` exist; `index.html` registers the service worker.
- `index.html` has a global `onerror` handler that replaces the page with an error display and a "Clear localStorage & Reload" button.