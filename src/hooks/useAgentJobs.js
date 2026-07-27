// useAgentJobs - 智能体定时任务管理 hook
// 提供任务列表/创建/更新/删除/预览下次执行 + 执行历史
import { useState, useEffect, useCallback } from 'react';

const emptyJob = {
  agentId: 'orchestrator',
  name: '',
  description: '',
  cronExpr: '0 8 * * *', // 默认每天 8:00
  timezone: 'Asia/Shanghai',
  missionPrompt: '',
  enabled: true,
};

export function useAgentJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/agent-jobs');
      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        // 服务端返回 HTML（路由未命中或 vite preview），不当作致命错误
        setJobs([]);
        setError('定时任务后端未就绪（需 dev 或生产 Node 服务器）');
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || `HTTP ${resp.status}`);
      }
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createJob = useCallback(async (job) => {
    const resp = await fetch('/api/agent-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('定时任务后端未就绪（服务端返回了 HTML 而非 JSON）');
    }
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.error || '创建失败');
    await refresh();
    return data;
  }, [refresh]);

  const updateJob = useCallback(async (jobId, patch) => {
    const resp = await fetch(`/api/agent-jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('定时任务后端未就绪');
    }
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.error || '更新失败');
    await refresh();
    return data;
  }, [refresh]);

  const deleteJob = useCallback(async (jobId) => {
    const resp = await fetch(`/api/agent-jobs/${jobId}`, { method: 'DELETE' });
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('定时任务后端未就绪');
    }
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data.error || '删除失败');
    await refresh();
    return data;
  }, [refresh]);

  const toggleJob = useCallback(async (jobId, enabled) => {
    return updateJob(jobId, { enabled });
  }, [updateJob]);

  const getRuns = useCallback(async (jobId, limit = 20) => {
    const resp = await fetch(`/api/agent-jobs/${jobId}/runs?limit=${limit}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.runs || [];
  }, []);

  const previewCron = useCallback(async (cronExpr) => {
    const resp = await fetch('/api/agent-jobs/preview-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cronExpr }),
    });
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('预览接口未就绪');
    }
    const data = await resp.json();
    if (!data.ok) throw new Error(data.error || 'cron 表达式无效');
    return data.nextRun;
  }, []);

  return {
    jobs, loading, error,
    emptyJob,
    refresh, createJob, updateJob, deleteJob, toggleJob, getRuns, previewCron,
  };
}
