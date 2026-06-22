import React from 'react';

/* Palette definitions */
const PALETTES = [
  { id: 'champagne',   label: '香槟金',  dark: '#0B0E11', light: '#F7F5F0', accent: '#C9A961', gradient: 'linear-gradient(135deg, #D4B576, #C9A961)' },
  { id: 'sakura',      label: '樱花粉',  dark: '#1A1014', light: '#FFF5F7', accent: '#F9A8B8', gradient: 'linear-gradient(135deg, #FBC8D4, #E85A7E)' },
  { id: 'forest',      label: '翠翠绿',  dark: '#0C1410', light: '#F2FBF5', accent: '#34D399', gradient: 'linear-gradient(135deg, #4ADE80, #34D399)' },
  { id: 'neon',        label: '赛博蓝',  dark: '#0F0A1E', light: '#F0F4FF', accent: '#22D3EE', gradient: 'linear-gradient(135deg, #22D3EE, #A855F7)' },
  { id: 'cosmos',      label: '深空蓝',  dark: '#0A0F1A', light: '#F0F5FF', accent: '#60A5FA', gradient: 'linear-gradient(135deg, #60A5FA, #3B82F6)' },
  { id: 'terracotta',  label: '赤陶橘',  dark: '#1A1410', light: '#FFF8F2', accent: '#E07856', gradient: 'linear-gradient(135deg, #F0A878, #C8623E)' },
  { id: 'arctic',      label: '北极银',  dark: '#0D0F12', light: '#F8FAFC', accent: '#94A3B8', gradient: 'linear-gradient(135deg, #E2E8F0, #94A3B8)' },
  { id: 'aurora',      label: '极光紫',  dark: '#12081E', light: '#F5F0FF', accent: '#C084FC', gradient: 'linear-gradient(135deg, #C084FC, #818CF8)' },
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

/**
 * ThemePicker - centered modal with mode switch + palette grid
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

        {/* Mode switch */}
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
          </div>
        </div>

        <div className="theme-divider" />

        {/* Palette grid - 4x2 */}
        <div className="theme-modal-section">
          <div className="theme-modal-label">{'配色方案'}</div>
          <div className="theme-modal-palette-grid">
            {PALETTES.map(p => {
              const isActive = palette === p.id;
              return (
                <button key={p.id}
                  className={'theme-palette-card' + (isActive ? ' active' : '')}
                  style={{ '--palette-glow': p.accent }}
                  onClick={() => setPalette(p.id)}>
                  <span className="theme-palette-swatch" style={{
                    background: p.gradient,
                    boxShadow: isActive
                      ? 'inset 0 0 0 1.5px rgba(255,255,255,0.3), 0 0 12px ' + p.accent
                      : 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                  }} />
                  <span className="theme-palette-name">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
