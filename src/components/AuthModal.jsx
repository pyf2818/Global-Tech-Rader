import { ICONS } from '../constants/index.jsx';

export default function AuthModal({
  showAuthModal, setShowAuthModal,
  authMode, setAuthMode,
  authForm, setAuthForm,
  handleLogin, handleRegister,
  authLoading, authError, setAuthError,
}) {
  if (!showAuthModal) return null;
  return (
    <div className="modal-overlay" data-testid="auth-modal" onClick={() => setShowAuthModal(false)}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{authMode === 'login' ? '登录' : '注册'}</h3>
          <button className="modal-close" onClick={() => setShowAuthModal(false)}>{ICONS.x}</button>
        </div>
        <div className="modal-body auth-modal-body">
          <div className="auth-tabs">
            <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} data-testid="auth-login-tab" onClick={() => { setAuthMode('login'); setAuthError(''); }}>登录</button>
            <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} data-testid="auth-register-tab" onClick={() => { setAuthMode('register'); setAuthError(''); }}>注册</button>
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          <div className="auth-form">
            <div className="auth-field">
              <label>用户名</label>
              <input
                data-testid="auth-username"
                type="text"
                value={authForm.username}
                onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="请输入用户名"
              />
            </div>
            {authMode === 'register' && (
              <div className="auth-field">
                <label>邮箱</label>
                <input
                  data-testid="auth-email"
                  type="email"
                  value={authForm.email}
                  onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱（选填）"
                />
              </div>
            )}
            <div className="auth-field">
              <label>密码</label>
              <input
                data-testid="auth-password"
                type="password"
                value={authForm.password}
                onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="请输入密码"
              />
            </div>
            {authMode === 'register' && (
              <div className="auth-field">
                <label>确认密码</label>
                <input
                  data-testid="auth-confirm-password"
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="请再次输入密码"
                />
              </div>
            )}
            <button
              className="auth-submit-btn"
              data-testid="auth-submit"
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              disabled={authLoading}
            >
              {authLoading ? '处理中...' : (authMode === 'login' ? '登录' : '注册')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
