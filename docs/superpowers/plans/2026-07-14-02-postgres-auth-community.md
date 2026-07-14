# PostgreSQL Auth and Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace volatile in-memory authentication and seeded local community interactions with a PostgreSQL-backed, production-capable account and community system.

**Architecture:** A `pg` repository layer owns SQL, service modules own authorization and invariants, and thin adapters expose the same services through Vite middleware and Vercel functions. Authentication uses opaque random session tokens in HttpOnly cookies; only token hashes are stored. React reads the current session with `/api/auth/me` and never persists credentials in localStorage.

**Tech Stack:** Node.js crypto, PostgreSQL 15, `pg`, React 19, Vite middleware, Vercel Functions, Vitest

---

## File map

- Create `server/db/client.js`, `server/db/migrate.js`, `server/db/migrations/001_platform.sql`.
- Create `server/auth/passwords.js`, `server/auth/authRepository.js`, `server/auth/authService.js`.
- Create `server/community/communityRepository.js`, `server/community/communityService.js`.
- Create `server/http/authHandlers.js`, `server/http/communityHandlers.js`, `server/http/httpUtils.js`.
- Create `api/auth/[action].js`, `api/community/[...path].js`.
- Create `src/hooks/useCommunity.js`, `src/components/CommunityPage.jsx`, `src/components/CommunityPostDetail.jsx`.
- Modify `server/news/plugin.js`, `src/hooks/useAuth.js`, `src/App.jsx`, `src/styles.css`, `package.json`, `.env.example`, `docker-compose.yml`.
- Create service and repository contract tests under `server/**/__tests__/` and expand `vitest.config.js` includes.

### Task 1: Add PostgreSQL runtime and migration command

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Create: `server/db/client.js`
- Create: `server/db/migrate.js`

- [ ] **Step 1: Add the pure-JavaScript PostgreSQL dependency**

Run: `npm install pg@^8.16.3`

Add script: `"db:migrate": "node server/db/migrate.js"`.

- [ ] **Step 2: Enable the local PostgreSQL service**

Use PostgreSQL 15 Alpine with database `silicon_meridian`, user `meridian`, password from `DB_PASSWORD`, health check `pg_isready`, and named volume `postgres_data`. Add `DATABASE_URL=postgresql://meridian:${DB_PASSWORD}@postgres:5432/silicon_meridian` to the app service.

- [ ] **Step 3: Create a lazy connection pool**

```js
import pg from 'pg';

let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) throw Object.assign(new Error('DATABASE_URL is required'), { code: 'DATABASE_UNAVAILABLE' });
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 8 });
  return pool;
}

export async function withTransaction(work) {
  const client = await getPool().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
```

- [ ] **Step 4: Create an ordered migration runner**

`migrate.js` creates `schema_migrations(filename text primary key, applied_at timestamptz not null default now())`, reads sorted `.sql` files, applies each unapplied file in a transaction, and records the filename.

- [ ] **Step 5: Verify local connectivity and commit**

Run: `docker compose up -d postgres`

Expected: PostgreSQL health status becomes healthy.

Run: `npm run db:migrate`

Expected: migration runner exits 0, creates `schema_migrations`, and reports zero pending SQL files. Task 2 adds and applies the first schema migration.

```bash
git add package.json package-lock.json .env.example docker-compose.yml server/db/client.js server/db/migrate.js
git commit -m "chore: add PostgreSQL runtime and migrations"
```

### Task 2: Create the initial platform schema

**Files:**
- Create: `server/db/migrations/001_platform.sql`

- [ ] **Step 1: Define authentication and profile tables**

```sql
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  username varchar(40) not null unique,
  email varchar(254) unique,
  password_hash text not null,
  password_salt text not null,
  password_params jsonb not null,
  display_name varchar(80) not null,
  avatar_url text not null default '',
  signature varchar(280) not null default '',
  status varchar(20) not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  version integer not null default 1,
  confidence numeric(5,2) not null default 0,
  behavior_signals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table profile_domains (
  user_id uuid not null references users(id) on delete cascade,
  domain_id varchar(80) not null,
  tier varchar(10) not null check (tier in ('focus','normal','explore')),
  primary key (user_id, domain_id)
);

create table profile_sources (
  user_id uuid not null references users(id) on delete cascade,
  source_id varchar(200) not null,
  tier varchar(10) not null check (tier in ('focus','normal','explore')),
  primary key (user_id, source_id)
);

create table special_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type varchar(16) not null check (type in ('source','author','keyword','url')),
  target varchar(500) not null,
  note varchar(280) not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, type, target)
);
```

