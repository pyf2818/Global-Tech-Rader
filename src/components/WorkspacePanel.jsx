/**
 * WorkspacePanel - 本地工作空间面板（AI 工作站左栏"工作空间"tab）
 *
 * - 顶部：当前文件夹路径 + 切换/断开
 * - 中部：文件树（展开/折叠），多选文件
 * - 底部：操作区（加入 AI 上下文 / 在对话中分析）
 * - 首次进入：引导选择文件夹
 * - 不支持 File System Access API 时：降级提示
 * - 双击文件：右侧滑出 panel 预览文件内容
 */
import { useState, useEffect, useCallback } from 'react';
import { indexFile } from '../utils/workspaceIndex.js';
import { renderMarkdown } from '../utils/markdown.jsx';
import {
  isFileSystemSupported, pickRootDirectory, restoreRootDirectory, clearRootDirectory,
  peekSavedHandle, requestHandlePermission,
  listFiles, readFile, exportMaterials, exportBriefing, downloadMarkdown,
  materialToMarkdown, briefingToMarkdown,
} from '../utils/workspace.js';
import { setRootHandle as setSharedRootHandle } from '../utils/workspaceHandleStore.js';

// 支持预览的文件扩展名（其他类型直接显示原始文本）
const PREVIEWABLE_EXT = new Set(['.md', '.markdown', '.txt']);
const CLOSE_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);

