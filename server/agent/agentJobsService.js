// agentJobsService.js - 智能体定时任务 CRUD + 下次执行时间计算
import { getPool } from '../db/client.js';
import { runAgentOnce } from '../http/agentRunHandlers.js';

/* ============ Cron 表达式解析（简化版，支持 5 字段：分 时 日 月 周） ============ */
// 不支持 L/W/# 等高级语法，仅支持 * / 数字 / , / -
// 例子：'0 8 * * *' (每天8点) / '*/30 * * * *' (每30分钟) / '0 9 * * 1-5' (工作日9点)

function parseCronField(field, min, max) {
  if (field === '*') {
    const arr = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (!step || step < 1) throw new Error(`invalid step: ${field}`);
    const arr = [];
    for (let i = min; i <= max; i += step) arr.push(i);
    return arr;
  }
  const arr = [];
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n, 10));
      if (isNaN(start) || isNaN(end) || start > end) throw new Error(`invalid range: ${part}`);
      for (let i = start; i <= end; i++) arr.push(i);
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < min || n > max) throw new Error(`invalid value: ${part}`);
      arr.push(n);
    }
  }
  return arr;
}

/**
 * 计算 cron 表达式的下一次执行时间
 * @param {string} cronExpr - 5字段 cron: "分 时 日 月 周"
 * @param {Date} from - 起始时间（默认 now）
 * @param {string} timezone - 时区（暂未实现，按服务器本地时区）
 * @returns {Date} 下次执行时间
 */
export function nextCronRun(cronExpr, from = new Date(), timezone = 'Asia/Shanghai') {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`cron expression must have 5 fields: ${cronExpr}`);

  const minutes = parseCronField(parts[0], 0, 59);
  const hours = parseCronField(parts[1], 0, 23);
  const daysOfMonth = parseCronField(parts[2], 1, 31);
  const months = parseCronField(parts[3], 1, 12);
  const daysOfWeek = parseCronField(parts[4], 0, 6);

  // 从 from + 1 分钟开始逐分钟扫描（最多扫 366 天）
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  const maxIter = 366 * 24 * 60; // 最多扫一年
  for (let i = 0; i < maxIter; i++) {
    const t = new Date(start.getTime() + i * 60 * 1000);
    if (
      minutes.includes(t.getMinutes()) &&
      hours.includes(t.getHours()) &&
      daysOfMonth.includes(t.getDate()) &&
      months.includes(t.getMonth() + 1) &&
      daysOfWeek.includes(t.getDay())
    ) {
      return t;
    }
  }
  throw new Error(`no next run found within 1 year for cron: ${cronExpr}`);
}

/* ============ Jobs CRUD ============ */

export async function createJob({ userId, agentId, name, description = '', cronExpr, timezone = 'Asia/Shanghai', missionPrompt }) {
  const pool = getPool();
  // 校验 cron 表达式
  const nextRun = nextCronRun(cronExpr);
  const result = await pool.query(
    `insert into agent_jobs (user_id, agent_id, name, description, cron_expr, timezone, mission_prompt, next_run_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, next_run_at`,
    [userId, agentId, name, description, cronExpr, timezone, missionPrompt, nextRun]
  );
  return { id: result.rows[0].id, nextRunAt: result.rows[0].next_run_at };
}

export async function updateJob(jobId, userId, patch) {
  const pool = getPool();
  const fields = [];
  const params = [];
  let idx = 1;
  for (const key of ['name', 'description', 'cron_expr', 'timezone', 'mission_prompt', 'enabled']) {
    if (patch[key] !== undefined) {
      const col = key === 'cronExpr' ? 'cron_expr' : key === 'missionPrompt' ? 'mission_prompt' : key;
      fields.push(`${col} = $${idx++}`);
      params.push(patch[key]);
    }
  }
  if (patch.cronExpr) {
    const nextRun = nextCronRun(patch.cronExpr);
    fields.push(`next_run_at = $${idx++}`);
    params.push(nextRun);
  }
  if (fields.length === 0) return { updated: 0 };
  params.push(jobId, userId);
  const result = await pool.query(
    `update agent_jobs set ${fields.join(', ')}, updated_at = now() where id = $${idx++} and user_id = $${idx++}`,
    params
  );
  return { updated: result.rowCount };
}

export async function deleteJob(jobId, userId) {
  const pool = getPool();
  const result = await pool.query('delete from agent_jobs where id = $1 and user_id = $2', [jobId, userId]);
  return { deleted: result.rowCount };
}

