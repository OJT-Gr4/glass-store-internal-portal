export const OMS_STATUS_CONFIG = {
  PENDING: ['Chờ thanh toán', 'orange'],
  PENDING_PAYMENT: ['Chờ thanh toán', 'orange'],
  PAID: ['Đã thanh toán', 'blue'],
  LAB_DISPATCH_FAILED: ['Chưa gửi được lệnh Lab', 'red'],
  WAITING_RX: ['Chờ toa kính', 'orange'],
  PROCESSING: ['Đang gia công', 'orange'],
  QC_PACKAGING: ['Chờ kiểm tra', 'purple'],
  SHIPPING: ['Đang giao', 'cyan'],
  COMPLETED: ['Hoàn tất', 'green'],
  CANCELLED: ['Đã hủy', 'default'],
  PENDING_CONFIRMATION: ['Chờ xác nhận', 'orange'],
  CONFIRMED: ['Đã xác nhận', 'blue'],
  PREPARING: ['Đang chuẩn bị hàng', 'gold'],
  READY_FOR_PICKUP: ['Chờ nhận tại quầy', 'cyan'],
  CANCEL_REQUESTED: ['Yêu cầu hủy', 'orange'],
  CANCEL_PENDING: ['Đang xử lý hủy', 'orange'],
  REFUND_PENDING: ['Chờ hoàn tiền', 'orange'],
  REFUNDED: ['Đã hoàn tiền', 'default'],
};

export function normalizeOmsStatus(status) {
  const norm = String(status || '').toUpperCase();
  if (norm === 'PREPARING') return 'PROCESSING';
  return norm;
}

export function requiresLabProcessing(order) {
  if (!order) return true;
  if (order.orderType === 'FRAME_ONLY' || order.orderType === 'ACCESSORY') return false;
  if (order.orderType === 'COMPLETE_GLASSES' || order.orderType === 'LENS_ONLY') return true;
  return Boolean(order.prescriptionId || order.prescription);
}

export function getOmsStatusMeta(status, order = null) {
  const norm = normalizeOmsStatus(status);
  if (['PAID', 'PROCESSING', 'CONFIRMED', 'PENDING_CONFIRMATION'].includes(norm) && needsClinicalReview(order)) return ['Chờ POS xác nhận', 'orange'];
  if (norm === 'PROCESSING') {
    return requiresLabProcessing(order)
      ? ['Đang gia công', 'orange']
      : ['Đang chuẩn bị hàng', 'gold'];
  }
  const upper = String(status || '').toUpperCase();
  return OMS_STATUS_CONFIG[norm] || OMS_STATUS_CONFIG[upper] || ['Chưa cập nhật', 'default'];
}

export function needsClinicalReview(order) {
  return !!order && requiresLabProcessing(order) && !order.labConfirmedAt;
}

export function getPaidStageAction(order, isModal = false) {
  if (needsClinicalReview(order)) return { label: 'Chờ POS xác nhận', reason: '', tooltip: 'Mở POS để kiểm tra khách hàng và thông số đơn, sau đó xác nhận gửi Lab.' };
  if (!requiresLabProcessing(order)) {
    return {
      label: 'Chuẩn bị giao hàng',
      reason: 'Chuẩn bị & đóng gói hàng xuất kho',
      tooltip: 'Chuyển sang bước chuẩn bị & đóng gói hàng',
    };
  }
  return {
    label: isModal ? 'Chuyển gia công' : 'Chuyển xưởng Lab',
    reason: 'Chuyển xưởng Lab mài lắp kính',
    tooltip: 'Chuyển xưởng Lab gia công',
  };
}
