/**
 * agentTools.js - 智能体工具（向后兼容层）
 *
 * 方案 C Phase 1：原本的硬编码工具注册表已迁移到 toolRegistry.js。
 * 本文件继续导出 AGENT_TOOL_SCHEMAS / selectToolSchemas / executeAgentTool
 * 供现有调用方使用，内部委托给 toolRegistry。
 *
 * 同时负责注册 6 个内置工具到 toolRegistry（仅在首次 import 时执行）。
 * 自定义工具的注册、编辑、删除请直接使用 toolRegistry 的 API。
 */

import { readFile, writeFile } from './workspace.js';
import {
  registerTool, selectSchemasByName, executeTool, getToolMeta,
  loadCustomTools, getEnabledSchemas,
} from './toolRegistry.js';
import {
  setPlan, addTask, updateTask, setVariable, writeBlackboard,
  getVariable, readBlackboard, buildSessionContextText,
  setActiveSessionId,
} from './sessionStore.js';
import {
  validateWorkspacePath, isEgressAllowed, getEgressAllowlist,
  hasSessionGrant,
} from './sandbox.js';

/* ============ 内置工具实现 ============ */

/** 股票代码归一化：自动补全 market 前缀。
 * LLM 不必准确记忆 sh/sz/hk 前缀规则，传 "600519" / "600519.SH" / "sh600519" 都能识别。
 * - 6 位数字 + 6/9 开头 → sh 前缀（沪市）
 * - 6 位数字 + 0/3 开头 → sz 前缀（深市）
 * - 已带 sh/sz/hk 前缀或美股字母代码：原样返回
 */
function normalizeStockCode(raw) {
  const code = String(raw || '').trim().toLowerCase();
  if (!code) return '';
  if (/^(sh|sz|hk)/.test(code)) return code;
  if (/^[a-z]{1,6}$/.test(code)) return code.toUpperCase();
  if (/^\d{6}\.(sh|sz)$/.test(code)) return code.replace('.', '');
  if (/^\d{6}$/.test(code)) {
    const first = code.charAt(0);
    if (first === '6' || first === '9') return 'sh' + code;
    if (first === '0' || first === '3') return 'sz' + code;
  }
  if (/^\d{5}$/.test(code)) return 'hk' + code;
  return code;
}

async function toolReadWorkspaceFile(args, ctx) {
  if (!ctx?.rootHandle) {
    return '错误：用户未连接工作空间。请提示用户在左侧"工作空间"tab 选择文件夹后再试。';
  }
  const path = String(args?.path || '').trim();
  const check = validateWorkspacePath(path);
  if (!check.ok) return `错误：${check.error}`;
  const text = await readFile(ctx.rootHandle, check.segments);
  const max = 12000;
  if (text.length > max) {
    return text.slice(0, max) + `\n\n[文件过长，已截断，原长度 ${text.length} 字符]`;
  }
  return text || '(文件为空)';
}

async function toolWriteWorkspaceFile(args, ctx) {
  if (!ctx?.rootHandle) {
    return '错误：用户未连接工作空间。请提示用户在左侧"工作空间"tab 选择文件夹后再试。';
  }
  const path = String(args?.path || '').trim();
  const content = String(args?.content ?? '');
  const check = validateWorkspacePath(path);
  if (!check.ok) return `错误：${check.error}`;
  const segments = check.segments;
  await writeFile(ctx.rootHandle, segments.slice(0, -1), segments[segments.length - 1], content);
  return `已写入文件：${path}（${content.length} 字符）`;
}

async function toolSearchNews(args, ctx) {
  const keyword = String(args?.keyword || '').trim();
  if (!keyword) return '错误：keyword 参数不能为空';
  const pageSize = Math.max(1, Math.min(Number(args?.pageSize) || 8, 20));
  const res = await fetch(`/api/news?search=${encodeURIComponent(keyword)}&pageSize=${pageSize}`);
  if (!res.ok) return `错误：资讯接口返回 ${res.status}`;
  const data = await res.json();
  if (!data?.ok) return `错误：${data?.error || '资讯查询失败'}`;
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return `未找到与 "${keyword}" 相关的资讯`;
  const lines = items.map((item, i) =>
    `${i + 1}. ${item.title}\n   来源：${item.source || '未知'} | ${item.publishedAt ? new Date(item.publishedAt).toLocaleString('zh-CN') : '时间未知'}\n   摘要：${String(item.summary || '').slice(0, 200)}`
  );
  return `找到 ${items.length} 条相关资讯：\n\n${lines.join('\n\n')}`;
}

