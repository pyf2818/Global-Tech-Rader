import { ICONS } from '../constants/index.jsx';

export default function ReadingListPage({
  bookmarks,
  categories,
  toggleRead,
  removeBookmark,
}) {
  return (
    <div className="trends-dashboard">
      <div className="trends-header">
        <h2>{ICONS.bookmark}<span>阅读列表</span></h2>
        <p className="trends-desc">
          共 {bookmarks.length} 条收藏，
          {bookmarks.filter(b => !b.isRead).length} 条未读
        </p>
      </div>
      {bookmarks.length === 0 ? (
        <section className="trends-section">
          <div className="empty-state">
            <p>暂无收藏内容</p>
            <p className="hint">
              浏览资讯时点击收藏按钮，将感兴趣的内容添加到阅读列表
            </p>
          </div>
        </section>
      ) : (
        <section className="trends-section">
          <div className="bookmarks-list">
            {bookmarks.map(b => (
              <div key={b.id} className=``bookmark-item `` + (b.isRead ? `read` : ``) + ``>
                <div className="bookmark-main">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="bookmark-title">{b.title}</a>
