import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';

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

export default KLineChart;
