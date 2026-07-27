// Vercel serverless: /api/agent/run (主动调用 agent 执行)
import { handleAgentRunRequest } from '../../server/http/agentRunHandlers.js';

export default async function handler(req, res) {
  return handleAgentRunRequest(req, res);
}
