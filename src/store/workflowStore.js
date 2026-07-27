/**
 * Workflow Store - 智能体工作流状态
 *
 * 包含：草稿、模板、运行记录、历史、动作队列、选中节点等 8 个核心状态。
 * 所有状态通过 persist 中间件自动同步到 localStorage（替代 App.jsx 中手写的 saveLS effect）。
 *
 * 使用方式：
 *   import { useWorkflowStore } from './store';
 *   const draft = useWorkflowStore(s => s.agentWorkflowDraft);
 *   const setDraft = useWorkflowStore(s => s.setAgentWorkflowDraft);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  DEFAULT_AGENT_WORKFLOW,
  normalizeWorkflowTemplate,
} from '../constants/workflowConstants.js';

// ============ Workflow Store ============
export const useWorkflowStore = create(
  persist(
    (set, get) => ({
      // ===== 工作流草稿 =====
      agentWorkflowDraft: (() => {
        const saved = (() => {
          try {
            const v = localStorage.getItem('agentWorkflowDraft');
            return v ? JSON.parse(v) : null;
          } catch { return null; }
        })();
        if (!saved || !Array.isArray(saved.nodes) || saved.nodes.length === 0) {
          return normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
        }
        return normalizeWorkflowTemplate(saved);
      })(),
      setAgentWorkflowDraft: (updater) => {
        const cur = get().agentWorkflowDraft;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ agentWorkflowDraft: next });
      },

      // ===== 模板库 =====
      workflowTemplates: (() => {
        const savedTemplates = (() => {
          try {
            const v = localStorage.getItem('agentWorkflowTemplates');
            return v ? JSON.parse(v) : null;
          } catch { return null; }
        })();
        if (Array.isArray(savedTemplates) && savedTemplates.length > 0) {
          return savedTemplates.map(template => normalizeWorkflowTemplate(template));
        }
        const savedDraft = (() => {
          try {
            const v = localStorage.getItem('agentWorkflowDraft');
            return v ? JSON.parse(v) : null;
          } catch { return null; }
        })();
        const baseDraft = savedDraft && Array.isArray(savedDraft.nodes) && savedDraft.nodes.length > 0
          ? normalizeWorkflowTemplate(savedDraft)
          : normalizeWorkflowTemplate(DEFAULT_AGENT_WORKFLOW);
        return [{ ...baseDraft, id: baseDraft.id || 'default-workflow', updatedAt: new Date().toISOString() }];
      })(),
      setWorkflowTemplates: (updater) => {
        const cur = get().workflowTemplates;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ workflowTemplates: next });
      },

      // ===== 当前激活模板 ID =====
      activeWorkflowId: (() => {
        try { return JSON.parse(localStorage.getItem('activeWorkflowId')) || 'default-workflow'; }
        catch { return 'default-workflow'; }
      })(),
      setActiveWorkflowId: (v) => set({ activeWorkflowId: v }),

      // ===== 选中节点 ID =====
      selectedWorkflowNodeId: (() => {
        try { return JSON.parse(localStorage.getItem('selectedWorkflowNodeId')) || 'wf-analyst'; }
        catch { return 'wf-analyst'; }
      })(),
      setSelectedWorkflowNodeId: (v) => set({ selectedWorkflowNodeId: v }),

      // ===== 运行结果（content/error/missionId/loading）=====
      agentWorkflowResult: (() => {
        const saved = (() => {
          try {
            const v = localStorage.getItem('agentWorkflowResult');
            return v ? JSON.parse(v) : null;
          } catch { return null; }
        })();
        return {
          loading: false,
          content: saved?.content || '',
          error: saved?.error || '',
          missionId: saved?.missionId || '',
        };
      })(),
      setAgentWorkflowResult: (updater) => {
        const cur = get().agentWorkflowResult;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ agentWorkflowResult: next });
      },

      // ===== 运行实例（id/status/missionLabel/startedAt/finishedAt/trace）=====
      agentWorkflowRun: (() => {
        try {
          const v = localStorage.getItem('agentWorkflowRun');
          if (v) return JSON.parse(v);
        } catch {}
        return {
          id: '',
          status: 'idle',
          missionLabel: '',
          startedAt: '',
          finishedAt: '',
          trace: [],
        };
      })(),
      setAgentWorkflowRun: (updater) => {
        const cur = get().agentWorkflowRun;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ agentWorkflowRun: next });
      },

      // ===== 运行历史（数组）=====
      agentWorkflowHistory: (() => {
        try {
          const v = localStorage.getItem('agentWorkflowHistory');
          const parsed = v ? JSON.parse(v) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })(),
      setAgentWorkflowHistory: (updater) => {
        const cur = get().agentWorkflowHistory;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ agentWorkflowHistory: next });
      },

      // ===== 运行动作队列（数组）=====
      agentWorkflowActions: (() => {
        try {
          const v = localStorage.getItem('agentWorkflowActions');
          const parsed = v ? JSON.parse(v) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })(),
      setAgentWorkflowActions: (updater) => {
        const cur = get().agentWorkflowActions;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ agentWorkflowActions: next });
      },
    }),
    {
      name: 'siliconstream-workflow-store',
      storage: createJSONStorage(() => localStorage),
      // agentWorkflowResult.loading 不持久化（避免刷新后误以为正在运行）
      partialize: (state) => ({
        agentWorkflowDraft: state.agentWorkflowDraft,
        workflowTemplates: state.workflowTemplates,
        activeWorkflowId: state.activeWorkflowId,
        selectedWorkflowNodeId: state.selectedWorkflowNodeId,
        agentWorkflowRun: state.agentWorkflowRun,
        agentWorkflowHistory: state.agentWorkflowHistory,
        agentWorkflowActions: state.agentWorkflowActions,
        agentWorkflowResult: state.agentWorkflowResult?.loading
          ? { ...state.agentWorkflowResult, loading: false }
          : state.agentWorkflowResult,
      }),
    }
  )
);
