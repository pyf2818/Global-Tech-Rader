function SkeletonCard({ viewMode = 'standard' }) {
  const isCompact = viewMode === 'compact';
  return (
    <article className={`news-item skeleton view-${viewMode}`}>
      <div className="item-left">
        {!isCompact && <div className="skeleton-tags"><span className="skeleton-tag" /><span className="skeleton-tag" /></div>}
        <div className="skeleton-time" />
      </div>
      <div className="item-main">
        <div className="skeleton-title" />
        {!isCompact && <div className="skeleton-summary"><span /><span style={{ width: '70%' }} /></div>}
        {!isCompact && <div className="skeleton-meta"><span className="skeleton-source" /><span className="skeleton-link" /></div>}
      </div>
    </article>
  );
}

export default SkeletonCard;
