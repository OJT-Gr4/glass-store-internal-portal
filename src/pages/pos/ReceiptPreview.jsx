import React, { useRef } from 'react';
import { Modal, Button } from 'antd';
import { useReactToPrint } from 'react-to-print';
import './receipt.css';
import receiptStyles from './receipt.css?inline';

const money = value => `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

export default function ReceiptPreview({ order, open, onClose }) {
  const receiptRef = useRef(null);
  const print = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: order?.orderCode || 'Hoa-don-POS',
    copyStyles: false,
    pageStyle: () => {
      const heightMm = Math.ceil((receiptRef.current?.scrollHeight || 600) * 25.4 / 96) + 16;
      return `${receiptStyles}\n@page { size: 80mm ${heightMm}mm; margin: 4mm; } @media print { html, body { width: 72mm; margin: 0; padding: 0; } .pos-receipt { width: 72mm; margin: 0; } }`;
    },
  });
  if (!order) return null;
  const cashGiven = order.cashGiven ?? order.cashReceived;
  return <Modal title="Hóa đơn bán hàng · Giấy nhiệt K80" open={open} onCancel={onClose}
    centered width={560} className="pos-receipt-modal"
    footer={<><Button onClick={onClose}>Đóng</Button><Button type="primary" onClick={print}>In hóa đơn K80</Button></>}>
    <p>Chọn máy in khổ 80 mm, tỷ lệ 100%, tắt đầu trang và chân trang.</p>
    <div className="pos-receipt-scroll"><div ref={receiptRef} className="pos-receipt">
      <header><h2>OPTIVISION</h2><p>{order.branchName}</p><h3>HÓA ĐƠN BÁN HÀNG</h3></header>
      <p>Mã: {order.orderCode}</p>
      <p>Ngày: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}</p>
      <p>Thu ngân: {order.staffName || 'Thu ngân'}</p>
      <p>Khách hàng: {order.customerName || 'Khách vãng lai'}</p>
      {order.customerPhone && <p>Điện thoại: {order.customerPhone}</p>}
      <table><thead><tr><th>Sản phẩm / SL × Đơn giá</th><th>Thành tiền</th></tr></thead>
        <tbody>{(order.items || []).map((item, index) => <tr key={item.id || index}>
          <td><strong>{item.productName || item.skuId}</strong><br />{item.skuId}<br />{item.quantity} × {money(item.unitPrice)}</td>
          <td>{money(item.subtotal)}</td>
        </tr>)}</tbody>
      </table>
      <dl><div><dt>Tạm tính</dt><dd>{money(order.totalAmount)}</dd></div>
        {order.voucherCode && <div><dt>Voucher {order.voucherCode}</dt><dd>−{money(order.voucherDiscount)}</dd></div>}
        {Number(order.redeemedPoints)>0 && <div><dt>Dùng {order.redeemedPoints} điểm</dt><dd>−{money(order.pointsDiscount)}</dd></div>}
        {!order.voucherCode && !Number(order.redeemedPoints) && <div><dt>Giảm giá</dt><dd>{money(order.discountAmount)}</dd></div>}
        <div><dt>Tiền tính thuế</dt><dd>{money(Number(order.totalAmount)-Number(order.discountAmount||0))}</dd></div>
        <div><dt>VAT 8%</dt><dd>{money(order.taxAmount)}</dd></div>
        <div className="pos-receipt-total"><dt>TỔNG THANH TOÁN</dt><dd>{money(order.finalAmount)}</dd></div>
        {order.customerId && order.status !== 'CANCELLED' && <div><dt>Điểm tích lũy cộng thêm</dt><dd>+{Math.floor(Number(order.finalAmount || 0) / 1000).toLocaleString('vi-VN')} điểm</dd></div>}
        <div><dt>Phương thức</dt><dd>{{ CASH: 'Tiền mặt', VIETQR: 'VietQR', SEPAY: 'Cổng SePay', CARD: 'Thẻ POS' }[order.paymentMethod] || order.paymentMethod}</dd></div>
        {cashGiven != null && <><div><dt>Tiền khách đưa</dt><dd>{money(cashGiven)}</dd></div>
          <div><dt>Tiền thừa</dt><dd>{money(cashGiven - Number(order.finalAmount))}</dd></div></>}
      </dl>
      <footer><p>{order.status==='CANCELLED'?'ĐƠN ĐÃ HỦY':order.status==='CANCEL_PENDING'?'ĐANG XỬ LÝ HỦY':'ĐÃ THANH TOÁN'}</p>{order.cancelReason&&<p>Lý do: {order.cancelReason}</p>}{order.refundStatus&&<p>{order.refundStatus==='CONFIRMED'?'Đã xác nhận hoàn tiền':'CHỜ HOÀN TIỀN'}</p>}<p>Vui lòng giữ hóa đơn để đối chiếu và bảo hành.</p><p>Cảm ơn quý khách!</p><p>Phiếu bán hàng, không thay thế hóa đơn điện tử.</p></footer>
    </div></div>
  </Modal>;
}
