import { safeExternalFetch } from '../security/urlSafety.js';
import { routeError, sendJsonResponse } from './httpUtils.js';

async function readLimitedText(response, maxBytes = 1_000_000) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let total = 0;
  let output = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw Object.assign(new Error('网页内容超过读取上限'), { code: 'PAGE_TOO_LARGE', status: 413 }); }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

export async function handleFetchPageRequest(req, res) {
  if (String(req.method).toUpperCase() !== 'GET') return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
  let timeout;
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const target = requestUrl.searchParams.get('url');
    if (!target) throw Object.assign(new Error('url 不能为空'), { code: 'INVALID_URL', status: 400 });
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await safeExternalFetch(target, { headers: { 'User-Agent': 'SiliconMeridian/1.0' }, signal: controller.signal });
    if (!response.ok) throw Object.assign(new Error(`网页服务返回 ${response.status}`), { code: 'UPSTREAM_PAGE_ERROR', status: 502 });
    const contentType = String(response.headers.get('content-type') || '');
    if (!/(text|html|xml|json)/i.test(contentType)) throw Object.assign(new Error('目标不是可读取的文本页面'), { code: 'UNSUPPORTED_PAGE_TYPE', status: 415 });
    const html = await readLimitedText(response);
    const content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15_000);
    return sendJsonResponse(res, 200, { ok: true, content });
  } catch (error) {
    if (error?.name === 'AbortError') return routeError(res, Object.assign(new Error('网页读取超时'), { code: 'UPSTREAM_TIMEOUT', status: 504 }));
    return routeError(res, error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
