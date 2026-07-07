/**
 * StockPage — 股市动向模块（重设计版）
 * 数据源：东方财富 push2 API（免费、无需 key、A股/美股/港股/指数/基金）
 * 图表：klinecharts v10（Canvas，hover十字光标/缩放/成交量副图/MA指标）
 * 自选：localStorage 持久化 watchlist
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { init, dispose } from 'klinecharts';
import { ICONS } from '../constants/index.jsx';
import { useStockWatchlist } from '../hooks/useStockWatchlist.js';

// 东方财富 period → klinecharts Period
const PERIOD_MAP = {
  '101': { type: 'day', span: 1 },
  '102': { type: 'week', span: 1 },
  '103': { type: 'month', span: 1 },
};

// 涨跌色（A 股惯例：红涨绿跌）
const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#22c55e';

// 算法研判（退级方案，无 LLM 时使用）
function algorithmicAnalysis(klineData, realtime) {
  if (!klineData?.klines || klineData.klines.length === 0) {
    return { summary: '暂无足够数据进行分析', signals: [], trend: 'unknown' };
  }
  const klines = klineData.klines;
  const last = klines[klines.length - 1];
  const closes = klines.map(k => k.close);
  const n = closes.length;

  const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, n);
  const ma20 = n >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : ma5;
  const trend = ma5 > ma20 ? 'up' : ma5 < ma20 ? 'down' : 'flat';

  const recent5 = closes.slice(-6);
  const chg5 = recent5.length >= 2 ? ((recent5[recent5.length - 1] - recent5[0]) / recent5[0]) * 100 : 0;

  const mean = closes.reduce((a, b) => a + b, 0) / n;
  const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  const vols = klines.slice(-10).map(k => k.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;
  const lastVol = vols[vols.length - 1] || 0;
  const volRatio = avgVol > 0 ? lastVol / avgVol : 1;

  const signals = [];
  if (trend === 'up') signals.push({ type: 'bullish', text: `5日均线(${ma5.toFixed(2)})高于20日均线(${ma20.toFixed(2)})，短期趋势向上` });
  else if (trend === 'down') signals.push({ type: 'bearish', text: `5日均线(${ma5.toFixed(2)})低于20日均线(${ma20.toFixed(2)})，短期趋势向下` });
  else signals.push({ type: 'neutral', text: '均线纠缠，趋势不明朗' });

  if (chg5 > 5) signals.push({ type: 'bullish', text: `近5日涨幅 ${chg5.toFixed(2)}%，强势上涨` });
  else if (chg5 < -5) signals.push({ type: 'bearish', text: `近5日跌幅 ${chg5.toFixed(2)}%，弱势下跌` });

  if (volatility > 3) signals.push({ type: 'warning', text: `波动率 ${volatility.toFixed(2)}%，需注意风险` });
  if (volRatio > 1.5) signals.push({ type: 'bullish', text: '近期放量，资金关注度提升' });
  else if (volRatio < 0.5) signals.push({ type: 'bearish', text: '近期缩量，交投清淡' });

  const summary = `${klineData.name || klineData.code} 当前${realtime?.price || last.close}，`
    + `${trend === 'up' ? '短期趋势向上' : trend === 'down' ? '短期趋势向下' : '横盘整理'}，`
    + `近5日${chg5 >= 0 ? '涨' : '跌'}${Math.abs(chg5).toFixed(2)}%，`
    + `波动率${volatility.toFixed(2)}%。`;

  return { summary, signals, trend, ma5, ma20, chg5, volatility, volRatio };
}

// klinecharts 图表组件 —— 封装 init/dispose/DataLoader/指标
function KLineChart({ klineData, period, code, name }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const dataRef = useRef([]);

  // 转换东方财富 K 线 → klinecharts KLineData
  const toKLineData = useCallback((klines) => {
    return (klines || []).map(k => ({
      timestamp: new Date(k.date).getTime(),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      turnover: k.amount,
    }));
  }, []);

  // init 图表（仅一次）
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current, {
      styles: {
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: UP_COLOR,
            downColor: DOWN_COLOR,
            noChangeColor: '#888',
            upBorderColor: UP_COLOR,
            downBorderColor: DOWN_COLOR,
            upWickColor: UP_COLOR,
            downWickColor: DOWN_COLOR,
          },
          priceMark: {
            last: {
              upColor: UP_COLOR,
              downColor: DOWN_COLOR,
            },
          },
        },
        yAxis: {
          position: 'right',
        },
        crosshair: {
          horizontal: {
            line: { style: 'dashed', dashedValue: [4, 2] },
            text: { backgroundColor: '#1f2937' },
          },
          vertical: {
            line: { style: 'dashed', dashedValue: [4, 2] },
            text: { backgroundColor: '#1f2937' },
          },
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;

    // 主图叠 MA（5/10/20）
    chart.createIndicator(
      { name: 'MA', calcParams: [5, 10, 20], shortName: 'MA' },
      { id: 'ma_pane', isStack: true }
    );
    // 成交量副图
    chart.createIndicator(
      { name: 'VOL', shortName: 'VOL' },
      { id: 'vol_pane' }
    );

    return () => {
      if (containerRef.current) dispose(containerRef.current);
      chartRef.current = null;
    };
  }, []);

  // 数据更新：用 setDataLoader 推送全量数据
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const list = toKLineData(klineData?.klines);
    dataRef.current = list;

    chart.setSymbol({ ticker: code || 'INDEX', pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod(PERIOD_MAP[period] || PERIOD_MAP['101']);
    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(list, { backward: false, forward: false });
      },
    });
  }, [klineData, period, code, toKLineData]);

  // 容器尺寸变化时 resize
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !containerRef.current) return;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!klineData?.klines?.length) {
    return <div className="stock-chart-empty">暂无K线数据</div>;
  }
  return <div className="stock-kline-container" ref={containerRef} />;
}

export default function StockPage({ llmConfig, categories }) {
  const { watchlist, inWatchlist, toggleStock, moveStock } = useStockWatchlist();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState('sh000001');
  const [selectedName, setSelectedName] = useState('上证指数');
  const [klineData, setKlineData] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [period, setPeriod] = useState('101');

  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [previewPrice, setPreviewPrice] = useState({}); // { [code]: price }

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock/dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch { setDashboard(null); }
    setLoading(false);
  }, []);

  const loadStock = useCallback(async (code) => {
    setKlineData(null); setRealtime(null); setAnalysis(null);
    try {
      const [kRes, rRes] = await Promise.all([
        fetch(`/api/stock/kline?code=${code}&period=${period}&count=120`),
        fetch(`/api/stock/realtime?code=${code}`),
      ]);
      const k = await kRes.json();
      const r = await rRes.json();
      setKlineData(k);
      setRealtime(r);
      setSelectedName(k?.name || code);
      setAnalysis(algorithmicAnalysis(k, r));
    } catch { /* ignore */ }
  }, [period]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (selectedCode) loadStock(selectedCode); }, [selectedCode, loadStock]);

  const doSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;
    try {
      const res = await fetch(`/api/stock/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
  }, [searchKeyword]);

  // 搜索结果 hover 预览实时价
  const previewStock = useCallback(async (code) => {
    if (previewPrice[code] !== undefined) return;
    try {
      const res = await fetch(`/api/stock/realtime?code=${code}`);
      const d = await res.json();
      setPreviewPrice(p => ({ ...p, [code]: d?.price }));
    } catch { /* ignore */ }
  }, [previewPrice]);

  const runAiAnalysis = useCallback(async () => {
    if (!klineData) return;
    setAnalyzing(true);
    try {
      if (llmConfig?.baseUrl && llmConfig?.apiKey && llmConfig?.selectedModel) {
        const algo = algorithmicAnalysis(klineData, realtime);
        const prompt = `分析以下股票数据，给出简短中文研判（150字内）：\n名称：${klineData.name}\n当前价：${realtime?.price}\n近5日涨跌：${algo.chg5?.toFixed(2)}%\n趋势：${algo.trend}\n波动率：${algo.volatility?.toFixed(2)}%\nK线数据(近10日)：${JSON.stringify(klineData.klines.slice(-10))}`;
        const res = await fetch('/api/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.selectedModel,
            action: 'chat',
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: '你是专业的股市分析师，用中文简短给出研判，包含趋势判断、关键信号、风险提示。',
          }),
        });
        const data = await res.json();
        if (data.content) {
          setAnalysis({ ...algo, summary: data.content, aiPowered: true });
        } else {
          setAnalysis({ ...algo, summary: 'AI 分析失败，已退级为算法分析' });
        }
      } else {
        setAnalysis(a => ({ ...a }));
      }
    } catch { /* ignore */ }
    setAnalyzing(false);
  }, [klineData, realtime, llmConfig]);

  const hasLlm = llmConfig?.baseUrl && llmConfig?.apiKey && llmConfig?.selectedModel;

  // 当前选中的股票对象（用于加入自选）
  const selectedStock = useMemo(() => ({
    code: selectedCode,
    name: selectedName,
    secid: klineData?.secid || '',
    market: selectedCode?.startsWith('sh') ? 'sh' : selectedCode?.startsWith('sz') ? 'sz' : selectedCode?.startsWith('us') ? 'us' : 'hk',
  }), [selectedCode, selectedName, klineData]);

  const isSelectedInWatchlist = inWatchlist(selectedCode);

  const selectFromWatchlist = (stock) => {
    setSelectedCode(stock.code);
    setSearchKeyword('');
    setSearchResults([]);
  };

  const fmtVol = (v) => {
    if (!v) return '--';
    if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(2) + '万';
    return String(v);
  };

  // 趋势方向 → 中文 + 语义 class
  const trendLabel = analysis?.trend === 'up' ? '短期向上' : analysis?.trend === 'down' ? '短期向下' : '横盘整理';
  const trendClass = analysis?.trend === 'up' ? 'up' : analysis?.trend === 'down' ? 'down' : 'flat';

  return (
    <div className="stock-page stock-page-v2">
      <header className="stock-header">
        <div className="stock-header-left">
          <div className="workbench-section-label">Market Motion</div>
          <h1 className="stock-title">股市动向</h1>
        </div>
        <div className="stock-header-actions">
          <div className="stock-search">
            {ICONS.search}
            <input
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="搜索股票代码/名称（如 600519 / 茅台 / AAPL）"
            />
            {searchResults.length > 0 && (
              <>
                <div className="dropdown-backdrop" onClick={() => setSearchResults([])} />
                <div className="stock-search-dropdown">
                  {searchResults.map(s => (
                    <button
                      key={s.secid}
                      className="stock-search-item"
                      onMouseEnter={() => previewStock(s.code)}
                      onClick={() => { setSelectedCode(s.code); setSearchResults([]); setSearchKeyword(''); }}
                    >
                      <span className="stock-search-code">{s.code}</span>
                      <span className="stock-search-name">{s.name}</span>
                      <span className="stock-search-market">{s.market}</span>
                      {previewPrice[s.code] !== undefined && (
                        <span className="stock-search-price">{previewPrice[s.code]?.toFixed(2)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            className={`stock-watch-btn ${isSelectedInWatchlist ? 'active' : ''}`}
            onClick={() => toggleStock(selectedStock)}
            title={isSelectedInWatchlist ? '移出自选' : '加入自选'}
          >
            {ICONS.star}<span>{isSelectedInWatchlist ? '已自选' : '加自选'}</span>
          </button>
          <button className="btn-refresh" onClick={loadDashboard}>{ICONS.refresh}<span>刷新</span></button>
        </div>
      </header>

      {/* 大盘指数看板 */}
      <section className="stock-indices">
        <div className="stock-section-label">大盘指数</div>
        <div className="stock-indices-grid">
          {(dashboard?.indices || []).map(idx => (
            <button
              key={idx.secid}
              className={`stock-index-card ${idx.changePct >= 0 ? 'up' : 'down'} ${selectedCode === idx.code ? 'active' : ''}`}
              onClick={() => setSelectedCode(idx.code)}
            >
              <div className="stock-index-name">{idx.name}</div>
              <div className="stock-index-price">{idx.price?.toFixed(2)}</div>
              <div className="stock-index-change">
                {idx.change >= 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.changePct >= 0 ? '+' : ''}{idx.changePct?.toFixed(2)}%)
              </div>
            </button>
          ))}
          {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="stock-index-card skeleton" />)}
          {!loading && (dashboard?.indices || []).length === 0 && (
            <div className="stock-empty">暂无数据（可能网络受限，部署后可正常获取）</div>
          )}
        </div>
      </section>

      {/* K线 + 分析区 */}
      <section className="stock-detail">
        <div className="stock-chart-panel">
          <div className="stock-chart-head">
            <div className="stock-chart-title">
              {klineData?.name || '上证指数'} <span className="stock-chart-code">{klineData?.code}</span>
            </div>
            <div className="stock-chart-period">
              {[['101', '日K'], ['102', '周K'], ['103', '月K']].map(([k, label]) => (
                <button key={k} className={`stock-period-btn ${period === k ? 'active' : ''}`} onClick={() => setPeriod(k)}>{label}</button>
              ))}
            </div>
          </div>
          {realtime && (
            <div className={`stock-realtime ${realtime.changePct >= 0 ? 'up' : 'down'}`}>
              <span className="stock-rt-price">{realtime.price?.toFixed(2)}</span>
              <span className="stock-rt-change">{realtime.change >= 0 ? '+' : ''}{realtime.change?.toFixed(2)} ({realtime.changePct >= 0 ? '+' : ''}{realtime.changePct?.toFixed(2)}%)</span>
              <span className="stock-rt-meta">
                开 {realtime.open?.toFixed(2)} · 高 {realtime.high?.toFixed(2)} · 低 {realtime.low?.toFixed(2)}
                {realtime.amount ? ` · 额 ${fmtVol(realtime.amount)}` : ''}
              </span>
            </div>
          )}
          <div className="stock-chart-wrap">
            <KLineChart klineData={klineData} period={period} code={selectedCode} name={selectedName} />
          </div>
        </div>

        <div className="stock-analysis-panel">
          <div className="stock-analysis-head">
            <div className="stock-analysis-title">
              {analysis?.aiPowered ? 'AI 研判' : '算法研判'}
              {!hasLlm && <span className="stock-analysis-badge">退级模式</span>}
            </div>
            <button className="stock-ai-btn" onClick={runAiAnalysis} disabled={analyzing || !klineData}>
              {analyzing ? '分析中...' : hasLlm ? 'AI 分析' : '重新分析'}
            </button>
          </div>

          {analysis && (
            <>
              {/* 趋势结论卡 —— 视觉焦点 */}
              <div className={`stock-verdict ${trendClass}`}>
                <div className="stock-verdict-label">
                  {analysis.aiPowered ? 'AI 结论' : '算法结论'}
                </div>
                <div className="stock-verdict-trend">
                  {analysis.trend === 'up' ? '↑' : analysis.trend === 'down' ? '↓' : '→'} {trendLabel}
                </div>
                {analysis.chg5 !== undefined && (
                  <div className="stock-verdict-chg">
                    近5日 <strong>{analysis.chg5 >= 0 ? '+' : ''}{analysis.chg5.toFixed(2)}%</strong>
                    {' · '}波动率 <strong>{analysis.volatility?.toFixed(2)}%</strong>
                  </div>
                )}
              </div>

              {/* 信号 chips —— 横向流式 */}
              {(analysis.signals || []).length > 0 && (
                <div className="stock-signal-chips">
                  {(analysis.signals || []).map((s, i) => (
                    <span key={i} className={`stock-signal-chip ${s.type}`}>
                      <span className="stock-signal-chip-dot" />
                      {s.text}
                    </span>
                  ))}
                </div>
              )}

              {/* 关键指标 —— 紧凑横向条 */}
              {analysis.ma5 && (
                <div className="stock-metrics-row">
                  <div className="stock-metric-mini"><span>MA5</span><strong>{analysis.ma5.toFixed(2)}</strong></div>
                  <div className="stock-metric-mini"><span>MA20</span><strong>{analysis.ma20.toFixed(2)}</strong></div>
                  <div className="stock-metric-mini"><span>量比</span><strong>{analysis.volRatio.toFixed(2)}</strong></div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 我的自选 */}
      <section className="stock-watchlist">
        <div className="stock-section-label">
          我的自选
          {watchlist.length > 0 && <span className="stock-watchlist-count">{watchlist.length}</span>}
        </div>
        {watchlist.length === 0 ? (
          <div className="stock-watchlist-empty">
            <p>还没有自选股票</p>
            <span>搜索个股或点击「加自选」开始跟踪</span>
          </div>
        ) : (
          <div className="stock-watchlist-grid">
            {watchlist.map((s, i) => (
              <div key={s.code} className="stock-watch-item">
                <button className="stock-watch-main" onClick={() => selectFromWatchlist(s)}>
                  <span className="stock-watch-name">{s.name}</span>
                  <span className="stock-watch-code">{s.code}</span>
                </button>
                <div className="stock-watch-ops">
                  <button className="stock-watch-op" disabled={i === 0} onClick={() => moveStock(s.code, 'up')} title="上移">↑</button>
                  <button className="stock-watch-op" disabled={i === watchlist.length - 1} onClick={() => moveStock(s.code, 'down')} title="下移">↓</button>
                  <button className="stock-watch-op remove" onClick={() => toggleStock(s)} title="移除">{ICONS.trash}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 热门个股 */}
      <section className="stock-hot">
        <div className="stock-section-label">热门个股</div>
        <div className="stock-hot-grid">
          {(dashboard?.stocks || []).map(s => (
            <button
              key={s.secid}
              className={`stock-hot-card ${s.changePct >= 0 ? 'up' : 'down'} ${selectedCode === s.code ? 'active' : ''}`}
              onClick={() => setSelectedCode(s.code)}
            >
              <div className="stock-hot-name">{s.name}</div>
              <div className="stock-hot-price">{s.price?.toFixed(2)}</div>
              <div className="stock-hot-change">{s.changePct >= 0 ? '+' : ''}{s.changePct?.toFixed(2)}%</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
