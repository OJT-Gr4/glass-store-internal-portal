export function getQuantityAtLocation(inventoryItem, locationCode) {
  const quantity = Number(inventoryItem?.quantities?.[locationCode] ?? 0);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
}

export function getSellableQuantityAtLocation(inventoryItem, locationCode) {
  const quantity = Number(
    inventoryItem?.sellableQuantities?.[locationCode]
      ?? inventoryItem?.quantities?.[locationCode]
      ?? 0
  );
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : 0;
}

export function validateTransferForm({ sourceLocationCode, destinationLocationCode, locations, lines, inventory }) {
  if (!locations.some((location) => location.code === sourceLocationCode)) {
    return 'Vui lòng chọn kho nguồn hợp lệ.';
  }
  if (!locations.some((location) => location.code === destinationLocationCode)) {
    return 'Vui lòng chọn kho đích hợp lệ.';
  }
  if (sourceLocationCode === destinationLocationCode) {
    return 'Kho nguồn và kho đích phải khác nhau.';
  }
  if (lines.length === 0) {
    return 'Phiếu điều chuyển phải có ít nhất một SKU.';
  }

  const items = lines.map((line) => ({
    sku: line.sku.trim(),
    quantity: Number(line.quantity)
  }));
  if (items.some((item) => !item.sku || !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return 'Vui lòng chọn SKU và nhập số lượng nguyên lớn hơn 0.';
  }
  if (new Set(items.map((item) => item.sku)).size !== items.length) {
    return 'Mỗi SKU chỉ được thêm một lần vào một phiếu.';
  }
  if (items.some((item) => {
    const product = inventory.find((entry) => entry.sku === item.sku);
    return !product || item.quantity > getSellableQuantityAtLocation(product, sourceLocationCode);
  })) {
    return 'Số lượng điều chuyển vượt tồn hiện tại tại kho nguồn.';
  }
  return null;
}

export function buildTransferPayload({ sourceLocationCode, destinationLocationCode, reason, lines }) {
  return {
    sourceLocationCode,
    destinationLocationCode,
    reason: reason.trim(),
    items: lines.map((line) => ({
      sku: line.sku.trim(),
      quantity: Number(line.quantity)
    }))
  };
}
