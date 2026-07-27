/**
 * Profile Store - 用户画像与偏好状态
 *
 * 包含：领域分层、来源分层、特别关注、每日画像快照、资料表单、
 * 特别关注表单、当前编辑中的特别关注 ID、简报配置 8 个状态。
 *
 * 业务数据（domainTiers/sourceTiers/specialFollows/dailyProfileSnapshots/briefingConfig）
 * 通过 persist 中间件持久化到 localStorage，替代 App.jsx 中手写的 saveLS effect。
 * UI 状态（profileForm/specialFollowForm/editingSpecialFollowId）不持久化。
 *
 * 使用方式：
 *   import { useProfileStore } from './store';
 *   const domainTiers = useProfileStore(s => s.domainTiers);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { migratePreferenceState, migrateSpecialFollows } from '../domain/intelligence/profileTiers.js';

// 读取 localStorage 工具
function readLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v);
  } catch { return fallback; }
}

// ============ Profile Store ============
export const useProfileStore = create(
  persist(
    (set, get) => ({
      // ===== 领域分层（持久化）=====
      domainTiers: migratePreferenceState({
        'domainTiers:v1': readLS('domainTiers:v1', null),
        domainPriorities: readLS('domainPriorities', {}),
      }, 'domain'),
      setDomainTiers: (updater) => {
        const cur = get().domainTiers;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ domainTiers: next });
      },

      // ===== 来源分层（持久化）=====
      sourceTiers: migratePreferenceState({
        'sourceTiers:v1': readLS('sourceTiers:v1', null),
        sourcePriorities: readLS('sourcePriorities', {}),
      }, 'source'),
      setSourceTiers: (updater) => {
        const cur = get().sourceTiers;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ sourceTiers: next });
      },

      // ===== 每日画像快照（持久化）=====
      dailyProfileSnapshots: readLS('dailyProfileSnapshots', []),
      setDailyProfileSnapshots: (updater) => {
        const cur = get().dailyProfileSnapshots;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ dailyProfileSnapshots: next });
      },

      // ===== 特别关注（持久化）=====
      specialFollows: migrateSpecialFollows(
        readLS('specialFollows:v2', null) ?? readLS('specialFollows', [])
      ),
      setSpecialFollows: (updater) => {
        const cur = get().specialFollows;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ specialFollows: next });
      },

      // ===== 简报配置（持久化）=====
      briefingConfig: readLS('briefingConfig', { length: 'standard', includeRead: false }),
      setBriefingConfig: (updater) => {
        const cur = get().briefingConfig;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ briefingConfig: next });
      },

      // ===== UI 状态（不持久化）=====
      // 资料表单（打开资料弹窗时预填充）
      profileForm: { displayName: '', signature: '' },
      setProfileForm: (updater) => {
        const cur = get().profileForm;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ profileForm: next });
      },

      // 特别关注表单
      specialFollowForm: { type: 'source', target: '', note: '' },
      setSpecialFollowForm: (updater) => {
        const cur = get().specialFollowForm;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ specialFollowForm: next });
      },

      // 当前编辑中的特别关注 ID
      editingSpecialFollowId: null,
      setEditingSpecialFollowId: (v) => set({ editingSpecialFollowId: v }),
    }),
    {
      name: 'siliconstream-profile-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化业务数据，UI 临时状态不持久化
      partialize: (state) => ({
        domainTiers: state.domainTiers,
        sourceTiers: state.sourceTiers,
        dailyProfileSnapshots: state.dailyProfileSnapshots,
        specialFollows: state.specialFollows,
        briefingConfig: state.briefingConfig,
      }),
    }
  )
);
