create index if not exists sessions_expiry_idx
  on sessions(expires_at)
  where revoked_at is null;

create index if not exists posts_public_feed_idx
  on posts(created_at desc)
  where status = 'published' and visibility = 'public';

create index if not exists post_likes_post_idx
  on post_likes(post_id);

create index if not exists post_bookmarks_post_idx
  on post_bookmarks(post_id);

create index if not exists user_follows_followed_idx
  on user_follows(followed_id);

create index if not exists creation_assets_owner_updated_idx
  on creation_assets(owner_id, updated_at desc);

create index if not exists creation_documents_owner_updated_idx
  on creation_documents(owner_id, updated_at desc);

create index if not exists creation_versions_document_created_idx
  on creation_versions(document_id, created_at desc);
