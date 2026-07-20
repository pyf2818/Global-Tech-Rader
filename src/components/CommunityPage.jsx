import { useEffect, useState } from 'react';
import { useCommunity } from '../hooks/useCommunity.js';
import CommunityPostDetail from './CommunityPostDetail.jsx';

const TYPE_LABELS = { article: '文章', briefing: '每日速报', work: '创作作品', workflow: '智能体工作流' };

function relativeDate(value) {
  const delta = Math.max(0, Date.now() - new Date(value).getTime());
  if (delta < 60000) return '刚刚';
  if (delta < 3600000) return `${Math.floor(delta / 60000)} 分钟前`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)} 小时前`;
  return `${Math.floor(delta / 86400000)} 天前`;
}

export default function CommunityPage({ user, onRequireAuth }) {
  const community = useCommunity();
  const [composerOpen, setComposerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({ type: 'article', title: '', body: '', visibility: 'public' });

  useEffect(() => { community.loadPosts(); }, [community.loadPosts]);

  const openComposer = () => {
    if (!user) { onRequireAuth(); return; }
    setComposerOpen(true);
  };
  const publish = async () => {
    setPublishing(true); community.setError('');
    try {
      await community.createPost(form);
      setForm({ type: 'article', title: '', body: '', visibility: 'public' }); setComposerOpen(false);
    } catch (error) { community.setError(error.message); } finally { setPublishing(false); }
  };
  const protectedAction = async action => {
    if (!user) { onRequireAuth(); return; }
    try { await action(); } catch (error) { community.setError(error.message); }
  };

  return (
    <div className="product-page community-page">
      <section className="community-header">
        <div><span className="workbench-kicker">Community Intelligence</span><h1>用户广场</h1><p>分享可验证的资讯判断、创作作品和工作流。互动数据由账户和数据库持久化。</p></div>
        <button className="ai-primary-action" type="button" onClick={openComposer}>发布内容</button>
      </section>

      {composerOpen && (
        <section className="community-composer">
          <div className="community-composer-head"><h2>发布到广场</h2><button type="button" onClick={() => setComposerOpen(false)} aria-label="关闭发布器">×</button></div>
          <div className="community-compose-options">
            <select value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value }))}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <select value={form.visibility} onChange={event => setForm(previous => ({ ...previous, visibility: event.target.value }))}><option value="public">公开</option><option value="followers">仅关注者</option><option value="private">仅自己</option></select>
          </div>
          <input value={form.title} maxLength={180} onChange={event => setForm(previous => ({ ...previous, title: event.target.value }))} placeholder="标题" />
          <textarea value={form.body} maxLength={100000} onChange={event => setForm(previous => ({ ...previous, body: event.target.value }))} placeholder="正文。清楚说明事实、判断依据和结论。" />
          <div className="community-compose-footer"><span>{form.body.length} / 100000</span><button type="button" disabled={publishing || !form.title.trim() || !form.body.trim()} onClick={() => publish().catch(() => {})}>{publishing ? '发布中...' : '确认发布'}</button></div>
        </section>
      )}

      {community.error && <div className="community-error"><strong>社区服务不可用</strong><span>{community.error}</span><button type="button" onClick={community.loadPosts}>重试</button></div>}

      <section className={`community-layout ${community.selectedPost || community.detailLoading ? 'has-detail' : ''}`}>
        <div className="community-feed">
          {community.loading && <div className="community-state">正在加载社区动态...</div>}
          {!community.loading && !community.error && community.posts.length === 0 && <div className="community-state"><strong>广场尚无公开内容</strong><span>登录后发布第一条经过验证的分享。</span></div>}
          {community.posts.map(post => (
            <article key={post.id} className="community-post" onClick={() => community.openPost(post.id)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter') community.openPost(post.id); }}>
              <div className="community-post-meta"><span>{TYPE_LABELS[post.type] || post.type}</span><span>{post.displayName || post.username} · {relativeDate(post.createdAt)}</span></div>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
              <div className="community-post-actions" onClick={event => event.stopPropagation()}>
                <button className={post.liked ? 'active liked' : ''} onClick={() => protectedAction(() => community.setLike(post.id, !post.liked))}>赞同 {post.likeCount || 0}</button>
                <button className={post.bookmarked ? 'active' : ''} onClick={() => protectedAction(() => community.setBookmark(post.id, !post.bookmarked))}>收藏 {post.bookmarkCount || 0}</button>
                <button onClick={() => community.openPost(post.id)}>评论 {post.commentCount || 0}</button>
                {user?.id !== post.authorId && <button className={post.following ? 'active' : ''} onClick={() => protectedAction(() => community.setFollow(post.authorId, !post.following))}>{post.following ? '已关注' : '关注作者'}</button>}
              </div>
            </article>
          ))}
        </div>
        <CommunityPostDetail
          post={community.selectedPost} comments={community.comments} loading={community.detailLoading}
          user={user} onRequireAuth={onRequireAuth} onClose={() => { community.setSelectedPost(null); community.setComments([]); }}
          onComment={body => protectedAction(() => community.addComment(community.selectedPost.id, body))}
          onLike={enabled => protectedAction(() => community.setLike(community.selectedPost.id, enabled))}
          onBookmark={enabled => protectedAction(() => community.setBookmark(community.selectedPost.id, enabled))}
          onFollow={enabled => protectedAction(() => community.setFollow(community.selectedPost.authorId, enabled))}
        />
      </section>
    </div>
  );
}
