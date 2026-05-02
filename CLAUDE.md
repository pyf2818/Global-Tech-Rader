# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                              # Install dependencies
node node_modules/vite/bin/vite.js       # Start dev server (0.0.0.0:5173)
node node_modules/vite/bin/vite.js build # Production build
node node_modules/vite/bin/vite.js preview # Preview production build
```

Or use npx: `npx vite build`

## Architecture

**Tech Stack**: React + Vite + Tailwind CSS

**Data Flow**: Vite middleware (`server/newsPlugin.js`) proxies RSS/Atom feeds via `/api/*` endpoints. Frontend uses native `fetch` to call these APIs.

**API Endpoints** (exposed by Vite dev server):
- `GET /api/news` — Aggregated news feed
- `GET /api/news?blocked=word1,word2` — Filtered by blocklist
- `GET /api/meta` — Categories, modes, sources metadata

**Source Files**:
- `src/main.jsx` — Entry point
- `src/App.jsx` — Main React component
- `server/newsPlugin.js` — RSS/Atom fetch and aggregation logic

## Features

Current implementation:
- RSS/Atom feed aggregation (The Verge, TechCrunch, MIT News AI, GitHub Blog, Google AI Blog, OpenAI News, Solidot, Cnblogs, ArXiv CS AI)
- News categories: AI, 大模型, 芯片, 开源, 科研, 政策, 投融资, 硬件, 云计算
- Content modes: 实时快讯, 深度解读, 技术干货
- Source origin labels: 国内源, 海外源, 全球源
- Dark/light theme toggle
- Blocklist filtering

## Roadmap Priorities

See `.monkeycode/specs/ROADMAP.md` for feature pipeline:
- P0: 每日/每周简报, 公司/技术追踪, 趋势分析看板
- P1: 跨语言对照, 阅读统计, 智能推荐
- P2: 团队共享, 知识导出, PWA离线模式

Each feature has requirements/design specs in `.monkeycode/specs/<feature-name>/`.