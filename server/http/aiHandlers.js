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
  'github-evaluator': content => `你是一位资深技术选型专家。请基于以下 GitHub 项目信息，实时分析并输出严格 JSON（不要 markdown 代码块，不要解释文字），字段如下：\n- scenario: 应用场景（1-2句，具体说明能解决什么问题）\n- audience: 适合谁（目标用户/团队）\n- difficulty: 落地难度（低/中/高 + 一句原因）\n- value: 价值判断（值得跟进的程度 + 一句理由）\n\n项目信息：\n${content}\n\n只输出 JSON，格式：{"scenario":"","audience":"","difficulty":"","value":""}`,
};

function clientKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function enforceRateLimit(req, isAgentLoop = false) {
  const now = Date.now();
  const key = clientKey(req);
  // agent loop 单轮会触发多次 LLM 调用，放宽到 5min/100 次
  const limit = isAgentLoop ? 100 : 30;
  const active = (windows.get(key) || []).filter(timestamp => now - timestamp < 5 * 60_000);
  if (active.length >= limit) throw Object.assign(new Error('AI 请求过于频繁，请稍后再试'), { code: 'RATE_LIMITED', status: 429 });
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
    body.messages.slice(-30).forEach(message => {
      const role = message?.role;
      // chat 模式支持 user / assistant / tool 三种角色
      if (!role) return;
      if (role === 'tool') {
        // tool 消息：必须带 tool_call_id 和 content
        if (!message?.content) return;
        result.push({
          role: 'tool',
          tool_call_id: String(message.tool_call_id || '').slice(0, 200),
          content: cleanText(message.content, 20_000),
        });
        return;
      }
      if (role === 'assistant') {
        // assistant 消息可能带 tool_calls（由前一轮 LLM 决定调用工具）
        const msg = { role: 'assistant' };
        if (message.content) msg.content = cleanText(message.content, 20_000);
        if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
          msg.tool_calls = message.tool_calls.slice(0, 10).map(tc => ({
            id: String(tc.id || '').slice(0, 100),
            type: 'function',
            function: {
              name: String(tc?.function?.name || '').slice(0, 100),
              arguments: String(tc?.function?.arguments || '{}').slice(0, 20_000),
            },
          }));
        }
        if (msg.content || msg.tool_calls) result.push(msg);
        return;
      }
      if (role === 'user' && message?.content) result.push({ role: 'user', content: cleanText(message.content, 20_000) });
    });
    if (content) result.push({ role: 'user', content });
    return result;
  }
  const prompt = ACTION_PROMPTS[action]?.(content) || `请根据以下要求处理内容：\n要求：${action}\n内容：${content}`;
  result.push({ role: 'user', content: prompt });
  return result;
}

/* 流式聊天：向上游发 stream:true，解析 SSE delta 转发给前端。
   前端断开（停止）时通过 req.on('close') 中止上游请求。 */
async function handleAiStreamRequest(req, res, body) {
  const baseUrl = cleanText(body.baseUrl, 2000).replace(/\/+$/, '');
  const model = cleanText(body.model, 200);
  if (!baseUrl || !model) {
    return sendJsonResponse(res, 400, { ok: false, error: 'baseUrl 和 model 不能为空', errorCode: 'INVALID_AI_CONFIG' });
  }
  const apiUrl = /\/v[1-4]$/.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = cleanText(body.apiKey, 4000);
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const requestedMaxTokens = Number(body.max_tokens);
  const maxTokens = Number.isFinite(requestedMaxTokens) && requestedMaxTokens > 0 && requestedMaxTokens <= 8000
    ? Math.floor(requestedMaxTokens)
    : 4000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  // 前端关闭连接时中止上游
  const onClose = () => controller.abort();
  req.on('close', onClose);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let upstream;
  try {
    upstream = await safeExternalFetch(apiUrl, {
      allowPrivate: allowPrivateAiNetwork(), method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify({ model, messages: buildMessages(body), max_tokens: maxTokens, temperature: 0.7, stream: true }),
    });
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      res.write(`data: ${JSON.stringify({ ok: false, error: `模型服务返回 ${upstream.status}${errText ? ': ' + errText.slice(0, 200) : ''}`, errorCode: 'UPSTREAM_AI_ERROR' })}\n\n`);
      return res.end();
    }
  } catch (err) {
    const isAbort = err?.name === 'AbortError';
    const msg = isAbort ? '模型服务请求超时或已停止' : (err?.message || 'AI 网关请求失败');
    res.write(`data: ${JSON.stringify({ ok: false, error: msg, errorCode: isAbort ? 'UPSTREAM_TIMEOUT' : 'AI_GATEWAY_ERROR' })}\n\n`);
    return res.end();
  } finally {
    clearTimeout(timeout);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') { res.write('data: [DONE]\n\n'); return res.end(); }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) res.write(`data: ${JSON.stringify({ ok: true, delta })}\n\n`);
        } catch { /* 跳过不完整的 JSON 行 */ }
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (err?.name !== 'AbortError') {
      res.write(`data: ${JSON.stringify({ ok: false, error: err?.message || '流式读取失败', errorCode: 'AI_GATEWAY_ERROR' })}\n\n`);
    }
    res.end();
  } finally {
    clearTimeout(timeout);
    req.off('close', onClose);
  }
}