async function toolFetchPage(args, ctx) {
  const url = String(args?.url || '').trim();
  if (!url) return '错误：url 参数不能为空';
  if (!/^https?:\/\//.test(url)) return '错误：url 必须以 http:// 或 https:// 开头';
  // 沙箱网络出口白名单
  if (!isEgressAllowed(url)) {
    const list = getEgressAllowlist();
    return `错误：URL "${url}" 的域名不在出口白名单中。当前白名单：${list.length ? list.join(', ') : '(空)'}`;
  }
  const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
  if (!res.ok) return `错误：抓取接口返回 ${res.status}`;
  const data = await res.json();
  if (!data?.ok) return `错误：${data?.error || '网页抓取失败'}`;
  const text = String(data.content || '');
  const max = 12000;
  if (text.length > max) {
    return text.slice(0, max) + `\n\n[正文过长，已截断，原长度 ${text.length} 字符]`;
  }
  return text || '(网页正文为空)';
}

/**
 * 联网搜索：Tavily 优先（如配置 Key），自动 fallback 到 DuckDuckGo
 * 返回结构化文本：标题、链接、摘要，便于 LLM 后续引用
 */
async function toolWebSearch(args, ctx) {
  const query = String(args?.query || args?.keyword || '').trim();
  if (!query) return '错误：query 参数不能为空';
  const maxResults = Math.max(1, Math.min(Number(args?.max_results) || 6, 20));
  // 优先从 ctx 取 Tavily Key（用户在设置面板配置），未配置则后端使用环境变量
  const tavilyKey = ctx?.tavilyKey || ctx?.llmConfig?.tavilyKey || '';
  const headers = { 'Content-Type': 'application/json' };
  if (tavilyKey) headers['X-Tavily-Key'] = tavilyKey;
  const res = await fetch('/api/web-search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, max_results: maxResults }),
  });
  if (!res.ok) return `错误：搜索接口返回 ${res.status}`;
  const data = await res.json();
  if (!data?.ok) {
    const errMsg = typeof data?.error === 'string' ? data.error : (data?.error?.message || '搜索失败');
    return `错误：${errMsg}`;
  }
  const items = Array.isArray(data.results) ? data.results : [];
  if (items.length === 0) return `未找到与 "${query}" 相关的网页`;
  const providerLabel = data.provider === 'tavily' ? 'Tavily' : 'DuckDuckGo';
  const lines = items.map((item, i) => {
    const title = item.title || '(无标题)';
    const url = item.url || '';
    const snippet = String(item.snippet || '').slice(0, 280);
    const score = Number.isFinite(Number(item.score)) ? `（相关性 ${Math.round(Number(item.score) * 100)}%）` : '';
    return `${i + 1}. ${title}${score}\n   链接：${url}\n   摘要：${snippet}`;
  });
  return `已通过 ${providerLabel} 联网搜索 "${query}"，找到 ${items.length} 条结果：\n\n${lines.join('\n\n')}`;
}

async function toolGetStockQuote(args, ctx) {
  const rawCode = String(args?.code || '').trim();
  if (!rawCode) return '错误：code 参数不能为空';
  const code = normalizeStockCode(rawCode);
  const res = await fetch(`/api/stock/realtime?code=${encodeURIComponent(code)}`);
  if (!res.ok) return `错误：行情接口返回 ${res.status}`;
  const data = await res.json();
  if (!data?.ok) return `错误：${data?.error || '行情查询失败'}`;
  const q = data.realtime || {};
  const lines = [
    `股票：${q.name || '-'} (${q.code || code})`,
    `现价：${q.price ?? '-'}  涨跌：${q.change ?? '-'} (${q.changePct ?? '-'}%)`,
    `昨收：${q.prevClose ?? '-'}  今开：${q.open ?? '-'}`,
    `最高：${q.high ?? '-'}  最低：${q.low ?? '-'}`,
    `成交量：${q.volume ?? '-'}  成交额：${q.amount ?? '-'}`,
  ];
  if (Array.isArray(q.bids) && q.bids.length) {
    lines.push(`五档买盘：${q.bids.slice(0, 5).map(b => `${b.price}/${b.volume}`).join('  ')}`);
  }
  if (Array.isArray(q.asks) && q.asks.length) {
    lines.push(`五档卖盘：${q.asks.slice(0, 5).map(a => `${a.price}/${a.volume}`).join('  ')}`);
  }
  return lines.join('\n');
}

async function toolGetStockKline(args, ctx) {
  const rawCode = String(args?.code || '').trim();
  if (!rawCode) return '错误：code 参数不能为空';
  const code = normalizeStockCode(rawCode);
  const period = ['101', '102', '103'].includes(args?.period) ? args.period : '101';
  const count = Math.max(1, Math.min(Number(args?.count) || 30, 120));
  const res = await fetch(`/api/stock/kline?code=${encodeURIComponent(code)}&period=${period}&count=${count}`);
  if (!res.ok) return `错误：K 线接口返回 ${res.status}`;
  const data = await res.json();
  if (!data?.ok) return `错误：${data?.error || 'K 线查询失败'}`;
  const klines = Array.isArray(data?.klineData?.klines) ? data.klineData.klines : [];
  if (klines.length === 0) return '未获取到 K 线数据';
  const lines = klines.slice(-count).map(k =>
    `${k.date}  开 ${k.open}  高 ${k.high}  低 ${k.low}  收 ${k.close}  量 ${k.volume || 0}`
  );
  return `最近 ${lines.length} 根 K 线：\n${lines.join('\n')}`;
}

/* ============ 会话状态管理工具（方案 C Phase 3） ============ */

/** 设置执行计划 */
function toolSetPlan(args, ctx) {
  const sessionId = ctx?.sessionId;
  if (!sessionId) return '错误：未关联会话，无法设置执行计划';
  const tasks = Array.isArray(args?.tasks) ? args.tasks : [];
  if (tasks.length === 0) return '错误：tasks 必须为非空数组';
  // 校验任务结构并简化字段
  const sanitized = tasks.map((t, i) => ({
    id: t.id || `t${i + 1}`,
    title: String(t.title || `任务 ${i + 1}`).slice(0, 100),
    status: 'pending',
    deps: Array.isArray(t.deps) ? t.deps : [],
    note: t.note ? String(t.note).slice(0, 200) : '',
    toolName: t.toolName ? String(t.toolName) : '',
  }));
  setPlan(sessionId, sanitized);
  return `已设置执行计划（${sanitized.length} 个任务）：\n${sanitized.map((t, i) => `${i + 1}. ${t.title}`).join('\n')}`;
}

