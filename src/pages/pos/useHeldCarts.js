import { useEffect, useState } from 'react';
import { message } from 'antd';
import { createUuid } from '../../utils/browserSafe';

export default function useHeldCarts(staffId, branchCode) {
  const key = `optivision.pos.held.v1:${staffId || 'unknown'}:${branchCode || 'none'}`;
  const [drafts, setDrafts] = useState([]);
  function read() {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value) || value.some(d => !d.id || !Array.isArray(d.items))) throw new Error('Dữ liệu đơn tạm không hợp lệ. Không thể ghi đè.');
    return value;
  }
  function write(value) { localStorage.setItem(key, JSON.stringify(value)); setDrafts(value); }
  useEffect(() => {
    function refresh() { try { setDrafts(read()); } catch { setDrafts([]); message.error('Không đọc được đơn tạm. Dữ liệu cũ vẫn được giữ.'); } }
    refresh(); window.addEventListener('storage', refresh); return () => window.removeEventListener('storage', refresh);
  }, [key]);
  function hold(cart, customer, voucherCode, pointsToUse, linkedRx) {
    if (!branchCode || !staffId) throw new Error('Chọn chi nhánh và đăng nhập trước khi lưu tạm.');
    if (!cart.length) throw new Error('Giỏ hàng đang trống.');
    const draft = { id: createUuid(), savedAt: new Date().toISOString(), branchCode,
      customer: customer ? { id: customer.id ?? null, name: customer.name, phone: customer.phone, tier: customer.tier } : null,
      voucherCode, pointsToUse, prescriptionId: linkedRx?.id, prescriptionCode: linkedRx?.code,
      linkedRx: linkedRx ? { ...linkedRx } : null,
      items: cart.map(item => ({ sku: item.sku, quantity: item.quantity, name: item.name, price: item.price })) };
    const current = read(); if (current.length >= 30) throw new Error('Đã có 30 đơn tạm. Vui lòng xử lý bớt trước.');
    write([draft, ...current]); return draft;
  }
  function remove(id) { write(read().filter(draft => draft.id !== id)); }
  return { drafts, hold, remove };
}
