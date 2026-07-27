import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeAgentTool,
  AGENT_TOOL_SCHEMAS,
  getToolMetaByName,
} from '../agentTools.js';
import { grantSessionApproval, clearSessionGrants } from '../sandbox.js';

// execute_command 工具测试：浏览器环境无法直接执行 shell，但可路由到现有工具能力。
// 这里测试其命令解析、参数处理、错误处理与子命令分发。

describe('execute_command 工具（方案 C Phase 4）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // execute_command 标记 requiresApproval，传 sessionId 会触发审批闸门挂起。
    // 测试用例的 sessionId 形如 test-session-N，统一预授权避免阻塞。
    for (let i = 1; i <= 6; i++) {
      grantSessionApproval(`test-session-${i}`, 'execute_command');
    }
  });

  afterEach(() => {
    for (let i = 1; i <= 6; i++) {
      clearSessionGrants(`test-session-${i}`);
    }
  });

  it('工具已注册到 toolRegistry', () => {
    const names = AGENT_TOOL_SCHEMAS.map(s => s.function.name);
    expect(names).toContain('execute_command');
    const meta = getToolMetaByName('execute_command');
    expect(meta.label).toBe('执行命令');
    expect(meta.category).toBe('shell');
  });

  it('空 command 返回错误提示', async () => {
    const r = await executeAgentTool('execute_command', { command: '' }, {});
    expect(r).toContain('错误');
    expect(r).toContain('help');
  });

  it('help 子命令显示帮助文本', async () => {
    const r = await executeAgentTool('execute_command', { command: 'help' }, {});
    expect(r).toContain('news <keyword>');
    expect(r).toContain('fetch <url>');
    expect(r).toContain('stock <code>');
    expect(r).toContain('plan');
    expect(r).toContain('var <key>');
    expect(r).toContain('bb <key>');
    expect(r).toContain('tools');
  });

  it('? 别名也能进入 help', async () => {
    const r = await executeAgentTool('execute_command', { command: '?' }, {});
    expect(r).toContain('news <keyword>');
  });

  it('未知命令返回未知提示 + help', async () => {
    const r = await executeAgentTool('execute_command', { command: 'frobnicate foo' }, {});
    expect(r).toContain('未知命令');
    expect(r).toContain('frobnicate');
    expect(r).toContain('news <keyword>');
  });

  it('stock 子命令路由到 get_stock_quote（带 fetch mock）', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true, json: async () => ({
        ok: true,
        realtime: { name: '贵州茅台', code: 'sh600519', price: 1700, change: 10, changePct: 0.6 }
      })
    }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await executeAgentTool('execute_command', { command: 'stock 600519' }, {});
    expect(r).toContain('贵州茅台');
    expect(r).toContain('sh600519');
    expect(r).toContain('1700');
    // 调用 URL 包含归一化后的 sh600519
    expect(fetchMock.mock.calls[0][0]).toContain('sh600519');
  });

  it('stock 缺少参数时返回 usage', async () => {
    const r = await executeAgentTool('execute_command', { command: 'stock' }, {});
    expect(r).toContain('用法');
    expect(r).toContain('stock <code>');
  });

  it('news 子命令路由到 /api/news', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true, json: async () => ({
        ok: true, items: [{ title: 'OpenAI 发布新模型', source: 'TechCrunch', summary: 'summary', publishedAt: '2026-07-27' }]
      })
    }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await executeAgentTool('execute_command', { command: 'news OpenAI' }, {});
    expect(r).toContain('找到 1 条相关资讯');
    expect(r).toContain('OpenAI 发布新模型');
  });

  it('write 子命令支持引号包裹的内容', async () => {
    // 不实际写文件，只验证路由正确（无 rootHandle 时返回友好错误）
    const r = await executeAgentTool('execute_command', {
      command: 'write notes.md "今天的关键发现"',
    }, { rootHandle: null });
    expect(r).toContain('未连接工作空间');
  });

  it('write 缺少 content 时返回 usage', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'write notes.md',
    }, {});
    expect(r).toContain('用法');
    expect(r).toContain('write <path> <content>');
  });

  it('plan 子命令：未关联会话时报错', async () => {
    const r = await executeAgentTool('execute_command', { command: 'plan' }, {});
    expect(r).toContain('未关联会话');
  });

  it('plan.add 路由到 add_task 工具', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'plan.add 调研 OpenAI 新模型',
    }, { sessionId: 'test-session-1' });
    expect(r).toContain('已添加任务');
    expect(r).toContain('调研 OpenAI 新模型');
  });

  it('plan.set 缺少 status 时返回 usage', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'plan.set t1',
    }, { sessionId: 'test-session-2' });
    expect(r).toContain('用法');
    expect(r).toContain('plan.set <taskId> <status>');
  });

  it('var 子命令：读取已设置的变量', async () => {
    // 先写
    await executeAgentTool('execute_command', {
      command: 'var topic "OpenAI 发布会"',
    }, { sessionId: 'test-session-3' });
    // 再读
    const r = await executeAgentTool('execute_command', {
      command: 'var topic',
    }, { sessionId: 'test-session-3' });
    expect(r).toContain('topic = ');
    expect(r).toContain('OpenAI 发布会');
  });

  it('var 子命令：JSON value 被正确解析', async () => {
    await executeAgentTool('execute_command', {
      command: 'var list [1, 2, 3]',
    }, { sessionId: 'test-session-4' });
    const r = await executeAgentTool('execute_command', {
      command: 'var list',
    }, { sessionId: 'test-session-4' });
    expect(r).toContain('[1,2,3]');
  });

  it('bb 子命令：写入并读取黑板', async () => {
    await executeAgentTool('execute_command', {
      command: 'bb summary "今日发现"',
    }, { sessionId: 'test-session-5' });
    const r = await executeAgentTool('execute_command', {
      command: 'bb summary',
    }, { sessionId: 'test-session-5' });
    expect(r).toContain('summary = ');
    expect(r).toContain('今日发现');
  });

  it('tools 子命令：列出 agent 工具白名单', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'tools',
    }, { agentTools: ['search_news', 'get_stock_quote', 'execute_command'] });
    expect(r).toContain('search_news');
    expect(r).toContain('get_stock_quote');
    expect(r).toContain('execute_command');
    expect(r).toContain('3 个');
  });

  it('tools 子命令：空白名单返回提示', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'tools',
    }, { agentTools: [] });
    expect(r).toContain('未配置工具白名单');
  });

  it('tokenizer：单引号包裹参数', async () => {
    const r = await executeAgentTool('execute_command', {
      command: "var key 'value with spaces'",
    }, { sessionId: 'test-session-6' });
    expect(r).toContain('已设置变量');
    // 读取验证
    const r2 = await executeAgentTool('execute_command', {
      command: 'var key',
    }, { sessionId: 'test-session-6' });
    expect(r2).toContain('value with spaces');
  });

  it('fetch 子命令：URL 校验', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'fetch not-a-url',
    }, {});
    expect(r).toContain('错误');
    expect(r).toContain('http');
  });

  it('kline 子命令：缺少 code 返回 usage', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'kline',
    }, {});
    expect(r).toContain('用法');
    expect(r).toContain('kline <code>');
  });

  it('read 子命令：缺少 path 返回 usage', async () => {
    const r = await executeAgentTool('execute_command', {
      command: 'read',
    }, {});
    expect(r).toContain('用法');
    expect(r).toContain('read <path>');
  });
});

