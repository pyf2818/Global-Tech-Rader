// agentAuth.js - 共用的鉴权工具：从 cookie session 解析 userId
import { createAuthService } from '../auth/authService.js';
import { parseCookies } from './httpUtils.js';

// 懒加载 auth service：避免 build 时立即创建 DB pool（DATABASE_URL 未配置会报错）
let _auth = null;
function getAuth() {
  if (!_auth) _auth = createAuthService();
  return _auth;
}

/**
 * 从请求 cookie 中解析 userId
 * @param {Object} req - HTTP 请求
 * @returns {Promise<string|null>} userId 或 null（未登录）
 */
export async function getUserIdFromRequest(req) {
  const token = parseCookies(req.headers?.cookie || '').meridian_session || '';
  if (!token) return null;
  try {
    const user = await getAuth().authenticate(token);
    return user?.id || null;
  } catch {
    return null;
  }
}
