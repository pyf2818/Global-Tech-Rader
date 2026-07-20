import { useMemo, useState } from 'react';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function ScoreDetails({ item }) {
  const [open, setOpen] = useState(false);
  const groups = item.scoreParts || {};
  return (
    <div className="recommendation-score-details">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>{open ? '收起评分' : '查看评分'}</button>
      {open && (
        <div className="recommendation-score-grid">
          {Object.entries(groups).flatMap(([group, parts]) => Object.entries(parts || {}).map(([name, value]) => (
            <div key={`${group}-${name}`}><span>{group} · {name}</span><strong>{Number(value).toFixed(1)}</strong></div>
          )))}
        </div>
      )}
    </div>
  );
}

function TimelineLane({ label, items, onFeedback }) {
  return (
    <section className="recommendation-timeline-lane">
      <header><h2>{label}</h2><span>{items.length} 条</span></header>
      {items.map(item => (
        <article key={item.id}>
          <div className="recommendation-event-dot" />
          <div className="recommendation-event-content">
            <div className="recommendation-event-meta"><span>{item.source || '未知来源'}</span><strong>{Math.round(item.mustReadScore || 0)} 分</strong></div>
            <h3>{item.title}</h3>
            <div className="recommendation-reason-list">{(item.reasons || item.recommendationReasons || []).map(reason => <span key={reason}>{reason}</span>)}</div>
            <ScoreDetails item={item} />
            <div className="recommendation-feedback-actions">
              <button type="button" onClick={() => onFeedback(item, 'more-like-this')}>有用</button>
              <button type="button" onClick={() => onFeedback(item, 'hide')}>无关</button>
              <button type="button" onClick={() => onFeedback(item, 'mute-source')}>减少该来源</button>
              <button type="button" onClick={() => onFeedback(item, 'track')}>持续追踪</button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

export default function RecommendationTimeline({ snapshots, selectedDate, onSelectDate, onFeedback }) {
  const initial = new Date(`${selectedDate || dateKey(new Date())}T00:00:00`);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const snapshotDates = useMemo(() => new Set(snapshots.map(snapshot => snapshot.date)), [snapshots]);
  const selectedSnapshot = snapshots.find(snapshot => snapshot.date === selectedDate) || null;
  const days = useMemo(() => {
    const firstWeekday = month.getDay();
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: total }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)),
    ];
  }, [month]);
  const lanes = selectedSnapshot?.lanes || { public: [], personal: [] };

  return (
    <div className="recommendation-timeline-page">
      <header className="recommendation-page-header">
        <div><div className="workbench-kicker">Immutable Daily Memory</div><h1>精准推荐</h1><p>按生成时的画像和算法版本回看每日推荐，历史结果不会被今天的偏好重算。</p></div>
      </header>
      <div className="recommendation-layout">
        <aside className="recommendation-calendar">
          <header>
            <button type="button" title="上个月" aria-label="上个月" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>‹</button>
            <strong>{month.getFullYear()} 年 {month.getMonth() + 1} 月</strong>
            <button type="button" title="下个月" aria-label="下个月" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>›</button>
          </header>
          <div className="recommendation-weekdays">{['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day}>{day}</span>)}</div>
          <div className="recommendation-days">
            {days.map((day, index) => day ? (
              <button
                type="button"
                key={dateKey(day)}
                className={`${dateKey(day) === selectedDate ? 'active' : ''} ${snapshotDates.has(dateKey(day)) ? 'has-snapshot' : ''}`}
                onClick={() => onSelectDate(dateKey(day))}
              >{day.getDate()}</button>
            ) : <span key={`empty-${index}`} />)}
          </div>
          <div className="recommendation-calendar-legend"><i />有推荐快照</div>
        </aside>

        <main className="recommendation-day-timeline">
          {!selectedSnapshot ? (
            <div className="recommendation-empty"><h2>{selectedDate}</h2><p>该日期没有推荐快照，系统不会伪造历史结果。</p></div>
          ) : (
            <>
              <header className="recommendation-snapshot-header">
                <div><span>{selectedSnapshot.date}</span><h2>{selectedSnapshot.briefing?.oneLine || '每日推荐快照'}</h2></div>
                <div><span>画像 v{selectedSnapshot.profileVersion || 1}</span><span>算法 {selectedSnapshot.algorithmVersion || '1.0'}</span></div>
              </header>
              <div className="recommendation-origin-event"><i /><div><strong>基础快照生成</strong><span>{selectedSnapshot.createdAt ? new Date(selectedSnapshot.createdAt).toLocaleString('zh-CN') : '时间未知'}</span></div></div>
              <RecommendationTimelineLane label="公共热点" items={lanes.public || []} onFeedback={onFeedback} />
              <RecommendationTimelineLane label="个人必看" items={lanes.personal || []} onFeedback={onFeedback} />
              {(selectedSnapshot.updates || []).map((update, index) => <div key={update.id || index} className="recommendation-origin-event update"><i /><div><strong>重大更新</strong><span>{update.title || update.id}</span></div></div>)}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const RecommendationTimelineLane = TimelineLane;