export default function WorkspacePanel({
  onAddContextFiles,
  materials = [],
  todayBriefing,
  todayLanes,
}) {
  const [rootHandle, setRootHandle] = useState(null);
  const [rootName, setRootName] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(new Set()); // 选中的文件 path
  const [expanded, setExpanded] = useState(new Set()); // 展开的目录 path
  // 文件预览侧边 panel
  const [previewFile, setPreviewFile] = useState(null); // { name, path }
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  // 权限失效后需要用户手势重新激活
  const [pendingHandle, setPendingHandle] = useState(null); // 待激活权限的 handle
  const [reactivating, setReactivating] = useState(false);
  const supported = isFileSystemSupported();

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const refreshFiles = useCallback(async (handle) => {
    setLoading(true);
    setError('');
    try {
      const list = await listFiles(handle, 4);
      setFiles(list);
    } catch (e) {
      setError(e.message || '读取文件失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // rootHandle 变化时同步到模块级 store，供 AiChatPanel agent loop 读取
  useEffect(() => {
    setSharedRootHandle(rootHandle);
  }, [rootHandle]);

  // 启动时尝试恢复已授权的目录
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        // 优先用 restoreRootDirectory：仅在权限已 granted 时返回 handle（无需用户手势）
        const handle = await restoreRootDirectory();
        if (cancelled) return;
        if (handle) {
          setRootHandle(handle);
          setRootName(handle.name);
          await refreshFiles(handle);
          return;
        }
        // restore 失败：检查 IndexedDB 是否有保存的 handle（权限失效，需用户手势激活）
        const saved = await peekSavedHandle();
        if (cancelled) return;
        if (saved) setPendingHandle(saved);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [supported, refreshFiles]);

  // 用户手势触发：重新激活工作空间权限
  const handleReActivate = useCallback(async () => {
    if (!pendingHandle) return;
    setReactivating(true);
    setError('');
    try {
      const granted = await requestHandlePermission(pendingHandle);
      if (granted) {
        setRootHandle(pendingHandle);
        setRootName(pendingHandle.name);
        setPendingHandle(null);
        await refreshFiles(pendingHandle);
      } else {
        setError('权限未授予，请重新点击激活按钮');
      }
    } catch (e) {
      setError(e.message || '激活权限失败');
    } finally {
      setReactivating(false);
    }
  }, [pendingHandle, refreshFiles]);

  const handlePick = useCallback(async () => {
    setError('');
    try {
      const handle = await pickRootDirectory();
      if (handle) {
        setRootHandle(handle);
        setRootName(handle.name);
        setPendingHandle(null);
        await refreshFiles(handle);
      }
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || '选择文件夹失败');
    }
  }, [refreshFiles]);

  const handleDisconnect = useCallback(async () => {
    await clearRootDirectory();
    setRootHandle(null);
    setRootName('');
    setFiles([]);
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((path) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(files.filter(f => !f.isDir).map(f => f.path)));
  }, [files]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // 双击文件 → 右侧 panel 预览
  const handlePreview = useCallback(async (file) => {
    if (!rootHandle) return;
    setPreviewFile({ name: file.name, path: file.path });
    setPreviewContent('');
    setPreviewError('');
    setPreviewLoading(true);
    try {
      const segments = file.path.split('/');
      const text = await readFile(rootHandle, segments);
      setPreviewContent(text);
    } catch (e) {
      setPreviewError(e.message || '读取文件失败');
    } finally {
      setPreviewLoading(false);
    }
  }, [rootHandle]);

  const closePreview = useCallback(() => {
    setPreviewFile(null);
    setPreviewContent('');
    setPreviewError('');
    setPreviewLoading(false);
  }, []);

  // Esc 关闭预览
  useEffect(() => {
    if (!previewFile) return;
    const onKey = e => { if (e.key === 'Escape') closePreview(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewFile, closePreview]);

  // 判断文件是否可 markdown 渲染
  const isMarkdown = useCallback((name) => {
    const lower = String(name || '').toLowerCase();
    return PREVIEWABLE_EXT.has(lower.slice(lower.lastIndexOf('.')));
  }, []);

  // 在预览 panel 内一键加入 AI 上下文
  const addPreviewToContext = useCallback(async () => {
    if (!previewFile || !onAddContextFiles) return;
    onAddContextFiles([{ name: previewFile.name, path: previewFile.path, content: previewContent }]);
    showToast(`已加入上下文：${previewFile.name}`);
    closePreview();
  }, [previewFile, previewContent, onAddContextFiles, showToast, closePreview]);

  const handleAddContext = useCallback(async () => {
    if (!rootHandle || selected.size === 0 || !onAddContextFiles) return;
    const picked = files.filter(f => !f.isDir && selected.has(f.path));
    const result = [];
    for (const f of picked) {
      try {
        const segments = f.path.split('/');
        const text = await readFile(rootHandle, segments);
        result.push({ name: f.name, path: f.path, content: text });
      } catch (e) {
        result.push({ name: f.name, path: f.path, content: `读取失败: ${e.message}`, error: true });
      }
    }
    onAddContextFiles(result);
  }, [rootHandle, selected, files, onAddContextFiles]);

  // 导出全部素材到工作空间（或降级下载）
  const handleExportMaterials = useCallback(async () => {
    if (!materials.length) { showToast('素材库为空'); return; }
    if (rootHandle) {
      showToast(`正在导出 ${materials.length} 条素材…`);
      try {
        const results = await exportMaterials(rootHandle, materials);
        const ok = results.filter(r => r.ok).length;
        // 建索引：让工作空间文件可被对话检索召回
        materials.forEach((m, i) => {
          const r = results[i];
          if (r?.ok) indexFile(r.path, `${m.title || 'material'}.md`, materialToMarkdown(m));
        });
        showToast(`已导出 ${ok}/${materials.length} 条素材到 news/`);
        await refreshFiles(rootHandle);
      } catch (e) { showToast(`导出失败: ${e.message}`); }
    } else {
      // 降级：逐个下载
      materials.forEach(m => downloadMarkdown(m.title || 'material', materialToMarkdown(m)));
      showToast(`已下载 ${materials.length} 个文件`);
    }
  }, [materials, rootHandle, showToast, refreshFiles]);

  // 导出今日速报
  const handleExportBriefing = useCallback(async () => {
    if (!todayBriefing) { showToast('暂无今日速报'); return; }
    const date = todayBriefing.date || new Date().toISOString().slice(0, 10);
    const content = briefingToMarkdown(todayBriefing, todayLanes);
    if (rootHandle) {
      try {
        const path = await exportBriefing(rootHandle, todayBriefing, todayLanes);
        indexFile(path, `${date}.md`, content);
        showToast(`已导出今日速报到 briefings/${date}.md`);
        await refreshFiles(rootHandle);
      } catch (e) { showToast(`导出失败: ${e.message}`); }
    } else {
      downloadMarkdown(`briefing-${date}`, content);
      showToast('已下载今日速报');
    }
  }, [todayBriefing, todayLanes, rootHandle, showToast, refreshFiles]);

  // 不支持 File System Access API
  if (!supported) {
    return (
      <aside className="workspace-panel">
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <p className="workspace-empty-title">当前浏览器不支持本地工作空间</p>
          <p className="workspace-empty-desc">请使用 Chrome 或 Edge 浏览器以连接本地文件夹。你仍可通过各页面的「导出」按钮下载 Markdown 文件到本地。</p>
        </div>
      </aside>
    );
  }

  // 未连接文件夹
  if (!rootHandle) {
    // 权限失效：检测到保存的 handle 但权限需用户手势激活
    if (pendingHandle) {
      return (
        <aside className="workspace-panel">
          <div className="workspace-empty">
            <div className="workspace-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
            <p className="workspace-empty-title">工作空间权限待重新激活</p>
            <p className="workspace-empty-desc">已记住上次连接的 <strong>{pendingHandle.name}</strong>，浏览器要求点击确认才能继续访问。</p>
            {error && <p className="workspace-empty-error">{error}</p>}
            <button type="button" className="workspace-connect-btn" onClick={handleReActivate} disabled={reactivating}>
              {reactivating ? '激活中…' : '重新激活权限'}
            </button>
            <button type="button" className="workspace-link-btn" onClick={handlePick} disabled={reactivating}>更换文件夹</button>
          </div>
        </aside>
      );
    }
    return (
      <aside className="workspace-panel">
        <div className="workspace-empty">
          <div className="workspace-empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <p className="workspace-empty-title">连接本地工作空间</p>
          <p className="workspace-empty-desc">授权一个文件夹作为你的数据资产库，可将资讯、日报沉淀为 Markdown，也可作为 AI 对话上下文。</p>
          <button type="button" className="workspace-connect-btn" onClick={handlePick}>选择文件夹</button>
        </div>
      </aside>
    );
  }

  // 构建文件树（按目录层级折叠）
  const dirs = files.filter(f => f.isDir);
  const fileItems = files.filter(f => !f.isDir);

  return (
    <aside className="workspace-panel">
      <div className="workspace-top">
        <div className="workspace-path" title={rootName}>
          <span className="workspace-path-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>
          <span className="workspace-path-name">{rootName}</span>
        </div>
        <div className="workspace-top-actions">
          <button type="button" className="workspace-icon-btn" onClick={() => refreshFiles(rootHandle)} title="刷新">↻</button>
          <button type="button" className="workspace-icon-btn" onClick={handlePick} title="切换文件夹">⇄</button>
          <button type="button" className="workspace-icon-btn" onClick={handleDisconnect} title="断开连接">✕</button>
        </div>
      </div>

      <div className="workspace-export-bar">
        <button type="button" className="workspace-export-btn" onClick={handleExportMaterials} title="把素材库全部导出为 Markdown">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          导出素材 {materials.length > 0 && <span className="workspace-count">{materials.length}</span>}
        </button>
        <button type="button" className="workspace-export-btn" onClick={handleExportBriefing} title="导出今日速报为 Markdown">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>
          导出日报
        </button>
      </div>
      {toast && <div className="workspace-toast">{toast}</div>}

      <div className="workspace-file-list custom-scrollbar">
        {loading && <div className="workspace-loading">读取中…</div>}
        {error && <div className="workspace-error">{error}</div>}
        {!loading && files.length === 0 && <div className="workspace-list-empty">文件夹为空</div>}
        {!loading && files.length > 0 && (
          <>
            {/* 工具栏：全部展开 / 全部折叠 */}
            <div className="workspace-tree-toolbar">
              <button type="button" className="workspace-tree-tool-btn" onClick={() => {
                setExpanded(new Set(files.filter(f => f.isDir).map(f => f.path)));
              }}>全部展开</button>
              <button type="button" className="workspace-tree-tool-btn" onClick={() => setExpanded(new Set())}>全部折叠</button>
            </div>
            {/*
              按 DFS 顺序混合渲染目录与文件，确保文件出现在它的父目录下方。
              files 数组由 listFiles 以深度优先遍历产生，天然保持父子顺序。
              每个条目先检查所有父目录是否展开，未展开则跳过。
            */}
            {files.map(item => {
              const parents = item.path.split('/').slice(0, -1);
              const allExpanded = parents.every((_, i) => expanded.has(parents.slice(0, i + 1).join('/')));
              if (!allExpanded) return null;
              if (item.isDir) {
                return (
                  <button
                    type="button"
                    key={item.path}
                    className={`workspace-tree-dir ${expanded.has(item.path) ? 'expanded' : ''}`}
                    style={{ paddingLeft: 8 + item.depth * 12 }}
                    onClick={() => toggleExpand(item.path)}
                  >
                    <span className="workspace-tree-arrow">{expanded.has(item.path) ? '▾' : '▸'}</span>
                    <span className="workspace-tree-name">{item.name}</span>
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  key={item.path}
                  className={`workspace-tree-file has-dblclick ${selected.has(item.path) ? 'selected' : ''}`}
                  style={{ paddingLeft: 8 + item.depth * 12 }}
                  onClick={() => toggleSelect(item.path)}
                  onDoubleClick={() => handlePreview(item)}
                  title={`${item.path} · 双击预览`}
                >
                  <span className="workspace-tree-file-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                  <span className="workspace-tree-name">{item.name}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="workspace-bottom">
          <div className="workspace-selected-bar">
            <span>已选 {selected.size} 个文件</span>
            <button type="button" className="workspace-link-btn" onClick={clearSelection}>清除</button>
          </div>
          <button type="button" className="workspace-action-btn primary" onClick={handleAddContext} disabled={!onAddContextFiles}>
            加入 AI 上下文
          </button>
          {files.filter(f => !f.isDir).length > 0 && selected.size === 0 && (
            <button type="button" className="workspace-link-btn" onClick={selectAll}>全选</button>
          )}
        </div>
      )}

      {previewFile && (
        <>
          <div className="workspace-side-panel-backdrop" onClick={closePreview} />
          <aside className="workspace-side-panel" role="dialog" aria-modal="false" aria-label="文件预览">
            <div className="workspace-side-panel-head">
              <div className="workspace-side-panel-meta">
                <span className="workspace-side-panel-type">file</span>
                <h3>{previewFile.name}</h3>
                <span className="workspace-side-panel-path">{previewFile.path}</span>
              </div>
              <button className="workspace-side-panel-close" onClick={closePreview} title="关闭 (Esc)">{CLOSE_SVG}</button>
            </div>
            <div className="workspace-side-panel-body">
              {previewLoading && (
                <div className="workspace-side-panel-loading"><div className="spinner" /><span>正在读取文件…</span></div>
              )}
              {!previewLoading && previewError && (
                <p className="workspace-side-panel-empty">读取失败：{previewError}</p>
              )}
              {!previewLoading && !previewError && (
                isMarkdown(previewFile.name)
                  ? (previewContent
                    ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(previewContent) }} />
                    : <p className="workspace-side-panel-empty">文件为空</p>)
                  : <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '12px' }}>{previewContent}</pre>
              )}
            </div>
            <div className="workspace-side-panel-foot">
              <button
                type="button"
                className="workspace-side-panel-action"
                onClick={addPreviewToContext}
                disabled={!onAddContextFiles || previewLoading || !!previewError}
                title="把当前文件内容作为 AI 对话上下文"
              >
                加入 AI 上下文
              </button>
            </div>
          </aside>
        </>
      )}
    </aside>
  );
}
