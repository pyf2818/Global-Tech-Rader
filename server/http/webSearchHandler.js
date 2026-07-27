import { routeError, sendJsonResponse, readJsonBody } from './httpUtils.js';
import { assertSafeExternalUrl } from '../security/urlSafety.js';

/**
 * Web Search Handler - 联网搜索接口
 *
 * 策略：Tavily 优先（如配置了 API Key），自动 fallback 到 DuckDuckGo（完全免费、无需注册）。
 * Tavily 专为 AI Agent 设计，返回结构化 JSON；DuckDuckGo 解析 HTML lite 页面。
 *
 * API Key 来源（优先级）：
 *   1. 环境变量 TAVILY_API_KEY（推荐，运维统一配置）
 *   2. 请求头 X-Tavily-Key（前端用户在设置面板填入）
 *
 * 统一返回格式：
 *   { ok: true, provider: 'tavily'|'duckduckgo', results: [{title, url, snippet, score?}], meta: {query, count, latencyMs} }
 */

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const DUCKDUCKGO_ENDPOINT = 'https://lite.duckduckgo.com/lite/';
const DEFAULT_MAX_RESULTS = 8;
const MAX_RESULTS_LIMIT = 20;
const REQUEST_TIMEOUT_MS = 12_000;

function resolveTavilyKey(req) {
  const fromHeader = req.headers['x-tavily-key'];
  if (fromHeader && typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim();
  }
  const fromEnv = process.env.TAVILY_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  return '';
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function callTavily(query, maxResults, apiKey) {
  const body = JSON.stringify({
    api_key: apiKey,
    query,
    max_results: maxResults,
    search_depth: 'basic',
    include_answer: false,
    include_raw_content: false,
  });
  const { signal, clear } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body,
      signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw Object.assign(new Error(`Tavily 返回 ${response.status}：${text.slice(0, 200)}`), {
        code: 'TAVILY_UPSTREAM_ERROR', status: 502,
      });
    }
    const data = await response.json();
    const results = Array.isArray(data?.results)
      ? data.results.slice(0, maxResults).map(r => ({
          title: String(r.title || '').trim(),
          url: String(r.url || '').trim(),
          snippet: String(r.content || '').trim(),
          score: Number.isFinite(Number(r.score)) ? Number(r.score) : undefined,
        })).filter(r => r.title || r.url || r.snippet)
      : [];
    return { provider: 'tavily', results };
  } finally {
    clear();
  }
}

/**
 * 解析 DuckDuckGo lite HTML 页面，提取搜索结果
 * lite 页面结构：<a class="result-link" href="//duckduckgo.com/l/?uddg=ENCODED_URL">标题</a>
 * 然后 <td class="result-snippet">摘要文本</td>
 */
function parseDuckDuckGoHtml(html) {
  const results = [];
  // 提取每个 result block：从 result-link 到下一个 result-link 之间的内容
  const linkRegex = /<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let match;
  const links = [];
  while ((match = linkRegex.exec(html)) !== null) {
    links.push({ url: match[1], title: match[2] });
  }

  const snippetRegex = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;
  const snippets = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1]);
  }

  const count = Math.max(links.length, snippets.length);
  for (let i = 0; i < count; i++) {
    const link = links[i];
    const snippet = snippets[i] || '';
    if (!link) continue;
    // DuckDuckGo lite 链接形如 //duckduckgo.com/l/?uddg=ENCODED&rut=...&?ia=web
    let url = link.url || '';
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      try { url = decodeURIComponent(uddgMatch[1]); } catch { /* 保留原值 */ }
    } else if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    const title = stripHtml(link.title || '').trim();
    const snippetText = stripHtml(snippet).trim();
    if (!title && !url && !snippetText) continue;
    results.push({ title, url, snippet: snippetText });
  }
  return results;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function callDuckDuckGo(query, maxResults) {
  await assertSafeExternalUrl(DUCKDUCKGO_ENDPOINT);
  const url = `${DUCKDUCKGO_ENDPOINT}?q=${encodeURIComponent(query)}&kl=cn-zh`;
  const { signal, clear } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal,
    });
    if (!response.ok) {
      throw Object.assign(new Error(`DuckDuckGo 返回 ${response.status}`), {
        code: 'DDG_UPSTREAM_ERROR', status: 502,
      });
    }
    const html = await response.text();
    const results = parseDuckDuckGoHtml(html).slice(0, maxResults);
    return { provider: 'duckduckgo', results };
  } finally {
    clear();
  }
}

export async function handleWebSearchRequest(req, res) {
  const started = Date.now();
  // 支持 GET（query 参数）和 POST（JSON body）
  let query = '';
  let maxResults = DEFAULT_MAX_RESULTS;

  try {
    if (String(req.method).toUpperCase() === 'POST') {
      const body = await readJsonBody(req);
      query = String(body?.query || body?.q || '').trim();
      if (body?.max_results) {
        maxResults = Math.max(1, Math.min(Number(body.max_results) || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT));
      }
    } else if (String(req.method).toUpperCase() === 'GET') {
      const requestUrl = new URL(req.url, 'http://localhost');
      query = String(requestUrl.searchParams.get('query') || requestUrl.searchParams.get('q') || '').trim();
      const mr = requestUrl.searchParams.get('max_results');
      if (mr) maxResults = Math.max(1, Math.min(Number(mr) || DEFAULT_MAX_RESULTS, MAX_RESULTS_LIMIT));
    } else {
      return sendJsonResponse(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: '请求方法不支持' } });
    }

    if (!query) {
      return sendJsonResponse(res, 400, { ok: false, error: { code: 'EMPTY_QUERY', message: '搜索关键词不能为空' } });
    }
    if (query.length > 500) {
      return sendJsonResponse(res, 400, { ok: false, error: { code: 'QUERY_TOO_LONG', message: '搜索关键词过长（>500 字符）' } });
    }

    // 优先尝试 Tavily
    const tavilyKey = resolveTavilyKey(req);
    if (tavilyKey) {
      try {
        const { provider, results } = await callTavily(query, maxResults, tavilyKey);
        if (results.length > 0) {
          return sendJsonResponse(res, 200, {
            ok: true,
            provider,
            results,
            meta: { query, count: results.length, latencyMs: Date.now() - started },
          });
        }
        // Tavily 返回空结果，继续 fallback 到 DDG
      } catch (err) {
        // Tavily 失败（401/429/5xx）→ fallback 到 DDG，记录但不直接返回错误
        console.warn('[webSearch] Tavily 调用失败，降级到 DuckDuckGo：', err.message);
      }
    }

    // 兜底：DuckDuckGo
    const { provider, results } = await callDuckDuckGo(query, maxResults);
    return sendJsonResponse(res, 200, {
      ok: true,
      provider,
      results,
      meta: { query, count: results.length, latencyMs: Date.now() - started, tavilyConfigured: Boolean(tavilyKey) },
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return routeError(res, Object.assign(new Error('搜索请求超时'), { code: 'UPSTREAM_TIMEOUT', status: 504 }));
    }
    return routeError(res, error);
  }
}
