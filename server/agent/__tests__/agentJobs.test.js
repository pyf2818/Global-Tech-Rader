// agentJobs.test.js - cron 表达式解析单元测试
import { describe, it, expect } from 'vitest';
import { nextCronRun } from '../../../server/agent/agentJobsService.js';

describe('nextCronRun - cron 表达式解析', () => {
  // 用固定时间避免测试不稳定：2026-07-26 10:00:00（周日）
  const from = new Date('2026-07-26T10:00:00');

  it('每天 8:00 → 次日 8:00', () => {
    const next = nextCronRun('0 8 * * *', from);
    expect(next.getHours()).toBe(8);
    expect(next.getMinutes()).toBe(0);
    expect(next.getDate()).toBe(27); // 次日
  });

  it('每 30 分钟 → 10:30', () => {
    const next = nextCronRun('*/30 * * * *', from);
    expect(next.getHours()).toBe(10);
    expect(next.getMinutes()).toBe(30);
  });

  it('工作日 9:00（周一至周五）→ 周一 9:00', () => {
    const next = nextCronRun('0 9 * * 1-5', from);
    expect(next.getDay()).toBe(1); // 周一
    expect(next.getHours()).toBe(9);
  });

  it('每小时整点 → 11:00', () => {
    const next = nextCronRun('0 * * * *', from);
    expect(next.getHours()).toBe(11);
    expect(next.getMinutes()).toBe(0);
  });

  it('每分钟 → 10:01', () => {
    const next = nextCronRun('* * * * *', from);
    expect(next.getHours()).toBe(10);
    expect(next.getMinutes()).toBe(1);
  });

  it('每月 1 号 0:00 → 8月1日 0:00', () => {
    const next = nextCronRun('0 0 1 * *', from);
    expect(next.getMonth()).toBe(7); // 8月（0-indexed）
    expect(next.getDate()).toBe(1);
    expect(next.getHours()).toBe(0);
  });

  it('指定多个时间点（8:00 和 20:00）→ 20:00', () => {
    const next = nextCronRun('0 8,20 * * *', from);
    expect(next.getHours()).toBe(20);
  });

  it('非法 cron 表达式抛出错误', () => {
    expect(() => nextCronRun('invalid', from)).toThrow();
    expect(() => nextCronRun('0 8', from)).toThrow();
    expect(() => nextCronRun('0 8 * *', from)).toThrow();
  });

  it('非法字段值抛出错误', () => {
    expect(() => nextCronRun('60 8 * * *', from)).toThrow(); // 分钟超出 0-59
    expect(() => nextCronRun('0 25 * * *', from)).toThrow(); // 小时超出 0-23
    expect(() => nextCronRun('0 8 32 * *', from)).toThrow(); // 日超出 1-31
  });

  it('复杂表达式：工作日 9:30 → 周一 9:30', () => {
    const next = nextCronRun('30 9 * * 1-5', from);
    expect(next.getDay()).toBe(1);
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(30);
  });
});
