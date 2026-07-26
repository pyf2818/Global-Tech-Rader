import React from 'react';
import { ICONS, MATERIAL_TYPES } from '../constants/index.jsx';

export default function MaterialsPage({
  materials, materialSpaces,
  materialSearch, setMaterialSearch,
  materialFilter, setMaterialFilter,
  materialSpaceFilter, setMaterialSpaceFilter,
  materialTimeRange, setMaterialTimeRange,
  materialSourceFilter, setMaterialSourceFilter,
  allMaterialSources,
  materialTags, setMaterialTags,
  allMaterialTags, filteredMaterials, selectedMaterials,
  exportMaterials, importMaterials,
  toggleMaterialStar, removeMaterial,
  batchRemoveMaterials, assignMaterialsToSpace,
  clearMaterialSelection, selectAllMaterials, toggleMaterialSelection,
  continueMaterialInWorkbench, materialRefCounts,
  showSpaceForm, setShowSpaceForm, newSpaceName, setNewSpaceName, createMaterialSpace,
  showAddMaterial, setShowAddMaterial, addManualMaterial, setLightbox,
}) {
  return (
    <>
    <div className="trends-dashboard">
      <div className="trends-header">
        <h2>{ICONS.layers}<span>素材库</span></h2>
        <p className="trends-desc">从资讯中收集的素材，共 {materials?.length || 0} 条</p>
        <div className="header-actions">
          <button className="btn-icon" onClick={exportMaterials} title="导出素材">
            {ICONS.link}
          </button>
          <label className="btn-icon" title="导入素材">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={e => { if (e.target.files[0]) importMaterials(e.target.files[0]); }}
            />
          </label>
          <button className="btn-add-material" onClick={() => setShowAddMaterial(true)}>
            {ICONS.plus} 添加素材
          </button>
        </div>
      </div>

      <section className="trends-section">
        <div className="materials-toolbar">
          <div className="materials-toolbar-row">
            <div className="space-tabs">
              <button 
                className={`space-tab ${materialSpaceFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMaterialSpaceFilter('all')}
              >
                全部 ({materials?.length || 0})
              </button>
              {materialSpaces.map(space => {
                const count = (materials || []).filter(m => m.spaceId === space.id).length;
                return (
                  <button 
                    key={space.id}
                    className={`space-tab ${materialSpaceFilter === String(space.id) ? 'active' : ''}`}
                    onClick={() => setMaterialSpaceFilter(String(space.id))}
                  >
                    {space.name} ({count})
                  </button>
                );
              })}
              <button className="space-tab space-tab-add" onClick={() => setShowSpaceForm(true)}>+ 新建空间</button>
            </div>
          </div>
          <div className="materials-toolbar-row">
            <div className="material-search">
              {ICONS.search}
              <input 
                type="text" 
                placeholder="搜索素材内容、来源、标签..." 
                value={materialSearch} 
                onChange={e => setMaterialSearch(e.target.value)} 
              />
            </div>
            <select className="material-filter" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
              <option value="all">全部类型</option>
              <option value="quote">金句</option>
              <option value="data">数据</option>
              <option value="case">案例</option>
              <option value="viewpoint">观点</option>
              <option value="chart">图表</option>
            </select>
            <select className="material-filter" value={materialTimeRange} onChange={e => setMaterialTimeRange(e.target.value)}>
              <option value="all">全部时间</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
            </select>
            {allMaterialSources.length > 0 && (
              <select className="material-filter" value={materialSourceFilter} onChange={e => setMaterialSourceFilter(e.target.value)}>
                <option value="all">全部来源</option>
                {allMaterialSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          {allMaterialTags.length > 0 && (
            <div className="material-tag-filters">
              <span className="tag-filter-label">标签:</span>
              {allMaterialTags.slice(0, 15).map(tag => (
                <button 
                  key={tag}
                  className={`material-tag-btn ${materialTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => setMaterialTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                >
                  {tag}
                </button>
              ))}
              {materialTags.length > 0 && (
                <button className="tag-clear-btn" onClick={() => setMaterialTags([])}>清除</button>
              )}
            </div>
          )}
          <div className="materials-actions">
            <span className="material-count">{filteredMaterials.length} / {materials.length} 条</span>
            {selectedMaterials.length > 0 && (
              <div className="batch-actions">
                <span className="batch-count">已选 {selectedMaterials.length} 项</span>
                <select className="batch-space-select" value="" onChange={e => { if (e.target.value) assignMaterialsToSpace(selectedMaterials, Number(e.target.value)); }}>
                  <option value="">移动到空间...</option>
                  {materialSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button className="btn-batch-delete" onClick={() => { if (confirm(`确定删除 ${selectedMaterials.length} 条素材？`)) batchRemoveMaterials(selectedMaterials); }}>批量删除</button>
                <button className="btn-clear-selection" onClick={clearMaterialSelection}>取消选择</button>
              </div>
            )}
            {selectedMaterials.length === 0 && materials.length > 0 && (
              <button className="btn-select-all" onClick={selectAllMaterials}>全选</button>
            )}
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="empty-materials">
            <div className="empty-icon">{ICONS.layers}</div>
            <p className="empty-title">{materialSearch || materialFilter !== 'all' || materialTags.length > 0 ? '没有找到匹配的素材' : '暂无素材'}</p>
            <p className="hint">{materialSearch || materialFilter !== 'all' || materialTags.length > 0 ? '试试调整筛选条件' : '浏览资讯时点击收藏按钮，或点击右上角"添加素材"手动添加'}</p>
          </div>
        ) : (
          <div className="materials-grid">
            {filteredMaterials.map(m => (
              <div key={m.id} className={`material-card material-${m.type} ${m.starred ? 'starred' : ''} ${selectedMaterials.includes(m.id) ? 'selected' : ''}`}>
                <div className="material-header">
                  <span className={`material-type-badge type-${m.type}`}>{MATERIAL_TYPES[m.type] || m.type}</span>
                  <div className="material-header-actions">
                    <button className="material-research" onClick={() => continueMaterialInWorkbench(m)} title="发送到 AI 工作站继续研究">
                      研究
                    </button>
                    <button className="material-star" onClick={() => toggleMaterialStar(m.id)} title={m.starred ? '取消星标' : '添加星标'}>
                      {m.starred ? '★' : '☆'}
                    </button>
                    <button className="material-remove" onClick={() => removeMaterial(m.id)} title="删除素材">{ICONS.x}</button>
                  </div>
                </div>
                <div className="material-checkbox-row">
                  <label className="material-checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={selectedMaterials.includes(m.id)} 
                      onChange={() => toggleMaterialSelection(m.id)} 
                    />
                    <span className="checkbox-custom"></span>
                  </label>
                </div>
                {m.title && <p className="material-title">{m.title}</p>}
                {m.imageUrl && (
                  <button className="material-image" onClick={() => setLightbox({ open: true, src: m.imageUrl, title: m.title })} title="查看素材图片">
                    <img src={m.imageUrl} alt={m.title || '素材图片'} loading="lazy" onError={e => { e.currentTarget.parentElement.style.display = 'none'; }} />
                  </button>
                )}
                {m.insight && (
                  <div className="material-insight">
                    {m.insight.why && <p><span>推荐</span>{m.insight.why}</p>}
                    {m.insight.scenario && <p><span>场景</span>{m.insight.scenario}</p>}
                    {m.insight.value && <p><span>价值</span>{m.insight.value}</p>}
                    {m.insight.audience && <p><span>适合</span>{m.insight.audience}</p>}
                    {m.insight.difficulty && <p><span>难度</span>{m.insight.difficulty}</p>}
                    {m.insight.quality && <p><span>质量</span>{m.insight.quality}</p>}
                  </div>
                )}
                <p className="material-content">{m.fullContent || m.content}</p>
                {m.url && (
                  <a className="material-link" href={m.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    查看原文
                  </a>
                )}
                {m.note && <p className="material-note">{m.note}</p>}
                <div className="material-meta">
                  <span className="material-source">{m.source}</span>
                  {m.tags && m.tags.length > 0 && (
                    <span className="material-tags">{m.tags.map(t => `#${t}`).join(' ')}</span>
                  )}
                  {materialRefCounts[m.id] && (
                    <span className="material-ref-count" title={`被 ${materialRefCounts[m.id]} 篇文章引用`}>
                      引用 {materialRefCounts[m.id]}
                    </span>
                  )}
                  <span className="material-date">{new Date(m.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>

  <div className="modal-backdrop" onClick={() => setShowSpaceForm(false)}>
    <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>新建素材空间</h3>
        <button className="modal-close" onClick={() => setShowSpaceForm(false)}>{ICONS.x}</button>
      </div>
      <form className="add-material-form" onSubmit={e => { e.preventDefault(); createMaterialSpace(); }}>
        <div className="form-group">
          <label>空间名称</label>
          <input 
            name="spaceName" 
            type="text" 
            placeholder="如：AI 素材、技术趋势、产品灵感" 
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-modal-cancel" onClick={() => setShowSpaceForm(false)}>取消</button>
          <button type="submit" className="btn-modal-submit">创建</button>
        </div>
      </form>
    </div>
  </div>

  <div className="modal-backdrop" onClick={() => setShowAddMaterial(false)}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3>添加素材</h3>
        <button className="modal-close" onClick={() => setShowAddMaterial(false)}>{ICONS.x}</button>
      </div>
      <form className="add-material-form" onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        addManualMaterial({
          title: fd.get('title') || '',
          content: fd.get('content') || '',
          type: fd.get('type') || 'quote',
          source: fd.get('source') || '',
          url: fd.get('url') || '',
          tags: fd.get('tags') || '',
          note: fd.get('note') || '',
          spaceId: fd.get('spaceId') || null
        });
      }}>
        <div className="form-group">
          <label>类型</label>
          <select name="type" defaultValue="quote">
            <option value="quote">金句</option>
            <option value="data">数据</option>
            <option value="case">案例</option>
            <option value="viewpoint">观点</option>
            <option value="chart">图表</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group form-group-flex">
            <label>所属空间</label>
            <select name="spaceId" defaultValue="">
              <option value="">默认空间</option>
              {materialSpaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>标题（可选）</label>
          <input name="title" type="text" placeholder="素材标题" />
        </div>
        <div className="form-group">
          <label>内容 *</label>
          <textarea name="content" required placeholder="素材内容..." rows="4" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>来源</label>
            <input name="source" type="text" placeholder="来源名称" />
          </div>
          <div className="form-group">
            <label>链接</label>
            <input name="url" type="url" placeholder="https://..." />
          </div>
        </div>
        <div className="form-group">
          <label>标签（逗号分隔）</label>
          <input name="tags" type="text" placeholder="AI, 大模型, 趋势" />
        </div>
        <div className="form-group">
          <label>备注</label>
          <input name="note" type="text" placeholder="个人备注..." />
        </div>
        <div className="form-actions">
          <button type="button" className="btn-modal-cancel" onClick={() => setShowAddMaterial(false)}>取消</button>
          <button type="submit" className="btn-modal-submit">添加</button>
        </div>
      </form>
    </div>
  </div>
    </>
  );
}
