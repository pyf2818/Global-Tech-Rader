import {
  annualizedVolatility,
  priceMomentum,
  simpleMovingAverage,
  supportResistance,
  volumeTrend,
} from './indicators.js';

const round = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const DISCLAIMER = '本分析仅基于公开行情数据和确定性技术指标，仅供参考，不构成投资建议。';

export function analyzeStock({ stock = {}, realtime = null, klines = [] } = {}) {
  const bars = Array.isArray(klines) ? klines.filter(bar => Number.isFinite(Number(bar?.close))) : [];
  if (!realtime || bars.length < 20) {
    return {
      mode: 'algorithm',
      status: 'insufficient_data',
      rating: '数据不足',
      risk: 'unknown',
      metrics: {},
      evidence: [],
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
  const risk = volatility == null ? 'unknown' : volatility > 60 ? 'high' : volatility > 30 ? 'medium' : 'low';
  const metrics = {
    price: round(price),
    ma5: round(ma5),
    ma10: round(ma10),
    ma20: round(ma20),
    volatility: round(volatility),
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

  return {
    mode: 'algorithm',
    status: 'ready',
    stock: { name: stock.name || realtime.name || '', code: stock.code || realtime.code || '' },
    rating,
    risk,
    metrics,
    evidence,
    summary: `${stock.name || realtime.name || '该标的'}当前技术评级为“${rating}”。均线呈${evidence[0].value}，5 日动量 ${metrics.momentum5 ?? '--'}%，量能${volume === 'expanding' ? '放大' : volume === 'contracting' ? '收缩' : '平稳'}，关注支撑 ${metrics.support ?? '--'} 与压力 ${metrics.resistance ?? '--'}。`,
    disclaimer: DISCLAIMER,
    analyzedAt: new Date().toISOString(),
  };
}
