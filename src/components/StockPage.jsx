/**
 * StockPage — 股市动向（三栏行情终端）
 * 左：自选/热门列表  中：分时/K线主图  右：五档盘口 + 指标
 * 数据源：东方财富（主）+ 腾讯（降级）
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { init, dispose } from 'klinecharts';
import { ICONS } from '../constants/index.jsx';
import { useStockWatchlist } from '../hooks/useStockWatchlist.js';
import { useStockAi, ALERT_CONDITIONS } from '../hooks/useStockAi.js';

const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#22c55e';

const PERIOD_OPTIONS = [
  { id: 'timeline', label: '分时' },
  { id: '101', label: '日K' },
  { id: '102', label: '周K' },
  { id: '103', label: '月K' },
];

const KLINE_PERIOD_MAP = { '101': { type: 'day', span: 1 }, '102': { type: 'week', span: 1 }, '103': { type: 'month', span: 1 } };

// ===== klinecharts K线图 =====
function KLineChart({ klineData, period, code }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const toKLineData = useCallback((klines) => (klines || []).map(k => ({
    timestamp: new Date(k.date).getTime(),
    open: k.open, high: k.high, low: k.low, close: k.close,
    volume: k.volume, turnover: k.amount,
  })), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current, {
      styles: {
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: UP_COLOR, downColor: DOWN_COLOR, noChangeColor: '#888',
            upBorderColor: UP_COLOR, downBorderColor: DOWN_COLOR,
            upWickColor: UP_COLOR, downWickColor: DOWN_COLOR,
          },
          priceMark: { last: { upColor: UP_COLOR, downColor: DOWN_COLOR } },
        },
        yAxis: { position: 'right' },
        crosshair: {
          horizontal: { line: { style: 'dashed', dashedValue: [4, 2] }, text: { backgroundColor: '#1f2937' } },
          vertical: { line: { style: 'dashed', dashedValue: [4, 2] }, text: { backgroundColor: '#1f2937' } },
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;
    chart.createIndicator({ name: 'MA', calcParams: [5, 10, 20], shortName: 'MA' }, { id: 'ma_pane', isStack: true });
    chart.createIndicator({ name: 'VOL', shortName: 'VOL' }, { id: 'vol_pane' });
    return () => { if (containerRef.current) dispose(containerRef.current); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const list = toKLineData(klineData?.klines);
    chart.setSymbol({ ticker: code || 'INDEX', pricePrecision: 2, volumePrecision: 0 });
    chart.setPeriod(KLINE_PERIOD_MAP[period] || KLINE_PERIOD_MAP['101']);
    chart.setDataLoader({ getBars: ({ callback }) => callback(list, { backward: false, forward: false }) });
  }, [klineData, period, code, toKLineData]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !containerRef.current) return;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!klineData?.klines?.length) return <div className="stock-chart-empty">暂无K线数据</div>;
  return <div className="stock-kline-container" ref={containerRef} />;
}

// ===== 分时图（纯 SVG） =====
function TimelineChart({ points, preClose }) {
  if (!points || points.length === 0) return <div className="stock-chart-empty">暂无分时数据</div>;
  const W = 800, H = 420, pad = { top: 16, right: 56, bottom: 28, left: 8 };
  const w = W - pad.left - pad.right, h = H - pad.top - pad.bottom;
  const prices = points.flatMap(p => [p.price, p.avg, preClose].filter(v => v > 0));
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const x = i => pad.left + (i / (points.length - 1 || 1)) * w;
  const y = p => pad.top + (1 - (p - min) / range) * h;
  const pathPrice = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.price)}`).join(' ');
  const pathAvg = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.avg)}`).join(' ');
  const yZero = preClose > 0 ? y(preClose) : null;
  const up = points[points.length - 1].price >= preClose;
  const lineColor = up ? UP_COLOR : DOWN_COLOR;

  return (
    <svg className="stock-timeline-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={pad.left} y1={pad.top + t * h} x2={pad.left + w} y2={pad.top + t * h} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 4" />
          <text x={W - pad.right + 4} y={pad.top + t * h + 4} fill="var(--text-muted)" fontSize="10">
            {(max - t * range).toFixed(2)}
          </text>
        </g>
      ))}
      {yZero !== null && <line x1={pad.left} y1={yZero} x2={pad.left + w} y2={yZero} stroke="var(--text-muted)" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.6" />}
      <path d={pathAvg} fill="none" stroke="var(--accent-amber)" strokeWidth="1" opacity="0.7" />
      <path d={pathPrice} fill="none" stroke={lineColor} strokeWidth="1.4" />
      <path d={`${pathPrice} L ${x(points.length - 1)} ${pad.top + h} L ${pad.left} ${pad.top + h} Z`} fill={lineColor} opacity="0.08" />
      {[0, 0.5, 1].map(t => {
        const idx = Math.floor(t * (points.length - 1));
        return <text key={t} x={x(idx)} y={H - 8} fill="var(--text-muted)" fontSize="10" textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}>{points[idx]?.time?.slice(11)}</text>;
      })}
    </svg>
  );
}

// ===== 五档盘口 =====
function OrderBook({ realtime }) {
  const asks = realtime?.asks || [];
  const bids = realtime?.bids || [];
  if (asks.length === 0 && bids.length === 0) {
    return <div className="stock-orderbook-empty">暂无盘口数据</div>;
  }
  // 卖档倒序（卖5在上，卖1在下）
  const asksDesc = [...asks].reverse();
  const maxVol = Math.max(...asks.map(a => a.volume), ...bids.map(b => b.volume), 1);
  return (
    <div className="stock-orderbook">
      <div className="stock-orderbook-rows">
        {asksDesc.map((a, i) => (
          <div key={`a${i}`} className="stock-orderbook-row ask">
            <span className="ob-label">卖{asks.length - i}</span>
            <span className="ob-price">{a.price.toFixed(2)}</span>
            <span className="ob-vol">{a.volume}</span>
            <span className="ob-bar" style={{ width: `${(a.volume / maxVol) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="stock-orderbook-mid">
        <span className={realtime.changePct >= 0 ? 'up' : 'down'}>{realtime.price?.toFixed(2)}</span>
        <em>{realtime.changePct >= 0 ? '+' : ''}{realtime.changePct?.toFixed(2)}%</em>
      </div>
      <div className="stock-orderbook-rows">
        {bids.map((b, i) => (
          <div key={`b${i}`} className="stock-orderbook-row bid">
            <span className="ob-label">买{i + 1}</span>
            <span className="ob-price">{b.price.toFixed(2)}</span>
            <span className="ob-vol">{b.volume}</span>
            <span className="ob-bar" style={{ width: `${(b.volume / maxVol) * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StockPage({ llmConfig, onOpenLlmConfig }) {
  const { watchlist, inWatchlist, toggleStock, moveStock } = useStockWatchlist();
  const ai = useStockAi(llmConfig);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState('sh000001');
  const [selectedName, setSelectedName] = useState('上证指数');
  const [klineData, setKlineData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [period, setPeriod] = useState('timeline');

  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [listTab, setListTab] = useState('hot'); // hot | watchlist

  // 早报弹窗
  const [showBriefing, setShowBriefing] = useState(false);
  // 监控配置弹窗
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [alertConditions, setAlertConditions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('stockAlertConditions') || '{}'); } catch { return {}; }
  });
  const setAlertCondition = (code, condId) => {
    setAlertConditions(prev => {
      const next = { ...prev };
      if (condId) next[code] = condId; else delete next[code];
      try { localStorage.setItem('stockAlertConditions', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        fetch('/api/stock/dashboard'),
        fetch('/api/stock/sectors?type=industry'),
      ]);
      setDashboard(await dRes.json());
      const sd = await sRes.json();
      setSectors(sd?.sectors || []);
    } catch { setDashboard(null); }
    setLoading(false);
  }, []);

  // 触发 AI 诊断（自动加载日K数据供诊断用）
  const runDiagnosis = useCallback(async () => {
    let klineForDiag = klineData;
    // 当前是分时图时，临时拉一份日K供诊断
    if (period === 'timeline' || !klineForDiag) {
      try {
        const res = await fetch(`/api/stock/kline?code=${selectedCode}&period=101&count=30`);
        klineForDiag = await res.json();
      } catch { /* ignore */ }
    }
    ai.diagnoseStock({
      stock: { name: selectedName, code: selectedCode },
      kline: klineForDiag,
      realtime,
      sectors,
    });
  }, [ai, klineData, period, selectedCode, selectedName, realtime, sectors]);

  // 触发 AI 早报
  const runBriefing = useCallback(() => {
    ai.generateMorningBrief({
      indices: dashboard?.indices || [],
      stocks: dashboard?.stocks || [],
      sectors,
    });
    setShowBriefing(true);
  }, [ai, dashboard, sectors]);

  // 触发自选监控
  const runAlerts = useCallback(() => {
    ai.checkAlerts(watchlist, alertConditions);
  }, [ai, watchlist, alertConditions]);

  const loadStock = useCallback(async (code) => {
    setKlineData(null); setTimelineData(null); setRealtime(null);
    try {
      const rRes = await fetch(`/api/stock/realtime?code=${code}`);
      const r = await rRes.json();
      setRealtime(r);
      setSelectedName(r?.name || code);
      // 分时图（指数和个股都支持）
      const tRes = await fetch(`/api/stock/timeline?code=${code}`);
      setTimelineData(await tRes.json());
    } catch { /* ignore */ }
  }, []);

  // K线按需加载（切到日K/周K/月K时）
  useEffect(() => {
    if (period === 'timeline' || !selectedCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/stock/kline?code=${selectedCode}&period=${period}&count=120`);
        const data = await res.json();
        if (!cancelled) setKlineData(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [selectedCode, period]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (selectedCode) loadStock(selectedCode); }, [selectedCode, loadStock]);

  const doSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;
    try { const res = await fetch(`/api/stock/search?keyword=${encodeURIComponent(searchKeyword)}`); setSearchResults(await res.json()); }
    catch { setSearchResults([]); }
  }, [searchKeyword]);

  const isSelectedInWatchlist = inWatchlist(selectedCode);
  const selectedStock = useMemo(() => ({
    code: selectedCode, name: selectedName,
    secid: realtime?.secid || '',
  }), [selectedCode, selectedName, realtime]);

  const fmtVol = (v) => {
    if (!v) return '--';
    if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
    if (v >= 1e4) return (v / 1e4).toFixed(2) + '万';
    return String(v);
  };

  // 关键指标
  const metrics = useMemo(() => {
    if (!realtime) return [];
    const turnover = realtime.amount && realtime.price ? (realtime.amount / (realtime.price * 100)) : null;
    return [
      { label: '今开', value: realtime.open?.toFixed(2) || '--' },
      { label: '最高', value: realtime.high?.toFixed(2) || '--' },
      { label: '最低', value: realtime.low?.toFixed(2) || '--' },
      { label: '昨收', value: realtime.prevClose?.toFixed(2) || '--' },
      { label: '成交量', value: fmtVol(realtime.volume) },
      { label: '成交额', value: fmtVol(realtime.amount) },
    ];
  }, [realtime]);

  // 列表数据（热门或自选）
  const listItems = listTab === 'watchlist' ? watchlist : (dashboard?.stocks || []);

  const pickStock = (code, name) => {
    setSelectedCode(code);
    setSearchKeyword('');
    setSearchResults([]);
  };

  return (
    <div className="stock-page stock-page-v3">
      {/* 顶栏 */}
      <header className="stock3-header">
        <div className="stock3-search">
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
                  <button key={s.secid} className="stock-search-item" onClick={() => pickStock(s.code, s.name)}>
                    <span className="stock-search-code">{s.code}</span>
                    <span className="stock-search-name">{s.name}</span>
                    <span className="stock-search-market">{s.market}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button className={`stock-watch-btn ${isSelectedInWatchlist ? 'active' : ''}`} onClick={() => toggleStock(selectedStock)} title={isSelectedInWatchlist ? '移出自选' : '加入自选'}>
          {ICONS.star}<span>{isSelectedInWatchlist ? '已自选' : '加自选'}</span>
        </button>
        <button className="stock-ai-action" onClick={runBriefing} title="AI 生成今日市场早报">
          {ICONS.sparkle}<span>AI 早报</span>
        </button>
        <button className="btn-refresh" onClick={loadDashboard}>{ICONS.refresh}<span>刷新</span></button>
      </header>

      {/* 大盘指数横条 */}
      <section className="stock3-indices">
        {(dashboard?.indices || []).map(idx => (
          <button key={idx.secid} className={`stock3-index ${idx.changePct >= 0 ? 'up' : 'down'} ${selectedCode === idx.code ? 'active' : ''}`} onClick={() => setSelectedCode(idx.code)}>
            <span className="idx-name">{idx.name}</span>
            <span className="idx-price">{idx.price?.toFixed(2)}</span>
            <span className="idx-chg">{idx.changePct >= 0 ? '+' : ''}{idx.changePct?.toFixed(2)}%</span>
          </button>
        ))}
        {loading && <span className="stock3-index-skeleton">加载中…</span>}
      </section>

      {/* 三栏主体 */}
      <div className="stock3-body">
        {/* 左栏：列表 */}
        <aside className="stock3-left">
          <div className="stock3-left-tabs">
            <button className={`stock3-left-tab ${listTab === 'hot' ? 'active' : ''}`} onClick={() => setListTab('hot')}>热门</button>
            <button className={`stock3-left-tab ${listTab === 'watchlist' ? 'active' : ''}`} onClick={() => setListTab('watchlist')}>自选 {watchlist.length > 0 && `(${watchlist.length})`}</button>
            {listTab === 'watchlist' && watchlist.length > 0 && (
              <button className="stock3-left-tab stock-alert-tab" onClick={() => setShowAlertConfig(true)} title="智能监控配置">
                {ICONS.sparkle}<span>监控</span>
              </button>
            )}
          </div>
          {listTab === 'watchlist' && ai.alertResults.length > 0 && (
            <div className="stock-alert-hits">
              <div className="stock-alert-hits-label">命中提醒</div>
              {ai.alertResults.map((h, i) => (
                <div key={i} className={`stock-alert-hit ${(h.realtime.changePct || 0) >= 0 ? 'up' : 'down'}`}>
                  <strong>{h.stock.name}</strong>
                  <span className="stock-alert-hit-price">{h.realtime.price?.toFixed(2)} ({h.realtime.changePct >= 0 ? '+' : ''}{h.realtime.changePct?.toFixed(2)}%)</span>
                  <p>{h.aiText}</p>
                </div>
              ))}
            </div>
          )}
          <div className="stock3-left-list">
            {listTab === 'watchlist' && watchlist.length === 0 && (
              <div className="stock3-list-empty">还没有自选，搜索个股后点「加自选」</div>
            )}
            {listItems.map(s => (
              <button key={s.code} className={`stock3-list-item ${selectedCode === s.code ? 'active' : ''} ${(s.changePct || 0) >= 0 ? 'up' : 'down'}`} onClick={() => pickStock(s.code, s.name)}>
                <div className="li-name-row">
                  <span className="li-name">{s.name}</span>
                  <span className="li-price">{s.price?.toFixed(2)}</span>
                </div>
                <div className="li-code-row">
                  <span className="li-code">{s.code}</span>
                  <span className="li-chg">{s.changePct !== undefined ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '--'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 中栏：主图 */}
        <main className="stock3-main">
          <div className="stock3-chart-head">
            <div className="stock3-title">
              <h2>{selectedName}</h2>
              <span className="stock3-code">{selectedCode}</span>
              {realtime && (
                <span className={`stock3-price ${realtime.changePct >= 0 ? 'up' : 'down'}`}>
                  <strong>{realtime.price?.toFixed(2)}</strong>
                  <em>{realtime.change >= 0 ? '+' : ''}{realtime.change?.toFixed(2)} ({realtime.changePct >= 0 ? '+' : ''}{realtime.changePct?.toFixed(2)}%)</em>
                </span>
              )}
            </div>
            <div className="stock3-period">
              {PERIOD_OPTIONS.map(p => (
                <button key={p.id} className={`stock3-period-btn ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="stock3-chart-wrap">
            {period === 'timeline'
              ? <TimelineChart points={timelineData?.points} preClose={timelineData?.preClose} />
              : <KLineChart klineData={klineData} period={period} code={selectedCode} />}
          </div>
        </main>

        {/* 右栏：盘口 + 指标 */}
        <aside className="stock3-right">
          <section className="stock3-panel">
            <div className="stock3-panel-label">五档盘口</div>
            <OrderBook realtime={realtime} />
          </section>
          <section className="stock3-panel">
            <div className="stock3-panel-label">关键指标</div>
            <div className="stock3-metrics">
              {metrics.map(m => (
                <div key={m.label} className="stock3-metric"><span>{m.label}</span><strong>{m.value}</strong></div>
              ))}
            </div>
          </section>

          {/* AI 个股诊断 */}
          <section className="stock3-panel stock-ai-panel">
            <div className="stock3-panel-label">
              AI 个股诊断
              {!ai.llmReady && <span className="stock-ai-unready" onClick={onOpenLlmConfig}>未配置</span>}
            </div>
            {ai.llmReady ? (
              <>
                {!ai.diagnosis && !ai.diagnosing && !ai.diagnoseError && (
                  <button className="stock-ai-run" onClick={runDiagnosis} disabled={!realtime}>
                    {ICONS.sparkle}<span>生成 AI 诊断</span>
                  </button>
                )}
                {ai.diagnosing && <div className="stock-ai-loading"><div className="spinner" /><span>AI 分析中…</span></div>}
                {ai.diagnoseError && <div className="stock-ai-error">{ai.diagnoseError}<button onClick={runDiagnosis}>重试</button></div>}
                {ai.diagnosis && (
                  <div className="stock-ai-result">
                    <div className="stock-ai-text">{ai.diagnosis.content}</div>
                    <button className="stock-ai-rerun" onClick={runDiagnosis} disabled={ai.diagnosing}>{ICONS.refresh}<span>重新诊断</span></button>
                  </div>
                )}
              </>
            ) : (
              <div className="stock-ai-guide">
                <p>配置大模型后，AI 可综合 K线、盘口、板块给出个股诊断。</p>
                <button onClick={onOpenLlmConfig}>配置大模型</button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* AI 早报弹窗 */}
      {showBriefing && (
        <div className="stock-modal-overlay" onClick={() => setShowBriefing(false)}>
          <div className="stock-modal stock-briefing-modal" onClick={e => e.stopPropagation()}>
            <div className="stock-modal-head">
              <h3>{ICONS.sparkle} AI 市场早报</h3>
              <button className="stock-modal-close" onClick={() => setShowBriefing(false)}>×</button>
            </div>
            <div className="stock-modal-body">
              {!ai.llmReady ? (
                <div className="stock-ai-guide">
                  <p>配置大模型后，AI 可生成今日市场早报。</p>
                  <button onClick={() => { setShowBriefing(false); onOpenLlmConfig?.(); }}>配置大模型</button>
                </div>
              ) : ai.briefingLoading ? (
                <div className="stock-ai-loading"><div className="spinner" /><span>正在生成早报…</span></div>
              ) : ai.briefingError ? (
                <div className="stock-ai-error">{ai.briefingError}<button onClick={runBriefing}>重试</button></div>
              ) : ai.briefing ? (
                <div className="stock-briefing-text">{ai.briefing.content}</div>
              ) : (
                <div className="stock-ai-guide"><p>点击下方按钮生成今日市场早报。</p></div>
              )}
            </div>
            {ai.llmReady && !ai.briefingLoading && (
              <div className="stock-modal-foot">
                <button className="stock-ai-run" onClick={runBriefing}>{ICONS.refresh}<span>{ai.briefing ? '重新生成' : '生成早报'}</span></button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 智能监控配置弹窗 */}
      {showAlertConfig && (
        <div className="stock-modal-overlay" onClick={() => setShowAlertConfig(false)}>
          <div className="stock-modal stock-alert-modal" onClick={e => e.stopPropagation()}>
            <div className="stock-modal-head">
              <h3>{ICONS.sparkle} 自选股智能监控</h3>
              <button className="stock-modal-close" onClick={() => setShowAlertConfig(false)}>×</button>
            </div>
            <div className="stock-modal-body">
              {!ai.llmReady ? (
                <div className="stock-ai-guide">
                  <p>配置大模型后，AI 可监控自选股异动并生成提醒。</p>
                  <button onClick={() => { setShowAlertConfig(false); onOpenLlmConfig?.(); }}>配置大模型</button>
                </div>
              ) : watchlist.length === 0 ? (
                <div className="stock-ai-guide"><p>还没有自选股，先添加自选再设置监控。</p></div>
              ) : (
                <>
                  <div className="stock-alert-run-bar">
                    <span>为每只自选股设置监控条件，AI 命中后生成提醒文案。</span>
                    <button className="stock-ai-run" onClick={runAlerts} disabled={ai.alertChecking}>
                      {ai.alertChecking ? '检查中…' : '立即检查'}
                    </button>
                  </div>
                  <div className="stock-alert-config-list">
                    {watchlist.map(s => (
                      <div key={s.code} className="stock-alert-config-row">
                        <div className="stock-alert-config-name">
                          <strong>{s.name}</strong>
                          <span>{s.code}</span>
                        </div>
                        <select value={alertConditions[s.code] || ''} onChange={e => setAlertCondition(s.code, e.target.value)}>
                          <option value="">不监控</option>
                          {ALERT_CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
