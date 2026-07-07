/**
 * BlockList — 列表行容器
 *
 * 替代散落的 hotspot-list / profile-rec-item-wrap / agent-workflow-missions 等列表外壳。
 * 行内容由 children 自由组合，建议配合 BlockList.Row 使用以获得统一的 grid 行布局。
 *
 * 用法：
 *   <BlockList items={data} renderItem={(item, i) => <BlockList.Row ... />} />
 *   <BlockList>{手动拼接的行}</BlockList>
 *
 * Props:
 *   items      — 数据数组（与 renderItem 配合使用）
 *   renderItem — (item, index) => ReactNode
 *   gap        — 'sm' | 'md' | 'lg'，默认 md
 *   divided    — 是否显示行底分隔线（对应 hotspot-row 的 border-bottom）
 *   children   — 直接传入行节点（与 items/renderItem 二选一）
 */
export default function BlockList({
  items,
  renderItem,
  gap = 'md',
  divided = false,
  children,
}) {
  const content = items && renderItem
    ? items.map((item, i) => renderItem(item, i))
    : children;

  return (
    <div className={`block-list block-list-gap-${gap}${divided ? ' block-list-divided' : ''}`}>
      {content}
    </div>
  );
}

/**
 * BlockList.Row — 标准列表行
 *
 * 视觉规格对齐 .hotspot-row（grid: [rank] 1fr [meta]）与 .agent-workflow-mission。
 * 可点击行自动获得 hover 背景。
 *
 * Props:
 *   rank    — 序号/排名（number | string），显示为左侧粗体数字
 *   title   — 主标题
 *   meta    — 右侧元信息（信源数、时间等）
 *   onClick — 行点击回调
 *   active  — 是否高亮（对应 .agent-workflow-mission.active）
 *   children— 自定义行内容（与 rank/title/meta 三选一或组合）
 */
BlockList.Row = function BlockListRow({
  rank,
  title,
  meta,
  onClick,
  active = false,
  children,
}) {
  const hasBuiltIn = rank != null || title != null || meta != null;
  const clickable = onClick ? ' block-row-clickable' : '';
  const activeCls = active ? ' block-row-active' : '';

  if (!hasBuiltIn) {
    return (
      <div
        className={`block-row${clickable}${activeCls}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`block-row block-row-grid${clickable}${activeCls}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {rank != null && <span className="block-row-rank">{rank}</span>}
      {title != null && <span className="block-row-title">{title}</span>}
      {meta != null && <span className="block-row-meta">{meta}</span>}
      {children}
    </div>
  );
};
