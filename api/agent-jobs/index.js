// Vercel serverless: /api/agent-jobs (根路径，列表与创建)
import { handleAgentJobsRequest } from '../../server/http/agentJobsHandlers.js';

export default async function handler(req, res) {
  return handleAgentJobsRequest(req, res, '/api/agent-jobs', req.method);
}
