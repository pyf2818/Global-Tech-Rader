# Core Intelligence and AI Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic recommendation/briefing core, migrate profile priorities to three tiers, make the AI briefing hub the default page, and add immutable daily recommendation timelines.

**Architecture:** Pure domain functions calculate public and personal scores, enforce diversity, and create serializable snapshots. React components consume those results without recalculating business rules. Anonymous users persist snapshots locally; the PostgreSQL plan later swaps in the same snapshot contract for signed-in users.

**Tech Stack:** React 19, Vite 8, Vitest 3, JavaScript ES modules, localStorage fallback

---

## File map

- Create `src/domain/intelligence/recommendationEngine.js`: scoring, event dedupe, diversity constraints.
- Create `src/domain/intelligence/briefingEngine.js`: deterministic newspaper sections and cited AI merge.
- Create `src/domain/intelligence/profileTiers.js`: tier constants, legacy migration, explicit profile weights.
- Create `src/domain/intelligence/snapshotStore.js`: immutable local snapshot adapter.
- Create `src/domain/intelligence/__tests__/*.test.js`: domain contract tests.
- Create `src/components/AiBriefingHome.jsx`: default AI briefing hub.
- Create `src/components/RecommendationTimeline.jsx`: calendar/day timeline and score explanation.
- Modify `src/App.jsx`: wire domain results, routes, feedback, and components; remove duplicated inline scoring.
- Modify `src/components/AiChatPanel.jsx`: accept cited structured context and validate returned citations.
- Modify `src/styles.css`: AI hub and timeline styles.

### Task 1: Define three-tier profile semantics

**Files:**
- Create: `src/domain/intelligence/profileTiers.js`
- Create: `src/domain/intelligence/__tests__/profileTiers.test.js`
- Modify: `src/utils/profileModel.js`

- [ ] **Step 1: Write failing migration and weight tests**

```js
import { describe, expect, it } from 'vitest';
import { migrateLegacyPriorities, domainTierScore, sourceTierScore } from '../profileTiers.js';

describe('profile tiers', () => {
  it('maps legacy 1..5 values to explore/normal/focus', () => {
    expect(migrateLegacyPriorities({ ai: 5, cloud: 3, robotics: 1 })).toEqual({
      ai: 'focus', cloud: 'normal', robotics: 'explore'
    });
  });

  it('uses the approved deterministic score table', () => {
    expect(['focus', 'normal', 'explore', undefined].map(domainTierScore)).toEqual([25, 14, 5, 8]);
    expect(['focus', 'normal', 'explore', undefined].map(sourceTierScore)).toEqual([20, 11, 4, 7]);
  });
});
```

- [ ] **Step 2: Run the targeted test and verify the missing-module failure**

Run: `npx vitest run src/domain/intelligence/__tests__/profileTiers.test.js`

Expected: FAIL with `Cannot find module '../profileTiers.js'`.

- [ ] **Step 3: Implement the tier contract and one-time migration**

```js
export const PROFILE_TIERS = Object.freeze({
  focus: Object.freeze({ id: 'focus', label: '一级 · 重点' }),
  normal: Object.freeze({ id: 'normal', label: '二级 · 常规' }),
  explore: Object.freeze({ id: 'explore', label: '三级 · 探索' }),
});

const DOMAIN_SCORES = Object.freeze({ focus: 25, normal: 14, explore: 5 });
const SOURCE_SCORES = Object.freeze({ focus: 20, normal: 11, explore: 4 });

export function normalizeTier(value) {
  if (value === 'focus' || value === 'normal' || value === 'explore') return value;
  const numeric = Number(value);
  if (numeric >= 4) return 'focus';
  if (numeric >= 2) return 'normal';
  return numeric > 0 ? 'explore' : undefined;
}

export function migrateLegacyPriorities(priorities = {}) {
  return Object.fromEntries(Object.entries(priorities).map(([key, value]) => [key, normalizeTier(value)]));
}

export function domainTierScore(tier) { return DOMAIN_SCORES[normalizeTier(tier)] ?? 8; }
export function sourceTierScore(tier) { return SOURCE_SCORES[normalizeTier(tier)] ?? 7; }
```

Update `computeProfileLearningEngine` to read normalized tiers and expose both `tier` and derived `score`; do not retain `(priority - 3)` calculations.

- [ ] **Step 4: Run profile tests**

Run: `npx vitest run src/domain/intelligence/__tests__/profileTiers.test.js src/utils/__tests__/profileModel.test.js`

