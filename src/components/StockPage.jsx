/**
 * StockPage — 股市动向（三栏行情终端）
 * 左：自选/热门列表  中：分时/K线主图  右：五档盘口 + 指标
 * 数据源：东方财富（主）+ 腾讯（降级）
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ICONS } from '../constants/index.jsx';
import { useStockWatchlist } from '../hooks/useStockWatchlist.js';
import { useStockAi, ALERT_CONDITIONS } from '../hooks/useStockAi.js';
import { calculatePositionSize, calculateScenarioMetrics } from '../domain/stock/positionSizing.js';
import { buildCandidateRadar, buildDecisionCard, buildMarketEvidence } from '../domain/stock/intelligenceRadar.js';
import { DEFAULT_INVESTOR_POLICY, normalizeInvestorPolicy } from '../domain/stock/investorPolicy.js';

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

// ===== 确定性 SVG K线图 =====
function KLineChart({ klineData, loading, error, onRetry }) {
  const svgRef = useRef(null);
  const rows = useMemo(() => (klineData?.klines || []).filter(item =>
    [item.open, item.close, item.high, item.low].every(Number.isFinite)
  ), [klineData]);
  const sourceCount = rows.length;
  const hasData = sourceCount > 0;
  const [viewport, setViewport] = useState({ start: 0, end: 0 });
  const [pointer, setPointer] = useState(null);
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    setViewport({ start: 0, end: sourceCount });
    setPointer(null);
    setPinnedIndex(null);
    setDrag(null);
  }, [klineData, sourceCount]);

  const start = Math.max(0, Math.min(viewport.start, Math.max(sourceCount - 1, 0)));
  const end = Math.max(start + (hasData ? 1 : 0), Math.min(viewport.end || sourceCount, sourceCount));
  const visibleRows = rows.slice(start, end);
  const visibleCount = visibleRows.length;
  const W = 1000, H = 500;
  const pad = { top: 30, right: 68, bottom: 28, left: 12 };
  const priceBottom = 370;
  const volumeTop = 400;
  const plotW = W - pad.left - pad.right;
  const lows = visibleRows.map(item => item.low);
  const highs = visibleRows.map(item => item.high);
  const rawMin = hasData ? Math.min(...lows) : 0;
  const rawMax = hasData ? Math.max(...highs) : 1;
  const pricePadding = Math.max((rawMax - rawMin) * 0.06, rawMax * 0.002, 0.01);
  const minPrice = rawMin - pricePadding;
  const maxPrice = rawMax + pricePadding;
  const priceRange = Math.max(maxPrice - minPrice, 0.01);
  const maxVolume = Math.max(...visibleRows.map(item => item.volume || 0), 1);
  const step = visibleCount ? plotW / visibleCount : plotW;
  const candleWidth = Math.max(1, Math.min(step * 0.62, 7));
  const xAt = index => pad.left + step * (index + 0.5);
  const yAt = price => pad.top + ((maxPrice - price) / priceRange) * (priceBottom - pad.top);
  const volumeY = volume => H - pad.bottom - ((volume || 0) / maxVolume) * (H - pad.bottom - volumeTop);
  const movingAveragePath = windowSize => {
    const points = [];
    for (let localIndex = 0; localIndex < visibleCount; localIndex += 1) {
      const globalIndex = start + localIndex;
      if (globalIndex < windowSize - 1) continue;
      const average = rows.slice(globalIndex - windowSize + 1, globalIndex + 1).reduce((sum, item) => sum + item.close, 0) / windowSize;
      points.push(`${points.length ? 'L' : 'M'}${xAt(localIndex).toFixed(2)},${yAt(average).toFixed(2)}`);
    }
    return points.join(' ');
  };
  const timeIndexes = visibleCount ? [...new Set([0, Math.floor((visibleCount - 1) / 2), visibleCount - 1])] : [];
  const minVisible = Math.min(12, sourceCount);

  const clientToSvg = useCallback((clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
      rect,
    };
  }, []);

  const zoomTo = useCallback((nextCount, anchorRatio = 0.5) => {
    if (!sourceCount) return;
    setViewport(current => {
      const currentStart = Math.max(0, Math.min(current.start, sourceCount - 1));
      const currentEnd = Math.max(currentStart + 1, Math.min(current.end || sourceCount, sourceCount));
      const currentCount = currentEnd - currentStart;
      const count = Math.max(minVisible, Math.min(Math.round(nextCount), sourceCount));
      const anchor = currentStart + currentCount * anchorRatio;
      const nextStart = Math.max(0, Math.min(Math.round(anchor - count * anchorRatio), sourceCount - count));
      return { start: nextStart, end: nextStart + count };
    });
    setPinnedIndex(null);
  }, [minVisible, sourceCount]);

  const zoomBy = useCallback((factor, anchorRatio = 0.5) => {
    zoomTo(visibleCount * factor, anchorRatio);
  }, [visibleCount, zoomTo]);

  const updatePointer = useCallback((clientX, clientY) => {
    const point = clientToSvg(clientX, clientY);
    if (!point || !visibleCount || point.x < pad.left || point.x > W - pad.right) return;
    const index = Math.max(0, Math.min(Math.floor((point.x - pad.left) / step), visibleCount - 1));
    setPointer({ index, y: Math.max(pad.top, Math.min(point.y, priceBottom)) });
  }, [clientToSvg, step, visibleCount]);

  const handleWheel = useCallback(event => {
    if (!hasData) return;
    event.preventDefault();
    event.stopPropagation();
    const point = clientToSvg(event.clientX, event.clientY);
    const anchorRatio = point ? Math.max(0, Math.min((point.x - pad.left) / plotW, 1)) : 0.5;
    zoomBy(event.deltaY < 0 ? 0.78 : 1.28, anchorRatio);
  }, [clientToSvg, hasData, zoomBy]);

  useEffect(() => {
    const chart = svgRef.current;
    if (!chart || !hasData || loading || error) return undefined;
    chart.addEventListener('wheel', handleWheel, { passive: false });
    return () => chart.removeEventListener('wheel', handleWheel);
  }, [error, handleWheel, hasData, loading]);

  const handlePointerDown = event => {
    if (event.button !== 0 || !hasData) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ clientX: event.clientX, start, end, moved: false });
  };

  const handlePointerMove = event => {
    if (!drag) {
      if (pinnedIndex === null) updatePointer(event.clientX, event.clientY);
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const pixelsPerBar = (rect.width * plotW / W) / Math.max(drag.end - drag.start, 1);
    const deltaBars = Math.round((drag.clientX - event.clientX) / pixelsPerBar);
    const count = drag.end - drag.start;
    const nextStart = Math.max(0, Math.min(drag.start + deltaBars, sourceCount - count));
    setViewport({ start: nextStart, end: nextStart + count });
    if (Math.abs(event.clientX - drag.clientX) > 3 && !drag.moved) setDrag(current => ({ ...current, moved: true }));
  };

  const handlePointerUp = event => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag && !drag.moved && pointer) {
      const globalIndex = start + pointer.index;
      setPinnedIndex(current => current === globalIndex ? null : globalIndex);
    }
    setDrag(null);
  };

  const activeLocalIndex = pinnedIndex !== null && pinnedIndex >= start && pinnedIndex < end
    ? pinnedIndex - start
    : pointer?.index;
  const activeItem = Number.isInteger(activeLocalIndex) ? visibleRows[activeLocalIndex] : null;
  const activeY = pinnedIndex !== null && activeItem ? yAt(activeItem.close) : pointer?.y;
  const activeX = activeItem ? xAt(activeLocalIndex) : null;
  const previousClose = activeItem
    ? (rows[start + activeLocalIndex - 1]?.close ?? activeItem.open)
    : null;
  const activeChange = activeItem && previousClose ? ((activeItem.close - previousClose) / previousClose) * 100 : 0;
  const cursorPrice = Number.isFinite(activeY)
    ? maxPrice - ((activeY - pad.top) / (priceBottom - pad.top)) * priceRange
    : null;
  const tooltipX = activeX > W * 0.68 ? activeX - 210 : activeX + 14;
  const tooltipY = 40;
  const formatVolume = value => value >= 100000000
    ? `${(value / 100000000).toFixed(2)}亿`
    : value >= 10000 ? `${(value / 10000).toFixed(1)}万` : String(value || 0);

  return (
    <div className="stock-kline-shell">
      {hasData && !loading && !error && (
        <>
        <div className="stock-kline-controls" aria-label="K 线缩放控制">
          <span>{visibleCount}/{sourceCount}</span>
          <button type="button" title="放大 K 线" aria-label="放大 K 线" disabled={visibleCount <= minVisible} onClick={() => zoomBy(0.72)}>+</button>
          <button type="button" title="缩小 K 线" aria-label="缩小 K 线" disabled={visibleCount >= sourceCount} onClick={() => zoomBy(1.4)}>−</button>
          <button type="button" title="显示全部数据" aria-label="显示全部数据" disabled={visibleCount >= sourceCount} onClick={() => zoomTo(sourceCount)}>↺</button>
        </div>
        <svg
          ref={svgRef}
          className={`stock-kline-svg${drag ? ' is-dragging' : ''}`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${sourceCount} 根 K 线图，当前显示 ${visibleCount} 根`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => { if (!drag && pinnedIndex === null) setPointer(null); }}
        >
          <rect width={W} height={H} fill="transparent" />
          {[0, 1, 2, 3, 4].map(index => {
            const y = pad.top + index * ((priceBottom - pad.top) / 4);
            const price = maxPrice - index * (priceRange / 4);
            return <g key={`grid-${index}`}><line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="stock-kline-grid" /><text x={W - pad.right + 8} y={y + 4} className="stock-kline-axis">{price.toFixed(2)}</text></g>;
          })}
          <line x1={pad.left} x2={W - pad.right} y1={volumeTop - 10} y2={volumeTop - 10} className="stock-kline-divider" />
          {visibleRows.map((item, index) => {
            const x = xAt(index);
            const isUp = item.close >= item.open;
            const bodyTop = Math.min(yAt(item.open), yAt(item.close));
            const bodyHeight = Math.max(Math.abs(yAt(item.close) - yAt(item.open)), 1.2);
            return <g key={`${item.date}-${start + index}`} className={`${isUp ? 'up' : 'down'}${activeLocalIndex === index ? ' is-active' : ''}`}>
              <title>{`${item.date} 开 ${item.open} 高 ${item.high} 低 ${item.low} 收 ${item.close}`}</title>
              <line x1={x} x2={x} y1={yAt(item.high)} y2={yAt(item.low)} className="stock-kline-wick" />
              <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} className="stock-kline-body" />
              <rect x={x - candleWidth / 2} y={volumeY(item.volume)} width={candleWidth} height={H - pad.bottom - volumeY(item.volume)} className="stock-kline-volume" />
            </g>;
          })}
          <path d={movingAveragePath(5)} className="stock-kline-ma ma5" />
          <path d={movingAveragePath(10)} className="stock-kline-ma ma10" />
          <path d={movingAveragePath(20)} className="stock-kline-ma ma20" />
          <g className="stock-kline-legend"><text x={pad.left} y={17} className="ma5">MA5</text><text x={pad.left + 50} y={17} className="ma10">MA10</text><text x={pad.left + 108} y={17} className="ma20">MA20</text><text x={pad.left} y={volumeTop + 5}>成交量</text></g>
          {timeIndexes.map(index => <text key={`time-${index}`} x={xAt(index)} y={H - 7} textAnchor={index === 0 ? 'start' : index === visibleCount - 1 ? 'end' : 'middle'} className="stock-kline-axis">{visibleRows[index].date}</text>)}
          {activeItem && (
            <g className="stock-kline-crosshair" pointerEvents="none">
              <line x1={activeX} x2={activeX} y1={pad.top} y2={H - pad.bottom} />
              <line x1={pad.left} x2={W - pad.right} y1={activeY} y2={activeY} />
              <circle cx={activeX} cy={yAt(activeItem.close)} r="4" />
              <rect x={W - pad.right} y={activeY - 10} width={pad.right} height="20" className="stock-kline-price-tag" />
              <text x={W - pad.right + 5} y={activeY + 4} className="stock-kline-price-text">{cursorPrice?.toFixed(2)}</text>
              <g className="stock-kline-tooltip" transform={`translate(${tooltipX}, ${tooltipY})`}>
                <rect width="196" height="92" rx="4" />
                <text x="10" y="17" className="date">{activeItem.date}{pinnedIndex !== null ? '  · 已锁定' : ''}</text>
                <text x="10" y="38">开 {activeItem.open.toFixed(2)}　高 {activeItem.high.toFixed(2)}</text>
                <text x="10" y="57">低 {activeItem.low.toFixed(2)}　收 {activeItem.close.toFixed(2)}</text>
                <text x="10" y="77" className={activeChange >= 0 ? 'change-up' : 'change-down'}>涨跌 {activeChange >= 0 ? '+' : ''}{activeChange.toFixed(2)}%</text>
                <text x="102" y="77">量 {formatVolume(activeItem.volume)}</text>
              </g>
            </g>
          )}
        </svg>
        </>
      )}
      {loading && <div className="stock-chart-empty stock-kline-empty"><div className="spinner" /><span>正在加载 K 线...</span></div>}
      {!loading && (error || !hasData) && (
        <div className="stock-chart-empty stock-kline-empty stock-chart-error">
          <strong>{error || '当前周期暂无 K 线数据'}</strong>
          <span>可能是上游行情暂不可用或该标的不支持此周期。</span>
          <button type="button" onClick={onRetry}>重新加载</button>
        </div>
      )}
    </div>
  );
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

const EMPTY_RESEARCH_NOTE = { thesis: '', counterEvidence: '', invalidation: '', horizon: '20d', status: 'watching' };

function ResearchJournal({ code, name, realtime, diagnosis }) {
  const [draft, setDraft] = useState(EMPTY_RESEARCH_NOTE);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      const saved = store[code];
      const current = saved?.current || saved || null;
      const savedHistory = Array.isArray(saved?.history) ? saved.history : (current?.updatedAt ? [current] : []);
      setDraft(current ? { ...EMPTY_RESEARCH_NOTE, ...current } : EMPTY_RESEARCH_NOTE);
      setSavedAt(current?.updatedAt || null);
      setHistory(savedHistory);
      setSaveStatus('');
    } catch {
      setDraft(EMPTY_RESEARCH_NOTE);
      setSavedAt(null);
      setHistory([]);
    }
  }, [code]);

  const update = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const importAnalysis = () => setDraft(current => ({
    ...current,
    thesis: diagnosis?.bullCase?.join('\n') || current.thesis,
    counterEvidence: diagnosis?.bearCase?.join('\n') || current.counterEvidence,
    invalidation: diagnosis?.invalidation?.join('\n') || current.invalidation,
  }));
  const save = () => {
    const updatedAt = new Date().toISOString();
    const record = {
      ...draft,
      code,
      name,
      updatedAt,
      snapshot: {
        price: realtime?.price ?? null,
        rating: diagnosis?.rating || null,
        risk: diagnosis?.risk || null,
        excessReturn20: diagnosis?.metrics?.excessReturn20 ?? null,
      },
    };
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      const previous = store[code];
      const previousHistory = Array.isArray(previous?.history)
        ? previous.history
        : (previous?.updatedAt ? [previous] : []);
      const nextHistory = [record, ...previousHistory.filter(item => item.updatedAt !== updatedAt)].slice(0, 20);
      localStorage.setItem('stockResearchJournalV1', JSON.stringify({ ...store, [code]: { current: record, history: nextHistory } }));
      setDraft(record);
      setSavedAt(updatedAt);
      setHistory(nextHistory);
      setSaveStatus('已保存新快照');
      window.setTimeout(() => setSaveStatus(''), 2400);
    } catch {
      setSaveStatus('保存失败，请检查浏览器存储权限');
    }
  };
  const clear = () => {
    if (!window.confirm(`确认删除 ${name} 的全部研究快照？`)) return;
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchJournalV1') || '{}');
      delete store[code];
      localStorage.setItem('stockResearchJournalV1', JSON.stringify(store));
    } catch { /* local storage unavailable */ }
    setDraft(EMPTY_RESEARCH_NOTE);
    setSavedAt(null);
    setHistory([]);
    setSaveStatus('');
  };
  const restore = record => {
    setDraft({ ...EMPTY_RESEARCH_NOTE, ...record });
    setSaveStatus('已载入历史快照，修改后请另存新快照');
  };

  return (
    <section className="stock3-panel stock-research-journal">
      <div className="stock-research-head">
        <div>
          <span>研究假设账本</span>
          <strong>{name} · {code}</strong>
        </div>
        <div className="stock-research-actions">
          <button type="button" onClick={importAnalysis} disabled={!diagnosis} title="引用当前分析">{ICONS.sparkle}<span>引用分析</span></button>
          <button type="button" onClick={clear} disabled={history.length === 0} title="删除全部研究快照">{ICONS.trash}</button>
        </div>
      </div>
      <div className="stock-research-meta">
        <label>观察周期<select value={draft.horizon} onChange={event => update('horizon', event.target.value)}><option value="5d">5 个交易日</option><option value="20d">20 个交易日</option><option value="60d">60 个交易日</option><option value="event">事件验证</option></select></label>
        <label>研究状态<select value={draft.status} onChange={event => update('status', event.target.value)}><option value="watching">观察中</option><option value="confirmed">已确认</option><option value="conflicted">证据冲突</option><option value="invalidated">已失效</option></select></label>
        <span>{savedAt ? `更新于 ${new Date(savedAt).toLocaleString('zh-CN')}` : '尚未保存'}</span>
      </div>
      <div className="stock-research-fields">
        <label><span>核心假设</span><textarea value={draft.thesis} onChange={event => update('thesis', event.target.value)} placeholder="哪些事实必须成立，当前判断才有效？" /></label>
        <label><span>反向证据</span><textarea value={draft.counterEvidence} onChange={event => update('counterEvidence', event.target.value)} placeholder="什么证据正在反驳当前判断？" /></label>
        <label><span>失效条件</span><textarea value={draft.invalidation} onChange={event => update('invalidation', event.target.value)} placeholder="出现什么价格、数据或事件后必须重估？" /></label>
      </div>
      <div className="stock-research-foot">
        <span className={saveStatus.includes('失败') ? 'error' : ''}>{saveStatus || '每次保存都会冻结价格与分析背景，生成独立复盘快照。'}</span>
        <button type="button" className="stock-research-save" onClick={save}>保存新快照</button>
      </div>
      <div className="stock-research-history">
        <div className="stock-research-history-head"><strong>复盘历史</strong><span>{history.length} 条，最多保留 20 条</span></div>
        {history.length === 0 ? <p>暂无快照。先写下可验证的假设、反向证据和失效条件。</p> : history.map(record => (
          <button type="button" key={record.updatedAt} onClick={() => restore(record)}>
            <span>{new Date(record.updatedAt).toLocaleString('zh-CN')}</span>
            <strong>{record.snapshot?.price == null ? '--' : `¥${record.snapshot.price}`} · {record.snapshot?.rating || '未分析'}</strong>
            <em>{({ watching: '观察中', confirmed: '已确认', conflicted: '证据冲突', invalidated: '已失效' })[record.status] || record.status}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function PositionRiskTool({ code, realtime, diagnosis }) {
  const [capital, setCapital] = useState(() => localStorage.getItem('stockRiskCapital') || '100000');
  const [riskPercent, setRiskPercent] = useState(() => localStorage.getItem('stockRiskPercent') || '1');
  const [stop, setStop] = useState(() => diagnosis?.metrics?.support?.toString() || '');
  const entry = Number(realtime?.price) || 0;
  useEffect(() => { localStorage.setItem('stockRiskCapital', capital); }, [capital]);
  useEffect(() => { localStorage.setItem('stockRiskPercent', riskPercent); }, [riskPercent]);
  useEffect(() => {
    if (diagnosis?.metrics?.support) setStop(String(diagnosis.metrics.support));
  }, [diagnosis?.metrics?.support]);

  const result = calculatePositionSize({ capital, riskPercent, entry, stop });
  const isIndex = /^(sh000001|sz399001|sz399006)$/.test(code || '');
  const money = value => Number.isFinite(value) ? value.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : '--';
  return (
    <section className="stock3-panel stock-risk-tool">
      <div className="stock-research-head">
        <div><span>风险预算</span><strong>仓位测算</strong></div>
        <span className="stock-tool-note">不含手续费、滑点和涨跌停约束</span>
      </div>
      <div className={`stock-risk-inputs ${isIndex ? 'disabled' : ''}`}>
        <label>账户规模<input type="number" min="0" value={capital} onChange={event => setCapital(event.target.value)} /></label>
        <label>单次风险 %<input type="number" min="0.1" max="100" step="0.1" value={riskPercent} onChange={event => setRiskPercent(event.target.value)} /></label>
        <label>参考价<input type="number" value={entry || ''} readOnly /></label>
        <label>止损价<input type="number" min="0" value={stop} onChange={event => setStop(event.target.value)} placeholder="低于参考价" disabled={isIndex} /></label>
      </div>
      {isIndex ? (
        <div className="stock-risk-warning">指数本身不能按 A 股 100 股一手直接交易。请从左侧选择一只股票后测算仓位；指数仅用于观察市场方向。</div>
      ) : result.status === 'invalid' || result.status === 'below_lot' ? (
        <div className="stock-risk-warning">{result.reason}</div>
      ) : (
        <div className="stock-risk-results">
          <div><span>风险预算</span><strong>{money(result.riskBudget)}</strong></div>
          <div><span>理论股数</span><strong>{result.shares.toLocaleString('zh-CN')} 股</strong></div>
          <div><span>资金占用</span><strong>{money(result.capitalUsed)}</strong></div>
          <div><span>最大估算损失</span><strong>{money(result.estimatedLoss)}</strong></div>
          <div><span>资金占比</span><strong>{result.positionPercent.toFixed(2)}%</strong></div>
        </div>
      )}
      <small className="stock-risk-disclaimer">用法：先限定“最多愿意损失的钱”，再输入判断失效时的止损价，系统按每股风险反推不超过预算的 100 股整数仓位。这是风险控制测算，不是买入建议。</small>
    </section>
  );
}

const EMPTY_SCENARIO_PLAN = {
  bearTarget: '', baseTarget: '', bullTarget: '',
  bearProbability: '25', baseProbability: '50', bullProbability: '25',
};

function ScenarioAnalysisTool({ code, name, realtime, diagnosis }) {
  const [plan, setPlan] = useState(EMPTY_SCENARIO_PLAN);
  const [saveStatus, setSaveStatus] = useState('');
  const entry = Number(realtime?.price) || 0;

  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockScenarioPlansV1') || '{}');
      const saved = store[code];
      setPlan(saved ? { ...EMPTY_SCENARIO_PLAN, ...saved } : EMPTY_SCENARIO_PLAN);
    } catch { setPlan(EMPTY_SCENARIO_PLAN); }
    setSaveStatus('');
  }, [code]);

  useEffect(() => {
    if (!entry || plan.bearTarget || plan.baseTarget || plan.bullTarget) return;
    setPlan(current => ({
      ...current,
      bearTarget: String(diagnosis?.metrics?.support || Number((entry * 0.85).toFixed(2))),
      baseTarget: String(entry),
      bullTarget: String(diagnosis?.metrics?.resistance || Number((entry * 1.15).toFixed(2))),
    }));
  }, [entry, diagnosis?.metrics?.support, diagnosis?.metrics?.resistance, plan.bearTarget, plan.baseTarget, plan.bullTarget]);

  const update = (field, value) => setPlan(current => ({ ...current, [field]: value }));
  const probabilities = ['bearProbability', 'baseProbability', 'bullProbability'].map(key => Number(plan[key]) || 0);
  const targets = ['bearTarget', 'baseTarget', 'bullTarget'].map(key => Number(plan[key]) || 0);
  const probabilityTotal = probabilities.reduce((sum, value) => sum + value, 0);
  const metrics = calculateScenarioMetrics({
    referencePrice: entry,
    scenarios: targets.map((target, index) => ({ target, probability: probabilities[index] })),
  });
  const valid = metrics.status === 'ready';
  const save = () => {
    try {
      const store = JSON.parse(localStorage.getItem('stockScenarioPlansV1') || '{}');
      const record = { ...plan, code, name, referencePrice: entry, updatedAt: new Date().toISOString() };
      localStorage.setItem('stockScenarioPlansV1', JSON.stringify({ ...store, [code]: record }));
      setSaveStatus('已保存');
      window.setTimeout(() => setSaveStatus(''), 2000);
    } catch { setSaveStatus('保存失败'); }
  };

  return (
    <section className="stock3-panel stock-scenario-tool">
      <div className="stock-research-head">
        <div><span>情景推演</span><strong>{name} · 参考价 {entry || '--'}</strong></div>
        <span className="stock-tool-note">概率之和必须为 100%</span>
      </div>
      <div className="stock-scenario-grid">
        {[
          ['bear', '悲观情景', 'bearTarget', 'bearProbability'],
          ['base', '基准情景', 'baseTarget', 'baseProbability'],
          ['bull', '乐观情景', 'bullTarget', 'bullProbability'],
        ].map(([tone, label, targetKey, probabilityKey]) => (
          <div className={`stock-scenario-card ${tone}`} key={tone}>
            <strong>{label}</strong>
            <label>目标价格<input type="number" min="0" value={plan[targetKey]} onChange={event => update(targetKey, event.target.value)} /></label>
            <label>主观概率 %<input type="number" min="0" max="100" value={plan[probabilityKey]} onChange={event => update(probabilityKey, event.target.value)} /></label>
          </div>
        ))}
      </div>
      {!valid && <div className="stock-risk-warning">请填写三个有效目标价，并确保概率合计为 100%。当前合计 {probabilityTotal}% 。</div>}
      {valid && (
        <div className="stock-scenario-results">
          <div><span>概率加权价格</span><strong>{metrics.weightedPrice.toFixed(2)}</strong></div>
          <div><span>期望收益率</span><strong className={metrics.expectedReturn >= 0 ? 'up' : 'down'}>{metrics.expectedReturn >= 0 ? '+' : ''}{metrics.expectedReturn.toFixed(2)}%</strong></div>
          <div><span>乐观空间</span><strong>{metrics.upside >= 0 ? '+' : ''}{metrics.upside.toFixed(2)}%</strong></div>
          <div><span>悲观空间</span><strong>{metrics.downside >= 0 ? '+' : ''}{metrics.downside.toFixed(2)}%</strong></div>
          <div><span>盈亏比</span><strong>{metrics.payoffRatio == null ? '--' : `${metrics.payoffRatio.toFixed(2)} : 1`}</strong></div>
        </div>
      )}
      <div className="stock-research-foot"><span>{saveStatus || '目标价和概率必须来自可验证假设，不是模型预测。'}</span><button type="button" className="stock-research-save" onClick={save}>保存情景</button></div>
    </section>
  );
}

const RESEARCH_CHECKLIST_ITEMS = [
  { id: 'business', group: '业务', label: '能用三句话解释商业模式、竞争优势与主要客户' },
  { id: 'financials', group: '财务', label: '已核对收入、利润、现金流及异常会计项目' },
  { id: 'balance', group: '财务', label: '已检查负债、商誉、质押、担保与偿债压力' },
  { id: 'valuation', group: '估值', label: '已选择合理可比公司和至少两种估值口径' },
  { id: 'catalyst', group: '催化', label: '催化剂有时间窗口、证据来源和可验证结果' },
  { id: 'counter', group: '反证', label: '主动寻找最强反方观点，而非只收集支持材料' },
  { id: 'governance', group: '治理', label: '已检查管理层诚信、关联交易与股东减持风险' },
  { id: 'liquidity', group: '执行', label: '仓位、流动性、退出条件与最坏损失均可承受' },
];

function ResearchChecklist({ code, name }) {
  const [record, setRecord] = useState({ statuses: {}, note: '', updatedAt: null });
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchChecklistV1') || '{}');
      setRecord({ statuses: {}, note: '', updatedAt: null, ...(store[code] || {}) });
    } catch { setRecord({ statuses: {}, note: '', updatedAt: null }); }
    setSaveStatus('');
  }, [code]);
  const setItemStatus = (id, status) => setRecord(current => ({ ...current, statuses: { ...current.statuses, [id]: status } }));
  const verified = RESEARCH_CHECKLIST_ITEMS.filter(item => record.statuses[item.id] && record.statuses[item.id] !== 'unverified').length;
  const failed = RESEARCH_CHECKLIST_ITEMS.filter(item => record.statuses[item.id] === 'failed').length;
  const save = () => {
    try {
      const store = JSON.parse(localStorage.getItem('stockResearchChecklistV1') || '{}');
      const next = { ...record, code, name, updatedAt: new Date().toISOString() };
      localStorage.setItem('stockResearchChecklistV1', JSON.stringify({ ...store, [code]: next }));
      setRecord(next);
      setSaveStatus('已保存');
      window.setTimeout(() => setSaveStatus(''), 2000);
    } catch { setSaveStatus('保存失败'); }
  };
  return (
    <section className="stock3-panel stock-research-checklist">
      <div className="stock-research-head">
        <div><span>研究清单</span><strong>{name} · 已验证 {verified}/{RESEARCH_CHECKLIST_ITEMS.length}</strong></div>
        <span className={`stock-checklist-risk ${failed > 0 ? 'failed' : ''}`}>{failed > 0 ? `${failed} 项不通过` : '尚未发现否决项'}</span>
      </div>
      <div className="stock-checklist-notice">平台不会自动把缺失数据判为通过。财务、估值、公告和治理信息需要从原始资料核验。</div>
      <div className="stock-checklist-list">
        {RESEARCH_CHECKLIST_ITEMS.map(item => (
          <div key={item.id} className={`stock-checklist-row ${record.statuses[item.id] || 'unverified'}`}>
            <span>{item.group}</span><strong>{item.label}</strong>
            <select value={record.statuses[item.id] || 'unverified'} onChange={event => setItemStatus(item.id, event.target.value)}>
              <option value="unverified">未验证</option><option value="passed">通过</option><option value="watch">需跟踪</option><option value="failed">不通过</option>
            </select>
          </div>
        ))}
      </div>
      <label className="stock-checklist-note">证据来源与待办<textarea value={record.note} onChange={event => setRecord(current => ({ ...current, note: event.target.value }))} placeholder="记录财报页码、公告链接、访谈结论或仍需核实的问题" /></label>
      <div className="stock-research-foot"><span>{saveStatus || (record.updatedAt ? `更新于 ${new Date(record.updatedAt).toLocaleString('zh-CN')}` : '尚未保存')}</span><button type="button" className="stock-research-save" onClick={save}>保存清单</button></div>
    </section>
  );
}

