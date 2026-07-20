import { useCallback, useState } from 'react';

async function request(path, options = {}) {
  const response = await fetch(`/api/community/${path}`, { ...options, credentials: 'include' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload?.error?.message || '社区服务请求失败');
    error.status = response.status;
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data || {};
}

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await request('posts?limit=30');
      setPosts(data.items || []);
    } catch (requestError) {
      setPosts([]); setError(requestError.message);
    } finally { setLoading(false); }
  }, []);

  const openPost = useCallback(async (postId) => {
    setDetailLoading(true); setError('');
    try {
      const [postData, commentData] = await Promise.all([
        request(`posts/${postId}`),
        request(`posts/${postId}/comments`),
      ]);
      setSelectedPost(postData.post || null);
      setComments(commentData.comments || []);
    } catch (requestError) { setError(requestError.message); } finally { setDetailLoading(false); }
  }, []);

  const createPost = useCallback(async (input) => {
    const data = await request('posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    setPosts(previous => [data.post, ...previous]);
    return data.post;
  }, []);

  const addComment = useCallback(async (postId, body, parentId = null) => {
    const data = await request(`posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, parentId }) });
    setComments(previous => [...previous, data.comment]);
    setPosts(previous => previous.map(post => post.id === postId ? { ...post, commentCount: Number(post.commentCount || 0) + 1 } : post));
    if (selectedPost?.id === postId) setSelectedPost(previous => ({ ...previous, commentCount: Number(previous.commentCount || 0) + 1 }));
    return data.comment;
  }, [selectedPost?.id]);

  const updateRelationship = useCallback(async (postId, relation, enabled) => {
    const stateKey = relation === 'like' ? 'liked' : 'bookmarked';
    const countKey = relation === 'like' ? 'likeCount' : 'bookmarkCount';
    const update = post => post.id !== postId ? post : { ...post, [stateKey]: enabled, [countKey]: Math.max(0, Number(post[countKey] || 0) + (enabled ? 1 : -1)) };
    const previousPosts = posts;
    const previousSelected = selectedPost;
    setPosts(current => current.map(update));
    if (selectedPost?.id === postId) setSelectedPost(update);
    try {
      const data = await request(`posts/${postId}/${relation}`, { method: enabled ? 'PUT' : 'DELETE' });
      setPosts(current => current.map(post => post.id === postId ? data.post : post));
      if (selectedPost?.id === postId) setSelectedPost(data.post);
    } catch (requestError) {
      setPosts(previousPosts); setSelectedPost(previousSelected); throw requestError;
    }
  }, [posts, selectedPost]);

  const setFollow = useCallback(async (authorId, enabled) => {
    await request(`users/${authorId}/follow`, { method: enabled ? 'PUT' : 'DELETE' });
    setPosts(previous => previous.map(post => post.authorId === authorId ? { ...post, following: enabled } : post));
    if (selectedPost?.authorId === authorId) setSelectedPost(previous => ({ ...previous, following: enabled }));
  }, [selectedPost?.authorId]);

  return {
    posts, selectedPost, comments, loading, detailLoading, error,
    setSelectedPost, setComments, setError,
    loadPosts, openPost, createPost, addComment,
    setLike: (postId, enabled) => updateRelationship(postId, 'like', enabled),
    setBookmark: (postId, enabled) => updateRelationship(postId, 'bookmark', enabled),
    setFollow,
  };
}
