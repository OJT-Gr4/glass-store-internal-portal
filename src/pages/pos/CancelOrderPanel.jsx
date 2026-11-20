import React, { useState } from 'react';
import { Modal, message, Tag, Select } from 'antd';
import { orderApi } from '../../api/orderApi';
import { money } from './ProductCatalog';

const REFUND_REASONS = [
  'Khách trả hàng - Hoàn tiền tại quầy',
  'Kính sai độ đo khúc xạ / làm lại tròng',
  'Lỗi sản phẩm / bảo hành gọng & tròng',
  'Khách đổi ý / chọn mẫu kính khác',
  'Đơn trùng lặp / nhập nhầm tại quầy',
  'Lý do khác'
];

export default function CancelOrderPanel({ lastOrder, onChanged }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [order, setOrder] = useState(null);
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [refund, setRefund] = useState(true);
  const [busy, setBusy] = useState(false);

  async function lookup(event) {
    event?.preventDefault();
    if (!code.trim()) {
      message.warning('Vui lòng nhập mã đơn hàng (OPT-...).');
      return;
    }
    setBusy(true);
    try {
      const result = await orderApi.getOrderByCode(code.trim());
      const current = await orderApi.getOrderById(result.id);
      setOrder(current);
      setReason(current.cancelReason || REFUND_REASONS[0]);
      setCustomReason('');
      setRefund(true);
    } catch (error) {
      setOrder(null);
      message.error(error.message || 'Không tìm thấy đơn hàng.');
    } finally {
      setBusy(false);
    }
  }

  function getEffectiveReason() {
    return reason === 'Lý do khác' ? (customReason.trim() || 'Lý do khác') : reason;
  }

  function cancel() {
    const finalReason = getEffectiveReason();
    if (!finalReason) {
      message.warning('Vui lòng chọn hoặc nhập lý do hoàn tiền / hủy đơn.');
      return;
    }

    const actionName = order.status === 'COMPLETED' ? 'Hoàn tiền & Nhập lại kho' : 'Hủy đơn & Hoàn tiền';

    Modal.confirm({
      title: `Xác nhận ${actionName}?`,
      content: (
        <div style={{ marginTop: 8 }}>
          <p><strong>Mã đơn:</strong> {order.orderCode}</p>
          <p><strong>Số tiền hoàn trả:</strong> <span style={{ color: '#30483b', fontWeight: 'bold' }}>{money(order.finalAmount)}</span></p>
          <p><strong>Phương thức hoàn:</strong> {refundMethod === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR / Ngân hàng'}</p>
          <p><strong>Lý do:</strong> {finalReason}</p>
          <p style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>
            Hệ thống sẽ cập nhật trạng thái đơn, tự động hoàn trả số lượng kính về kho chi nhánh và cập nhật đối soát tài chính.
          </p>
        </div>
      ),
      okText: 'Xác nhận hoàn tiền',
      cancelText: 'Quay lại',
      okButtonProps: { danger: true },
      onOk: async () => {
        setBusy(true);
        try {
          const saved = await orderApi.cancel(order.id, finalReason, refund);
          setOrder(saved);
          onChanged(saved);
          message.success('Đã ghi nhận yêu cầu hoàn tiền và đồng bộ kho.');
        } catch (error) {
          message.error(error.message || 'Không thể hoàn tất yêu cầu.');
        } finally {
          setBusy(false);
        }
      }
    });
  }

  function confirmRefund() {
    Modal.confirm({
      title: 'Xác nhận khách đã nhận tiền hoàn trả?',
      content: 'Chỉ xác nhận sau khi đã chi tiền mặt tại quầy hoặc đối soát giao dịch chuyển khoản ngân hàng thành công.',
      okText: 'Đã hoàn tiền thực tế',
      cancelText: 'Chưa hoàn',
      onOk: async () => {
        setBusy(true);
        try {
          const saved = await orderApi.confirmRefund(order.id);
          setOrder(saved);
          onChanged(saved);
          message.success('Đã xác nhận hoàn tiền thành công.');
        } catch (error) {
          message.error(error.message || 'Lỗi khi xác nhận hoàn tiền.');
        } finally {
          setBusy(false);
        }
      }
    });
  }

  const isEligibleForRefund = order && ['PAID', 'CANCEL_PENDING', 'COMPLETED', 'CONFIRMED', 'PREPARING'].includes(order.status);

  return (
    <>
      <button
        className="pos-outline"
        type="button"
        onClick={() => {
          setOpen(true);
          setCode(lastOrder?.orderCode || '');
          setOrder(null);
          setReason(REFUND_REASONS[0]);
          setCustomReason('');
          setRefund(true);
        }}
      >
        Hủy đơn / Hoàn tiền
      </button>

      <Modal
        title="Hủy đơn tại quầy & Hoàn tiền (Refund / Return)"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={560}
      >
        <form noValidate className="pos-voucher" onSubmit={lookup} style={{ marginBottom: 16 }}>
          <input
            aria-label="Mã đơn cần hủy"
            required
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Nhập mã đơn OPT-…"
            style={{ flex: 1 }}
          />
          <button className="pos-outline" disabled={busy}>Kiểm tra</button>
        </form>

        {order && (
          <div className="pos-cancel-details" style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 15, color: '#0f172a' }}>{order.orderCode}</strong>
              <Tag color={order.status === 'COMPLETED' ? 'green' : order.status === 'PAID' ? 'blue' : order.status === 'CANCELLED' ? 'red' : 'orange'}>
                {order.status}
              </Tag>
            </div>

            <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 12 }}>
              <p style={{ margin: 0 }}>Khách hàng: <strong>{order.customerName || 'Khách vãng lai'}</strong> {order.customerPhone ? `(${order.customerPhone})` : ''}</p>
              <p style={{ margin: 0 }}>Tổng tiền: <strong style={{ color: '#30483b', fontSize: 14 }}>{money(order.finalAmount)}</strong></p>
              <p style={{ margin: 0 }}>Chi nhánh: {order.branchName || 'Chi nhánh POS'} ({order.channel || 'POS'})</p>
              <p style={{ margin: 0 }}>Kho: <b>{order.inventorySyncStatus || 'SYNCED'}</b> · Hoàn tiền: <b>{order.refundStatus === 'CONFIRMED' ? 'Đã xác nhận hoàn' : order.refundStatus === 'PENDING' ? 'Chờ hoàn tiền' : 'Chưa yêu cầu'}</b></p>
            </div>

            {isEligibleForRefund && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: '#475569', marginBottom: 4 }}>
                  Lý do hủy / hoàn tiền:
                </label>
                <Select
                  value={reason}
                  onChange={setReason}
                  style={{ width: '100%', marginBottom: 8 }}
                  options={REFUND_REASONS.map(r => ({ label: r, value: r }))}
                />

                {reason === 'Lý do khác' && (
                  <textarea
                    aria-label="Chi tiết lý do khác"
                    maxLength={255}
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Nhập chi tiết lý do hoàn trả..."
                    style={{ width: '100%', borderRadius: 6, border: '1px solid #cbd5e1', padding: 8, fontSize: 12, minHeight: 60, marginBottom: 8 }}
                  />
                )}

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Hình thức hoàn trả:</span>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" name="refundMethod" value="CASH" checked={refundMethod === 'CASH'} onChange={() => setRefundMethod('CASH')} />
                    Tiền mặt
                  </label>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input type="radio" name="refundMethod" value="TRANSFER" checked={refundMethod === 'TRANSFER'} onChange={() => setRefundMethod('TRANSFER')} />
                    Chuyển khoản / VietQR
                  </label>
                </div>

                <label className="pos-payment-confirm" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={refund}
                    onChange={e => setRefund(e.target.checked)}
                    disabled={order.status === 'CANCEL_PENDING'}
                  />
                  <strong>Đã hoàn tiền thực tế cho khách ngay tại quầy</strong>
                </label>

                <button
                  type="button"
                  className="pos-outline"
                  disabled={busy}
                  onClick={cancel}
                  style={{ width: '100%', padding: '9px 16px', background: '#e11d48', color: '#ffffff', borderColor: '#be123c', fontWeight: 'bold' }}
                >
                  {order.status === 'CANCEL_PENDING' ? 'Thử lại hoàn tất hủy & nhập kho' : order.status === 'COMPLETED' ? 'Xác nhận Hoàn tiền & Nhập lại kho' : 'Hủy đơn & Hoàn tiền'}
                </button>
              </div>
            )}

            {(order.status === 'CANCELLED' || order.status === 'REFUNDED') && order.refundStatus !== 'CONFIRMED' && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
                <p style={{ fontSize: 12, color: '#d97706', marginBottom: 8 }}>
                  Đơn đã hủy nhưng chưa xác nhận hoàn tiền thực tế cho khách hàng.
                </p>
                <button
                  type="button"
                  className="pos-outline"
                  disabled={busy}
                  onClick={confirmRefund}
                  style={{ width: '100%', padding: '9px 16px', background: '#30483b', color: '#ffffff', fontWeight: 'bold' }}
                >
                  Xác nhận đã hoàn tiền cho khách
                </button>
              </div>
            )}

            {order.refundStatus === 'CONFIRMED' && (
              <div style={{ marginTop: 12, padding: 8, background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', color: '#047857', fontSize: 12, textAlign: 'center' }}>
                ✓ Đơn đã được hoàn tiền đầy đủ và hoàn kho thành công.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
