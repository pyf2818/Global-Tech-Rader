/**
 * RecommendationDateRail - 精准推荐页右侧竖向时间线
 *
 * 竖向线条 + 节点形式，每个节点是一个有推荐快照的日期。
 * 点击节点切换 selectedDate，中间卡片流随之切换到该日推荐。
 */
import { useMemo } from 'react';

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function weekdayLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
}

export default function RecommendationDateRail({
  snapshots,
  selectedDate,
  onSelectDate,
  loading,
  onRefresh,
}) {
  const dates = useMemo(() => {
    const set = new Set();
    (snapshots || []).forEach(s => s.date && set.add(s.date));
    if (selectedDate) set.add(selectedDate);
    return [...set].sort((a, b) => String(b).localeCompare(String(a)));
  }, [snapshots, selectedDate]);

  return (
    <aside className="recommendation-date-rail custom-scrollbar">
      <header className="intel-sidebar-section-head">
        <h3>推荐时间线</h3>
        <button
          type="button"
          className="intel-sidebar-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="刷新当日推荐"
        >
          {loading ? '刷新中' : '刷新'}
        </button>
      </header>

      {dates.length === 0 ? (
        <p className="intel-sidebar-empty">尚无历史推荐快照</p>
      ) : (
        <ol className="intel-timeline-list recommendation-rail-list">
          {dates.map(date => {
            const active = date === selectedDate;
            const snap = (snapshots || []).find(s => s.date === date);
            const count = snap?.stats?.total
              ?? ((snap?.lanes?.public?.length || 0) + (snap?.lanes?.personal?.length || 0));
            return (
              <li key={date} className={`intel-timeline-node ${active ? 'active' : ''}`}>
                <button type="button" data-date={date} onClick={() => onSelectDate?.(date)}>
                  <span className="newspaper-timeline-diamond" aria-hidden="true">
                    <span className="newspaper-timeline-diamond-glow" />
                    <span className="newspaper-timeline-diamond-core" />
                  </span>
                  <span className="intel-timeline-label">
                    <strong>{formatDateLabel(date)}</strong>
                    <small>{weekdayLabel(date)}{count > 0 ? ` · ${count} 条` : ''}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <p className="recommendation-rail-hint">点击节点切换日期，回看该日推荐快照</p>
    </aside>
  );
}
