/**
 * sandbox.js - Agent 沙箱（向 Claude Code / OpenClaw 靠齐）
 *
 * 设计要点：
 * - 路径安全：所有工作空间路径必须为相对路径，禁止 .. 逃逸和绝对路径
 * - 网络出口白名单：fetch_page 等工具的 URL 受白名单约束（默认空 = 放行全部）
 * - 审批闸门：高敏感工具调用前通过 Promise 暂停 Agent Loop，等待用户在 UI 卡片上决策
 *   - 决策类型：allow-once（仅本次）/ allow-always（本会话内同类调用免问）/ deny
 *   - allow-always 的 grant 按 (sessionId, toolName) 维度记入内存 Map
 * - 订阅模式：UI 通过 subscribePending 监听待审批请求的进出
 *
 * 与 toolRegistry 的关系：toolRegistry 在执行敏感工具前调用 requestApproval，
 * 这里返回 Promise<boolean>，UI 通过 respondApproval 解除阻塞。
 */

/* ============ 路径安全 ============ */

/**
 * 校验工作空间相对路径。
 * - 不能以 / 开头（绝对路径）
 * - 不能包含 .. 段（路径逃逸）
 * - 不能包含空段或非法字符
 * 返回 { ok, error, segments }
 */
export function validateWorkspacePath(rawPath) {
  const path = String(rawPath || '').trim();
  if (!path) return { ok: false, error: '路径不能为空', segments: [] };
  if (path.startsWith('/')) return { ok: false, error: '路径不能以 / 开头（必须是相对路径）', segments: [] };
  if (/\\/.test(path)) {
    // 统一为 POSIX 分隔符
    return validateWorkspacePath(path.replace(/\\/g, '/'));
  }
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return { ok: false, error: '路径不能为空', segments: [] };
  for (const seg of segments) {
    if (seg === '.' || seg === '..') {
      return { ok: false, error: `路径不能包含 . 或 .. 段：${seg}`, segments: [] };
    }
    if (/[<>:"|?*\x00-\x1f]/.test(seg)) {
      return { ok: false, error: `路径包含非法字符：${seg}`, segments: [] };
    }
  }
  return { ok: true, error: '', segments };
}

/** 简化版：返回布尔 */
export function isWorkspacePathSafe(rawPath) {
  return validateWorkspacePath(rawPath).ok;
}

/* ============ 网络出口白名单 ============ */

const EGRESS_KEY = 'sandboxEgressAllowlist';

function loadEgressAllowlist() {
  try {
    const raw = localStorage.getItem(EGRESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(h => typeof h === 'string' && h).map(h => h.toLowerCase()) : [];
  } catch { return []; }
}

let egressAllowlist = loadEgressAllowlist();
const egressListeners = new Set();

export function getEgressAllowlist() {
  return egressAllowlist.slice();
}

export function setEgressAllowlist(list) {
  const normalized = (Array.isArray(list) ? list : [])
    .map(h => String(h || '').trim().toLowerCase())
    .filter(Boolean);
  egressAllowlist = normalized;
  try { localStorage.setItem(EGRESS_KEY, JSON.stringify(normalized)); } catch { /* ignore */ }
  egressListeners.forEach(fn => { try { fn(egressAllowlist); } catch { /* ignore */ } });
}

export function subscribeEgressAllowlist(fn) {
  egressListeners.add(fn);
  return () => egressListeners.delete(fn);
}

/**
 * 判断 URL 是否被出口白名单放行。
 * - 白名单为空：放行所有合法的 http/https URL
 * - 白名单非空：只放行 hostname 精确匹配或为白名单域名子域名的 URL
 * - URL 无法解析为合法 URL 对象时一律拒绝
 */
export function isEgressAllowed(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) return false;
  // 先解析 URL 验证合法性，无论白名单是否为空
  let hostname = '';
  try { hostname = new URL(url).hostname.toLowerCase(); } catch { return false; }
  // 合法但无 hostname（如 'https://'）也拒绝
  if (!hostname) return false;
  if (egressAllowlist.length === 0) return true;
  return egressAllowlist.some(allowed => {
    if (hostname === allowed) return true;
    if (hostname.endsWith('.' + allowed)) return true;
    return false;
  });
}

/* ============ 审批闸门 ============ */

const approvals = {
  pending: new Map(),    // id -> { resolve, reject, request }
  grants: new Map(),     // sessionId -> Set<toolName>（allow-always 授权）
};
const approvalListeners = new Set();

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `apr_${Date.now().toString(36)}_${_idCounter.toString(36)}`;
}

