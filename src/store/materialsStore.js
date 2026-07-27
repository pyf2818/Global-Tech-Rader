/**
 * Materials Store - 素材库 UI 状态
 *
 * 包含素材筛选、搜索、标签、时间范围、来源筛选、空间筛选、
 * 空间表单开关、添加素材弹窗开关 8 个 UI 状态。
 *
 * 这些状态是会话级 UI 状态（不持久化），跨 App.jsx / MaterialsPage / AddMaterialModal 共享。
 * 业务数据（materials/materialSpaces/bookmarks）由 useBookmarkMaterial hook 管理。
 *
 * 使用方式：
 *   import { useMaterialsStore } from './store';
 *   const filter = useMaterialsStore(s => s.materialFilter);
 */
import { create } from 'zustand';

// ============ Materials UI Store ============
export const useMaterialsStore = create((set) => ({
  // ===== 筛选与搜索 =====
  materialFilter: 'all',
  setMaterialFilter: (v) => set({ materialFilter: v }),

  materialSearch: '',
  setMaterialSearch: (v) => set({ materialSearch: v }),

  materialTags: [],
  setMaterialTags: (v) => set({ materialTags: v }),

  materialTimeRange: 'all',
  setMaterialTimeRange: (v) => set({ materialTimeRange: v }),

  materialSourceFilter: 'all',
  setMaterialSourceFilter: (v) => set({ materialSourceFilter: v }),

  materialSpaceFilter: 'all',
  setMaterialSpaceFilter: (v) => set({ materialSpaceFilter: v }),

  // ===== 弹窗开关 =====
  showSpaceForm: false,
  setShowSpaceForm: (v) => set({ showSpaceForm: v }),

  showAddMaterial: false,
  setShowAddMaterial: (v) => set({ showAddMaterial: v }),
}));