/** 添加单个任务 */
function toolAddTask(args, ctx) {
  const sessionId = ctx?.sessionId;
  if (!sessionId) return '错误：未关联会话';
  const title = String(args?.title || '').trim();
  if (!title) return '错误：title 不能为空';
  const id = addTask(sessionId, {
    title,
    deps: Array.isArray(args?.deps) ? args.deps : [],
    note: args?.note ? String(args.note).slice(0, 200) : '',
    toolName: args?.toolName ? String(args.toolName) : '',
  });
  return `已添加任务：${title}（id=${id}）`;
}

/** 更新任务状态 */
function toolUpdateTask(args, ctx) {
  const sessionId = ctx?.sessionId;
  if (!sessionId) return '错误：未关联会话';
  const taskId = String(args?.taskId || '').trim();
  if (!taskId) return '错误：taskId 不能为空';
  const validStatus = ['pending', 'running', 'done', 'failed', 'skipped'];
  const status = validStatus.includes(args?.status) ? args.status : null;
  if (!status) return `错误：status 必须是 ${validStatus.join('/')} 之一`;
  const ok = updateTask(sessionId, taskId, {
    status,
    result: args?.result ? String(args.result).slice(0, 500) : '',
    note: args?.note ? String(args.note).slice(0, 200) : undefined,
  });
  return ok ? `已更新任务 ${taskId} → ${status}` : `错误：未找到任务 ${taskId}`;
}

/** 设置变量（持久化到会话） */
function toolSetVariable(args, ctx) {
  const sessionId = ctx?.sessionId;
  if (!sessionId) return '错误：未关联会话';
  const key = String(args?.key || '').trim();
  if (!key) return '错误：key 不能为空';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) return '错误：key 必须是合法标识符（字母/数字/下划线，不能以数字开头）';
  // value 支持任意类型（string/number/boolean/array/object）
  setVariable(sessionId, key, args?.value);
  const valStr = typeof args?.value === 'string' ? args.value : JSON.stringify(args?.value);
  return `已设置变量 ${key} = ${String(valStr).slice(0, 100)}`;
}

/** 写黑板（工具产出共享给后续工具） */
function toolWriteBlackboard(args, ctx) {
  const sessionId = ctx?.sessionId;
  if (!sessionId) return '错误：未关联会话';
  const key = String(args?.key || '').trim();
  if (!key) return '错误：key 不能为空';
  writeBlackboard(sessionId, key, args?.value);
  return `已写入黑板 ${key}`;
}

/* ============ 命令执行能力（方案 C Phase 4） ============ */

/**
 * execute_command - 统一的命令入口（类似 Claude Code 的 bash 工具）
 *
 * 浏览器环境无法直接执行 shell，这里通过解析命令字符串路由到现有工具能力，
 * 既提供了 shell 风格的统一入口，又避免了真正的进程执行风险。
 *
 * 支持的子命令：
 *   news <keyword>            搜索资讯
 *   search <query>            联网搜索（Tavily/DuckDuckGo）
 *   fetch <url>               抓取网页正文
 *   stock <code>              查询股票行情
 *   kline <code> [period] [count]  获取 K 线
 *   read <path>               读取工作空间文件
 *   write <path> <content>    写入工作空间文件
 *   plan                      查看当前执行计划
 *   plan.add <title>           追加任务
 *   plan.set <taskId> <status> 更新任务状态
 *   var <key> [value]         查看 / 设置变量
 *   bb <key> [value]          读取 / 写入黑板
 *   tools                     列出可用工具
 *   help                      显示帮助
 *
 * 参数可用引号包裹（支持 "..." / '...'），未识别命令会进入 help。
 */
