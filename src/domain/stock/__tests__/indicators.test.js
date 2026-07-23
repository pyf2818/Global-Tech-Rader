import { expect, it } from 'vitest';
import { annualizedVolatility, averageTrueRange, maxDrawdown, pricePosition, relativePerformance, simpleMovingAverage, supportResistance, volumeTrend } from '../indicators.js';

const bars = [
  { close: 10, low: 9, high: 11, volume: 100 },
  { close: 11, low: 10, high: 12, volume: 110 },
  { close: 12, low: 11, high: 13, volume: 130 },
  { close: 13, low: 12, high: 14, volume: 180 },
  { close: 14, low: 13, high: 15, volume: 260 },
];

it('calculates finite deterministic indicators without mutating input', () => {
  const original = structuredClone(bars);
  expect(simpleMovingAverage(bars, 5)).toBe(12);
  expect(supportResistance(bars, 5)).toEqual({ support: 9, resistance: 15 });
  expect(volumeTrend(bars, 3)).toBe('expanding');
  expect(annualizedVolatility(bars)).toBeGreaterThan(0);
  expect(averageTrueRange(bars, 3)).toBeGreaterThan(0);
  expect(maxDrawdown(bars)).toBe(0);
  expect(pricePosition(bars, 5)).toBe(100);
  expect(bars).toEqual(original);
});

it('measures drawdown from the prior peak', () => {
  expect(maxDrawdown([{ close: 100 }, { close: 120 }, { close: 90 }, { close: 96 }])).toBe(25);
});

it('compares asset return with a benchmark over the same period', () => {
  const asset = [{ close: 100 }, { close: 105 }, { close: 110 }];
  const benchmark = [{ close: 100 }, { close: 102 }, { close: 104 }];
  const result = relativePerformance(asset, benchmark, 2);
  expect(result.assetReturn).toBeCloseTo(10);
  expect(result.benchmarkReturn).toBeCloseTo(4);
  expect(result.excessReturn).toBeCloseTo(6);
});
