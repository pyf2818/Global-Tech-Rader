import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateWorkspacePath,
  isWorkspacePathSafe,
  getEgressAllowlist,
  setEgressAllowlist,
  subscribeEgressAllowlist,
  isEgressAllowed,
  requestApproval,
  respondApproval,
  cancelApproval,
  cancelAllPending,
  hasSessionGrant,
  clearSessionGrants,
  grantSessionApproval,
  subscribePending,
  getPendingApprovals,
} from '../sandbox.js';

describe('sandbox - 路径安全校验', () => {
  it('合法相对路径通过校验', () => {
    const r = validateWorkspacePath('news/2026-07-27/foo.md');
    expect(r.ok).toBe(true);
    expect(r.segments).toEqual(['news', '2026-07-27', 'foo.md']);
  });

  it('空路径拒绝', () => {
    expect(validateWorkspacePath('').ok).toBe(false);
    expect(validateWorkspacePath('   ').ok).toBe(false);
  });

  it('绝对路径拒绝', () => {
    expect(validateWorkspacePath('/etc/passwd').ok).toBe(false);
    expect(validateWorkspacePath('/foo/bar').ok).toBe(false);
  });

  it('包含 .. 逃逸段拒绝', () => {
    expect(validateWorkspacePath('../secret').ok).toBe(false);
    expect(validateWorkspacePath('a/../../b').ok).toBe(false);
    expect(validateWorkspacePath('a/../b').ok).toBe(false);
  });

  it('包含 . 当前目录段拒绝', () => {
    expect(validateWorkspacePath('./foo').ok).toBe(false);
  });

  it('包含非法字符拒绝', () => {
    expect(validateWorkspacePath('foo:bar').ok).toBe(false);
    expect(validateWorkspacePath('foo|bar').ok).toBe(false);
    expect(validateWorkspacePath('foo*bar').ok).toBe(false);
  });

  it('反斜杠路径自动转换为正斜杠', () => {
    const r = validateWorkspacePath('a\\b\\c.md');
    expect(r.ok).toBe(true);
    expect(r.segments).toEqual(['a', 'b', 'c.md']);
  });

  it('isWorkspacePathSafe 布尔版本', () => {
    expect(isWorkspacePathSafe('a/b.md')).toBe(true);
    expect(isWorkspacePathSafe('../escape')).toBe(false);
  });
});

describe('sandbox - 网络出口白名单', () => {
  beforeEach(() => {
    setEgressAllowlist([]);
  });

  it('默认空白名单放行所有 http/https URL', () => {
    expect(getEgressAllowlist()).toEqual([]);
    expect(isEgressAllowed('https://example.com/foo')).toBe(true);
    expect(isEgressAllowed('http://foo.bar.example.cn/path?q=1')).toBe(true);
  });

  it('非 http(s) URL 一律拒绝', () => {
    expect(isEgressAllowed('file:///etc/passwd')).toBe(false);
    expect(isEgressAllowed('javascript:alert(1)')).toBe(false);
    expect(isEgressAllowed('ftp://example.com/')).toBe(false);
  });

  it('非空 URL 解析失败时拒绝', () => {
    expect(isEgressAllowed('https://')).toBe(false);
    expect(isEgressAllowed('https://[invalid')).toBe(false);
  });

  it('白名单非空时只放行精确匹配和子域名', () => {
    setEgressAllowlist(['example.com']);
    expect(isEgressAllowed('https://example.com/')).toBe(true);
    expect(isEgressAllowed('https://api.example.com/v1')).toBe(true);
    expect(isEgressAllowed('https://sub.api.example.com/x')).toBe(true);
    // 不能匹配非 example.com 域
    expect(isEgressAllowed('https://attacker.com/')).toBe(false);
    expect(isEgressAllowed('https://notexample.com/')).toBe(false);
  });

  it('白名单持久化触发订阅', () => {
    const fn = vi.fn();
    const unsub = subscribeEgressAllowlist(fn);
    setEgressAllowlist(['openai.com', 'github.com']);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(['openai.com', 'github.com']);
    expect(getEgressAllowlist()).toEqual(['openai.com', 'github.com']);
    unsub();
  });

  it('白名单条目做小写归一化', () => {
    setEgressAllowlist(['EXAMPLE.COM', '  GitHub.com  ']);
    expect(getEgressAllowlist()).toEqual(['example.com', 'github.com']);
    expect(isEgressAllowed('https://API.Example.com/x')).toBe(true);
  });
});

