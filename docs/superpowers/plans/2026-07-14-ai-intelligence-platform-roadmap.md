# AI Intelligence Platform Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved AI intelligence platform through five independently testable plans while preserving existing user work and proving all seven product requirements.

**Architecture:** The deterministic intelligence core is implemented first because every other subsystem consumes its profile, recommendation and citation contracts. PostgreSQL/community, stock and creative plans then proceed on stable interfaces; the acceptance plan runs last and is the only authority for final completion.

**Tech Stack:** React 19, Vite 8, Vitest, PostgreSQL 15, Node.js crypto, klinecharts, Playwright

---

## Execution order

- [ ] **Phase 1: Core intelligence and AI home**

Execute [2026-07-14-01-core-intelligence-ai-home.md](./2026-07-14-01-core-intelligence-ai-home.md). This establishes three-tier profiles, public/personal scoring, immutable snapshots, the default AI briefing hub and recommendation timeline.

Gate: all Plan 1 tests and build pass before database work consumes the contracts.

- [ ] **Phase 2: PostgreSQL authentication and community**

Execute [2026-07-14-02-postgres-auth-community.md](./2026-07-14-02-postgres-auth-community.md). This replaces volatile auth and seeded community state, then persists signed-in profiles and snapshots.

Gate: two real accounts share and interact with one persisted post; credentials are absent from localStorage.

- [ ] **Phase 3: Stock analysis fallback and production parity**

Execute [2026-07-14-03-stock-analysis-fallback.md](./2026-07-14-03-stock-analysis-fallback.md). This can run after Phase 1 and in parallel with Phase 2 only when the user explicitly authorizes parallel agents.

Gate: quotes/K-lines work through dev and production adapters; algorithm analysis survives missing or failed AI.

- [ ] **Phase 4: Creative asset workspace**

Execute [2026-07-14-04-creative-asset-workspace.md](./2026-07-14-04-creative-asset-workspace.md). Local asset lineage/version/export work can follow Phase 1; authenticated synchronization waits for Phase 2.

Gate: every export retains citations and every restore creates a new immutable version.

- [ ] **Phase 5: Platform integration and acceptance**

Execute [2026-07-14-05-platform-integration-acceptance.md](./2026-07-14-05-platform-integration-acceptance.md) only after the first four phase gates pass.

Gate: requirement-by-requirement acceptance evidence is recorded; all configured unit, integration, E2E and build commands pass.

## Requirement coverage

| Requirement | Primary implementation | Authoritative final evidence |
|---|---|---|
| AI 简报中枢 | Plan 1 Tasks 5, 7, 9 | Plan 5 Task 4 |
| 今日速报 | Plan 1 Tasks 3–7 | Plan 5 Task 4 |
| 精准推荐日历/时间线 | Plan 1 Tasks 6 and 8; Plan 2 Task 8 | Plan 5 Tasks 2 and 4 |
| 全部动态 | Plan 1 Task 10 | Plan 5 Tasks 3 and 4 |
| 股市动向 | Plan 3 | Plan 5 Task 5 |
| 智创空间 | Plan 4 | Plan 5 Tasks 2 and 6 |
| 用户广场 | Plan 2 Tasks 2–7 | Plan 5 Tasks 2 and 7 |
| 个人画像三级制 | Plan 1 Tasks 1–2; Plan 2 Task 8 | Plan 5 Tasks 2 and 7 |
| AI/算法降级 | Plan 1 Task 5; Plan 3 Tasks 2–4 | Plan 5 Tasks 4, 5 and 8 |
| 安全与对抗性约束 | Plans 1–4 focused tests | Plan 5 Task 8 |

## Worktree and commit discipline

- Preserve existing unrelated modifications in `.omc/project-memory.json` and `CLAUDE.md`.
- Before execution, use the selected execution skill's worktree guidance; do not rewrite or reset the user's branch.
- Each task commits only the files listed in that task.
- A failing phase gate stops dependent work until corrected.
- Do not mark the active project goal complete until Plan 5's acceptance report proves every row above.
