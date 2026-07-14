# Stock Analysis Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make stock quotes and K-lines available in development and production, and provide deterministic technical analysis whenever no LLM is configured or the LLM fails.

**Architecture:** Existing quote adapters remain the data boundary. A pure indicator module derives moving averages, volatility, support, resistance, volume trend and risk; a deterministic analyzer converts metrics to labeled evidence. LLM analysis receives the same metrics and can improve prose, but the UI always retains the algorithm result.

**Tech Stack:** JavaScript ES modules, klinecharts, Eastern Fortune/Tencent adapters, Vite/Vercel APIs, Vitest

---

## File map

- Create `src/domain/stock/indicators.js`, `src/domain/stock/algorithmAnalysis.js` and tests.
- Modify `src/hooks/useStockAi.js`: always compute algorithm result; optional AI enhancement.
- Modify `src/components/StockPage.jsx`: analysis mode, evidence, stale/error UI.
- Create `api/stock/[action].js`: production parity for stock endpoints.
- Modify `server/news/services/stockService.js`: normalized adapter errors and stale metadata.
- Modify `src/styles.css`.

### Task 1: Implement pure technical indicators

**Files:**
- Create: `src/domain/stock/indicators.js`
- Create: `src/domain/stock/__tests__/indicators.test.js`

- [ ] **Step 1: Write failing indicator tests**

```js
import { expect, it } from 'vitest';
import { simpleMovingAverage, annualizedVolatility, supportResistance, volumeTrend } from '../indicators.js';

const bars = [
  { close: 10, low: 9, high: 11, volume: 100 },
  { close: 11, low: 10, high: 12, volume: 110 },
  { close: 12, low: 11, high: 13, volume: 130 },
  { close: 13, low: 12, high: 14, volume: 180 },
  { close: 14, low: 13, high: 15, volume: 260 },
];

it('calculates deterministic price and risk metrics', () => {
  expect(simpleMovingAverage(bars, 5)).toBe(12);
  expect(supportResistance(bars, 5)).toEqual({ support: 9, resistance: 15 });
  expect(volumeTrend(bars, 3)).toBe('expanding');
  expect(annualizedVolatility(bars)).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/stock/__tests__/indicators.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement finite-value-safe indicators**

```js
const finite = value => Number.isFinite(Number(value));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

export function simpleMovingAverage(bars = [], period = 5) {
  const closes = bars.slice(-period).map(bar => Number(bar.close)).filter(finite);
  return closes.length === period ? mean(closes) : null;
}

export function annualizedVolatility(bars = [], periods = 252) {
  const closes = bars.map(bar => Number(bar.close)).filter(value => finite(value) && value > 0);
  const returns = closes.slice(1).map((value, i) => Math.log(value / closes[i]));
  if (returns.length < 2) return null;
  const avg = mean(returns);
  const variance = returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance * periods) * 100;
}

export function supportResistance(bars = [], lookback = 20) {
  const range = bars.slice(-lookback);
  const lows = range.map(bar => Number(bar.low)).filter(finite);
  const highs = range.map(bar => Number(bar.high)).filter(finite);
  return { support: lows.length ? Math.min(...lows) : null, resistance: highs.length ? Math.max(...highs) : null };
}

export function volumeTrend(bars = [], period = 5) {
  const values = bars.slice(-period).map(bar => Number(bar.volume)).filter(finite);
  if (values.length < 3) return 'insufficient';
  const first = mean(values.slice(0, Math.floor(values.length / 2)));
  const last = mean(values.slice(Math.ceil(values.length / 2)));
  if (last > first * 1.2) return 'expanding';
  if (last < first * 0.8) return 'contracting';
  return 'stable';
}
```

- [ ] **Step 4: Add MA5/10/20, momentum and data-quality tests**

Assert null instead of NaN for insufficient/invalid bars and that input arrays are never mutated.

- [ ] **Step 5: Run tests and commit**

Run: `npx vitest run src/domain/stock/__tests__/indicators.test.js`

Expected: PASS.

```bash
git add src/domain/stock
git commit -m "feat: add deterministic stock indicators"
```

### Task 2: Build the model-free stock analyzer

**Files:**
- Create: `src/domain/stock/algorithmAnalysis.js`
- Create: `src/domain/stock/__tests__/algorithmAnalysis.test.js`

- [ ] **Step 1: Write failing trend/risk tests**

```js
import { expect, it } from 'vitest';
import { analyzeStock } from '../algorithmAnalysis.js';

it('classifies a rising sequence with evidence', () => {
  const klines = Array.from({ length: 30 }, (_, i) => ({ close: 100 + i, open: 99 + i, high: 101 + i, low: 98 + i, volume: 1000 + i * 50 }));
  const result = analyzeStock({ stock: { name: '示例', code: 'TEST' }, realtime: { price: 129, changePct: 1.2 }, klines });
  expect(result.mode).toBe('algorithm');
  expect(result.rating).toBe('强势');
  expect(result.evidence.some(item => item.key === 'maAlignment')).toBe(true);
  expect(result.disclaimer).toContain('不构成投资建议');
});

