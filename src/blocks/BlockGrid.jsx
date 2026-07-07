import { ICONS } from '../constants/index.jsx';

/**
 * BlockGrid — 响应式卡片网格
 *
 * 替代散落的 studio-module-grid / profile-calibration-grid / github-grid。
 * 视觉规格对齐 .studio-module-grid（grid + minmax(0,1fr) + gap:12）。
 *
 * Props:
 *   columns — 2 | 3 | 4，默认 3（窄屏自动降级）
 *   gap     — 'sm' | 'md' | 'lg'，默认 md
 *   min     — 每列最小宽度（px），默认 0；设为如 200 可避免过窄
 *   children— 卡片节点（建议用 BlockGrid.Card）
 */
export default function BlockGrid({
  columns = 3,
  gap = 'md',
  min = 0,
  children,
}) {
  const style = {
    '--block-grid-min': typeof min === 'number' ? `${min}px` : min,
  };
  return (
    <div
      className={`block-grid block-grid-cols-${columns} block-grid-gap-${gap}`}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * BlockGrid.Card — 网格卡片
 *
 * 视觉规格对齐 .studio-module-card（border + radius:12 + hover 抬升）。
 * 支持顶部图标 + 标题 + 描述 + 底部 meta 行。
 *
 * Props:
 *   icon     — ICONS key
 *   title    — 卡片标题
 *   desc     — 卡片描述
 *   meta     — { metric, action } 或 ReactNode；对象形态对应 .studio-module-meta
 *   onClick  — 点击回调（存在时整卡可点击）
 *   variant  — 'default' | 'primary'（primary 对应 .studio-module-card.primary 高亮）
 *   children — 自定义内容（覆盖 icon/title/desc/meta 组合）
 */
BlockGrid.Card = function BlockGridCard({
  icon,
  title,
  desc,
  meta,
  onClick,
  variant = 'default',
  children,
}) {
  const clickable = onClick ? ' block-grid-card-clickable' : '';
  const isObjMeta = meta && typeof meta === 'object' && !Array.isArray(meta);

  return (
    <button
      type="button"
      className={`block-grid-card block-grid-card-${variant}${clickable}`}
      onClick={onClick}
    >
      {children || (
        <>
          {icon && <span className="block-grid-card-icon">{ICONS[icon]}</span>}
          {title && <span className="block-grid-card-title">{title}</span>}
          {desc && <span className="block-grid-card-desc">{desc}</span>}
          {isObjMeta && (
            <span className="block-grid-card-meta">
              {meta.metric != null && <strong>{meta.metric}</strong>}
              {meta.action != null && <em>{meta.action}</em>}
            </span>
          )}
          {meta && !isObjMeta && <span className="block-grid-card-meta">{meta}</span>}
        </>
      )}
    </button>
  );
};