Expected: PASS; update legacy profile assertions only where the approved tier contract intentionally changes output.

- [ ] **Step 5: Commit the tier contract**

```bash
git add src/domain/intelligence/profileTiers.js src/domain/intelligence/__tests__/profileTiers.test.js src/utils/profileModel.js src/utils/__tests__/profileModel.test.js
git commit -m "feat: add explicit three-tier profile weights"
```

### Task 2: Migrate profile controls and saved preferences to tiers

**Files:**
- Modify: `src/App.jsx:1149-1153,6969-7125`
- Modify: `src/styles.css`
- Create: `src/domain/intelligence/__tests__/profilePreferenceMigration.test.js`

- [ ] **Step 1: Write a failing persisted-preference migration test**

```js
import { expect, it } from 'vitest';
import { migratePreferenceState } from '../profileTiers.js';

it('prefers tier keys and migrates legacy sliders exactly once', () => {
  expect(migratePreferenceState({ 'domainTiers:v1': { ai: 'explore' }, domainPriorities: { ai: 5 } }, 'domain')).toEqual({ ai: 'explore' });
  expect(migratePreferenceState({ domainPriorities: { ai: 5, chips: 2 } }, 'domain')).toEqual({ ai: 'focus', chips: 'normal' });
});
```

- [ ] **Step 2: Implement explicit key migration**

Add `migratePreferenceState(storageState, kind)` to read `${kind}Tiers:v1` first and otherwise call `migrateLegacyPriorities` on `${kind}Priorities`. In `App.jsx`, initialize `domainTiers` and `sourceTiers`, persist the v1 keys only after successful parsing, and leave old keys untouched for rollback.

Add `migrateSpecialFollows(items)` so legacy `{ name, url, note }` records become `{ id, type: 'source', target: name || url, note, legacyUrl: url }`; already typed records remain unchanged. Persist the typed list under `specialFollows:v2` only after successful conversion.

- [ ] **Step 3: Replace range sliders with three labeled buttons**

Each domain/source row renders `一级 · 重点`, `二级 · 常规`, and `三级 · 探索` buttons using `aria-pressed`. Keyboard focus and current selection must be visible. Recommendation code receives tier IDs rather than numbers.

- [ ] **Step 4: Make special follows typed and editable**

Replace DOM `getElementById` reads with controlled state `{ type, target, note }`. Allow `source`, `author`, `keyword`, and `url`; trim input, reject empty targets, prevent duplicate `(type,target)` entries, and support edit/delete.

- [ ] **Step 5: Run tests, build, and commit**

Run: `npx vitest run src/domain/intelligence/__tests__/profileTiers.test.js src/domain/intelligence/__tests__/profilePreferenceMigration.test.js src/utils/__tests__/profileModel.test.js`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

```bash
git add src/domain/intelligence/profileTiers.js src/domain/intelligence/__tests__/profilePreferenceMigration.test.js src/App.jsx src/styles.css
git commit -m "feat: migrate profile controls to three tiers"
```

### Task 3: Extract the deterministic recommendation engine

**Files:**
- Create: `src/domain/intelligence/recommendationEngine.js`
- Create: `src/domain/intelligence/__tests__/recommendationEngine.test.js`
- Modify: `src/App.jsx:2210-2445`

- [ ] **Step 1: Write failing public/personal scoring tests**

```js
import { describe, expect, it } from 'vitest';
import { buildRecommendation } from '../recommendationEngine.js';

const now = Date.parse('2026-07-14T08:00:00Z');
const base = { id: 'n1', title: 'Agent update', summary: 'A sufficiently complete summary', source: 'Lab', category: 'ai', publishedAt: '2026-07-14T07:00:00Z' };

describe('buildRecommendation', () => {
  it('keeps public and personal scores separate and explainable', () => {
    const result = buildRecommendation(base, {
      now, domainTiers: { ai: 'focus' }, sourceTiers: { Lab: 'normal' },
      specialFollows: [{ type: 'source', target: 'Lab' }], independentSourceCount: 3,
      trendVelocity: 0.8, behaviorSignal: 0, isNovel: true
    });
    expect(result.publicScore).toBeGreaterThan(0);
    expect(result.personalScore).toBeGreaterThan(result.publicScore / 2);
    expect(result.scoreParts.personal.specialFollow).toBe(25);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('caps behavior and total scores', () => {
    const result = buildRecommendation(base, { now, behaviorSignal: 999 });
    expect(result.scoreParts.personal.behavior).toBe(10);
    expect(result.personalScore).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run the targeted test and verify failure**

Run: `npx vitest run src/domain/intelligence/__tests__/recommendationEngine.test.js`

Expected: FAIL because `buildRecommendation` is not exported.

- [ ] **Step 3: Implement score parts as named pure functions**

```js
import { domainTierScore, sourceTierScore } from './profileTiers.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = value => Math.round(value * 100) / 100;

