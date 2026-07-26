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
