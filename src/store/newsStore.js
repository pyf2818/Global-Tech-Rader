/**
 * News Store - 新闻流与搜索状态
 *
 * 包含：分类/频道/模式筛选、视图模式、搜索查询、新闻列表数据、
 * 分页/加载状态、错误信息、屏蔽词等 15 个核心状态。
 *
 * 持久化策略：
 * - 仅持久化用户偏好（viewMode）—— 通过 partialize 限定
 * - 数据类状态（items/loading/newsPage 等）不持久化，每次刷新从 /api/news 拉取
 *
 * 使用方式：
 *   import { useNewsStore } from './store';
 *   const items = useNewsStore(s => s.items);
 *   const setItems = useNewsStore(s => s.setItems);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ News Store ============
export const useNewsStore = create(
  persist(
    (set) => ({
      // ===== 筛选与视图 =====
      category: 'all',
      setCategory: (v) => set({ category: v }),

      categoryOpen: false,
      setCategoryOpen: (v) => set({ categoryOpen: v }),

      verticalChannel: 'all',
      setVerticalChannel: (v) => set({ verticalChannel: v }),

      mode: 'all',
      setMode: (v) => set({ mode: v }),

      sourceFilter: 'all',
      setSourceFilter: (v) => set({ sourceFilter: v }),

      selectedNewsDate: new Date().toISOString().slice(0, 10),
      setSelectedNewsDate: (v) => set({ selectedNewsDate: v }),

      // 视图模式（持久化）：compact / standard / card
      viewMode: (() => {
        try { return localStorage.getItem('viewMode') || 'standard'; }
        catch { return 'standard'; }
      })(),
      setViewMode: (v) => {
        set({ viewMode: v });
        try { localStorage.setItem('viewMode', v); } catch {}
      },

      // ===== 搜索 =====
      query: '',
      setQuery: (v) => set({ query: v }),

      debouncedQuery: '',
      setDebouncedQuery: (v) => set({ debouncedQuery: v }),

      // ===== 新闻列表数据（不持久化）=====
      items: [],
      setItems: (updater) => {
        set((state) => ({ items: typeof updater === 'function' ? updater(state.items) : updater }));
      },

      loading: true,
      setLoading: (v) => set({ loading: v }),

      loadingMore: false,
      setLoadingMore: (v) => set({ loadingMore: v }),

      // ===== 分页 =====
      newsPage: 0,
      setNewsPage: (updater) => {
        set((state) => ({ newsPage: typeof updater === 'function' ? updater(state.newsPage) : updater }));
      },

      newsHasMore: true,
      setNewsHasMore: (v) => set({ newsHasMore: v }),

      renderLimit: 40,
      setRenderLimit: (updater) => {
        set((state) => ({ renderLimit: typeof updater === 'function' ? updater(state.renderLimit) : updater }));
      },

      // ===== 错误与屏蔽 =====
      error: '',
      setError: (v) => set({ error: v }),

      blocked: '',
      setBlocked: (v) => set({ blocked: v }),
    }),
    {
      name: 'siliconstream-news-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化用户偏好（viewMode），其余状态会话级
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
);