export function freshnessScore(publishedAt, now = Date.now(), max = 30) {
  const hours = Math.max(0, (now - Date.parse(publishedAt)) / 3_600_000);
  return round(clamp(max * Math.exp(-hours / 12), 0, max));
}

export function matchSpecialFollow(item, rules = []) {
  const text = `${item.title || ''} ${item.summary || ''}`.toLowerCase();
  return rules.reduce((best, rule) => {
    const target = String(rule.target || rule.name || rule.url || '').toLowerCase();
    if (!target) return best;
    if ((rule.type === 'source' || rule.type === 'author') && String(item.source || '').toLowerCase().includes(target)) return Math.max(best, 25);
    if ((rule.type === 'keyword' || rule.type === 'url') && (text.includes(target) || String(item.url || '').toLowerCase().includes(target))) return Math.max(best, 18);
    return best;
  }, 0);
}

export function buildRecommendation(item, context = {}) {
  const publicParts = {
    freshness: freshnessScore(item.publishedAt, context.now, 30),
    corroboration: clamp((context.independentSourceCount || 1) * 6.25, 0, 25),
    sourceQuality: clamp(Number(item.sourceQualityScore ?? 10), 0, 20),
    trend: clamp((context.trendVelocity || 0) * 15, 0, 15),
    completeness: clamp(((item.summary?.length || 0) / 160) * 10, 0, 10),
  };
  const personalParts = {
    domain: domainTierScore(context.domainTiers?.[item.category]),
    source: sourceTierScore(context.sourceTiers?.[item.source]),
    specialFollow: matchSpecialFollow(item, context.specialFollows),
    freshness: freshnessScore(item.publishedAt, context.now, 15),
    behavior: clamp(context.behaviorSignal || 0, -10, 10),
    novelty: context.isNovel === false ? 0 : 5,
  };
  const sum = parts => clamp(Object.values(parts).reduce((total, value) => total + value, 0), 0, 100);
  return { ...item, publicScore: round(sum(publicParts)), personalScore: round(sum(personalParts)), scoreParts: { public: publicParts, personal: personalParts }, reasons: buildReasons(publicParts, personalParts) };
}

function buildReasons(publicParts, personalParts) {
  return [
    personalParts.specialFollow > 0 && '命中特别关注',
    personalParts.domain >= 14 && '匹配关注领域',
    publicParts.corroboration >= 12.5 && '多个独立来源印证',
    publicParts.freshness >= 20 && '发布时间较新',
  ].filter(Boolean).slice(0, 3);
}
```

- [ ] **Step 4: Run the recommendation tests**

Run: `npx vitest run src/domain/intelligence/__tests__/recommendationEngine.test.js`

Expected: PASS.

- [ ] **Step 5: Replace the inline score loop in `App.jsx`**

Import `buildRecommendation`, build a stable context object with `useMemo`, and map `items` through the engine. Preserve existing item IDs and feedback actions. Remove only the duplicated score arithmetic from `App.jsx`.

- [ ] **Step 6: Commit the recommendation engine**

```bash
git add src/domain/intelligence/recommendationEngine.js src/domain/intelligence/__tests__/recommendationEngine.test.js src/App.jsx
git commit -m "refactor: centralize explainable recommendation scoring"
```

### Task 4: Enforce event diversity and the 50/50 lanes

**Files:**
- Modify: `src/domain/intelligence/recommendationEngine.js`
- Modify: `src/domain/intelligence/__tests__/recommendationEngine.test.js`

- [ ] **Step 1: Add failing lane and diversity tests**

```js
import { selectBriefingLanes } from '../recommendationEngine.js';

