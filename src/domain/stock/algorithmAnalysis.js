import {
  annualizedVolatility,
  averageTrueRange,
  maxDrawdown,
  priceMomentum,
  pricePosition,
  relativePerformance,
  simpleMovingAverage,
  supportResistance,
  volumeTrend,
} from './indicators.js';

const round = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const DISCLAIMER = '本分析仅基于公开行情数据和确定性技术指标，仅供参考，不构成投资建议。';

export function analyzeStock({ stock = {}, realtime = null, klines = [], benchmarkKlines = [], benchmark = null } = {}) {
  const bars = Array.isArray(klines) ? klines.filter(bar => Number.isFinite(Number(bar?.close))) : [];
  if (!realtime || bars.length < 20) {
    return {
      mode: 'algorithm',
      status: 'insufficient_data',
      rating: '数据不足',
      risk: 'unknown',
      metrics: {},
      evidence: [],
      bullCase: [],
      bearCase: [],
      invalidation: [],
      riskSignals: [],
      dataQuality: { bars: 0, coverage: 'insufficient', limitations: ['K线数量不足'] },
      summary: '至少需要 20 根有效 K 线和最新行情才能生成技术分析。',
      disclaimer: DISCLAIMER,
      analyzedAt: new Date().toISOString(),
    };
  }

  const price = Number(realtime.price ?? bars.at(-1)?.close);
  const ma5 = simpleMovingAverage(bars, 5);
  const ma10 = simpleMovingAverage(bars, 10);
  const ma20 = simpleMovingAverage(bars, 20);
  const volatility = annualizedVolatility(bars);
  const atr14 = averageTrueRange(bars, 14);
  const drawdown = maxDrawdown(bars);
  const position20 = pricePosition(bars, 20);
  const relative20 = relativePerformance(bars, benchmarkKlines, 20);
  const levels = supportResistance(bars, 20);
  const volume = volumeTrend(bars, 5);
  const momentum5 = priceMomentum(bars, 5);
  const nearSupport = levels.support != null && price <= levels.support * 1.02;
  const bullishAlignment = ma5 > ma10 && ma10 > ma20 && price > ma5;
  const bearishAlignment = ma5 < ma10 && ma10 < ma20 && price < ma5;
  const rating = nearSupport && momentum5 < -5
    ? '超卖'
    : bullishAlignment
      ? '强势'
      : bearishAlignment
        ? '弱势'
        : '震荡';
  const risk = volatility == null ? 'unknown' : volatility > 60 || drawdown > 15 ? 'high' : volatility > 30 || drawdown > 8 ? 'medium' : 'low';
  const metrics = {
    price: round(price),
    ma5: round(ma5),
    ma10: round(ma10),
    ma20: round(ma20),
    volatility: round(volatility),
    atr14: round(atr14),
    drawdown: round(drawdown),
    position20: round(position20),
    assetReturn20: round(relative20?.assetReturn),
    benchmarkReturn20: round(relative20?.benchmarkReturn),
    excessReturn20: round(relative20?.excessReturn),
    support: round(levels.support),
    resistance: round(levels.resistance),
    volumeTrend: volume,
    momentum5: round(momentum5),
  };
  const evidence = [
    { key: 'maAlignment', label: '均线排列', value: bullishAlignment ? '多头排列' : bearishAlignment ? '空头排列' : '交叉震荡' },
    { key: 'momentum5', label: '5 日动量', value: `${metrics.momentum5 ?? '--'}%` },
    { key: 'supportResistance', label: '支撑 / 压力', value: `${metrics.support ?? '--'} / ${metrics.resistance ?? '--'}` },
    { key: 'volumeTrend', label: '量能趋势', value: volume },
    { key: 'volatility', label: '年化波动率', value: metrics.volatility == null ? '--' : `${metrics.volatility}%` },
  ];

  const bullCase = [];
  const bearCase = [];
  const invalidation = [];
  const riskSignals = [];
  if (bullishAlignment) bullCase.push('均线呈多头排列，短中期趋势一致');
  if (momentum5 > 0) bullCase.push(`近 5 个周期动量为正（${metrics.momentum5}%）`);
  if (relative20?.excessReturn > 2) bullCase.push(`近 20 周期跑赢基准 ${round(relative20.excessReturn)} 个百分点`);
  if (volume === 'expanding' && momentum5 > 0) bullCase.push('上涨伴随量能放大，趋势确认度更高');
  if (bearishAlignment) bearCase.push('均线呈空头排列，短中期趋势一致');
  if (momentum5 < 0) bearCase.push(`近 5 个周期动量为负（${metrics.momentum5}%）`);
  if (relative20?.excessReturn < -2) bearCase.push(`近 20 周期跑输基准 ${Math.abs(round(relative20.excessReturn))} 个百分点`);
  if (volume === 'expanding' && momentum5 < 0) bearCase.push('下跌伴随量能放大，卖压需要重点观察');
  if (levels.support != null) invalidation.push(`收盘跌破近 20 周期支撑 ${metrics.support}，当前趋势判断需要重估`);
  if (levels.resistance != null) invalidation.push(`突破 ${metrics.resistance} 后无法站稳，强势判断可能失效`);
  if (volatility != null && volatility > 30) riskSignals.push(`年化波动率 ${metrics.volatility}%，价格波动不可忽略`);
  if (drawdown != null && drawdown > 8) riskSignals.push(`样本区间最大回撤 ${metrics.drawdown}%，追涨风险较高`);
  if (volume === 'contracting') riskSignals.push('量能收缩，趋势延续需要新的成交确认');
  if (relative20 == null) riskSignals.push('缺少足够的基准指数数据，暂不能判断相对强弱');

  return {
    mode: 'algorithm',
    status: 'ready',
    stock: { name: stock.name || realtime.name || '', code: stock.code || realtime.code || '' },
    rating,
    risk,
    metrics,
    evidence,
    bullCase,
    bearCase,
    invalidation,
    riskSignals,
    dataQuality: {
      bars: bars.length,
      benchmarkBars: Array.isArray(benchmarkKlines) ? benchmarkKlines.length : 0,
      benchmark: relative20 == null ? null : { code: benchmark?.code || 'sh000001', name: benchmark?.name || '上证指数' },
      coverage: bars.length >= 60 ? 'adequate' : 'limited',
      latestBar: bars.at(-1)?.date || null,
      limitations: ['仅使用价格和成交量序列', '未接入财务、公告、资金流和全市场广度数据'],
    },
    summary: `${stock.name || realtime.name || '该标的'}当前技术评级为“${rating}”。均线呈${evidence[0].value}，5 日动量 ${metrics.momentum5 ?? '--'}%，量能${volume === 'expanding' ? '放大' : volume === 'contracting' ? '收缩' : '平稳'}，关注支撑 ${metrics.support ?? '--'} 与压力 ${metrics.resistance ?? '--'}。`,
    disclaimer: DISCLAIMER,
    analyzedAt: new Date().toISOString(),
  };
}
