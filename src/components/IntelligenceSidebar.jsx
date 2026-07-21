/**
 * IntelligenceSidebar - AI 情报首页右侧边栏
 *
 * Codex 桌面端式右栏：上方时间线（可点击切换历史日期情报），
 * 下方展示当日 AI 情报详情（公共热点 / 个人必看 / 机会 / 风险）。
 * 每条情报带「剖析」按钮，点击后通过 onDissect 把条目注入中间对话区做深度分析。
 */
import { useMemo } from 'react';

const LANE_META = {
  public: { label: '公共热点', hint: '新鲜度 · 交叉印证 · 信源质量' },
  personal: { label: '个人必看', hint: '画像等级 · 特别关注 · 行为校准' },
};

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function BriefingItem({ item, laneType, onDissect, onOpenItem }) {
  const score = Math.round(laneType === 'public' ? item.publicScore : item.personalScore);
  const reasons = item.reasons || item.recommendationReasons || [];
  return (
    <li className="intel-sidebar-item">
      <button type="button" className="intel-sidebar-item-main" onClick={() => onOpenItem?.(item)}>
        <span className="intel-sidebar-item-title">{item.title}</span>
        <span className="intel-sidebar-item-meta">
          <em className="intel-sidebar-source">{item.source || '未知来源'}</em>
          {score > 0 && <small className="intel-sidebar-score">{score} 分</small>}
        </span>
        {reasons.length > 0 && (
          <span className="intel-sidebar-reasons">
            {reasons.slice(0, 2).map(reason => <i key={reason}>{reason}</i>)}
          </span>
        )}
      </button>
      <button
        type="button"
        className="intel-sidebar-dissect"
        onClick={() => onDissect?.(item)}
        title="在对话中深度剖析这条情报"
      >
        剖析
      </button>
    </li>
  );
}

function Lane({ type, items, onDissect, onOpenItem }) {
  const meta = LANE_META[type];
  return (
    <section className={`intel-sidebar-lane intel-sidebar-lane-${type}`}>
      <header>
        <span className="intel-sidebar-lane-label">{meta.label}</span>
        <strong>{items.length}</strong>
      </header>
      <p className="intel-sidebar-lane-hint">{meta.hint}</p>
      {items.length === 0 ? (
        <div className="intel-sidebar-empty">当前没有满足质量约束的情报</div>
      ) : (
        <ol>
          {items.map(item => (
            <BriefingItem
              key={item.id}
              item={item}
              laneType={type}
              onDissect={onDissect}
              onOpenItem={onOpenItem}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

export default function IntelligenceSidebar({
  briefing,
  lanes,
  snapshots,
  selectedDate,
  onSelectDate,
  onDissect,
  onOpenItem,
  onRefresh,
  loading,
}) {
  // 优先用实时 lanes/briefing；历史日期无实时资讯时降级到当日快照
  const activeSnapshot = useMemo(
    () => (snapshots || []).find(s => s.date === selectedDate) || null,
    [snapshots, selectedDate]
  );
  const publicItems = (lanes?.public?.length ? lanes.public : (activeSnapshot?.lanes?.public || []));
  const personalItems = (lanes?.personal?.length ? lanes.personal : (activeSnapshot?.lanes?.personal || []));
  const effectiveBriefing = (briefing && (briefing.oneLine || briefing.opportunities?.length || briefing.risks?.length))
    ? briefing
    : (activeSnapshot?.briefing || briefing || {});
  const opportunities = effectiveBriefing.opportunities || [];
  const risks = effectiveBriefing.risks || [];

  const timeline = useMemo(() => {
    const dates = new Set();
    (snapshots || []).forEach(s => s.date && dates.add(s.date));
    if (selectedDate) dates.add(selectedDate);
    return [...dates].sort((a, b) => String(b).localeCompare(String(a)));
  }, [snapshots, selectedDate]);

  return (
    <aside className="intelligence-sidebar custom-scrollbar">
      {/* 时间线 */}
      <section className="intel-sidebar-timeline">
        <header className="intel-sidebar-section-head">
          <h3>情报时间线</h3>
          <button
            type="button"
            className="intel-sidebar-refresh"
            onClick={onRefresh}
            disabled={loading}
            title="刷新今日情报"
          >
            {loading ? '刷新中' : '刷新'}
          </button>
        </header>
        {timeline.length === 0 ? (
          <p className="intel-sidebar-empty">尚无历史情报快照</p>
        ) : (
          <ol className="intel-timeline-list">
            {timeline.map(date => {
              const active = date === selectedDate;
              const snap = (snapshots || []).find(s => s.date === date);
              const count = snap?.stats?.total
                ?? ((snap?.lanes?.public?.length || 0) + (snap?.lanes?.personal?.length || 0))
                ?? (active ? publicItems.length + personalItems.length : 0);
              return (
                <li key={date} className={`intel-timeline-node ${active ? 'active' : ''}`}>
                  <button type="button" onClick={() => onSelectDate?.(date)}>
                    <span className="intel-timeline-dot" aria-hidden="true" />
                    <span className="intel-timeline-label">{formatDateLabel(date)}</span>
                    {count > 0 && <small className="intel-timeline-count">{count}</small>}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 当日情报详情 */}
      <div className="intel-sidebar-detail">
        <header className="intel-sidebar-detail-head">
          <div>
            <span className="intel-sidebar-kicker">Daily Intelligence</span>
            <h3>{formatDateLabel(selectedDate) || '今日'} AI 情报</h3>
          </div>
          <span className="intel-sidebar-mode">{effectiveBriefing?.mode === 'ai' ? 'AI 增强' : '算法简报'}</span>
        </header>

        {effectiveBriefing?.oneLine && <p className="intel-sidebar-oneline">{effectiveBriefing.oneLine}</p>}

        <Lane type="public" items={publicItems} onDissect={onDissect} onOpenItem={onOpenItem} />
        <Lane type="personal" items={personalItems} onDissect={onDissect} onOpenItem={onOpenItem} />

        <section className="intel-sidebar-signals">
          <div>
            <h4>机会</h4>
            {opportunities.length
              ? opportunities.map((entry, i) => <p key={entry.itemId || i}>{typeof entry === 'string' ? entry : entry.text}</p>)
              : <p className="intel-sidebar-empty">暂未识别出高置信机会</p>}
          </div>
          <div>
            <h4>风险与待核实</h4>
            {risks.length
              ? risks.map((entry, i) => <p key={entry.itemId || i}>{typeof entry === 'string' ? entry : entry.text}</p>)
              : <p className="intel-sidebar-empty">未触发显著质量风险</p>}
          </div>
        </section>
      </div>
    </aside>
  );
}
