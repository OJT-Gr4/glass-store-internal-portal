export const warrantyStatuses = {
  WAITING_PROCESS: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  ACTIVE: 'Đang hiệu lực',
  REJECTED: 'Từ chối',
  EXPIRED: 'Hết hạn',
};

export function warrantyStatusMeta(status, fallbackLabel) {
  const key = String(status || '').toUpperCase();
  const label = fallbackLabel || warrantyStatuses[key] || status || '—';
  const color =
    key === 'COMPLETED' || key === 'ACTIVE'
      ? 'green'
      : key === 'IN_PROGRESS'
      ? 'blue'
      : key === 'WAITING_PROCESS'
      ? 'orange'
      : key === 'REJECTED'
      ? 'red'
      : 'default';
  return { key, label, color };
}

export function nextWarrantyTransition(status) {
  const key = String(status || '').toUpperCase();
  if (key === 'WAITING_PROCESS') {
    return {
      status: 'IN_PROGRESS',
      statusLabel: 'Đang xử lý',
      statusColor: '#2563eb',
      actionLabel: 'Tiếp nhận',
    };
  }
  if (key === 'IN_PROGRESS') {
    return {
      status: 'COMPLETED',
      statusLabel: 'Hoàn tất',
      statusColor: '#16a34a',
      actionLabel: 'Hoàn tất',
    };
  }
  return null;
}

export function filterWarrantyClaims(rows = [], query = '', statusFilter = 'ALL') {
  const q = String(query || '').trim().toLowerCase();
  const sf = String(statusFilter || 'ALL').toUpperCase();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (sf !== 'ALL' && String(row?.status || '').toUpperCase() !== sf) {
      return false;
    }
    if (!q) return true;
    const hay = [
      row?.warrantyCode,
      row?.originalOrderCode,
      row?.customerName,
      row?.customerPhone,
      row?.productName,
      row?.issueDescription,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}
