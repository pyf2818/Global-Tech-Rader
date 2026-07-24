create table if not exists intelligence_articles (
  id varchar(300) primary key,
  provider varchar(40) not null,
  upstream_id varchar(300) not null default '',
  title varchar(500) not null,
  title_en varchar(500) not null default '',
  summary text not null default '',
  url text not null,
  source varchar(200) not null,
  source_url text not null default '',
  source_tier varchar(40) not null default '',
  category varchar(80) not null default 'industry',
  category_label varchar(120) not null default '',
  published_at timestamptz not null,
  entities jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists intelligence_events (
  id varchar(360) primary key,
  title varchar(500) not null,
  summary text not null default '',
  category varchar(80) not null default 'industry',
  category_label varchar(120) not null default '',
  primary_article_id varchar(300) references intelligence_articles(id) on delete set null,
  article_ids jsonb not null default '[]'::jsonb,
  entities jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  independent_source_count integer not null default 1,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  heat_score numeric(6,2) not null default 0,
  impact_score numeric(6,2) not null default 0,
  intelligence_score numeric(6,2) not null default 0,
  confidence numeric(6,2) not null default 0,
  citations jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists intelligence_articles_published_idx on intelligence_articles(published_at desc);
create index if not exists intelligence_articles_source_idx on intelligence_articles(source);
create index if not exists intelligence_articles_category_idx on intelligence_articles(category);
create unique index if not exists intelligence_articles_url_unique on intelligence_articles(lower(url));
create index if not exists intelligence_events_score_idx on intelligence_events(intelligence_score desc, last_seen_at desc);
create index if not exists intelligence_events_last_seen_idx on intelligence_events(last_seen_at desc);
create index if not exists intelligence_events_category_idx on intelligence_events(category);
