create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  username varchar(40) not null unique,
  email varchar(254) unique,
  password_hash text not null,
  password_salt text not null,
  password_params jsonb not null,
  display_name varchar(80) not null,
  avatar_url text not null default '',
  signature varchar(280) not null default '',
  interests jsonb not null default '[]'::jsonb,
  status varchar(20) not null default 'active' check (status in ('active','suspended','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table user_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  version integer not null default 1,
  confidence numeric(5,2) not null default 0,
  behavior_signals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table profile_domains (user_id uuid not null references users(id) on delete cascade, domain_id varchar(80) not null, tier varchar(10) not null check (tier in ('focus','normal','explore')), primary key (user_id, domain_id));
create table profile_sources (user_id uuid not null references users(id) on delete cascade, source_id varchar(200) not null, tier varchar(10) not null check (tier in ('focus','normal','explore')), primary key (user_id, source_id));
create table special_follows (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, type varchar(16) not null check (type in ('source','author','keyword','url')), target varchar(500) not null, note varchar(280) not null default '', created_at timestamptz not null default now(), unique (user_id, type, target));

create table posts (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references users(id),
  type varchar(20) not null check (type in ('article','briefing','work','workflow')),
  title varchar(180) not null, body text not null, source_refs jsonb not null default '[]'::jsonb,
  visibility varchar(12) not null default 'public' check (visibility in ('public','followers','private')),
  status varchar(12) not null default 'published' check (status in ('draft','published','hidden','deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table comments (id uuid primary key default gen_random_uuid(), post_id uuid not null references posts(id) on delete cascade, author_id uuid not null references users(id), parent_id uuid references comments(id) on delete cascade, body varchar(2000) not null, status varchar(12) not null default 'published' check (status in ('published','hidden','deleted')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table post_likes (user_id uuid not null references users(id) on delete cascade, post_id uuid not null references posts(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, post_id));
create table post_bookmarks (user_id uuid not null references users(id) on delete cascade, post_id uuid not null references posts(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, post_id));
create table user_follows (follower_id uuid not null references users(id) on delete cascade, followed_id uuid not null references users(id) on delete cascade, created_at timestamptz not null default now(), primary key (follower_id, followed_id), check (follower_id <> followed_id));

create table recommendation_snapshots (id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, snapshot_date date not null, profile_version integer not null, algorithm_version integer not null, updates jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), unique (user_id, snapshot_date));
create table recommendation_items (snapshot_id uuid not null references recommendation_snapshots(id) on delete cascade, item_id varchar(300) not null, lane varchar(10) not null check (lane in ('public','personal')), position integer not null, total_score numeric(6,2) not null, score_parts jsonb not null, reasons jsonb not null, item_payload jsonb not null, primary key (snapshot_id, lane, position));
create table briefing_snapshots (snapshot_id uuid primary key references recommendation_snapshots(id) on delete cascade, algorithm_payload jsonb not null, ai_payload jsonb, ai_citation_ids jsonb not null default '[]'::jsonb, ai_status varchar(16) not null default 'not_requested', updated_at timestamptz not null default now());

create table creation_assets (id uuid primary key default gen_random_uuid(), owner_id uuid not null references users(id) on delete cascade, original_item_id varchar(300) not null, type varchar(24) not null, title varchar(300) not null, content text not null default '', citation jsonb not null, tags jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (owner_id, original_item_id));
create table creation_documents (id uuid primary key default gen_random_uuid(), owner_id uuid not null references users(id) on delete cascade, title varchar(300) not null, draft_content text not null default '', status varchar(16) not null default 'draft' check (status in ('draft','review','published','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table creation_versions (id uuid primary key default gen_random_uuid(), document_id uuid not null references creation_documents(id) on delete cascade, version_number integer not null, client_operation_id uuid not null, title varchar(300) not null, content text not null, asset_ids jsonb not null default '[]'::jsonb, citations jsonb not null default '[]'::jsonb, reason varchar(20) not null, created_at timestamptz not null default now(), unique (document_id, version_number), unique (document_id, client_operation_id));

create index posts_created_idx on posts(created_at desc);
create index comments_post_created_idx on comments(post_id, created_at);
create index recommendation_user_date_idx on recommendation_snapshots(user_id, snapshot_date desc);
create index sessions_active_idx on sessions(token_hash) where revoked_at is null;
create unique index users_username_lower_unique on users(lower(username));
create unique index users_email_lower_unique on users(lower(email)) where email is not null;