- [ ] **Step 2: Define community and snapshot tables**

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id),
  type varchar(20) not null check (type in ('article','briefing','work','workflow')),
  title varchar(180) not null,
  body text not null,
  source_refs jsonb not null default '[]'::jsonb,
  visibility varchar(12) not null default 'public' check (visibility in ('public','followers','private')),
  status varchar(12) not null default 'published' check (status in ('draft','published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id),
  parent_id uuid references comments(id) on delete cascade,
  body varchar(2000) not null,
  status varchar(12) not null default 'published' check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table post_likes (user_id uuid not null references users(id) on delete cascade, post_id uuid not null references posts(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, post_id));
create table post_bookmarks (user_id uuid not null references users(id) on delete cascade, post_id uuid not null references posts(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, post_id));
create table user_follows (follower_id uuid not null references users(id) on delete cascade, followed_id uuid not null references users(id) on delete cascade, created_at timestamptz not null default now(), primary key (follower_id, followed_id), check (follower_id <> followed_id));

create table recommendation_snapshots (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  snapshot_date date not null, profile_version integer not null, algorithm_version integer not null,
  updates jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);
create table recommendation_items (
  snapshot_id uuid not null references recommendation_snapshots(id) on delete cascade,
  item_id varchar(300) not null, lane varchar(10) not null check (lane in ('public','personal')),
  position integer not null, total_score numeric(6,2) not null, score_parts jsonb not null, reasons jsonb not null,
  item_payload jsonb not null, primary key (snapshot_id, lane, position)
);
create table briefing_snapshots (
  snapshot_id uuid primary key references recommendation_snapshots(id) on delete cascade,
  algorithm_payload jsonb not null, ai_payload jsonb, ai_citation_ids jsonb not null default '[]'::jsonb,
  ai_status varchar(16) not null default 'not_requested', updated_at timestamptz not null default now()
);
```

- [ ] **Step 3: Define creative asset/version tables and indexes**

```sql
create table creation_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  original_item_id varchar(300) not null,
  type varchar(24) not null,
  title varchar(300) not null,
  content text not null default '',
  citation jsonb not null,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, original_item_id)
);

create table creation_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title varchar(300) not null,
  draft_content text not null default '',
  status varchar(16) not null default 'draft' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table creation_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references creation_documents(id) on delete cascade,
  version_number integer not null,
  client_operation_id uuid not null,
  title varchar(300) not null,
  content text not null,
  asset_ids jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  reason varchar(20) not null,
  created_at timestamptz not null default now(),
  unique (document_id, version_number),
  unique (document_id, client_operation_id)
);

