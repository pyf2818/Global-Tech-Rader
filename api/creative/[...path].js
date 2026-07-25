import { handleCreativeRequest } from '../../server/http/creativeHandlers.js';

export default async function handler(req, res) {
  const value = req.query?.path;
  const path = Array.isArray(value) ? value : String(value || '').split('/');
  return handleCreativeRequest(req, res, { path });
}
