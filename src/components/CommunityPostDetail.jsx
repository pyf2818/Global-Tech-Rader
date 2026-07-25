import { useState } from 'react';

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function CommunityPostDetail({ post, comments, loading, user, onClose, onComment, onLike, onBookmark, onFollow, onRequireAuth }) {
  const [draft, setDraft] = useState('');
  if (loading) return <aside className="community-detail"><div className="community-state">正在读取完整内容...</div></aside>;
  if (!post) return null;

  const runProtected = action => {
    if (!user) { onRequireAuth(); return; }
    Promise.resolve(action()).catch(() => {});
  };
  const submitComment = async () => {
    const value = draft.trim();
    if (!value) return;
    if (!user) { onRequireAuth(); return; }
    await onComment(value); setDraft('');
  };

  return (
    <aside className="community-detail" data-testid="community-detail" aria-label="社区内容详情">
      <div className="community-detail-toolbar">
        <span>{post.type}</span>
        <button type="button" onClick={onClose} aria-label="关闭详情">×</button>
      </div>
      <div className="community-author-row">
        <div className="community-avatar">{(post.displayName || post.username || '用').slice(0, 1)}</div>
        <div><strong>{post.displayName || post.username}</strong><span>{formatDate(post.createdAt)}</span></div>
        {user?.id !== post.authorId && <button type="button" data-testid="community-detail-follow" className={post.following ? 'active' : ''} onClick={() => runProtected(() => onFollow(!post.following))}>{post.following ? '已关注' : '关注'}</button>}
      </div>
      <h2>{post.title}</h2>
      <div className="community-post-body">{post.body}</div>
      {Array.isArray(post.sourceRefs) && post.sourceRefs.length > 0 && (
        <div className="community-sources"><strong>引用来源</strong>{post.sourceRefs.map((source, index) => <a key={`${source.url || source.title}-${index}`} href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a>)}</div>
      )}
      <div className="community-detail-actions">
        <button data-testid="community-detail-like" className={post.liked ? 'active liked' : ''} onClick={() => runProtected(() => onLike(!post.liked))}>赞同 {post.likeCount || 0}</button>
        <button data-testid="community-detail-bookmark" className={post.bookmarked ? 'active' : ''} onClick={() => runProtected(() => onBookmark(!post.bookmarked))}>收藏 {post.bookmarkCount || 0}</button>
        <span>评论 {post.commentCount || 0}</span>
      </div>
      <section className="community-comments">
        <h3>讨论</h3>
        {comments.length === 0 && <p className="community-empty-copy">尚无评论。</p>}
        {comments.map(comment => (
          <article key={comment.id} className="community-comment">
            <div><strong>{comment.displayName || comment.username || '用户'}</strong><span>{formatDate(comment.createdAt)}</span></div>
            <p>{comment.body}</p>
          </article>
        ))}
        <div className="community-comment-compose">
          <textarea data-testid="community-comment-input" value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} placeholder={user ? '写下经过思考的观点' : '登录后参与讨论'} />
          <button type="button" data-testid="community-submit-comment" onClick={() => submitComment().catch(() => {})}>发送</button>
        </div>
      </section>
    </aside>
  );
}
