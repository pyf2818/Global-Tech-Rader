import { useState, useEffect, useCallback } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';

/**
 * 书签与素材库状态管理 hook
 *
 * 从 App.jsx 提取，管理：
 *   - bookmarks / materials / selectedMaterials / materialSpaces / newSpaceName
 *   - 所有书签/素材操作函数（toggleBookmark / toggleMaterial / ...）
 *   - localStorage 持久化
 *
 * 跨域依赖（由调用方以参数传入，避免循环依赖）：
 *   - creativeWorkspace: useCreativeWorkspace() 返回值，用于 addAsset/removeAsset
 *   - goNav: 导航函数
 *   - setCopilotPendingMessage: 设置 AI 工作站待发送消息
 *   - setShowAddMaterial: 控制添加素材弹窗
 *   - setShowSpaceForm: 控制素材空间表单
 *   - materialSpaceFilter / setMaterialSpaceFilter: 当前空间筛选
 *   - filteredMaterials: 经 useMaterialsMemos 派生的筛选后素材列表
 *   - buildNewsCardInsight: 可选，从资讯卡片构造洞察文本
 */
export function useBookmarkMaterial({
  creativeWorkspace,
  goNav,
  setCopilotPendingMessage,
  setShowAddMaterial,
  setShowSpaceForm,
  materialSpaceFilter,
  setMaterialSpaceFilter,
  filteredMaterials = [],
  buildNewsCardInsight,
} = {}) {
  const [bookmarks, setBookmarks] = useState(() => loadLS('bookmarks', []));
  const [materials, setMaterials] = useState(() => loadLS('materials', []));
  const [materialSpaces, setMaterialSpaces] = useState(() => loadLS('materialSpaces', []));
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  // 持久化：与原 App.jsx 统一同步 effect 保持一致，单独写一份只管本 hook 的 state
  useEffect(() => {
    saveLS('bookmarks', bookmarks);
  }, [bookmarks]);
  useEffect(() => {
    saveLS('materials', materials);
  }, [materials]);
  useEffect(() => {
    saveLS('materialSpaces', materialSpaces);
  }, [materialSpaces]);

  const isBookmarked = useCallback(
    (itemId) => bookmarks.some(b => b.itemId === itemId),
    [bookmarks]
  );

  const isInMaterials = useCallback(
    (itemId) => materials.some(m => m.originalItemId === itemId),
    [materials]
  );

  const toggleBookmark = useCallback((item) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.itemId === item.id);
      if (exists) return prev.filter(b => b.itemId !== item.id);
      return [...prev, {
        id: Date.now(),
        itemId: item.id,
        title: item.title,
        url: item.url,
        source: item.source,
        savedAt: new Date().toISOString(),
        isRead: false,
        readAt: null,
        summary: item.summary,
        tags: item.tags,
        region: item.region,
        mode: item.mode,
        publishedAt: item.publishedAt,
        category: item.category,
      }];
    });
  }, []);

  const toggleRead = useCallback((bookmarkId) => {
    setBookmarks(prev => prev.map(b => b.id === bookmarkId
      ? { ...b, isRead: !b.isRead, readAt: !b.isRead ? new Date().toISOString() : null }
      : b));
  }, []);

  // 根据内容智能判断素材类型
  const detectMaterialType = useCallback((item) => {
    if (item.materialType) return item.materialType;
    if (item.source === 'GitHub' || item.category === 'open-source' || item.fullName) return 'project';
    if (item.category) {
      const catMap = {
        'ai-models': 'data', 'ai-apps': 'data', 'ai-tools': 'data',
        'open-source': 'case', 'developer': 'case',
        'funding': 'data', 'ipo': 'data', 'mergers-acquisitions': 'data',
        'policy': 'viewpoint', 'regulation': 'viewpoint',
        'industry-trends': 'viewpoint', 'emerging-tech': 'viewpoint',
        'product-launch': 'case', 'partnership': 'case',
      };
      return catMap[item.category] || 'quote';
    }
    return 'quote';
  }, []);

  // 素材库操作
  const toggleMaterial = useCallback((item, type = null, note = '') => {
    if (isInMaterials(item.id)) {
      setMaterials(prev => prev.filter(m => m.originalItemId !== item.id));
      creativeWorkspace?.removeAsset?.(item.id);
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '已从素材库移除';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } else {
      const detectedType = type || detectMaterialType(item);
      const tags = Array.from(new Set([
        ...(item.tags || []),
        ...(item.topics || []),
        item.language,
        item.category,
      ].filter(Boolean)));
      const newMaterial = {
        id: Date.now(),
        type: detectedType,
        title: item.title,
        content: item.summary || item.title,
        fullContent: item.fullContent || item.content || item.summary || item.title,
        source: item.source,
        url: item.url,
        tags,
        imageUrl: item.imageUrl || '',
        insight: item.insight || (buildNewsCardInsight ? buildNewsCardInsight(item) : null),
        metadata: item.metadata || null,
        originalItemId: item.id,
        note,
        createdAt: new Date().toISOString(),
      };
      setMaterials(prev => [...prev, newMaterial]);
      creativeWorkspace?.addAsset?.(newMaterial);
      const toast = document.createElement('div');
      toast.className = 'material-toast';
      toast.textContent = '✓ 已添加到素材库';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  }, [isInMaterials, detectMaterialType, creativeWorkspace, buildNewsCardInsight]);

  const addManualMaterial = useCallback(({ title, content, type, source, url, tags, note, spaceId, imageUrl, fullContent, insight, metadata }) => {
    const newMaterial = {
      id: Date.now(),
      type,
      title,
      content,
      fullContent: fullContent || content,
      source: source || '手动添加',
      url: url || '',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      note,
      spaceId: spaceId ? Number(spaceId) : null,
      imageUrl: imageUrl || '',
      insight: insight || null,
      metadata: metadata || null,
      createdAt: new Date().toISOString(),
    };
    setMaterials(prev => [...prev, newMaterial]);
    setShowAddMaterial?.(false);
    return newMaterial;
  }, [setShowAddMaterial]);

  const continueMaterialInWorkbench = useCallback((material) => {
    if (!material) return;
    setSelectedMaterials([material.id]);
    setCopilotPendingMessage?.([
      `请基于这条素材继续研究：${material.title || '未命名素材'}`,
      '',
      '【素材内容】',
      String(material.fullContent || material.content || '').slice(0, 3500),
      '',
      '请输出：1）核心判断 2）证据缺口 3）下一步研究清单 4）可沉淀为文章的结构。',
    ].join('\n'));
    goNav?.('home');
    showToast('已发送到 AI 工作站继续研究');
  }, [goNav, setCopilotPendingMessage]);

  const removeMaterial = useCallback((id) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  }, []);

  const batchRemoveMaterials = useCallback((ids) => {
    setMaterials(prev => prev.filter(m => !ids.includes(m.id)));
    setSelectedMaterials([]);
  }, []);

  const updateMaterialTags = useCallback((id, tags) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, tags } : m));
  }, []);

  const toggleMaterialSelection = useCallback((id) => {
    setSelectedMaterials(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const selectAllMaterials = useCallback(() => {
    setSelectedMaterials(filteredMaterials.map(m => m.id));
  }, [filteredMaterials]);

  const clearMaterialSelection = useCallback(() => {
    setSelectedMaterials([]);
  }, []);

  const updateMaterialNote = useCallback((id, note) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, note } : m));
  }, []);

  const assignMaterialsToSpace = useCallback((ids, spaceId) => {
    setMaterials(prev => prev.map(m => ids.includes(m.id) ? { ...m, spaceId } : m));
    setSelectedMaterials([]);
  }, []);

  const createMaterialSpace = useCallback(() => {
    if (!newSpaceName.trim()) return;
    const newSpace = { id: Date.now(), name: newSpaceName.trim(), createdAt: new Date().toISOString() };
    setMaterialSpaces(prev => [...prev, newSpace]);
    setNewSpaceName('');
    setShowSpaceForm?.(false);
  }, [newSpaceName, setShowSpaceForm]);

  const deleteMaterialSpace = useCallback((id) => {
    setMaterialSpaces(prev => prev.filter(s => s.id !== id));
    setMaterials(prev => prev.map(m => m.spaceId === id ? { ...m, spaceId: null } : m));
    if (materialSpaceFilter === String(id)) setMaterialSpaceFilter?.('all');
  }, [materialSpaceFilter, setMaterialSpaceFilter]);

  const toggleMaterialStar = useCallback((id) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  }, []);

  const exportMaterials = useCallback(() => {
    const data = JSON.stringify(materials, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `siliconstream-materials-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [materials]);

  const importMaterials = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          setMaterials(prev => [...prev, ...imported.map(m => ({ ...m, id: Date.now() + Math.random() }))]);
          const toast = document.createElement('div');
          toast.className = 'material-toast';
          toast.textContent = `✓ 成功导入 ${imported.length} 条素材`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2000);
        }
      } catch (err) {
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    // state
    bookmarks,
    setBookmarks,
    materials,
    setMaterials,
    selectedMaterials,
    setSelectedMaterials,
    materialSpaces,
    setMaterialSpaces,
    newSpaceName,
    setNewSpaceName,
    // operations
    toggleBookmark,
    isBookmarked,
    isInMaterials,
    toggleRead,
    detectMaterialType,
    toggleMaterial,
    addManualMaterial,
    continueMaterialInWorkbench,
    removeMaterial,
    batchRemoveMaterials,
    updateMaterialTags,
    toggleMaterialSelection,
    selectAllMaterials,
    clearMaterialSelection,
    updateMaterialNote,
    assignMaterialsToSpace,
    createMaterialSpace,
    deleteMaterialSpace,
    toggleMaterialStar,
    exportMaterials,
    importMaterials,
  };
}
