// stockService.js — 股市行情数据服务
// 数据源：东方财富 push2/push2his API（免费、无需 key、支持 A股/美股/港股/指数/基金）
// 文档参考：https://push2.eastmoney.com/api/qt/stock/get

const REALTIME_URL = 'https://push2.eastmoney.com/api/qt/stock/get';
const KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const LIST_URL = 'https://push2.eastmoney.com/api/qt/ulist.np/get';

// 代码前缀映射：1=沪市 0=深市 105=美股 116=港股
const PREFIX_MAP = { sh: '1', sz: '0', us: '105', hk: '116' };
// 反向映射：东方财富 secid 前缀 → 腾讯 code 前缀
const SECID_TO_TC = { '1': 'sh', '0': 'sz', '105': 'us', '116': 'hk' };

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

// 缓存：单标的实时 8s，批量看板 30s，K线 10min，活跃股池 5min
const realtimeCache = new Map();
const klineCache = new Map();
const REALTIME_TTL = 2 * 1000;
const BATCH_REALTIME_TTL = 5 * 1000;
const KLINE_TTL = 10 * 60 * 1000;
const ACTIVE_POOL_TTL = 5 * 60 * 1000;
const activeMarketPoolCache = { value: null, t: 0 };

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

// 腾讯实时接口（降级源）—— 东方财富失败时使用
const TENCENT_URL = 'https://qt.gtimg.cn/q=';
// 东方财富分时图接口
const TIMELINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';
// 东方财富板块涨跌接口（m:90 t:2=行业板块 t:3=概念板块）
const SECTOR_LIST_URL = 'https://push2.eastmoney.com/api/qt/clist/get';
const MARKET_POOL_SIZE = 30;
const A_SHARE_FILTER = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23';

// 东方财富 secid（如 1.000001）→ 腾讯 code（如 sh000001）
function secidToTencentCode(secid) {
  const [prefix, code] = String(secid).split('.');
  const tcPrefix = SECID_TO_TC[prefix];
  if (!tcPrefix) return null;
  // 美股：105.AAPL → usAAPL；港股：116.00700 → hk00700
  return tcPrefix + code;
}

// 解析腾讯单行返回：v_sh000001="1~上证指数~000001~3999.03~..."
// 字段索引（~ 分隔，共 88 段）：
//   1=名称 2=代码 3=当前价 4=昨收 5=今开 6=成交量
//   9-18=买五档(价/量交替) 19-28=卖五档(价/量交替)
//   30=时间 31=涨跌额 32=涨跌幅 33=最高 34=最低
function parseTencentLine(line) {
  const m = /^v_(\w+)="([^"]*)"/.exec(line.trim());
  if (!m) return null;
  const tcCode = m[1];
  const parts = m[2].split('~');
  if (parts.length < 35) return null;
  const price = parseFloat(parts[3]) || 0;
  const prevClose = parseFloat(parts[4]) || 0;
  const open = parseFloat(parts[5]) || 0;
  const volume = parseInt(parts[6], 10) || 0;
  const change = parseFloat(parts[31]) || 0;
  const changePct = parseFloat(parts[32]) || 0;
  const high = parseFloat(parts[33]) || 0;
  const low = parseFloat(parts[34]) || 0;
  // 买卖五档（每档 2 字段：价格、数量）
  const bids = [];
  const asks = [];
  for (let i = 0; i < 5; i++) {
    const bPrice = parseFloat(parts[9 + i * 2]) || 0;
    const bVol = parseInt(parts[10 + i * 2], 10) || 0;
    const aPrice = parseFloat(parts[19 + i * 2]) || 0;
    const aVol = parseInt(parts[20 + i * 2], 10) || 0;
    if (bPrice > 0) bids.push({ price: bPrice, volume: bVol });
    if (aPrice > 0) asks.push({ price: aPrice, volume: aVol });
  }
  // 反推 secid
  const prefixMatch = /^(sh|sz|us|hk)/.exec(tcCode);
  const secidPrefix = prefixMatch ? PREFIX_MAP[prefixMatch[1]] : '1';
  const code = tcCode.replace(/^(sh|sz|us|hk)/, '');
  return {
    secid: `${secidPrefix}.${code}`,
    code: tcCode,
    name: parts[1] || '',
    price,
    prevClose,
    open,
    high,
    low,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    volume,
    amount: 0,
    bids,
    asks,
    dataSource: 'tencent',
    timestamp: nowMs(),
  };
}