create index posts_created_idx on posts(created_at desc);
create index comments_post_created_idx on comments(post_id, created_at);
create index recommendation_user_date_idx on recommendation_snapshots(user_id, snapshot_date desc);
create index sessions_active_idx on sessions(token_hash) where revoked_at is null;
```

- [ ] **Step 4: Apply and inspect the migration**

Run: `npm run db:migrate`

Expected: `001_platform.sql` applies once; a second run reports it already applied and exits 0.

- [ ] **Step 5: Commit**

```bash
git add server/db/migrations/001_platform.sql
git commit -m "feat: add platform PostgreSQL schema"
```

### Task 3: Implement secure passwords and opaque sessions

**Files:**
- Create: `server/auth/passwords.js`
- Create: `server/auth/authRepository.js`
- Create: `server/auth/authService.js`
- Create: `server/auth/__tests__/passwords.test.js`
- Create: `server/auth/__tests__/authService.test.js`
- Modify: `vitest.config.js`

- [ ] **Step 1: Write failing password tests**

```js
import { expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../passwords.js';

it('uses independent salts and verifies the original password', async () => {
  const a = await hashPassword('correct horse battery staple');
  const b = await hashPassword('correct horse battery staple');
  expect(a.salt).not.toBe(b.salt);
  await expect(verifyPassword('correct horse battery staple', a)).resolves.toBe(true);
  await expect(verifyPassword('wrong', a)).resolves.toBe(false);
});
```

- [ ] **Step 2: Implement `crypto.scrypt` password records**

Use 16 random salt bytes, a 64-byte derived key, `N=16384`, `r=8`, `p=1`, and `timingSafeEqual`. Return `{ hash, salt, params: { algorithm: 'scrypt', version: 1, N, r, p, keylen: 64 } }`.

- [ ] **Step 3: Write service tests using an in-memory fake repository**

Test duplicate usernames, invalid credentials, session creation, expired sessions, revoked sessions, and public user serialization that never includes password fields.

- [ ] **Step 4: Implement auth service invariants**

`register({ username, email, password })`, `login({ username, password })`, `authenticate(rawToken)`, and `logout(rawToken)` use 32 random token bytes; repositories store only `sha256(rawToken)`.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run server/auth/__tests__`

Expected: PASS.

```bash
git add server/auth server/auth/__tests__ vitest.config.js
git commit -m "feat: add secure database authentication services"
```

### Task 4: Expose shared authentication HTTP handlers

**Files:**
- Create: `server/http/httpUtils.js`
- Create: `server/http/authHandlers.js`
- Create: `api/auth/[action].js`
- Modify: `server/news/plugin.js:40-120`
- Modify: `src/hooks/useAuth.js`

- [ ] **Step 1: Implement cookie and response utilities**

Parse `meridian_session`; set it with `HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` and add `Secure` in production. Implement JSON body size limit 64 KiB and consistent `{ ok, data?, error? }` envelopes.

- [ ] **Step 2: Implement register/login/logout/me handlers**

Validate username with `/^[a-zA-Z0-9_\u4e00-\u9fff]{3,40}$/`, password length 10–128, and email length up to 254. Return 409 on duplicate identity, 401 on invalid login, and 503 with `DATABASE_UNAVAILABLE` when no database exists.

- [ ] **Step 3: Wire both adapters to the same handler functions**

Remove the in-memory `Map` auth branches from `server/news/plugin.js`. `api/auth/[action].js` reads the action path and calls the same handler.

- [ ] **Step 4: Remove credential localStorage from React**

`useAuth` calls `/api/auth/me` on mount with `credentials: 'include'`; login/register/logout also use cookies. Remove `token`, `localStorage.token`, and token request bodies. Keep only non-sensitive anonymous preferences locally.

- [ ] **Step 5: Verify and commit**

Run: `npm run test && npm run build`

Expected: tests and build pass.

```bash
git add server/http server/news/plugin.js api/auth src/hooks/useAuth.js
git commit -m "feat: expose secure auth in development and production"
```

### Task 5: Implement community repository and service invariants

**Files:**
- Create: `server/community/communityRepository.js`
- Create: `server/community/communityService.js`
- Create: `server/community/__tests__/communityService.test.js`

- [ ] **Step 1: Write failing service tests**

Cover: public feed pagination; private post visibility; author-only update/delete; comment/reply creation; empty comment rejection; idempotent like/bookmark; self-follow rejection; post counters derived from relation tables.

```js
it('does not increment a repeated like', async () => {
  const service = createCommunityService(fakeRepository());
  await service.setLike({ userId: 'u1', postId: 'p1', liked: true });
  await service.setLike({ userId: 'u1', postId: 'p1', liked: true });
  expect((await service.getPost({ postId: 'p1', viewerId: 'u1' })).likeCount).toBe(1);
});
```

- [ ] **Step 2: Implement SQL repository methods**

Use parameterized SQL only. Implement `listPosts`, `getPost`, `createPost`, `updatePost`, `softDeletePost`, `listComments`, `createComment`, `setLike`, `setBookmark`, and `setFollow`. Use `on conflict do nothing` and `delete ... where` for idempotent relationships.

- [ ] **Step 3: Implement service validation and authorization**

Titles 1–180 characters, bodies 1–100000, comments 1–2000, allowed types/visibility/status from schema. Reject missing users with 401 and forbidden ownership with 403.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run server/community/__tests__/communityService.test.js`

Expected: PASS.

```bash
git add server/community
git commit -m "feat: add real community domain services"
```

### Task 6: Expose community APIs in dev and production

**Files:**
- Create: `server/http/communityHandlers.js`
- Create: `api/community/[...path].js`
- Modify: `server/news/plugin.js`
- Create: `server/http/__tests__/communityHandlers.test.js`

- [ ] **Step 1: Write handler contract tests**

Assert HTTP methods and status codes for feed, post detail, create/update/delete, comments, like, bookmark, and follow. Assert write routes require a valid session cookie.

- [ ] **Step 2: Implement route matching**

Support:

- `GET/POST /api/community/posts`
- `GET/PATCH/DELETE /api/community/posts/:id`
- `GET/POST /api/community/posts/:id/comments`
- `PUT/DELETE /api/community/posts/:id/like`
- `PUT/DELETE /api/community/posts/:id/bookmark`
- `PUT/DELETE /api/community/users/:id/follow`

- [ ] **Step 3: Add rate limits for writes**

Use an in-memory window limiter per function instance as a first line of defense: login 10/minute/IP, posts 10/hour/user, comments 30/hour/user. Database constraints remain authoritative for consistency.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run server/http/__tests__/communityHandlers.test.js`

Expected: PASS.

```bash
git add server/http/communityHandlers.js server/http/__tests__/communityHandlers.test.js server/news/plugin.js api/community
git commit -m "feat: expose community APIs across deployments"
```

### Task 7: Replace seeded community UI with real API data

**Files:**
- Create: `src/hooks/useCommunity.js`
- Create: `src/components/CommunityPage.jsx`
- Create: `src/components/CommunityPostDetail.jsx`
- Modify: `src/App.jsx:6886-6968`
- Modify: `src/styles.css`

- [ ] **Step 1: Build the API hook**

Expose `{ posts, selectedPost, comments, loading, error, loadPosts, openPost, createPost, addComment, setLike, setBookmark, setFollow }`. Send `credentials: 'include'`. For optimistic relationships, roll back local state on a non-2xx response.

- [ ] **Step 2: Build feed and detail components**

Feed cards open a real detail view. Detail shows complete body, source references, threaded comments, author metadata and relationship states. Signed-out write actions open the existing auth modal.

- [ ] **Step 3: Remove `squareSeedItems` from runtime rendering**

Retain sample content only as an explicit SQL seed script for local development; no `Math.max` counters or front-end-only comment arrays remain.

- [ ] **Step 4: Verify two-account persistence**

Create two accounts, publish with account A, view/comment/like/bookmark/follow with account B, refresh, restart Vite, and verify all state remains.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCommunity.js src/components/CommunityPage.jsx src/components/CommunityPostDetail.jsx src/App.jsx src/styles.css
git commit -m "feat: connect user square to persistent community data"
```

### Task 8: Persist profile tiers and snapshots for signed-in users

**Files:**
- Create: `server/profile/profileRepository.js`
- Create: `server/profile/profileService.js`
- Create: `server/http/profileHandlers.js`
- Create: `api/profile/[...path].js`
- Create: `api/recommendations.js`
- Create: `api/briefings.js`
- Modify: `server/news/plugin.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: Add service tests for atomic version increments**

Saving domains, sources or special follows must increment `user_profiles.version` in the same transaction. Reading historical recommendation snapshots never joins current profile rows.

- [ ] **Step 2: Implement profile and snapshot repositories**

Use upsert for tier rows, explicit delete for removed keys, unique daily snapshot insert, and append-only JSON updates. A duplicate daily base returns the existing snapshot.

- [ ] **Step 3: Expose profile/recommendation/briefing APIs**

All endpoints require authentication except anonymous local fallback handled in React. Validate dates as strict `YYYY-MM-DD` calendar dates.

- [ ] **Step 4: Sync React profile state**

Signed-in users load/save PostgreSQL profile data; signed-out users keep `localStorage`. On first authenticated load, prompt once to import anonymous settings instead of silently overwriting either side.

- [ ] **Step 5: Verify and commit**

Run: `npm run test && npm run build`

Expected: all tests and build pass.

```bash
git add server/profile server/http/profileHandlers.js api/profile api/recommendations.js api/briefings.js server/news/plugin.js src/App.jsx
git commit -m "feat: persist profiles and intelligence snapshots"
```

## Plan 2 completion gate

- Passwords use versioned scrypt records.
- Credentials never enter localStorage.
- Dev and production expose the same auth/community behavior.
- Community data survives service restarts.
- Relationship operations are idempotent.
- Signed-in profiles and snapshots persist in PostgreSQL.
- Two-account manual scenario passes.
- `npm run test` and `npm run build` pass.
