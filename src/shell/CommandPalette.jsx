import { useState, useEffect, useRef, useMemo } from 'react';
import { ICONS } from '../constants/index.jsx';

/**
 * CommandPalette — 全局命令面板（Ctrl+K / Cmd+K 唤出）
 *
 * 飞书设计理念：把"搜索 + 跳转 + 快捷动作"统一进一个全局面板，
 * 让"功能多"被搜索兜住，而不是堆在导航栏。
 *
 * 当前能力（最小可行版本）：
 *   - 页面跳转：9 个主导航
 *   - 资讯搜索：复用传入的 onSearch 回调（调用现有 executeSearch）
 *   - 快捷动作：刷新、生成今日汇报、切换主题（可选，按需传入）
 *
 * Props:
 *   open         — 是否打开（受控）
 *   onClose      — 关闭回调
 *   navItems     — [{ id, label, icon, nav }] 页面跳转项
 *   onNavigate   — (navId) => void 跳转回调
 *   onSearch     — (query) => void 资讯搜索回调
 *   actions      — [{ id, label, icon, run }] 额外快捷动作
 */
export default function CommandPalette({
  open,
  onClose,
  navItems = [],
  onNavigate,
  onSearch,
  actions = [],
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // 构建命令列表
  const commands = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navCommands = navItems.map(item => ({
      id: `nav:${item.id}`,
      type: 'nav',
      label: item.label,
      icon: item.icon,
      hint: '跳转',
      run: () => { onNavigate?.(item.nav || item.id); onClose?.(); },
    }));

    const actionCommands = actions.map(a => ({
      id: `action:${a.id}`,
      type: 'action',
      label: a.label,
      icon: a.icon,
      hint: a.hint || '动作',
      run: () => { a.run?.(); onClose?.(); },
    }));

    const searchCommand = query.trim()
      ? [{
          id: `search:${query.trim()}`,
          type: 'search',
          label: `搜索"${query.trim()}"`,
          icon: 'search',
          hint: '资讯',
          run: () => { onSearch?.(query.trim()); onClose?.(); },
        }]
      : [];

    const all = [...navCommands, ...actionCommands, ...searchCommand];
    if (!q) return all;
    return all.filter(c => c.label.toLowerCase().includes(q));
  }, [query, navItems, actions, onNavigate, onSearch, onClose]);

  // activeIndex 越界保护
  useEffect(() => {
    if (activeIndex >= commands.length) setActiveIndex(0);
  }, [commands, activeIndex]);

  // 键盘导航
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commands[activeIndex]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  // 滚动到 active 项
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-palette-input-wrap">
          <span className="cmd-palette-icon">{ICONS.search}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面、资讯或动作..."
            className="cmd-palette-input"
          />
          <kbd className="cmd-palette-esc">ESC</kbd>
        </div>
        <div className="cmd-palette-list" ref={listRef}>
          {commands.length === 0 && (
            <div className="cmd-palette-empty">没有匹配的命令</div>
          )}
          {commands.map((cmd, i) => (
            <button
              key={cmd.id}
              data-idx={i}
              className={`cmd-palette-item ${i === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => cmd.run()}
            >
              <span className="cmd-palette-item-icon">{ICONS[cmd.icon] || ICONS.sparkle}</span>
              <span className="cmd-palette-item-label">{cmd.label}</span>
              <span className="cmd-palette-item-hint">{cmd.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
