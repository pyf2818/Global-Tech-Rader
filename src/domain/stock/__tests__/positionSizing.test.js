import { expect, it } from 'vitest';
import { calculatePositionSize, calculateScenarioMetrics } from '../positionSizing.js';

it('sizes an A-share position from the risk budget', () => {
  const result = calculatePositionSize({ capital: 100000, riskPercent: 1, entry: 20, stop: 18, lotSize: 100 });
  expect(result.status).toBe('ready');
  expect(result.riskBudget).toBe(1000);
  expect(result.shares).toBe(500);
  expect(result.estimatedLoss).toBe(1000);
  expect(result.positionPercent).toBe(10);
});

it('caps the position by available capital', () => {
  const result = calculatePositionSize({ capital: 10000, riskPercent: 100, entry: 30, stop: 29, lotSize: 100 });
  expect(result.shares).toBe(300);
  expect(result.cappedByCapital).toBe(true);
});

it('rejects a stop price above the entry price', () => {
  expect(calculatePositionSize({ capital: 10000, riskPercent: 1, entry: 20, stop: 21 }).status).toBe('invalid');
});

it('calculates probability-weighted scenario return and payoff', () => {
  const result = calculateScenarioMetrics({
    referencePrice: 100,
    scenarios: [
      { target: 80, probability: 25 },
      { target: 100, probability: 50 },
      { target: 140, probability: 25 },
    ],
  });
  expect(result.status).toBe('ready');
  expect(result.weightedPrice).toBe(105);
  expect(result.expectedReturn).toBe(5);
  expect(result.payoffRatio).toBe(2);
});

it('rejects scenario probabilities that do not total 100%', () => {
  const result = calculateScenarioMetrics({
    referencePrice: 100,
    scenarios: [
      { target: 80, probability: 20 },
      { target: 100, probability: 40 },
      { target: 120, probability: 20 },
    ],
  });
  expect(result.status).toBe('invalid');
  expect(result.probabilityTotal).toBe(80);
});
