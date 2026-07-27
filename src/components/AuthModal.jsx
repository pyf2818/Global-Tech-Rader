import { useTranslation } from 'react-i18next';
import { ICONS } from '../constants/index.jsx';

export default function AuthModal({
  showAuthModal, setShowAuthModal,
  authMode, setAuthMode,
  authForm, setAuthForm,
  handleLogin, handleRegister,
  authLoading, authError, setAuthError,
}) {
  const { t } = useTranslation();
  if (!showAuthModal) return null;
  const isLogin = authMode === 'login';
  return (
    <div className="modal-overlay" data-testid="auth-modal" onClick={() => setShowAuthModal(false)}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isLogin ? t('auth.login') : t('auth.register')}</h3>
          <button className="modal-close" onClick={() => setShowAuthModal(false)}>{ICONS.x}</button>
        </div>
        <div className="modal-body auth-modal-body">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} data-testid="auth-login-tab" onClick={() => { setAuthMode('login'); setAuthError(''); }}>{t('auth.login')}</button>
            <button className={`auth-tab ${authMode === 'register' ? 'active' : ''}`} data-testid="auth-register-tab" onClick={() => { setAuthMode('register'); setAuthError(''); }}>{t('auth.register')}</button>
          </div>
          {authError && <div className="auth-error">{authError}</div>}
          <div className="auth-form">
            <div className="auth-field">
              <label>{t('auth.username')}</label>
              <input
                data-testid="auth-username"
                type="text"
                value={authForm.username}
                onChange={e => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder={isLogin ? t('auth.username') : t('auth.username')}
              />
            </div>
            {authMode === 'register' && (
              <div className="auth-field">
                <label>{t('auth.email')}</label>
                <input
                  data-testid="auth-email"
                  type="email"
                  value={authForm.email}
                  onChange={e => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={`${t('auth.email')}（${t('common.optional')}）`}
                />
              </div>
            )}
            <div className="auth-field">
              <label>{t('auth.password')}</label>
              <input
                data-testid="auth-password"
                type="password"
                value={authForm.password}
                onChange={e => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={t('auth.password')}
              />
            </div>
            {authMode === 'register' && (
              <div className="auth-field">
                <label>{t('auth.password')}</label>
                <input
                  data-testid="auth-confirm-password"
                  type="password"
                  value={authForm.confirmPassword}
                  onChange={e => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder={t('auth.password')}
                />
              </div>
            )}
            <button
              className="auth-submit-btn"
              data-testid="auth-submit"
              onClick={isLogin ? handleLogin : handleRegister}
              disabled={authLoading}
            >
              {authLoading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.register'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
