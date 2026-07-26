import { ICONS } from '../constants/index.jsx';

export default function ProfileModal({
  showProfileModal,
  setShowProfileModal,
  user,
  setUser,
  profileForm,
  setProfileForm,
  selectedInterests,
  categories,
  updateUserProfile,
  setShowInterestModal,
  setShowUserMenu,
  handleLogout,
  showToast,
}) {
  if (!showProfileModal) return null;
  return (
    <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>个人资料</h3>
          <button className="modal-close" onClick={() => setShowProfileModal(false)}>{ICONS.x}</button>
        </div>
        <div className="modal-body auth-modal-body">
          <div className="profile-avatar-section">
            <div className="profile-avatar-preview">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" />
              ) : (
                <div className="profile-avatar-default">{(user?.displayName || user?.username)?.[0]?.toUpperCase() || 'U'}</div>
              )}
            </div>
            <label className="profile-avatar-upload-btn">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    setUser(prev => ({ ...prev, avatar: base64 }));
                    updateUserProfile({ avatar: base64 });
                    showToast('头像已更新');
                  };
                  reader.readAsDataURL(file);
                }}
                style={{ display: 'none' }}
              />
              更换头像
            </label>
          </div>
          <div className="auth-form">
            <div className="auth-field">
              <label>显示名称</label>
              <input
                type="text"
                value={profileForm.displayName}
                onChange={e => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder={user?.displayName || user?.username || '显示名称'}
              />
            </div>
            <div className="auth-field">
              <label>个性签名</label>
              <input
                type="text"
                value={profileForm.signature}
                onChange={e => setProfileForm(prev => ({ ...prev, signature: e.target.value }))}
                placeholder="写点啥..."
              />
            </div>
            <div className="profile-interest-section">
              <label className="profile-interest-label">兴趣领域</label>
              <div className="profile-interest-tags">
                {selectedInterests.length === 0 && <span className="profile-interest-empty">暂无</span>}
                {selectedInterests.map(id => {
                  const cat = categories.find(c => c.id === id);
                  return cat ? (
                    <span key={id} className="profile-interest-tag">
                      {ICONS[cat.icon]} {cat.label}
                    </span>
                  ) : null;
                })}
              </div>
              <button className="profile-interest-edit" onClick={() => { setShowProfileModal(false); setShowInterestModal(true); }}>
                {ICONS.edit} 编辑兴趣
              </button>
            </div>
            <div className="profile-actions">
              <button
                className="auth-submit-btn"
                onClick={() => {
                  const newDisplayName = profileForm.displayName.trim();
                  const newSignature = profileForm.signature.trim();
                  setUser(prev => ({ ...prev, displayName: newDisplayName, signature: newSignature }));
                  updateUserProfile({ displayName: newDisplayName, signature: newSignature });
                  setShowProfileModal(false);
                  setProfileForm({ displayName: '', signature: '' });
                  showToast('资料已更新');
                }}
              >
                保存
              </button>
              <button className="profile-logout-btn" onClick={() => { setShowProfileModal(false); setShowUserMenu(false); handleLogout(); }}>
                {ICONS.power} 退出登录
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
