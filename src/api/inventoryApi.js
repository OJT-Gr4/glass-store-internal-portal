import { apiFetch } from './client';

export const inventoryApi = {
  getInventory: () => apiFetch('/api/inventory'),
  getReconciliation: () => apiFetch('/api/inventory/reconciliation'),
  getLocations: () => apiFetch('/api/inventory/locations'),
  getTransfers: () => apiFetch('/api/inventory/transfers'),
  getMovements: ({ page = 0, size = 50 } = {}) => apiFetch(`/api/inventory/movements?page=${page}&size=${size}`),
  createTransfer: (transfer) => apiFetch('/api/inventory/transfers', {
    method: 'POST',
    body: JSON.stringify(transfer)
  }),
  dispatchTransfer: (id) => apiFetch(`/api/inventory/transfers/${id}/dispatch`, {
    method: 'PATCH'
  }),
  receiveTransfer: (id) => apiFetch(`/api/inventory/transfers/${id}/receive`, {
    method: 'PATCH'
  }),
  adjustStock: (data) => apiFetch('/api/variants/adjust', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
