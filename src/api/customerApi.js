import { apiFetch } from './client';

export const customerApi = {
  /**
   * Lấy danh sách khách hàng từ db_identity
   */
  async getCustomerList() {
    const res = await apiFetch('/api/users/customers');
    return res?.data || [];
  },

  /**
   * Tìm kiếm khách hàng theo từ khóa (tên, SĐT, email, mã)
   */
  async searchCustomers(query) {
    if (!query?.trim()) return this.getCustomerList();
    const res = await apiFetch(`/api/users/customers/search?q=${encodeURIComponent(query.trim())}`);
    return res?.data || [];
  },

  /**
   * Lấy thông tin chi tiết một khách hàng theo ID
   */
  async getCustomerById(id) {
    const res = await apiFetch(`/api/users/${id}`);
    return res?.data;
  },

  /**
   * Tạo mới hồ sơ khách hàng
   * @param {Object} data { fullName, phoneNumber, email, address, gender, membershipTier, marketingConsent }
   */
  async createCustomer(data) {
    const res = await apiFetch('/api/users/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  /**
   * Cập nhật hồ sơ khách hàng và consent (S3-04)
   * @param {number|string} id
   * @param {Object} data { fullName, phoneNumber, email, address, gender, marketingConsent }
   */
  async updateCustomer(id, data) {
    const res = await apiFetch(`/api/users/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res?.data;
  },

  /**
   * Lấy danh sách tương tác / nhật ký chăm sóc của khách hàng (S3-04)
   */
  async getCustomerInteractions(customerId) {
    const res = await apiFetch(`/api/users/customers/${customerId}/interactions`);
    return res?.data || [];
  },

  /**
   * Xóa khách hàng khỏi hệ thống
   */
  async deleteCustomer(id) {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    return res?.data;
  },

  /**
   * Thêm tương tác / ghi chú chăm sóc mới (S3-04)
   * @param {number|string} customerId
   * @param {Object} data { channel, content }
   */
  async addCustomerInteraction(customerId, data) {
    const res = await apiFetch(`/api/users/customers/${customerId}/interactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res?.data;
  }
};
