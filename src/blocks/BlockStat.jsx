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
 *   desc     — 卡片形态下的描述文字（仅 variant=card 时显示）
 *   trend    — 可选趋势字符串（如 "+12%" / "-3%"），自动按首字符上色
 *   trendDir — 强制趋势方向 'up' | 'down' | 'neutral'，不传则按 trend 首字符推断
 *   size     — 'sm' | 'md' | 'lg'，默认 md
 *   variant  — 'inline' | 'card'，默认 inline
 *               inline: 紧凑横向（icon+body），适合放在工具条/hero 摘要里
 *               card:   卡片形态（带边框背景，纵向 label/value/desc），替代 profile-summary-grid div
 *   icon     — 可选 ICONS key，显示在数字左侧
 */
export default function BlockStat({
  value,
  label,
  desc,
  trend,
  trendDir,
  size = 'md',
  variant = 'inline',
  icon,
}) {
  const dir = trendDir || (trend == null ? 'neutral' : trend.trim().startsWith('-') ? 'down' : 'up');
  const trendClass = trend == null ? '' : ` block-stat-trend-${dir}`;
  const variantClass = ` block-stat-${variant}`;

  if (variant === 'card') {
    return (
      <div className={`block-stat block-stat-card block-stat-card-${size}`}>
        {label && <span className="block-stat-card-label">{label}</span>}
        <strong className="block-stat-card-value">{value}</strong>
        {desc && <p className="block-stat-card-desc">{desc}</p>}
      </div>
    );
  }

  return (
    <div className={`block-stat block-stat-${size}${trendClass}${variantClass}`}>
      {icon && <span className="block-stat-icon">{ICONS[icon]}</span>}
      <span className="block-stat-body">
        <span className="block-stat-value">{value}</span>
        {trend != null && <span className="block-stat-trend">{trend}</span>}
        {label && <span className="block-stat-label">{label}</span>}
      </span>
    </div>
  );
}
