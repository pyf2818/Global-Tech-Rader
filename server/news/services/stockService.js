// stockService.js — 股市行情数据服务
// 数据源：东方财富 push2/push2his API（免费、无需 key、支持 A股/美股/港股/指数/基金）
// 文档参考：https://push2.eastmoney.com/api/qt/stock/get

const REALTIME_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const LIST_URL = 'https://push2.eastmoney.com/api/qt/ulist.np/get';

// 代码前缀映射：1=沪市 0=深市 105=美股 116=港股
const PREFIX_MAP = { sh: '1', sz: '0', us: '105', hk: '116' };

// 默认指数（self-contained，不依赖外部配置）
const DEFAULT_INDICES = [
  { secid: '1.000001', code: 'sh000001', name: '上证指数' },
  { secid: '0.399001', code: 'sz399001', name: '深证成指' },
  { secid: '0.399006', code: 'sz399006', name: '创业板指' },
];

// 默认热门个股（科技/AI 相关）
const DEFAULT_HOT_STOCKS = [
  { secid: '0.000001', code: 'sz000001', name: '平安银行' },
  { secid: '1.600519', code: 'sh600519', name: '贵州茅台' },
  { secid: '0.000858', code: 'sz000858', name: '五粮液' },
  { secid: '1.601318', code: 'sh601318', name: '中国平安' },
  { secid: '0.300750', code: 'sz300750', name: '宁德时代' },
  { secid: '1.600036', code: 'sh600036', name: '招商银行' },
  { secid: '0.002594', code: 'sz002594', name: '比亚迪' },
  { secid: '1.688981', code: 'sh688981', name: '中芯国际' },
];

// 缓存：实时 60s，K线 10min
const realtimeCache = new Map();
const klineCache = new Map();
const REALTIME_TTL = 60 * 1000;
const KLINE_TTL = 10 * 60 * 1000;

function nowMs() { return Date.now(); }

// 解析 secid（支持 "sh600519" / "sz000001" / "AAPL" / "00700" 等格式）
export function resolveSecid(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  // 已经是 secid 格式（如 1.000001）
  if (/^\d+\.\d{6}$/.test(s)) return s;
  // sh/sz 前缀
  const m = /^(sh|sz)(\d{6})$/.exec(s);
  if (m) return `${PREFIX_MAP[m[1]]}.${m[2]}`;
  // 6 位纯数字：6 开头沪市，0/3 开头深市
  if (/^\d{6}$/.test(s)) {
    if (s.startsWith('6')) return `1.${s}`;
    return `0.${s}`;
  }
  // 美股字母代码
  if (/^[a-z.]{1,8}$/.test(s)) return `105.${s.toUpperCase()}`;
  // 港股 5 位数字
  if (/^\d{5}$/.test(s)) return `116.${s}`;
  return null;
}

// 字段说明：f43=最新价 f44=最高 f45=最低 f46=开盘 f47=成交量 f48=成交额
//          f57=代码 f58=名称 f60=昨收 f170=涨跌幅 f171=涨跌额
const REALTIME_FIELDS = 'f43,f44,f45,f46,f47,f48,f57,f58,f60,f170,f171';

export async function getRealtime(secids) {
  if (!secids || secids.length === 0) return [];
  const key = secids.join(',');
  const cached = realtimeCache.get(key);
  if (cached && nowMs() - cached.t < REALTIME_TTL) return cached.data;

  const url = `${REALTIME_URL}?secid=${secids[0]}&fields=${REALTIME_FIELDS}`;
  // 单只查询（批量用 ulist.np，但单只更常用）
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const d = json?.data;
    if (!d) return [];
    const item = parseRealtimeItem(d, secids[0]);
    realtimeCache.set(key, { data: [item], t: nowMs() });
    return [item];
  } catch (e) {
    return [];
  }
}

