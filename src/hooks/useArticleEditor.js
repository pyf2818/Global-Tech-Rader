import { useCallback, useRef, useState } from 'react';
import { loadLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';
import { renderMarkdown } from '../utils/markdown.jsx';
import { normalizeAsset } from '../domain/creative/assetModel.js';
import { exportDocument } from '../domain/creative/exportEngine.js';
import { saveDocumentVersion } from '../domain/creative/versionStore.js';

// 文章状态/模板常量（与 src/constants/index.jsx 保持一致，避免循环依赖）
export const ARTICLE_STATUS = { draft: '草稿', published: '已发布', archived: '已归档' };
export const ARTICLE_TEMPLATES = { blank: '空白', briefing: '每日简报', analysis: '深度分析', tech: '技术解读' };
export const ARTICLE_TEMPLATE_CONTENT = {
  blank: '',
  briefing: `# 每日科技简报\n\n> 日期：{DATE}\n\n## 今日要闻\n\n1. \n2. \n3. \n\n## 重点分析\n\n### 事件背景\n\n\n### 影响解读\n\n\n## 趋势观察\n\n\n## 明日关注\n\n`,
  analysis: `# 深度分析：标题\n\n## 摘要\n\n用 2-3 句话概括本文核心观点。\n\n## 背景\n\n介绍事件的来龙去脉，提供必要的上下文信息。\n\n## 核心观点\n\n### 观点一\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n### 观点二\n\n- 论据支撑\n- 数据引用\n- 案例说明\n\n## 影响分析\n\n- 对行业的影响\n- 对用户的影响\n- 对技术生态的影响\n\n## 趋势预判\n\n基于以上分析，对未来趋势做出预判。\n\n## 参考资料\n\n1. \n2. \n`,
  tech: `# 技术解读：标题\n\n## 概述\n\n简要介绍要解读的技术/产品/工具。\n\n## 技术原理\n\n### 核心概念\n\n解释关键技术概念。\n\n### 架构设计\n\n描述技术的架构或设计思路。\n\n## 使用场景\n\n- 场景一：\n- 场景二：\n- 场景三：\n\n## 代码示例\n\n\`\`\`javascript\n// 示例代码\n\`\`\`\n\n## 优缺点分析\n\n### 优势\n\n- \n- \n\n### 局限\n\n- \n- \n\n## 总结\n\n总结技术的价值和适用场景。\n\n## 参考资料\n\n- \n`
};

/**
 * 文章编辑器 hook：管理文章/创作空间/编辑器状态与全部操作函数。
 *
 * @param {object} opts
 * @param {object} opts.llmConfig      LLM 配置（baseUrl/apiKey/selectedModel）
 * @param {Array}  opts.materials      素材库数组（用于引用与 citation）
 * @param {React.RefObject} opts.editorTextareaRef 编辑器 textarea 引用
 * @returns {{
 *   articles, setArticles, currentArticleId, setCurrentArticleId, editorTab, setEditorTab,
 *   editorCursorPos, setEditorCursorPos, showTemplateMenu, setShowTemplateMenu,
 *   showAiPanel, setShowAiPanel, showImagePanel, setShowImagePanel,
 *   aiResult, setAiResult, aiCustomPrompt, setAiCustomPrompt,
 *   autoSaveTimer, setAutoSaveTimer, lastSavedAt, setLastSavedAt,
 *   articleTagInput, setArticleTagInput, editingArticleTag, setEditingArticleTag,
 *   articleSpaces, setArticleSpaces,
 *   articleSpaceFilter, setArticleSpaceFilter,
 *   articleSpaceFormOpen, setArticleSpaceFormOpen,
 *   newArticleSpaceName, setNewArticleSpaceName,
 *   articleSpaceForNewArticle, setArticleSpaceForNewArticle,
 *   articleSearch, setArticleSearch, articleStatusFilter, setArticleStatusFilter,
 *   articleTemplateFilter, setArticleTemplateFilter, articleSort, setArticleSort,
 *   articleExportFilter, setArticleExportFilter,
 *   articleMaterialSpaceFilter, setArticleMaterialSpaceFilter,
 *   createArticle, updateArticle, deleteArticle, duplicateArticle,
 *   addArticleTag, removeArticleTag, triggerAutoSave,
 *   handleContentChange, handleTitleChange, insertAtCursor, insertMaterialAtCursor,
 *   removeLinkedMaterial, handleImageUpload, handlePaste,
 *   createArticleSpace, deleteArticleSpace, assignArticleToSpace, batchAssignArticlesToSpace,
 *   insertAiResult, clearAiResult, aiAction,
 *   exportArticleToFile, copyArticleAsRichText, exportArticle,
 *   articleCitations, saveArticleVersion,
 * }}
 */
export function useArticleEditor({ llmConfig, materials, editorTextareaRef }) {
  // 文章与空间数据
  const [articles, setArticles] = useState(() => loadLS('articles', []));
  const [articleSpaces, setArticleSpaces] = useState(() => loadLS('articleSpaces', []));

  // 当前编辑器状态
  const [currentArticleId, setCurrentArticleId] = useState(null);
  const [editorTab, setEditorTab] = useState('edit');
  const [editorCursorPos, setEditorCursorPos] = useState({ start: 0, end: 0 });
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);

  // AI 辅助
  const [aiResult, setAiResult] = useState({ loading: false, content: '', error: '', action: '' });
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');

  // 自动保存
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // 标签
  const [articleTagInput, setArticleTagInput] = useState('');
  const [editingArticleTag, setEditingArticleTag] = useState(null);

  // 筛选与排序
  const [articleSpaceFilter, setArticleSpaceFilter] = useState('all');
  const [articleMaterialSpaceFilter, setArticleMaterialSpaceFilter] = useState('all');
  const [articleSpaceFormOpen, setArticleSpaceFormOpen] = useState(false);
  const [newArticleSpaceName, setNewArticleSpaceName] = useState('');
  const [articleSpaceForNewArticle, setArticleSpaceForNewArticle] = useState('all');
  const [articleSearch, setArticleSearch] = useState('');
  const [articleStatusFilter, setArticleStatusFilter] = useState('all');
  const [articleTemplateFilter, setArticleTemplateFilter] = useState('all');
  const [articleSort, setArticleSort] = useState('updated');
  const [articleExportFilter, setArticleExportFilter] = useState('all');

  // ---- 文章 CRUD ----
  const createArticle = useCallback((template = 'blank', spaceId = null) => {
    let templateContent = ARTICLE_TEMPLATE_CONTENT[template] || '';
    templateContent = templateContent.replace('{DATE}', new Date().toLocaleDateString('zh-CN'));
    const defaultTitle = template === 'briefing' ? `每日简报 · ${new Date().toLocaleDateString('zh-CN')}` : template === 'blank' ? '未命名文章' : '';
    const newArticle = {
      id: Date.now(),
      title: defaultTitle,
      content: templateContent,
      template,
      materials: [],
      tags: [],
      status: 'draft',
      spaceId: spaceId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      images: []
    };
    setArticles(prev => [...prev, newArticle]);
    saveArticleVersion(newArticle, 'create');
    return newArticle;
  }, []);

  const updateArticle = useCallback((id, updates) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  }, []);

  const articleCitations = useCallback((article) => {
    const linkedIds = new Set((article.materials || []).map(id => String(id)));
    return materials
      .filter(material => linkedIds.has(String(material.id)))
      .flatMap(material => {
        try { return [normalizeAsset(material).citation]; } catch { return []; }
      });
  }, [materials]);

  const saveArticleVersion = useCallback((article, reason = 'manual', content = article.content) => {
    const result = saveDocumentVersion({
      id: article.id,
      title: article.title,
      content,
      status: article.status,
      assetIds: article.materials || [],
      citations: articleCitations(article),
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      versionNumber: article.versionNumber || 0,
    }, {
      title: article.title,
      content,
      assetIds: article.materials || [],
      citations: articleCitations(article),
      reason,
    });
    if (!result.ok) showToast(result.code === 'LOCAL_STORAGE_QUOTA' ? '版本保存失败：本地空间不足' : '版本保存失败');
    return result;
  }, [articleCitations]);

  const deleteArticle = useCallback((id) => {
    setArticles(prev => prev.filter(a => a.id !== id));
  }, []);

  const duplicateArticle = useCallback((id) => {
    setArticles(prev => {
      const original = prev.find(a => a.id === id);
      if (!original) return prev;
      const copy = {
        ...original,
        id: Date.now(),
        title: `${original.title} (副本)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      return [...prev, copy];
    });
  }, []);

  const addArticleTag = useCallback((id, tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    setArticles(prev => prev.map(a => a.id === id ? { ...a, tags: a.tags.includes(trimmed) ? a.tags : [...a.tags, trimmed], updatedAt: new Date().toISOString() } : a));
  }, []);

  const removeArticleTag = useCallback((id, tag) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, tags: a.tags.filter(t => t !== tag), updatedAt: new Date().toISOString() } : a));
  }, []);

  // ---- 自动保存 ----
  const triggerAutoSave = useCallback((article) => {
    setAutoSaveTimer(timer => {
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => {
        setLastSavedAt(new Date().toISOString());
        setAutoSaveTimer(null);
      }, 500);
      return newTimer;
    });
  }, []);

  const handleContentChange = useCallback((article, newContent) => {
    updateArticle(article.id, { content: newContent });
    triggerAutoSave(article);
  }, [updateArticle, triggerAutoSave]);

  const handleTitleChange = useCallback((article, newTitle) => {
    updateArticle(article.id, { title: newTitle });
    triggerAutoSave(article);
  }, [updateArticle, triggerAutoSave]);

  // ---- 光标操作 ----
  const insertAtCursor = useCallback((article, text, wrapBefore, wrapAfter) => {
    const ta = editorTextareaRef?.current;
    if (!ta) {
      updateArticle(article.id, { content: article.content + (wrapBefore || '') + text + (wrapAfter || '') });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = article.content.substring(start, end);
    const before = article.content.substring(0, start);
    const after = article.content.substring(end);
    const insert = wrapBefore ? wrapBefore + (selected || text) + wrapAfter : text;
    const newContent = before + insert + after;
    updateArticle(article.id, { content: newContent });
    setTimeout(() => {
      ta.focus();
      const newPos = wrapBefore ? start + wrapBefore.length + (selected || text).length + (wrapAfter || '').length : start + text.length;
      ta.setSelectionRange(selected ? start + (wrapBefore || '').length : newPos, newPos);
    }, 0);
  }, [editorTextareaRef, updateArticle]);

  const insertMaterialAtCursor = useCallback((article, material) => {
    const ta = editorTextareaRef?.current;
    const ref = `\n> [${material.content.slice(0, 50)}...](${material.url || ''})\n> 来源: ${material.source}\n\n`;
    if (!ta) {
      const newContent = article.content + ref;
      updateArticle(article.id, { content: newContent, materials: article.materials.includes(material.id) ? article.materials : [...article.materials, material.id] });
      return;
    }
    const start = ta.selectionStart;
    const before = article.content.substring(0, start);
    const after = article.content.substring(start);
    const newContent = before + ref + after;
    updateArticle(article.id, { content: newContent, materials: article.materials.includes(material.id) ? article.materials : [...article.materials, material.id] });
    setTimeout(() => {
      ta.focus();
      const newPos = start + ref.length;
      ta.setSelectionRange(newPos, newPos);
    }, 0);
  }, [editorTextareaRef, updateArticle]);

  const removeLinkedMaterial = useCallback((article, materialId) => {
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, materials: a.materials.filter(id => id !== materialId) } : a));
  }, []);

  // ---- 图片上传 / 粘贴 ----
  const handleImageUpload = useCallback((article, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const alt = file.name.replace(/\.[^/.]+$/, '');
      const imageId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 获取图片原始尺寸
      const img = new Image();
      img.onload = () => {
        const imageData = {
          id: imageId,
          base64: base64,
          alt: alt,
          width: img.width,
          height: img.height
        };

        // 更新文章，添加图片数据
        const existingImages = article.images || [];
        const updatedImages = [...existingImages, imageData];
        updateArticle(article.id, { images: updatedImages });

        // 在编辑器中插入占位符（默认使用原始尺寸，但允许后续调整）
        const markdown = `\n![${alt}](#${imageId})\n`;
        insertAtCursor(article, markdown, '', '');
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }, [updateArticle, insertAtCursor]);

  const handlePaste = useCallback((e, article) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(article, file);
        }
        break;
      }
    }
  }, [handleImageUpload]);

  // ---- 创作空间管理 ----
  const createArticleSpace = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newSpace = { id: Date.now(), name: trimmed, createdAt: new Date().toISOString() };
    setArticleSpaces(prev => [...prev, newSpace]);
    setNewArticleSpaceName('');
    setArticleSpaceFormOpen(false);
  }, []);

  const deleteArticleSpace = useCallback((id) => {
    setArticleSpaces(prev => prev.filter(s => s.id !== id));
    setArticles(prev => prev.map(a => a.spaceId === id ? { ...a, spaceId: null } : a));
    setArticleSpaceFilter(filter => filter === String(id) ? 'all' : filter);
  }, []);

  const assignArticleToSpace = useCallback((id, spaceId) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, spaceId: spaceId || null } : a));
  }, []);

  const batchAssignArticlesToSpace = useCallback((ids, spaceId) => {
    setArticles(prev => prev.map(a => ids.includes(a.id) ? { ...a, spaceId: spaceId || null } : a));
  }, []);

  // ---- AI 辅助写作 ----
  const aiAction = useCallback(async (article, action, content) => {
    if (!llmConfig.baseUrl || !llmConfig.selectedModel) {
      setAiResult({ loading: false, content: '', error: '请先配置大模型', action });
      return;
    }
    setAiResult({ loading: true, content: '', error: '', action });
    try {
      const res = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.selectedModel,
          action,
          content
        })
      });
      const data = await res.json();
      if (data.ok) {
        setAiResult({ loading: false, content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content), error: '', action });
      } else {
        setAiResult({ loading: false, content: '', error: data.error || '请求失败', action });
      }
    } catch (e) {
      setAiResult({ loading: false, content: '', error: e.message, action });
    }
  }, [llmConfig]);

  const insertAiResult = useCallback((article) => {
    if (!aiResult.content) return;
    if (aiResult.action === 'title') {
      updateArticle(article.id, { title: aiResult.content.trim() });
    } else if (aiResult.action === 'rewrite' || aiResult.action === 'translate_zh' || aiResult.action === 'simplify' || aiResult.action === 'expand') {
      const selected = window.getSelection().toString();
      if (selected) {
        updateArticle(article.id, { content: article.content.replace(selected, aiResult.content) });
      } else {
        updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
      }
    } else if (aiResult.action === 'summary' || aiResult.action === 'outline') {
      updateArticle(article.id, { content: `> ${aiResult.action === 'summary' ? '摘要' : '大纲'}\n\n${aiResult.content}\n\n---\n\n` + article.content });
    } else if (aiResult.action === 'custom') {
      updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
    } else {
      updateArticle(article.id, { content: article.content + '\n\n' + aiResult.content });
    }
    setAiResult({ loading: false, content: '', error: '', action: '' });
  }, [aiResult, updateArticle]);

  const clearAiResult = useCallback(() => {
    setAiResult({ loading: false, content: '', error: '', action: '' });
  }, []);

  // ---- 导出 ----
  const exportArticleToFile = useCallback((article) => {
    const title = (article.title || '未命名').replace(/[\\/:*?"<>|]/g, '_');

    // 处理图片占位符（支持大小参数）
    let exportContent = article.content;
    if (article.images && article.images.length > 0) {
      article.images.forEach(img => {
        // 支持带大小参数的占位符
        const placeholderPattern = new RegExp(`!\\[([^\\]]*)\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
        exportContent = exportContent.replace(placeholderPattern, (match, alt) => {
          // 解析大小参数
          const sizeMatch = match.match(/\|w=(\d+)(?:\|h=(\d+))?/);
          let sizeAttrs = '';
          if (sizeMatch) {
            sizeAttrs = ` width="${sizeMatch[1]}"`;
            if (sizeMatch[2]) {
              sizeAttrs += ` height="${sizeMatch[2]}"`;
            }
          }
          return `<img src="${img.base64}" alt="${alt || img.alt}"${sizeAttrs} />`;
        });
      });
    }

    const exportPayload = exportDocument({
      id: article.id,
      title: article.title || '未命名',
      content: `# ${article.title || '未命名'}\n\n> 创建时间: ${new Date(article.createdAt).toLocaleString('zh-CN')}\n> 更新时间: ${new Date(article.updatedAt).toLocaleString('zh-CN')}\n> 模板: ${ARTICLE_TEMPLATES[article.template] || article.template}\n> 状态: ${ARTICLE_STATUS[article.status] || article.status}\n${article.tags.length > 0 ? `> 标签: ${article.tags.join(', ')}\n` : ''}\n---\n\n${exportContent}`,
      status: article.status,
      updatedAt: article.updatedAt,
      citations: articleCitations(article),
    }, 'md');
    saveArticleVersion(article, 'export', exportContent);
    const blob = new Blob([exportPayload.content], { type: exportPayload.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportPayload.filename || `${title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const toast = document.createElement('div');
    toast.className = 'material-toast';
    toast.textContent = '已下载为 markdown 文件';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }, [articleCitations, saveArticleVersion]);

  const exportArticle = useCallback((article, format) => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${article.title.replace(/[^\w\s一-鿿]/g, '')}-${dateStr}`;

    if (format === 'md') {
      const md = `# ${article.title}\n\n${article.content}`;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const renderedHtml = renderMarkdown(article.content);
      const printHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${article.title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333;line-height:1.8}h1{font-size:28px;border-bottom:2px solid #eee;padding-bottom:12px;margin-bottom:24px}h2{font-size:22px;margin:28px 0 12px;color:#222}h3{font-size:18px;margin:20px 0 10px}p{margin-bottom:16px;text-align:justify}ul,ol{margin-bottom:16px;padding-left:24px}li{margin-bottom:6px}blockquote{border-left:4px solid #ddd;padding-left:16px;color:#666;margin:16px 0;font-style:italic}pre{background:#f5f5f5;padding:16px;border-radius:6px;overflow-x:auto;font-size:14px;line-height:1.5}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:"DM Mono",monospace;font-size:14px}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5;font-weight:600}img{max-width:100%;border-radius:6px;margin:12px 0}a{color:#3b82f6}hr{border:none;border-top:1px solid #eee;margin:24px 0}@media print{body{padding:0;max-width:100%}}</style></head><body><h1>${article.title}</h1><div class="meta" style="color:#999;font-size:14px;margin-bottom:24px">Tech Radar · ${dateStr} · ${ARTICLE_TEMPLATES[article.template]} · ${ARTICLE_STATUS[article.status]}</div>${renderedHtml}</body></html>`;
      const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) return;
      setTimeout(() => { w.print(); }, 300);
    } else {
      const renderedHtml = renderMarkdown(article.content);
      const cssMap = {
        html: `body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#333;line-height:1.8}h1{border-bottom:2px solid #eee;padding-bottom:12px;margin-bottom:20px}h2{font-size:20px;margin:24px 0 12px;color:#222}h3{font-size:17px;margin:18px 0 8px}p{margin-bottom:14px}ul,ol{margin-bottom:14px;padding-left:24px}li{margin-bottom:4px}blockquote{border-left:4px solid #ddd;padding-left:16px;color:#666;margin:14px 0}pre{background:#f5f5f5;padding:14px;border-radius:6px;overflow-x:auto;font-size:14px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-family:monospace}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f5f5f5}img{max-width:100%;border-radius:6px}a{color:#3b82f6}hr{border:none;border-top:1px solid #eee;margin:20px 0}`,
        wechat: `body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:677px;margin:0 auto;padding:16px;color:#333;line-height:1.8;font-size:16px}h1{font-size:24px;text-align:center;margin-bottom:8px}h2{font-size:20px;border-left:4px solid #07c160;padding-left:12px;margin:20px 0 12px;color:#333}h3{font-size:17px;color:#666;margin:16px 0 8px}.meta{text-align:center;color:#999;font-size:14px;margin-bottom:24px}p{margin-bottom:16px;text-align:justify}ul,ol{margin-bottom:16px;padding-left:20px}li{margin-bottom:6px}blockquote{background:#f7f7f7;border-left:none;padding:16px;margin:16px 0;border-radius:8px}pre{background:#f7f7f7;padding:16px;border-radius:8px;overflow-x:auto;font-size:14px}code{background:#f7f7f7;padding:2px 6px;border-radius:3px}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #e0e0e0;padding:8px 12px;text-align:left}th{background:#f7f7f7}img{max-width:100%;border-radius:6px;margin:12px 0}a{color:#576b95}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}`,
        zhihu: `body{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1a1a1a;line-height:1.75;font-size:16px}h1{font-size:26px;font-weight:700;margin-bottom:16px}h2{font-size:22px;font-weight:600;margin:24px 0 12px}h3{font-size:18px;font-weight:600;margin:18px 0 8px}p{margin-bottom:16px}ul,ol{margin-bottom:16px;padding-left:20px}li{margin-bottom:6px}blockquote{border-left:4px solid #0066ff;padding-left:16px;color:#666;margin:16px 0}pre{background:#f6f6f6;padding:16px;border-radius:4px;overflow-x:auto;font-size:14px}code{background:#f6f6f6;padding:2px 6px;border-radius:3px;font-family:monospace}pre code{background:none;padding:0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #e0e0e0;padding:8px 12px;text-align:left}th{background:#f6f6f6}img{max-width:100%;border-radius:4px;margin:12px 0}a{color:#0066ff}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}`
      };
      const css = cssMap[format] || cssMap.html;
      const htmlContent = `<!doctype html><html><head><meta charset="utf-8"><title>${article.title}</title><style>${css}</style></head><body><h1>${article.title}</h1><div class="meta" style="color:#999;font-size:14px;margin-bottom:24px">Tech Radar · ${dateStr}</div>${renderedHtml}</body></html>`;

      if (format === 'html') {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(htmlContent);
        w.document.close();
        w.focus();
      }
    }
  }, []);

  const copyArticleAsRichText = useCallback((article) => {
    const renderedHtml = renderMarkdown(article.content);
    const fullHtml = `<h1>${article.title}</h1>${renderedHtml}`;
    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([article.content], { type: 'text/plain' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).then(() => {
        showToast('✓ 已复制富文本到剪贴板');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = article.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✓ 已复制 Markdown 文本');
    }
  }, []);

  return {
    // 文章与空间数据
    articles, setArticles,
    articleSpaces, setArticleSpaces,
    // 当前编辑器状态
    currentArticleId, setCurrentArticleId,
    editorTab, setEditorTab,
    editorCursorPos, setEditorCursorPos,
    showTemplateMenu, setShowTemplateMenu,
    showAiPanel, setShowAiPanel,
    showImagePanel, setShowImagePanel,
    // AI 辅助
    aiResult, setAiResult,
    aiCustomPrompt, setAiCustomPrompt,
    aiAction,
    insertAiResult, clearAiResult,
    // 自动保存
    autoSaveTimer, setAutoSaveTimer,
    lastSavedAt, setLastSavedAt,
    triggerAutoSave,
    handleContentChange, handleTitleChange,
    // 标签
    articleTagInput, setArticleTagInput,
    editingArticleTag, setEditingArticleTag,
    addArticleTag, removeArticleTag,
    // 筛选与排序
    articleSpaceFilter, setArticleSpaceFilter,
    articleMaterialSpaceFilter, setArticleMaterialSpaceFilter,
    articleSpaceFormOpen, setArticleSpaceFormOpen,
    newArticleSpaceName, setNewArticleSpaceName,
    articleSpaceForNewArticle, setArticleSpaceForNewArticle,
    articleSearch, setArticleSearch,
    articleStatusFilter, setArticleStatusFilter,
    articleTemplateFilter, setArticleTemplateFilter,
    articleSort, setArticleSort,
    articleExportFilter, setArticleExportFilter,
    // CRUD
    createArticle, updateArticle, deleteArticle, duplicateArticle,
    // 光标操作
    insertAtCursor, insertMaterialAtCursor,
    removeLinkedMaterial,
    // 图片
    handleImageUpload, handlePaste,
    // 空间管理
    createArticleSpace, deleteArticleSpace,
    assignArticleToSpace, batchAssignArticlesToSpace,
    // 导出
    exportArticleToFile, copyArticleAsRichText, exportArticle,
    // 辅助
    articleCitations, saveArticleVersion,
  };
}
