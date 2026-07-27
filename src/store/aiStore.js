/**
 * AI Store - AI 助手与简报状态
 *
 * 包含：AI Insights、AI 简报、Elf 引用上下文、Copilot 待发消息 4 个核心状态。
 *
 * 持久化策略：
 * - aiBrief.content 持久化（保留最近一次生成的简报内容，刷新后可见）
 * - aiInsights / elfQuotedContext / copilotPendingMessage 不持久化（会话级临时状态）
 *
 * 使用方式：
 *   import { useAiStore } from './store';
 *   const aiBrief = useAiStore(s => s.aiBrief);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 读取 localStorage 工具
function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

// ============ AI Store ============
export const useAiStore = create(
  persist(
    (set, get) => ({
      // ===== AI Insights（不持久化）=====
      aiInsights: { loading: false, data: null, error: '' },
      setAiInsights: (updater) => {
        const cur = get().aiInsights;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ aiInsights: next });
      },

      // ===== AI 简报（content 持久化）=====
      aiBrief: (() => {
        const saved = readLS('aiBrief', null);
        return {
          loading: false,
          content: saved?.content || '',
          error: '',
          generatedAt: saved?.generatedAt || null,
        };
      })(),
      setAiBrief: (updater) => {
        const cur = get().aiBrief;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ aiBrief: next });
      },

      // ===== Elf 引用上下文（不持久化）=====
      elfQuotedContext: null,
      setElfQuotedContext: (v) => set({ elfQuotedContext: v }),

      // ===== Copilot 待发消息（不持久化）=====
      copilotPendingMessage: '',
      setCopilotPendingMessage: (v) => set({ copilotPendingMessage: v }),
    }),
    {
      name: 'siliconstream-ai-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 aiBrief.content 与 generatedAt（loading/error 不持久化）
      partialize: (state) => ({
        aiBrief: state.aiBrief?.loading
          ? { ...state.aiBrief, loading: false }
          : { loading: false, content: state.aiBrief?.content || '', error: '', generatedAt: state.aiBrief?.generatedAt || null },
      }),
    }
  )
);