it('returns equal public and personal lanes without source/category domination', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({
    id: `n${i}`, canonicalId: i < 2 ? 'same-event' : `event-${i}`,
    source: i < 5 ? 'OneSource' : `Source${i}`, category: i < 6 ? 'ai' : 'chips',
    publicScore: 100 - i, personalScore: 90 - i
  }));
  const lanes = selectBriefingLanes(items, { perLane: 4, maxPerSource: 2, maxCategoryRatio: 0.4 });
  expect(lanes.public).toHaveLength(4);
  expect(lanes.personal).toHaveLength(4);
  expect(new Set([...lanes.public, ...lanes.personal].map(item => item.id)).size).toBe(8);
  expect(lanes.public.filter(item => item.source === 'OneSource')).toHaveLength(2);
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/intelligence/__tests__/recommendationEngine.test.js`

Expected: FAIL because `selectBriefingLanes` is missing.

- [ ] **Step 3: Implement stable constrained selection**

Add `selectBriefingLanes(items, options)` that sorts by the requested lane score, rejects duplicate `canonicalId || eventClusterId || id`, tracks counts by source/category, selects the public lane first and the personal lane second, and runs one relaxed pass only when strict constraints cannot fill the lane. Return `{ public, personal, diagnostics }`.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/domain/intelligence/__tests__/recommendationEngine.test.js`

Expected: PASS.

```bash
git add src/domain/intelligence/recommendationEngine.js src/domain/intelligence/__tests__/recommendationEngine.test.js
git commit -m "feat: enforce balanced recommendation lanes"
```

### Task 5: Build deterministic briefing and citation validation

**Files:**
- Create: `src/domain/intelligence/briefingEngine.js`
- Create: `src/domain/intelligence/__tests__/briefingEngine.test.js`

- [ ] **Step 1: Write failing briefing tests**

```js
import { describe, expect, it } from 'vitest';
import { buildAlgorithmBriefing, mergeAiBriefing } from '../briefingEngine.js';

const lanes = { public: [{ id: 'p1', title: 'Public', category: 'ai', source: 'A' }], personal: [{ id: 'u1', title: 'Personal', category: 'chips', source: 'B', reasons: ['匹配关注领域'] }] };

it('builds a usable model-free newspaper', () => {
  const result = buildAlgorithmBriefing({ date: '2026-07-14', lanes });
  expect(result.mode).toBe('algorithm');
  expect(result.sections.public[0].id).toBe('p1');
  expect(result.citationIds).toEqual(['p1', 'u1']);
});

it('rejects AI citations outside the selected evidence', () => {
  const base = buildAlgorithmBriefing({ date: '2026-07-14', lanes });
  expect(mergeAiBriefing(base, { oneLine: 'claim', citationIds: ['missing'] }).mode).toBe('algorithm');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/intelligence/__tests__/briefingEngine.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement deterministic sections and strict AI merge**

`buildAlgorithmBriefing` must return `{ version: 1, date, mode: 'algorithm', oneLine, opportunities, risks, sections, citationIds }`. `mergeAiBriefing` must accept AI content only when every citation is present in `base.citationIds`; otherwise return the unmodified base with `aiValidationError`.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/domain/intelligence/__tests__/briefingEngine.test.js`

Expected: PASS.

```bash
git add src/domain/intelligence/briefingEngine.js src/domain/intelligence/__tests__/briefingEngine.test.js
git commit -m "feat: add model-free cited daily briefings"
```

### Task 6: Add immutable anonymous snapshot storage

**Files:**
- Create: `src/domain/intelligence/snapshotStore.js`
- Create: `src/domain/intelligence/__tests__/snapshotStore.test.js`

- [ ] **Step 1: Write failing immutable-history tests**

```js
import { createMemoryStorage, createSnapshotStore } from '../snapshotStore.js';

it('does not overwrite an existing daily base snapshot', () => {
  const store = createSnapshotStore(createMemoryStorage());
  store.create({ date: '2026-07-14', profileVersion: 1, items: ['a'] });
  store.create({ date: '2026-07-14', profileVersion: 2, items: ['b'] });
  expect(store.get('2026-07-14').items).toEqual(['a']);
});

it('appends material updates without mutating the base result', () => {
  const store = createSnapshotStore(createMemoryStorage());
  store.create({ date: '2026-07-14', profileVersion: 1, items: ['a'] });
  store.appendUpdate('2026-07-14', { id: 'event-2', at: 2 });
  expect(store.get('2026-07-14').updates).toEqual([{ id: 'event-2', at: 2 }]);
  expect(store.get('2026-07-14').items).toEqual(['a']);
});
```

- [ ] **Step 2: Verify failure, implement, and rerun**

