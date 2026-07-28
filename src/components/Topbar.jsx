import LanguageSwitcher from './LanguageSwitcher.jsx';
import {
  PRODUCT_NAME,
  CATEGORY_GROUPS, GITHUB_LANGS, GITHUB_PERIODS,
  MODES, VIEW_MODES, TRENDING_TYPES,
  ICONS,
} from '../constants/appConstants.jsx';

/**
 * 顶部栏：滚动资讯 / 品牌 / 搜索 / 分类筛选 / GitHub 过滤 / 模式 / 平台 / 语言切换
 * 由 App.jsx 抽离，仅在 nav 等内部状态变化时重渲染。
 */
export default function Topbar({
  // 当前导航
  nav,
  // 滚动资讯
  scrollingNews,
  scrollingNewsRef,
  setScrollingNewsPaused,
  handleScrollingNewsMouseDown,
  // 主题
  themeMode,
  // 移动端菜单
  setMobileMenuOpen,
  // 搜索
  searchInputRef,
  query,
  setQuery,
  searchOpen,
  setSearchOpen,
  searchSuggestions,
  executeSearch,
  searchHistory,
  searchSort,
  setSearchSort,
  // 分类
  category,
  setCategory,
  categoryOpen,
  setCategoryOpen,
  categories,
  // GitHub
  githubLang,
  setGithubLang,
  githubSince,
  setGithubSince,
  loadGithub,
  // 模式 / 区域
  mode,
  setMode,
  regionFilter,
  setRegionFilter,
  // 来源过滤
  sourceFilter,
  setSourceFilter,
  sourceOptions,
  // 视图模式
  viewMode,
  setViewMode,
  // 大屏
  setGlobeFullscreenOpen,
  // 刷新
  loadNews,
  blocked,
  debouncedQuery,
  // 热门榜单
  trendingType,
  setTrendingType,
  trendingPlatform,
  setTrendingPlatform,
  loadTrending,
}) {
  return (
    <header className={`topbar ${nav === 'all' ? 'topbar-all' : ''} ${nav === 'stock' ? 'topbar-stock' : ''} ${(nav === 'trending' || nav === 'recommendations') ? 'topbar-trending' : ''}`}>
      {/* 滚动资讯热点区域 - 置于最顶部，连续滚动 + 可手动拖动 */}
      {nav === 'all' && scrollingNews.length > 0 && (
        <div className="scrolling-news-container">
          <div className="scrolling-news-header">
            <span className="scrolling-news-label">热门资讯</span>
            <span className="scrolling-news-icon">{ICONS.fire}</span>
          </div>
          <div
            ref={scrollingNewsRef}
            className="scrolling-news-content"
            onMouseEnter={() => setScrollingNewsPaused(true)}
            onMouseLeave={() => setScrollingNewsPaused(false)}
            onMouseDown={handleScrollingNewsMouseDown}
          >
            <div className="scrolling-news-track">
              {[...scrollingNews, ...scrollingNews].map((item, index) => (
                <div key={`${item.id}-${index}`} className="scrolling-news-item">
                  {item.hot && <span className="scrolling-news-hot">HOT</span>}
                  <span className="scrolling-news-title">{item.title}</span>
                  <span className="scrolling-news-meta">
                    <span className="scrolling-news-source">{item.source}</span>
                    <span className="scrolling-news-time">{item.time}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
        {ICONS.menu}
      </button>
      <div className={`topbar-main ${nav === 'all' ? 'topbar-main-all' : ''}`}>
        <div className={`topbar-main-row ${nav === 'all' ? 'topbar-main-row-all' : ''}`}>
          {nav === 'all' && (
            <div className="topbar-brand">
              <span className="brand-title">{PRODUCT_NAME}</span>
              <span className="brand-theme-icon" aria-hidden="true" title={themeMode === 'dark' ? '深色模式' : '浅色模式'}>{themeMode === 'dark' ? ICONS.moon : ICONS.sun}</span>
            </div>
          )}
          {nav === 'all' && (
            <div className="search-wrap">
              {ICONS.search}
              <input ref={searchInputRef} value={query} onChange={e => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} placeholder="搜索技术、公司、项目..." />
              {searchOpen && (query.trim() || searchHistory.length > 0) && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setSearchOpen(false)} />
                  <div className="search-dropdown">
                    {searchSuggestions.map((s, i) => (
                      <button key={i} className="search-suggestion" onClick={() => executeSearch(s)}>{s}</button>
                    ))}
                    {searchSuggestions.length === 0 && searchHistory.slice(0, 5).map((h, i) => (
                      <button key={i} className="search-history-item" onClick={() => executeSearch(h.query)}>
                        {ICONS.clock}<span>{h.query}</span>
                      </button>
                    ))}
                    {query.trim() && (
                      <div className="search-sort-row">
                        <button className={`search-sort-btn ${searchSort === 'time' ? 'active' : ''}`} onClick={() => setSearchSort('time')}>按时间</button>
                        <button className={`search-sort-btn ${searchSort === 'relevance' ? 'active' : ''}`} onClick={() => setSearchSort('relevance')}>按相关度</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className={`topbar-actions ${(nav === 'trending' || nav === 'recommendations') ? 'singleline' : ''} ${nav === 'all' ? 'topbar-actions-all' : ''}`}>
          {nav === 'all' && (
            <div className="category-dropdown-wrap">
              <button className="category-dropdown-btn" onClick={() => setCategoryOpen(o => !o)}>
                <span>{category === 'all' ? '全部赛道' : categories.find(c => c.id === category)?.label || '全部赛道'}</span>
                <span className={`chevron ${categoryOpen ? 'open' : ''}`}>{ICONS.chevronDown}</span>
              </button>
              {categoryOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setCategoryOpen(false)} />
                  <div className="category-dropdown category-dropdown-grouped">
                    <button className={`category-option ${category === 'all' ? 'active' : ''}`} onClick={() => { setCategory('all'); setCategoryOpen(false); }}>全部赛道</button>
                    {CATEGORY_GROUPS.map(group => (
                      <div key={group.id} className="category-group">
                        <div className="category-group-header">
                          <span className="cat-group-icon">{ICONS[group.icon]}</span>
                          <span className="cat-group-label">{group.label}</span>
                        </div>
                        <div className="category-group-items">
                          {group.categories.map(catId => {
                            const cat = categories.find(c => c.id === catId);
                            if (!cat) return null;
                            return (
                              <button key={cat.id} className={`category-option ${category === cat.id ? 'active' : ''}`} onClick={() => { setCategory(cat.id); setCategoryOpen(false); }}>
                                <span className="cat-icon">{ICONS[cat.icon]}</span><span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {nav === 'github' && (
            <div className="github-filter-bar">
              <div className="lang-tabs">
                {GITHUB_PERIODS.map(p => (
                  <button key={p.id} className={`lang-tab ${githubSince === p.id ? 'active' : ''}`} onClick={() => { setGithubSince(p.id); loadGithub(githubLang, p.id); }}>{p.label}</button>
                ))}
              </div>
              <div className="lang-tabs">
                {GITHUB_LANGS.slice(0, 6).map(l => (
                  <button key={l.id} className={`lang-tab ${githubLang === l.id ? 'active' : ''}`} onClick={() => { setGithubLang(l.id); loadGithub(l.id, githubSince); }}>{l.label}</button>
                ))}
              </div>
            </div>
          )}
          {(nav === 'all' || nav === 'trending' || nav === 'reading-list' || nav === 'recommendations' || nav === 'materials' || nav === 'editor') && (
            <>
              <div className="mode-tabs">
                {MODES.map(m => <button key={m.id} className={`mode-tab ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>{m.label}</button>)}
              </div>
              <div className="region-filter-wrap">
                <button className={`region-filter-btn ${regionFilter === 'all' ? 'active' : ''}`} onClick={() => setRegionFilter('all')}>全部</button>
                <button className={`region-filter-btn ${regionFilter === 'domestic' ? 'active' : ''}`} onClick={() => setRegionFilter('domestic')}>国内</button>
                <button className={`region-filter-btn ${regionFilter === 'overseas' ? 'active' : ''}`} onClick={() => setRegionFilter('overseas')}>国外</button>
              </div>
              {nav === 'all' && (
                <div className="source-filter-wrap">
                  <select id="source-filter" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="source-filter-select">
                    <option value="all">全部来源</option>
                    {sourceOptions.slice(0, 20).map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                  </select>
                </div>
              )}
              <div className="view-toggle">
                {VIEW_MODES.map(v => <button key={v.id} className={`view-btn ${viewMode === v.id ? 'active' : ''}`} onClick={() => setViewMode(v.id)} title={v.label}>{v.id === 'compact' ? ICONS.list : v.id === 'standard' ? ICONS.rows : ICONS.grid3}</button>)}
              </div>
            </>
          )}
          {(nav === 'all' || nav === 'trending' || nav === 'github') && (
            <>
              {nav === 'all' && (
                <button className="globe-entry-btn" onClick={() => setGlobeFullscreenOpen(true)} title="全球科技大屏">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  全球大屏
                </button>
              )}
              <button className={`btn-refresh ${nav === 'all' ? 'btn-refresh-all' : ''}`} onClick={() => { if (nav === 'all') loadNews(blocked, false, debouncedQuery, { forceRefresh: true }); else if (nav === 'trending') loadTrending(false, trendingPlatform, trendingType); else if (nav === 'github') loadGithub(); }}>
                {ICONS.refresh}
              </button>
              {nav === 'trending' && (
                <>
                  <div className="trending-type-tabs">
                    {TRENDING_TYPES.map(t => (
                      <button key={t.id} className={`trending-type-tab ${trendingType === t.id ? 'active' : ''}`} onClick={() => { setTrendingType(t.id); loadTrending(false, trendingPlatform, t.id); }}>
                        <span className="trending-type-icon">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="trending-platform-topbar">
                    <select
                      className="platform-dropdown-topbar"
                      value={trendingPlatform}
                      onChange={(e) => { setTrendingPlatform(e.target.value); loadTrending(false, e.target.value, trendingType); }}
                    >
                    <option value="all">全部平台</option>
                    <optgroup label="国内平台">
                      <option value="36氪">36氪</option>
                      <option value="少数派">少数派</option>
                      <option value="爱范儿">爱范儿</option>
                      <option value="品玩">品玩</option>
                      <option value="虎扑">虎扑</option>
                      <option value="IT之家">IT之家</option>
                    </optgroup>
                    <optgroup label="国际平台">
                      <option value="Hacker News">Hacker News</option>
                      <option value="Product Hunt">Product Hunt</option>
                      <option value="Dev.to">Dev.to</option>
                      <option value="GitHub">GitHub</option>
                      <option value="TechCrunch">TechCrunch</option>
                      <option value="The Verge">The Verge</option>
                      <option value="Ars Technica">Ars Technica</option>
                      <option value="Wired">Wired</option>
                      <option value="MIT Review">MIT Review</option>
                      <option value="Engadget">Engadget</option>
                      <option value="Slashdot">Slashdot</option>
                      <option value="Smashing Mag">Smashing Mag</option>
                      <option value="Lobsters">Lobsters</option>
                    </optgroup>
                  </select>
                </div>
                </>
              )}
            </>
          )}
          {/* 语言切换器：所有页面顶部右侧均可见，点击切换中英文 */}
          <LanguageSwitcher variant="compact" />
        </div>
      </div>
    </header>
  );
}
