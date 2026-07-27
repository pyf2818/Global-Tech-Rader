/**
 * toolRegistry.js - Agent 工具注册表
 *
 * 方案 C Phase 1：把 agentTools.js 的硬编码 switch-case 改造为运行时可注册的 Map 架构。
 *
 * 设计要点：
 * - 工具来源：builtin（内置）/ custom-http（自定义 HTTP）/ custom-script（自定义脚本）
 * - 每个工具包含 schema（OpenAI Function Calling 协议）+ executor（执行函数）+ meta（UI 元信息）
 * - executor 接收 (args, ctx) 返回 string 或抛异常；toolRegistry 自动加超时保护
 * - 自定义工具持久化到 localStorage，启动时合并到注册表
 * - 内置工具从 agentTools.js 迁移过来（保持兼容）
 *
 * 与 agentTools.js 的关系：
 * - toolRegistry 是新的注册表（支持运行时注册）
 * - agentTools.js 继续导出 AGENT_TOOL_SCHEMAS / selectToolSchemas / executeAgentTool，但内部改为委托给 toolRegistry
 * - 现有调用方无需修改
 *
 * 沙箱集成（方案 C Phase 5）：
 * - meta.requiresApproval=true 的工具在执行前会调用 sandbox.requestApproval
 * - 用户在 UI 卡片中决策 allow-once / allow-always / deny
 * - allow-always 后本会话内同工具免再问
 * - 用户也可在 Settings 中对任意工具的 requiresApproval 进行覆写（持久化到 localStorage）
 */

import { requestApproval, hasSessionGrant } from './sandbox.js';

const TOOL_TIMEOUT_MS = 15_000;

/* ============ 工具审批覆写（用户在 Settings 中配置） ============ */

const APPROVAL_OVERRIDE_KEY = 'sandboxToolApprovalOverride';

