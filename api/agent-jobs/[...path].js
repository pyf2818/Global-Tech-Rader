// Vercel serverless: /api/agent-jobs/*
// 复用 dev 模式下的 handleAgentJobsRequest（与 server/news/plugin.js 同源）
import { handleAgentJobsRequest } from '../../server/http/agentJobsHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  // [...path] 捕获到的可能是数组或字符串，统一成 pathname
  const segments = Array.isArray(value) ? value : String(value || '').split('/');
  const filtered = segments.filter(Boolean);
  const pathname = '/api/agent-jobs' + (filtered.length ? '/' + filtered.join('/') : '');
  return handleAgentJobsRequest(req, res, pathname, req.method);
}