export async function listJobs(userId) {
  const pool = getPool();
  const result = await pool.query(
    `select id, agent_id, name, description, cron_expr, timezone, mission_prompt, enabled,
            last_run_at, next_run_at, run_count, created_at, updated_at
     from agent_jobs where user_id = $1 order by created_at desc`,
    [userId]
  );
  return result.rows.map(r => ({
    id: r.id, agentId: r.agent_id, name: r.name, description: r.description,
    cronExpr: r.cron_expr, timezone: r.timezone, missionPrompt: r.mission_prompt,
    enabled: r.enabled, lastRunAt: r.last_run_at, nextRunAt: r.next_run_at,
    runCount: r.run_count, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function getJobRuns(jobId, userId, limit = 20) {
  const pool = getPool();
  const result = await pool.query(
    `select id, job_id, status, started_at, finished_at, duration_ms, output, error, tokens_used
     from agent_job_runs
     where job_id = $1 and user_id = $2
     order by started_at desc limit $3`,
    [jobId, userId, Math.min(Math.max(limit, 1), 100)]
  );
  return result.rows.map(r => ({
    id: r.id, jobId: r.job_id, status: r.status, startedAt: r.started_at,
    finishedAt: r.finished_at, durationMs: r.duration_ms, output: r.output,
    error: r.error, tokensUsed: r.tokens_used,
  }));
}

/* ============ Cron 守护：扫描到期任务并执行 ============ */

let cronTimer = null;
let cronRunning = false;

/**
 * 扫描所有到期的 agent jobs 并执行
 * 注意：这里需要从 user 的 LLM 配置中获取 baseUrl/apiKey/selectedModel
 * 当前实现：用环境变量 AGENT_LLM_CONFIG（JSON）作为默认 LLM 配置
 * 后续可改为从 user_settings 表读取每用户的 LLM 配置
 */
async function tickCronJobs() {
  if (cronRunning) return; // 防止重叠执行
  cronRunning = true;
  try {
    const pool = getPool();
    // 查找所有到期的任务
    const result = await pool.query(
      `select id, user_id, agent_id, mission_prompt, cron_expr, timezone
       from agent_jobs
       where enabled = true and next_run_at <= now()
       limit 10` // 每轮最多执行 10 个，避免长阻塞
    );

    for (const job of result.rows) {
      await executeJob(job);
    }
  } catch (err) {
    console.error('[cronTick] error:', err.message);
  } finally {
    cronRunning = false;
  }
}

async function executeJob(job) {
  const pool = getPool();
  const startedAt = new Date();
  let status = 'running';
  let output = '';
  let errorMessage = null;
  let tokensUsed = null;

  // 创建 run 记录
  const runResult = await pool.query(
    `insert into agent_job_runs (job_id, user_id, status, started_at) values ($1, $2, $3, $4) returning id`,
    [job.id, job.user_id, status, startedAt]
  );
  const runId = runResult.rows[0].id;

  try {
    // 读取 LLM 配置：暂用环境变量
    // TODO: 后续改为从 user_settings 表读取每用户的 LLM 配置
    let llmConfig = null;
    try {
      const rawConfig = process.env.AGENT_LLM_CONFIG;
      if (rawConfig) llmConfig = JSON.parse(rawConfig);
    } catch {}

    if (!llmConfig?.baseUrl || !llmConfig?.selectedModel) {
      throw new Error('LLM config not available for cron jobs (set AGENT_LLM_CONFIG env var)');
    }

    // 执行任务
    const result = await runAgentOnce({
      agentId: job.agent_id,
      missionPrompt: job.mission_prompt,
      userId: job.user_id,
      llmConfig,
      newsContext: { blocked: [], interests: [] },
      sessionId: `cron-${runId}`,
    });
    output = (result.output || '').slice(0, 5000);
    tokensUsed = result.tokensUsed;
    status = 'success';
  } catch (err) {
    errorMessage = err.message;
    status = 'failed';
    console.error(`[executeJob] job ${job.id} failed:`, err.message);
  } finally {
    const finishedAt = new Date();
    const durationMs = finishedAt - startedAt;

    // 更新 run 记录
    await pool.query(
      `update agent_job_runs set status = $1, finished_at = $2, duration_ms = $3, output = $4, error = $5, tokens_used = $6 where id = $7`,
      [status, finishedAt, durationMs, output, errorMessage, tokensUsed, runId]
    );

    // 计算下次执行时间
    let nextRun = null;
    try {
      nextRun = nextCronRun(job.cron_expr, startedAt, job.timezone);
    } catch (err) {
      console.error(`[executeJob] next cron calc failed:`, err.message);
    }

    // 更新 job 状态
    await pool.query(
      `update agent_jobs set last_run_at = $1, next_run_at = $2, last_result = $3, run_count = run_count + 1 where id = $4`,
      [startedAt, nextRun, JSON.stringify({ status, runId, durationMs }), job.id]
    );
  }
}

/**
 * 启动 cron 守护进程
 * @param {number} intervalMs - 扫描间隔（默认 60 秒）
 * @returns {Function} stop 函数
 */
export function startCronDaemon(intervalMs = 60 * 1000) {
  if (cronTimer) {
    console.log('[cron] daemon already running');
    return () => {};
  }
  console.log(`[cron] daemon started, interval = ${intervalMs}ms`);
  // 启动后立即跑一次（扫描已过期任务）
  setTimeout(() => tickCronJobs().catch(() => {}), 5000);
  cronTimer = setInterval(() => {
    tickCronJobs().catch(err => console.error('[cron tick] error:', err.message));
  }, intervalMs);
  return () => {
    if (cronTimer) {
      clearInterval(cronTimer);
      cronTimer = null;
      console.log('[cron] daemon stopped');
    }
  };
}