describe('web_search 工具（联网搜索）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('工具已注册到 toolRegistry', () => {
    const names = AGENT_TOOL_SCHEMAS.map(s => s.function.name);
    expect(names).toContain('web_search');
    const meta = getToolMetaByName('web_search');
    expect(meta.label).toBe('联网搜索');
    expect(meta.category).toBe('web');
  });

  it('空 query 返回错误', async () => {
    const r = await executeAgentTool('web_search', { query: '' }, {});
    expect(r).toContain('错误');
    expect(r).toContain('query');
  });

  it('Tavily 优先模式：返回结果包含标题/链接/摘要', async () => {
    const mockData = {
      ok: true,
      provider: 'tavily',
      results: [
        { title: 'React 19 Release', url: 'https://react.dev/blog/19', snippet: 'React 19 is now stable.', score: 0.95 },
        { title: 'Vite 7 Notes', url: 'https://vite.dev/blog/7', snippet: 'Vite 7 improvements.' },
      ],
      meta: { query: 'react 19', count: 2, latencyMs: 320 },
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => mockData,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await executeAgentTool('web_search', { query: 'react 19', max_results: 3 }, { tavilyKey: 'tvly-test' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/web-search');
    expect(init.method).toBe('POST');
    // 请求头应携带 Tavily Key
    expect(init.headers['X-Tavily-Key']).toBe('tvly-test');
    // 请求体应包含 query
    const body = JSON.parse(init.body);
    expect(body.query).toBe('react 19');
    expect(body.max_results).toBe(3);
    // 响应应包含 Tavily 标签和结果
    expect(r).toContain('Tavily');
    expect(r).toContain('React 19 Release');
    expect(r).toContain('https://react.dev/blog/19');
    expect(r).toContain('React 19 is now stable.');
    // Tavily 返回 score 时应展示相关性百分比
    expect(r).toContain('95%');
  });

  it('DuckDuckGo 兜底模式：返回结果格式一致', async () => {
    const mockData = {
      ok: true,
      provider: 'duckduckgo',
      results: [
        { title: 'Tavily Docs', url: 'https://docs.tavily.com', snippet: 'Tavily API documentation.' },
      ],
      meta: { query: 'tavily', count: 1, latencyMs: 800, tavilyConfigured: false },
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => mockData,
    }));
    vi.stubGlobal('fetch', fetchMock);

    // 未传 tavilyKey 时不应在请求头里加 X-Tavily-Key
    const r = await executeAgentTool('web_search', { query: 'tavily' }, {});

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Tavily-Key']).toBeUndefined();
    expect(r).toContain('DuckDuckGo');
    expect(r).toContain('Tavily Docs');
  });

  it('空结果返回未找到提示', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, provider: 'duckduckgo', results: [], meta: {} }),
    }));
    const r = await executeAgentTool('web_search', { query: 'zzz_nonexistent_xxx' }, {});
    expect(r).toContain('未找到');
  });

  it('HTTP 错误返回错误码', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 500 }));
    const r = await executeAgentTool('web_search', { query: 'test' }, {});
    expect(r).toContain('错误');
    expect(r).toContain('500');
  });

  it('后端返回 ok=false 时透传错误信息', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: { message: '上游服务降级' } }),
    }));
    const r = await executeAgentTool('web_search', { query: 'test' }, {});
    expect(r).toContain('上游服务降级');
  });

  it('支持 keyword 别名（向后兼容 search_news 调用习惯）', async () => {
    const mockData = { ok: true, provider: 'duckduckgo', results: [{ title: 'A', url: 'https://a.com', snippet: 's' }], meta: {} };
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => mockData }));
    vi.stubGlobal('fetch', fetchMock);

    const r = await executeAgentTool('web_search', { keyword: 'ai news' }, {});
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toBe('ai news');
    expect(r).toContain('ai news');
  });

  it('execute_command 的 search 子命令也能调用 web_search', async () => {
    const mockData = { ok: true, provider: 'tavily', results: [{ title: 'T1', url: 'https://t1.com', snippet: 's1' }], meta: {} };
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => mockData }));

    const r = await executeAgentTool('execute_command', {
      command: 'search "openai gpt 5"',
    }, {});
    expect(r).toContain('openai gpt 5');
    expect(r).toContain('T1');
  });
});
