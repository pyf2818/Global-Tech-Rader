// Re-export from modularized source
// All logic has been extracted to server/news/ modules:
//   - news/config/constants.js    — Configuration constants
//   - news/config/sourceGrades.js — Source grade utilities
//   - news/utils/textProcessing.js — Text processing helpers
//   - news/utils/httpUtils.js     — HTTP utilities & SSRF protection
//   - news/images/imageProcessing.js — Image extraction & scoring
//   - news/images/imageResolver.js  — Image resolution & validation
//   - news/parsing/feedParser.js   — RSS/Atom feed parsing
//   - news/auth/userAuth.js        — User authentication
//   - news/services/newsService.js — News aggregation service
//   - news/services/trendingService.js — Trending & GitHub services
//   - news/services/externalFetchers.js — Source fetching
//   - news/plugin.js              — Vite plugin (route middleware)

export { newsPlugin } from './news/plugin.js';
