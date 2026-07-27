/**
 * 全局状态 Store - 使用 Zustand
 *
 * 设计原则：
 * 1. 按业务领域分 slice，每个 slice 独立文件
 * 2. 持久化状态通过 persist 中间件自动同步 localStorage
 * 3. 跨 slice 共享通过组合 hook
 *
 * 使用方式：
 *   import { useUiStore, useNewsStore } from '@/store';
 *   const nav = useUiStore(s => s.nav);
 *   const setNav = useUiStore(s => s.setNav);
 *
 * 或选择性订阅：
 *   const { nav, sidebarCollapsed } = useUiStore();
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ UI Store ============
// 全局 UI 状态：导航、侧边栏、模态框开关、主题
export const useUiStore = create(
  persist(
    (set, get) => ({
      // 导航
      nav: localStorage.getItem('nav') || 'home',
      setNav: (nav) => {
        set({ nav });
        try { localStorage.setItem('nav', nav); } catch {}
      },

      // 侧边栏折叠（首次访问默认折叠，腾出视觉空间）
      sidebarCollapsed: (() => {
        const stored = localStorage.getItem('sidebarCollapsed');
        return stored === null ? true : stored === 'true';
      })(),
      setSidebarCollapsed: (v) => {
        set({ sidebarCollapsed: v });
        try { localStorage.setItem('sidebarCollapsed', String(v)); } catch {}
      },

      // 移动端菜单
      mobileMenuOpen: false,
      setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),

      // 右栏上下文组展开
      contextGroupOpen: localStorage.getItem('contextGroupOpen') !== 'false',
      setContextGroupOpen: (v) => {
        set({ contextGroupOpen: v });
        try { localStorage.setItem('contextGroupOpen', String(v)); } catch {}
      },

      // 上下文导航组展开（侧边栏，默认空数组）
      expandedNavGroups: (() => {
        try { return JSON.parse(localStorage.getItem('expandedNavGroups') || '[]') || []; }
        catch { return []; }
      })(),
      setExpandedNavGroups: (v) => {
        set({ expandedNavGroups: v });
        try { localStorage.setItem('expandedNavGroups', JSON.stringify(v)); } catch {}
      },
      toggleNavGroup: (id) => {
        const cur = get().expandedNavGroups;
        const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
        set({ expandedNavGroups: next });
        try { localStorage.setItem('expandedNavGroups', JSON.stringify(next)); } catch {}
      },

      // 主题
      themeMode: localStorage.getItem('themeMode') || 'dark',
      setThemeMode: (mode) => {
        set({ themeMode: mode });
        try { localStorage.setItem('themeMode', mode); } catch {}
      },

      // 主题调色板（champagne / aurora / ...）
      palette: (() => {
        try {
          const saved = localStorage.getItem('palette');
          // PALETTES 在 App.jsx 中定义，这里仅做存在性检查的占位
          return saved || 'champagne';
        } catch { return 'champagne'; }
      })(),
      setPalette: (v) => {
        set({ palette: v });
        try { localStorage.setItem('palette', v); } catch {}
      },

      // 球图全屏
      globeFullscreenOpen: false,
      setGlobeFullscreenOpen: (v) => set({ globeFullscreenOpen: v }),

      // 右侧上下文面板折叠
      panelCollapsed: (() => {
        try { return localStorage.getItem('panelCollapsed') === 'true'; }
        catch { return false; }
      })(),
      setPanelCollapsed: (v) => {
        set({ panelCollapsed: v });
        try { localStorage.setItem('panelCollapsed', String(v)); } catch {}
      },

      // 资料中心分页
      profilePage: 1,
      setProfilePage: (v) => set({ profilePage: v }),

      // 模态框开关
      showSettings: false,
      setShowSettings: (v) => set({ showSettings: v }),
      settingsTab: 'general',
      setSettingsTab: (v) => set({ settingsTab: v }),
      showThemePicker: false,
      setShowThemePicker: (v) => set({ showThemePicker: v }),
      showProfileModal: false,
      setShowProfileModal: (v) => set({ showProfileModal: v }),
      showShortcuts: false,
      setShowShortcuts: (v) => set({ showShortcuts: v }),
      showCommandPalette: false,
      setShowCommandPalette: (v) => set({ showCommandPalette: v }),
      showUserMenu: false,
      setShowUserMenu: (v) => set({ showUserMenu: v }),
      showNewspaperOverlay: false,
      setShowNewspaperOverlay: (v) => set({ showNewspaperOverlay: v }),
      showRightPanel: false,
      setShowRightPanel: (v) => set({ showRightPanel: v }),

      // 编辑器全屏
      editorFullscreen: false,
      setEditorFullscreen: (v) => set({ editorFullscreen: v }),

      // 返回顶部按钮
      showBackToTop: false,
      setShowBackToTop: (v) => set({ showBackToTop: v }),

      // 滚动资讯暂停
      scrollingNewsPaused: false,
      setScrollingNewsPaused: (v) => set({ scrollingNewsPaused: v }),

      // 更多导航（折叠菜单）
      moreNavOpen: false,
      setMoreNavOpen: (v) => set({ moreNavOpen: v }),

      // ===== Workflow 编辑器 UI 状态（非持久化，会话级）=====
      agentFilter: '全部',
      setAgentFilter: (v) => set({ agentFilter: v }),
      agentPromptRefining: false,
      setAgentPromptRefining: (v) => set({ agentPromptRefining: v }),
      agentWorkflowPrompt: '',
      setAgentWorkflowPrompt: (v) => set({ agentWorkflowPrompt: v }),
      agentWorkflowScope: 'daily',
      setAgentWorkflowScope: (v) => set({ agentWorkflowScope: v }),
      newWorkflowNodeType: 'llm',
      setNewWorkflowNodeType: (v) => set({ newWorkflowNodeType: v }),
      draggingWorkflowNodeId: '',
      setDraggingWorkflowNodeId: (v) => set({ draggingWorkflowNodeId: v }),

      // 最近访问（type/value/label/timestamp 对象数组，最多 3 条）
      recentVisits: (() => {
        try { return JSON.parse(localStorage.getItem('recentVisits')) || []; }
        catch { return []; }
      })(),
      // setRecentVisits 支持直接值或 updater 函数（兼容 React setState 习惯）
      setRecentVisits: (updater) => {
        const cur = get().recentVisits;
        const next = typeof updater === 'function' ? updater(cur) : updater;
        set({ recentVisits: next });
        try { localStorage.setItem('recentVisits', JSON.stringify(next)); } catch {}
      },
      addRecentVisit: (type, value, label) => {
        const cur = get().recentVisits;
        const filtered = cur.filter(v => !(v.type === type && v.value === value));
        const next = [{ type, value, label, timestamp: Date.now() }, ...filtered].slice(0, 3);
        set({ recentVisits: next });
        try { localStorage.setItem('recentVisits', JSON.stringify(next)); } catch {}
      },
      clearRecentVisits: () => {
        set({ recentVisits: [] });
        try { localStorage.removeItem('recentVisits'); } catch {}
      },
    }),
    {
      name: 'siliconstream-ui-store',
      storage: createJSONStorage(() => localStorage),
      // 仅持久化部分字段（避免临时模态框状态被保存）
      partialize: (state) => ({
        nav: state.nav,
        sidebarCollapsed: state.sidebarCollapsed,
        contextGroupOpen: state.contextGroupOpen,
        expandedNavGroups: state.expandedNavGroups,
        themeMode: state.themeMode,
        palette: state.palette,
        panelCollapsed: state.panelCollapsed,
        recentVisits: state.recentVisits,
      }),
    }
  )
);

// ============ Lightbox Store ============
// 跨多页面共享的图片预览状态
export const useLightboxStore = create((set) => ({
  lightbox: { open: false, src: '', title: '', images: [], index: 0 },
  setLightbox: (lightbox) => set({ lightbox }),
  openLightbox: (src, title, images, index = 0) =>
    set({ lightbox: { open: true, src, title, images: images || [], index } }),
  closeLightbox: () =>
    set((state) => ({ lightbox: { ...state.lightbox, open: false } })),
  nextImage: () =>
    set((state) => {
      if (!state.lightbox.images?.length) return {};
      const next = (state.lightbox.index + 1) % state.lightbox.images.length;
      return { lightbox: { ...state.lightbox, index: next, src: state.lightbox.images[next] } };
    }),
  prevImage: () =>
    set((state) => {
      if (!state.lightbox.images?.length) return {};
      const prev = (state.lightbox.index - 1 + state.lightbox.images.length) % state.lightbox.images.length;
      return { lightbox: { ...state.lightbox, index: prev, src: state.lightbox.images[prev] } };
    }),
}));

// ============ Workflow Store ============
// 智能体工作流状态：草稿、模板、运行记录、历史、动作队列、选中节点
export { useWorkflowStore } from './workflowStore.js';

// ============ Materials UI Store ============
// 素材库 UI 状态：筛选、搜索、标签、弹窗开关
export { useMaterialsStore } from './materialsStore.js';

// ============ Profile Store ============
// 用户画像与偏好：领域分层、来源分层、特别关注、简报配置、表单
export { useProfileStore } from './profileStore.js';

// ============ News Store ============
// 新闻流与搜索：分类/筛选/视图模式/搜索/列表/分页/错误
export { useNewsStore } from './newsStore.js';

// ============ Recommend Store ============
// 推荐反馈与追踪：关键词/反馈/快照/搜索历史/追踪目标/阅读历史
export { useRecommendStore } from './recommendStore.js';

// ============ AI Store ============
// AI 助手与简报：aiInsights/aiBrief/elfQuotedContext/copilotPendingMessage
export { useAiStore } from './aiStore.js';

// ============ GitHub Store ============
// GitHub 项目 AI 情报：githubInsights / githubInsightLoading
export { useGithubStore } from './githubStore.js';

// ============ Stock Store ============
// 股市监控：autoMonitorEnabled / monitorInterval / monitorAlerts / showAlertPanel
export { useStockStore } from './stockStore.js';

// ============ Elf Store ============
// AI 助手人格：elfAvatar / elfAvatarHistory / elfName
export { useElfStore } from './elfStore.js';

// ============ Source Store ============
// 信息源管理：数据缓存 + 筛选
export { useSourceStore } from './sourceStore.js';