/**
 * 检查当前会话是否已对该工具授予 allow-always。
 */
export function hasSessionGrant(sessionId, toolName) {
  if (!sessionId || !toolName) return false;
  const set = approvals.grants.get(sessionId);
  return Boolean(set && set.has(toolName));
}

/**
 * 清空某会话的 allow-always 授权（切换会话或用户主动撤销时调用）。
 */
export function clearSessionGrants(sessionId) {
  if (!sessionId) return;
  approvals.grants.delete(sessionId);
}

/**
 * 主动为某会话预授权某工具（allow-always 语义）。
 * 用于测试预授权、或未来 UI 提供「预先信任此工具」入口。
 */
export function grantSessionApproval(sessionId, toolName) {
  if (!sessionId || !toolName) return;
  if (!approvals.grants.has(sessionId)) approvals.grants.set(sessionId, new Set());
  approvals.grants.get(sessionId).add(toolName);
}

/**
 * 请求用户审批一次敏感工具调用。
 * 返回 Promise，UI 必须调用 respondApproval(id, decision) 解除阻塞。
 *
 * decision 取值：
 * - 'allow-once'  仅本次放行
 * - 'allow-always' 本次放行 + 本会话内同工具免问
 * - 'deny'        拒绝（reject Promise）
 */
export function requestApproval(request) {
  const sessionId = request?.sessionId || '';
  const toolName = request?.toolName || '';
  // 已经 allow-always 授权过：直接放行
  if (hasSessionGrant(sessionId, toolName)) {
    return Promise.resolve('allow-always');
  }
  const id = nextId();
  return new Promise((resolve, reject) => {
    approvals.pending.set(id, { resolve, reject, request });
    approvalListeners.forEach(fn => {
      try { fn({ type: 'request', id, request }); } catch { /* ignore */ }
    });
  });
}

/**
 * UI 调用：响应对某个 pending 审批的决定。
 * @param {string} id
 * @param {'allow-once' | 'allow-always' | 'deny'} decision
 */
export function respondApproval(id, decision) {
  const entry = approvals.pending.get(id);
  if (!entry) return;
  approvals.pending.delete(id);
  if (decision === 'deny') {
    const err = new Error(`用户拒绝授权工具 "${entry.request.toolName}"`);
    err.code = 'USER_DENIED';
    err.toolName = entry.request.toolName;
    entry.reject(err);
  } else {
    if (decision === 'allow-always') {
      const sessionId = entry.request.sessionId || '';
      const toolName = entry.request.toolName || '';
      if (sessionId && toolName) {
        if (!approvals.grants.has(sessionId)) approvals.grants.set(sessionId, new Set());
        approvals.grants.get(sessionId).add(toolName);
      }
    }
    entry.resolve(decision);
  }
  approvalListeners.forEach(fn => {
    try { fn({ type: 'response', id, decision, request: entry.request }); } catch { /* ignore */ }
  });
}

/** 取消某个 pending 审批（用于 abort 流程） */
export function cancelApproval(id, reason = 'cancelled') {
  const entry = approvals.pending.get(id);
  if (!entry) return;
  approvals.pending.delete(id);
  const err = new Error(reason);
  err.code = 'CANCELLED';
  entry.reject(err);
  approvalListeners.forEach(fn => {
    try { fn({ type: 'cancel', id, request: entry.request }); } catch { /* ignore */ }
  });
}

/** 取消所有 pending（用于切换会话或卸载组件） */
export function cancelAllPending(reason = 'cancelled') {
  for (const id of Array.from(approvals.pending.keys())) {
    cancelApproval(id, reason);
  }
}

/** 订阅审批事件（UI 用） */
export function subscribePending(fn) {
  approvalListeners.add(fn);
  return () => approvalListeners.delete(fn);
}

/** 获取当前 pending 列表（UI 用） */
export function getPendingApprovals() {
  return Array.from(approvals.pending.entries()).map(([id, { request }]) => ({ id, request }));
}