export async function getRealtimeBatch(secids) {
  if (!secids || secids.length === 0) return [];
  const key = secids.join(',');
  const cached = realtimeCache.get(key);
  if (cached && nowMs() - cached.t < REALTIME_TTL) return cached.data;

  const secidParam = secids.join(',');
  const url = `${LIST_URL}?secids=${secidParam}&fields=f1,f2,f3,f4,f12,f14,f15,f16,f17,f18&fltt=2`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const diff = json?.data?.diff || [];
    const items = diff.map(d => parseListItem(d, secids));
    realtimeCache.set(key, { data: items, t: nowMs() });
    return items;
  } catch (e) {
    return [];
  }
}

function parseRealtimeItem(d, secid) {
  // 东方财富价格需除以 100（f43 等是分）
  const price = (d.f43 || 0) / 100;
  const prevClose = (d.f60 || 0) / 100;
  const open = (d.f46 || 0) / 100;
  const high = (d.f44 || 0) / 100;
  const low = (d.f45 || 0) / 100;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
  return {
    secid,
    code: d.f57 || secid.split('.')[1],
    name: d.f58 || '',
    price,
    prevClose,
    open,
    high,
    low,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume: d.f47 || 0,
    amount: d.f48 || 0,
    timestamp: nowMs(),
  };
}

function parseListItem(d, secids) {
  // ulist 返回 f2=最新价 f3=涨跌幅 f4=涨跌额 f15=最高 f16=最低 f17=今开 f18=昨收
  const secid = secids.find(s => s.endsWith('.' + (d.f12 || ''))) || `${d.f1 || 1}.${d.f12}`;
  const price = (d.f2 || 0) / 100;
  const prevClose = (d.f18 || 0) / 100;
  return {
    secid,
    code: d.f12 || '',
    name: d.f14 || '',
    price,
    prevClose,
    open: (d.f17 || 0) / 100,
    high: (d.f15 || 0) / 100,
    low: (d.f16 || 0) / 100,
    change: (d.f4 || 0) / 100,
    changePct: (d.f3 || 0) / 100,
    volume: 0,
    amount: 0,
    timestamp: nowMs(),
  };
}

// K线：klt=101日 102周 103月 5/15/30/60 分钟；fqt=0不复权 1前复权 2后复权
export async function getKline(secid, { period = '101', count = 60, adjust = '1' } = {}) {
  if (!secid) return null;
  const key = `${secid}-${period}-${count}`;
  const cached = klineCache.get(key);
  if (cached && nowMs() - cached.t < KLINE_TTL) return cached.data;

  const url = `${KLINE_URL}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=${period}&fqt=${adjust}&end=20500101&lmt=${count}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const klines = json?.data?.klines || [];
    const name = json?.data?.name || '';
    const code = json?.data?.code || secid.split('.')[1];
    const parsed = klines.map(k => {
      const parts = k.split(',');
      return {
        date: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        high: parseFloat(parts[3]),
        low: parseFloat(parts[4]),
        volume: parseInt(parts[5], 10),
        amount: parseFloat(parts[6]),
        amplitude: parseFloat(parts[7] || '0'),
      };
    });
    const result = { secid, code, name, klines: parsed };
    klineCache.set(key, { data: result, t: nowMs() });
    return result;
  } catch (e) {
    return null;
  }
}

// 获取默认看板数据（指数 + 热门股）
export async function getDashboard() {
  const indexSecids = DEFAULT_INDICES.map(i => i.secid);
  const stockSecids = DEFAULT_HOT_STOCKS.map(s => s.secid);
  const [indices, stocks] = await Promise.all([
    getRealtimeBatch(indexSecids),
    getRealtimeBatch(stockSecids),
  ]);
  return { indices, stocks, updatedAt: new Date().toISOString() };
}

// 搜索股票（东方财富搜索接口）
export async function searchStock(keyword) {
  if (!keyword) return [];
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const list = json.QuotationCodeTable?.Data || [];
    return list.map(d => ({
      secid: `${d.MktNum}.${d.Code}`,
      code: d.Code,
      name: d.Name,
      market: d.MktNum === 1 ? 'sh' : d.MktNum === 0 ? 'sz' : d.MktNum === 105 ? 'us' : 'hk',
    }));
  } catch (e) {
    return [];
  }
}

export const STOCK_DEFAULTS = { DEFAULT_INDICES, DEFAULT_HOT_STOCKS };
