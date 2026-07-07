import { ICONS } from '../constants/index.jsx';

/**
 * BlockPanel — 带标题的容器面板
 *
 * 替代散落的 *-panel / *-card / agent-workflow-panel / profile-control-panel 等。
 * 视觉规格对齐 .studio-module-card / .agent-workflow-panel（border + radius:12 + bg-card）。
 *
 * Props:
 *   title    — 面板标题（不传则无标题栏，variant=flat 风格）
 *   desc     — 标题下方描述文字
 *   icon     — 标题图标（ICONS key）
 *   variant  — 'default' | 'flat' | 'highlight'
 *               default: 带边框卡片
 *               flat:    无标题栏，仅容器
 *               highlight: cyan 渐变高亮（对应 .studio-module-card.primary）
 *   action   — 标题栏右侧操作节点（按钮/链接）
 *   bodyClass— 内容区额外类名
 *   onClick  — 点击面板整体（使面板可点击时使用）
 *   interactive — 是否启用 hover 抬升交互（onClick 存在时默认 true）
 *   children — 面板内容
 */
export default function BlockPanel({
  title,
  desc,
  icon,
  variant = 'default',
  action,
  bodyClass = '',
  onClick,
  interactive,
  children,
}) {
  const hasHeader = title || icon || desc || action;
  const isInteractive = interactive ?? Boolean(onClick);
  const clickable = onClick ? ' block-panel-clickable' : '';
  const interactCls = isInteractive ? ' block-panel-interactive' : '';

  return (
    <section
      className={`block-panel block-panel-${variant}${clickable}${interactCls}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {hasHeader && (
        <header className="block-panel-header">
          <div className="block-panel-heading">
            {icon && <span className="block-panel-icon">{ICONS[icon]}</span>}
            <div>
              {title && <h3 className="block-panel-title">{title}</h3>}
              {desc && <p className="block-panel-desc">{desc}</p>}
            </div>
          </div>
          {action && <div className="block-panel-action">{action}</div>}
        </header>
      )}
      <div className={`block-panel-body ${bodyClass}`.trim()}>
        {children}
      </div>
    </section>
  );
}
