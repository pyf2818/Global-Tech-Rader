import { expect, it } from 'vitest';
import { annualizedVolatility, simpleMovingAverage, supportResistance, volumeTrend } from '../indicators.js';

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
  expect(bars).toEqual(original);
});
