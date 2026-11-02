// Token management utilities for Internal Portal

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export function getAccessToken() {
  return sessionStorage.getItem('portal_access_token');
}

export function getRefreshToken() {
  return sessionStorage.getItem('portal_refresh_token');
}

export function setTokens(accessToken, refreshToken) {
  sessionStorage.setItem('portal_access_token', accessToken);
  sessionStorage.setItem('portal_refresh_token', refreshToken);
}

export function clearTokens() {
  sessionStorage.removeItem('portal_access_token');
  sessionStorage.removeItem('portal_refresh_token');
  sessionStorage.removeItem('portal_user');
}

export function getStoredUser() {
  const raw = sessionStorage.getItem('portal_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setStoredUser(user) {
  sessionStorage.setItem('portal_user', JSON.stringify(user));
}

export function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
}

export function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function authFetch(url, options = {}) {
  let token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    token = await refreshAccessToken();
    if (!token) return { error: 'SESSION_EXPIRED' };
  }
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res;
}

