const finitePositive = value => Number.isFinite(Number(value)) && Number(value) > 0;

export function calculatePositionSize({ capital, riskPercent, entry, stop, lotSize = 100 } = {}) {
  if (![capital, riskPercent, entry, stop, lotSize].every(finitePositive)) {
    return { status: 'invalid', reason: '请输入有效的正数' };
  }

  const values = {
    capital: Number(capital),
    riskPercent: Number(riskPercent),
    entry: Number(entry),
    stop: Number(stop),
    lotSize: Math.max(1, Math.floor(Number(lotSize))),
  };
  if (values.riskPercent > 100) return { status: 'invalid', reason: '单次风险比例不能超过 100%' };
  if (values.stop >= values.entry) return { status: 'invalid', reason: '止损价必须低于参考价格' };

  const riskBudget = values.capital * values.riskPercent / 100;
  const riskPerShare = values.entry - values.stop;
  const riskLimitedShares = Math.floor(riskBudget / riskPerShare / values.lotSize) * values.lotSize;
  const affordableShares = Math.floor(values.capital / values.entry / values.lotSize) * values.lotSize;
  const shares = Math.max(0, Math.min(riskLimitedShares, affordableShares));
  const capitalUsed = shares * values.entry;
  const estimatedLoss = shares * riskPerShare;

  return {
    status: shares > 0 ? 'ready' : 'below_lot',
    reason: shares > 0 ? '' : `风险预算不足以买入 1 手（${values.lotSize} 股）`,
    riskBudget,
    riskPerShare,
    shares,
    lots: shares / values.lotSize,
    capitalUsed,
    positionPercent: capitalUsed / values.capital * 100,
    estimatedLoss,
    cappedByCapital: affordableShares < riskLimitedShares,
  };
}

export function calculateScenarioMetrics({ referencePrice, scenarios } = {}) {
  if (!finitePositive(referencePrice) || !Array.isArray(scenarios) || scenarios.length !== 3) {
    return { status: 'invalid', reason: '需要有效参考价和三个情景' };
  }
  const normalized = scenarios.map(item => ({ target: Number(item?.target), probability: Number(item?.probability) }));
  if (normalized.some(item => !finitePositive(item.target) || !Number.isFinite(item.probability) || item.probability < 0)) {
    return { status: 'invalid', reason: '目标价必须为正数，概率不能为负数' };
  }
  const probabilityTotal = normalized.reduce((sum, item) => sum + item.probability, 0);
  if (Math.abs(probabilityTotal - 100) >= 0.01) {
    return { status: 'invalid', reason: `概率合计必须为 100%，当前为 ${probabilityTotal}%`, probabilityTotal };
  }
  const price = Number(referencePrice);
  const weightedPrice = normalized.reduce((sum, item) => sum + item.target * item.probability / 100, 0);
  const expectedReturn = (weightedPrice - price) / price * 100;
  const downside = (normalized[0].target - price) / price * 100;
  const upside = (normalized[2].target - price) / price * 100;
  return {
    status: 'ready',
    probabilityTotal,
    weightedPrice,
    expectedReturn,
    downside,
    upside,
    payoffRatio: downside < 0 ? upside / Math.abs(downside) : null,
  };
}
