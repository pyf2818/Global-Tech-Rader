import React from 'react';
import { ICONS } from '../constants/index.jsx';
import { ARTICLE_STATUS, ARTICLE_TEMPLATES, ARTICLE_TEMPLATE_CONTENT, MATERIAL_TYPES } from '../constants/index.jsx';
import { formatRelative } from '../utils/format.js';
import { renderMarkdownWithImages } from '../utils/markdown.jsx';

export default function ArticleEditor({
  editorFullscreen, setEditorFullscreen,
  editorTextareaRef, imageInputRef,
  articles, setArticles,
  currentArticleId, setCurrentArticleId,
  editorTab, setEditorTab,
  editorCursorPos, setEditorCursorPos,
  showTemplateMenu, setShowTemplateMenu,
  showAiPanel, setShowAiPanel,
  showImagePanel, setShowImagePanel,
  aiResult, setAiResult,
  aiCustomPrompt, setAiCustomPrompt,
  autoSaveTimer, setAutoSaveTimer,
  lastSavedAt, setLastSavedAt,
  articleTagInput, setArticleTagInput,
  editingArticleTag, setEditingArticleTag,
  articleSpaces, setArticleSpaces,
  materialSpaces, setMaterialSpaces,
  articleSpaceFilter, setArticleSpaceFilter,
  articleMaterialSpaceFilter, setArticleMaterialSpaceFilter,
  articleSpaceFormOpen, setArticleSpaceFormOpen,
  newArticleSpaceName, setNewArticleSpaceName,
  articleSpaceForNewArticle, setArticleSpaceForNewArticle,
  articleSearch, setArticleSearch,
  articleStatusFilter, setArticleStatusFilter,
  articleTemplateFilter, setArticleTemplateFilter,
  articleSort, setArticleSort,
  filteredArticles = [],
  articleExportFilter, setArticleExportFilter,
  createArticle, updateArticle, deleteArticle, duplicateArticle,
  addArticleTag, removeArticleTag,
  triggerAutoSave,
  handleContentChange, handleTitleChange,
  insertAtCursor, insertMaterialAtCursor,
  removeLinkedMaterial,
  handleImageUpload, handlePaste,
  createArticleSpace, deleteArticleSpace, assignArticleToSpace,
  batchAssignArticlesToSpace,
  insertAiResult, clearAiResult,
  exportArticleToFile, copyArticleAsRichText,
  materials, llmConfig,
}) {
  return (
<div className="trends-dashboard">
              <div className="trends-header editor-header">
                <h2>{ICONS.edit}<span>创作中心</span></h2>
                <div className="editor-header-actions">
                  <button className="editor-fullscreen-btn" onClick={() => setEditorFullscreen(f => !f)} title={editorFullscreen ? '退出全屏' : '全屏创作'}>
                    {editorFullscreen ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    )}
                    <span>{editorFullscreen ? '退出全屏' : '全屏'}</span>
                  </button>
                  <button className="btn-new-article-pro" onClick={() => { const a = createArticle('blank', articleSpaceFilter !== 'all' ? Number(articleSpaceFilter) : null); setCurrentArticleId(a.id); }}>
                    {ICONS.plus}
                    <span>新建文章</span>
                    <span className="btn-key-hint">Ctrl+N</span>
                  </button>
                  <div className="template-popover">
                    <button className="btn-template-popover" onClick={() => setShowTemplateMenu(!showTemplateMenu)} title="从模板创建">
                      {ICONS.layers}
                      <span>模板</span>
                      {ICONS.chevronDown}
                    </button>
                    {showTemplateMenu && (
                      <div className="template-popover-menu">
                        <div className="template-menu-title">选择模板</div>
                        {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => (
                          <button key={id} className="template-menu-item" onClick={() => { const a = createArticle(id, articleSpaceFilter !== 'all' ? Number(articleSpaceFilter) : null); setCurrentArticleId(a.id); setShowTemplateMenu(false); }}>
                            <span className="template-menu-icon">{
                              id === 'blank' ? ICONS.edit : id === 'briefing' ? ICONS.document : id === 'analysis' ? ICONS.chart : ICONS.code
                            }</span>
                            <span className="template-menu-label">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentArticleId ? (
                <section className="trends-section article-editor">
                  {(() => {
                    const article = articles.find(a => a.id === currentArticleId);
                    if (!article) return null;
                    const wordCount = article.content.replace(/\s/g, '').length;
                    const paragraphCount = article.content.split(/\n\s*\n/).filter(p => p.trim()).length;
                    const readMinutes = Math.max(1, Math.ceil(wordCount / 500));
                    const linkedMaterials = materials.filter(m => article.materials.includes(m.id));

                    return (
                      <>
                        <div className="article-toolbar">
                          <button className="btn-back-list" onClick={() => { setCurrentArticleId(null); setEditorTab('edit'); }}>← 返回列表</button>
                          <div className="article-actions">
                            {lastSavedAt && <span className="autosave-indicator">已自动保存 {new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>}
                            <select className="article-status-select" value={article.status} onChange={e => updateArticle(article.id, { status: e.target.value })}>
                              <option value="draft">草稿</option>
                              <option value="published">已发布</option>
                              <option value="archived">已归档</option>
                            </select>
                            <button className="btn-copy-article" onClick={() => exportArticleToFile(article)} title="导出为文件">{ICONS.download}</button>
                            <button className="btn-copy-article" onClick={() => copyArticleAsRichText(article)} title="复制全文">{ICONS.copy}</button>
                          </div>
                        </div>

                        <input
                          className="article-title-input"
                          value={article.title}
                          onChange={e => handleTitleChange(article, e.target.value)}
                          placeholder="文章标题"
                        />

                        <div className="article-meta-bar">
                          <select
                            className="article-template-select"
                            value={article.template}
                            onChange={e => updateArticle(article.id, { template: e.target.value })}
                          >
                            {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                          <div className="article-tags-inline">
                            {article.tags.map(tag => (
                              <span key={tag} className="article-tag-pill">
                                {tag}
                                <button className="article-tag-remove" onClick={() => removeArticleTag(article.id, tag)}>{ICONS.x}</button>
                              </span>
                            ))}
                            <input
                              className="article-tag-input"
                              value={editingArticleTag === article.id ? articleTagInput : ''}
                              placeholder="+ 标签"
                              onFocus={() => setEditingArticleTag(article.id)}
                              onBlur={() => { if (articleTagInput.trim()) addArticleTag(article.id, articleTagInput); setEditingArticleTag(null); setArticleTagInput(''); }}
                              onKeyDown={e => { if (e.key === 'Enter' && articleTagInput.trim()) { addArticleTag(article.id, articleTagInput); setArticleTagInput(''); e.preventDefault(); } }}
                              onChange={e => setArticleTagInput(e.target.value)}
                            />
                          </div>
                          <span className="article-updated">{wordCount} 字 · {readMinutes} 分钟阅读</span>
                        </div>

                        <div className="editor-toolbar">
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="粗体 (Ctrl+B)" onClick={() => insertAtCursor(article, '', '**', '**')}>{ICONS.bold}</button>
                            <button className="editor-tool-btn" title="斜体 (Ctrl+I)" onClick={() => insertAtCursor(article, '', '*', '*')}>{ICONS.italic}</button>
                            <button className="editor-tool-btn" title="标题" onClick={() => insertAtCursor(article, '标题\n', '## ', '')}>{ICONS.heading}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="引用" onClick={() => insertAtCursor(article, '引用内容', '> ', '')}>{ICONS.quoteIcon}</button>
                            <button className="editor-tool-btn" title="无序列表" onClick={() => insertAtCursor(article, '- 列表项\n', '', '')}>{ICONS.listIcon}</button>
                            <button className="editor-tool-btn" title="有序列表" onClick={() => insertAtCursor(article, '1. 列表项\n', '', '')}>{ICONS.orderedList}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="代码块" onClick={() => insertAtCursor(article, '代码', '```\n', '\n```')}>{ICONS.codeIcon}</button>
                            <button className="editor-tool-btn" title="行内代码" onClick={() => insertAtCursor(article, '', '`', '`')}>{ICONS.code}</button>
                            <button className="editor-tool-btn" title="表格" onClick={() => insertAtCursor(article, '\n| 列1 | 列2 | 列3 |\n|------|------|------|\n| 内容 | 内容 | 内容 |\n', '', '')}>{ICONS.tableIcon}</button>
                            <button className="editor-tool-btn" title="分割线" onClick={() => insertAtCursor(article, '\n---\n', '', '')}>{ICONS.hr}</button>
                          </div>
                          <div className="editor-toolbar-group">
                            <button className="editor-tool-btn" title="链接" onClick={() => insertAtCursor(article, '', '[链接文本](url)', '')}>{ICONS.link}</button>
                            <button className="editor-tool-btn" title="上传图片" onClick={() => imageInputRef.current?.click()}>{ICONS.image}</button>
                            <input
                              type="file"
                              ref={imageInputRef}
                              style={{ display: 'none' }}
                              accept="image/*"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(article, file);
                                e.target.value = '';
                              }}
                            />
                          </div>
                          <div className="editor-toolbar-group editor-tab-group">
                            <button className={`editor-tab-btn ${editorTab === 'edit' ? 'active' : ''}`} onClick={() => setEditorTab('edit')}>编辑</button>
                            <button className={`editor-tab-btn ${editorTab === 'split' ? 'active' : ''}`} onClick={() => setEditorTab('split')}>分栏</button>
                            <button className={`editor-tab-btn ${editorTab === 'preview' ? 'active' : ''}`} onClick={() => setEditorTab('preview')}>预览</button>
                          </div>
                        </div>

                        <div className={`editor-split-view editor-mode-${editorTab}`}>
                          {editorTab !== 'preview' && (
                            <div className="editor-pane">
                              <textarea
                                ref={editorTextareaRef}
                                className="article-content-editor"
                                value={article.content}
                                onChange={e => handleContentChange(article, e.target.value)}
                                placeholder="开始写作...&#10;&#10;支持 Markdown 格式：&#10;# 标题&#10;**粗体** *斜体*&#10;- 列表&#10;> 引用&#10;`代码`&#10;![图片](url)&#10;&#10;支持拖拽上传图片、粘贴图片、插入素材"
                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                                onDrop={e => {
                                  e.preventDefault();
                                  try {
                                    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                                    if (data && data.materialId) {
                                      const mat = materials.find(m => m.id === data.materialId);
                                      if (mat) insertMaterialAtCursor(article, mat);
                                    }
                                  } catch {}
                                }}
                                onPaste={e => handlePaste(e, article)}
                              />
                            </div>
                          )}
                          {editorTab !== 'edit' && (
                            <div className="preview-pane">
                              <div className="preview-header">
                                <span>预览</span>
                                <span className="preview-stats">{wordCount} 字</span>
                              </div>
                              <div
                                className="markdown-preview"
                                dangerouslySetInnerHTML={{ __html: renderMarkdownWithImages(article.content, article.images) }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 图片管理面板 */}
                        {article.images && article.images.length > 0 && (
                          <div className="image-manager-panel">
                            <div className="image-manager-header" onClick={() => setShowImagePanel(!showImagePanel)}>
                              <div className="image-manager-title">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                <span>图片管理 ({article.images.length}张)</span>
                              </div>
                              <span className={`ai-panel-chevron ${showImagePanel ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                            </div>
                            {showImagePanel && (
                              <div className="image-manager-body">
                                <div className="image-manager-grid">
                                  {article.images.map(img => {
                                    // 检查图片是否在文章中被引用
                                    const placeholderRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                    const isUsed = placeholderRegex.test(article.content);
                                    // 解析当前尺寸
                                    const match = article.content.match(placeholderRegex);
                                    let currentWidth = '', currentHeight = '';
                                    if (match) {
                                      const sizeMatch = match[0].match(/\|w=(\d+)(?:\|h=(\d+))?/);
                                      if (sizeMatch) {
                                        currentWidth = sizeMatch[1];
                                        currentHeight = sizeMatch[2] || '';
                                      }
                                    }
                                    return (
                                      <div key={img.id} className={`image-manager-card ${isUsed ? 'used' : 'unused'}`}>
                                        <div className="image-manager-card-img-wrap" onClick={() => {
                                          // 点击缩略图滚动到编辑器中对应位置
                                          if (editorTextareaRef.current) {
                                            const ta = editorTextareaRef.current;
                                            const idx = article.content.indexOf(`#${img.id}`);
                                            if (idx !== -1) {
                                              ta.focus();
                                              ta.setSelectionRange(idx, idx);
                                              // 计算行号并滚动
                                              const lines = article.content.substring(0, idx).split('\n');
                                              const lineHeight = 20;
                                              ta.scrollTop = Math.max(0, (lines.length - 5) * lineHeight);
                                            }
                                          }
                                        }}>
                                          <img src={img.base64} alt={img.alt} className="image-manager-card-thumb" />
                                          {isUsed && <span className="image-manager-used-badge">已引用</span>}
                                          {!isUsed && <span className="image-manager-unused-badge">未引用</span>}
                                          <button
                                            className="image-manager-card-remove"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)\\n?`, 'g');
                                              const newContent = article.content.replace(oldRegex, '');
                                              updateArticle(article.id, {
                                                content: newContent,
                                                images: article.images.filter(i => i.id !== img.id)
                                              });
                                            }}
                                            title="删除图片"
                                          >
                                            {ICONS.trash}
                                          </button>
                                        </div>
                                        <div className="image-manager-card-info">
                                          <span className="image-manager-card-name" title={img.alt}>{img.alt}</span>
                                          <span className="image-manager-card-dims">{img.width}×{img.height}</span>
                                        </div>
                                        <div className="image-manager-card-actions">
                                          {/* 宽度调整 */}
                                          <div className="image-manager-size-input">
                                            <label>宽度</label>
                                            <input
                                              type="number"
                                              value={currentWidth}
                                              placeholder="自动"
                                              onChange={e => {
                                                const newWidth = e.target.value;
                                                const newHeight = currentHeight;
                                                let newPlaceholder = `![${img.alt}](#${img.id}`;
                                                if (newWidth) {
                                                  newPlaceholder += `|w=${newWidth}`;
                                                  if (newHeight) newPlaceholder += `|h=${newHeight}`;
                                                }
                                                newPlaceholder += ')';
                                                const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                                const newContent = article.content.replace(oldRegex, newPlaceholder);
                                                updateArticle(article.id, { content: newContent });
                                              }}
                                            />
                                            <span>px</span>
                                          </div>
                                          {/* 高度调整 */}
                                          <div className="image-manager-size-input">
                                            <label>高度</label>
                                            <input
                                              type="number"
                                              value={currentHeight}
                                              placeholder="自动"
                                              onChange={e => {
                                                const newWidth = currentWidth;
                                                const newHeight = e.target.value;
                                                let newPlaceholder = `![${img.alt}](#${img.id}`;
                                                if (newWidth || newHeight) {
                                                  newPlaceholder += `|w=${newWidth || img.width}`;
                                                  if (newHeight) newPlaceholder += `|h=${newHeight}`;
                                                }
                                                newPlaceholder += ')';
                                                const oldRegex = new RegExp(`!\\[[^\\]]*\\]\\(\\#${img.id}(?:\\|[^)]+)?\\)`, 'g');
                                                const newContent = article.content.replace(oldRegex, newPlaceholder);
                                                updateArticle(article.id, { content: newContent });
                                              }}
                                            />
                                            <span>px</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="ai-assistant-panel">
                          <div className="ai-panel-header" onClick={() => setShowAiPanel(!showAiPanel)}>
                            <div className="ai-panel-title">
                              {ICONS.sparkles}
                              <span>AI 写作助手</span>
                              {llmConfig.baseUrl && <span className="ai-status-dot" title="已配置大模型"></span>}
                            </div>
                            <span className={`ai-panel-chevron ${showAiPanel ? 'open' : ''}`}>{ICONS.chevronDown}</span>
                          </div>
                          {showAiPanel && (
                            <div className="ai-panel-body">
                              {!llmConfig.baseUrl ? (
                                <div className="ai-config-hint">
                                  <span>请先在设置中配置大模型 API</span>
                                </div>
                              ) : (
                                <>
                                  <div className="ai-quick-actions">
                                    <div className="ai-action-group">
                                      <span className="ai-group-label">文本处理</span>
                                      <div className="ai-action-grid">
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要处理的文本', 1500); return; }
                                          aiAction(article, 'rewrite', selected);
                                        }}>
                                          {ICONS.edit}<span>润色改写</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要翻译的文本', 1500); return; }
                                          aiAction(article, 'translate_zh', selected);
                                        }}>
                                          {ICONS.globe}<span>翻译中文</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要简化的文本', 1500); return; }
                                          aiAction(article, 'simplify', selected);
                                        }}>
                                          {ICONS.bolt}<span>精简压缩</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          if (!selected) { showToast('请先选择要扩写的文本', 1500); return; }
                                          aiAction(article, 'expand', selected);
                                        }}>
                                          {ICONS.follow}<span>扩写展开</span>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="ai-action-group">
                                      <span className="ai-group-label">内容生成</span>
                                      <div className="ai-action-grid">
                                        <button className="ai-action-btn" onClick={() => {
                                          const selected = window.getSelection().toString();
                                          aiAction(article, 'continue', selected || article.content);
                                        }}>
                                          {ICONS.arrowRight}<span>智能续写</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'title', article.content)}>
                                          {ICONS.sparkle}<span>生成标题</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'summary', article.content)}>
                                          {ICONS.list}<span>生成摘要</span>
                                        </button>
                                        <button className="ai-action-btn" onClick={() => aiAction(article, 'outline', article.content)}>
                                          {ICONS.layers}<span>提取大纲</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ai-custom-prompt">
                                    <textarea
                                      className="ai-prompt-input"
                                      placeholder="输入自定义指令，例如：'将这段文字改写为更口语化的风格'..."
                                      value={aiCustomPrompt}
                                      onChange={e => setAiCustomPrompt(e.target.value)}
                                      rows="2"
                                    />
                                    <button className="ai-prompt-send" onClick={() => {
                                      if (!aiCustomPrompt.trim()) { showToast('请输入自定义指令', 1500); return; }
                                      const selected = window.getSelection().toString();
                                      const context = selected || article.content;
                                      aiAction(article, 'custom', `${aiCustomPrompt}\n\n待处理内容：\n${context}`);
                                    }}>
                                      {ICONS.arrowRight}
                                    </button>
                                  </div>
                                </>
                              )}
                              {aiResult.loading && (
                                <div className="ai-loading-state">
                                  <div className="ai-loading-spinner"></div>
                                  <span>AI 正在处理中...</span>
                                </div>
                              )}
                              {aiResult.content && (
                                <div className="ai-result-block">
                                  <div className="ai-result-header">
                                    <span className="ai-result-label">{
                                      aiResult.action === 'continue' ? '续写结果' :
                                      aiResult.action === 'rewrite' ? '润色改写' :
                                      aiResult.action === 'translate_zh' ? '翻译结果' :
                                      aiResult.action === 'title' ? '生成标题' :
                                      aiResult.action === 'summary' ? '摘要' :
                                      aiResult.action === 'outline' ? '大纲' :
                                      aiResult.action === 'custom' ? '自定义结果' : 'AI 结果'
                                    }</span>
                                    <div className="ai-result-actions">
                                      <button className="btn-ai-insert" onClick={() => insertAiResult(article)}>插入正文</button>
                                      <button className="btn-ai-copy" onClick={() => { navigator.clipboard.writeText(aiResult.content); showToast('已复制到剪贴板', 1500); }}>复制</button>
                                      <button className="btn-ai-clear" onClick={clearAiResult}>{ICONS.x}</button>
                                    </div>
                                  </div>
                                  <pre className="ai-result-content">{aiResult.content}</pre>
                                </div>
                              )}
                              {aiResult.error && (
                                <div className="ai-result-error">
                                  <span>{aiResult.error}</span>
                                  <button onClick={clearAiResult}>{ICONS.x}</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="article-materials-panel">
                          <div className="materials-panel-header">
                            <h4>关联素材 <span className="material-hint">（拖拽到编辑器中或点击插入）</span></h4>
                            {linkedMaterials.length > 0 && (
                              <span className="linked-material-count">{linkedMaterials.length} 篇已引用</span>
                            )}
                          </div>
                          <div className="material-space-filter">
                            <select
                              value={articleMaterialSpaceFilter}
                              onChange={e => setArticleMaterialSpaceFilter(e.target.value)}
                            >
                              <option value="all">全部空间</option>
                              {materialSpaces.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          {linkedMaterials.length > 0 && (
                            <div className="linked-materials-list">
                              {linkedMaterials.map(m => (
                                <div key={m.id} className="linked-material-item">
                                  <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type] || m.type}</span>
                                  <span className="linked-material-text">{m.content.slice(0, 50)}...</span>
                                  <button className="linked-material-remove" onClick={() => removeLinkedMaterial(article, m.id)} title="移除引用">{ICONS.x}</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {materials.length > 0 && (
                            <div className="materials-picker-list">
                              {materials
                                .filter(m => !article.materials.includes(m.id))
                                .filter(m => articleMaterialSpaceFilter === 'all' || m.spaceId === Number(articleMaterialSpaceFilter))
                                .slice(0, 20)
                                .map(m => (
                                  <div
                                    key={m.id}
                                    className="material-picker-item"
                                    onClick={() => insertMaterialAtCursor(article, m)}
                                    draggable
                                    onDragStart={e => { e.dataTransfer.setData('text/plain', JSON.stringify({ materialId: m.id })); e.dataTransfer.effectAllowed = 'copy'; }}
                                    title={m.content}
                                  >
                                    <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type] || m.type}</span>
                                    <span className="material-picker-content">{m.content.slice(0, 40)}...</span>
                                  </div>
                                ))}
                            </div>
                          )}
                          {materials.length === 0 && (
                            <p className="hint">素材库为空，浏览资讯时点击收藏按钮或手动添加素材</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </section>
              ) : (
                <section className="trends-section">
                  {articles.length === 0 ? (
                    <div className="empty-articles">
                      <div className="empty-icon">{ICONS.edit}</div>
                      <p className="empty-title">暂无文章</p>
                      <button className="btn-new-article-inline" onClick={() => { const a = createArticle('blank'); setCurrentArticleId(a.id); }}>+ 创建第一篇文章</button>
                    </div>
                  ) : (
                    <>
                      <div className="article-space-tabs">
                        <button
                          className={`article-space-tab ${articleSpaceFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setArticleSpaceFilter('all')}
                        >
                          全部文章
                          <span className="article-space-count">{articles.length}</span>
                        </button>
                        {articleSpaces.map(space => {
                          const count = articles.filter(a => a.spaceId === space.id).length;
                          return (
                            <button
                              key={space.id}
                              className={`article-space-tab ${articleSpaceFilter === String(space.id) ? 'active' : ''}`}
                              onClick={() => setArticleSpaceFilter(String(space.id))}
                            >
                              {space.name}
                              <span className="article-space-count">{count}</span>
                            </button>
                          );
                        })}
                        <button className="article-space-tab article-space-add" onClick={() => setArticleSpaceFormOpen(true)}>
                          {ICONS.plus}
                        </button>
                      </div>
                      <div className="article-list-toolbar">
                        <div className="article-search-box">
                          {ICONS.search}
                          <input type="text" placeholder="搜索文章标题..." value={articleSearch} onChange={e => setArticleSearch(e.target.value)} />
                        </div>
                        <select className="article-filter-select" value={articleStatusFilter} onChange={e => setArticleStatusFilter(e.target.value)}>
                          <option value="all">全部状态</option>
                          <option value="draft">草稿</option>
                          <option value="published">已发布</option>
                          <option value="archived">已归档</option>
                        </select>
                        <select className="article-filter-select" value={articleTemplateFilter} onChange={e => setArticleTemplateFilter(e.target.value)}>
                          <option value="all">全部模板</option>
                          {Object.entries(ARTICLE_TEMPLATES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                        </select>
                        <select className="article-filter-select" value={articleSort} onChange={e => setArticleSort(e.target.value)}>
                          <option value="updated">按更新时间</option>
                          <option value="created">按创建时间</option>
                          <option value="title">按标题排序</option>
                        </select>
                        <span className="article-count">{filteredArticles.length} 篇</span>
                      </div>
                      <div className="articles-list">
                        {filteredArticles.map(a => (
                          <div key={a.id} className="article-item">
                            <div className="article-item-main" onClick={() => { setCurrentArticleId(a.id); setEditorTab('edit'); }}>
                              <h3 className="article-item-title">{a.title}</h3>
                              <div className="article-item-meta">
                                <span className={`article-status-badge status-${a.status}`}>{ARTICLE_STATUS[a.status]}</span>
                                <span>{ARTICLE_TEMPLATES[a.template] || a.template}</span>
                                {a.spaceId && (() => { const sp = articleSpaces.find(s => s.id === a.spaceId); return sp ? <span className="article-space-badge">{sp.name}</span> : null; })()}
                                <span>{new Date(a.updatedAt).toLocaleDateString('zh-CN')}</span>
                                {a.tags.length > 0 && a.tags.slice(0, 3).map(t => <span key={t} className="article-tag-pill">{t}</span>)}
                              </div>
                            </div>
                            <div className="article-item-actions">
                              <select className="article-space-assign" value={a.spaceId || ''} onClick={e => e.stopPropagation()} onChange={e => assignArticleToSpace(a.id, e.target.value ? Number(e.target.value) : null)}>
                                <option value="">未分配</option>
                                {articleSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                              <button className="btn-duplicate" onClick={() => duplicateArticle(a.id)} title="复制">{ICONS.layers}</button>
                              <button className="btn-delete-article" onClick={() => { if (confirm('确定删除？')) deleteArticle(a.id); }} title="删除">{ICONS.trash}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
  );
}