async function toolExecuteCommand(args, ctx) {
  const raw = String(args?.command || '').trim();
  if (!raw) return '错误：command 不能为空。输入 `help` 查看可用命令。';

  // 简易 shell 风格 tokenizer：支持单/双引号包裹参数
  const tokens = tokenizeCommand(raw);
  const sub = (tokens[0] || '').toLowerCase();
  const rest = tokens.slice(1);

  switch (sub) {
    case 'news': {
      const keyword = rest.join(' ').trim();
      if (!keyword) return '用法：news <keyword>';
      return await toolSearchNews({ keyword, pageSize: 8 }, ctx);
    }
    case 'fetch': {
      const url = rest[0] || '';
      if (!url) return '用法：fetch <url>';
      return await toolFetchPage({ url }, ctx);
    }
    case 'search':
    case 'web': {
      const query = rest.join(' ').trim();
      if (!query) return '用法：search <query>';
      return await toolWebSearch({ query, max_results: 6 }, ctx);
    }
    case 'stock': {
      const code = rest[0] || '';
      if (!code) return '用法：stock <code>';
      return await toolGetStockQuote({ code }, ctx);
    }
    case 'kline': {
      const code = rest[0] || '';
      if (!code) return '用法：kline <code> [period=101] [count=30]';
      const period = rest[1] || '101';
      const count = rest[2] ? Number(rest[2]) : 30;
      return await toolGetStockKline({ code, period, count }, ctx);
    }
    case 'read': {
      const path = rest[0] || '';
      if (!path) return '用法：read <path>';
      return await toolReadWorkspaceFile({ path }, ctx);
    }
    case 'write': {
      const path = rest[0] || '';
      if (!path) return '用法：write <path> <content>';
      // 支持多 token 内容（已去引号）
      const content = rest.slice(1).join(' ');
      if (!content) return '用法：write <path> <content>';
      return await toolWriteWorkspaceFile({ path, content }, ctx);
    }
    case 'plan':
    case 'plan.add':
    case 'plan.set': {
      const sessionId = ctx?.sessionId;
      if (!sessionId) return '错误：未关联会话';
      // 确保会话状态已激活（不会覆盖现有数据）
      try { setActiveSessionId(sessionId); } catch { /* ignore */ }

      // 兼容两种语法：plan add / plan.add
      let action = '';
      let actionArgs = rest;
      if (sub === 'plan.add') { action = 'add'; }
      else if (sub === 'plan.set') { action = 'set'; }
      else if (rest[0] === 'add' || rest[0] === 'set') {
        action = rest[0];
        actionArgs = rest.slice(1);
      }

      // 没有子命令：显示当前计划
      if (!action) {
        return buildPlanText(sessionId);
      }
      if (action === 'add') {
        const title = actionArgs.join(' ').trim();
        if (!title) return '用法：plan.add <title> 或 plan add <title>';
        return toolAddTask({ title }, ctx);
      }
      if (action === 'set') {
        const taskId = actionArgs[0] || '';
        const status = actionArgs[1] || '';
        if (!taskId || !status) return '用法：plan.set <taskId> <status> 或 plan set <taskId> <status>';
        return toolUpdateTask({ taskId, status }, ctx);
      }
      return '用法：plan | plan.add <title> | plan.set <taskId> <status>';
    }
    case 'var': {
      const sessionId = ctx?.sessionId;
      if (!sessionId) return '错误：未关联会话';
      const key = rest[0] || '';
      if (!key) return '用法：var <key> [value]';
      // 只读
      if (rest.length === 1) {
        const val = getVariablesSync(sessionId, key);
        const valStr = typeof val === 'string' ? val : JSON.stringify(val);
        return `${key} = ${String(valStr).slice(0, 200)}`;
      }
      // 写入：value 可以是字符串或 JSON
      const rawVal = rest.slice(1).join(' ');
      let parsed;
      try { parsed = JSON.parse(rawVal); } catch { parsed = rawVal; }
      return toolSetVariable({ key, value: parsed }, ctx);
    }
    case 'bb': {
      const sessionId = ctx?.sessionId;
      if (!sessionId) return '错误：未关联会话';
      const key = rest[0] || '';
      if (!key) return '用法：bb <key> [value]';
      if (rest.length === 1) {
        const val = getBlackboardValue(sessionId, key);
        const valStr = typeof val === 'string' ? val : JSON.stringify(val);
        return `${key} = ${String(valStr).slice(0, 200)}`;
      }
      const rawVal = rest.slice(1).join(' ');
      let parsed;
      try { parsed = JSON.parse(rawVal); } catch { parsed = rawVal; }
      return toolWriteBlackboard({ key, value: parsed }, ctx);
    }
    case 'tools': {
      return listAvailableTools(ctx);
    }
    /* ====== 沙箱子命令（方案 C Phase 5）====== */
    case 'ls':
    case 'dir': {
      const path = rest[0] || '.';
      return await sandboxLs(ctx, path);
    }
    case 'tree': {
      const path = rest[0] || '.';
      const depth = rest[1] ? Math.max(1, Math.min(Number(rest[1]) || 3, 4)) : 3;
      return await sandboxTree(ctx, path, depth);
    }
    case 'glob': {
      const pattern = rest[0] || '';
      if (!pattern) return '用法：glob <pattern> [path]\n示例：glob *.md  glob **/*.txt';
      const searchPath = rest[1] || '.';
      return await sandboxGlob(ctx, pattern, searchPath);
    }
    case 'grep': {
      const pattern = rest[0] || '';
      if (!pattern) return '用法：grep <pattern> [path]\n示例：grep "TODO"  grep "fixme" notes/';
      const searchPath = rest[1] || '.';
      return await sandboxGrep(ctx, pattern, searchPath);
    }
    case 'touch': {
      const path = rest[0] || '';
      if (!path) return '用法：touch <path>';
      return await sandboxTouch(ctx, path);
    }
    case 'mkdir': {
      const path = rest[0] || '';
      if (!path) return '用法：mkdir <path>';
      return await sandboxMkdir(ctx, path);
    }
    case 'rm':
    case 'del': {
      const path = rest[0] || '';
      if (!path) return '用法：rm <path>';
      return await sandboxRm(ctx, path);
    }
    case 'pwd': {
      return '工作空间根目录（沙箱内无 cwd 概念，所有路径都是相对根目录的）';
    }
    case 'sandbox':
    case 'sb': {
      // 沙箱状态查看
      const list = getEgressAllowlist();
      return [
        '沙箱状态：',
        `- 工作空间根：${ctx?.rootHandle?.name || '(未连接)'}`,
        `- 网络出口白名单：${list.length ? list.join(', ') : '(空 = 放行全部)'}`,
        `- 当前会话授权工具：${listSessionGrantsText(ctx?.sessionId)}`,
        '',
        '可用子命令：ls / tree / glob / grep / touch / mkdir / rm / pwd / sandbox',
      ].join('\n');
    }
    case 'help':
    case '?':
      return EXEC_HELP_TEXT;
    default:
      return `未知命令：${sub}\n\n${EXEC_HELP_TEXT}`;
  }
}

