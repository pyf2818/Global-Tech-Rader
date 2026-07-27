import React from 'react';

const UP_COLOR = '#ef4444';
const DOWN_COLOR = '#22c55e';

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

export { TimelineChart, OrderBook };
