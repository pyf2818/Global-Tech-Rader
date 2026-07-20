# AGENTS.md

This project keeps a single source of truth for agent guidance in **CLAUDE.md**. Read it first.

## Quick reference

- **Run**: npm install && npm run dev (dev server on 0.0.0.0:5175 with API middleware)
- **Build**: npm run build -> dist/
- **Test**: npm test (vitest, 168 unit tests)
- **DB migrate**: npm run db:migrate (requires DATABASE_URL; creates PostgreSQL tables)
- **Scrapling**: python scrapling_server.py (Flask on port 5000, optional)
- **Dev port**: 5175 (not 5173)
- **ESM only**: package.json type:module - all .js use ESM, never require()

## Where things live

- Frontend: src/App.jsx (monolithic, ~10174 lines) + src/components/ + src/domain/ + src/hooks/
- News backend: server/news/ (Vite middleware plugin)
- Platform backend (auth/community/profile/db): server/auth, server/community, server/profile, server/db, server/http
- Production serverless: api/*.js (shared handlers with dev)

For full architecture, endpoints, gotchas, and known issues, see **CLAUDE.md**.

