// useAuth — 认证与用户会话状态，从 App.jsx 1124-1288 行提取
// 含 user/token/auth* 全套状态 + 3 个 localStorage 持久化 useEffect + 5 个 handler

import { useState, useEffect } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';
import { showToast } from '../utils/toast.js';

export function useAuth({ setSelectedInterests: externalSetInterests } = {}) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState(() => {
    try {
      const saved = localStorage.getItem('selectedInterests');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const isLoggedIn = !!user && !!token;

  // 持久化 user
  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);
  // 持久化 token
  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);
  // 持久化 selectedInterests
  useEffect(() => {
    localStorage.setItem('selectedInterests', JSON.stringify(selectedInterests));
  }, [selectedInterests]);

  const handleRegister = async () => {
    if (!authForm.username || !authForm.password) { setAuthError('用户名和密码不能为空'); return; }
    if (authForm.password !== authForm.confirmPassword) { setAuthError('两次输入的密码不一致'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authForm.username, password: authForm.password, email: authForm.email, interests: selectedInterests })
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setToken(data.token);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '', confirmPassword: '' });
        showToast('注册成功！');
      } else {
        setAuthError(data.message || '注册失败');
      }
    } catch {
      setAuthError('网络错误，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authForm.username || !authForm.password) { setAuthError('用户名和密码不能为空'); return; }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authForm.username, password: authForm.password })
      });
      const data = await res.json();
      if (data.ok) {
        setUser(data.user);
        setToken(data.token);
        if (data.user.interests) setSelectedInterests(data.user.interests);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '', confirmPassword: '' });
        showToast('登录成功！');
      } else {
        setAuthError(data.message || '登录失败');
      }
    } catch {
      setAuthError('网络错误，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setSelectedInterests([]);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedInterests');
    showToast('已退出登录');
  };

  const updateUserInterests = async (interests) => {
    if (!token) return;
    try {
      await fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, interests })
      });
      setSelectedInterests(interests);
      if (user) setUser({ ...user, interests });
    } catch (e) {
      console.error('Failed to update interests:', e);
    }
  };

  const updateUserProfile = async (updates) => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...updates })
      });
      const data = await res.json();
      if (data.ok && data.user) setUser(data.user);
    } catch (e) {
      console.error('Failed to update profile:', e);
    }
  };

  return {
    user, token, showAuthModal, authMode, authForm, authLoading, authError,
    showInterestModal, selectedInterests, isLoggedIn,
    setUser, setToken, setShowAuthModal, setAuthMode, setAuthForm, setSelectedInterests, setShowInterestModal,
    handleRegister, handleLogin, handleLogout, updateUserInterests, updateUserProfile,
  };
}
