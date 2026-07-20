import { createCommunityRepository } from './communityRepository.js';

const TYPES = new Set(['article', 'briefing', 'work', 'workflow']);
const VISIBILITIES = new Set(['public', 'followers', 'private']);
const STATUSES = new Set(['draft', 'published']);

function fail(code, message, status) { throw Object.assign(new Error(message), { code, status }); }
function requiredUser(userId) { if (!userId) fail('UNAUTHORIZED', '请先登录', 401); }
function text(value) { return String(value ?? '').trim(); }

function validatePost(input, { partial = false } = {}) {
  const output = {};
  if (!partial || input.title !== undefined) {
    output.title = text(input.title);
    if (!output.title || output.title.length > 180) fail('INVALID_TITLE', '标题长度需为 1-180 字', 400);
  }
  if (!partial || input.body !== undefined) {
    output.body = text(input.body);
    if (!output.body || output.body.length > 100000) fail('INVALID_BODY', '正文长度需为 1-100000 字', 400);
  }
  if (!partial || input.type !== undefined) {
    output.type = input.type || 'article';
    if (!TYPES.has(output.type)) fail('INVALID_TYPE', '发布类型不支持', 400);
  }
  if (!partial || input.visibility !== undefined) {
    output.visibility = input.visibility || 'public';
    if (!VISIBILITIES.has(output.visibility)) fail('INVALID_VISIBILITY', '可见范围不支持', 400);
  }
  if (!partial || input.status !== undefined) {
    output.status = input.status || 'published';
    if (!STATUSES.has(output.status)) fail('INVALID_STATUS', '发布状态不支持', 400);
  }
  if (!partial || input.sourceRefs !== undefined) output.sourceRefs = Array.isArray(input.sourceRefs) ? input.sourceRefs.slice(0, 50) : [];
  return output;
}

export function createCommunityService(repository = createCommunityRepository()) {
  async function visiblePost(postId, viewerId) {
    const post = await repository.getPost(postId, viewerId);
    if (!post || post.status === 'deleted' || (post.status !== 'published' && post.authorId !== viewerId)) fail('POST_NOT_FOUND', '内容不存在', 404);
    if (post.visibility === 'private' && post.authorId !== viewerId) fail('POST_NOT_FOUND', '内容不存在', 404);
    if (post.visibility === 'followers' && post.authorId !== viewerId && !post.following) fail('POST_NOT_FOUND', '内容不存在', 404);
    return post;
  }
  return {
    async listPosts({ viewerId = null, cursor = null, limit = 20 } = {}) {
      const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
      const posts = await repository.listPosts({ viewerId, cursor, limit: safeLimit + 1 });
      const hasMore = posts.length > safeLimit;
      const items = posts.slice(0, safeLimit);
      return { items, nextCursor: hasMore ? items.at(-1)?.createdAt : null };
    },
    getPost({ postId, viewerId = null }) { return visiblePost(postId, viewerId); },
    async createPost({ userId, input }) {
      requiredUser(userId);
      return repository.createPost({ authorId: userId, ...validatePost(input) });
    },
    async updatePost({ userId, postId, input }) {
      requiredUser(userId);
      const post = await repository.getPost(postId, userId);
      if (!post) fail('POST_NOT_FOUND', '内容不存在', 404);
      if (post.authorId !== userId) fail('FORBIDDEN', '仅作者可编辑', 403);
      await repository.updatePost(postId, validatePost(input, { partial: true }));
      return visiblePost(postId, userId);
    },
    async deletePost({ userId, postId }) {
      requiredUser(userId);
      const post = await repository.getPost(postId, userId);
      if (!post) fail('POST_NOT_FOUND', '内容不存在', 404);
      if (post.authorId !== userId) fail('FORBIDDEN', '仅作者可删除', 403);
      await repository.softDeletePost(postId);
    },
    async listComments({ postId, viewerId = null }) {
      await visiblePost(postId, viewerId);
      return repository.listComments(postId);
    },
    async createComment({ userId, postId, body, parentId = null }) {
      requiredUser(userId);
      await visiblePost(postId, userId);
      const value = text(body);
      if (!value || value.length > 2000) fail('INVALID_COMMENT', '评论长度需为 1-2000 字', 400);
      return repository.createComment({ postId, authorId: userId, parentId: parentId || null, body: value });
    },
    async setLike({ userId, postId, enabled }) {
      requiredUser(userId); await visiblePost(postId, userId); await repository.setLike(userId, postId, enabled);
      return visiblePost(postId, userId);
    },
    async setBookmark({ userId, postId, enabled }) {
      requiredUser(userId); await visiblePost(postId, userId); await repository.setBookmark(userId, postId, enabled);
      return visiblePost(postId, userId);
    },
    async setFollow({ userId, followedId, enabled }) {
      requiredUser(userId);
      if (userId === followedId) fail('SELF_FOLLOW', '不能关注自己', 400);
      await repository.setFollow(userId, followedId, enabled);
      return { followedId, following: enabled };
    },
  };
}
