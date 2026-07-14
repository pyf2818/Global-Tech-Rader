# Creative Asset Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing materials and article editor into a reliable asset pipeline with normalized citations, immutable document versions, AI-assisted creation, local export, and optional authenticated synchronization.

**Architecture:** Pure modules normalize assets, create document versions, and export deterministic files. React keeps editing state and invokes those modules; AI only produces proposed text that the user inserts. Local storage remains the offline source of truth for anonymous users, while signed-in users synchronize metadata and versions through the PostgreSQL service from Plan 2.

**Tech Stack:** React 19, JavaScript ES modules, Vitest, Markdown/HTML rendering, localStorage, PostgreSQL service adapter

---

## File map

- Create `src/domain/creative/assetModel.js`, `versionStore.js`, `exportEngine.js` and tests.
- Create `src/hooks/useCreativeWorkspace.js`.
- Create `src/components/CreativeWorkspace.jsx`.
- Modify `src/components/ArticleEditor.jsx`, `src/App.jsx`, `src/utils/markdown.jsx`, `src/styles.css`.
- Create `server/creative/creativeRepository.js`, `creativeService.js`, `server/http/creativeHandlers.js`, `api/creative/[...path].js`.

### Task 1: Normalize materials and source citations

**Files:**
- Create: `src/domain/creative/assetModel.js`
- Create: `src/domain/creative/__tests__/assetModel.test.js`

- [ ] **Step 1: Write failing normalization tests**

```js
import { expect, it } from 'vitest';
import { normalizeAsset, buildCitation } from '../assetModel.js';

it('preserves source evidence when news becomes a material', () => {
  const asset = normalizeAsset({ id: 'n1', title: 'Model update', url: 'https://example.com/a', source: 'Example', publishedAt: '2026-07-14T01:00:00Z', summary: 'Summary' });
  expect(asset.originalItemId).toBe('n1');
  expect(asset.citation).toEqual({ id: 'n1', title: 'Model update', source: 'Example', url: 'https://example.com/a', publishedAt: '2026-07-14T01:00:00Z' });
  expect(buildCitation(asset, 1)).toContain('[1]');
});

it('rejects assets without a stable title', () => {
  expect(() => normalizeAsset({ id: 'n1' })).toThrow('ASSET_TITLE_REQUIRED');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/creative/__tests__/assetModel.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement the immutable asset contract**

```js
export function normalizeAsset(input, now = new Date().toISOString()) {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('ASSET_TITLE_REQUIRED');
  const originalItemId = String(input.originalItemId || input.id || crypto.randomUUID());
  const citation = Object.freeze({
    id: originalItemId, title, source: String(input.source || '未知来源'),
    url: String(input.url || ''), publishedAt: input.publishedAt || null,
  });
  return Object.freeze({
    id: String(input.assetId || crypto.randomUUID()), originalItemId, title,
    content: String(input.content || input.summary || ''), type: input.type || 'news',
    tags: [...new Set((input.tags || []).filter(Boolean))], citation,
    createdAt: input.createdAt || now, updatedAt: now,
  });
}

