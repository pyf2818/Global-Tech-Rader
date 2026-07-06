/**
 * StockPage — 股市动向模块
 * 含：大盘看板 / 个股搜索 / K线图 / AI 分析（无 LLM 配置时退级为算法分析）
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ICONS } from '../constants/index.jsx';

// 算法分析（退级方案，无 LLM 时使用）
function algorithmicAnalysis(klineData, realtime) {
  if (!klineData?.klines || klineData.klines.length === 0) {
    return { summary: '暂无足够数据进行分析', signals: [], trend: 'unknown' };
  }
  const klines = klineData.klines;
  const last = klines[klines.length - 1];
  const closes = klines.map(k => k.close);
  const n = closes.length;

  // 趋势：5日均线 vs 20日均线
  const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, n);
  const ma20 = n >= 20 ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 : ma5;
  const trend = ma5 > ma20 ? 'up' : ma5 < ma20 ? 'down' : 'flat';

  // 近期涨跌幅
  const recent5 = closes.slice(-6);
  const chg5 = recent5.length >= 2 ? ((recent5[recent5.length - 1] - recent5[0]) / recent5[0]) * 100 : 0;

  // 波动率（标准差/均值）
  const mean = closes.reduce((a, b) => a + b, 0) / n;
  const variance = closes.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  // 成交量趋势
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

// 迷你 K 线 SVG 图（自包含，无依赖）
function MiniKline({ klines, width = 600, height = 240 }) {
  if (!klines || klines.length === 0) return <div className="stock-chart-empty">暂无K线数据</div>;
  const padding = { top: 10, right: 50, bottom: 20, left: 10 };
  const w = width - padding.left - padding.right;
  const h = height - padding.top - padding.bottom;
  const prices = klines.flatMap(k => [k.high, k.low]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const cw = w / klines.length;
  const x = i => padding.left + i * cw + cw / 2;
  const y = p => padding.top + (1 - (p - min) / range) * h;

  const pathClose = klines.map((k, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(k.close)}`).join(' ');
  const pathMA5 = (() => {
    if (klines.length < 5) return '';
    const pts = [];
    for (let i = 4; i < klines.length; i++) {
      const ma = klines.slice(i - 4, i + 1).reduce((a, b) => a + b.close, 0) / 5;
      pts.push(`${i === 4 ? 'M' : 'L'} ${x(i)} ${y(ma)}`);
    }
    return pts.join(' ');
  })();

  return (
    <svg className="stock-kline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={padding.left} y1={padding.top + t * h} x2={padding.left + w} y2={padding.top + t * h}
          stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="2 4" />
      ))}
      {/* K线柱 */}
      {klines.map((k, i) => {
        const up = k.close >= k.open;
        const color = up ? 'var(--signal-positive)' : 'var(--signal-critical)';
        const bodyTop = y(Math.max(k.open, k.close));
        const bodyH = Math.max(1, Math.abs(y(k.open) - y(k.close)));
        return (
          <g key={i}>
            <line x1={x(i)} y1={y(k.high)} x2={x(i)} y2={y(k.low)} stroke={color} strokeWidth="1" />
            <rect x={x(i) - cw * 0.3} y={bodyTop} width={cw * 0.6} height={bodyH} fill={color} opacity="0.9" />
          </g>
        );
      })}
      {/* 收盘价折线 */}
      <path d={pathClose} fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" opacity="0.5" />
      {/* MA5 */}
      {pathMA5 && <path d={pathMA5} fill="none" stroke="var(--accent-amber)" strokeWidth="1.2" opacity="0.85" />}
      {/* 价格标签 */}
      <text x={width - padding.right + 4} y={y(max) + 4} fill="var(--text-muted)" fontSize="10">{max.toFixed(2)}</text>
      <text x={width - padding.right + 4} y={y(min) + 4} fill="var(--text-muted)" fontSize="10">{min.toFixed(2)}</text>
    </svg>
  );
}

