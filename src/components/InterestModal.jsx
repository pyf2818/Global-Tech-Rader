import { ICONS } from '../constants/index.jsx';
import { showToast } from '../utils/toast.js';

export default function InterestModal({ showInterestModal, setShowInterestModal, selectedInterests, setSelectedInterests, categories, CATEGORY_GROUPS, updateUserInterests }) {
  if (!showInterestModal) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowInterestModal(false)}>
          <div className="modal modal-lg interest-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择感兴趣的领域</h3>
              <button className="modal-close" onClick={() => setShowInterestModal(false)}>{ICONS.x}</button>
            </div>
            <div className="modal-body interest-modal-body">
              <p className="interest-desc">选择你感兴趣的领域，我们将为你精准推送相关内容</p>
              <div className="interest-groups">
                {CATEGORY_GROUPS.map(group => (
                  <div key={group.id} className="interest-group">
                    <div className="interest-group-title">
                      <span className="interest-group-icon">{ICONS[group.icon]}</span>
                      <span>{group.label}</span>
                    </div>
                    <div className="interest-group-items">
                      {group.categories.map(catId => {
                        const cat = categories.find(c => c.id === catId);
                        if (!cat) return null;
                        const isSelected = selectedInterests.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            className={`interest-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedInterests(prev => {
                                if (isSelected) {
                                  return prev.filter(id => id !== cat.id);
                                }
                                return [...prev, cat.id];
                              });
                            }}
                          >
                            <span className="interest-item-icon">{ICONS[cat.icon]}</span>
                            <span className="interest-item-label">{cat.label}</span>
                            {isSelected && <span className="interest-item-check">{ICONS.check}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer interest-modal-footer">
              <span className="interest-count">已选择 {selectedInterests.length} 个领域</span>
              <div className="interest-actions">
                <button className="btn-cancel" onClick={() => setShowInterestModal(false)}>取消</button>
                <button className="btn-save" onClick={() => { updateUserInterests(selectedInterests); setShowInterestModal(false); showToast('兴趣领域已保存'); }}>保存</button>
              </div>
            </div>
          </div>
        </div>
  );
}
