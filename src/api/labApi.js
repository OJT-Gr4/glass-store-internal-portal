import { apiFetch } from './client';
let tierCache = { key: '', expires: 0, rows: [] };

export const labApi = {
  async getPendingOrders() {
    const response = await apiFetch('/api/orders/lab-pending');
    if (!Array.isArray(response?.data)) throw new Error('Không tải được hàng chờ xác nhận toa.');
    return response.data;
  },
  async approveOrderPrescription(id, data) {
    return (await apiFetch(`/api/orders/${id}/lab-prescription`, { method: 'PUT', body: JSON.stringify(data) }))?.data;
  },
  /**
   * Lấy danh sách lệnh mài lắp gia công xưởng
   * @param {string|null} status - PENDING, IN_PROGRESS, QC_PENDING, QC_PASSED, QC_FAILED
   */
  async getAllLabJobs(status = null) {
    const url = status ? `/api/lab-jobs?status=${status}` : '/api/lab-jobs';
    const [res, pending] = await Promise.all([apiFetch(url), labApi.getPendingOrders()]);
    const waitingPos = new Set(pending.filter(order => order.state === 'WAITING_POS').map(order => String(order.id)));
    const jobs = (res?.data || []).filter(job => !waitingPos.has(String(job.orderId)));
    const ids = [...new Set(jobs.map(job => Number(job.orderId)).filter(id => id > 0))].sort((a, b) => a - b);
    const key = `${localStorage.getItem('optivision_jwt_token')}:${ids.join(',')}`;
    try {
      if (tierCache.key !== key || tierCache.expires < Date.now()) {
        const rows = [];
        for (let offset = 0; offset < ids.length; offset += 200) {
          const response = await apiFetch(`/api/orders/lab-customer-tiers?orderIds=${ids.slice(offset, offset + 200).join(',')}`);
          rows.push(...(response?.data || []));
        }
        tierCache = { key, rows, expires: Date.now() + 30000 };
      }
      const byOrder = new Map(tierCache.rows.map(row => [String(row.orderId), row]));
      return jobs.map(job => ({ ...job, customerTier: byOrder.get(String(job.orderId))?.tier || 'Chưa tải được hạng', customerTierCode: byOrder.get(String(job.orderId))?.tierCode }));
    } catch {
      return jobs.map(job => ({ ...job, customerTier: 'Chưa tải được hạng' }));
    }
  },

  /**
   * Lấy chi tiết lệnh mài kính theo ID
   */
  async getLabJobById(id) {
    const res = await apiFetch(`/api/lab-jobs/${id}`);
    return res?.data;
  },

  /**
   * Cập nhật trạng thái lệnh gia công và ghi chú QC
   */
  async updateStatus(id, status, qcNotes = '') {
    const res = await apiFetch(`/api/lab-jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, qcNotes }),
    });
    return res?.data;
  },

  /**
   * Tương thích với interface updateLabJobStatus(id, { status, qcNotes, ... })
   */
  async updateLabJobStatus(id, dataOrStatus, qcNotes = '') {
    if (typeof dataOrStatus === 'object' && dataOrStatus !== null) {
      const { status, qcNotes: notes = '', notes: generalNotes = '' } = dataOrStatus;
      const effectiveNotes = notes || generalNotes || '';
      const res = await apiFetch(`/api/lab-jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          qcNotes: effectiveNotes,
          notes: effectiveNotes,
          technicianNotes: dataOrStatus.technicianNotes,
          technicianName: dataOrStatus.technicianName
        }),
      });
      return res?.data;
    }
    return this.updateStatus(id, dataOrStatus, qcNotes);
  }
};
