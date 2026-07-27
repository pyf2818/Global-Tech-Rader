// agentMemoryHandlers.js - 智能体记忆与画像深化的 HTTP handler
// 路由前缀: /api/agent-memory/*
// 鉴权: 必须登录（从 cookie session 拿到 userId）
import {
  addAgentMemory, addAgentMemoriesBatch, getAgentMemories, searchAgentMemories,
  deleteAgentMemory, getPersonaSummary, setPersonaSummary, mergePersonaSummary,
} from '../agent/agentMemoryService.js';
import { sendJsonResponse, readJsonBody } from './httpUtils.js';
import { getUserIdFromRequest } from './agentAuth.js';

const MEMORY_TYPES = ['user_habit', 'user_thought', 'user_trait', 'user_need', 'agent_insight'];

async function requireUserId(req) {
  return getUserIdFromRequest(req);
}

export async function handleAgentMemoryRequest(req, res, pathname, method) {
  // GET /api/agent-memory/list
  if (pathname === '/api/agent-memory/list' && method === 'GET') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const url = new URL(req.url, 'http://x');
    const agentId = url.searchParams.get('agentId') || undefined;
    const memoryType = url.searchParams.get('memoryType') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const memories = await getAgentMemories(userId, { agentId, memoryType, limit, offset });
    return sendJsonResponse(res, 200, { ok: true, memories });
  }

  // GET /api/agent-memory/search?q=...
  if (pathname === '/api/agent-memory/search' && method === 'GET') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const url = new URL(req.url, 'http://x');
    const q = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const memories = await searchAgentMemories(userId, q, { limit });
    return sendJsonResponse(res, 200, { ok: true, memories });
  }

  // POST /api/agent-memory/add
  if (pathname === '/api/agent-memory/add' && method === 'POST') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const body = await readJsonBody(req);
    if (!body.memoryType || !MEMORY_TYPES.includes(body.memoryType)) {
      return sendJsonResponse(res, 400, { ok: false, error: `memoryType must be one of ${MEMORY_TYPES.join('/')}` });
    }
    if (!body.content || typeof body.content !== 'string') {
      return sendJsonResponse(res, 400, { ok: false, error: 'content is required' });
    }
    const id = await addAgentMemory({
      userId,
      agentId: body.agentId || 'orchestrator',
      sessionId: body.sessionId,
      memoryType: body.memoryType,
      content: body.content,
      evidence: body.evidence || [],
      weight: body.weight || 1,
      expiresAt: body.expiresAt || null,
    });
    return sendJsonResponse(res, 200, { ok: true, id });
  }

  // POST /api/agent-memory/batch
  if (pathname === '/api/agent-memory/batch' && method === 'POST') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const body = await readJsonBody(req);
    const memories = Array.isArray(body.memories) ? body.memories : [];
    if (memories.length === 0) return sendJsonResponse(res, 400, { ok: false, error: 'memories array is empty' });
    const ids = await addAgentMemoriesBatch(userId, memories);
    return sendJsonResponse(res, 200, { ok: true, ids, count: ids.length });
  }

  // DELETE /api/agent-memory/delete?id=... or ?sessionId=...
  if (pathname === '/api/agent-memory/delete' && method === 'DELETE') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const url = new URL(req.url, 'http://x');
    const result = await deleteAgentMemory(userId, {
      memoryId: url.searchParams.get('id'),
      sessionId: url.searchParams.get('sessionId'),
    });
    return sendJsonResponse(res, 200, { ok: true, ...result });
  }

  // GET /api/agent-memory/persona
  if (pathname === '/api/agent-memory/persona' && method === 'GET') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const result = await getPersonaSummary(userId);
    return sendJsonResponse(res, 200, { ok: true, ...result });
  }

  // PUT /api/agent-memory/persona
  if (pathname === '/api/agent-memory/persona' && method === 'PUT') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const body = await readJsonBody(req);
    const result = await setPersonaSummary(userId, body.personaSummary || {}, body.learnedPreferences || null);
    return sendJsonResponse(res, 200, { ok: true, ...result });
  }

  // PATCH /api/agent-memory/persona (合并式增量更新)
  if (pathname === '/api/agent-memory/persona' && method === 'PATCH') {
    const userId = await requireUserId(req);
    if (!userId) return sendJsonResponse(res, 401, { ok: false, error: 'UNAUTHORIZED' });
    const body = await readJsonBody(req);
    const result = await mergePersonaSummary(userId, body.patch || {});
    return sendJsonResponse(res, 200, { ok: true, ...result });
  }

  return sendJsonResponse(res, 404, { ok: false, error: 'NOT_FOUND' });
}