function BriefingContent({ content }) {
  return (
    <div className="stock-briefing-text">
      {(content || '').split('\n').map((line, index) => {
        const value = line.trim();
        if (!value) return <span className="stock-briefing-space" key={index} />;
        if (value.startsWith('## ')) return <h4 key={index}>{value.slice(3)}</h4>;
        if (/^[-*•]\s/.test(value)) return <p className="bullet" key={index}>{value.replace(/^[-*•]\s*/, '')}</p>;
        return <p key={index}>{value}</p>;
      })}
    </div>
  );
}

function IntelligenceRadar({ dashboard, sectors, selectedCode, onSelect, onInspect, policy }) {
  const candidates = useMemo(() => buildCandidateRadar(dashboard?.stocks || [], { limit: 5, policy }), [dashboard?.stocks, policy]);
  const evidence = useMemo(() => buildMarketEvidence({ indices: dashboard?.indices || [], sectors, coverage: dashboard?.coverage }), [dashboard?.coverage, dashboard?.indices, sectors]);
  return (
    <section className="stock-intelligence-radar" aria-label="智能机会雷达">
      <div className="stock-intelligence-head">
        <div>
          <strong>智能机会雷达</strong>
          <span>先排序，再研究；不直接等同于买入信号</span>
        </div>
        <div className="stock-intelligence-market"><b>{evidence.indexTone}</b><span>{evidence.indexBreadth}</span></div>
      </div>
      <div className="stock-intelligence-grid">
        {candidates.length === 0 && <span className="stock-intelligence-empty">等待行情样本</span>}
        {candidates.map(item => (
          <article key={item.code} className={`stock-intelligence-card ${item.code === selectedCode ? 'active' : ''}`}>
            <button type="button" className="stock-intelligence-pick" onClick={() => onSelect(item.code, item.name)}>
              <span className="stock-intelligence-card-top"><strong>{item.name}</strong><em>{item.code}</em><b>{item.score}</b></span>
              <span className={`stock-intelligence-state ${item.state === '值得研究' ? 'positive' : ['风险偏高', '超出策略范围'].includes(item.state) ? 'negative' : 'caution'}`}>{item.state} · {item.confidence}置信</span>
              <span className="stock-intelligence-reason">{item.reasons[0]}</span>
              <span className="stock-intelligence-risk">{item.risks[0]}</span>
            </button>
            <button type="button" className="stock-intelligence-inspect" onClick={() => onInspect(item.code, item.name)}>查看决策卡</button>
          </article>
        ))}
      </div>
      <div className="stock-intelligence-foot"><span>覆盖：{evidence.coverageLabel} · {({ conservative: '稳健', balanced: '均衡', aggressive: '进取' })[policy?.riskTolerance] || '均衡'}策略</span><span>{evidence.limitation}</span></div>
    </section>
  );
}