/** 极简 tokenizer：支持单/双引号包裹参数 */
function tokenizeCommand(input) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) { quote = null; continue; }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (/\s/.test(ch)) {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

const EXEC_HELP_TEXT = `execute_command 支持的子命令：

【资讯 / 网络】
  news <keyword>              搜索资讯库
  search <query>              联网搜索（Tavily 优先，自动 fallback DuckDuckGo）
  fetch <url>                 抓取网页正文（受沙箱出口白名单约束）

【股票】
  stock <code>               查询股票实时行情（600519/sh600519/000001）
  kline <code> [period] [n]   获取 K 线（period: 101日/102周/103月）

【工作空间文件（沙箱）】
  read <path>                 读取工作空间文件
  write <path> <content>     写入工作空间文件
  ls [path]                   列出目录内容（默认根目录）
  tree [path] [depth=3]      显示目录树（深度 1-4）
  glob <pattern> [path]      通配符匹配文件（如 *.md / **/*.txt）
  grep <pattern> [path]       在文件内容中搜索文本
  touch <path>                创建空文件（或更新时间戳）
  mkdir <path>                创建目录
  rm <path>                   删除文件（沙箱内限定工作空间根）
  pwd                         显示当前工作根目录

【会话状态】
  plan                        查看当前执行计划
  plan.add <title>            追加任务到计划
  plan.set <taskId> <status>  更新任务状态（pending/running/done/failed/skipped）
  var <key> [value]           查看/设置变量（value 可为 JSON）
  bb <key> [value]            读取/写入黑板

【沙箱 / 工具】
  sandbox                     查看沙箱状态（出口白名单 / 会话授权）
  tools                       列出可用工具
  help                        显示此帮助

参数可用单/双引号包裹，例如：write notes.md "今天的关键发现"`;

function buildPlanText(sessionId) {
  // sessionStore 已通过 setActiveSessionId 触发 ensureSession
  const text = buildSessionContextText(sessionId);
  return text || '（当前会话暂无执行计划）';
}

function getVariablesSync(sessionId, key) {
  return getVariable(sessionId, key);
}

function getBlackboardValue(sessionId, key) {
  return readBlackboard(sessionId, key);
}

function listAvailableTools(ctx) {
  const names = Array.isArray(ctx?.agentTools) ? ctx.agentTools : [];
  if (names.length === 0) return '当前未配置工具白名单';
  const lines = names.map(name => {
    const meta = getToolMeta(name);
    return `  ${meta.icon || '⚙️'}  ${name}  - ${meta.label || ''} ${meta.description ? '：' + meta.description : ''}`;
  });
  return `当前 agent 可用工具（${names.length} 个）：\n${lines.join('\n')}`;
}

/* ============ 沙箱子命令实现（方案 C Phase 5） ============
 * 全部限定在工作空间根目录内，路径校验统一走 sandbox.validateWorkspacePath。
 * 不真正执行 shell，而是通过 File System Access API 完成等价操作。
 */

/** 列出会话内已 allow-always 的工具 */
function listSessionGrantsText(sessionId) {
  if (!sessionId) return '(无会话)';
  const allTools = getEnabledSchemas().map(s => s.function.name);
  const granted = allTools.filter(n => hasSessionGrant(sessionId, n));
  return granted.length ? granted.join(', ') : '(无)';
}

/** 解析相对路径，返回 { ok, error, dir, name }，dir 用于 getDirectoryHandle */
async function resolveSandboxPath(ctx, rawPath, { create = false } = {}) {
  if (!ctx?.rootHandle) {
    return { ok: false, error: '错误：用户未连接工作空间。请在左侧"工作空间"tab 选择文件夹后再试。' };
  }
  const path = String(rawPath || '').trim() || '.';
  const check = validateWorkspacePath(path === '.' ? '' : path);
  // '.' 或空：根目录
  if (path === '.') {
    return { ok: true, dir: ctx.rootHandle, name: '', segments: [], isRoot: true };
  }
  if (!check.ok) return { ok: false, error: `错误：${check.error}` };
  const segments = check.segments;
  let dir = ctx.rootHandle;
  for (let i = 0; i < segments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segments[i], { create });
  }
  return {
    ok: true,
    dir,
    name: segments[segments.length - 1],
    segments,
    isRoot: false,
  };
}

/** ls [path]：列出目录内容 */
async function sandboxLs(ctx, rawPath) {
  const resolved = await resolveSandboxPath(ctx, rawPath);
  if (!resolved.ok) return resolved.error;
  const targetDir = resolved.isRoot ? ctx.rootHandle
    : await resolved.dir.getDirectoryHandle(resolved.name).catch(() => null);
  if (!targetDir) return `错误：目录 "${rawPath}" 不存在`;
  const entries = [];
  for await (const entry of targetDir.values()) {
    entries.push({
      name: entry.name,
      kind: entry.kind,
      isDir: entry.kind === 'directory',
    });
  }
  if (entries.length === 0) return `(目录 "${rawPath}" 为空)`;
  // 目录在前，文件在后
  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const lines = entries.map(e => {
    const icon = e.isDir ? '📁' : '📄';
    const suffix = e.isDir ? '/' : '';
    return `  ${icon}  ${e.name}${suffix}`;
  });
  return `${rawPath === '.' ? '工作空间根目录' : rawPath}（${entries.length} 项）：\n${lines.join('\n')}`;
}

