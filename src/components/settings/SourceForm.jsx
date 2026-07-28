import { ICONS } from '../../constants/index.jsx';

/**
 * 信息源编辑/添加表单（从 SourcesTab.jsx 抽离）
 * 当 showSourceForm 为 true 时以模态形式渲染。
 */
export default function SourceForm({
  showSourceForm,
  editingSource,
  setEditingSource,
  newSource,
  setNewSource,
  setShowSourceForm,
  setCustomSources,
}) {
  if (!showSourceForm) return null;

  const close = () => {
    setShowSourceForm(false);
    setEditingSource(null);
    setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
  };

  const save = () => {
    if (editingSource) {
      setCustomSources(prev => prev.map(s => s.id === editingSource.id ? editingSource : s));
      setEditingSource(null);
    } else {
      if (!newSource.name.trim() || !newSource.url.trim()) {
        alert('请填写名称和 URL');
        return;
      }
      const source = {
        ...newSource,
        id: Date.now(),
        tags: newSource.tags ? newSource.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      setCustomSources(prev => [...prev, source]);
      setNewSource({ name: '', url: '', region: 'overseas', category: '', tags: '', notes: '' });
    }
    setShowSourceForm(false);
  };

  const bindField = (field) => ({
    value: editingSource ? editingSource[field] ?? (field === 'tags' ? [] : '') : newSource[field],
    onChange: e => {
      const v = e.target.value;
      if (editingSource) {
        setEditingSource(prev => ({ ...prev, [field]: v }));
      } else {
        setNewSource(prev => ({ ...prev, [field]: v }));
      }
    }
  });

  const bindTags = () => ({
    value: editingSource ? (editingSource.tags || []).join(', ') : newSource.tags,
    onChange: e => {
      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
      if (editingSource) {
        setEditingSource(prev => ({ ...prev, tags }));
      } else {
        setNewSource(prev => ({ ...prev, tags }));
      }
    }
  });

  return (
    <div className="source-form-modal-overlay">
      <div className="source-form-modal">
        <div className="source-form-header">
          <h3>{editingSource ? '编辑信息源' : '添加信息源'}</h3>
          <button className="source-form-close" onClick={close}>{ICONS.x}</button>
        </div>
        <div className="source-form-body">
          <div className="source-form-group">
            <label>名称 *</label>
            <input type="text" {...bindField('name')} placeholder="如：TechCrunch" className="source-form-input" />
          </div>
          <div className="source-form-group">
            <label>RSS/Atom URL *</label>
            <input type="text" {...bindField('url')} placeholder="https://example.com/feed.xml" className="source-form-input" />
          </div>
          <div className="source-form-group">
            <label>地区</label>
            <select {...bindField('region')} className="source-form-select">
              <option value="overseas">海外</option>
              <option value="domestic">国内</option>
              <option value="global">全球</option>
            </select>
          </div>
          <div className="source-form-group">
            <label>分类</label>
            <input type="text" {...bindField('category')} placeholder="如：AI、硬件、开源" className="source-form-input" />
          </div>
          <div className="source-form-group">
            <label>标签（逗号分隔）</label>
            <input type="text" {...bindTags()} placeholder="如：科技, AI, 机器学习" className="source-form-input" />
          </div>
          <div className="source-form-group">
            <label>备注</label>
            <textarea {...bindField('notes')} rows={3} placeholder="可选备注信息..." className="source-form-textarea" />
          </div>
        </div>
        <div className="source-form-footer">
          <button className="btn-cancel" onClick={close}>取消</button>
          <button className="btn-save" onClick={save}>
            {editingSource ? '保存修改' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}
