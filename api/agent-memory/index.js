// Vercel serverless: /api/agent-memory (根路径)
import { handleAgentMemoryRequest } from '../../server/http/agentMemoryHandlers.js';

export default async function handler(req, res) {
  return handleAgentMemoryRequest(req, res, '/api/agent-memory', req.method);
}
