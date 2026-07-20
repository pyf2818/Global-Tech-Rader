// Re-export from modularized source
// All logic has been extracted to server/news/ modules:
//   - news/config/constants.js    — Configuration constants
//   - news/config/sourceGrades.js — Source grade utilities
//   - news/utils/textProcessing.js — Text processing helpers
//   - news/utils/httpUtils.js     — HTTP utilities & SSRF protection
//   - news/images/imageProcessing.js — Image extraction & scoring
//   - news/images/imageResolver.js  — Image resolution & validation
//   - news/parsing/feedParser.js   — RSS/Atom feed parsing
//   - news/services/newsService.js — News aggregation service
//   - news/services/trendingService.js — Trending & GitHub services
//   - news/services/externalFetchers.js — Source fetching
//   - news/plugin.js              — Vite plugin (route middleware)
// Auth/community/profile routes in plugin.js delegate to server/http/*Handlers.js
// (see server/auth, server/community, server/profile, server/db).
// news/auth/userAuth.js is a dead legacy copy - do not use.

export { newsPlugin } from './news/plugin.js';
