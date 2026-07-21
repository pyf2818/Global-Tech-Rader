/**
 * RecommendationFeed - 精准推荐页中间资讯卡片流
 *
 * 展示当日满足用户关注领域 / 用户画像的资讯卡片，支持滚动按需加载。
 * 卡片复用 App.jsx 的 NewsItem（通过 render-prop 传入），以保持与全局一致的交互。
 */
import { useMemo } from 'react';

export default function RecommendationFeed({
  lanes,
  loading,
  error,
  isLoggedIn,
  selectedInterests,
  categories,
  renderLimit,
  viewMode,
  renderCard, // (item, index) => ReactNode  由 App.jsx 提供，复用 NewsItem + 全部 handler
  onLoadMore,
  loadingMore,
  hasMore,
  onRefresh,
  onPickInterests,
  onLogin,
}) {
  // 扁平化当日推荐 lanes：个人必看优先，再公共热点，去重
  const feedItems = useMemo(() => {
    const seen = new Set();
    const merged = [...(lanes?.personal || []), ...(lanes?.public || [])];
    const result = [];
    for (const item of merged) {
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
    return result;
  }, [lanes]);

  const total = feedItems.length;
  const visible = feedItems.slice(0, renderLimit);
  const canLoadMore = hasMore || total > renderLimit;

  // 未登录
  if (!isLoggedIn) {
    return (
      <div className="empty-state">
        <p>请先登录并选择感兴趣的领域，以获得个性化推荐</p>
        <button type="button" onClick={onLogin}>去登录</button>
      </div>
    );
  }

  // 未选兴趣领域
  if (selectedInterests.length === 0) {
    return (
      <div className="empty-state">
        <p>你还没有选择感兴趣的领域</p>
        <button type="button" onClick={onPickInterests}>选择兴趣领域</button>
      </div>
    );
  }

  // 已选领域标签条
  const interestBar = (
    <div className="interest-tags-bar">
      <span className="interest-tags-label">已选领域：</span>
      {selectedInterests.map(id => {
        const cat = categories?.find(c => c.id === id);
        return cat ? <span key={id} className="interest-tag-badge">{cat.label}</span> : null;
      })}
      <button type="button" className="interest-edit-btn" onClick={onPickInterests}>编辑</button>
    </div>
  );

  if (loading) {
    return (
      <>
        {interestBar}
        <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <article key={i} className="news-item skeleton view-standard">
              <div className="skeleton-line w-80" />
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-40" />
            </article>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {interestBar}
        <div className="error-state">
          <p>加载失败: {error}</p>
          <button type="button" onClick={onRefresh}>重试</button>
        </div>
      </>
    );
  }

  if (total === 0) {
    return (
      <>
        {interestBar}
        <div className="empty-state">
          <p>当日暂无满足你关注领域的推荐资讯</p>
          <button type="button" onClick={onRefresh}>刷新重试</button>
        </div>
      </>
    );
  }

  return (
    <>
      {interestBar}
      <div className={`feed-list view-${viewMode} ${viewMode === 'card' ? 'card-grid' : ''}`}>
        {visible.map((item, i) => renderCard(item, i))}
      </div>
      {canLoadMore ? (
        <div id="load-more-sentinel" className="load-more-area">
          {loadingMore && <div className="load-more-spinner"><div className="spinner" /><span>加载中...</span></div>}
          {!loadingMore && <span className="load-more-hint">滚动加载更多（已显示 {visible.length} / {total}）</span>}
        </div>
      ) : (
        <div className="load-more-area load-more-done">已全部加载（共 {total} 条）</div>
      )}
    </>
  );
}