export default function StockPage({ llmConfig, categories }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState('sh000001');
  const [klineData, setKlineData] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [period, setPeriod] = useState('101');

  // 加载看板
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stock/dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch { setDashboard(null); }
    setLoading(false);
  }, []);

  // 加载个股 K线 + 实时
  const loadStock = useCallback(async (code) => {
    setKlineData(null); setRealtime(null); setAnalysis(null);
    try {
      const [kRes, rRes] = await Promise.all([
        fetch(`/api/stock/kline?code=${code}&period=${period}&count=60`),
        fetch(`/api/stock/realtime?code=${code}`),
      ]);
      const k = await kRes.json();
      const r = await rRes.json();
      setKlineData(k);
      setRealtime(r);
      // 自动生成算法分析（退级方案）
      setAnalysis(algorithmicAnalysis(k, r));
    } catch { /* ignore */ }
  }, [period]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (selectedCode) loadStock(selectedCode); }, [selectedCode, loadStock]);

  // 搜索
  const doSearch = useCallback(async () => {
    if (!searchKeyword.trim()) return;
    try {
      const res = await fetch(`/api/stock/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults([]); }
  }, [searchKeyword]);

  // AI 分析（有 LLM 配置时调用，否则用算法分析）
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
        // 退级：算法分析（已在 loadStock 时生成，这里只是重新触发动画）
        setAnalysis(a => ({ ...a }));
      }
    } catch { /* ignore */ }
    setAnalyzing(false);
  }, [klineData, realtime, llmConfig]);

  const hasLlm = llmConfig?.baseUrl && llmConfig?.apiKey && llmConfig?.selectedModel;

  return (
    <div className="stock-page">
      <header className="stock-header">
        <div>
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
              <div className="stock-search-dropdown">
                {searchResults.map(s => (
                  <button key={s.secid} className="stock-search-item" onClick={() => { setSelectedCode(s.code); setSearchResults([]); setSearchKeyword(''); }}>
                    <span className="stock-search-code">{s.code}</span>
                    <span className="stock-search-name">{s.name}</span>
                    <span className="stock-search-market">{s.market}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
              <span className="stock-rt-meta">开 {realtime.open?.toFixed(2)} · 高 {realtime.high?.toFixed(2)} · 低 {realtime.low?.toFixed(2)}</span>
            </div>
          )}
          <div className="stock-chart-wrap">
            <MiniKline klines={klineData?.klines || []} />
          </div>
        </div>

        <div className="stock-analysis-panel">
          <div className="stock-analysis-head">
            <div className="stock-analysis-title">
              {analysis?.aiPowered ? 'AI 研判' : '算法研判'}
              {!hasLlm && <span className="stock-analysis-badge">退级模式</span>}
            </div>
            <button className="stock-ai-btn" onClick={runAiAnalysis} disabled={analyzing || !klineData}>
              {analyzing ? '分析中...' : hasLlm ? 'AI 重新分析' : '重新分析'}
            </button>
          </div>
          {analysis && (
            <>
              <div className="stock-analysis-summary">{analysis.summary}</div>
              <div className="stock-analysis-signals">
                {(analysis.signals || []).map((s, i) => (
                  <div key={i} className={`stock-signal ${s.type}`}>
                    <span className="stock-signal-dot" />
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
              {analysis.ma5 && (
                <div className="stock-analysis-metrics">
                  <div className="stock-metric"><span>MA5</span><strong>{analysis.ma5.toFixed(2)}</strong></div>
                  <div className="stock-metric"><span>MA20</span><strong>{analysis.ma20.toFixed(2)}</strong></div>
                  <div className="stock-metric"><span>波动率</span><strong>{analysis.volatility.toFixed(2)}%</strong></div>
                  <div className="stock-metric"><span>量比</span><strong>{analysis.volRatio.toFixed(2)}</strong></div>
                </div>
              )}
            </>
          )}
        </div>
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