function InvestorPolicyTool({ policy, onSave }) {
  const [draft, setDraft] = useState(policy);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => setDraft(policy), [policy]);
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const save = () => {
    const normalized = normalizeInvestorPolicy(draft);
    onSave(normalized);
    setDraft(normalized);
    setSaveStatus('已保存并应用到智能雷达');
    window.setTimeout(() => setSaveStatus(''), 2200);
  };
  const riskBudget = Number(draft.capital || 0) * Number(draft.riskPerTrade || 0) / 100;
  return (
    <section className="stock-policy-tool">
      <div className="stock-research-head"><div><span>投资约束</span><strong>个人策略档案</strong></div><span className="stock-tool-note">所有候选先经过这些硬约束</span></div>
      <div className="stock-policy-grid">
        <label>账户规模<input type="number" min="1000" value={draft.capital} onChange={event => update('capital', event.target.value)} /></label>
        <label>单笔最大风险 %<input type="number" min="0.1" max="10" step="0.1" value={draft.riskPerTrade} onChange={event => update('riskPerTrade', event.target.value)} /></label>
        <label>单只最大仓位 %<input type="number" min="1" max="100" value={draft.maxPosition} onChange={event => update('maxPosition', event.target.value)} /></label>
        <label>研究周期<select value={draft.horizon} onChange={event => update('horizon', event.target.value)}><option value="short">短线 1-5 日</option><option value="swing">波段 2-8 周</option><option value="long">中长线 3 月以上</option></select></label>
        <label>风险偏好<select value={draft.riskTolerance} onChange={event => update('riskTolerance', event.target.value)}><option value="conservative">稳健</option><option value="balanced">均衡</option><option value="aggressive">进取</option></select></label>
        <label className="stock-policy-toggle"><input type="checkbox" checked={draft.allowGrowthBoards !== false} onChange={event => update('allowGrowthBoards', event.target.checked)} /><span>允许创业板和科创板</span></label>
      </div>
      <div className="stock-policy-summary"><div><span>每笔风险上限</span><strong>¥{Number.isFinite(riskBudget) ? riskBudget.toLocaleString('zh-CN', { maximumFractionDigits: 0 }) : '--'}</strong></div><div><span>候选处理</span><strong>不匹配标的降级或排除</strong></div><div><span>用途</span><strong>雷达排序、仓位与提醒</strong></div></div>
      <div className="stock-research-foot"><span>{saveStatus || '策略档案只约束风险，不替代个股证据研究。'}</span><button type="button" className="stock-research-save" onClick={save}>保存并应用</button></div>
    </section>
  );
}

