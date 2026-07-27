// agentJobsHandlers.js - 智能体定时任务的 HTTP handler
// 路由前缀: /api/agent-jobs/*
import {
  createJob, updateJob, deleteJob, listJobs, getJobRuns, nextCronRun,
} from '../agent/agentJobsService.js';
import { sendJsonResponse, readJsonBody } from './httpUtils.js';
import { getUserIdFromRequest } from './agentAuth.js';

async function requireUserId(req) {
  return getUserIdFromRequest(req);
}

export async function handleAgentJobsRequest(req, res, pathname, method) {
  // GET /api/agent-jobs - 列表
  if (pathname === '/api/agent-jobs' && method === 'GET') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const jobs = await listJobs(userId);
    return sendJsonResponse(res, 200, { ok: true, jobs });
  }

  // POST /api/agent-jobs - 创建
  if (pathname === '/api/agent-jobs' && method === 'POST') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const body = await readJsonBody(req);
    if (!body.agentId || !body.name || !body.cronExpr || !body.missionPrompt) {
      return sendJsonResponse(res, 400, { ok: false, error: 'agentId, name, cronExpr, missionPrompt are required' });
    }
    try {
      const result = await createJob({
        userId,
        agentId: body.agentId,
        name: body.name,
        description: body.description || '',
        cronExpr: body.cronExpr,
        timezone: body.timezone || 'Asia/Shanghai',
        missionPrompt: body.missionPrompt,
      });
      return sendJsonResponse(res, 200, { ok: true, ...result });
    } catch (err) {
      return sendJsonResponse(res, 400, { ok: false, error: err.message });
    }
  }

  // PUT /api/agent-jobs/:id - 更新
  const updateMatch = pathname.match(/^\/api\/agent-jobs\/([^/]+)$/);
  if (updateMatch && method === 'PUT') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const jobId = updateMatch[1];
    const body = await readJsonBody(req);
    try {
      const result = await updateJob(jobId, userId, {
        name: body.name,
        description: body.description,
        cronExpr: body.cronExpr,
        timezone: body.timezone,
        missionPrompt: body.missionPrompt,
        enabled: body.enabled,
      });
      return sendJsonResponse(res, 200, { ok: true, ...result });
    } catch (err) {
      return sendJsonResponse(res, 400, { ok: false, error: err.message });
    }
  }

  // DELETE /api/agent-jobs/:id - 删除
  const deleteMatch = pathname.match(/^\/api\/agent-jobs\/([^/]+)$/);
  if (deleteMatch && method === 'DELETE') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const jobId = deleteMatch[1];
    const result = await deleteJob(jobId, userId);
    return sendJsonResponse(res, 200, { ok: true, ...result });
  }

  // GET /api/agent-jobs/:id/runs - 执行历史
  const runsMatch = pathname.match(/^\/api\/agent-jobs\/([^/]+)\/runs$/);
  if (runsMatch && method === 'GET') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const jobId = runsMatch[1];
    const url = new URL(req.url, 'http://x');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const runs = await getJobRuns(jobId, userId, limit);
    return sendJsonResponse(res, 200, { ok: true, runs });
  }

  // POST /api/agent-jobs/preview-cron - 预览下次执行时间
  if (pathname === '/api/agent-jobs/preview-cron' && method === 'POST') {
    const body = await readJsonBody(req);
    if (!body.cronExpr) return sendJsonResponse(res, 400, { ok: false, error: 'cronExpr is required' });
    try {
      const next = nextCronRun(body.cronExpr, body.from ? new Date(body.from) : new Date());
      return sendJsonResponse(res, 200, { ok: true, nextRun: next.toISOString() });
    } catch (err) {
      return sendJsonResponse(res, 400, { ok: false, error: err.message });
    }
  }

  return sendJsonResponse(res, 404, { ok: false, error: 'NOT_FOUND' });
}
