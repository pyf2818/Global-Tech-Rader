import { allowPrivateAiNetwork, safeExternalFetch } from '../security/urlSafety.js';
import { readJsonBody, sendJsonResponse } from './httpUtils.js';

const windows = new Map();
const ACTION_PROMPTS = {
  continue: content => `请继续以下文章的内容，保持相同的风格和语气：\n\n${content}`,
  rewrite: content => `请改写以下段落，使其更清晰、更专业，但保持原意不变：\n\n${content}`,
  expand: content => `请扩展以下内容，添加更多细节和论据，使其更丰富：\n\n${content}`,
  simplify: content => `请简化以下段落，使其更简洁易懂：\n\n${content}`,
  translate_zh: content => `请将以下内容翻译成中文。只输出翻译结果，不要添加解释：\n\n${content}`,
  translate_en: content => `请将以下内容翻译成英文：\n\n${content}`,
  title: content => `请为以下文章生成 5 个标题，每个标题不超过 30 字：\n\n${content}`,
  summary: content => `请为以下文章生成一段不超过 100 字的摘要：\n\n${content}`,
};

function clientKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function enforceRateLimit(req) {
  const now = Date.now();
  const key = clientKey(req);
  const active = (windows.get(key) || []).filter(timestamp => now - timestamp < 5 * 60_000);
  if (active.length >= 30) throw Object.assign(new Error('AI 请求过于频繁，请稍后再试'), { code: 'RATE_LIMITED', status: 429 });
  active.push(now);
  windows.set(key, active);
  if (windows.size > 2000) for (const [entry, hits] of windows) if (!hits.some(timestamp => now - timestamp < 5 * 60_000)) windows.delete(entry);
}

function cleanText(value, max) { return String(value || '').slice(0, max); }

function sendAiError(res, error) {
  const code = error?.code || (error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'AI_GATEWAY_ERROR');
  const status = error?.status || (error?.name === 'AbortError' ? 504 : 500);
  const message = error?.name === 'AbortError' ? '模型服务请求超时' : (error?.message || 'AI 网关请求失败');
  return sendJsonResponse(res, status, { ok: false, error: message, errorCode: code });
}

function buildMessages(body) {
  const action = cleanText(body.action, 40);
  const content = cleanText(body.content, 50_000);
  const systemPrompt = cleanText(body.systemPrompt, 10_000);
  const result = systemPrompt ? [{ role: 'system', content: systemPrompt }] : [];
  if (action === 'chat' && Array.isArray(body.messages)) {
    body.messages.slice(-20).forEach(message => {
      if (['user', 'assistant'].includes(message?.role) && message?.content) result.push({ role: message.role, content: cleanText(message.content, 20_000) });
    });
    if (content) result.push({ role: 'user', content });
    return result;
  }
  const prompt = ACTION_PROMPTS[action]?.(content) || `请根据以下要求处理内容：\n要求：${action}\n内容：${content}`;
  result.push({ role: 'user', content: prompt });
  return result;
}

export async function handleAiGenerateRequest(req, res) {
  if (String(req.method).toUpperCase() !== 'POST') {
    return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
  }
  let timeout;
  try {
    enforceRateLimit(req);
    const body = await readJsonBody(req);
    const baseUrl = cleanText(body.baseUrl, 2000).replace(/\/+$/, '');
    const model = cleanText(body.model, 200);
    if (!baseUrl || !model) throw Object.assign(new Error('baseUrl 和 model 不能为空'), { code: 'INVALID_AI_CONFIG', status: 400 });
    const apiUrl = /\/v[1-4]$/.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = cleanText(body.apiKey, 4000);
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await safeExternalFetch(apiUrl, {
      allowPrivate: allowPrivateAiNetwork(), method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({ model, messages: buildMessages(body), max_tokens: 1500, temperature: 0.7 }),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw Object.assign(new Error(`模型服务返回 ${response.status}`), { code: 'UPSTREAM_AI_ERROR', status: 502 });
    }
    const data = await response.json();
    return sendJsonResponse(res, 200, { ok: true, content: data.choices?.[0]?.message?.content || '' });
  } catch (error) {
    return sendAiError(res, error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
