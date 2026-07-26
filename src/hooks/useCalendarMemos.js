import { useMemo } from 'react';

/**
 * Derived calendar computations — extracted from App.jsx
 * @param {Date} calendarDate - currently viewed month
 * @param {Array} items - news items (for heatmap)
 * @param {Array} events - calendar events
 */
export function useCalendarMemos(calendarDate, items, events) {
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, month: month - 1, year, isCurrentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, month, year, isCurrentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    return days;
  }, [calendarDate]);

  const calendarHeatMap = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const d = new Date(item.publishedAt);
      if (d.getFullYear() === calendarDate.getFullYear() && d.getMonth() === calendarDate.getMonth()) {
        const key = d.getDate();
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [items, calendarDate]);

  const calendarInsights = useMemo(() => {
    const monthEvents = events.filter(e => {
      const d = new Date(`${e.date}T00:00:00`);
      return d.getFullYear() === calendarDate.getFullYear() && d.getMonth() === calendarDate.getMonth();
    });
    const upcoming = events
      .filter(e => new Date(`${e.date}T${e.time || '23:59'}`) >= new Date())
      .sort((a, b) => new Date(`${a.date}T${a.time || '23:59'}`) - new Date(`${b.date}T${b.time || '23:59'}`))
      .slice(0, 5);
    const activeDays = new Set(monthEvents.map(e => e.date)).size;
    return { monthTotal: monthEvents.length, activeDays, upcoming };
  }, [events, calendarDate]);

  return { calendarDays, calendarHeatMap, calendarInsights };
}
