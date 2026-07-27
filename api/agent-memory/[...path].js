// Vercel serverless: /api/agent-memory/* (记忆 CRUD + persona summary)
import { handleAgentMemoryRequest } from '../../server/http/agentMemoryHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  const segments = Array.isArray(value) ? value : String(value || '').split('/');
  const filtered = segments.filter(Boolean);
  const pathname = '/api/agent-memory' + (filtered.length ? '/' + filtered.join('/') : '');
  return handleAgentMemoryRequest(req, res, pathname, req.method);
}
