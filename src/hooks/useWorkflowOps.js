import { useCallback } from 'react';
import { showToast } from '../utils/toast.js';
import {
  DEFAULT_AGENT_WORKFLOW,
  createWorkflowTemplateInstance,
  normalizeWorkflowTemplate,
  validateWorkflowImportPayload,
} from '../constants/workflowConstants.js';

/**
 * 工作流操作 callbacks：草稿编辑、模板管理、节点编辑、导入导出。
 *
 * 从 App.jsx 提取，保持原行为不变。所有 setState 由调用方传入。
 */
export function useWorkflowOps({
  agentWorkflowDraft,
  setAgentWorkflowDraft,
  workflowTemplates,
  setWorkflowTemplates,
  activeWorkflowId,
  setActiveWorkflowId,
  workflowTypeMeta,
  newWorkflowNodeType,
  selectedWorkflowNodeId,
  setSelectedWorkflowNodeId,
  addManualMaterial,
  agentWorkflowResult,
  agentWorkflowRun,
  workflowBlueprintText,
  setArticles,
  setCurrentArticleId,
  setNav,
  workflowImportInputRef,
}) {
  const updateWorkflowDraft = useCallback((patch) => {
    setAgentWorkflowDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const switchWorkflowTemplate = useCallback((templateId) => {
    const template = workflowTemplates.find(item => item.id === templateId);
    if (!template) return;
    const normalized = normalizeWorkflowTemplate(template);
    setActiveWorkflowId(templateId);
    setAgentWorkflowDraft(normalized);
    setSelectedWorkflowNodeId(normalized.nodes?.[0]?.id || '');
  }, [workflowTemplates]);

  const saveWorkflowAsTemplate = useCallback(() => {
    const id = `workflow-${Date.now()}`;
    const template = {
      ...agentWorkflowDraft,
      id,
      name: `${agentWorkflowDraft.name || '未命名工作流'} 副本`,
      updatedAt: new Date().toISOString()
    };
    setWorkflowTemplates(prev => [template, ...prev]);
    setActiveWorkflowId(id);
    setAgentWorkflowDraft(template);
    showToast('已保存为新的工作流模板');
  }, [agentWorkflowDraft]);

  const installWorkflowTemplate = useCallback((template) => {
    try {
      const instance = normalizeWorkflowTemplate(createWorkflowTemplateInstance(template, { idPrefix: template.id }));
      setWorkflowTemplates(prev => [instance, ...prev.filter(item => item.id !== instance.id)]);
      setActiveWorkflowId(instance.id);
      setAgentWorkflowDraft(instance);
      setSelectedWorkflowNodeId(instance.nodes[0]?.id || '');
      showToast(`已安装模板：${instance.name}`);
    } catch (e) {
      showToast(e.message || '模板安装失败');
    }
  }, []);

  const importWorkflowJson = useCallback(async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const imported = normalizeWorkflowTemplate(validateWorkflowImportPayload(payload));
      setWorkflowTemplates(prev => [imported, ...prev.filter(item => item.id !== imported.id)]);
      setActiveWorkflowId(imported.id);
      setAgentWorkflowDraft(imported);
      setSelectedWorkflowNodeId(imported.nodes[0]?.id || '');
      showToast(`已导入工作流：${imported.name}`);
    } catch (e) {
      showToast(e.message || '导入失败，请检查 JSON 格式');
    } finally {
      if (workflowImportInputRef.current) workflowImportInputRef.current.value = '';
    }
  }, []);

  const deleteWorkflowTemplate = useCallback((templateId) => {
    setWorkflowTemplates(prev => {
      if (prev.length <= 1) {
        showToast('至少保留一个工作流模板');
        return prev;
      }
      const next = prev.filter(template => template.id !== templateId);
      if (activeWorkflowId === templateId) {
        const fallback = normalizeWorkflowTemplate(next[0]);
        setActiveWorkflowId(fallback.id);
        setAgentWorkflowDraft(fallback);
        setSelectedWorkflowNodeId(fallback.nodes?.[0]?.id || '');
      }
      showToast('已删除工作流模板');
      return next;
    });
  }, [activeWorkflowId]);

  const updateWorkflowNode = useCallback((nodeId, patch) => {
    setAgentWorkflowDraft(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => node.id === nodeId ? { ...node, ...patch } : node)
    }));
  }, []);

  const reorderWorkflowNode = useCallback((fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setAgentWorkflowDraft(prev => {
      const fromIndex = prev.nodes.findIndex(node => node.id === fromId);
      const toIndex = prev.nodes.findIndex(node => node.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const nodes = [...prev.nodes];
      const [moved] = nodes.splice(fromIndex, 1);
      nodes.splice(toIndex, 0, moved);
      return { ...prev, nodes };
    });
  }, []);

  const moveWorkflowNode = useCallback((nodeId, direction) => {
    setAgentWorkflowDraft(prev => {
      const index = prev.nodes.findIndex(node => node.id === nodeId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= prev.nodes.length) return prev;
      const nodes = [...prev.nodes];
      const [moved] = nodes.splice(index, 1);
      nodes.splice(targetIndex, 0, moved);
      return { ...prev, nodes };
    });
  }, []);

  const addWorkflowNode = useCallback(() => {
    const meta = workflowTypeMeta[newWorkflowNodeType] || workflowTypeMeta.llm;
    const node = {
      id: `wf-${newWorkflowNodeType}-${Date.now()}`,
      type: newWorkflowNodeType,
      title: meta.label,
      role: '描述这个节点负责的判断、工具或输出职责。',
      prompt: '在这里填写该节点的执行指令。',
      skillId: newWorkflowNodeType === 'skill' ? 'evidence-pack' : undefined,
      conditionMetric: newWorkflowNodeType === 'condition' ? 'itemCount' : undefined,
      conditionOperator: newWorkflowNodeType === 'condition' ? '>=' : undefined,
      conditionValue: newWorkflowNodeType === 'condition' ? 1 : undefined,
      classifierLabels: newWorkflowNodeType === 'classifier' ? '必读,追踪,素材,创作,降噪' : undefined,
      inputKey: `step_${Math.max(agentWorkflowDraft.nodes.length, 1)}`,
      outputKey: `step_${agentWorkflowDraft.nodes.length + 1}`,
      enabled: true
    };
    setAgentWorkflowDraft(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
    setSelectedWorkflowNodeId(node.id);
  }, [newWorkflowNodeType, workflowTypeMeta, agentWorkflowDraft.nodes.length]);

  const removeWorkflowNode = useCallback((nodeId) => {
    setAgentWorkflowDraft(prev => {
      if (prev.nodes.length <= 1) return prev;
      const nodes = prev.nodes.filter(node => node.id !== nodeId);
      if (selectedWorkflowNodeId === nodeId) {
        setSelectedWorkflowNodeId(nodes[0]?.id || '');
      }
      return { ...prev, nodes };
    });
  }, [selectedWorkflowNodeId]);

  const resetWorkflowDraft = useCallback(() => {
    const normalizedDefault = normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
    setAgentWorkflowDraft(normalizedDefault);
    setSelectedWorkflowNodeId(normalizedDefault.nodes[1]?.id || normalizedDefault.nodes[0]?.id || '');
    showToast('已恢复默认工作流模板');
  }, []);

  const exportWorkflowToMaterials = useCallback(() => {
    addManualMaterial({
      title: `${agentWorkflowDraft.name} 工作流蓝图`,
      content: workflowBlueprintText,
      type: 'analysis',
      source: '智能体工作流',
      url: '',
      tags: '智能体,工作流,蓝图',
      note: '从智创中心智能体工作流导出',
      spaceId: null
    });
    showToast('工作流蓝图已存入素材库');
  }, [agentWorkflowDraft.name, workflowBlueprintText]);

  const downloadWorkflowJson = useCallback(() => {
    const payload = JSON.stringify({ ...agentWorkflowDraft, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agentWorkflowDraft.name || 'agent-workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [agentWorkflowDraft]);

  const exportWorkflowResultToEditor = useCallback(() => {
    if (!agentWorkflowResult.content) return;
    const traceText = (agentWorkflowRun.trace || [])
      .map(step => `- ${step.order}. ${step.title} [${step.status}]：${step.detail || step.prompt || ''}`)
      .join('\n');
    const newArticle = {
      id: Date.now(),
      title: `${agentWorkflowDraft.name || '智能体工作流'} · ${new Date().toLocaleDateString('zh-CN')}`,
      content: `# ${agentWorkflowDraft.name || '智能体工作流'}\n\n## 任务\n${agentWorkflowRun.missionLabel || '自定义任务'}\n\n## 运行轨迹\n${traceText || '暂无轨迹'}\n\n## 输出结果\n${agentWorkflowResult.content}\n\n---\n\n## 工作流蓝图\n${workflowBlueprintText}`,
      template: 'blank',
      materials: [],
      tags: ['智能体', '工作流'],
      status: 'draft',
      spaceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      images: []
    };
    setArticles(prev => [...prev, newArticle]);
    setCurrentArticleId(newArticle.id);
    setNav('editor');
    showToast('已导出到内容创作');
  }, [agentWorkflowResult.content, agentWorkflowRun, agentWorkflowDraft.name, workflowBlueprintText]);

  return {
    updateWorkflowDraft,
    switchWorkflowTemplate,
    saveWorkflowAsTemplate,
    installWorkflowTemplate,
    importWorkflowJson,
    deleteWorkflowTemplate,
    updateWorkflowNode,
    reorderWorkflowNode,
    moveWorkflowNode,
    addWorkflowNode,
    removeWorkflowNode,
    resetWorkflowDraft,
    exportWorkflowToMaterials,
    downloadWorkflowJson,
    exportWorkflowResultToEditor,
  };
}
