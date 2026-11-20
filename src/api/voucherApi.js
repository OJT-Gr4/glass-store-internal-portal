import { apiFetch } from './client.js';

const requestVoucher = async (path, options) => {
  const response = await apiFetch(path, options);
  return response?.data ?? response;
};

export const voucherApi = {
  getGrants: id => requestVoucher(`/api/vouchers/${id}/grants`),
  issue: (id, customerIds) => requestVoucher(`/api/vouchers/${id}/grants`, { method: 'POST', body: JSON.stringify({ customerIds }) }),
  revoke: (id, customerId) => requestVoucher(`/api/vouchers/${id}/grants/${customerId}`, { method: 'DELETE' }),
  getAllVouchers: () => requestVoucher('/api/vouchers'),
  getVoucherByCode: (code) => requestVoucher(`/api/vouchers/${encodeURIComponent(code)}`),
  createVoucher: (data) => requestVoucher('/api/vouchers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateVoucher: (id, data) => requestVoucher(`/api/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  toggleVoucher: (id) => requestVoucher(`/api/vouchers/${id}/toggle`, {
    method: 'PATCH'
  }),
  deleteVoucher: (id) => requestVoucher(`/api/vouchers/${id}`, {
    method: 'DELETE'
  }),
  quoteDiscount: (code, total, channel) => requestVoucher(`/api/vouchers/${encodeURIComponent(code)}/quote?total=${total}&channel=${channel || 'POS'}`)
};
