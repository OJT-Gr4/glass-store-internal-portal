import { apiFetch } from './client.js';

export const authApi = {
  /**
   * Đăng nhập hệ thống (Staff / Admin / KTV)
   * @param {Object} credentials { username, password }
   */
  async login(credentials) {
    authApi.logout();
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (!res?.data?.token || res.data.token.split('.').length !== 3)
      throw new Error('Máy chủ không trả về phiên đăng nhập hợp lệ.');
    localStorage.setItem('optivision_jwt_token', res.data.token);

    return res?.data;
  },

  async getMe() {
    const token = localStorage.getItem('optivision_jwt_token');
    if (!token || token.split('.').length !== 3) { authApi.logout(); return null; }
    const response = await apiFetch('/api/auth/me');
    if (!response?.data?.id) throw new Error('Không xác thực được phiên đăng nhập.');
    return response.data;
  },

  logout() {
    localStorage.removeItem('optivision_jwt_token');
    localStorage.removeItem('optivision_auth_user');
  },

  async sendOtp(payload) {
    const res = await apiFetch('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data;
  },

  async verifyPhoneOtp(payload) {
    const res = await apiFetch('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data;
  },

  async resetPassword(payload) {
    const res = await apiFetch('/api/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    authApi.logout();
    return res?.data;
  },

  async updateMyAvatar(avatarUrl) {
    const res = await apiFetch('/api/auth/me/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
    return res?.data;
  }
};