export async function handleAiGenerateRequest(req, res) {
  if (String(req.method).toUpperCase() !== 'POST') {
    return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
  }
  let timeout;
  try {
    const body = await readJsonBody(req);
    // agent 模式：客户端传 tools 数组时，标识为 agent loop 调用，放宽限速
    const isAgentLoop = Array.isArray(body.tools) && body.tools.length > 0;
    enforceRateLimit(req, isAgentLoop);
    // 流式聊天走独立处理，返回 SSE
    if (body.stream === true) {
      return handleAiStreamRequest(req, res, body);
    }
    const baseUrl = cleanText(body.baseUrl, 2000).replace(/\/+$/, '');
    const model = cleanText(body.model, 200);
    if (!baseUrl || !model) throw Object.assign(new Error('baseUrl 和 model 不能为空'), { code: 'INVALID_AI_CONFIG', status: 400 });
    const apiUrl = /\/v[1-4]$/.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    const apiKey = cleanText(body.apiKey, 4000);
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const controller = new AbortController();
    // agent loop 可能多轮调用，给个更长超时
    timeout = setTimeout(() => controller.abort(), isAgentLoop ? 120_000 : 90_000);
    const requestedMaxTokens = Number(body.max_tokens);
    const maxTokens = Number.isFinite(requestedMaxTokens) && requestedMaxTokens > 0 && requestedMaxTokens <= 8000
      ? Math.floor(requestedMaxTokens)
      : 4000;
    // 构造上游请求体：基础字段 + agent 模式下的 tools / tool_choice
    const upstreamBody = { model, messages: buildMessages(body), max_tokens: maxTokens, temperature: 0.7 };
    if (isAgentLoop) {
      // 透传 tools（限制最多 20 个，每个 schema 最大 8KB）
      upstreamBody.tools = body.tools.slice(0, 20).map(t => {
        const fn = t?.function || {};
        return {
          type: 'function',
          function: {
            name: String(fn.name || '').slice(0, 100),
            description: String(fn.description || '').slice(0, 2000),
            parameters: fn.parameters && typeof fn.parameters === 'object' ? fn.parameters : { type: 'object', properties: {} },
          },
        };
      });
      // tool_choice: 客户端可指定 'auto' / 'none' / {type:'function',function:{name}}
      if (body.tool_choice === 'none' || body.tool_choice === 'auto') {
        upstreamBody.tool_choice = body.tool_choice;
      } else if (body.tool_choice && typeof body.tool_choice === 'object') {
        upstreamBody.tool_choice = { type: 'function', function: { name: String(body.tool_choice.function?.name || '').slice(0, 100) } };
      } else {
        upstreamBody.tool_choice = 'auto';
      }
    }
    const response = await safeExternalFetch(apiUrl, {
      allowPrivate: allowPrivateAiNetwork(), method: 'POST', headers, signal: controller.signal,
      body: JSON.stringify(upstreamBody),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw Object.assign(new Error(`模型服务返回 ${response.status}`), { code: 'UPSTREAM_AI_ERROR', status: 502 });
    }
    const data = await response.json();
    const choice = data.choices?.[0] || {};
    const message = choice.message || {};
    // agent 模式下返回 tool_calls 字段，供前端 agent loop 继续执行
    const result = { ok: true, content: message.content || '' };
    if (isAgentLoop && Array.isArray(message.tool_calls) && message.tool_calls.length) {
      result.tool_calls = message.tool_calls.map(tc => ({
        id: String(tc.id || '').slice(0, 100),
        type: 'function',
        function: {
          name: String(tc?.function?.name || '').slice(0, 100),
          arguments: String(tc?.function?.arguments || '{}'),
        },
      }));
      result.finish_reason = choice.finish_reason || 'tool_calls';
    } else {
      result.finish_reason = choice.finish_reason || 'stop';
    }
    return sendJsonResponse(res, 200, result);
  } catch (error) {
    return sendAiError(res, error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
