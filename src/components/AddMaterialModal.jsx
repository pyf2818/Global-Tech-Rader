import { ICONS } from '../constants/index.jsx';

export default function AddMaterialModal({
  showAddMaterial,
  setShowAddMaterial,
  addManualMaterial,
  materialSpaces,
}) {
  if (!showAddMaterial) return null;
  return (
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
              setShowAddMaterial(false);
              e.target.reset();
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
  );
}