/** tree [path] [depth]：显示目录树 */
async function sandboxTree(ctx, rawPath, maxDepth) {
  const resolved = await resolveSandboxPath(ctx, rawPath);
  if (!resolved.ok) return resolved.error;
  const rootDir = resolved.isRoot ? ctx.rootHandle
    : await resolved.dir.getDirectoryHandle(resolved.name).catch(() => null);
  if (!rootDir) return `错误：目录 "${rawPath}" 不存在`;
  const lines = [resolved.isRoot ? '📂 (root)' : `📂 ${resolved.name}/`];
  async function walk(dir, prefix, depth) {
    if (depth > maxDepth) return;
    const entries = [];
    for await (const entry of dir.values()) entries.push(entry);
    entries.sort((a, b) => {
      if ((a.kind === 'directory') !== (b.kind === 'directory')) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const last = i === entries.length - 1;
      const branch = last ? '└── ' : '├── ';
      const icon = entry.kind === 'directory' ? '📁' : '📄';
      lines.push(`${prefix}${branch}${icon} ${entry.name}${entry.kind === 'directory' ? '/' : ''}`);
      if (entry.kind === 'directory') {
        await walk(entry, prefix + (last ? '    ' : '│   '), depth + 1);
      }
    }
  }
  await walk(rootDir, '', 1);
  // 限制输出长度
  const max = 12000;
  const text = lines.join('\n');
  if (text.length > max) return text.slice(0, max) + `\n\n[输出过长，已截断，原长度 ${text.length} 字符]`;
  return text;
}

/** glob <pattern> [path]：通配符匹配 */
async function sandboxGlob(ctx, pattern, rawPath) {
  const resolved = await resolveSandboxPath(ctx, rawPath);
  if (!resolved.ok) return resolved.error;
  const rootDir = resolved.isRoot ? ctx.rootHandle
    : await resolved.dir.getDirectoryHandle(resolved.name).catch(() => null);
  if (!rootDir) return `错误：目录 "${rawPath}" 不存在`;
  // 把 shell glob 转成正则：* -> [^/]*, ** -> .*
  const regexStr = String(pattern || '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*')
    .replace(/\?/g, '[^/]');
  const regex = new RegExp(`^${regexStr}$`);
  const matches = [];
  async function walk(dir, prefix, depth) {
    if (depth > 4) return;
    for await (const entry of dir.values()) {
      const p = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === 'file' && regex.test(entry.name)) {
        matches.push(p);
      }
      if (entry.kind === 'directory') {
        // 也匹配目录名
        if (regex.test(entry.name)) matches.push(p + '/');
        await walk(entry, p, depth + 1);
      }
    }
  }
  await walk(rootDir, resolved.isRoot ? '' : resolved.name, 0);
  if (matches.length === 0) return `(没有匹配 ${pattern} 的文件)`;
  matches.sort();
  return `匹配 ${pattern}：${matches.length} 项\n${matches.slice(0, 100).map((m, i) => `${i + 1}. ${m}`).join('\n')}${matches.length > 100 ? `\n... 共 ${matches.length} 项，仅显示前 100 项` : ''}`;
}

/** grep <pattern> [path]：在文件内容中搜索 */
async function sandboxGrep(ctx, pattern, rawPath) {
  if (!pattern) return '错误：pattern 不能为空';
  const resolved = await resolveSandboxPath(ctx, rawPath);
  if (!resolved.ok) return resolved.error;
  const rootDir = resolved.isRoot ? ctx.rootHandle
    : await resolved.dir.getDirectoryHandle(resolved.name).catch(() => null);
  if (!rootDir) return `错误：目录 "${rawPath}" 不存在`;
  const regex = new RegExp(pattern, 'i');
  const matches = [];
  const MAX_FILE_SIZE = 100_000;
  const MAX_MATCHES = 50;
  async function walk(dir, prefix, depth) {
    if (depth > 4 || matches.length >= MAX_MATCHES) return;
    for await (const entry of dir.values()) {
      if (matches.length >= MAX_MATCHES) break;
      const p = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        // 跳过二进制文件（简单判断：扩展名）
        const lower = entry.name.toLowerCase();
        if (/\.(png|jpg|jpeg|gif|webp|ico|bmp|pdf|zip|tar|gz|rar|7z|exe|dll|so|bin)$/i.test(lower)) continue;
        try {
          const fileHandle = await entry.getFileHandle();
          const file = await fileHandle.getFile();
          if (file.size > MAX_FILE_SIZE) continue;
          const text = await file.text();
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              matches.push({ file: p, line: i + 1, text: lines[i].slice(0, 200) });
              if (matches.length >= MAX_MATCHES) break;
            }
          }
        } catch { /* skip file */ }
      } else {
        await walk(entry, p, depth + 1);
      }
    }
  }
  await walk(rootDir, resolved.isRoot ? '' : resolved.name, 0);
  if (matches.length === 0) return `(没有匹配 "${pattern}" 的内容)`;
  const lines = matches.map((m, i) =>
    `${i + 1}. ${m.file}:${m.line}  ${m.text.trim().slice(0, 120)}`
  );
  return `匹配 "${pattern}"：${matches.length} 处（最多显示 ${MAX_MATCHES} 处）\n${lines.join('\n')}`;
}

/** touch <path>：创建空文件或更新时间戳 */
async function sandboxTouch(ctx, rawPath) {
  if (!ctx?.rootHandle) return '错误：用户未连接工作空间';
  const check = validateWorkspacePath(rawPath);
  if (!check.ok) return `错误：${check.error}`;
  const segments = check.segments;
  // 读取已有内容（若存在），然后回写（保持内容不变，相当于更新时间戳）
  let existingContent = '';
  try {
    existingContent = await readFile(ctx.rootHandle, segments);
  } catch {
    // 文件不存在：创建空文件
  }
  await writeFile(ctx.rootHandle, segments.slice(0, -1), segments[segments.length - 1], existingContent);
  return `已创建/更新文件：${rawPath}`;
}

