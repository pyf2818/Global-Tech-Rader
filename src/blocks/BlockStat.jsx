import { ICONS } from '../constants/index.jsx';

/**
 * BlockStat — 统计数字块（数字 + 标签 + 可选趋势）
 *
 * 替代散落的 hero-briefing-stat / stat-item / profile-summary-grid 中的统计单元。
 * 视觉规格对齐 .hero-briefing-stat（纵向、居中、数字大标签小）。
 *
 * Props:
 *   value    — 数字或百分比（number | string）
 *   label    — 标签文字
 *   trend    — 可选趋势字符串（如 "+12%" / "-3%"），自动按首字符上色
 *   trendDir — 强制趋势方向 'up' | 'down' | 'neutral'，不传则按 trend 首字符推断
 *   size     — 'sm' | 'md' | 'lg'，默认 md
 *   icon     — 可选 ICONS key，显示在数字左侧
 */
export default function BlockStat({
  value,
  label,
  trend,
  trendDir,
  size = 'md',
  icon,
}) {
  const dir = trendDir || (trend == null ? 'neutral' : trend.trim().startsWith('-') ? 'down' : 'up');
  const trendClass = trend == null ? '' : ` block-stat-trend-${dir}`;

  return (
    <div className={`block-stat block-stat-${size}${trendClass}`}>
      {icon && <span className="block-stat-icon">{ICONS[icon]}</span>}
      <span className="block-stat-body">
        <span className="block-stat-value">{value}</span>
        {trend != null && <span className="block-stat-trend">{trend}</span>}
        {label && <span className="block-stat-label">{label}</span>}
      </span>
    </div>
  );
}
