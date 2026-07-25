import { CATEGORIES, MODES, DEFAULT_SOURCES, SOURCE_GRADES, PAGE_SIZE } from './config/constants.js';
import { getSourceGrade, getSourceGradeInfo } from './config/sourceGrades.js';
import { sendJson, parseBody, isSafeUrl } from './utils/httpUtils.js';
import { handleAuthRequest } from '../http/authHandlers.js';
import { handleCommunityRequest } from '../http/communityHandlers.js';
import { handleCreativeRequest } from '../http/creativeHandlers.js';
import { handleProfileRequest } from '../http/profileHandlers.js';
import { handleAiGenerateRequest } from '../http/aiHandlers.js';
import { handleFetchPageRequest } from '../http/fetchPageHandler.js';
import { handleIntelligenceRequest } from '../http/intelligenceHandlers.js';
import { getNews } from './services/newsService.js';
import { getTrending, getGithubTrending } from './services/trendingService.js';
import { discoverSourceCandidates, validateFeedUrl } from './services/sourceDiscovery.js';
import { getDashboard, getRealtime, getKline, getTimeline, getSectors, searchStock, resolveSecid } from './services/stockService.js';

export function newsPlugin() {
  return {
    name: 'global-tech-news-api',
    configureServer(server) {
      const handleApiRequest = async (req, res, next) => {
        const requestUrl = new URL(req.url, 'http://localhost');

        if (requestUrl.pathname === '/api/meta') {
          return sendJson(res, {
            categories: CATEGORIES,
            modes: MODES,
            sources: DEFAULT_SOURCES.map(({ name, url, region, defaultCategory }) => {
              const gradeInfo = getSourceGradeInfo(name);
              return {
                name,
                url,
                region,
                defaultCategory,
                grade: getSourceGrade(name),
                gradeInfo: {
                  label: gradeInfo.label,
                  description: gradeInfo.description,
                  color: gradeInfo.color,
                  icon: gradeInfo.icon,
                  weight: gradeInfo.weight
                }
              };
            }),
            sourceGrades: SOURCE_GRADES
          });
        }

        // 认证、社区使用同一组 service/handler，避免开发环境和生产函数行为分叉。
        if (requestUrl.pathname.startsWith('/api/auth/')) {
          const action = requestUrl.pathname.slice('/api/auth/'.length);
          return handleAuthRequest(req, res, { action });
        }
        if (requestUrl.pathname === '/api/user/profile' || requestUrl.pathname === '/api/user/interests') {
          const action = requestUrl.pathname.endsWith('/interests') ? 'interests' : 'profile';
          return handleAuthRequest(req, res, { action });
        }
        if (requestUrl.pathname.startsWith('/api/community/')) {
          const path = requestUrl.pathname.slice('/api/community/'.length).split('/');
          return handleCommunityRequest(req, res, { path });
        }
        if (requestUrl.pathname.startsWith('/api/creative/')) {
          const path = requestUrl.pathname.slice('/api/creative/'.length).split('/');
          return handleCreativeRequest(req, res, { path });
        }
        if (requestUrl.pathname === '/api/profile/state') {
          return handleProfileRequest(req, res, { action: 'state' });
        }
        if (requestUrl.pathname === '/api/ai-generate') {
          return handleAiGenerateRequest(req, res);
        }
        if (requestUrl.pathname === '/api/fetch-page') {
          return handleFetchPageRequest(req, res);
        }

        if (requestUrl.pathname === '/api/intelligence' || requestUrl.pathname.startsWith('/api/intelligence/')) {
          const path = requestUrl.pathname === '/api/intelligence'
            ? []
            : requestUrl.pathname.slice('/api/intelligence/'.length).split('/');
          return handleIntelligenceRequest(req, res, { path });
        }

        if (requestUrl.pathname === '/api/news') {
          const blocked = requestUrl.searchParams
            .get('blocked')
            ?.split(',')
            .map(word => word.trim().toLowerCase())
            .filter(Boolean) ?? [];

          const customParams = requestUrl.searchParams.getAll('custom');
          let customSources = [];
          try {
            customSources = customParams.map(p => JSON.parse(p)).filter(s => s.name && s.url);
          } catch {}

          const disabledSourcesParam = requestUrl.searchParams.get('disabledSources') || '';
          const disabledSources = disabledSourcesParam
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

          const page = parseInt(requestUrl.searchParams.get('page') || '0', 10);
          const pageSize = parseInt(requestUrl.searchParams.get('pageSize') || String(PAGE_SIZE), 10);
          const search = requestUrl.searchParams.get('search') || '';
          const interestsParam = requestUrl.searchParams.get('interests') || '';
          const interests = interestsParam ? interestsParam.split(',').filter(Boolean) : [];
          const payload = await getNews(blocked, customSources, page, pageSize, search, disabledSources, interests);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/trending') {
          const platform = requestUrl.searchParams.get('platform') || 'all';
          const page = parseInt(requestUrl.searchParams.get('page') || '0', 10);
          const pageSize = parseInt(requestUrl.searchParams.get('pageSize') || '60', 10);
          const payload = await getTrending(platform, page, pageSize);
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/github-trending') {
          const lang = requestUrl.searchParams.get('lang') || '';
          const since = requestUrl.searchParams.get('since') || 'weekly';
          const payload = await getGithubTrending(lang, since);
          return sendJson(res, payload);
        }

        // ===== 股市动向 API =====
        if (requestUrl.pathname === '/api/stock/dashboard') {
          const payload = await getDashboard();
          return sendJson(res, payload);
        }

        if (requestUrl.pathname === '/api/stock/realtime') {
          const code = requestUrl.searchParams.get('code') || '';
          const secid = resolveSecid(code);
          if (!secid) return sendJson(res, { ok: false, message: '无效的股票代码' }, 400);
          const data = await getRealtime([secid]);
          return sendJson(res, data[0] || { ok: false, message: '未获取到数据' });
        }

        if (requestUrl.pathname === '/api/stock/kline') {
          const code = requestUrl.searchParams.get('code') || '';
          const period = requestUrl.searchParams.get('period') || '101';
          const adjust = requestUrl.searchParams.get('adjust') || '1';
          const count = parseInt(requestUrl.searchParams.get('count') || '60', 10);
          const secid = resolveSecid(code);
          if (!secid) return sendJson(res, { ok: false, message: '无效的股票代码' }, 400);
          if (!['0', '1', '2'].includes(adjust)) return sendJson(res, { ok: false, message: '无效的复权参数' }, 400);
          const data = await getKline(secid, { period, count, adjust });
          return sendJson(res, data || { ok: false, message: '未获取到K线数据' });
        }

        if (requestUrl.pathname === '/api/stock/search') {
          const keyword = requestUrl.searchParams.get('keyword') || '';
          if (!keyword) return sendJson(res, []);
          const data = await searchStock(keyword);
          return sendJson(res, data);
        }

        if (requestUrl.pathname === '/api/stock/timeline') {
          const code = requestUrl.searchParams.get('code') || '';
          const secid = resolveSecid(code);
          if (!secid) return sendJson(res, { ok: false, message: '无效的股票代码' }, 400);
          const data = await getTimeline(secid);
          return sendJson(res, data || { ok: false, message: '未获取到分时数据' });
        }

        if (requestUrl.pathname === '/api/stock/sectors') {
          const type = requestUrl.searchParams.get('type') === 'concept' ? 'concept' : 'industry';
          const data = await getSectors(type);
          return sendJson(res, data);
        }
        // ===== 股市动向 API END =====

        if (requestUrl.pathname === '/api/verify-source') {
          const url = requestUrl.searchParams.get('url') || '';
          if (!url) return sendJson(res, { ok: false, message: 'URL is required' }, 400);
          if (!isSafeUrl(url)) return sendJson(res, { ok: false, message: 'URL points to a blocked destination' }, 403);
          const result = await validateFeedUrl(url);
          return sendJson(res, result, result.ok ? 200 : 200);
        }

        if (requestUrl.pathname === '/api/discover-source') {
          const url = requestUrl.searchParams.get('url') || '';
          if (!url) return sendJson(res, { ok: false, message: 'URL is required', candidates: [] }, 400);
          const result = await discoverSourceCandidates(url);
          return sendJson(res, result, result.ok ? 200 : 200);
        }

        if (requestUrl.pathname === '/api/llm-models') {
          const baseUrl = requestUrl.searchParams.get('baseUrl') || '';
          const apiKey = requestUrl.searchParams.get('apiKey') || '';
          if (!baseUrl) return sendJson(res, { ok: false, message: 'baseUrl is required' }, 400);
          if (!isSafeUrl(baseUrl)) return sendJson(res, { ok: false, message: 'baseUrl points to a blocked destination' }, 403);
          try {
            const apiUrl = baseUrl.replace(/\/+$/, '') + '/v1/models';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(apiUrl, { headers, signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              return sendJson(res, { ok: false, message: `API responded ${response.status}: ${errText.slice(0, 200)}`, status: response.status });
            }
            const data = await response.json();
            const models = (data.data || []).map(m => ({ id: m.id, name: m.id, owned_by: m.owned_by || '' }));
            return sendJson(res, { ok: true, models });
          } catch (e) {
            return sendJson(res, { ok: false, message: e.message });
          }
        }

        if (requestUrl.pathname === '/api/llm-test') {
          const body = await parseBody(req);
          const { baseUrl = '', apiKey = '', model = '', prompt = 'Hello' } = body;
          if (!baseUrl || !model) return sendJson(res, { ok: false, message: 'baseUrl and model are required' }, 400);
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
              ? cleanBaseUrl + '/chat/completions'
              : cleanBaseUrl + '/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 50 }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              return sendJson(res, { ok: false, message: `API responded ${response.status}: ${errText.slice(0, 200)}` });
            }
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '';
            return sendJson(res, { ok: true, reply, model });
          } catch (e) {
            return sendJson(res, { ok: false, message: e.message });
          }
        }

if (requestUrl.pathname === '/api/ai-insights') {
          const body = await parseBody(req);
          const { baseUrl = '', apiKey = '', model = '', items = [] } = body;
          console.log('[AI Insights] Request:', { baseUrl, model, itemsCount: items.length, hasKey: !!apiKey });
          if (!baseUrl || !model) return sendJson(res, { error: 'baseUrl and model are required' }, 400);
          if (items.length === 0) return sendJson(res, { error: 'items required' }, 400);
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, '');
            const apiUrl = cleanBaseUrl.endsWith('/v1') || cleanBaseUrl.endsWith('/v2') || cleanBaseUrl.endsWith('/v3') || cleanBaseUrl.endsWith('/v4')
              ? cleanBaseUrl + '/chat/completions'
              : cleanBaseUrl + '/v1/chat/completions';
            const headers = { 'Content-Type': 'application/json' };
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            console.log('[AI Insights] Calling:', apiUrl, 'model:', model);
            const prompt = `你是一个科技趋势分析师。请分析以下${items.length}条技术资讯，输出**简洁**的纯 JSON（不要 markdown 代码块）：

{"trends":["趋势 1","趋势 2","趋势 3"],"correlations":["关联 1","关联 2"],"signals":["信号 1","信号 2","信号 3"]}

资讯列表：
${items.map((i, idx) => {
  const summaryLine = i.summary ? ` | 摘要: ${i.summary}` : '';
  const tagsLine = i.tags ? ` | 标签: ${i.tags}` : '';
  return `${idx + 1}. [${i.category || '未分类'}] ${i.title} - ${i.source || '未知'}${summaryLine}${tagsLine}`;
}).join('\n')}

要求：
- trends：基于当前资讯内容，提炼 3 条最显著的技术趋势
- correlations：发现不同领域/赛道之间的关联或共同主题
- signals：指出值得关注的早期信号或潜在变化
- 每条**不超过 30 字**，简洁明了
- 只输出 JSON，不要其他文字`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
              }),
              signal: controller.signal
            });
            clearTimeout(timeout);
            console.log('[AI Insights] API response status:', response.status);
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              console.error('[AI Insights] API error:', response.status, errText);
              return sendJson(res, { error: `API responded ${response.status}: ${errText.slice(0, 200)}` });
            }
            const data = await response.json();
            console.log('[AI Insights] API response data:', JSON.stringify(data, null, 2).slice(0, 500));
            const content = data.choices?.[0]?.message?.content || '';
            console.log('[AI Insights] Raw response:', content.slice(0, 500));
            try {
              let cleaned = content.trim();
              cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
              const start = cleaned.indexOf('{');
              let end = cleaned.lastIndexOf('}');

              if (start === -1) {
                console.log('[AI Insights] No opening brace found');
                throw new Error('AI 响应缺少 JSON 开始标记');
              }

              if (end === -1 || end <= start) {
                console.log('[AI Insights] No closing brace, trying to repair...');
                end = cleaned.length - 1;
                cleaned = cleaned + ']}]}'.repeat(3);
              }

              const jsonStr = cleaned.slice(start, end + 1);
              console.log('[AI Insights] Extracted JSON:', jsonStr.slice(0, 300));

              try {
                const insights = JSON.parse(jsonStr);
                return sendJson(res, insights);
              } catch (parseErr) {
                console.log('[AI Insights] JSON parse failed, content may be truncated');
                throw new Error(`JSON 解析失败，响应可能被截断：${parseErr.message}`);
              }
            } catch (e) {
              console.error('[AI Insights] Parse error:', e.message, 'Content:', content);
              return sendJson(res, { error: `AI 返回格式错误：${e.message}`, raw: content.slice(0, 300) });
            }
          } catch (e) {
              console.error('[AI Insights] Outer error:', e);
              return sendJson(res, { error: e.message });
            }
          }

        if (requestUrl.pathname.startsWith('/api/ai/') || requestUrl.pathname.startsWith('/api/translate') || requestUrl.pathname.startsWith('/api/subscriptions') || requestUrl.pathname.startsWith('/api/bookmarks')) {
          return sendJson(res, { ok: false, message: 'Reserved extension endpoint.' }, 501);
        }

        return next();
      };

      server.middlewares.use(async (req, res, next) => {
        try {
          return await handleApiRequest(req, res, next);
        } catch (error) {
          console.error('[newsPlugin] API middleware error:', error);
          if (!res.headersSent) {
            return sendJson(res, {
              ok: false,
              error: error?.message || 'Internal API error',
              path: req.url
            }, 500);
          }
          res.end();
        }
      });
    }
  };
}

export function createNewsApiMiddleware() {
  let middleware;
  newsPlugin().configureServer({
    middlewares: {
      use(handler) { middleware = handler; },
    },
  });
  if (!middleware) throw new Error('News API middleware was not initialized');
  return middleware;
}
