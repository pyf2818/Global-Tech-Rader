import { ICONS } from '../constants/index.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import NewsItem from './NewsItem.jsx';

export default function TrendingPage({
  viewMode,
  trendingLoading,
  trendingItems,
  isBookmarked,
  isInMaterials,
  toggleBookmark,
  toggleMaterial,
  setLightbox,
  translationOpen,
  setTranslationOpen,
  requestTranslation,
  translatingItems,
  getTranslation,
  trendingLoadingMore,
  trendingHasMore,
  loadTrending,
  trendingPlatform,
  trendingType,
}) {
  return (
    <>
      <div className="section-header">
        <h2 className="section-title">{ICONS.fire} 热门榜单</h2>
        <p className="section-desc">聚合 36氪、少数派、爱范儿、品玩、IT之家、Hacker News、TechCrunch、The Verge、Ars Technica、Wired 等 20+ 高质量平台热门内容</p>
      </div>

      {trendingLoading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} viewMode={viewMode} />)}</div>}
      {!trendingLoading && <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>{trendingItems.map((item, i) => <NewsItem key={item.id} item={item} index={i} viewMode={viewMode} isBookmarked={isBookmarked(item.id)} isInMaterials={isInMaterials(item.id)} onBookmark={() => toggleBookmark(item)} onAddMaterial={() => toggleMaterial(item)} isFollowed={false} onOpenLightbox={(src, title, images, index) => setLightbox({ open: true, src, title, images: images || [], index: index || 0 })} showTranslation={translationOpen[item.id]} onToggleTranslation={() => setTranslationOpen(p => ({ ...p, [item.id]: !p[item.id] }))} onRequestTranslation={() => requestTranslation(item)} isTranslating={translatingItems[item.id]} translation={getTranslation(item)} />)}</div>}

      {!trendingLoading && trendingItems.length > 0 && (
        <div className="load-more-area">
          {trendingLoadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
          {!trendingLoadingMore && trendingHasMore && (
            <button className="btn-load-more" onClick={() => loadTrending(true, trendingPlatform, trendingType)}>加载更多</button>
          )}
          {!trendingHasMore && <span className="load-more-done">已全部加载</span>}
        </div>
      )}
    </>
  );
}
