export const repairStatuses = { RECEIVED: 'Đã tiếp nhận', IN_PROGRESS: 'Đang sửa', READY_FOR_PICKUP: 'Đã hoàn thành', COMPLETED: 'Đã hoàn thành' };
export const repairServices = {
  FRAME_ADJUSTMENT: 'Nắn/chỉnh gọng', NOSE_PAD_REPLACEMENT: 'Thay ve mũi',
  SCREW_TIGHTENING: 'Xiết ốc', SCREW_REPLACEMENT: 'Thay ốc', TITANIUM_FRAME_ADJUSTMENT: 'Chỉnh gọng titanium',
  ULTRASONIC_CLEANING: 'Vệ sinh kính', OTHER_TECHNICAL_SERVICE: 'Dịch vụ kỹ thuật khác',
};
export const dateTime = value => value ? new Date(value).toLocaleString('vi-VN') : '—';
export function pickupDefault(now = new Date()) {
  const date = new Date(now.getTime() + 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export function repairPayload(values, actor) {
  if (!actor) throw new Error('Thiếu thông tin nhân viên tiếp nhận. Vui lòng đăng nhập lại.');
  const result = { ...values, receptionEmployee: actor };
  for (const field of ['customerName','customerPhone','productName','frameCondition','lensCondition','reportedProblem','physicalCondition']) {
    result[field] = String(values[field] || '').trim();
    if (!result[field]) throw new Error('Vui lòng nhập đầy đủ thông tin tiếp nhận.');
  }
  const hasOrder = values.orderId !== '' && values.orderId != null;
  const hasOrderItem = values.orderItemId !== '' && values.orderItemId != null;
  const hasCustomer = values.customerId !== '' && values.customerId != null;
  const isWalkIn = !hasOrder && !hasOrderItem && !hasCustomer;
  if (!isWalkIn) {
    if (!hasOrder || !hasOrderItem) throw new Error('Không xác định được đơn hàng và sản phẩm cần sửa chữa.');
    // The backend resolves the customer from the selected order/item, including walk-in sales.
  }
  if (!values.requestedServices?.length || values.requestedServices.some(value => !repairServices[value])) throw new Error('Vui lòng chọn dịch vụ hợp lệ.');
  if (!values.expectedPickupAt || new Date(values.expectedPickupAt).getTime() <= Date.now()) throw new Error('Giờ hẹn trả phải sau thời điểm hiện tại.');
  result.expectedPickupAt = values.expectedPickupAt.length === 16 ? `${values.expectedPickupAt}:00` : values.expectedPickupAt;
  result.orderId = hasOrder ? Number(values.orderId) : null;
  result.orderItemId = hasOrderItem ? Number(values.orderItemId) : null;
  result.customerId = hasCustomer ? Number(values.customerId) : null;
  for (const field of ['orderId', 'orderItemId', 'customerId']) {
    if (result[field] != null && (!Number.isSafeInteger(result[field]) || result[field] <= 0)) throw new Error('Mã đơn hàng, sản phẩm hoặc khách hàng không hợp lệ.');
  }
  return result;
}
