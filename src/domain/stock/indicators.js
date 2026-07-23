const finite = value => value !== null && value !== '' && Number.isFinite(Number(value));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function numericValues(bars, field, period) {
  return bars.slice(-period).map(bar => Number(bar?.[field])).filter(finite);
}

export function simpleMovingAverage(bars = [], period = 5) {
  const values = numericValues(bars, 'close', period);
  return values.length === period ? mean(values) : null;
}

export function annualizedVolatility(bars = [], periods = 252) {
  const closes = bars.map(bar => Number(bar?.close)).filter(value => finite(value) && value > 0);
  const returns = closes.slice(1).map((value, index) => Math.log(value / closes[index]));
  if (returns.length < 2) return null;
  const average = mean(returns);
  const variance = returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance * periods) * 100;
}

export function supportResistance(bars = [], lookback = 20) {
  const lows = numericValues(bars, 'low', lookback);
  const highs = numericValues(bars, 'high', lookback);
  return {
    support: lows.length ? Math.min(...lows) : null,
    resistance: highs.length ? Math.max(...highs) : null,
  };
}

export function volumeTrend(bars = [], period = 5) {
  const values = numericValues(bars, 'volume', period);
  if (values.length < 3) return 'insufficient';
  const midpoint = Math.floor(values.length / 2);
  const first = mean(values.slice(0, midpoint));
  const last = mean(values.slice(values.length - midpoint));
  if (last > first * 1.2) return 'expanding';
  if (last < first * 0.8) return 'contracting';
  return 'stable';
}

export function priceMomentum(bars = [], period = 5) {
  const closes = numericValues(bars, 'close', period + 1);
  if (closes.length < period + 1 || closes[0] <= 0) return null;
  return ((closes.at(-1) / closes[0]) - 1) * 100;
}

export function averageTrueRange(bars = [], period = 14) {
  if (bars.length < period + 1) return null;
  const ranges = bars.slice(-(period + 1)).map((bar, index, list) => {
    if (index === 0) return null;
    const high = Number(bar?.high);
    const low = Number(bar?.low);
    const previousClose = Number(list[index - 1]?.close);
    if (![high, low, previousClose].every(finite)) return null;
    return Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  }).filter(finite);
  return ranges.length === period ? mean(ranges) : null;
}

export function maxDrawdown(bars = []) {
  const closes = bars.map(bar => Number(bar?.close)).filter(value => finite(value) && value > 0);
  if (closes.length < 2) return null;
  let peak = closes[0];
  let drawdown = 0;
  closes.forEach(close => {
    peak = Math.max(peak, close);
    drawdown = Math.min(drawdown, (close / peak - 1) * 100);
  });
  return Math.abs(drawdown);
}

export function pricePosition(bars = [], lookback = 20) {
  const closes = numericValues(bars, 'close', lookback);
  if (closes.length < lookback) return null;
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  return high === low ? 50 : ((closes.at(-1) - low) / (high - low)) * 100;
}

export function relativePerformance(bars = [], benchmarkBars = [], period = 20) {
  const assetReturn = priceMomentum(bars, period);
  const benchmarkReturn = priceMomentum(benchmarkBars, period);
  if (assetReturn == null || benchmarkReturn == null) return null;
  return {
    assetReturn,
    benchmarkReturn,
    excessReturn: assetReturn - benchmarkReturn,
  };
}
