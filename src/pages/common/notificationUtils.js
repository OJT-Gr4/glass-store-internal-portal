import { ROLES } from '../../routes/rolesConfig.js';

export const DEFAULT_POLL_INTERVAL_SECONDS = 15;

export function normalizePollIntervalMs(pollIntervalSeconds) {
  const num = Number(pollIntervalSeconds);
  if (!Number.isFinite(num) || num <= 0) {
    return DEFAULT_POLL_INTERVAL_SECONDS * 1000;
  }
  const clampedSeconds = Math.max(5, Math.min(120, Math.round(num)));
  return clampedSeconds * 1000;
}

export function formatNotificationTime(value) {
  if (!value) return 'Vừa cập nhật';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Vừa cập nhật';
  return parsed.toLocaleString('vi-VN');
}

export function categoryMeta(category) {
  const clean = String(category || '').toUpperCase();
  switch (clean) {
    case 'LAB_READY':
      return { label: 'Kính sẵn sàng (Lab)', color: 'green', icon: 'verified' };
    case 'LAB_REWORK':
      return { label: 'Cảnh báo mài lại / QC', color: 'orange', icon: 'build' };
    case 'APPOINTMENT':
      return { label: 'Lịch hẹn đo mắt', color: 'blue', icon: 'calendar_month' };
    case 'ORDER':
      return { label: 'Đơn hàng OMS / POS', color: 'cyan', icon: 'receipt_long' };
    case 'WARRANTY':
      return { label: 'Bảo hành & Hậu mãi', color: 'purple', icon: 'verified_user' };
    default:
      return { label: clean || 'Hệ thống', color: 'default', icon: 'notifications' };
  }
}

export function channelStatusBadge(channelName, status, detail) {
  const clean = String(status || '').toUpperCase();
  if (clean === 'DELIVERED') {
    return { text: `${channelName}: Đã nhận`, color: 'blue', detail: detail || 'Đã lưu hộp thư chủ sở hữu' };
  }
  if (clean === 'SENT') {
    return { text: `${channelName}: Đã gửi`, color: 'green', detail: detail || 'Provider xác nhận 2xx' };
  }
  if (clean === 'BLOCKED_PROVIDER_UNCONFIGURED') {
    return { text: `${channelName}: Blocked (Thiếu cổng ngoài)`, color: 'gold', detail: detail || 'Chưa cấu hình cổng ngoài' };
  }
  if (clean === 'FAILED') {
    return { text: `${channelName}: Gửi thất bại`, color: 'red', detail: detail || 'Provider từ chối / lỗi mạng' };
  }
  return { text: `${channelName}: Không áp dụng`, color: 'default', detail: detail || 'Không kích hoạt cho người nhận này' };
}

const ALLOWED_ROUTES_BY_ROLE = {
  [ROLES.ADMIN]: ['/dashboard', '/pos', '/orders', '/optometry-appointments', '/optometry', '/lab', '/lab-qc', '/crm', '/warranty', '/settings'],
  [ROLES.POS]: ['/dashboard', '/pos', '/orders', '/crm', '/warranty'],
  [ROLES.OPTOMETRY]: ['/dashboard', '/optometry-appointments', '/optometry', '/crm'],
  [ROLES.LAB]: ['/dashboard', '/lab', '/lab-qc', '/inventory', '/stock-transfer', '/stock-vouchers'],
};

export function resolvePortalActionRoute(actionRoute, currentRole) {
  const allowed = ALLOWED_ROUTES_BY_ROLE[currentRole] || ['/dashboard'];
  if (actionRoute && allowed.includes(actionRoute)) {
    return actionRoute;
  }
  return null;
}

export function applySingleMarkRead(items, unreadCount, updatedItem) {
  const prevTarget = items.find((item) => item.id === updatedItem.id);
  const decremented = prevTarget && !prevTarget.read ? Math.max(0, unreadCount - 1) : unreadCount;
  const nextItems = items.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem, read: true } : item));
  return { items: nextItems, unreadCount: decremented };
}
