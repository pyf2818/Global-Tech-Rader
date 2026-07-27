/**
 * GitHub Store - GitHub 项目 AI 情报状态
 *
 * 包含：githubInsights（per-repo 情报结果）、githubInsightLoading（加载中状态）2 个状态。
 *
 * 持久化策略：githubInsights 持久化（避免刷新丢失已分析的项目），loading 状态不持久化。
 *
 * 使用方式：
 *   import { useGithubStore } from './store';
 *   const githubInsights = useGithubStore(s => s.githubInsights);
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

// ============ GitHub Store ============
export const useGithubStore = create(
  persist(
    (set, get) => ({
      // ===== GitHub 项目 AI 情报（per-repo，持久化）=====
      githubInsights: readLS('githubInsights', {}),
      setGithubInsights: (updater) => {
        const cur = get().githubInsights;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ githubInsights: next });
      },

      // ===== 加载中状态（不持久化）=====
      githubInsightLoading: {},
      setGithubInsightLoading: (updater) => {
        const cur = get().githubInsightLoading;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ githubInsightLoading: next });
      },
    }),
    {
      name: 'siliconstream-github-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 githubInsights
      partialize: (state) => ({ githubInsights: state.githubInsights }),
    }
  )
);
