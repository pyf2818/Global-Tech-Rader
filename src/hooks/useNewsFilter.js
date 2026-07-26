import { useMemo } from 'react';
import { formatRelative } from '../utils/format.js';

/**
 * Pure news-list derived computations from the raw items array.
 * Extracted from App.jsx to reduce component size.
 */
export function useNewsFilter(items, category, mode) {
  // Top-scored items for the scrolling ticker
  const scrollingNews = useMemo(() => {
    const sorted = [...items]
      .filter(item => item.title)
      .sort((a, b) => (b.mustReadScore || b.hot || 0) - (a.mustReadScore || a.hot || 0))
      .slice(0, 12);
    if (sorted.length > 0) {
      return sorted.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        source: item.source || '',
        time: item.publishedAt ? formatRelative(item.publishedAt) : '',
        hot: (item.mustReadScore || 0) >= 60,
      }));
    }
    return [];
  }, [items]);

  // Region counts: { domestic, overseas, global }
  const sourceStats = useMemo(
    () => items.reduce(
      (s, i) => ({ ...s, [i.region]: (s[i.region] || 0) + 1 }),
      { domestic: 0, overseas: 0, global: 0 }
    ),
    [items]
  );

  // Distinct publication dates (last 14), newest-first
  const availableNewsDates = useMemo(() => {
    const dates = [
      ...new Set(items.map(item => item.publishedAt?.slice(0, 10)).filter(Boolean)),
    ].sort((a, b) => b.localeCompare(a));
    return dates.slice(0, 14);
  }, [items]);

  // Source options filtered by current category+mode, sorted by count
  const sourceOptions = useMemo(() => {
    const counts = new Map();
    items
      .filter(item => {
        const cat = category === 'all' || item.category === category;
        const md  = mode === 'all'     || item.mode === mode;
        return cat && md;
      })
      .forEach(item => counts.set(item.source, (counts.get(item.source) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, category, mode]);

  return { scrollingNews, sourceStats, availableNewsDates, sourceOptions };
}
