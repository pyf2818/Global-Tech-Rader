/**
 * Elf Store - AI 助手人格设定
 *
 * 包含：助手头像、头像历史、助手名字 3 个状态。
 * 全部持久化到 localStorage。
 *
 * 使用方式：
 *   import { useElfStore } from './store';
 *   const elfAvatar = useElfStore(s => s.elfAvatar);
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ Elf Store ============
export const useElfStore = create(
  persist(
    (set, get) => ({
      // ===== 助手头像 =====
      elfAvatar: (() => {
        try { return localStorage.getItem('elfAvatar') || ''; }
        catch { return ''; }
      })(),
      setElfAvatar: (v) => {
        set({ elfAvatar: v });
        try {
          if (v) localStorage.setItem('elfAvatar', v);
          else localStorage.removeItem('elfAvatar');
        } catch {}
      },

      // ===== 头像历史 =====
      elfAvatarHistory: (() => {
        try { return JSON.parse(localStorage.getItem('elfAvatarHistory') || '[]'); }
        catch { return []; }
      })(),
      setElfAvatarHistory: (updater) => {
        const cur = get().elfAvatarHistory;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ elfAvatarHistory: next });
      },

      // ===== 助手名字 =====
      elfName: (() => {
        try { return localStorage.getItem('elfName') || '艾尔'; }
        catch { return '艾尔'; }
      })(),
      setElfName: (v) => {
        set({ elfName: v });
        try { localStorage.setItem('elfName', v); } catch {}
      },
    }),
    {
      name: 'siliconstream-elf-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        elfAvatar: state.elfAvatar,
        elfAvatarHistory: state.elfAvatarHistory,
        elfName: state.elfName,
      }),
    }
  )
);
