import { handleAuthRequest } from '../../server/http/authHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.action;
  const action = Array.isArray(value) ? value[0] : value;
  return handleAuthRequest(req, res, { action });
}
