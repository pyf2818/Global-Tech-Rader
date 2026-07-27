/**
 * Stock Store - 股市监控状态
 *
 * 包含：自动监控开关、监控间隔（分钟）、监控告警列表、告警面板开关、信号过滤 5 个状态。
 *
 * 持久化策略：autoMonitorEnabled / monitorInterval / signalFilter 持久化（用户偏好），
 * monitorAlerts / showAlertPanel 不持久化（会话级）。
 *
 * 使用方式：
 *   import { useStockStore } from './store';
 *   const autoMonitorEnabled = useStockStore(s => s.autoMonitorEnabled);
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

// ============ Stock Store ============
export const useStockStore = create(
  persist(
    (set, get) => ({
      // ===== 自动监控开关（持久化）=====
      autoMonitorEnabled: readLS('autoMonitorEnabled', false),
      setAutoMonitorEnabled: (v) => set({ autoMonitorEnabled: v }),

      // ===== 监控间隔，分钟（持久化）=====
      monitorInterval: readLS('monitorInterval', 60),
      setMonitorInterval: (v) => set({ monitorInterval: v }),

      // ===== 监控告警列表（不持久化）=====
      monitorAlerts: [],
      setMonitorAlerts: (updater) => {
        const cur = get().monitorAlerts;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ monitorAlerts: next });
      },

      // ===== 告警面板开关（不持久化）=====
      showAlertPanel: false,
      setShowAlertPanel: (v) => set({ showAlertPanel: v }),

      // ===== 股市信号过滤（持久化）=====
      signalFilter: readLS('signalFilter', 'all'),
      setSignalFilter: (v) => set({ signalFilter: v }),
    }),
    {
      name: 'siliconstream-stock-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化用户偏好
      partialize: (state) => ({
        autoMonitorEnabled: state.autoMonitorEnabled,
        monitorInterval: state.monitorInterval,
        signalFilter: state.signalFilter,
      }),
    }
  )
);
