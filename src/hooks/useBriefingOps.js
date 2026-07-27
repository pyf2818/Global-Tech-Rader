import { useCallback } from 'react';

/**
 * 简报导出操作：保存到素材库 / 导出为本地 markdown / 导出到创作中心。
 *
 * 从 App.jsx 提取，保持原行为不变（含自定义 material-toast 提示）。
 * 所有外部 state/setter 由调用方传入。
 */
export function useBriefingOps({ aiBrief, setMaterials, setArticles, setCurrentArticleId, setNav }) {
  // 保存简报到素材库
  const saveBriefToMaterials = useCallback(() => {
    if (!aiBrief.content) return;
    const title = `AI简报 · ${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN')}`;
    const newMaterial = {
      id: Date.now(),
      type: 'viewpoint',
      title,
      content: aiBrief.content,
      source: 'AI 每日简报',
      url: '',
      tags: ['AI简报'],
      note: '',
      createdAt: new Date().toISOString()
    };
    setMaterials(prev => [...prev, newMaterial]);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已保存到素材库';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }, [aiBrief, setMaterials]);

  // 导出简报为本地文件
  const exportBriefToFile = useCallback(() => {
    if (!aiBrief.content) return;
    const title = `AI简报_${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
    const blob = new Blob([aiBrief.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已下载为 markdown 文件';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }, [aiBrief]);

  // 导出简报到创作中心
  const exportBriefToEditor = useCallback(() => {
    if (!aiBrief.content) return;
    const title = `AI简报 · ${new Date(aiBrief.generatedAt).toLocaleDateString('zh-CN')}`;
    const newArticle = {
      id: Date.now(),
      title,
      content: aiBrief.content,
      template: 'blank',
      materials: [],
      tags: ['AI简报'],
      status: 'draft',
      spaceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    setArticles(prev => [...prev, newArticle]);
    setCurrentArticleId(newArticle.id);
    setNav('editor');
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已导出到创作中心';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }, [aiBrief, setArticles, setCurrentArticleId, setNav]);

  return { saveBriefToMaterials, exportBriefToFile, exportBriefToEditor };
}
