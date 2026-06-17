/**
 * App.jsx refactoring script
 * Removes inline definitions and adds imports from extracted modules.
 * Run: node scripts/refactor-app.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve('src/App.jsx');
let lines = readFileSync(appPath, 'utf8').split('\n');
const origLen = lines.length;
console.log('Starting with', origLen, 'lines');

// Helper: find end of a function block by counting braces
function findFuncEnd(lines, startIdx) {
  let depth = 0, started = false;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth === 0) return i;
  }
  return -1;
}

// Verify key boundaries before cutting
function verify(label, lineIdx, expected) {
  const actual = lines[lineIdx].trim().substring(0, 40);
  if (!actual.startsWith(expected)) {
    console.error(`VERIFY FAILED: ${label} at L${lineIdx+1}: expected "${expected}" got "${actual}"`);
    process.exit(1);
  }
}

verify('MOTIVATIONAL_QUOTES', 4, 'const MOTIVATIONAL_QUOTES');
verify('ICONS start', 343, 'const ICONS = {');
verify('ICONS end', 433, '};');
verify('loadLS', 435, 'function loadLS(');
verify('function App', 469, 'function App()');
verify('SkeletonCard', 7899, 'function SkeletonCard(');
verify('NewsItem', 7916, 'function NewsItem(');
verify('HexRadarChart', 8086, 'function HexRadarChart(');
verify('TrendLineChart', 8177, 'function TrendLineChart(');
verify('GithubRepoCard', 8264, 'function GithubRepoCard(');
verify('formatTime', 8323, 'function formatTime(');
verify('export default', 8341, 'export default App;');

// Build removal ranges [startIdx, endIdx] inclusive
// For function blocks, use findFuncEnd; for const blocks use known end lines
const removals = [
  // formatTime (L8324-8340)
  [8323, findFuncEnd(lines, 8264 + 58)], // after GithubRepoCard
  // Actually let me be precise for each
];

// Let me redo this more carefully
const blocks = [];

// 1. Constants: MOTIVATIONAL_QUOTES through ICONS (lines 5-434, idx 4-433)
//    Also remove blank line before (idx 3)
blocks.push([3, 433]);

// 2. Utils: loadLS through clearStaleLS (lines 436-468, idx 435-467)
blocks.push([435, 467]);

// 3. renderMarkdown (line 1877, idx 1876)
const rmEnd = findFuncEnd(lines, 1876);
blocks.push([1876, rmEnd]);
console.log('renderMarkdown: L1877-L' + (rmEnd + 1));

// 4. renderMarkdownWithImages (line 1955, idx 1954)
const rmiEnd = findFuncEnd(lines, 1954);
blocks.push([1954, rmiEnd]);
console.log('renderMarkdownWithImages: L1955-L' + (rmiEnd + 1));

// 5. renderBriefMarkdown (line 2528, idx 2527)
// Need to re-find after potential shift? No, we haven't cut yet
const rbrEnd = findFuncEnd(lines, 2527);
blocks.push([2527, rbrEnd]);
console.log('renderBriefMarkdown: L2528-L' + (rbrEnd + 1));

// 6. renderInline (line 2568, idx 2567)
const riEnd = findFuncEnd(lines, 2567);
blocks.push([2567, riEnd]);
console.log('renderInline: L2568-L' + (riEnd + 1));

// 7. SkeletonCard (line 7900, idx 7899)
const scEnd = findFuncEnd(lines, 7899);
blocks.push([7899, scEnd]);
console.log('SkeletonCard: L7900-L' + (scEnd + 1));

// 8. NewsItem (line 7917, idx 7916)
const niEnd = findFuncEnd(lines, 7916);
blocks.push([7916, niEnd]);
console.log('NewsItem: L7917-L' + (niEnd + 1));

// 9. HexRadarChart (line 8087, idx 8086)
const hrEnd = findFuncEnd(lines, 8086);
blocks.push([8086, hrEnd]);
console.log('HexRadarChart: L8087-L' + (hrEnd + 1));

// 10. TrendLineChart (line 8178, idx 8177)
const tlEnd = findFuncEnd(lines, 8177);
blocks.push([8177, tlEnd]);
console.log('TrendLineChart: L8178-L' + (tlEnd + 1));

// 11. GithubRepoCard (line 8265, idx 8264)
const ghEnd = findFuncEnd(lines, 8264);
blocks.push([8264, ghEnd]);
console.log('GithubRepoCard: L8265-L' + (ghEnd + 1));

// 12. formatTime/formatRelative/formatStars (line 8324, idx 8323)
const ftEnd = findFuncEnd(lines, 8323);
blocks.push([8323, ftEnd]);
console.log('formatTime/formatRelative/formatStars: L8324-L' + (ftEnd + 1));

// Sort by start descending (remove bottom-up)
blocks.sort((a, b) => b[0] - a[0]);

// Verify no overlaps
for (let i = 0; i < blocks.length - 1; i++) {
  if (blocks[i][0] <= blocks[i + 1][1]) {
    console.error('OVERLAP:', blocks[i], blocks[i + 1]);
    process.exit(1);
  }
}

// Remove blocks bottom-up
let totalRemoved = 0;
for (const [start, end] of blocks) {
  const count = end - start + 1;
  lines.splice(start, count);
  totalRemoved += count;
}
console.log('Removed', totalRemoved, 'lines from', blocks.length, 'blocks');

// Add imports after line with "import AiElf from './AiElf.jsx';"
const importLine = lines.findIndex(l => l.includes("import AiElf"));
if (importLine === -1) {
  console.error('Could not find AiElf import line');
  process.exit(1);
}

const newImports = [
  '',
  '// ====== Extracted modules (Phase 1 refactor) ======',
  "import { loadLS, saveLS, clearStaleLS } from './utils/localStorage.js';",
  "import { formatTime, formatRelative, formatStars } from './utils/format.js';",
  "import { showToast } from './utils/toast.js';",
  "import { renderMarkdown, renderMarkdownWithImages, renderBriefMarkdown, renderInline } from './utils/markdown.js';",
  "import { ICONS, MOTIVATIONAL_QUOTES, NAV_ITEMS, NAV_GROUPS, CATEGORIES, CATEGORY_GROUPS, VERTICAL_CHANNELS, LLM_PRESETS, DEFAULT_AGENTS, AGENT_CATEGORIES, SCROLLING_NEWS_ITEMS, MODES, VIEW_MODES, TRENDING_TYPES, GITHUB_LANGS, GITHUB_PERIODS, REGION_MAP, MODE_MAP, MATERIAL_TYPES, ARTICLE_STATUS, ARTICLE_TEMPLATES, ARTICLE_TEMPLATE_CONTENT, WEEKDAYS, MONTHS } from './constants/index.js';",
  "import NewsItem from './components/NewsItem.jsx';",
  "import SkeletonCard from './components/SkeletonCard.jsx';",
  "import HexRadarChart from './components/HexRadarChart.jsx';",
  "import TrendLineChart from './components/TrendLineChart.jsx';",
  "import GithubRepoCard from './components/GithubRepoCard.jsx';",
  '',
];

lines.splice(importLine + 1, 0, ...newImports);

const result = lines.join('\n');
writeFileSync(appPath, result);
console.log('Done! App.jsx: ' + origLen + ' -> ' + lines.length + ' lines (saved ' + (origLen - lines.length) + ' lines)');
