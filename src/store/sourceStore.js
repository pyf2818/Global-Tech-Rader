/**
 * Source Store - 信息源管理状态
 *
 * 包含：源数据缓存（allSources/sourceGrades/serverCategories）、源筛选（searchQuery/
 * customSourceFilter/regionFilter/statusFilter/gradeFilter/sourceTypeTab）9 个状态。
 *
 * 持久化策略：仅持久化用户偏好筛选（gradeFilter/sourceTypeTab/customSourceFilter/
 * regionFilter/statusFilter），数据类状态（allSources/sourceGrades/serverCategories）
 * 不持久化（每次刷新从 /api/meta 拉取），searchQuery 不持久化。
 *
 * 使用方式：
 *   import { useSourceStore } from './store';
 *   const allSources = useSourceStore(s => s.allSources);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ Source Store ============
export const useSourceStore = create(
  persist(
    (set, get) => ({
      // ===== 数据类状态（不持久化）=====
      allSources: [],
      setAllSources: (updater) => {
        const cur = get().allSources;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ allSources: next });
      },

      sourceGrades: {},
      setSourceGrades: (updater) => {
        const cur = get().sourceGrades;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ sourceGrades: next });
      },

      serverCategories: [],
      setServerCategories: (updater) => {
        const cur = get().serverCategories;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ serverCategories: next });
      },

      // ===== 筛选（部分持久化）=====
      searchQuery: '',
      setSearchQuery: (v) => set({ searchQuery: v }),

      customSourceFilter: 'all',
      setCustomSourceFilter: (v) => set({ customSourceFilter: v }),

      regionFilter: 'all',
      setRegionFilter: (v) => set({ regionFilter: v }),

      statusFilter: 'all',
      setStatusFilter: (v) => set({ statusFilter: v }),

      gradeFilter: 'all',
      setGradeFilter: (v) => set({ gradeFilter: v }),

      sourceTypeTab: 'builtin',
      setSourceTypeTab: (v) => set({ sourceTypeTab: v }),
    }),
    {
      name: 'siliconstream-source-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化用户偏好筛选
      partialize: (state) => ({
        customSourceFilter: state.customSourceFilter,
        regionFilter: state.regionFilter,
        statusFilter: state.statusFilter,
        gradeFilter: state.gradeFilter,
        sourceTypeTab: state.sourceTypeTab,
      }),
    }
  )
);
