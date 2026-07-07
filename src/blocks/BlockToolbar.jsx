import { ICONS } from '../constants/index.jsx';

/**
 * BlockToolbar — 筛选/工具条
 *
 * 替代散落的 workbench-filter-row / github-filter-bar / lang-tabs。
 * 由若干 Pill 组（单选切换）和一个可选搜索框组成。
 *
 * 用法：
 *   <BlockToolbar>
 *     <BlockToolbar.Pills options={modes} value={mode} onChange={setMode} />
 *     <BlockToolbar.Pills options={regions} value={region} onChange={setRegion} />
 *     <BlockToolbar.Search value={q} onChange={setQ} placeholder="搜索..." />
 *   </BlockToolbar>
 *
 * Pills options 形态: [{ id, label }] 或 [id1, id2]（label 取 id）
 */
export default function BlockToolbar({ children, wrap = true, hidden = false }) {
  if (hidden) return null;
  return (
    <div className={`block-toolbar${wrap ? ' block-toolbar-wrap' : ''}`}>
      {children}
    </div>
  );
}

/**
 * BlockToolbar.Pills — 单选 pill 按钮组
 *
 * 视觉规格对齐 .filter-pill（border + radius:7 + active 时 cyan 高亮）。
 *
 * Props:
 *   options  — [{ id, label }] 或 [id, ...]
 *   value    — 当前选中 id
 *   onChange — (id) => void
 *   ariaLabel— 无障碍标签
 */
BlockToolbar.Pills = function BlockPills({ options, value, onChange, ariaLabel }) {
  const opts = (options || []).map(opt => {
    const isObj = typeof opt === 'object' && opt !== null;
    return isObj ? opt : { id: opt, label: String(opt) };
  });

  return (
    <div className="block-pills" role="radiogroup" aria-label={ariaLabel}>
      {opts.map(opt => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={`block-pill${value === opt.id ? ' active' : ''}`}
          onClick={() => onChange?.(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

/**
 * BlockToolbar.Search — 紧凑搜索框
 *
 * 视觉对齐 .workbench-search（左 icon + input）。
 *
 * Props:
 *   value, onChange, placeholder — 标准 input 属性
 *   icon — ICONS key，默认 'search'
 */
BlockToolbar.Search = function BlockSearch({
  value,
  onChange,
  placeholder,
  icon = 'search',
  inputRef,
  ...rest
}) {
  return (
    <label className="block-search">
      <span className="block-search-icon">{ICONS[icon]}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
};

/**
 * BlockToolbar.Slot — 工具条右侧弹性占位
 *   用于把后续元素推到工具条末端（margin-left:auto）。
 */
BlockToolbar.Slot = function BlockSlot({ children }) {
  return <div className="block-toolbar-slot">{children}</div>;
};