/** mkdir <path>：创建目录 */
async function sandboxMkdir(ctx, rawPath) {
  if (!ctx?.rootHandle) return '错误：用户未连接工作空间';
  const check = validateWorkspacePath(rawPath);
  if (!check.ok) return `错误：${check.error}`;
  let dir = ctx.rootHandle;
  for (const seg of check.segments) {
    dir = await dir.getDirectoryHandle(seg, { create: true });
  }
  return `已创建目录：${rawPath}`;
}

/** rm <path>：删除文件（沙箱限定，仅工作空间内） */
async function sandboxRm(ctx, rawPath) {
  if (!ctx?.rootHandle) return '错误：用户未连接工作空间';
  const check = validateWorkspacePath(rawPath);
  if (!check.ok) return `错误：${check.error}`;
  if (check.segments.length === 0) {
    return '错误：不能删除工作空间根目录';
  }
  const segments = check.segments;
  let dir = ctx.rootHandle;
  for (let i = 0; i < segments.length - 1; i++) {
    dir = await dir.getDirectoryHandle(segments[i]);
  }
  const name = segments[segments.length - 1];
  // 只允许删文件，不允许删目录（安全限制）
  let entry = null;
  try {
    entry = await dir.getFileHandle(name);
  } catch {
    return `错误：文件 "${rawPath}" 不存在或为目录（沙箱不允许删除目录）`;
  }
  await dir.removeEntry(name);
  return `已删除文件：${rawPath}`;
}

/* ============ 内置工具 schema + 注册 ============ */