function loadApprovalOverride() {
  try {
    const raw = localStorage.getItem(APPROVAL_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

const approvalOverride = loadApprovalOverride();
const overrideListeners = new Set();

export function getApprovalOverride() {
  return { ...approvalOverride };
}

export function setApprovalOverride(name, requiresApproval) {
  if (requiresApproval === null || requiresApproval === undefined) {
    delete approvalOverride[name];
  } else {
    approvalOverride[name] = Boolean(requiresApproval);
  }
  try { localStorage.setItem(APPROVAL_OVERRIDE_KEY, JSON.stringify(approvalOverride)); } catch { /* ignore */ }
  overrideListeners.forEach(fn => { try { fn({ ...approvalOverride }); } catch { /* ignore */ } });
  emitChange(); // 同步更新 meta.requiresApproval
}

export function subscribeApprovalOverride(fn) {
  overrideListeners.add(fn);
  return () => overrideListeners.delete(fn);
}

/** 解析工具最终的 requiresApproval（用户覆写优先于默认值） */
function resolveRequiresApproval(name, defaultValue) {
  if (Object.prototype.hasOwnProperty.call(approvalOverride, name)) {
    return Boolean(approvalOverride[name]);
  }
  return Boolean(defaultValue);
}

/**
 * @typedef {Object} ToolEntry
 * @property {Object} schema - OpenAI Function Calling schema
 * @property {string} source - builtin | custom-http | custom-script
 * @property {Function} executor - async (args, ctx) => string
 * @property {Object} meta - { label, icon, description, category, requiresApproval }
 * @property {boolean} enabled - 是否启用（自定义工具可禁用）
 */

const registry = new Map();
const listeners = new Set();

/** 派发 schema 数组（只包含 enabled 工具） */
function emitChange() {
  listeners.forEach(fn => { try { fn(getAllTools()); } catch { /* ignore */ } });
}

/** 注册一个工具 */
export function registerTool(name, entry) {
  if (!name || typeof name !== 'string') throw new Error('工具名必须为非空字符串');
  const meta = entry.meta || { label: name, icon: '⚙️' };
  // 用户在 Settings 中的覆写优先于工具默认 requiresApproval
  meta.requiresApproval = resolveRequiresApproval(name, meta.requiresApproval);
  registry.set(name, {
    schema: entry.schema,
    source: entry.source || 'custom',
    executor: entry.executor,
    meta,
    enabled: entry.enabled !== false,
    config: entry.config || {},
  });
  emitChange();
}

/** 注销一个工具（仅自定义工具可注销） */
export function unregisterTool(name) {
  const entry = registry.get(name);
  if (!entry || entry.source === 'builtin') return false;
  registry.delete(name);
  emitChange();
  return true;
}

/** 启用/禁用工具 */
export function setToolEnabled(name, enabled) {
  const entry = registry.get(name);
  if (!entry || entry.source === 'builtin') return false;
  entry.enabled = !!enabled;
  emitChange();
  return true;
}

/** 获取单个工具 */
export function getTool(name) {
  return registry.get(name) || null;
}

/** 获取所有工具（含 disabled，便于 UI 展示） */
export function getAllTools() {
  return Array.from(registry.entries()).map(([name, entry]) => ({ name, ...entry }));
}

/** 获取启用的工具 schema 数组（OpenAI 协议） */
export function getEnabledSchemas() {
  const result = [];
  for (const [, entry] of registry) {
    if (entry.enabled) result.push(entry.schema);
  }
  return result;
}

/** 按名称筛选 schema 数组（agent.tools 白名单） */
export function selectSchemasByName(toolNames) {
  if (!Array.isArray(toolNames) || toolNames.length === 0) return [];
  const result = [];
  for (const name of toolNames) {
    const entry = registry.get(name);
    if (entry && entry.enabled) result.push(entry.schema);
  }
  return result;
}

/** 获取工具 UI 元信息（label/icon/description） */
export function getToolMeta(name) {
  const entry = registry.get(name);
  return entry?.meta || { label: name, icon: '⚙️', description: '' };
}

/**
 * 执行单个工具调用（带超时保护 + 沙箱审批闸门）
 * @param {string} name 工具名
 * @param {Object} args 工具参数
 * @param {Object} ctx 运行时上下文（rootHandle / llmConfig / sessionId 等）
 * @returns {Promise<string>} 工具执行结果
 *
 * 沙箱流程：
 *   1. 工具 meta.requiresApproval=true 且 ctx.sessionId 非空时进入审批闸门
 *   2. 若该会话已对该工具 allow-always，直接放行（不再阻塞）
 *   3. 否则调用 sandbox.requestApproval 暂停 Agent Loop，UI 弹出审批卡片
 *   4. 用户决策：
 *      - allow-once / allow-always → 继续执行
 *      - deny → 返回错误信息（不抛异常，让 Agent Loop 知道是被用户拒绝）
 *      - cancel（abort/切换会话） → 同 deny
 */
export async function executeTool(name, args, ctx) {
  const entry = registry.get(name);
  if (!entry) return `错误：未知工具 "${name}"`;
  if (!entry.enabled) return `错误：工具 "${name}" 已被禁用`;

  // 沙箱审批闸门
  if (entry.meta?.requiresApproval && ctx?.sessionId) {
    const sessionId = ctx.sessionId;
    // 已 allow-always 授权过：sandbox.requestApproval 内部会立即 resolve('allow-always')，无需再走 UI
    try {
      const decision = await requestApproval({
        sessionId,
        toolName: name,
        args,
        summary: summarizeToolCall(name, args),
        agentName: ctx.agentName || '',
        agentId: ctx.agentId || '',
      });
      // 此处 decision ∈ {'allow-once', 'allow-always'}，继续执行
      void decision;
    } catch (err) {
      // 用户拒绝 / 取消：返回友好错误信息（不抛异常，让 Agent Loop 把它当作工具结果回灌给 LLM）
      if (err?.code === 'USER_DENIED') {
        return `错误：用户拒绝授权工具 "${name}"，本次调用未执行。`;
      }
      if (err?.code === 'CANCELLED') {
        return `错误：审批被取消（会话切换或停止生成）："${name}" 未执行。`;
      }
      return `错误：审批失败 - ${err?.message || String(err)}`;
    }
  }

  try {
    const result = await Promise.race([
      entry.executor(args || {}, ctx || {}),
      new Promise((_, reject) => setTimeout(() => {
        reject(new Error(`工具执行超时（${TOOL_TIMEOUT_MS / 1000}s）`));
      }, TOOL_TIMEOUT_MS)),
    ]);
    return result;
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return `工具执行失败：${err?.message || String(err)}`;
  }
}

/** 工具调用摘要（用于审批卡片展示参数） */
function summarizeToolCall(name, args) {
  try {
    const a = args || {};
    if (name === 'read_workspace_file' || name === 'write_workspace_file') return a.path || '';
    if (name === 'search_news') return a.keyword || '';
    if (name === 'fetch_page') return a.url || '';
    if (name === 'get_stock_quote' || name === 'get_stock_kline') return a.code || '';
    if (name === 'execute_command') return a.command || '';
    const keys = Object.keys(a);
    if (keys.length === 0) return '';
    return JSON.stringify(a).slice(0, 200);
  } catch { return ''; }
}

/** 订阅注册表变化（UI 监听） */
export function subscribeTools(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ============ 自定义工具持久化 ============ */

const CUSTOM_TOOLS_KEY = 'agentCustomTools';

/** 加载 localStorage 中的自定义工具到注册表 */
export function loadCustomTools() {
  try {
    const raw = localStorage.getItem(CUSTOM_TOOLS_KEY);
    if (!raw) return;
    const customTools = JSON.parse(raw);
    if (!Array.isArray(customTools)) return;
    customTools.forEach(tool => {
      if (!tool?.name || !tool?.config) return;
      registerCustomHttpTool(tool.name, tool.config, tool.meta, tool.enabled);
    });
  } catch { /* ignore */ }
}

/** 持久化自定义工具列表到 localStorage */
export function saveCustomTools() {
  try {
    const customTools = getAllTools()
      .filter(t => t.source === 'custom-http')
      .map(t => ({
        name: t.name,
        config: t.config,
        meta: t.meta,
        enabled: t.enabled,
      }));
    localStorage.setItem(CUSTOM_TOOLS_KEY, JSON.stringify(customTools));
  } catch { /* ignore */ }
}

/**
 * 注册一个自定义 HTTP 工具
 * @param {string} name 工具名（用户起名，需合法标识符）
 * @param {Object} config { method, url, headers, bodyTemplate, jsonPath, maxBytes }
 * @param {Object} meta { label, icon, description }
 * @param {boolean} enabled
 */
export function registerCustomHttpTool(name, config, meta, enabled = true) {
  // 工具名合法性校验：仅允许小写字母/数字/下划线，且不以数字开头
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('工具名必须以小写字母开头，只能包含小写字母/数字/下划线');
  }
  const parameters = buildHttpToolParameters(config);
  registerTool(name, {
    source: 'custom-http',
    schema: {
      type: 'function',
      function: {
        name,
        description: meta?.description || `自定义 HTTP 工具：${config?.method || 'GET'} ${config?.url || ''}`,
        parameters,
      },
    },
    meta: {
      label: meta?.label || name,
      icon: meta?.icon || '🔧',
      description: meta?.description || '',
      category: 'custom',
      requiresApproval: false,
    },
    enabled,
    config,
    executor: createHttpExecutor(config),
  });
  saveCustomTools();
}

/** 删除自定义 HTTP 工具（内置工具不可删） */
export function deleteCustomTool(name) {
  const removed = unregisterTool(name);
  if (removed) saveCustomTools();
  return removed;
}

/** 更新自定义 HTTP 工具配置（重新生成 schema 与 executor） */
export function updateCustomHttpTool(name, config, meta) {
  const existing = registry.get(name);
  if (!existing || existing.source !== 'custom-http') return false;
  const parameters = buildHttpToolParameters(config);
  registry.set(name, {
    ...existing,
    schema: {
      type: 'function',
      function: {
        name,
        description: meta?.description || `自定义 HTTP 工具：${config?.method || 'GET'} ${config?.url || ''}`,
        parameters,
      },
    },
    meta: {
      label: meta?.label || existing.meta?.label || name,
      icon: meta?.icon || existing.meta?.icon || '🔧',
      description: meta?.description || existing.meta?.description || '',
      category: 'custom',
      requiresApproval: false,
    },
    config,
    executor: createHttpExecutor(config),
  });
  emitChange();
  saveCustomTools();
  return true;
}

/**
 * 试运行自定义 HTTP 工具（不写入注册表，直接执行配置好的 executor）
 * 用于编辑器中的"测试"按钮
 */
export async function testCustomHttpTool(config, args = {}) {
  const executor = createHttpExecutor(config);
  return await executor(args, {});
}

/** 根据配置构造 OpenAI schema 的 parameters */
function buildHttpToolParameters(config) {
  // 提取 URL 中 {{param}} 占位符作为 required 参数
  const urlParams = (config?.url || '').match(/\{\{(\w+)\}\}/g) || [];
  const urlParamNames = urlParams.map(p => p.slice(2, -2));
  const bodyParams = (config?.bodyTemplate || '').match(/\{\{(\w+)\}\}/g) || [];
  const bodyParamNames = bodyParams.map(p => p.slice(2, -2));

  const properties = {};
  const required = [];
  [...new Set([...urlParamNames, ...bodyParamNames])].forEach(name => {
    properties[name] = { type: 'string', description: `参数 ${name}` };
    required.push(name);
  });

  return { type: 'object', properties, required };
}

/** 构造 HTTP 执行器 */
function createHttpExecutor(config) {
  return async (args, ctx) => {
    // 替换 URL 占位符
    let url = config.url || '';
    Object.entries(args).forEach(([k, v]) => {
      url = url.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), encodeURIComponent(String(v)));
    });

    // 替换 body 占位符
    let bodyStr = config.bodyTemplate || '';
    if (bodyStr) {
      Object.entries(args).forEach(([k, v]) => {
        bodyStr = bodyStr.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }

    const headers = { ...(config.headers || {}) };
    if (bodyStr && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method: config.method || 'GET',
      headers,
      body: bodyStr || undefined,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return `HTTP ${res.status}: ${res.statusText}`;

    const contentType = res.headers.get('content-type') || '';
    let text;
    if (contentType.includes('application/json')) {
      const json = await res.json();
      // 支持 jsonPath 提取（简化版：a.b.c 路径）
      if (config.jsonPath) {
        text = JSON.stringify(extractJsonPath(json, config.jsonPath), null, 2);
      } else {
        text = JSON.stringify(json, null, 2);
      }
    } else {
      text = await res.text();
    }

    const maxBytes = config.maxBytes || 12000;
    if (text.length > maxBytes) {
      return text.slice(0, maxBytes) + `\n\n[响应过长，已截断，原长度 ${text.length} 字符]`;
    }
    return text || '(空响应)';
  };
}

/** 简化的 JSON 路径提取（a.b.c） */
function extractJsonPath(obj, path) {
  const parts = String(path).split('.').filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current;
}