Run: `npx vitest run src/domain/intelligence/__tests__/snapshotStore.test.js`

Expected before implementation: FAIL. Implement versioned JSON under `intelligenceSnapshots:v1`, return defensive copies from `get`, and reject a second `create` for the same date. Expected after implementation: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/intelligence/snapshotStore.js src/domain/intelligence/__tests__/snapshotStore.test.js
git commit -m "feat: preserve immutable daily recommendation snapshots"
```

### Task 7: Build the AI briefing hub and make it the default route

**Files:**
- Create: `src/components/AiBriefingHome.jsx`
- Modify: `src/App.jsx:55-110,985,5477-5500,5731-5975`
- Modify: `api/ai-generate.js`
- Modify: `server/news/plugin.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Add the `home` navigation contract**

Add `{ id: 'home', label: 'AI 情报', icon: 'sparkle' }` as the first primary item, initialize `nav` with `'home'`, add title/description metadata, and include `home` in `wideWorkspaceNavs`.

- [ ] **Step 2: Create a focused presentational component**

Implement `AiBriefingHome` with props `{ briefing, lanes, loading, onAsk, onNavigate, onRefresh }`. It renders algorithm mode without requiring an LLM, labels the two lanes, shows citations/source names, and sends predefined prompts through `onAsk`.

- [ ] **Step 3: Wire memoized domain results in `App.jsx`**

Create one `recommendationContext`, map normalized `items`, call `selectBriefingLanes`, create/read the daily snapshot, and build the algorithm briefing. Do not put scoring formulas in JSX.

- [ ] **Step 4: Add optional validated AI briefing enrichment**

Add `daily-briefing` to both AI route adapters. Send only the selected lane items and require JSON `{ oneLine, opportunities, risks, citationIds }`. Parse it, call `mergeAiBriefing`, and cache only validated output in the daily snapshot. A timeout, invalid JSON or unknown citation leaves the algorithm briefing visible with a retry action.

- [ ] **Step 5: Recompose 今日速报 as a newspaper view**

The `today` route reads the same `BriefingSnapshot` and renders masthead/date, lead story, public and personal columns, domain sections, opportunity/risk box, and numbered source list. It must not run a second scoring pass or mutate the snapshot.

- [ ] **Step 6: Add responsive styles**

Use a single-column briefing at widths below 860px, a two-lane grid above 860px, visible focus states, and existing CSS variables. Keep the current dark/light theme contract.

- [ ] **Step 7: Build and manually inspect**

Run: `npm run build`

Expected: Vite build succeeds and `dist/` is produced. Run `npm run dev`, open `http://localhost:5175`, and verify the default page is AI 情报 with both lanes visible even without LLM configuration. Verify 今日速报 uses the newspaper layout and the same item order.

- [ ] **Step 8: Commit**

```bash
git add src/components/AiBriefingHome.jsx src/App.jsx src/styles.css api/ai-generate.js server/news/plugin.js
git commit -m "feat: make AI daily briefing the default home"
```

### Task 8: Add the recommendation calendar and timeline