const BUILTIN_TOOL_DEFS = [
  {
    name: 'read_workspace_file',
    schema: {
      type: 'function',
      function: {
        name: 'read_workspace_file',
        description: '读取本地工作空间中已存在的文件内容',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '相对于工作空间根目录的文件路径' }
          },
          required: ['path']
        }
      }
    },
    meta: { label: '读取文件', icon: '📄', description: '读取本地工作空间中已存在的文件内容', category: 'workspace' },
    executor: toolReadWorkspaceFile,
  },
  {
    name: 'write_workspace_file',
    schema: {
      type: 'function',
      function: {
        name: 'write_workspace_file',
        description: '将内容写入工作空间的文件（覆盖或新建）',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '相对于工作空间根目录的文件路径' },
            content: { type: 'string', description: '要写入的完整文件内容' }
          },
          required: ['path', 'content']
        }
      }
    },
    meta: { label: '写入文件', icon: '✍️', description: '将内容写入工作空间的文件', category: 'workspace', requiresApproval: true },
    executor: toolWriteWorkspaceFile,
  },
  {
    name: 'search_news',
    schema: {
      type: 'function',
      function: {
        name: 'search_news',
        description: '搜索资讯库（支持关键词全文检索，返回标题/摘要/来源）',
        parameters: {
          type: 'object',
          properties: {
            keyword: { type: 'string', description: '搜索关键词' },
            pageSize: { type: 'number', description: '返回条数（默认 8，最多 20）' }
          },
          required: ['keyword']
        }
      }
    },
    meta: { label: '检索资讯', icon: '🔍', description: '搜索资讯库', category: 'news' },
    executor: toolSearchNews,
  },
  {
    name: 'fetch_page',
    schema: {
      type: 'function',
      function: {
        name: 'fetch_page',
        description: '抓取指定 URL 的网页正文（SSRF 保护）',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: '要抓取的网页 URL' }
          },
          required: ['url']
        }
      }
    },
    meta: { label: '抓取网页', icon: '🌐', description: '抓取指定 URL 的网页正文', category: 'web', requiresApproval: true },
    executor: toolFetchPage,
  },
  {
    name: 'web_search',
    schema: {
      type: 'function',
      function: {
        name: 'web_search',
        description: '联网搜索（实时获取互联网最新信息）。优先用 Tavily API（需配置 Key），自动 fallback 到 DuckDuckGo 免费搜索。适用于查询超出训练数据时间范围、最新资讯、最新版本信息等场景',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词（建议精炼，去掉"请问""你知道吗"等口语化词）' },
            max_results: { type: 'number', description: '返回结果数（默认 6，最多 20）' }
          },
          required: ['query']
        }
      }
    },
    meta: { label: '联网搜索', icon: '🔎', description: '联网搜索互联网最新信息（Tavily / DuckDuckGo）', category: 'web' },
    executor: toolWebSearch,
  },
  {
    name: 'get_stock_quote',
    schema: {
      type: 'function',
      function: {
        name: 'get_stock_quote',
        description: '获取股票实时行情（价格、涨跌、五档盘口）',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '股票代码（6 位数字会自动补全 sh/sz 前缀；如 600519 → sh600519）' }
          },
          required: ['code']
        }
      }
    },
    meta: { label: '股票行情', icon: '📈', description: '获取股票实时行情', category: 'stock' },
    executor: toolGetStockQuote,
  },
  {
    name: 'get_stock_kline',
    schema: {
      type: 'function',
      function: {
        name: 'get_stock_kline',
        description: '获取股票 K 线数据（日/周/月线）',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '股票代码（6 位数字会自动补全 sh/sz 前缀）' },
            period: { type: 'string', enum: ['101', '102', '103'], description: '101=日线 102=周线 103=月线' },
            count: { type: 'number', description: '返回根数（默认 30，最多 120）' }
          },
          required: ['code']
        }
      }
    },
    meta: { label: 'K 线数据', icon: '📊', description: '获取股票 K 线数据', category: 'stock' },
    executor: toolGetStockKline,
  },
  /* ====== 会话状态管理工具（Phase 3） ====== */
  {
    name: 'set_plan',
    schema: {
      type: 'function',
      function: {
        name: 'set_plan',
        description: '为当前任务设置执行计划（一个有序任务列表，每个任务可声明依赖）。计划会在会话中持久化，便于跨轮次接力推理',
        parameters: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              description: '任务列表',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: '任务 id（可省略，默认 t1/t2/...）' },
                  title: { type: 'string', description: '任务标题（简短描述）' },
                  deps: { type: 'array', items: { type: 'string' }, description: '依赖的任务 id 列表' },
                  note: { type: 'string', description: '备注' },
                  toolName: { type: 'string', description: '关联的工具名' },
                },
                required: ['title'],
              },
            },
          },
          required: ['tasks'],
        },
      },
    },
    meta: { label: '设置计划', icon: '📋', description: '为当前任务设置执行计划', category: 'session' },
    executor: toolSetPlan,
  },
  {
    name: 'add_task',
    schema: {
      type: 'function',
      function: {
        name: 'add_task',
        description: '在当前执行计划末尾追加一个任务',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '任务标题' },
            deps: { type: 'array', items: { type: 'string' }, description: '依赖的任务 id' },
            note: { type: 'string', description: '备注' },
            toolName: { type: 'string', description: '关联的工具名' },
          },
          required: ['title'],
        },
      },
    },
    meta: { label: '追加任务', icon: '➕', description: '追加一个任务到执行计划', category: 'session' },
    executor: toolAddTask,
  },
  {
    name: 'update_task',
    schema: {
      type: 'function',
      function: {
        name: 'update_task',
        description: '更新任务状态（pending/running/done/failed/skipped），可附加结果摘要',
        parameters: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: '任务 id' },
            status: { type: 'string', enum: ['pending', 'running', 'done', 'failed', 'skipped'], description: '新状态' },
            result: { type: 'string', description: '任务结果摘要（可省略）' },
            note: { type: 'string', description: '备注更新' },
          },
          required: ['taskId', 'status'],
        },
      },
    },
    meta: { label: '更新任务', icon: '🔄', description: '更新任务状态', category: 'session' },
    executor: toolUpdateTask,
  },
  {
    name: 'set_variable',
    schema: {
      type: 'function',
      function: {
        name: 'set_variable',
        description: '在当前会话中设置一个变量（持久化到会话），可在后续工具调用与 LLM 推理中作为上下文使用',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string', description: '变量名（合法标识符）' },
            value: { description: '变量值（任意类型：string/number/boolean/array/object）' },
          },
          required: ['key'],
        },
      },
    },
    meta: { label: '设置变量', icon: '🏷️', description: '设置会话变量', category: 'session' },
    executor: toolSetVariable,
  },
  {
    name: 'write_blackboard',
    schema: {
      type: 'function',
      function: {
        name: 'write_blackboard',
        description: '向当前会话的黑板写入一个键值（黑板用于工具间的产出共享，后续工具可读取）',
        parameters: {
          type: 'object',
          properties: {
            key: { type: 'string', description: '黑板键' },
            value: { description: '值（任意类型）' },
          },
          required: ['key'],
        },
      },
    },
    meta: { label: '写黑板', icon: '📝', description: '写入会话黑板', category: 'session' },
    executor: toolWriteBlackboard,
  },
  /* ====== 命令执行能力（方案 C Phase 4） ====== */
  {
    name: 'execute_command',
    schema: {
      type: 'function',
      function: {
        name: 'execute_command',
        description: '统一命令入口：通过子命令调用搜索资讯、抓取网页、查询股票、读写工作空间文件、管理执行计划/变量/黑板等。类似于 Claude Code 的 bash 工具，但浏览器环境下路由到现有工具能力。输入 `help` 查看完整子命令列表',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: '命令字符串，如 `news OpenAI`、`stock 600519`、`write notes.md "今日关键发现"`、`plan`、`tools`、`help`',
            },
          },
          required: ['command'],
        },
      },
    },
    meta: { label: '执行命令', icon: '⌨️', description: '统一命令入口（shell 风格）', category: 'shell', requiresApproval: true },
    executor: toolExecuteCommand,
  },
];

// 注册内置工具 + 加载自定义工具（仅执行一次）
let _initialized = false;
function ensureRegistered() {
  if (_initialized) return;
  _initialized = true;
  BUILTIN_TOOL_DEFS.forEach(def => {
    registerTool(def.name, {
      source: 'builtin',
      schema: def.schema,
      meta: def.meta,
      enabled: true,
      executor: def.executor,
    });
  });
  loadCustomTools();
}
ensureRegistered();

/* ============ 向后兼容导出 ============ */

/** 兼容导出：从注册表派生 schema 数组（仅含 enabled 工具） */
export const AGENT_TOOL_SCHEMAS = getEnabledSchemas();

/** 兼容导出：按 agent.tools 白名单筛选 schema */
export function selectToolSchemas(toolNames) {
  return selectSchemasByName(toolNames);
}

/** 兼容导出：执行工具（内部委托给 toolRegistry.executeTool） */
export async function executeAgentTool(name, args, ctx) {
  return await executeTool(name, args, ctx);
}

/** 兼容导出：获取工具 UI 元信息（label/icon/description） */
export function getToolMetaByName(name) {
  return getToolMeta(name);
}
