import { apiFetch } from './client';

export const staffApi = {
  /**
   * Lấy toàn bộ danh sách nhân viên từ db_identity
   */
  async getStaffList() {
    const res = await apiFetch('/api/users/staff');
    return res?.data || [];
  },

  /**
   * Lấy chi tiết nhân viên theo ID
   */
  async getStaffById(id) {
    const res = await apiFetch(`/api/users/${id}`);
    return res?.data;
  },

  /**
   * Tạo mới nhân viên / Gửi yêu cầu đăng ký cấp quyền
   * @param {Object} data { fullName, email, phoneNumber, employeeCode, branchName, roleName, status, password }
   */
  async createStaff(data) {
    const res = await apiFetch('/api/users/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  async updateStaff(id, data) {
    const res = await apiFetch(`/api/users/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  async updateAvatar(id, avatarUrl) {
    const res = await apiFetch(`/api/users/${id}/avatar`, {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
    return res?.data;
  },

  /**
   * Đổi trạng thái kích hoạt / phê duyệt / khóa nhân viên
   * @param {number} id
   */
  async toggleStaffStatus(id) {
    const res = await apiFetch(`/api/users/${id}/status`, {
      method: 'PATCH',
    });
    return res?.data;
  },

  /**
   * Xóa nhân viên / Từ chối yêu cầu cấp quyền
   * @param {number} id
   */
  async deleteStaff(id) {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    return res?.data;
  }
};