describe('sandbox - 审批闸门', () => {
  beforeEach(() => {
    cancelAllPending('test setup');
    clearSessionGrants('sess1');
    clearSessionGrants('sess2');
  });

  it('requestApproval 返回 Promise，respondApproval 解除阻塞', async () => {
    const p = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: { url: 'https://x.com' } });
    expect(getPendingApprovals().length).toBe(1);
    expect(getPendingApprovals()[0].request.toolName).toBe('fetch_page');
    // 异步响应
    setTimeout(() => respondApproval(getPendingApprovals()[0].id, 'allow-once'), 0);
    const decision = await p;
    expect(decision).toBe('allow-once');
    expect(getPendingApprovals().length).toBe(0);
  });

  it('deny 决策 reject Promise 并带 USER_DENIED 错误码', async () => {
    const p = requestApproval({ sessionId: 'sess1', toolName: 'write_workspace_file', args: {} });
    const id = getPendingApprovals()[0].id;
    setTimeout(() => respondApproval(id, 'deny'), 0);
    await expect(p).rejects.toMatchObject({ code: 'USER_DENIED', toolName: 'write_workspace_file' });
  });

  it('cancelApproval reject Promise 并带 CANCELLED 错误码', async () => {
    const p = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: {} });
    const id = getPendingApprovals()[0].id;
    setTimeout(() => cancelApproval(id, 'test cancel'), 0);
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('allow-always 在同会话内对同工具免再问', async () => {
    // 第一次：触发 UI 决策
    const p1 = requestApproval({ sessionId: 'sess2', toolName: 'fetch_page', args: {} });
    const id1 = getPendingApprovals()[0].id;
    setTimeout(() => respondApproval(id1, 'allow-always'), 0);
    const d1 = await p1;
    expect(d1).toBe('allow-always');
    expect(hasSessionGrant('sess2', 'fetch_page')).toBe(true);
    // 第二次：不再 pending，立即 resolve
    expect(getPendingApprovals().length).toBe(0);
    const d2 = await requestApproval({ sessionId: 'sess2', toolName: 'fetch_page', args: {} });
    expect(d2).toBe('allow-always');
  });

  it('allow-always 不会跨会话生效', async () => {
    const p1 = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: {} });
    const id1 = getPendingApprovals()[0].id;
    setTimeout(() => respondApproval(id1, 'allow-always'), 0);
    await p1;
    // sess2 没有授权
    expect(hasSessionGrant('sess2', 'fetch_page')).toBe(false);
    const p2 = requestApproval({ sessionId: 'sess2', toolName: 'fetch_page', args: {} });
    expect(getPendingApprovals().length).toBe(1);
    cancelApproval(getPendingApprovals()[0].id, 'cleanup');
    await expect(p2).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('clearSessionGrants 清空授权', async () => {
    const p1 = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: {} });
    respondApproval(getPendingApprovals()[0].id, 'allow-always');
    await p1;
    expect(hasSessionGrant('sess1', 'fetch_page')).toBe(true);
    clearSessionGrants('sess1');
    expect(hasSessionGrant('sess1', 'fetch_page')).toBe(false);
  });

  it('grantSessionApproval 预授权后 requestApproval 立即放行', async () => {
    grantSessionApproval('sess-pre', 'execute_command');
    expect(hasSessionGrant('sess-pre', 'execute_command')).toBe(true);
    // 预授权后调用 requestApproval 应立即 resolve，不进 pending 队列
    const decision = await requestApproval({
      sessionId: 'sess-pre', toolName: 'execute_command', args: { command: 'ls' },
    });
    expect(decision).toBe('allow-always');
    expect(getPendingApprovals().length).toBe(0);
    clearSessionGrants('sess-pre');
    expect(hasSessionGrant('sess-pre', 'execute_command')).toBe(false);
  });

  it('订阅模式正确派发事件', async () => {
    const fn = vi.fn();
    const unsub = subscribePending(fn);
    const p = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: {} });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].type).toBe('request');
    const id = getPendingApprovals()[0].id;
    respondApproval(id, 'allow-once');
    await p;
    expect(fn.mock.calls[fn.mock.calls.length - 1][0].type).toBe('response');
    expect(fn.mock.calls[fn.mock.calls.length - 1][0].decision).toBe('allow-once');
    unsub();
  });

  it('cancelAllPending 拒绝所有未决审批', async () => {
    const p1 = requestApproval({ sessionId: 'sess1', toolName: 'fetch_page', args: {} });
    const p2 = requestApproval({ sessionId: 'sess1', toolName: 'write_workspace_file', args: {} });
    expect(getPendingApprovals().length).toBe(2);
    cancelAllPending('test cleanup');
    await expect(p1).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(p2).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(getPendingApprovals().length).toBe(0);
  });
});
