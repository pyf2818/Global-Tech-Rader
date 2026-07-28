// 输入历史导航 hook：Claude Code / shell 风格的 ↑/↓ 历史浏览
// 从 src/components/AiChatPanel.jsx 抽离，纯 hook
import { useRef, useState, useCallback } from 'react';

/**
 * @param {object} opts
 * @param {React.RefObject<HTMLTextAreaElement>} opts.inputRef textarea 引用
 * @param {string} opts.input 当前输入值
 * @param {(v: string) => void} opts.setInput 设置输入值
 * @param {() => void} opts.sendMessage 发送消息
 * @returns {{handleKeyDown: (e: KeyboardEvent) => void}}
 */
export function useInputHistory({ inputRef, input, setInput, sendMessage }) {
  const inputHistoryRef = useRef([]); // 数组：[oldest, ..., newest]
  const draftRef = useRef(''); // 进入历史浏览前的草稿
  const historyIndexRef = useRef(null); // 用 ref 避免 rapid keypress 时的闭包陈旧
  const [, setHistoryIndexTick] = useState(0); // 仅用于触发 textarea 重渲染（值本身存在 ref 中）

  const handleKeyDown = useCallback((e) => {
    // 输入历史导航（Claude Code / shell 风格）：
    //   - 单行输入（无换行）下 ↑/↓ 总是触发历史导航，避免光标位置判断导致连续按失效
    //   - 多行编辑时 ↑/↓ 移动光标，不拦截
    //   - 历史浏览态下即使当前内容含换行也允许 ↑/↓ 导航（因为是历史消息）
    // 全部使用 ref（inputRef/historyIndexRef），避免 rapid keypress 时 React 闭包陈旧
    const currentInput = inputRef.current?.value || '';
    const currentIdx = historyIndexRef.current;
    const isBrowsing = currentIdx !== null;
    const isSingleLine = !currentInput.includes('\n');
    const navigateHistory = isSingleLine || isBrowsing;

    const moveCursorToEnd = () => {
      const el = inputRef.current;
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    };

    if (e.key === 'ArrowUp' && navigateHistory) {
      const hist = inputHistoryRef.current;
      if (hist.length === 0) return;
      e.preventDefault();
      if (currentIdx === null) {
        // 进入历史浏览：保存草稿，跳到最新一条
        draftRef.current = currentInput;
        historyIndexRef.current = 0;
        setHistoryIndexTick(v => v + 1);
        setInput(hist[hist.length - 1]);
        requestAnimationFrame(moveCursorToEnd);
      } else if (currentIdx < hist.length - 1) {
        // 继续往更旧的方向走
        const next = currentIdx + 1;
        historyIndexRef.current = next;
        setHistoryIndexTick(v => v + 1);
        setInput(hist[hist.length - 1 - next]);
        requestAnimationFrame(moveCursorToEnd);
      }
      // 已经在最旧一条，按 ↑ 不再前进
      return;
    }

    if (e.key === 'ArrowDown' && navigateHistory) {
      const hist = inputHistoryRef.current;
      if (currentIdx === null || hist.length === 0) return;
      e.preventDefault();
      if (currentIdx === 0) {
        // 已在最新一条，再按 ↓ 回到空白（恢复草稿，通常为空）
        setInput(draftRef.current);
        draftRef.current = '';
        historyIndexRef.current = null;
        setHistoryIndexTick(v => v + 1);
        requestAnimationFrame(moveCursorToEnd);
      } else {
        // 往更新的方向走
        const next = currentIdx - 1;
        historyIndexRef.current = next;
        setHistoryIndexTick(v => v + 1);
        setInput(hist[hist.length - 1 - next]);
        requestAnimationFrame(moveCursorToEnd);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  return { inputHistoryRef, draftRef, historyIndexRef, handleKeyDown };
}