export function buildCitation(asset, index) {
  const c = asset.citation;
  return `[${index}] ${c.title} — ${c.source}${c.publishedAt ? ` (${c.publishedAt.slice(0, 10)})` : ''}${c.url ? ` ${c.url}` : ''}`;
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/domain/creative/__tests__/assetModel.test.js`

Expected: PASS.

```bash
git add src/domain/creative/assetModel.js src/domain/creative/__tests__/assetModel.test.js
git commit -m "feat: preserve citations in creative assets"
```

### Task 2: Create immutable article versions

**Files:**
- Create: `src/domain/creative/versionStore.js`
- Create: `src/domain/creative/__tests__/versionStore.test.js`

- [ ] **Step 1: Write failing version tests**

```js
import { expect, it } from 'vitest';
import { createDocument, createVersion, restoreVersion } from '../versionStore.js';

it('creates immutable versions and restores by creating a new version', () => {
  const doc = createDocument({ title: 'Draft' }, '2026-07-14T01:00:00Z');
  const v1 = createVersion(doc, { content: 'one', assetIds: ['a1'] }, '2026-07-14T01:01:00Z');
  const v2 = createVersion(v1.document, { content: 'two', assetIds: ['a1'] }, '2026-07-14T01:02:00Z');
  const restored = restoreVersion(v2.document, v1.version, '2026-07-14T01:03:00Z');
  expect(restored.version.content).toBe('one');
  expect(restored.version.number).toBe(3);
  expect(v1.version.content).toBe('one');
});
```

- [ ] **Step 2: Verify failure and implement**

Run: `npx vitest run src/domain/creative/__tests__/versionStore.test.js`

Expected before implementation: FAIL. Implement `{ document, version }` results; versions contain `id`, `documentId`, sequential `number`, `title`, `content`, deduplicated `assetIds`, `citations`, `createdAt`, and `reason`. Never mutate previous inputs.

- [ ] **Step 3: Add a bounded local persistence adapter**

Store documents under `creativeDocuments:v1` and versions under `creativeVersions:v1`. Keep the newest 50 versions per document and never delete the newest version. Quota errors surface as `{ ok: false, code: 'LOCAL_STORAGE_QUOTA' }` without clearing editor content.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/domain/creative/__tests__/versionStore.test.js`

Expected: PASS.

```bash
git add src/domain/creative/versionStore.js src/domain/creative/__tests__/versionStore.test.js
git commit -m "feat: add immutable creative document versions"
```

### Task 3: Build deterministic Markdown, JSON and HTML export

**Files:**
- Create: `src/domain/creative/exportEngine.js`
- Create: `src/domain/creative/__tests__/exportEngine.test.js`
- Modify: `src/utils/markdown.jsx`

- [ ] **Step 1: Write failing export tests**

```js
import { expect, it } from 'vitest';
import { exportDocument } from '../exportEngine.js';

const document = { id: 'd1', title: 'AI Report', content: '# Body\n\nClaim [1]', updatedAt: '2026-07-14T02:00:00Z', citations: [{ id: 'n1', title: 'Source', source: 'Lab', url: 'https://example.com' }] };

it('exports every supported format with citations', () => {
  for (const format of ['md', 'json', 'html']) {
    const result = exportDocument(document, format);
    expect(result.filename).toMatch(/^AI-Report/);
    expect(result.content).toContain('Source');
  }
});

it('escapes hostile HTML content', () => {
  expect(exportDocument({ ...document, content: '<script>alert(1)</script>' }, 'html').content).not.toContain('<script>');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/creative/__tests__/exportEngine.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement all three exporters**

Markdown appends `## 来源` and numbered citations. JSON exports schema version, document metadata, content and citations. HTML uses escaped metadata and sanitized rendered Markdown, includes UTF-8 meta tags, and appends a source list with safe `rel="noopener noreferrer"` links.

- [ ] **Step 4: Remove duplicate Markdown renderer from `App.jsx`**

Use only `src/utils/markdown.jsx`; keep placeholder image resolution `![alt](#{id})` in the shared renderer.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run src/domain/creative/__tests__/exportEngine.test.js`

Expected: PASS.

```bash
git add src/domain/creative/exportEngine.js src/domain/creative/__tests__/exportEngine.test.js src/utils/markdown.jsx src/App.jsx
git commit -m "feat: export creative work with source citations"
```

### Task 4: Centralize creative state in a hook

**Files:**
- Create: `src/hooks/useCreativeWorkspace.js`
- Modify: `src/App.jsx:1268-1269,4468-4615,4887-5110`
- Modify: `src/components/ArticleEditor.jsx`

- [ ] **Step 1: Move material/document operations behind the hook**

Expose `{ assets, documents, versions, activeDocument, addAsset, removeAsset, createDocument, updateDraft, saveVersion, restoreVersion, linkAsset, unlinkAsset, exportDocument }`. Maintain existing localStorage migration for `materials` and `articles` once, then save only the new keys.

- [ ] **Step 2: Preserve editor behavior**

Autosave updates the mutable draft; explicit save, AI insertion, restore and export create immutable versions with reasons `manual`, `ai_insert`, `restore`, or `export`.

- [ ] **Step 3: Reduce ArticleEditor prop surface**

Pass one `workspace` object plus UI-only state instead of dozens of material/article mutation functions. Keep image upload, preview and cursor insertion behavior.

- [ ] **Step 4: Verify migration and quota failure**

Use a copied browser profile containing old `materials` and `articles`; confirm they appear once after migration. Simulate `QuotaExceededError`; confirm draft text remains in memory and an error banner appears.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCreativeWorkspace.js src/App.jsx src/components/ArticleEditor.jsx
git commit -m "refactor: centralize creative workspace state"
```

### Task 5: Build the unified 智创空间 page

**Files:**
- Create: `src/components/CreativeWorkspace.jsx`
- Modify: `src/App.jsx:6100-6235,8047-8400`
- Modify: `src/styles.css`

- [ ] **Step 1: Define one navigation entry**

Keep `studio` as the public label “智创空间”. Materials and editor remain internal subviews reachable from tabs, not three competing primary navigation items.

- [ ] **Step 2: Implement the asset-to-document workflow**

The page shows recent assets, active documents, version count, unresolved citations, and actions “从素材创作”“继续编辑”“导出本地”. Opening an asset reveals full provenance.

- [ ] **Step 3: Add AI proposal behavior**

AI output appears in a review panel with cited asset IDs. The user must click insert/replace; AI never overwrites a document automatically. Invalid citation IDs disable insertion and show the validation error.

- [ ] **Step 4: Verify responsive UI and exports**

Run: `npm run test && npm run build`

Expected: tests and build pass. Manually export one document in all three formats and open the files.

- [ ] **Step 5: Commit**

```bash
git add src/components/CreativeWorkspace.jsx src/App.jsx src/styles.css
git commit -m "feat: unify assets AI creation and local export"
```

### Task 6: Add authenticated creative synchronization

**Files:**
- Create: `server/creative/creativeRepository.js`
- Create: `server/creative/creativeService.js`
- Create: `server/creative/__tests__/creativeService.test.js`
- Create: `server/http/creativeHandlers.js`
- Create: `api/creative/[...path].js`
- Modify: `server/news/plugin.js`
- Modify: `src/hooks/useCreativeWorkspace.js`

- [ ] **Step 1: Test ownership and append-only versions**

Assert users cannot read/update another user's private document; saving a version inserts a new row; restoring inserts another row; duplicate client operation IDs are idempotent.

- [ ] **Step 2: Implement service and routes**

Support `GET/POST /api/creative/assets`, `GET/POST/PATCH /api/creative/documents`, `GET/POST /api/creative/documents/:id/versions`. Require authentication and validate citation arrays against assets owned by the same user.

- [ ] **Step 3: Implement explicit sync semantics**

Local anonymous state stays local until the user chooses “同步到账号”. Server versions win only after the user selects a conflict; never silently delete local work. Track `syncState: local|synced|conflict`.

- [ ] **Step 4: Run tests and commit**

Run: `npm run test && npm run build`

Expected: all tests and build pass.

```bash
git add server/creative server/http/creativeHandlers.js api/creative server/news/plugin.js src/hooks/useCreativeWorkspace.js
git commit -m "feat: sync creative assets and versions securely"
```

## Plan 4 completion gate

- Every saved material retains provenance.
- Every explicit save creates an immutable version.
- Markdown, JSON and HTML exports include citations.
- HTML export sanitizes hostile input.
- AI output cannot overwrite without user confirmation.
- Anonymous work remains usable offline.
- Signed-in sync preserves ownership and handles conflicts explicitly.
- Creative tests and `npm run build` pass.
