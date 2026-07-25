import { expect, test } from '@playwright/test';
import { installExternalFixtures } from './fixtures.js';

const quote = {
  code: '600519',
  secid: '1.600519',
  name: '贵州茅台',
  price: 1688.8,
  change: 20.1,
  changePct: 1.2,
  open: 1660,
  high: 1699,
  low: 1655,
  prevClose: 1668.7,
  volume: 120000,
  amount: 202656000,
  bids: [{ price: 1688.7, volume: 100 }],
  asks: [{ price: 1688.9, volume: 120 }],
  timestamp: '2026-07-14T12:30:00Z',
  dataSource: 'fixture',
};

const risingKlines = Array.from({ length: 120 }, (_, index) => ({
  date: `2026-07-${String(1 + (index % 28)).padStart(2, '0')}`,
  open: 1500 + index,
  close: 1502 + index,
  high: 1506 + index,
  low: 1498 + index,
  volume: 100000 + index * 1200,
}));

async function openStock(page, { realtimePayload = quote, klines = risingKlines } = {}) {
  await installExternalFixtures(page);
  await page.unroute('**/api/stock/realtime**');
  await page.unroute('**/api/stock/kline**');
  await page.route('**/api/stock/realtime**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(realtimePayload),
  }));
  await page.route('**/api/stock/kline**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ code: '600519', name: '贵州茅台', klines }),
  }));
  await page.goto('/');
  await page.getByText('股市', { exact: true }).click();
  return page.locator('main[data-nav="stock"]');
}

test('runs algorithm stock analysis without LLM configuration', async ({ page }) => {
  const stockPage = await openStock(page);
  await expect(stockPage).toContainText(/贵州茅台|600519/);
  await page.getByRole('button', { name: /生成算法分析|算法分析/ }).first().click();
  await expect(stockPage).toContainText(/算法|MA5|支撑|压力/);
  await expect(stockPage).toContainText(/风险|仅供参考/);
});

test('shows stale cache market data state with timestamp', async ({ page }) => {
  const stockPage = await openStock(page, {
    realtimePayload: {
      ok: true,
      stale: true,
      source: 'cache',
      timestamp: '2026-07-14T12:30:00Z',
      data: { ...quote, dataSource: 'cache' },
    },
  });
  await expect(stockPage).toContainText('缓存行情');
  await expect(stockPage).toContainText(/2026\/7\/14|12:30/);
});

test('disables analysis when market data is unavailable', async ({ page }) => {
  const stockPage = await openStock(page, {
    realtimePayload: {
      ok: false,
      error: { code: 'MARKET_DATA_UNAVAILABLE' },
      timestamp: '2026-07-14T12:30:00Z',
    },
  });
  await expect(stockPage).toContainText('行情数据暂不可用');
  await expect(stockPage.getByRole('button', { name: /生成算法分析|算法分析/ })).toBeDisabled();
  await expect(stockPage).not.toContainText('综合评级');
});
