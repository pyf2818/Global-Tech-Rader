/**
 * StockPage — 股市动向（三栏行情终端）
 * 左：自选/热门列表  中：分时/K线主图  右：五档盘口 + 指标
 * 数据源：东方财富（主）+ 腾讯（降级）
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ICONS } from '../constants/index.jsx';
import { useStockWatchlist } from '../hooks/useStockWatchlist.js';
import { useStockAi, ALERT_CONDITIONS } from '../hooks/useStockAi.js';
import { DEFAULT_INVESTOR_POLICY, normalizeInvestorPolicy } from '../domain/stock/investorPolicy.js';
import KLineChart from './stock/KLineChart.jsx';
import { TimelineChart, OrderBook } from './stock/Charts.jsx';
import { ResearchJournal, ResearchChecklist, BriefingContent } from './stock/ResearchTools.jsx';
import { PositionRiskTool, ScenarioAnalysisTool } from './stock/RiskTools.jsx';
import { IntelligenceRadar, InvestorPolicyTool, DecisionEvidenceTool } from './stock/IntelligenceTools.jsx';

const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#22c55e';

const PERIOD_OPTIONS = [
  { id: 'timeline', label: '分时' },
  { id: '5', label: '5分' },
  { id: '15', label: '15分' },
  { id: '30', label: '30分' },
  { id: '60', label: '60分' },
  { id: '101', label: '日K' },
  { id: '102', label: '周K' },
  { id: '103', label: '月K' },
];

const BENCHMARK_OPTIONS = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' },
];

export default function StockPage({ llmConfig, onOpenLlmConfig }) {
  const pageRef = useRef(null);
  const analysisRef = useRef(null);
  const { watchlist, inWatchlist, toggleStock, moveStock } = useStockWatchlist();
  const aiState = useStockAi(llmConfig);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState('sh000001');
  const ai = { ...aiState, diagnosis: aiState.diagnosis?.stock?.code === selectedCode ? aiState.diagnosis : null };
  const [selectedName, setSelectedName] = useState('上证指数');
  const [klineData, setKlineData] = useState(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [klineError, setKlineError] = useState('');
  const [klineReloadKey, setKlineReloadKey] = useState(0);
  const [timelineData, setTimelineData] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [marketDataState, setMarketDataState] = useState({ stale: false, unavailable: false, message: '', timestamp: '' });
  const [sectors, setSectors] = useState([]);
  const [sectorType, setSectorType] = useState('industry'); // industry | concept
  const [period, setPeriod] = useState('timeline');
  const [adjust, setAdjust] = useState(() => localStorage.getItem('stockKlineAdjust') || '1');
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => localStorage.getItem('stockLeftPanelOpen') !== 'false');
  const [rightPanelOpen, setRightPanelOpen] = useState(() => localStorage.getItem('stockRightPanelOpen') !== 'false');
  const [showAnalysis, setShowAnalysis] = useState(() => localStorage.getItem('stockShowAnalysis') !== 'false');
  const [experienceMode, setExperienceMode] = useState(() => localStorage.getItem('stockExperienceMode') || 'beginner');
  const [benchmarkCode, setBenchmarkCode] = useState(() => localStorage.getItem('stockBenchmarkCode') || 'sh000001');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [investorPolicy, setInvestorPolicy] = useState(() => {
    try { return normalizeInvestorPolicy(JSON.parse(localStorage.getItem('stockInvestorPolicyV1') || '{}')); }
    catch { return { ...DEFAULT_INVESTOR_POLICY }; }
  });

  useEffect(() => { localStorage.setItem('stockKlineAdjust', adjust); }, [adjust]);
  useEffect(() => { localStorage.setItem('stockLeftPanelOpen', String(leftPanelOpen)); }, [leftPanelOpen]);
  useEffect(() => { localStorage.setItem('stockRightPanelOpen', String(rightPanelOpen)); }, [rightPanelOpen]);
  useEffect(() => { localStorage.setItem('stockShowAnalysis', String(showAnalysis)); }, [showAnalysis]);
  useEffect(() => { localStorage.setItem('stockExperienceMode', experienceMode); }, [experienceMode]);
  useEffect(() => { localStorage.setItem('stockBenchmarkCode', benchmarkCode); }, [benchmarkCode]);
  useEffect(() => {
    localStorage.setItem('stockInvestorPolicyV1', JSON.stringify(investorPolicy));
    localStorage.setItem('stockRiskCapital', String(investorPolicy.capital));
    localStorage.setItem('stockRiskPercent', String(investorPolicy.riskPerTrade));
  }, [investorPolicy]);
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 搜索
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [listTab, setListTab] = useState('hot'); // hot | watchlist

  // 早报弹窗
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingTab, setBriefingTab] = useState('current');
  const [showResearchTools, setShowResearchTools] = useState(false);
  const [researchToolTab, setResearchToolTab] = useState('risk');
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
        fetch(`/api/stock/sectors?type=${sectorType}`),
      ]);
      setDashboard(await dRes.json());
      const sd = await sRes.json();
      setSectors(sd?.sectors || []);
    } catch { setDashboard(null); }
    setLoading(false);
  }, [sectorType]);

  // 切换板块类型时重新加载板块数据（不重载大盘）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sRes = await fetch(`/api/stock/sectors?type=${sectorType}`);
        const sd = await sRes.json();
        if (!cancelled) setSectors(sd?.sectors || []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [sectorType]);

  // 触发 AI 诊断（自动加载日K数据供诊断用）
  const runDiagnosis = useCallback(async () => {
    let klineForDiag = klineData;
    let benchmarkKline = null;
    // 当前是分时图时，临时拉一份日K供诊断
    if (period === 'timeline' || !klineForDiag) {
      try {
        const res = await fetch(`/api/stock/kline?code=${selectedCode}&period=101&count=30&adjust=${adjust}`);
        klineForDiag = await res.json();
      } catch { /* ignore */ }
    }
    try {
      const benchmarkResponse = await fetch(`/api/stock/kline?code=${benchmarkCode}&period=101&count=60&adjust=${adjust}`);
      benchmarkKline = await benchmarkResponse.json();
    } catch { /* relative strength remains unavailable */ }
    ai.diagnoseStock({
      stock: { name: selectedName, code: selectedCode },
      kline: klineForDiag,
      benchmarkKline,
      benchmark: BENCHMARK_OPTIONS.find(item => item.code === benchmarkCode),
      realtime,
      sectors,
    });
  }, [ai, adjust, benchmarkCode, klineData, period, selectedCode, selectedName, realtime, sectors]);

  // 触发 AI 早报
  const runBriefing = useCallback(() => {
    ai.generateMorningBrief({
      indices: dashboard?.indices || [],
      stocks: dashboard?.stocks || [],
      sectors,
      coverage: dashboard?.coverage,
    });
    setBriefingTab('current');
    setShowBriefing(true);
  }, [ai, dashboard, sectors]);

  // 首次进入股市页自动生成早报：用户进入页面即可看到当日早报，无需主动点击
  // 条件：有 LLM 配置 + dashboard 已加载 + 当日尚未生成过 + 会话内只触发一次
  const autoBriefingTriggeredRef = useRef(false);
  useEffect(() => {
    if (autoBriefingTriggeredRef.current) return;
    // 必须有 LLM 配置才能调用 AI
    if (!llmConfig?.baseUrl || !llmConfig?.selectedModel) return;
    // dashboard 必须已加载（指数 + 热门股）
    if (!dashboard?.indices || dashboard.indices.length === 0) return;
    // 当日已生成过则跳过（按日期+id 检查 briefingHistory）
    const today = new Date().toLocaleDateString('zh-CN');
    const hasToday = (ai.briefingHistory || []).some(r =>
      r?.generatedAt && new Date(r.generatedAt).toLocaleDateString('zh-CN') === today
    );
    if (hasToday) {
      autoBriefingTriggeredRef.current = true;
      return;
    }
    autoBriefingTriggeredRef.current = true;
    // 静默生成，不弹出 modal（用户可在面板查看进度）
    ai.generateMorningBrief({
      indices: dashboard.indices,
      stocks: dashboard.stocks || [],
      sectors,
      coverage: dashboard.coverage,
    });
  }, [llmConfig, dashboard, ai, sectors]);

  // 触发自选监控
  const runAlerts = useCallback(() => {
    ai.checkAlerts(watchlist, alertConditions);
  }, [ai, watchlist, alertConditions]);

  const normalizeRealtimePayload = payload => {
    if (payload?.ok === false) {
      return {
        realtime: null,
        state: {
          stale: false,
          unavailable: true,
          message: payload?.error?.code === 'MARKET_DATA_UNAVAILABLE' ? '行情数据暂不可用' : (payload?.error?.message || '行情数据暂不可用'),
          timestamp: payload?.timestamp || '',
        },
      };
    }
    const quote = payload?.data || payload?.quote || payload;
    return {
      realtime: quote,
      state: {
        stale: Boolean(payload?.stale),
        unavailable: false,
        message: payload?.stale ? '缓存行情' : '',
        timestamp: payload?.timestamp || quote?.timestamp || '',
      },
    };
  };

  const loadStock = useCallback(async (code) => {
    // 体验优化：不清空旧数据，让 UI 保持上一只股票的图表直到新数据到达，消除白屏
    // 仅重置市场数据状态为"加载中"，realtime/kline/timeline 保留，由新数据覆盖
    setMarketDataState({ stale: false, unavailable: false, message: '', timestamp: '' });
    try {
      // 并行获取 realtime + timeline，比串行快 1 RTT
      const [rRes, tRes] = await Promise.all([
        fetch(`/api/stock/realtime?code=${code}`),
        fetch(`/api/stock/timeline?code=${code}`),
      ]);
      const payload = await rRes.json();
      const normalized = normalizeRealtimePayload(payload);
      setRealtime(normalized.realtime);
      setMarketDataState(normalized.state);
      // 后端若返回真实 name 则更新；否则保留 pickStock 已设的 name，避免用 code 覆盖
      const apiName = normalized.realtime?.name;
      if (apiName) setSelectedName(apiName);
      setTimelineData(await tRes.json());
    } catch {
      setMarketDataState({ stale: false, unavailable: true, message: '行情数据暂不可用', timestamp: '' });
    }
  }, []);

  // 相邻自选股预取：用户切股票时大概率会看列表中的下一只，
  // 提前 fire-and-forget 预取相邻股票的 realtime 到服务端缓存（不更新 UI）
  const prefetchAdjacentStock = useCallback((currentCode) => {
    if (!currentCode) return;
    // 仅在自选股 tab 下预取（热门列表太多不预取）
    if (listTab !== 'watchlist') return;
    const items = watchlist || [];
    const idx = items.findIndex(s => s.code === currentCode || s.secid === currentCode);
    if (idx < 0) return;
    // 预取下一只（环绕到 0）
    const next = items[(idx + 1) % items.length];
    if (next && next.code && next.code !== currentCode) {
      // 用 query 参数标记 prefetch，服务端可识别后只填缓存不返回完整响应
      fetch(`/api/stock/realtime?code=${next.code}&prefetch=1`).catch(() => {});
    }
  }, [listTab, watchlist]);

  // 轻量刷新：只拉实时行情，不清空 K线/分时（定时轮询用）
  const refreshRealtime = useCallback(async (code) => {
    try {
      const rRes = await fetch(`/api/stock/realtime?code=${code}`);
      const payload = await rRes.json();
      const normalized = normalizeRealtimePayload(payload);
      setRealtime(normalized.realtime);
      setMarketDataState(normalized.state);
    } catch { /* ignore */ }
  }, []);

  // A 股交易时段感知：交易时段密集轮询，盘后/周末/节假日降频到 60s 省 95% 请求
  // 时段：周一至周五 9:30-11:30 / 13:00-15:00（北京时间）
  const isMarketOpen = useCallback((now = new Date()) => {
    const day = now.getDay(); // 0=周日, 6=周六
    if (day === 0 || day === 6) return false;
    // 节假日简化处理：春节/国庆等大假需要用户自己感知，这里只判周末
    const minutes = now.getHours() * 60 + now.getMinutes();
    const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
    const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
    // 9:25-9:30 集合竞价也算"接近开盘"，给个稍慢的频率
    const preOpen = minutes >= 9 * 60 + 25 && minutes < 9 * 60 + 30;
    return morning || afternoon || preOpen;
  }, []);

  // 实时行情轮询：交易时段 2s，盘后 60s
  useEffect(() => {
    if (!selectedCode) return;
    const interval = isMarketOpen() ? 2000 : 60000;
    const timer = setInterval(() => {
      refreshRealtime(selectedCode);
    }, interval);
    return () => clearInterval(timer);
  }, [selectedCode, refreshRealtime, isMarketOpen, clockNow]);

  // 大盘指数轮询：交易时段 5s，盘后 60s
  useEffect(() => {
    if (!dashboard) return;
    const interval = isMarketOpen() ? 5000 : 60000;
    const timer = setInterval(() => loadDashboard(), interval);
    return () => clearInterval(timer);
  }, [dashboard, loadDashboard, isMarketOpen, clockNow]);

  // K 线轮询：交易时段 10s，盘后不轮询（K 线盘后不变）
  useEffect(() => {
    if (!selectedCode || period === 'timeline') return;
    if (!isMarketOpen()) return; // 盘后 K 线不会变化，不轮询
    const timer = setInterval(() => setKlineReloadKey(k => k + 1), 10000);
    return () => clearInterval(timer);
  }, [selectedCode, period, isMarketOpen, clockNow]);

  // 分时图轮询：交易时段 5s，盘后不轮询
  useEffect(() => {
    if (!selectedCode || period !== 'timeline') return;
    if (!isMarketOpen()) return;
    const timer = setInterval(() => setKlineReloadKey(k => k + 1), 5000);
    return () => clearInterval(timer);
  }, [selectedCode, period, isMarketOpen, clockNow]);

  // K线按需加载（切到日K/周K/月K时）
  useEffect(() => {
    if (period === 'timeline' || !selectedCode) return;
    let cancelled = false;
    (async () => {
      setKlineLoading(true);
      setKlineError('');
      setKlineData(null);
      try {
        const count = ['5', '15', '30', '60'].includes(period) ? 240 : 120;
        const res = await fetch(`/api/stock/kline?code=${selectedCode}&period=${period}&count=${count}&adjust=${adjust}`);
        if (!res.ok) throw new Error(`行情接口返回 ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data?.klines) || data.klines.length === 0) throw new Error('上游未返回当前周期数据');
        if (!cancelled) setKlineData(data);
      } catch (error) {
        if (!cancelled) setKlineError(error?.message || 'K 线加载失败');
      } finally {
        if (!cancelled) setKlineLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCode, period, adjust, klineReloadKey]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (selectedCode) loadStock(selectedCode); }, [selectedCode, loadStock]);

  const doSearch = useCallback(async () => {
    if (!searchKeyword.trim()) { setSearchResults([]); return; }
    try { const res = await fetch(`/api/stock/search?keyword=${encodeURIComponent(searchKeyword)}`); setSearchResults(await res.json()); }
    catch { setSearchResults([]); }
  }, [searchKeyword]);

  // 输入即时搜索（debounce 300ms），不必按回车
  useEffect(() => {
    if (!searchKeyword.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(() => doSearch(), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, doSearch]);

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
  const quoteUpdatedLabel = realtime?.timestamp
    ? new Date(realtime.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';
  const marketClockLabel = new Date(clockNow).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const breadth = useMemo(() => {
    const stocks = dashboard?.stocks || [];
    const up = stocks.filter(s => s.changePct > 0).length;
    const down = stocks.filter(s => s.changePct < 0).length;
    return { up, down, flat: Math.max(stocks.length - up - down, 0), total: stocks.length };
  }, [dashboard]);
  const marketRead = useMemo(() => {
    const index = dashboard?.indices?.[0];
    const change = index?.changePct ?? realtime?.changePct;
    const positive = (change ?? 0) >= 0;
    const crowded = breadth.total > 0 && breadth.down / breadth.total > 0.55;
    return {
      tone: crowded ? '谨慎' : positive ? '偏强' : '偏弱',
      toneClass: crowded ? 'caution' : positive ? 'positive' : 'negative',
      reason: crowded ? '当前热门样本中下跌占比较高' : positive ? '主要指数与当前热门样本偏强' : '主要指数走弱，先观察支撑是否有效',
      action: crowded ? '观察量能与止跌信号' : positive ? '关注强势板块能否延续' : '关注是否出现企稳信号',
      confidence: breadth.total >= 20 ? '中等置信度' : '低置信度',
    };
  }, [breadth, dashboard, realtime]);

  const pickStock = (code, name) => {
    setSelectedCode(code);
    // 立即更新名称，避免依赖 loadStock 异步回调（接口异常时 name 会变成 code）
    if (name) setSelectedName(name);
    setSearchKeyword('');
    setSearchResults([]);
    // 预取下一只自选股，下次切换时直接命中服务端缓存
    prefetchAdjacentStock(code);
  };
  const scrollTo = ref => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openResearchTools = tab => {
    setResearchToolTab(tab);
    setShowResearchTools(true);
  };

  return (
    <div ref={pageRef} className="stock-page stock-page-v3">
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
                {searchResults.map(s => {
                  const inList = inWatchlist(s.code);
                  return (
                    <div key={s.secid} className="stock-search-item">
                      <button className="stock-search-main" onClick={() => pickStock(s.code, s.name)}>
                        <span className="stock-search-code">{s.code}</span>
                        <span className="stock-search-name">{s.name}</span>
                        <span className="stock-search-market">{s.market}</span>
                      </button>
                      <button
                        className={`stock-search-add ${inList ? 'in-list' : ''}`}
                        onClick={() => { toggleStock({ code: s.code, name: s.name, secid: s.secid }); setSearchResults([]); setSearchKeyword(''); }}
                        title={inList ? '已自选，点击移除' : '加入自选'}
                      >
                        {inList ? '✓' : '+'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="stock3-data-status" title={`数据源：${realtime?.dataSource || '等待行情'}；最近拉取：${quoteUpdatedLabel}；个股每 2 秒轮询，图表每 5-10 秒刷新`}>
          <span className={`stock3-data-dot ${realtime ? 'live' : ''}`} />
          <span>{marketDataState.stale ? '缓存行情' : marketDataState.unavailable ? '行情不可用' : '实时行情'} {marketClockLabel}</span>
        </div>
        <div className="stock3-experience-switch" role="tablist" aria-label="使用模式">
          <button type="button" className={experienceMode === 'beginner' ? 'active' : ''} onClick={() => setExperienceMode('beginner')} role="tab" aria-selected={experienceMode === 'beginner'}>新手</button>
          <button type="button" className={experienceMode === 'pro' ? 'active' : ''} onClick={() => setExperienceMode('pro')} role="tab" aria-selected={experienceMode === 'pro'}>专业</button>
        </div>
        <button className={`stock-watch-btn ${isSelectedInWatchlist ? 'active' : ''}`} onClick={() => toggleStock(selectedStock)} title={isSelectedInWatchlist ? '移出自选' : '加入自选'}>
          {ICONS.star}<span>{isSelectedInWatchlist ? '已自选' : '加自选'}</span>
        </button>
        {experienceMode === 'pro' && (
          <button className="stock-research-entry" onClick={() => openResearchTools('risk')} title="打开风险预算与研究假设账本">
            {ICONS.document}<span>研究工具</span>
          </button>
        )}
        <button className="stock-ai-action" onClick={() => { setBriefingTab(ai.briefing ? 'current' : ai.briefingHistory.length ? 'history' : 'current'); setShowBriefing(true); }} title="生成或查看 AI 市场早报">
          {ICONS.sparkle}<span>AI 早报</span>
        </button>
        <button className="btn-refresh" onClick={loadDashboard}>{ICONS.refresh}<span>刷新</span></button>
      </header>

      {(marketDataState.stale || marketDataState.unavailable) && (
        <div className={`stock-market-state ${marketDataState.unavailable ? 'error' : 'stale'}`}>
          <strong>{marketDataState.message}</strong>
          {marketDataState.timestamp && <span>{new Date(marketDataState.timestamp).toLocaleString('zh-CN')}</span>}
        </div>
      )}

      {/* 大盘指数横条 */}
      {/* 大盘指数横条 + 涨跌家数 */}
      <section className="stock3-indices">
        {loading && !dashboard
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="stock3-index-skeleton-card" />)
          : (dashboard?.indices || []).map(idx => (
            <button key={idx.secid} className={`stock3-index ${idx.changePct >= 0 ? 'up' : 'down'} ${selectedCode === idx.code ? 'active' : ''}`} onClick={() => setSelectedCode(idx.code)}>
              <span className="idx-name">{idx.name}</span>
              <span key={idx.price} className="idx-price price-flash">{idx.price?.toFixed(2)}</span>
              <span className="idx-chg">{idx.changePct >= 0 ? '+' : ''}{idx.changePct?.toFixed(2)}%</span>
            </button>
          ))}
        {dashboard?.stocks && (
          <div className="stock3-breadth">
            {(() => {
              const up = dashboard.stocks.filter(s => s.changePct > 0).length;
              const down = dashboard.stocks.filter(s => s.changePct < 0).length;
              const flat = dashboard.stocks.length - up - down;
              return <>
                <span className="breadth-label">活跃样本</span>
                <span className="breadth-up">↑{up}</span>
                <span className="breadth-flat">—{flat}</span>
                <span className="breadth-down">↓{down}</span>
              </>;
            })()}
          </div>
        )}
      </section>

      {experienceMode === 'beginner' && (
        <section className="stock3-coach" aria-label="市场摘要">
          <div className="stock3-coach-lead">
            <span className="stock3-coach-kicker">样本状态</span>
            <strong className={marketRead.toneClass}>{marketRead.tone}</strong>
            <span>{marketRead.reason}</span>
          </div>
          <div className="stock3-coach-item">
            <span>今天先看</span>
            <strong>{marketRead.action}</strong>
          </div>
          <div className="stock3-coach-item">
            <span>涨跌家数</span>
            <strong><em className="up">{breadth.up} 涨</em><em className="down">{breadth.down} 跌</em></strong>
          </div>
          <div className="stock3-coach-note" title={`${dashboard?.coverage?.label || '行情样本'}，不代表全市场广度`}><strong>{marketRead.confidence}</strong><span>指数 + {breadth.total} 只活跃样本</span></div>
        </section>
      )}
      {experienceMode === 'pro' && (
        <>
          <section className="stock-data-scope" aria-label="数据覆盖范围">
            <strong>数据覆盖</strong>
            <span>轮询行情：主要指数 + {breadth.total} 只{dashboard?.coverage?.label || '行情样本'}</span>
            <span>频率：个股 10 秒 / 样本池 {dashboard?.coverage?.realtimePollingSeconds || 30} 秒</span>
            <span>研究数据：价格、成交量、K 线</span>
            <label className="stock-benchmark-select">比较基准
              <select value={benchmarkCode} onChange={event => setBenchmarkCode(event.target.value)}>
                {BENCHMARK_OPTIONS.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </label>
            <span className="limited">非交易所逐笔；暂未覆盖全市场广度、财务、公告、资金流</span>
          </section>
          <nav className="stock-research-workflow" aria-label="专业研究流程">
            <span>研究流程</span>
            <button type="button" onClick={() => scrollTo(pageRef)}><b>1</b>行情</button>
            <i>→</i>
            <button type="button" onClick={() => scrollTo(analysisRef)}><b>2</b>证据分析</button>
            <i>→</i>
            <button type="button" onClick={() => openResearchTools('risk')}><b>3</b>风险预算</button>
            <i>→</i>
            <button type="button" onClick={() => openResearchTools('journal')}><b>4</b>假设账本与复盘</button>
          </nav>
        </>
      )}

      <IntelligenceRadar
        dashboard={dashboard}
        sectors={sectors}
        selectedCode={selectedCode}
        onSelect={pickStock}
        onInspect={(code, name) => { pickStock(code, name); setResearchToolTab('decision'); setShowResearchTools(true); }}
        policy={investorPolicy}
      />

      {/* 板块涨幅榜（行业/概念切换） */}
      <section className="stock3-sectors">
        <div className="stock3-sectors-head">
          <span className="stock3-sectors-label">板块轮动</span>
          <div className="stock3-sectors-tabs">
            <button className={`stock3-sector-tab ${sectorType === 'industry' ? 'active' : ''}`} onClick={() => setSectorType('industry')}>行业</button>
            <button className={`stock3-sector-tab ${sectorType === 'concept' ? 'active' : ''}`} onClick={() => setSectorType('concept')}>概念</button>
          </div>
        </div>
        <div className="stock3-sectors-strip">
          {loading && sectors.length === 0
            ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="stock3-sector-skeleton" />)
            : sectors.slice(0, 12).map(s => (
              <div key={s.code} className={`stock3-sector ${s.changePct >= 0 ? 'up' : 'down'}`} title={`${s.name} ${s.changePct >= 0 ? '+' : ''}${s.changePct?.toFixed(2)}%`}>
                <span className="sector-name">{s.name}</span>
                <span className="sector-chg">{s.changePct >= 0 ? '+' : ''}{s.changePct?.toFixed(2)}%</span>
              </div>
            ))}
          {!loading && sectors.length === 0 && <span className="stock3-sector-empty">暂无板块数据</span>}
        </div>
      </section>

      {/* 三栏主体 */}
      <div className={`stock3-body ${leftPanelOpen ? '' : 'no-left'} ${rightPanelOpen ? '' : 'no-right'}`}>
        {/* 左栏：列表 */}
        {leftPanelOpen && <aside className="stock3-left">
          <div className="stock3-left-tabs">
            <button className={`stock3-left-tab ${listTab === 'hot' ? 'active' : ''}`} onClick={() => setListTab('hot')}>活跃 {breadth.total > 0 && `(${breadth.total})`}</button>
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
              <button key={s.code} className={`stock3-list-item ${selectedCode === s.code ? 'active' : ''} ${(s.changePct || 0) >= 0 ? 'up' : 'down'}`} onClick={() => pickStock(s.code, s.name)} title={s.name}>
                <div className="li-left">
                  <span className="li-name">{s.name}</span>
                  <span className="li-code">{s.code}</span>
                </div>
                <div className="li-right">
                  <span className="li-price">{s.price?.toFixed(2)}</span>
                  <span className="li-chg">{s.changePct !== undefined ? `${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%` : '--'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>}

        {/* 中栏：主图 */}
        <main className="stock3-main">
          <div className="stock3-chart-head">
            <div className="stock3-title">
              <h2>{selectedName}</h2>
              <span className="stock3-code">{selectedCode}</span>
              {realtime && (
                <span className={`stock3-price ${realtime.changePct >= 0 ? 'up' : 'down'}`}>
                  <strong key={realtime.price} className={`price-flash ${realtime.changePct >= 0 ? 'flash-up' : 'flash-down'}`}>{realtime.price?.toFixed(2)}</strong>
                  <em>{realtime.change >= 0 ? '+' : ''}{realtime.change?.toFixed(2)} ({realtime.changePct >= 0 ? '+' : ''}{realtime.changePct?.toFixed(2)}%)</em>
                </span>
              )}
            </div>
            <div className="stock3-chart-toolbar">
              <div className="stock3-period">
                {PERIOD_OPTIONS.map(p => (
                  <button key={p.id} className={`stock3-period-btn ${period === p.id ? 'active' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
                ))}
              </div>
              {period !== 'timeline' && (
                <>
                  <label className="stock3-adjust">
                    <span>复权</span>
                    <select value={adjust} onChange={event => setAdjust(event.target.value)}>
                      <option value="0">不复权</option>
                      <option value="1">前复权</option>
                      <option value="2">后复权</option>
                    </select>
                  </label>
                  <span className={`stock-kline-status ${klineError ? 'error' : ''}`} title={klineData?.klines?.at(-1)?.date || klineError || ''}>
                    {klineLoading ? '加载中' : klineError ? '数据异常' : `${klineData?.klines?.length || 0} 根`}
                  </span>
                </>
              )}
              <div className="stock3-layout-tools" aria-label="工作区布局">
                <button type="button" className={leftPanelOpen ? '' : 'active'} onClick={() => setLeftPanelOpen(value => !value)} title={leftPanelOpen ? '隐藏股票列表' : '显示股票列表'} aria-pressed={!leftPanelOpen}>
                  {leftPanelOpen ? ICONS.chevronLeft : ICONS.chevronRight}
                </button>
                <button type="button" className={rightPanelOpen ? '' : 'active'} onClick={() => setRightPanelOpen(value => !value)} title={rightPanelOpen ? '隐藏盘口指标' : '显示盘口指标'} aria-pressed={!rightPanelOpen}>
                  {rightPanelOpen ? ICONS.chevronRight : ICONS.chevronLeft}
                </button>
                <button
                  type="button"
                  className={!leftPanelOpen && !rightPanelOpen ? 'active' : ''}
                  onClick={() => {
                    const focused = !leftPanelOpen && !rightPanelOpen;
                    setLeftPanelOpen(focused);
                    setRightPanelOpen(focused);
                  }}
                  title={!leftPanelOpen && !rightPanelOpen ? '恢复三栏' : '专注图表'}
                  aria-pressed={!leftPanelOpen && !rightPanelOpen}
                >
                  {ICONS.grid}
                </button>
              </div>
            </div>
          </div>
          <div className="stock3-chart-wrap">
            {period === 'timeline'
              ? <TimelineChart points={timelineData?.points} preClose={timelineData?.preClose} />
              : <KLineChart
                  klineData={klineData}
                  period={period}
                  code={selectedCode}
                  layoutKey={`${leftPanelOpen}-${rightPanelOpen}`}
                  loading={klineLoading}
                  error={klineError}
                  onRetry={() => setKlineReloadKey(key => key + 1)}
                />}
          </div>
        </main>

        {/* 右栏：盘口 + 指标 */}
        {rightPanelOpen && <aside className="stock3-right">
          <section className="stock3-panel">
            <div className="stock3-panel-label" title="买卖双方当前挂单价格和数量">五档盘口 <span className="stock-help-dot">?</span></div>
            <OrderBook realtime={realtime} />
          </section>
          <section className="stock3-panel">
            <div className="stock3-panel-label" title="当日开盘、最高、最低、昨收和成交数据">关键指标 <span className="stock-help-dot">?</span></div>
            <div className="stock3-metrics">
              {metrics.map(m => (
                <div key={m.label} className="stock3-metric"><span>{m.label}</span><strong>{m.value}</strong></div>
              ))}
            </div>
          </section>
        </aside>}
      </div>

      {/* 算法技术分析始终可用，LLM 仅增强自然语言表述 */}
      <section ref={analysisRef} className={`stock3-panel stock-ai-panel${showAnalysis ? '' : ' collapsed'}`}>
        <div className="stock-ai-panel-head">
          <div className="stock3-panel-label">
            {ICONS.sparkle} {ai.diagnosis?.mode === 'ai' ? 'AI 增强分析' : '算法技术分析'}
            {!ai.llmReady && <button type="button" className="stock-ai-unready" onClick={onOpenLlmConfig}>配置 AI 增强</button>}
          </div>
          <div className="stock-ai-panel-actions">
            {(ai.diagnosis || ai.diagnoseError) && showAnalysis && (
              <button className="stock-ai-rerun" onClick={runDiagnosis} disabled={ai.diagnosing}>{ICONS.refresh}<span>重新分析</span></button>
            )}
            <button
              type="button"
              className="stock-ai-toggle"
              onClick={() => setShowAnalysis(v => !v)}
              title={showAnalysis ? '收起分析' : '展开分析'}
              aria-expanded={showAnalysis}
            >
              {showAnalysis ? '收起' : '展开'}
            </button>
          </div>
        </div>
        {showAnalysis && (
          <>
            {!ai.diagnosis && !ai.diagnosing && !ai.diagnoseError && (
              <button className="stock-ai-run" onClick={runDiagnosis} disabled={!realtime || marketDataState.unavailable}>
                {ICONS.sparkle}<span>{ai.llmReady ? '生成 AI 增强分析' : '生成算法分析'}</span>
              </button>
            )}
            {ai.diagnosing && <div className="stock-ai-loading"><div className="spinner" /><span>正在计算技术指标…</span></div>}
            {ai.diagnoseError && <div className="stock-ai-error">{ai.diagnoseError}<button onClick={runDiagnosis}>重试</button></div>}
            {ai.diagnosis && (
          <div className="stock-ai-result stock-analysis-result">
            <div className="stock-analysis-summary">
              <div><span>综合评级</span><strong>{ai.diagnosis.rating}</strong></div>
              <div><span>风险等级</span><strong>{({ high: '高', medium: '中', low: '低', unknown: '--' })[ai.diagnosis.risk] || '--'}</strong></div>
              <div><span>分析模式</span><strong>{ai.diagnosis.mode === 'ai' ? 'AI 增强' : '确定性算法'}</strong></div>
            </div>
            {ai.diagnosis.status === 'ready' && (
              <div className="stock-analysis-metrics">
                {[
                  ['MA5', ai.diagnosis.metrics.ma5], ['MA10', ai.diagnosis.metrics.ma10], ['MA20', ai.diagnosis.metrics.ma20],
                  ['ATR14', ai.diagnosis.metrics.atr14],
                  ['最大回撤', ai.diagnosis.metrics.drawdown == null ? null : `${ai.diagnosis.metrics.drawdown}%`],
                  ['20期位置', ai.diagnosis.metrics.position20 == null ? null : `${ai.diagnosis.metrics.position20}%`],
                  ['20期涨跌', ai.diagnosis.metrics.assetReturn20 == null ? null : `${ai.diagnosis.metrics.assetReturn20}%`],
                  ['基准同期', ai.diagnosis.metrics.benchmarkReturn20 == null ? null : `${ai.diagnosis.metrics.benchmarkReturn20}%`],
                  ['超额表现', ai.diagnosis.metrics.excessReturn20 == null ? null : `${ai.diagnosis.metrics.excessReturn20}%`],
                  ['波动率', ai.diagnosis.metrics.volatility == null ? null : `${ai.diagnosis.metrics.volatility}%`],
                  ['支撑', ai.diagnosis.metrics.support], ['压力', ai.diagnosis.metrics.resistance],
                  ['5日动量', ai.diagnosis.metrics.momentum5 == null ? null : `${ai.diagnosis.metrics.momentum5}%`],
                  ['量能', ({ expanding: '放大', contracting: '收缩', stable: '平稳' })[ai.diagnosis.metrics.volumeTrend] || '--'],
                ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '--'}</strong></div>)}
              </div>
            )}
            {ai.diagnosis.status === 'ready' && (
              <div className="stock-thesis-grid">
                <section className="stock-thesis-block bullish">
                  <div className="stock-thesis-head"><strong>支持当前判断</strong><span>多方证据</span></div>
                  {ai.diagnosis.bullCase?.length > 0 ? ai.diagnosis.bullCase.map(item => <p key={item}>{item}</p>) : <p className="muted">当前序列没有形成明确支持</p>}
                </section>
                <section className="stock-thesis-block bearish">
                  <div className="stock-thesis-head"><strong>反向证据</strong><span>空方证据</span></div>
                  {ai.diagnosis.bearCase?.length > 0 ? ai.diagnosis.bearCase.map(item => <p key={item}>{item}</p>) : <p className="muted">当前序列没有形成明确反向信号</p>}
                </section>
                <section className="stock-thesis-block invalidation">
                  <div className="stock-thesis-head"><strong>判断失效条件</strong><span>必须复核</span></div>
                  {ai.diagnosis.invalidation?.map(item => <p key={item}>{item}</p>)}
                </section>
                <section className="stock-thesis-block risk">
                  <div className="stock-thesis-head"><strong>风险实验室</strong><span>{ai.diagnosis.dataQuality?.bars || 0} 根 K 线</span></div>
                  {ai.diagnosis.riskSignals?.length > 0 ? ai.diagnosis.riskSignals.map(item => <p key={item}>{item}</p>) : <p className="muted">当前样本未触发额外风险信号</p>}
                  <small>比较基准：{ai.diagnosis.dataQuality?.benchmark?.name || '不可用'}；仅基于价格与成交量，未包含财务、公告、资金流和全市场数据。</small>
                </section>
              </div>
            )}
            <div className="stock-ai-text">{ai.diagnosis.content}</div>
            {ai.diagnosis.aiError && <div className="stock-analysis-fallback">AI 增强失败，当前保留算法结果：{ai.diagnosis.aiError}</div>}
            <div className="stock-analysis-evidence">
              {(ai.diagnosis.evidence || []).map(item => <span key={item.key}>{item.label}：{item.value}</span>)}
            </div>
          </div>
        )}
          </>
        )}
      </section>

      {showResearchTools && (
        <div className="stock-modal-overlay" onClick={() => setShowResearchTools(false)}>
          <div className="stock-modal stock-research-modal" onClick={event => event.stopPropagation()}>
            <div className="stock-modal-head">
              <h3>{ICONS.document} 研究工具 · {selectedName}</h3>
              <button className="stock-modal-close" onClick={() => setShowResearchTools(false)}>×</button>
            </div>
            <div className="stock-research-modal-tabs" role="tablist">
              <button type="button" className={researchToolTab === 'decision' ? 'active' : ''} onClick={() => setResearchToolTab('decision')} role="tab">智能决策卡</button>
              <button type="button" className={researchToolTab === 'policy' ? 'active' : ''} onClick={() => setResearchToolTab('policy')} role="tab">投资约束</button>
              <button type="button" className={researchToolTab === 'risk' ? 'active' : ''} onClick={() => setResearchToolTab('risk')} role="tab">仓位预算</button>
              <button type="button" className={researchToolTab === 'scenario' ? 'active' : ''} onClick={() => setResearchToolTab('scenario')} role="tab">情景推演</button>
              <button type="button" className={researchToolTab === 'checklist' ? 'active' : ''} onClick={() => setResearchToolTab('checklist')} role="tab">研究清单</button>
              <button type="button" className={researchToolTab === 'journal' ? 'active' : ''} onClick={() => setResearchToolTab('journal')} role="tab">假设账本</button>
            </div>
            <div className="stock-modal-body">
              {researchToolTab === 'decision' ? (
                <DecisionEvidenceTool stock={selectedStock} realtime={realtime} diagnosis={ai.diagnosis} diagnosing={ai.diagnosing} onAnalyze={runDiagnosis} onOpenTool={setResearchToolTab} />
              ) : researchToolTab === 'policy' ? (
                <InvestorPolicyTool policy={investorPolicy} onSave={setInvestorPolicy} />
              ) : researchToolTab === 'risk' ? (
                <PositionRiskTool code={selectedCode} realtime={realtime} diagnosis={ai.diagnosis} />
              ) : researchToolTab === 'scenario' ? (
                <ScenarioAnalysisTool code={selectedCode} name={selectedName} realtime={realtime} diagnosis={ai.diagnosis} />
              ) : researchToolTab === 'checklist' ? (
                <ResearchChecklist code={selectedCode} name={selectedName} />
              ) : (
                <ResearchJournal code={selectedCode} name={selectedName} realtime={realtime} diagnosis={ai.diagnosis} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 早报弹窗 */}
      {showBriefing && (
        <div className="stock-modal-overlay" onClick={() => setShowBriefing(false)}>
          <div className="stock-modal stock-briefing-modal" onClick={e => e.stopPropagation()}>
            <div className="stock-modal-head">
              <h3>{ICONS.sparkle} AI 市场早报</h3>
              <button className="stock-modal-close" onClick={() => setShowBriefing(false)}>×</button>
            </div>
            <div className="stock-briefing-tabs" role="tablist">
              <button type="button" className={briefingTab === 'current' ? 'active' : ''} onClick={() => setBriefingTab('current')} role="tab">当前报告</button>
              <button type="button" className={briefingTab === 'history' ? 'active' : ''} onClick={() => setBriefingTab('history')} role="tab">历史归档 ({ai.briefingHistory.length})</button>
            </div>
            <div className="stock-modal-body">
              {briefingTab === 'history' ? (
                <div className="stock-briefing-history">
                  <div className="stock-briefing-history-head">
                    <span>本地保存最近 30 份报告</span>
                    <button type="button" disabled={ai.briefingHistory.length === 0} onClick={() => window.confirm('确认清空全部 AI 早报历史？') && ai.clearBriefingHistory()}>清空</button>
                  </div>
                  {ai.briefingHistory.length === 0 ? <div className="stock-ai-guide"><p>暂无历史报告。</p></div> : ai.briefingHistory.map(record => (
                    <div className="stock-briefing-history-row" key={record.id}>
                      <button type="button" className="stock-briefing-history-open" onClick={() => { ai.openBriefing(record); setBriefingTab('current'); }}>
                        <strong>{new Date(record.at).toLocaleString('zh-CN')}</strong>
                        <span>{record.meta?.coverage || '行情样本'} · {record.meta?.stockCount || 0} 只股票 · {record.meta?.sectorCount || 0} 个板块</span>
                        <p>{record.content.replace(/[#*\n]/g, ' ').slice(0, 90)}...</p>
                      </button>
                      <button type="button" className="stock-briefing-history-delete" onClick={() => ai.deleteBriefing(record.id)} title="删除这份早报">{ICONS.trash}</button>
                    </div>
                  ))}
                </div>
              ) : ai.briefingLoading ? (
                <div className="stock-ai-loading"><div className="spinner" /><span>正在生成早报…</span></div>
              ) : ai.briefingError ? (
                <div className="stock-ai-error">{ai.briefingError}<button onClick={runBriefing}>重试</button></div>
              ) : ai.briefing ? (
                <>
                  <div className="stock-briefing-meta"><span>{new Date(ai.briefing.at).toLocaleString('zh-CN')}</span><span>{ai.briefing.meta?.coverage || '行情样本'} · {ai.briefing.meta?.stockCount || 0} 只</span></div>
                  <BriefingContent content={ai.briefing.content} />
                </>
              ) : !ai.llmReady ? (
                <div className="stock-ai-guide">
                  <p>配置大模型后可生成新早报；已保存的报告仍可在历史归档中查看。</p>
                  <button onClick={() => { setShowBriefing(false); onOpenLlmConfig?.(); }}>配置大模型</button>
                </div>
              ) : (
                <div className="stock-ai-guide"><p>生成一份包含指数、样本广度、板块轮动、关键个股、多空情景、风险和观察清单的深度早报。</p></div>
              )}
            </div>
            {ai.llmReady && !ai.briefingLoading && (
              <div className="stock-modal-foot">
                <button className="stock-ai-run" onClick={runBriefing}>{ICONS.refresh}<span>生成新早报</span></button>
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
