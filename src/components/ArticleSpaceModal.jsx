import { ICONS } from '../constants/index.jsx';

export default function ArticleSpaceModal({
  articleSpaceFormOpen,
  setArticleSpaceFormOpen,
  newArticleSpaceName,
  setNewArticleSpaceName,
  createArticleSpace,
}) {
  if (!articleSpaceFormOpen) return null;
  return (
    <div className="modal-backdrop" onClick={() => setArticleSpaceFormOpen(false)}>
          <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建创作空间</h3>
              <button className="modal-close" onClick={() => setArticleSpaceFormOpen(false)}>{ICONS.x}</button>
            </div>
            <form className="add-material-form" onSubmit={e => { e.preventDefault(); createArticleSpace(newArticleSpaceName); }}>
              <div className="form-group">
                <label>空间名称</label>
                <input 
                  type="text" 
                  placeholder="如：技术博客、产品测评、学习笔记" 
                  value={newArticleSpaceName}
                  onChange={e => setNewArticleSpaceName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setArticleSpaceFormOpen(false)}>取消</button>
                <button type="submit" className="btn-modal-submit">创建</button>
              </div>
            </form>
          </div>
        </div>
  );
}