function DecisionEvidenceTool({ stock, realtime, diagnosis, diagnosing, onAnalyze, onOpenTool }) {
  const card = useMemo(() => buildDecisionCard({ stock, realtime, diagnosis }), [diagnosis, realtime, stock]);
  return (
    <section className="stock-decision-tool">
      <div className="stock-decision-summary">
        <div><span>当前结论</span><strong>{card.headline}</strong></div>
        <button type="button" onClick={onAnalyze} disabled={diagnosing || !realtime}>{diagnosing ? '分析中…' : diagnosis ? '刷新证据' : '生成证据'}</button>
      </div>
      <div className="stock-decision-grid">
        <section><strong>已知事实</strong>{card.facts.map(item => <p key={item}>{item}</p>)}</section>
        <section className="support"><strong>支持证据</strong>{card.support.map(item => <p key={item}>{item}</p>)}</section>
        <section className="counter"><strong>反方审查</strong>{card.counter.map(item => <p key={item}>{item}</p>)}</section>
        <section className="invalid"><strong>失效条件</strong>{card.invalidation.map(item => <p key={item}>{item}</p>)}</section>
      </div>
      <div className="stock-decision-missing"><strong>证据缺口</strong>{card.missing.map(item => <span key={item}>{item}</span>)}</div>
      <div className="stock-decision-next"><span>{card.nextAction}</span><div><button type="button" onClick={() => onOpenTool('scenario')}>情景推演</button><button type="button" onClick={() => onOpenTool('risk')}>仓位预算</button></div></div>
    </section>
  );
}

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
    setKlineData(null); setTimelineData(null); setRealtime(null);
    setMarketDataState({ stale: false, unavailable: false, message: '', timestamp: '' });
    try {
      const rRes = await fetch(`/api/stock/realtime?code=${code}`);
      const payload = await rRes.json();
      const normalized = normalizeRealtimePayload(payload);
      setRealtime(normalized.realtime);
      setMarketDataState(normalized.state);
      setSelectedName(normalized.realtime?.name || code);
      // 分时图（指数和个股都支持）
      const tRes = await fetch(`/api/stock/timeline?code=${code}`);
      setTimelineData(await tRes.json());
    } catch {
      setMarketDataState({ stale: false, unavailable: true, message: '行情数据暂不可用', timestamp: '' });
    }
  }, []);

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

  // 实时行情轮询：每 10 秒刷新选中个股行情（东方财富级实时体验）
  useEffect(() => {
    if (!selectedCode) return;
    const timer = setInterval(() => refreshRealtime(selectedCode), 10000);
    return () => clearInterval(timer);
  }, [selectedCode, refreshRealtime]);

  // 大盘指数轮询：每 30 秒刷新 dashboard（指数 + 涨跌家数）
  useEffect(() => {
    if (!dashboard) return;
    const timer = setInterval(() => loadDashboard(), 30000);
    return () => clearInterval(timer);
  }, [dashboard, loadDashboard]);

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
    setSearchKeyword('');
    setSearchResults([]);
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
        <div className="stock3-data-status" title={`数据源：${realtime?.dataSource || '等待行情'}；最近拉取：${quoteUpdatedLabel}；个股每 10 秒轮询，不是逐笔行情`}>
          <span className={`stock3-data-dot ${realtime ? 'live' : ''}`} />
          <span>{marketDataState.stale ? '缓存行情' : marketDataState.unavailable ? '行情不可用' : '轮询行情'} {marketDataState.timestamp ? new Date(marketDataState.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : marketClockLabel}</span>
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
      <section ref={analysisRef} className="stock3-panel stock-ai-panel">
        <div className="stock-ai-panel-head">
          <div className="stock3-panel-label">
            {ICONS.sparkle} {ai.diagnosis?.mode === 'ai' ? 'AI 增强分析' : '算法技术分析'}
            {!ai.llmReady && <button type="button" className="stock-ai-unready" onClick={onOpenLlmConfig}>配置 AI 增强</button>}
          </div>
          {(ai.diagnosis || ai.diagnoseError) && (
            <button className="stock-ai-rerun" onClick={runDiagnosis} disabled={ai.diagnosing}>{ICONS.refresh}<span>重新分析</span></button>
          )}
        </div>
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
