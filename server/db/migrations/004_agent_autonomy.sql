-- 004_agent_autonomy.sql
-- Agent 自主能力：定时任务 + 跨会话记忆 + 用户画像深化

-- 1. 用户画像深化字段（追加到现有 user_profiles 表）
--    persona_summary: LLM 自我进化总结的用户性格/需求/习惯
--    learned_preferences: 学习画像（频繁主题/偏好格式/偏好深度）
alter table user_profiles
  add column if not exists persona_summary jsonb not null default '{}'::jsonb,
  add column if not exists learned_preferences jsonb not null default '{}'::jsonb,
  add column if not exists persona_updated_at timestamptz;

-- 2. Agent 跨会话记忆（每轮对话后异步总结写入）
create table if not exists agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  agent_id varchar(60) not null,         -- 智能体 id（orchestrator/analyst/...）
  session_id varchar(80),                -- 来源会话 id（可空，跨会话总结无）
  memory_type varchar(20) not null,      -- user_habit / user_thought / user_trait / user_need / agent_insight
  content text not null,                 -- 记忆内容（自然语言）
  evidence jsonb not null default '[]'::jsonb,  -- 支撑证据（消息片段/工具调用）
  weight integer not null default 1,    -- 权重 1-10，多次提及加权
  created_at timestamptz not null default now(),
  expires_at timestamptz                -- 过期时间（可空，长期记忆不过期）
);
create index if not exists idx_agent_memories_user_agent on agent_memories(user_id, agent_id);
create index if not exists idx_agent_memories_user_type on agent_memories(user_id, memory_type);
create index if not exists idx_agent_memories_recent on agent_memories(user_id, created_at desc);

-- 3. Agent 定时任务（cron 表达式触发）
create table if not exists agent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  agent_id varchar(60) not null,         -- 执行该任务的智能体
  name varchar(80) not null,            -- 任务名称
  description text not null default '',
  cron_expr varchar(40) not null,        -- 5 字段 cron 表达式（分 时 日 月 周）
  timezone varchar(40) not null default 'Asia/Shanghai',
  mission_prompt text not null,          -- 任务目标 prompt（注入到 agent 的 user 消息）
  enabled boolean not null default true,
  last_run_at timestamptz,               -- 上次执行时间
  next_run_at timestamptz,               -- 下次预期执行时间
  last_result jsonb,                     -- 上次执行结果摘要
  run_count integer not null default 0,  -- 累计执行次数
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_agent_jobs_user on agent_jobs(user_id);
create index if not exists idx_agent_jobs_next_run on agent_jobs(enabled, next_run_at) where enabled = true;

-- 4. Agent 任务执行历史（每次定时任务执行的产物）
create table if not exists agent_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agent_jobs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status varchar(20) not null,           -- running / success / failed / timeout
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  output text not null default '',       -- agent 最终回复
  tool_calls jsonb not null default '[]'::jsonb,  -- 工具调用记录
  error text,
  tokens_used integer
);
create index if not exists idx_agent_job_runs_job on agent_job_runs(job_id, started_at desc);
create index if not exists idx_agent_job_runs_user on agent_job_runs(user_id, started_at desc);
