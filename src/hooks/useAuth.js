// Cookie-backed authentication. No session token or serialized user credential is stored in localStorage.
import { useEffect, useState } from 'react';
import { showToast } from '../utils/toast.js';

const EMPTY_FORM = { username: '', password: '', email: '', confirmPassword: '' };

function payloadUser(data) {
  return data?.data?.user || data?.user || null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data?.error?.message || data?.message || '请求失败');
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(EMPTY_FORM);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedInterests') || '[]'); } catch { return []; }
  });

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    try { localStorage.setItem('selectedInterests', JSON.stringify(selectedInterests)); } catch { /* local preference only */ }
  }, [selectedInterests]);

  useEffect(() => {
    // Remove credentials left by the retired bearer-token implementation.
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* storage may be disabled */ }
    let cancelled = false;
    requestJson('/api/auth/me').then(data => {
      if (!cancelled) {
        const current = payloadUser(data);
        setUser(current);
        if (Array.isArray(current?.interests) && current.interests.length) setSelectedInterests(current.interests);
      }
    }).catch(error => {
      if (!cancelled && error.status !== 401 && error.code !== 'DATABASE_UNAVAILABLE') setAuthError(error.message);
    });
    return () => { cancelled = true; };
  }, []);

  const handleRegister = async () => {
    if (!authForm.username || !authForm.password) { setAuthError('用户名和密码不能为空'); return; }
    if (authForm.password.length < 10) { setAuthError('密码长度需为 10-128 位'); return; }
    if (authForm.password !== authForm.confirmPassword) { setAuthError('两次输入的密码不一致'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const data = await requestJson('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authForm.username, password: authForm.password, email: authForm.email }) });
      const current = payloadUser(data); setUser(current);
      if (Array.isArray(current?.interests)) setSelectedInterests(current.interests);
      setShowAuthModal(false); setAuthForm({ ...EMPTY_FORM }); showToast('注册成功');
    } catch (error) { setAuthError(error.message); } finally { setAuthLoading(false); }
  };

  const handleLogin = async () => {
    if (!authForm.username || !authForm.password) { setAuthError('用户名和密码不能为空'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const data = await requestJson('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authForm.username, password: authForm.password }) });
      const current = payloadUser(data); setUser(current);
      if (Array.isArray(current?.interests) && current.interests.length) setSelectedInterests(current.interests);
      setShowAuthModal(false); setAuthForm({ ...EMPTY_FORM }); showToast('登录成功');
    } catch (error) { setAuthError(error.message); } finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    try { await requestJson('/api/auth/logout', { method: 'POST' }); } catch { /* local state still clears */ }
    setUser(null); setSelectedInterests([]); showToast('已退出登录');
  };

  const updateUserInterests = async (interests) => {
    if (!user) return;
    try {
      const data = await requestJson('/api/auth/interests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interests }) });
      const current = payloadUser(data); setSelectedInterests(interests); if (current) setUser(current);
    } catch (error) { showToast(error.message); }
  };

  const updateUserProfile = async (updates) => {
    if (!user) return;
    try {
      const data = await requestJson('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      const current = payloadUser(data); if (current) setUser(current);
    } catch (error) { showToast(error.message); }
  };

  return {
    user, token: '', showAuthModal, authMode, authForm, authLoading, authError,
    showInterestModal, selectedInterests, isLoggedIn,
    setUser, setToken: () => {}, setShowAuthModal, setAuthMode, setAuthForm, setSelectedInterests, setShowInterestModal,
    handleRegister, handleLogin, handleLogout, updateUserInterests, updateUserProfile,
  };
}
