// useWorkflowEngine — React hook wrapping WorkflowEngine
// Manages run state, trace, results, and history for the workflow canvas UI.

import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkflowEngine, buildWorkbenchContext } from '../utils/workflowEngine.js';
import {
  WORKFLOW_NODE_TYPES,
  getWorkflowSkillMeta,
  isWorkflowSkillId,
  formatWorkflowNodeConfig,
  normalizeWorkflowTemplate,
  DEFAULT_AGENT_WORKFLOW
} from '../constants/workflowConstants.js';
import { loadLS, saveLS } from '../utils/localStorage.js';

const HISTORY_KEY = 'agentWorkflowHistory';
const MAX_HISTORY = 12;

function loadHistory() {
  try {
    const raw = loadLS(HISTORY_KEY, null);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useWorkflowEngine() {
  const [run, setRun] = useState(() => ({
    id: '', status: 'idle', missionLabel: '', startedAt: '', finishedAt: '', trace: []
  }));
  const [result, setResult] = useState(() => ({
    loading: false, content: '', error: '', missionId: ''
  }));
  const [history, setHistory] = useState(() => loadHistory());
  const [actions, setActions] = useState([]);
  const engineRef = useRef(null);

  if (!engineRef.current) engineRef.current = new WorkflowEngine();

  useEffect(() => {
    try {
      saveLS(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {}
  }, [history]);

  const runWorkflow = useCallback(async (workflowDraft, mission, ctx) => {
    const engine = engineRef.current;
    if (!workflowDraft?.nodes?.length) return;

    const selectedMission = mission || {};
    const runId = `run-${Date.now()}`;
    const startedAt = new Date().toISOString();

    const enabledNodes = workflowDraft.nodes.filter(n => n.enabled !== false);
    if (!enabledNodes.length) {
      setRun({ id: runId, status: 'blocked', missionLabel: selectedMission.label || '', startedAt, finishedAt: startedAt, trace: [], blockingIssues: ['工作流没有启用任何节点'] });
      return;
    }

    const baseTrace = enabledNodes.map((node, index) => ({
      id: `${runId}-${node.id}`, nodeId: node.id, title: node.title, type: node.type,
      order: index + 1, status: index === 0 ? 'running' : 'queued',
      detail: node.role, inputKey: node.inputKey || 'context', outputKey: node.outputKey || `step_${index + 1}`
    }));

    setRun({ id: runId, status: 'running', missionLabel: selectedMission.label || '', startedAt, finishedAt: '', trace: baseTrace });
    setResult({ loading: true, content: '', error: '', missionId: selectedMission.id || '' });
    setActions([]);

    const context = {
      ...ctx,
      selectedMission,
      customPrompt: mission.prompt || '',
    };

    try {
      const outcome = await engine.run(workflowDraft, context, (nodeId, status, output, structured, error, currentTrace) => {
        setRun(prev => ({ ...prev, trace: [...(currentTrace || prev.trace)] }));
      });

      const nodeOutputs = outcome.nodeOutputs || [];
      const workflowActions = buildActions(outcome, selectedMission, nodeOutputs);

      setActions(workflowActions);
      setResult({
        loading: false,
        content: outcome.finalOutput || '',
        error: outcome.status === 'failed' ? (outcome.error || '执行失败') : '',
        missionId: selectedMission.id || ''
      });
      setRun(prev => ({
        id: runId,
        status: outcome.status === 'failed' ? 'failed' : 'completed',
        missionLabel: selectedMission.label || prev.missionLabel,
        startedAt,
        finishedAt: outcome.finishedAt || new Date().toISOString(),
        trace: outcome.trace || prev.trace
      }));

      const record = {
        id: runId,
        status: outcome.status === 'failed' ? 'failed' : 'completed',
        missionId: selectedMission.id,
        missionLabel: selectedMission.label,
        workflowName: workflowDraft.name,
        prompt: mission.prompt || '',
        scope: ctx.agentWorkflowScope,
        startedAt,
        finishedAt: outcome.finishedAt,
        content: outcome.finalOutput || '',
        trace: outcome.trace,
        nodeOutputs,
        error: outcome.status === 'failed' ? outcome.error : undefined,
        haltedByCondition: outcome.haltedByCondition
      };
      setHistory(prev => [record, ...prev.filter(item => item.id !== runId)].slice(0, MAX_HISTORY));
    } catch (error) {
      const message = error.message || '智能体工作流运行失败';
      setResult({ loading: false, content: '', error: message, missionId: selectedMission.id || '' });
      setRun(prev => ({
        id: runId, status: 'failed', missionLabel: selectedMission.label || '',
        startedAt, finishedAt: new Date().toISOString(),
        trace: prev.trace.map(step => step.status === 'running' ? { ...step, status: 'failed', detail: message } : step)
      }));
    }
  }, []);

  const abortWorkflow = useCallback(() => {
    engineRef.current?.abort();
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const restoreHistory = useCallback((record) => {
    setRun({
      id: record.id || '',
      status: record.status || 'completed',
      missionLabel: record.missionLabel || '',
      startedAt: record.startedAt || '',
      finishedAt: record.finishedAt || '',
      trace: record.trace || []
    });
    setResult({
      loading: false,
      content: record.content || '',
      error: record.error || '',
      missionId: record.missionId || ''
    });
    setActions(record.actions || []);
  }, []);

  return {
    run,
    result,
    history,
    actions,
    runWorkflow,
    abortWorkflow,
    clearHistory,
    restoreHistory
  };
}

function buildActions(outcome, mission, nodeOutputs) {
  if (!nodeOutputs?.length) return [];
  const last = nodeOutputs[nodeOutputs.length - 1];
  const now = Date.now();
  return [
    {
      id: `act-${now}-1`,
      label: '保存分析',
      title: '将工作流结果存入素材库',
      desc: last.output.slice(0, 120),
      status: 'pending',
      createdAt: now,
      execute: () => ({ type: 'material', content: last.output, title: `${mission.label || '工作流'} 分析结果` })
    },
    {
      id: `act-${now}-2`,
      label: '发送给 AI 精灵',
      title: '把结果复制给小助手继续追问',
      desc: '将本次工作流产出作为上下文发送到 AiElf 对话窗口。',
      status: 'pending',
      createdAt: now,
      execute: () => ({ type: 'elf', content: last.output })
    },
    {
      id: `act-${now}-3`,
      label: '导出 JSON',
      title: '导出工作流运行记录',
      desc: `包含 ${nodeOutputs.length} 个节点的输入输出。`,
      status: 'pending',
      createdAt: now,
      execute: () => ({ type: 'json', payload: { outcome, mission, nodeOutputs } })
    }
  ];
}
