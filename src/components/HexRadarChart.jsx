import { REGION_MAP } from '../constants/index.jsx';

function HexRadarChart({ categories, regions, matrix, maxVal }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const levels = 4;
  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const regionColors = { domestic: '#3b82f6', overseas: '#22d3ee', global: '#a78bfa' };
  const regionGlows = { domestic: 'rgba(59,130,246,0.6)', overseas: 'rgba(34,211,238,0.6)', global: 'rgba(167,139,250,0.6)' };
  const regionFills = { domestic: 'rgba(59,130,246,0.30)', overseas: 'rgba(34,211,238,0.30)', global: 'rgba(167,139,250,0.30)' };

  const getPoint = (idx, value) => {
    const ratio = maxVal > 0 ? value / maxVal : 0;
    const angle = startAngle + idx * angleStep;
    const px = cx + r * ratio * Math.cos(angle);
    const py = cy + r * ratio * Math.sin(angle);
    return { px, py };
  };

  const hexPoints = (level) => {
    const lr = r * (level / levels);
    return Array.from({ length: n }, (_, i) => {
      const angle = startAngle + i * angleStep;
      return `${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`;
    }).join(' ');
  };

  const regionPath = (region) => {
    const values = categories.map(c => matrix[region]?.[c.id] || 0);
    return values.map((v, i) => {
      const p = getPoint(i, v);
      return `${p.px},${p.py}`;
    }).join(' ');
  };

  return (
    <div className="hex-radar-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="hex-radar-svg">
        <defs>
          {regions.map(region => (
            <filter key={`glow-${region}`} id={`glow-${region}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          ))}
        </defs>
        {Array.from({ length: levels }, (_, l) => (
          <polygon key={`grid-${l}`} points={hexPoints(l + 1)} fill={l === levels ? 'var(--bg-hover)' : 'none'} stroke="var(--border-active)" strokeWidth="1" opacity={l === levels ? 0.4 : 0.25} />
        ))}
        {categories.map((cat, i) => {
          const angle = startAngle + i * angleStep;
          const ex = cx + (r + 22) * Math.cos(angle);
          const ey = cy + (r + 22) * Math.sin(angle);
          const ax = cx + r * Math.cos(angle);
          const ay = cy + r * Math.sin(angle);
          return (
            <g key={`axis-${cat.id}`}>
              <line x1={cx} y1={cy} x2={ax} y2={ay} stroke="var(--border-active)" strokeWidth="1" opacity="0.35" />
              <text x={ex} y={ey} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="var(--text-secondary)" fontWeight="600">{cat.label.length > 4 ? cat.label.slice(0, 4) : cat.label}</text>
            </g>
          );
        })}
        {regions.map(region => (
          <polygon key={region} points={regionPath(region)} fill={regionFills[region]} stroke={regionColors[region]} strokeWidth="2" strokeLinejoin="round" filter={`url(#glow-${region})`} />
        ))}
        {regions.map(region => categories.map((cat, i) => {
          const v = matrix[region]?.[cat.id] || 0;
          if (!v) return null;
          const p = getPoint(i, v);
          return <circle key={`dot-${region}-${cat.id}`} cx={p.px} cy={p.py} r="3.5" fill={regionColors[region]} stroke="white" strokeWidth="1.5" />;
        }))}
        {regions.map(region => categories.map((cat, i) => {
          const v = matrix[region]?.[cat.id] || 0;
          if (!v) return null;
          const p = getPoint(i, v);
          const angle = startAngle + i * angleStep;
          const lx = p.px + 10 * Math.cos(angle);
          const ly = p.py + 10 * Math.sin(angle);
          return <text key={`val-${region}-${cat.id}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="7" fill={regionColors[region]} fontWeight="600">{v}</text>;
        }))}
      </svg>
      <div className="hex-radar-legend">
        {regions.map(r => <span key={r} className="hex-legend-item"><span className="hex-legend-dot" style={{ background: regionColors[r], boxShadow: `0 0 6px ${regionGlows[r]}` }} />{REGION_MAP[r]}</span>)}
      </div>
    </div>
  );
}

export default HexRadarChart;
