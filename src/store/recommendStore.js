/**
 * Recommend Store - 推荐反馈与追踪状态
 *
 * 包含：关注关键词、置顶关键词、推荐反馈、反馈事件、推荐快照、
 * 搜索历史、追踪目标、阅读历史、搜索 UI（开关/排序/焦点）、
 * 时间轴展开、导出过滤 14 个核心状态。
 *
 * 持久化策略：业务数据全部持久化到 localStorage（替代 App.jsx 手写 saveLS effect）。
 * - followKeywords / pinnedKeywords / trackTargets / readingHistory / searchHistory:
 *   简单 JSON 数组
 * - recommendationFeedback / recommendationFeedbackEvents: 复杂结构对象/事件流
 * - recommendationSnapshots: 由 createSnapshotStore 管理，本 store 仅缓存其 list() 结果
 * - searchSort / exportCategory / exportRange: 用户偏好（持久化）
 * - searchOpen / focusedIndex / expandedEvents: 会话级 UI 临时状态（不持久化）
 *
 * 使用方式：
 *   import { useRecommendStore } from './store';
 *   const followKeywords = useRecommendStore(s => s.followKeywords);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSnapshotStore } from '../domain/intelligence/snapshotStore.js';

// 读取 localStorage 工具
function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

// ============ Recommend Store ============
export const useRecommendStore = create(
  persist(
    (set, get) => ({
      // ===== 关键词 =====
      followKeywords: readLS('followKeywords', []),
      setFollowKeywords: (updater) => {
        const cur = get().followKeywords;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ followKeywords: next });
      },

      pinnedKeywords: readLS('pinnedKeywords', []),
      setPinnedKeywords: (updater) => {
        const cur = get().pinnedKeywords;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ pinnedKeywords: next });
      },

      // ===== 推荐反馈 =====
      recommendationFeedback: readLS('recommendationFeedback', {
        hiddenIds: [],
        boostedCategories: {},
        mutedSources: {},
        trackedTerms: {},
      }),
      setRecommendationFeedback: (updater) => {
        const cur = get().recommendationFeedback;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ recommendationFeedback: next });
      },

      // 反馈事件流（v2 格式）
      recommendationFeedbackEvents: readLS('recommendationFeedback:v2', []),
      setRecommendationFeedbackEvents: (updater) => {
        const cur = get().recommendationFeedbackEvents;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ recommendationFeedbackEvents: next });
      },

      // ===== 推荐快照（由 createSnapshotStore 管理底层存储）=====
      // 注意：snapshotStoreRef 由 App.jsx 通过 useRef 持有，本 store 只缓存 list() 结果。
      // App.jsx 在需要刷新时调用 setRecommendationSnapshots(snapshotStoreRef.current.list())
      recommendationSnapshots: (() => {
        try {
          const store = createSnapshotStore(localStorage);
          return store.list();
        } catch {
          return [];
        }
      })(),
      setRecommendationSnapshots: (updater) => {
        const cur = get().recommendationSnapshots;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ recommendationSnapshots: next });
      },

      // ===== 搜索历史（持久化）=====
      searchHistory: readLS('searchHistory', []),
      setSearchHistory: (updater) => {
        const cur = get().searchHistory;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ searchHistory: next });
      },

      // ===== 追踪目标（持久化）=====
      trackTargets: readLS('trackTargets', []),
      setTrackTargets: (updater) => {
        const cur = get().trackTargets;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ trackTargets: next });
      },

      // ===== 阅读历史（持久化）=====
      readingHistory: readLS('readingHistory', []),
      setReadingHistory: (updater) => {
        const cur = get().readingHistory;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ readingHistory: next });
      },

      // ===== 搜索 UI 临时状态（searchSort 持久化，其他不持久化）=====
      searchOpen: false,
      setSearchOpen: (v) => set({ searchOpen: v }),

      searchSort: readLS('searchSort', 'time'),
      setSearchSort: (v) => set({ searchSort: v }),

      focusedIndex: -1,
      setFocusedIndex: (v) => set({ focusedIndex: v }),

      // ===== 时间轴展开（不持久化）=====
      expandedEvents: {},
      setExpandedEvents: (updater) => {
        const cur = get().expandedEvents;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ expandedEvents: next });
      },

      // ===== 导出过滤（持久化，用户偏好）=====
      exportCategory: readLS('exportCategory', 'all'),
      setExportCategory: (v) => set({ exportCategory: v }),

      exportRange: readLS('exportRange', 'all'),
      setExportRange: (v) => set({ exportRange: v }),
    }),
    {
      name: 'siliconstream-recommend-store',
      storage: createJSONStorage(() => localStorage),
      // 全部持久化（除会话级 UI 临时状态）
      partialize: (state) => ({
        followKeywords: state.followKeywords,
        pinnedKeywords: state.pinnedKeywords,
        recommendationFeedback: state.recommendationFeedback,
        recommendationFeedbackEvents: state.recommendationFeedbackEvents,
        recommendationSnapshots: state.recommendationSnapshots,
        searchHistory: state.searchHistory,
        trackTargets: state.trackTargets,
        readingHistory: state.readingHistory,
        searchSort: state.searchSort,
        exportCategory: state.exportCategory,
        exportRange: state.exportRange,
      }),
    }
  )
);
