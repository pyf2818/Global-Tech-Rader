import { useMemo } from 'react';

function formatScore(value) {
  const score = Number(value || 0);
  return Number.isFinite(score) ? Math.round(score) : 0;
}

function formatRelativeTime(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '时间未知';
  const diffMs = Date.now() - time;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes || 1} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(time));
}

export default function IntelligenceFeedPanel({
  items = [],
  opportunities = [],
  weeklySectors = null,
  loading = false,
  error = '',
  updatedAt = '',
  onRefresh,
}) {
  const topEntities = useMemo(() => {
    const counts = new Map();
    items.forEach(item => {
      (item.entities || []).forEach(entity => counts.set(entity, (counts.get(entity) || 0) + 1));
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [items]);

  const lead = items[0];
  const topSectors = Array.isArray(weeklySectors?.sectors) ? weeklySectors.sectors.slice(0, 3) : [];
  const leadSector = weeklySectors?.leadSector || topSectors[0];

  return (
    <section className="intelligence-feed-panel" aria-label="AI 行业情报">
      <header className="intelligence-feed-head">
        <div>
          <span className="intelligence-feed-kicker">AI Intelligence</span>
          <h2>行业情报雷达</h2>
        </div>
        <div className="intelligence-feed-actions">
          {updatedAt && <span>{formatRelativeTime(updatedAt)}更新</span>}
          <button type="button" onClick={onRefresh} disabled={loading} aria-label="刷新行业情报">
            {loading ? '刷新中' : '刷新'}
          </button>
        </div>
      </header>

      {error && (
        <div className="intelligence-feed-error">
          <strong>情报源暂不可用</strong>
          <span>{error}</span>
        </div>
      )}

      {!error && loading && items.length === 0 && (
        <div className="intelligence-feed-skeleton">
          {Array.from({ length: 3 }).map((_, index) => <span key={index} />)}
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="intelligence-feed-empty">暂无可展示的行业情报</div>
      )}

      {lead && (
        <div className="intelligence-feed-layout">
          <article className="intelligence-lead-card">
            <div className="intelligence-lead-meta">
              <span>{lead.categoryLabel || lead.category || 'Industry'}</span>
              <strong>{formatScore(lead.intelligenceScore)}</strong>
            </div>
            <h3>{lead.title}</h3>
            <p>{lead.summary || '暂无摘要'}</p>
            <footer>
              <span>{lead.source || '未知来源'} · {formatRelativeTime(lead.publishedAt)}</span>
              {lead.url && <a href={lead.url} target="_blank" rel="noreferrer">查看原文</a>}
            </footer>
          </article>

          <div className="intelligence-side-stack">
            <div className="intelligence-score-grid">
              <div><span>影响</span><strong>{formatScore(lead.impactScore)}</strong></div>
              <div><span>热度</span><strong>{formatScore(lead.heatScore)}</strong></div>
              <div><span>综合</span><strong>{formatScore(lead.intelligenceScore)}</strong></div>
            </div>

            <div className="intelligence-entity-strip">
              {topEntities.length > 0 ? topEntities.map(entity => (
                <span key={entity.name}>{entity.name}<b>{entity.count}</b></span>
              )) : <span>等待实体信号</span>}
            </div>
            {opportunities.length > 0 && (
              <div className="intelligence-opportunity-list">
                {opportunities.slice(0, 3).map(signal => (
                  <div key={signal.id} className={`intelligence-opportunity ${signal.type || 'watch'}`}>
                    <span>{signal.label || 'Opportunity'}</span>
                    <strong>{signal.title}</strong>
                    <em>{formatScore(signal.score)}</em>
                  </div>
                ))}
              </div>
            )}
            {leadSector && (
              <div className="intelligence-weekly-sector">
                <div className="intelligence-weekly-sector-head">
                  <span>周度赛道</span>
                  <strong>{leadSector.label}</strong>
                  <em>{formatScore(leadSector.score)}</em>
                </div>
                <div className="intelligence-weekly-sector-meta">
                  <span>{leadSector.eventCount || 0} 事件</span>
                  <span>{leadSector.sourceCount || 0} 来源</span>
                  <span>{leadSector.trend === 'surging' ? '升温' : leadSector.trend === 'active' ? '活跃' : '观察'}</span>
                </div>
                {topSectors.length > 1 && (
                  <div className="intelligence-weekly-sector-list">
                    {topSectors.slice(1).map(sector => (
                      <span key={sector.id}>
                        <b>{sector.label}</b>
                        <em>{formatScore(sector.score)}</em>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {items.length > 1 && (
        <div className="intelligence-mini-list">
          {items.slice(1, 6).map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="intelligence-mini-item">
              <span>{formatScore(item.intelligenceScore)}</span>
              <strong>{item.title}</strong>
              <em>{item.source || '未知来源'}</em>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