// 腾讯批量实时查询（降级用）—— 返回 GBK 编码，需手动解码
async function fetchTencentBatch(secids) {
  const tcCodes = secids.map(secidToTencentCode).filter(Boolean);
  if (tcCodes.length === 0) return [];
  const url = `${TENCENT_URL}${tcCodes.join(',')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  // 腾讯返回 GBK 编码，UTF-8 解码会乱码，用 TextDecoder('gbk') 正确解码中文
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('gbk').decode(buf);
  const items = text.split(';')
    .map(l => l.trim())
    .filter(Boolean)
    .map(parseTencentLine)
    .filter(Boolean);
  return items;
}

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
    if (d) {
      let item = parseRealtimeItem(d, secids[0]);
      // 东方财富主报价不含五档深度；腾讯作为盘口补充源，不影响主报价可用性。
      try {
        const [depth] = await fetchTencentBatch([secids[0]]);
        if (depth) {
          item = {
            ...item,
            bids: depth.bids || [],
            asks: depth.asks || [],
            dataSource: 'eastmoney+tencent',
          };
        }
      } catch { /* 主报价仍然可用 */ }
      realtimeCache.set(key, { data: [item], t: nowMs() });
      return [item];
    }
  } catch (e) { /* fall through to tencent */ }
  // 降级：腾讯实时接口
  try {
    const items = await fetchTencentBatch(secids);
    if (items.length > 0) realtimeCache.set(key, { data: items, t: nowMs() });
    return items;
  } catch (e) {
    return [];
  }
}

export async function getRealtimeBatch(secids) {
  if (!secids || secids.length === 0) return [];
  const key = secids.join(',');
  const cached = realtimeCache.get(key);
  if (cached && nowMs() - cached.t < BATCH_REALTIME_TTL) return cached.data;

  const secidParam = secids.join(',');
  const url = `${LIST_URL}?secids=${secidParam}&fields=f1,f2,f3,f4,f12,f14,f15,f16,f17,f18&fltt=2`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const diff = json?.data?.diff || [];
    if (diff.length > 0) {
      const items = diff.map(d => parseListItem(d, secids));
      realtimeCache.set(key, { data: items, t: nowMs() });
      return items;
    }
  } catch (e) { /* fall through to tencent */ }
  // 降级：腾讯实时接口
  try {
    const items = await fetchTencentBatch(secids);
    if (items.length > 0) realtimeCache.set(key, { data: items, t: nowMs() });
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
    bids: [],
    asks: [],
    dataSource: 'eastmoney',
    timestamp: nowMs(),
  };
}

export function parseListItem(d, secids) {
  // ulist 使用 fltt=2，价格和涨跌幅已经是实际数值，不能再次除以 100。
  const secid = secids.find(s => s.endsWith('.' + (d.f12 || ''))) || `${d.f1 || 1}.${d.f12}`;
  const price = Number(d.f2) || 0;
  const prevClose = Number(d.f18) || 0;
  return {
    secid,
    code: d.f12 || '',
    name: d.f14 || '',
    price,
    prevClose,
    open: Number(d.f17) || 0,
    high: Number(d.f15) || 0,
    low: Number(d.f16) || 0,
    change: Number(d.f4) || 0,
    changePct: Number(d.f3) || 0,
    volume: 0,
    amount: 0,
    dataSource: 'eastmoney',
    timestamp: nowMs(),
  };
}

export function parseMarketPoolItem(d) {
  const code = String(d?.f12 || '');
  if (!/^\d{6}$/.test(code)) return null;
  const market = Number(d?.f13) === 1 || /^(6|68)/.test(code) ? 'sh' : 'sz';
  const price = Number(d?.f2) || 0;
  if (price <= 0 || !d?.f14) return null;
  return {
    secid: `${market === 'sh' ? 1 : 0}.${code}`,
    code: `${market}${code}`,
    name: d.f14,
    price,
    prevClose: Number(d.f18) || 0,
    open: Number(d.f17) || 0,
    high: Number(d.f15) || 0,
    low: Number(d.f16) || 0,
    change: Number(d.f4) || 0,
    changePct: Number(d.f3) || 0,
    volume: Number(d.f5) || 0,
    amount: Number(d.f6) || 0,
    dataSource: 'eastmoney',
    timestamp: nowMs(),
  };
}

async function getActiveMarketPool() {
  // 5 分钟缓存：避免短时间内重复请求被东方财富限速
  const cached = activeMarketPoolCache.value;
  if (cached && nowMs() - activeMarketPoolCache.t < ACTIVE_POOL_TTL) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s 超时
  try {
    const url = `${SECTOR_LIST_URL}?pn=1&pz=${MARKET_POOL_SIZE}&po=1&np=1&fltt=2&invt=2&fid=f6&fs=${A_SHARE_FILTER}&fields=f2,f3,f4,f5,f6,f12,f13,f14,f15,f16,f17,f18`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://quote.eastmoney.com/' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`market pool upstream returned ${res.status}`);
    const json = await res.json();
    const items = (json?.data?.diff || []).map(parseMarketPoolItem).filter(Boolean);
    if (items.length > 0) {
      activeMarketPoolCache.value = items;
      activeMarketPoolCache.t = nowMs();
    }
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

// K线：klt=101日 102周 103月 5/15/30/60 分钟；fqt=0不复权 1前复权 2后复权
export async function getKline(secid, { period = '101', count = 60, adjust = '1' } = {}) {
  if (!secid) return null;
  const key = `${secid}-${period}-${count}-${adjust}`;
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

// 分时图：当日分钟走势（东方财富 trends2 接口）
// 返回 { secid, code, name, preClose, points: [{ time, price, avg, volume }] }
const timelineCache = new Map();
const TIMELINE_TTL = 60 * 1000;

export async function getTimeline(secid) {
  if (!secid) return null;
  const cached = timelineCache.get(secid);
  if (cached && nowMs() - cached.t < TIMELINE_TTL) return cached.data;

  const url = `${TIMELINE_URL}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1&rtntype=6`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const d = json?.data;
    if (!d || !Array.isArray(d.trends)) return null;
    const preClose = d.preClose || 0;
    const points = d.trends.map(line => {
      const parts = line.split(',');
      // 格式：时间,开,收,高,低,成交量,成交额,均价
      return {
        time: parts[0],
        price: parseFloat(parts[2]) || 0,
        avg: parseFloat(parts[7]) || 0,
        volume: parseInt(parts[5], 10) || 0,
      };
    });
    const result = {
      secid,
      code: d.code || secid.split('.')[1],
      name: d.name || '',
      preClose,
      points,
    };
    timelineCache.set(secid, { data: result, t: nowMs() });
    return result;
  } catch (e) {
    return null;
  }
}

// 板块涨跌（行业板块 + 概念板块）—— 用于 AI 诊断输入和市场热力
// type: 'industry' (m:90 t:2) | 'concept' (m:90 t:3)
const sectorCache = new Map();
const SECTOR_TTL = 60 * 1000;

export async function getSectors(type = 'industry') {
  const fs = type === 'concept' ? 'm:90+t:3' : 'm:90+t:2';
  const key = `sectors-${type}`;
  const cached = sectorCache.get(key);
  if (cached && nowMs() - cached.t < SECTOR_TTL) return cached.data;

  const url = `${SECTOR_LIST_URL}?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${fs}&fields=f2,f3,f12,f14`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const diff = json?.data?.diff || [];
    const items = diff.map(d => ({
      code: d.f12 || '',
      name: d.f14 || '',
      price: d.f2 || 0,
      changePct: d.f3 || 0,
    }));
    const result = { type, sectors: items, updatedAt: new Date().toISOString() };
    sectorCache.set(key, { data: result, t: nowMs() });
    return result;
  } catch (e) {
    return { type, sectors: [], updatedAt: new Date().toISOString() };
  }
}

// 获取默认看板数据（指数 + 热门股）
export async function getDashboard() {
  const indexSecids = DEFAULT_INDICES.map(i => i.secid);
  const fallbackSecids = DEFAULT_HOT_STOCKS.map(s => s.secid);
  const [indices, poolResult] = await Promise.all([
    getRealtimeBatch(indexSecids),
    getActiveMarketPool().catch(() => null),
  ]);
  const dynamicStocks = Array.isArray(poolResult) && poolResult.length >= 3 ? poolResult : null;
  const stocks = dynamicStocks || await getRealtimeBatch(fallbackSecids);
  return {
    indices,
    stocks,
    updatedAt: new Date().toISOString(),
    coverage: {
      kind: dynamicStocks ? 'active_turnover_sample' : 'fixed_fallback_sample',
      label: dynamicStocks ? '沪深A股成交额活跃样本' : '固定热门样本（上游降级）',
      stockCount: stocks.length,
      targetCount: dynamicStocks ? MARKET_POOL_SIZE : DEFAULT_HOT_STOCKS.length,
      realtimePollingSeconds: 30,
      source: stocks[0]?.dataSource || 'unavailable',
    },
  };
}

// 搜索股票（腾讯智能搜索 + 东方财富模糊查询双源，返回标准化数组）
export async function searchStock(keyword) {
  if (!keyword) return [];
  const results = [];
  const seen = new Set();

  // 源 1：腾讯智能搜索（同时支持代码和中文名，返回最佳匹配）
  // 返回格式：v_hint="sh~600519~贵州茅台~gzmt~GP-A"
  try {
    const tencentUrl = `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(keyword)}`;
    const res = await fetch(tencentUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    const match = text.match(/v_hint="([^"]+)"/);
    if (match && match[1]) {
      const fields = match[1].split('~');
      if (fields.length >= 4 && fields[3]) {
        const market = fields[0]; // sh/sz/hk/us
        const code = fields[1];
        const name = fields[2];
        const py = fields[3];
        const secid = market === 'sh' ? `1.${code}` : market === 'sz' ? `0.${code}` : `${market}.${code}`;
        if (!seen.has(secid) && code && name) {
          seen.add(secid);
          results.push({ secid, code, name, market, py });
        }
      }
    }
  } catch (e) {
    // 腾讯失败继续尝试东方财富
  }

  // 源 2：东方财富搜索 API（多结果回退，JSONP 格式）
  try {
    const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(keyword)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=15&mode=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    const match = text.match(/^[a-zA-Z0-9_$]+\s*\(([\s\S]+)\)\s*;?\s*$/);
    const jsonText = match ? match[1] : text;
    const json = JSON.parse(jsonText);
    const list = json.QuotationCodeTable?.Data || [];
    for (const d of list) {
      const mkt = d.MktNum;
      const market = mkt === 1 ? 'sh' : mkt === 0 ? 'sz' : mkt === 105 ? 'us' : mkt === 116 ? 'hk' : mkt === 3 ? 'bj' : 'other';
      const code = d.Code;
      const secid = `${mkt}.${code}`;
      if (!seen.has(secid)) {
        seen.add(secid);
        results.push({ secid, code, name: d.Name, market });
      }
    }
  } catch (e) {
    // 东方财富失败时只用腾讯结果
  }

  return results.slice(0, 15);
}

export const STOCK_DEFAULTS = { DEFAULT_INDICES, DEFAULT_HOT_STOCKS };
