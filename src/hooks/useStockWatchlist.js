import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

/**
 * 股票自选列表 —— localStorage 持久化
 * 存储结构：[{ code, name, secid, market }]
 */
export function useStockWatchlist() {
  const [watchlist, setWatchlist] = useLocalStorage('stockWatchlist', []);

  const inWatchlist = useCallback((code) => watchlist.some(s => s.code === code), [watchlist]);

  const addStock = useCallback((stock) => {
    if (!stock?.code) return;
    setWatchlist(prev => prev.some(s => s.code === stock.code) ? prev : [...prev, stock]);
  }, [setWatchlist]);

  const removeStock = useCallback((code) => {
    setWatchlist(prev => prev.filter(s => s.code !== code));
  }, [setWatchlist]);

  const toggleStock = useCallback((stock) => {
    if (!stock?.code) return;
    setWatchlist(prev => prev.some(s => s.code === stock.code)
      ? prev.filter(s => s.code !== stock.code)
      : [...prev, stock]);
  }, [setWatchlist]);

  const moveStock = useCallback((code, direction) => {
    setWatchlist(prev => {
      const idx = prev.findIndex(s => s.code === code);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, [setWatchlist]);

  return { watchlist, inWatchlist, addStock, removeStock, toggleStock, moveStock };
}
