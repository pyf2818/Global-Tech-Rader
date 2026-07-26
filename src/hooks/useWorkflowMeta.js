import { useMemo } from 'react';

/**
 * Workflow type/status metadata and selected node derivations.
 * All pure computations with no side effects.
 */
export function useWorkflowMeta(agentWorkflowDraft, selectedWorkflowNodeId) {
  const workflowTypeMeta = useMemo(() => ({
    input:      { label: '输入',          tone: 'blue'   },
    llm:        { label: '大模型 Prompt', tone: 'cyan'   },
    skill:      { label: '工具 Skills',   tone: 'green'  },
    condition:  { label: '条件语句',      tone: 'amber'  },
    classifier: { label: '分类语句',      tone: 'violet' },
    reply:      { label: '指定回复',      tone: 'rose'   },
    output:     { label: '输出',          tone: 'slate'  },
  }), []);

  const workflowRunStatusMeta = useMemo(() => ({
    idle:      { label: '待运行', tone: 'neutral' },
    running:   { label: '运行中', tone: 'running' },
    completed: { label: '已完成', tone: 'success' },
    blocked:   { label: '待配置', tone: 'blocked' },
    failed:    { label: '失败',   tone: 'failed'  },
  }), []);

  const selectedWorkflowNode = useMemo(() => {
    const nodes = agentWorkflowDraft?.nodes ?? [];
    return nodes.find(node => node.id === selectedWorkflowNodeId) || nodes[0] || null;
  }, [agentWorkflowDraft?.nodes, selectedWorkflowNodeId]);

  const selectedWorkflowConnections = useMemo(() => {
    const nodes = agentWorkflowDraft?.nodes ?? [];
    const index = nodes.findIndex(node => node.id === selectedWorkflowNodeId);
    return {
      previous: index > 0 ? nodes[index - 1] : null,
      next: index >= 0 && index < nodes.length - 1 ? nodes[index + 1] : null,
    };
  }, [agentWorkflowDraft?.nodes, selectedWorkflowNodeId]);

  const enabledWorkflowNodes = useMemo(() => {
    return (agentWorkflowDraft?.nodes ?? []).filter(node => node.enabled !== false);
  }, [agentWorkflowDraft?.nodes]);

  return {
    workflowTypeMeta,
    workflowRunStatusMeta,
    selectedWorkflowNode,
    selectedWorkflowConnections,
    enabledWorkflowNodes,
  };
}
