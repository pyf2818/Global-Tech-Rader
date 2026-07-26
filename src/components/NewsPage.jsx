import React from 'react';
import NewsItem from './NewsItem.jsx';
import SkeletonCard from './SkeletonCard.jsx';

const ICONS = {
  eventCard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="10" y1="3" x2="10" y2="9"/><line x1="14" y1="3" x2="14" y2="9"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

function NewsPage({
  eventClusters,
  category,
  mode,
  query,
  expandedEvents,
  setExpandedEvents,
  viewMode,
  focusedIndex,
  filtered,
  loading,
  error,
  allFeedItems,
  allActiveFilters,
  items,
  renderLimit,
  expandedSummary,
  summaryLoading,
  followKeywords,
  translationOpen,
  translatingItems,
  newsHasMore,
  loadingMore,
  getSummaryEntry,
  isBookmarked,
  isInMaterials,
  toggleBookmark,
  toggleMaterial,
  handleSummaryToggle,
  clearAllFilters,
  loadNews,
  recordReading,
  requestTranslation,
  getTranslation,
  setLightbox,
  setTranslationOpen,
}) {
  return (
    <>
      {/* Event Clusters */}
      {eventClusters.length > 0 && category === 'all' && mode === 'all' && !query && (
        <div className="event-clusters">
          {eventClusters.slice(0, 3).map(cluster => (
            <div key={cluster.id} className="event-cluster-card">
              <div className="cluster-header" onClick={() => setExpandedEvents(p => ({ ...p, [cluster.id]: !p[cluster.id] }))}>
                <span className="cluster-icon">{ICONS.eventCard}</span>
                <span className="cluster-keyword">{cluster.keyword}</span>
                <span className="cluster-count">{cluster.independentSourceCount} 个独立来源</span>
                <span className={`cluster-chevron ${expandedEvents[cluster.id] ? 'open' : ''}`}>{ICONS.chevronDown}</span>
              </div>
              {expandedEvents[cluster.id] && (
                <div className="cluster-items">
                  {cluster.items.map((item, ci) => {
                    const summaryEntry = getSummaryEntry(item);
                    return <NewsItem key={item.id} item={item} index={ci} viewMode={viewMode} isFocused={focusedIndex === filtered.indexOf(item)} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => handleSummaryToggle(item)} isSummaryOpen={expandedSummary[item.id]} summaryText={summaryEntry?.text || ''} summaryMode={summaryEntry?.mode || ''} summaryLoading={Boolean(summaryLoading[item.id])} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} />;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}</div>}
      {error && <div className="error-state"><p>加载失败: {error}</p><button onClick={() => loadNews()}>重试</button></div>}
      {!loading && !error && allFeedItems.length === 0 && <div className="empty-state"><p>{allActiveFilters.length > 0 ? `共 ${items.length} 条资讯，当前 ${allActiveFilters.length} 个筛选条件均不匹配` : '没有匹配的资讯'}</p><button onClick={clearAllFilters}>清空全部筛选</button></div>}
      <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
        {allFeedItems.slice(0, renderLimit).map((item, i) => {
          const summaryEntry = getSummaryEntry(item);
          return <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isFocused={focusedIndex === i} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} onSummary={() => handleSummaryToggle(item)} isSummaryOpen={expandedSummary[item.id]} summaryText={summaryEntry?.text || ''} summaryMode={summaryEntry?.mode || ''} summaryLoading={Boolean(summaryLoading[item.id])} isFollowed={followKeywords.some(kw => `${item.title} ${item.summary}`.toLowerCase().includes(kw.toLowerCase()))} onRead={() => recordReading(item)} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} />;
        })}
      </div>
      {loadingMore && (
        <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`more-${i}`} viewMode={viewMode} />)}
        </div>
      )}
      {(newsHasMore || filtered.length > renderLimit) && (
        <div id="load-more-sentinel" className="load-more-area">
          {loadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
          {!loadingMore && <span className="load-more-hint">滚动加载更多</span>}
        </div>
      )}
      {!newsHasMore && filtered.length <= renderLimit && items.length > 0 && (
        <div className="load-more-area load-more-done">已全部加载</div>
      )}
    </>
  );
}

export default NewsPage;
