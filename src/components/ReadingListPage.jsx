import { ICONS } from '../constants/index.jsx';

export default function ReadingListPage({
  bookmarks,
  setBookmarks,
  categories,
  toggleRead,
}) {
  return (
    <div className="trends-dashboard">
      <div className="trends-header">
        <h2>{ICONS.bookmark}<span>阅读列表</span></h2>
        <p className="trends-desc">共 {bookmarks.length} 条收藏，{bookmarks.filter(b => !b.isRead).length} 条未读</p>
      </div>
      {bookmarks.length === 0 ? (
        <section className="trends-section">
          <div className="empty-state">
            <p>暂无收藏内容</p>
            <p className="hint">浏览资讯时点击收藏按钮，将感兴趣的内容添加到阅读列表</p>
          </div>
        </section>
      ) : (
        <section className="trends-section">
          <div className="bookmarks-list">
            {bookmarks.map(b => (
              <div key={b.id} className={`bookmark-item ${b.isRead ? 'read' : ''}`}>
                <div className="bookmark-main">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="bookmark-title">{b.title}</a>
                  <div className="bookmark-meta">
                    <span className="bookmark-source">{b.source}</span>
                    <span className="bookmark-date">{new Date(b.savedAt).toLocaleDateString('zh-CN')}</span>
                    {b.category && <span className="bookmark-category">{categories.find(c => c.id === b.category)?.label || b.category}</span>}
                  </div>
                  {b.summary && <p className="bookmark-summary">{b.summary}</p>}
                </div>
                <div className="bookmark-actions">
                  <button
                    className={`bookmark-read-btn ${b.isRead ? 'read' : ''}`}
                    onClick={() => toggleRead(b.id)}
                    title={b.isRead ? '标记为未读' : '标记为已读'}
                  >
                    {b.isRead ? '已读' : '未读'}
                  </button>
                  <button className="bookmark-remove" onClick={() => setBookmarks(prev => prev.filter(x => x.id !== b.id))} title="移除">{ICONS.x}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
