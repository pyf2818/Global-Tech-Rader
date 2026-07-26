import { ICONS } from '../constants/index.jsx';

export default function ShortcutsModal({
  showShortcuts,
  setShowShortcuts,
}) {
  if (!showShortcuts) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>快捷键</h3><button className="modal-close" onClick={() => setShowShortcuts(false)}>{ICONS.x}</button></div>
        <div className="modal-body">
          <div className="shortcuts-list">
            <div className="shortcut-row"><kbd>Ctrl K</kbd><span>命令面板</span></div>
            <div className="shortcut-row"><kbd>J</kbd><span>下一条资讯</span></div>
            <div className="shortcut-row"><kbd>K</kbd><span>上一条资讯</span></div>
            <div className="shortcut-row"><kbd>O</kbd><span>打开原文链接</span></div>
            <div className="shortcut-row"><kbd>S</kbd><span>收藏/取消收藏</span></div>
            <div className="shortcut-row"><kbd>1</kbd><span>紧凑视图</span></div>
            <div className="shortcut-row"><kbd>2</kbd><span>标准视图</span></div>
            <div className="shortcut-row"><kbd>3</kbd><span>卡片视图</span></div>
            <div className="shortcut-row"><kbd>?</kbd><span>显示快捷键帮助</span></div>
            <div className="shortcut-row"><kbd>Esc</kbd><span>关闭弹窗</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
