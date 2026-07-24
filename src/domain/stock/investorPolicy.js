export const DEFAULT_INVESTOR_POLICY = Object.freeze({
  capital: 100000,
  riskPerTrade: 1,
  maxPosition: 20,
  horizon: 'swing',
  riskTolerance: 'balanced',
  allowGrowthBoards: true,
});

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export function normalizeInvestorPolicy(input = {}) {
  return {
    capital: clamp(input.capital, 1000, 1_000_000_000, DEFAULT_INVESTOR_POLICY.capital),
    riskPerTrade: clamp(input.riskPerTrade, 0.1, 10, DEFAULT_INVESTOR_POLICY.riskPerTrade),
    maxPosition: clamp(input.maxPosition, 1, 100, DEFAULT_INVESTOR_POLICY.maxPosition),
    horizon: ['short', 'swing', 'long'].includes(input.horizon) ? input.horizon : DEFAULT_INVESTOR_POLICY.horizon,
    riskTolerance: ['conservative', 'balanced', 'aggressive'].includes(input.riskTolerance) ? input.riskTolerance : DEFAULT_INVESTOR_POLICY.riskTolerance,
    allowGrowthBoards: input.allowGrowthBoards !== false,
  };
}

export function evaluatePolicyFit(stock, policyInput) {
  const policy = normalizeInvestorPolicy(policyInput);
  const flags = [];
  let adjustment = 0;
  let eligible = true;
  const code = String(stock?.code || '').toLowerCase();
  const changePct = Math.abs(Number(stock?.changePct) || 0);
  const price = Number(stock?.price) || 0;
  const rangePct = price > 0 ? Math.abs((Number(stock?.high) || price) - (Number(stock?.low) || price)) / price * 100 : 0;
  const growthBoard = /^(sz300|sh688)/.test(code);

  if (!policy.allowGrowthBoards && growthBoard) {
    eligible = false;
    adjustment -= 30;
    flags.push('超出允许市场范围');
  }
  if (policy.riskTolerance === 'conservative') {
    if (changePct >= 4) { adjustment -= 10; flags.push('日内波动超过稳健阈值'); }
    if (rangePct >= 5) { adjustment -= 8; flags.push('日内振幅偏高'); }
  } else if (policy.riskTolerance === 'aggressive' && changePct >= 2 && changePct <= 6) {
    adjustment += 3;
  }
  if (policy.horizon === 'long' && changePct >= 5) {
    adjustment -= 5;
    flags.push('单日动量不足以支持长期逻辑');
  }
  if (/st|退/.test(String(stock?.name || '').toLowerCase())) {
    adjustment -= 25;
    flags.push('特殊风险标的');
  }
  return { eligible, adjustment, flags, policy };
}