it('refuses to manufacture analysis from missing bars', () => {
  expect(analyzeStock({ stock: {}, realtime: null, klines: [] }).status).toBe('insufficient_data');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx vitest run src/domain/stock/__tests__/algorithmAnalysis.test.js`

Expected: FAIL with missing module.

- [ ] **Step 3: Implement evidence-based classification**

Compute MA5/10/20, 20-bar support/resistance, annualized volatility, volume trend and 5-bar momentum. Rating rules:

- `强势`: `MA5 > MA10 > MA20` and price above MA5.
- `弱势`: `MA5 < MA10 < MA20` and price below MA5.
- `超卖`: price is within 2% of support and 5-bar momentum is below -5%.
- otherwise `震荡`.

Risk is `high` for volatility above 60%, `medium` above 30%, otherwise `low`. Return structured metrics, evidence, a template summary, `mode: 'algorithm'`, timestamp, and disclaimer.

- [ ] **Step 4: Add boundary tests and commit**

Run: `npx vitest run src/domain/stock/__tests__/algorithmAnalysis.test.js`

Expected: PASS for exact boundary cases and insufficient data.

```bash
git add src/domain/stock/algorithmAnalysis.js src/domain/stock/__tests__/algorithmAnalysis.test.js
git commit -m "feat: add model-free stock analysis"
```

### Task 3: Make algorithm analysis the primary stable result

**Files:**
- Modify: `src/hooks/useStockAi.js`
- Create: `src/hooks/__tests__/stockAnalysisController.test.js`

- [ ] **Step 1: Extract a testable analysis controller**

Create `runStockAnalysis({ input, llmConfig, callLlm })`: always call `analyzeStock(input)` first. If LLM is unavailable, return the algorithm result. If LLM succeeds, return `{ ...algorithm, mode: 'ai', aiNarrative, algorithm }`. If it throws, return `{ ...algorithm, aiError }`.

- [ ] **Step 2: Write three path tests**

Test no configuration, successful AI enhancement, and LLM rejection. The rejection path must preserve rating, metrics and disclaimer.

- [ ] **Step 3: Update `useStockAi`**

Expose `analysis` instead of making `diagnosis` conditional on `llmReady`. Rename UI-facing loading to `analyzing`; keep backward-compatible aliases during the component transition in this commit only.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run src/domain/stock src/hooks/__tests__/stockAnalysisController.test.js`

Expected: PASS.

```bash
git add src/hooks/useStockAi.js src/hooks/__tests__/stockAnalysisController.test.js src/domain/stock
git commit -m "feat: fall back from stock AI to algorithm analysis"
```

### Task 4: Show evidence, data freshness and analysis mode in StockPage

**Files:**
- Modify: `src/components/StockPage.jsx:500-590`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the configuration gate**

The analysis card is always enabled when sufficient K-line data exists. Label results `AI 增强分析` or `算法分析`; show an optional “配置 AI 以获得自然语言解读” action without hiding the algorithm result.

- [ ] **Step 2: Render metrics and evidence**

Show MA5/10/20, volatility, support, resistance, volume trend, rating and risk. Never render `NaN`; unavailable values display `--`.

- [ ] **Step 3: Add stale and source states**

Display `source`, `updatedAt`, and `stale`. When fresh fetch fails but cached data exists, show “缓存行情”; when no data exists, disable analysis and explain why.

- [ ] **Step 4: Build and manually verify both modes**

Run: `npm run build`

Expected: build succeeds. Verify once with empty LLM configuration and once with a valid configuration; the same algorithm metrics remain visible in both.

- [ ] **Step 5: Commit**

```bash
git add src/components/StockPage.jsx src/styles.css
git commit -m "feat: display transparent stock analysis evidence"
```

### Task 5: Normalize stock service errors and cached metadata

**Files:**
- Modify: `server/news/services/stockService.js`
- Create: `server/news/services/__tests__/stockService.test.js`

- [ ] **Step 1: Test primary/secondary/cache behavior with mocked fetch**

Assert Eastern Fortune success returns `source: 'eastmoney'`; primary failure plus Tencent success returns `source: 'tencent'`; both failures with cache return `stale: true`; both failures without cache return `{ ok: false, error: { code: 'MARKET_DATA_UNAVAILABLE' } }`.

- [ ] **Step 2: Return one normalized envelope**

All service methods return `{ ok, data, source, updatedAt, stale, error? }`. Preserve existing parsers and cache TTLs; do not catch errors into ambiguous empty arrays.

- [ ] **Step 3: Update development route responses and frontend parsing**

Adapt `server/news/plugin.js` and `StockPage.jsx` once to the normalized envelope.

- [ ] **Step 4: Run tests and commit**

Run: `npx vitest run server/news/services/__tests__/stockService.test.js`

Expected: PASS.

```bash
git add server/news/services/stockService.js server/news/services/__tests__/stockService.test.js server/news/plugin.js src/components/StockPage.jsx
git commit -m "refactor: normalize market data fallbacks"
```

### Task 6: Add production stock API parity

**Files:**
- Create: `api/stock/[action].js`
- Create: `api/stock/__tests__/stockApi.test.js`

- [ ] **Step 1: Write route validation tests**

Test `dashboard`, `realtime`, `kline`, `search`, `timeline`, and `sectors`. Invalid action returns 404, invalid code/period/count returns 400, upstream outage returns 503 only when no cache exists.

- [ ] **Step 2: Implement the serverless adapter**

Import the shared `stockService` functions. Whitelist periods `1,5,15,30,60,101,102,103`; clamp K-line count to 20–500; clamp search keyword to 40 characters.

- [ ] **Step 3: Verify production-shaped paths**

Run: `npx vitest run api/stock/__tests__/stockApi.test.js`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add api/stock
git commit -m "feat: expose stock data in production"
```

## Plan 3 completion gate

- Stock data works through dev and production route adapters.
- Algorithm analysis works without LLM configuration.
- LLM failure preserves deterministic metrics and rating.
- Missing data never produces a fabricated analysis.
- Source, freshness and stale state are visible.
- Compliance disclaimer is visible in both modes.
- Stock tests and `npm run build` pass.
