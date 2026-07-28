import { useMemo, useState, useEffect } from 'react';
import { useAgentJobs } from '../../hooks/useAgentJobs.js';

/* cron 表达式常用模板：点击直接填充，降低使用门槛 */
const CRON_PRESETS = [
  { label: '每天 8:00', expr: '0 8 * * *' },
  { label: '每天 9:00', expr: '0 9 * * *' },
  { label: '工作日 9:00', expr: '0 9 * * 1-5' },
  { label: '工作日 18:00', expr: '0 18 * * 1-5' },
  { label: '每小时', expr: '0 * * * *' },
  { label: '每 30 分钟', expr: '*/30 * * * *' },
];

function fmtNextRun(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

/**
 * 智能体定时任务区块（从 AgentPanel.jsx 抽离）
 *
 * 负责：
 *  - 展示当前 agent 的定时任务列表（也展示其他 agent 的，用 badge 标注）
 *  - 新建定时任务表单（名称 / cron / 任务目标）
 *  - 实时预览 cron 下次执行时间
 *  - 启用/禁用/删除任务
 */
export default function AgentJobsSection({ agent }) {
  const { jobs, loading, error, createJob, deleteJob, toggleJob, previewCron } = useAgentJobs();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    cronExpr: '0 8 * * *',
    missionPrompt: '',
  });
  const [previewNext, setPreviewNext] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 当前 agent 的任务（也展示其他 agent 的，但用 badge 标注）
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const ta = a.nextRunAt ? new Date(a.nextRunAt).getTime() : Infinity;
      const tb = b.nextRunAt ? new Date(b.nextRunAt).getTime() : Infinity;
      return ta - tb;
    });
  }, [jobs]);

  // 实时预览 cron 下次执行时间
  useEffect(() => {
    let cancelled = false;
    if (!draft.cronExpr?.trim()) { setPreviewNext(null); setPreviewError(''); return; }
    const timer = setTimeout(async () => {
      try {
        const next = await previewCron(draft.cronExpr);
        if (cancelled) return;
        setPreviewNext(next);
        setPreviewError('');
      } catch (err) {
        if (cancelled) return;
        setPreviewNext(null);
        setPreviewError(err.message || 'cron 表达式无效');
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [draft.cronExpr, previewCron]);

  const handleCreate = async () => {
    if (!draft.name.trim() || !draft.missionPrompt.trim() || !draft.cronExpr.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createJob({
        agentId: agent?.id || 'orchestrator',
        name: draft.name.trim(),
        description: draft.description.trim(),
        cronExpr: draft.cronExpr.trim(),
        missionPrompt: draft.missionPrompt.trim(),
      });
      setDraft({ name: '', description: '', cronExpr: '0 8 * * *', missionPrompt: '' });
      setShowForm(false);
    } catch (err) {
      setCreateError(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="agent-section agent-jobs-section">
      <header className="agent-section-head">
        <h3>定时任务</h3>
        {sortedJobs.length > 0 && <span className="agent-badge">{sortedJobs.length}</span>}
        <button
          type="button"
          className="agent-jobs-add-btn"
          onClick={() => setShowForm(v => !v)}
          title="新建定时任务"
        >{showForm ? '取消' : '+ 新建'}</button>
      </header>

      {showForm && (
        <div className="agent-jobs-form">
          <div className="agent-jobs-form-row">
            <input
              type="text"
              value={draft.name}
              onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
              placeholder="任务名称（如：每日早报）"
              className="agent-jobs-input"
            />
          </div>
          <div className="agent-jobs-form-row">
            <input
              type="text"
              value={draft.cronExpr}
              onChange={e => setDraft(prev => ({ ...prev, cronExpr: e.target.value }))}
              placeholder="cron 表达式（5 字段：分 时 日 月 周）"
              className="agent-jobs-input agent-jobs-cron-input"
            />
            {previewNext && <span className="agent-jobs-preview">下次：{fmtNextRun(previewNext)}</span>}
            {previewError && <span className="agent-jobs-preview agent-jobs-preview-error">{previewError}</span>}
          </div>
          <div className="agent-jobs-presets">
            {CRON_PRESETS.map(p => (
              <button
                key={p.expr}
                type="button"
                className={`agent-jobs-preset${draft.cronExpr === p.expr ? ' is-active' : ''}`}
                onClick={() => setDraft(prev => ({ ...prev, cronExpr: p.expr }))}
                title={p.expr}
              >{p.label}</button>
            ))}
          </div>
          <textarea
            value={draft.missionPrompt}
            onChange={e => setDraft(prev => ({ ...prev, missionPrompt: e.target.value }))}
            placeholder={`任务目标（每次执行时发送给智能体的 prompt），如：\n请基于今日资讯生成一份早报，覆盖 AI、芯片、商业三个领域，给出关键结论和追踪建议。`}
            rows={4}
            className="agent-jobs-textarea"
          />
          {createError && <div className="agent-jobs-error">{createError}</div>}
          <button
            type="button"
            className="agent-jobs-create-btn"
            onClick={handleCreate}
            disabled={creating || !draft.name.trim() || !draft.missionPrompt.trim() || !draft.cronExpr.trim() || !!previewError}
          >
            {creating ? '创建中...' : '创建任务'}
          </button>
        </div>
      )}

      {loading && <div className="agent-jobs-empty">加载中...</div>}
      {!loading && error && <div className="agent-jobs-empty agent-jobs-empty-error">无法加载定时任务：{error}</div>}
      {!loading && !error && sortedJobs.length === 0 && (
        <div className="agent-jobs-empty">
          {agent ? `为「${agent.name}」创建第一个定时任务，比如每天早 8 点生成早报` : '点击「新建」创建你的第一个定时任务'}
        </div>
      )}

      {!loading && !error && sortedJobs.length > 0 && (
        <ul className="agent-jobs-list">
          {sortedJobs.map(job => {
            const isCurrentAgent = !agent || job.agentId === agent.id;
            return (
              <li key={job.id} className={`agent-job-item${job.enabled ? '' : ' is-disabled'}${isCurrentAgent ? '' : ' is-other-agent'}`}>
                <div className="agent-job-item-head">
                  <span className="agent-job-name" title={job.description || job.name}>{job.name}</span>
                  <label className="agent-job-toggle" title={job.enabled ? '点击禁用' : '点击启用'}>
                    <input
                      type="checkbox"
                      checked={!!job.enabled}
                      onChange={e => toggleJob(job.id, e.target.checked)}
                    />
                    <span className="agent-job-toggle-slider" />
                  </label>
                </div>
                {!isCurrentAgent && (
                  <div className="agent-job-agent-badge" title={`执行 agent：${job.agentId}`}>
                    @{job.agentId}
                  </div>
                )}
                <div className="agent-job-meta">
                  <span className="agent-job-cron" title="cron 表达式">{job.cronExpr}</span>
                  <span className="agent-job-next" title="下次执行时间">下次：{fmtNextRun(job.nextRunAt)}</span>
                </div>
                {job.missionPrompt && (
                  <div className="agent-job-mission" title="任务目标">{job.missionPrompt}</div>
                )}
                <div className="agent-job-actions">
                  <span className="agent-job-runs" title="累计执行次数">已执行 {job.runCount || 0} 次</span>
                  <button
                    type="button"
                    className="agent-job-del-btn"
                    onClick={() => {
                      if (confirm(`确定删除定时任务「${job.name}」？`)) deleteJob(job.id);
                    }}
                    title="删除"
                  >删除</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
