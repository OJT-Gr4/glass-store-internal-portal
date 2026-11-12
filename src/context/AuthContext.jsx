import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import { ROLES, ROLE_INFO } from '../routes/rolesConfig';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);
const STORAGE_KEY = 'optivision_auth_user';
const DEFAULT_AVATAR_URL = 'https://i.pinimg.com/236x/3e/f1/fc/3ef1fcc3b6cbb97199f961bb0b3ead3f.jpg';

function staffProfile(data, token) {
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  const role = roles.includes('ROLE_ADMIN') ? ROLES.ADMIN
    : roles.includes('ROLE_OPTOMETRIST') ? ROLES.OPTOMETRY
    : roles.includes('ROLE_LAB_TECH') ? ROLES.LAB
    : roles.includes('ROLE_SALES_STAFF') ? ROLES.POS : null;
  if (!role) throw new Error('Tài khoản không có quyền truy cập cổng nội bộ.');
  const info = ROLE_INFO[role];
  return {
    id: data.id, staffId: data.employeeCode || data.username,
    staffName: data.fullName || data.username, role,
    roleLabel: info.name, roleBadge: info.badgeText,
    branchName: data.branchName || '',
    avatarUrl: data.avatarUrl || DEFAULT_AVATAR_URL,
    defaultRoute: info.defaultRoute,
    token, loginAt: new Date().toISOString()
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const data = await authApi.getMe();
        if (active && data) {
          const profile = staffProfile(data, localStorage.getItem('optivision_jwt_token'));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          setUser(profile);
        }
      } catch {
        if (active) { authApi.logout(); setUser(null); }
      } finally {
        if (active) setChecking(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  const login = async (input) => {
    const username = (input.username || '').trim();
    const password = input.password || '';
    if (!username || !password) throw new Error('Vui lòng nhập tài khoản và mật khẩu.');
    setUser(null);
    try {
      const data = await authApi.login({ username, password });
      const profile = staffProfile(data, data.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      setUser(profile);
      message.success(`Đăng nhập thành công! Xin chào ${profile.staffName}`);
      return profile.defaultRoute;
    } catch (error) {
      authApi.logout();
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    authApi.logout(); setUser(null);
    message.success('Đã đăng xuất khỏi hệ thống');
  };
  const updateAvatar = async (avatarUrl) => {
    const updated = await authApi.updateMyAvatar(avatarUrl);
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, avatarUrl: updated?.avatarUrl || DEFAULT_AVATAR_URL };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return updated;
  };
  const hasRole = allowed => Boolean(user && (user.role === ROLES.ADMIN || !allowed?.length || allowed.includes(user.role)));
  const value = { user, isAuthenticated: Boolean(user?.token), login, logout, updateAvatar, hasRole, roleInfo: user ? ROLE_INFO[user.role] : null };
  if (checking) return <div role="status">Đang xác thực phiên đăng nhập…</div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}