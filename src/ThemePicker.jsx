import React from 'react';

/* Palette definitions — original 8 + 4 natural series */
const PALETTES = [
  { id: 'champagne',   label: '香槟金', accent: '#C9A961', gradient: 'linear-gradient(135deg, #D4B576, #C9A961)', desc: '温润典雅' },
  { id: 'sakura',      label: '樱花粉', accent: '#F9A8B8', gradient: 'linear-gradient(135deg, #FBC8D4, #E85A7E)', desc: '柔美浪漫' },
  { id: 'forest',      label: '翠翠绿', accent: '#34D399', gradient: 'linear-gradient(135deg, #4ADE80, #34D399)', desc: '清新自然' },
  { id: 'neon',        label: '赛博蓝', accent: '#22D3EE', gradient: 'linear-gradient(135deg, #22D3EE, #A855F7)', desc: '未来科技' },
  { id: 'cosmos',      label: '深空蓝', accent: '#60A5FA', gradient: 'linear-gradient(135deg, #60A5FA, #3B82F6)', desc: '深邃静谧' },
  { id: 'terracotta',  label: '赤陶橘', accent: '#E07856', gradient: 'linear-gradient(135deg, #F0A878, #C8623E)', desc: '大地温度' },
  { id: 'arctic',      label: '北极银', accent: '#94A3B8', gradient: 'linear-gradient(135deg, #E2E8F0, #94A3B8)', desc: '极简纯净' },
  { id: 'aurora',      label: '极光紫', accent: '#C084FC', gradient: 'linear-gradient(135deg, #C084FC, #818CF8)', desc: '梦幻瑰丽' },
  { id: 'bamboo',      label: '墨竹青', accent: '#5B9A8B', gradient: 'linear-gradient(135deg, #7BC8A4, #3A7D6E)', desc: '东方清雅' },
  { id: 'amber',       label: '琥珀棕', accent: '#C49A3C', gradient: 'linear-gradient(135deg, #D4A843, #A07B28)', desc: '沉稳温暖' },
  { id: 'twilight',    label: '暮光蓝', accent: '#7B93A8', gradient: 'linear-gradient(135deg, #A0B8CC, #5C7A92)', desc: '黄昏宁静' },
  { id: 'coral',       label: '珊瑚橙', accent: '#E8856C', gradient: 'linear-gradient(135deg, #F4A48C, #D06850)', desc: '活力热烈' },
];

export { PALETTES };

/* SVG icons */
const SunIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="2" y1="12" x2="4" y2="12"/>
    <line x1="20" y1="12" x2="22" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const CloseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const MonitorIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

/**
 * ThemePicker — upgraded modal with mode (dark/light/system) + rich palette preview cards
 * mode values: 'dark' | 'light' | 'system'
 */
export default function ThemePicker({ mode, setMode, palette, setPalette, show, onClose }) {
  if (!show) return null;

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="theme-modal-header">
          <div className="theme-modal-title">{'主题设置'}</div>
          <button className="theme-modal-close" onClick={onClose}>{CloseIcon}</button>
        </div>

        {/* Mode switch — 3 options: dark / light / system */}
        <div className="theme-modal-section">
          <div className="theme-modal-label">{'显示模式'}</div>
          <div className="theme-mode-row">
            <button className={'theme-mode-btn' + (mode === 'dark' ? ' active' : '')}
              onClick={() => setMode('dark')}>
              {MoonIcon}<span>{'深色'}</span>
            </button>
            <button className={'theme-mode-btn' + (mode === 'light' ? ' active' : '')}
              onClick={() => setMode('light')}>
              {SunIcon}<span>{'浅色'}</span>
            </button>
            <button className={'theme-mode-btn' + (mode === 'system' ? ' active' : '')}
              onClick={() => setMode('system')}>
              {MonitorIcon}<span>{'跟随'}</span>
            </button>
          </div>
        </div>

        <div className="theme-divider" />

        {/* Palette grid — 2 groups: 经典 & 自然 */}
        <div className="theme-modal-section">
          <div className="theme-modal-label">{'经典配色'}</div>
          <div className="theme-modal-palette-grid">
            {PALETTES.slice(0, 8).map(p => (
              <PaletteCard key={p.id} p={p} isActive={palette === p.id} onClick={() => setPalette(p.id)} />
            ))}
          </div>
        </div>

        <div className="theme-modal-section">
          <div className="theme-modal-label">{'自然色系'}</div>
          <div className="theme-modal-palette-grid">
            {PALETTES.slice(8).map(p => (
              <PaletteCard key={p.id} p={p} isActive={palette === p.id} onClick={() => setPalette(p.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Palette card with multi-swatch preview */
function PaletteCard({ p, isActive, onClick }) {
  // Derive 4 preview swatches from the palette accent colors
  const swatches = React.useMemo(() => {
    // Map accent → derive complementary hues for preview
    const h = hexToHSL(p.accent);
    return [
      p.accent,
      hslToHex((h.h + 30) % 360, Math.max(h.s - 15, 20), Math.min(h.l + 10, 85)),
      hslToHex((h.h + 180) % 360, Math.max(h.s - 20, 15), Math.min(h.l + 5, 80)),
      hslToHex((h.h + 240) % 360, Math.min(h.s + 5, 90), Math.max(h.l - 10, 15)),
    ];
  }, [p.accent]);

  return (
    <button
      className={'theme-palette-card' + (isActive ? ' active' : '')}
      style={{ '--palette-glow': p.accent }}
      onClick={onClick}
    >
      <div className="theme-palette-preview">
        <div className="theme-palette-gradient" style={{ background: p.gradient }} />
        <div className="theme-palette-swatches">
          {swatches.map((c, i) => (
            <span key={i} className="theme-palette-dot" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="theme-palette-info">
        <span className="theme-palette-name">{p.label}</span>
        <span className="theme-palette-desc">{p.desc}</span>
      </div>
    </button>
  );
}

/* --- Color helpers for swatch derivation --- */
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  const sN = s / 100, lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lN - c / 2;
  let r, g, b;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}
