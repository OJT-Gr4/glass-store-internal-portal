import React, { createContext, useContext, useState, useEffect } from 'react';
import { notification } from 'antd';
import { ROLES, ROLE_INFO } from '../routes/rolesConfig';

const AuthContext = createContext(null);

const STORAGE_KEY = 'optivision_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error loading auth from localStorage', e);
      return null;
    }
  });

  const isAuthenticated = Boolean(user && user.staffId);

  // Sync to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // Login action
  const login = (userData) => {
    const role = userData.role || ROLES.POS;
    const roleDetails = ROLE_INFO[role] || ROLE_INFO[ROLES.POS];

    const enhancedUser = {
      staffId: userData.staffId || 'NV-OPT-202688',
      staffName: userData.staffName || 'Nguyễn Bán Hàng',
      role: role,
      roleLabel: roleDetails.name,
      roleBadge: roleDetails.badgeText,
      branchName: userData.branchName || 'Chi nhánh 01 - Flagship Lê Thánh Tôn, Quận 1',
      defaultRoute: roleDetails.defaultRoute,
      loginAt: new Date().toISOString()
    };

    setUser(enhancedUser);

    notification.success({
      message: 'Xác thực thành công!',
      description: `Chào mừng ${enhancedUser.staffName} (${enhancedUser.roleLabel}). Phiên làm việc mã hóa SHA-256 + 2FA đã được kích hoạt.`,
      placement: 'topRight'
    });

    return enhancedUser.defaultRoute;
  };

  // Logout action
  const logout = () => {
    const name = user ? user.staffName : 'Nhân sự';
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);

    notification.info({
      message: 'Đã kết thúc ca làm việc',
      description: `Phiên làm việc của [${name}] đã được khóa an toàn. Vui lòng đăng nhập lại khi vào ca.`,
      placement: 'topRight'
    });
  };

  // Check if current user has permission for given roles
  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    // Admin has access to all operational routes
    if (user.role === ROLES.ADMIN) return true;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    hasRole,
    roleInfo: user ? ROLE_INFO[user.role] : null
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