**Files:**
- Create: `src/components/RecommendationTimeline.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add a dedicated `recommendations` navigation item**

Keep `today` as the newspaper page. Route `recommendations` to the new component with snapshot dates, selected date, selected snapshot, and feedback callbacks.

- [ ] **Step 2: Implement timeline rendering**

Render a month calendar, lane labels, original generation event, appended updates, recommendation reason chips, and a collapsible score-parts table. Missing dates show an explicit empty state and never synthesize fake history.

- [ ] **Step 3: Persist feedback separately from snapshots**

Feedback may influence future snapshots but must not mutate stored `recommendationItems`. Store `{ itemId, action, at }` in `recommendationFeedback:v2`.

- [ ] **Step 4: Verify and commit**

Run: `npm run test`

Expected: all domain tests pass.

Run: `npm run build`

Expected: build succeeds.

```bash
git add src/components/RecommendationTimeline.jsx src/App.jsx src/styles.css
git commit -m "feat: add immutable recommendation calendar timeline"
```

### Task 9: Give AI chat structured, cited intelligence context

**Files:**
- Modify: `src/components/AiChatPanel.jsx`
- Modify: `src/components/AiBriefingHome.jsx`
- Modify: `src/App.jsx:8531-8555`
- Modify: `api/ai-generate.js`
- Modify: `server/news/plugin.js`

- [ ] **Step 1: Pass a bounded evidence payload**

Add `intelligenceContext={{ date, briefing, items: [...lanes.public, ...lanes.personal].slice(0, 12) }}`. Build the system prompt from IDs, titles, sources and summaries; cap each summary at 600 characters.

- [ ] **Step 2: Support embedded and drawer conversation variants**

Add `variant="embedded"|"drawer"` to `AiChatPanel`. Embedded mode removes resize/close chrome, fills the AI home conversation region, and keeps session list, multi-turn messages, model selector, input and quick actions. Drawer mode preserves existing behavior on professional workspaces. `AiBriefingHome` renders embedded mode so the main page is a real Agent-style conversation surface.

- [ ] **Step 3: Require citation syntax**

For intelligence questions, instruct the model to cite `[资讯:n1]`. After response, extract cited IDs and mark nonexistent IDs as invalid instead of presenting them as verified sources.

- [ ] **Step 4: Preserve multi-turn messages and errors**

Keep the last 20 messages, existing session behavior, and explicit algorithm-only operation when no model is configured.

- [ ] **Step 5: Verify and commit**

Run: `npm run test && npm run build`

Expected: tests and build pass.

```bash
git add src/components/AiChatPanel.jsx src/components/AiBriefingHome.jsx src/App.jsx api/ai-generate.js server/news/plugin.js
git commit -m "feat: ground AI chat in cited daily intelligence"
```

### Task 10: Cluster duplicate events in 全部动态

**Files:**
- Modify: `src/domain/intelligence/recommendationEngine.js`
- Modify: `src/domain/intelligence/__tests__/recommendationEngine.test.js`
- Create: `src/components/AllDynamicsFeed.jsx`
- Modify: `src/App.jsx:6744-6810`
- Modify: `src/styles.css`

- [ ] **Step 1: Add failing event-cluster tests**

```js
import { clusterEvents } from '../recommendationEngine.js';

it('clusters close paraphrases from independent sources', () => {
  const items = [
    { id: 'a', source: 'Lab A', title: 'OpenAI releases a new agent platform today', publishedAt: '2026-07-14T01:00:00Z' },
    { id: 'b', source: 'News B', title: 'OpenAI releases new Agent platform', publishedAt: '2026-07-14T02:00:00Z' },
    { id: 'c', source: 'News C', title: 'A separate chip fabrication story', publishedAt: '2026-07-14T02:00:00Z' },
  ];
  const clusters = clusterEvents(items);
  expect(clusters).toHaveLength(2);
  expect(clusters.find(cluster => cluster.itemIds.includes('a')).independentSourceCount).toBe(2);
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/intelligence/__tests__/recommendationEngine.test.js`

Expected: FAIL because `clusterEvents` is missing.

- [ ] **Step 3: Implement deterministic bounded clustering**

Normalize titles with Unicode lowercasing, punctuation removal and stop-word removal. Use canonical URL equality first; otherwise cluster only items within 48 hours whose title token Jaccard similarity is at least 0.72. Each result contains `id`, `primaryItem`, `items`, `itemIds`, `independentSources`, and `independentSourceCount`. Limit comparison to the latest 500 items to keep worst-case work bounded.

- [ ] **Step 4: Render one primary card with expandable source evidence**

`AllDynamicsFeed` receives clusters and existing card callbacks. A single-item cluster renders normally. A multi-item cluster shows “N 个独立来源”, expands alternate titles/sources, and preserves each original link. Search/filtering happens before clustering so hidden categories never leak through an expanded cluster.

- [ ] **Step 5: Feed cluster corroboration into scoring**

Build an item-to-cluster lookup and pass `independentSourceCount` into `buildRecommendation`. Do not count duplicate rows from the same source twice.

- [ ] **Step 6: Verify and commit**

Run: `npm run test && npm run build`

Expected: tests and build pass.

```bash
git add src/domain/intelligence/recommendationEngine.js src/domain/intelligence/__tests__/recommendationEngine.test.js src/components/AllDynamicsFeed.jsx src/App.jsx src/styles.css
git commit -m "feat: group duplicate events across news sources"
```

## Plan 1 completion gate

- `home` is the default route.
- Public and personal lanes are independently scored and balanced.
- Three-tier profile weights drive new recommendations.
- Model-free briefing works.
- Daily snapshots are immutable and visible in a timeline.
- AI chat only cites supplied item IDs.
- 全部动态 groups duplicate events and exposes independent sources.
- `npm run test` and `npm run build` pass.
