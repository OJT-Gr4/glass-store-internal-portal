import React, { forwardRef } from 'react';

const ReceiptK80 = forwardRef(({ orderData }, ref) => {
  if (!orderData) return null;

  const {
    orderId,
    cashierName,
    cashierStaffId,
    branchName,
    customerName,
    customerPhone,
    cartItems,
    subtotal,
    discountAmount,
    vatAmount,
    totalAmount,
    paymentMethod,
    cashGiven,
    changeReturned,
    createdAt
  } = orderData;

  return (
    <div
      ref={ref}
      style={{
        width: '80mm',
        minHeight: '100mm',
        margin: '0 auto',
        padding: '12px 14px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: "'Courier New', Courier, monospace, 'Segoe UI', Arial",
        fontSize: '11px',
        lineHeight: 1.35,
        boxSizing: 'border-box'
      }}
    >
      {/* Store Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          OPTIVISION EYECARE
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600 }}>CỔNG BÁN LẺ & KHÚC XẠ CHUẨN Y KHOA</div>
        <div style={{ fontSize: '9.5px', marginTop: 2 }}>{branchName}</div>
        <div style={{ fontSize: '9.5px' }}>Hotline: +1 (800) 420-OPTIC • MST: 0316889988</div>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

      {/* Bill Title & Metadata */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px', margin: '4px 0' }}>
        HÓA ĐƠN BÁN LẺ & BẢO HÀNH
      </div>

      <div style={{ fontSize: '10px', margin: '4px 0' }}>
        <div>Số HĐ: <strong>{orderId}</strong></div>
        <div>Thời gian: {createdAt || new Date().toLocaleString('vi-VN')}</div>
        <div>Thu ngân: {cashierName} ({cashierStaffId})</div>
        <div>Khách hàng: {customerName} - {customerPhone}</div>
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

      {/* Item Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
            <th style={{ padding: '3px 0' }}>Sản phẩm</th>
            <th style={{ textAlign: 'center', width: '24px' }}>SL</th>
            <th style={{ textAlign: 'right', width: '55px' }}>Đơn giá</th>
            <th style={{ textAlign: 'right', width: '65px' }}>T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
              <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: '9px', color: '#444' }}>SKU: {item.sku}</div>
              </td>
              <td style={{ textAlign: 'center', verticalAlign: 'top', padding: '4px 0' }}>{item.qty}</td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '4px 0' }}>
                {item.price.toLocaleString()}
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top', padding: '4px 0', fontWeight: 600 }}>
                {(item.price * item.qty).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

      {/* Financial Breakdown */}
      <div style={{ fontSize: '10.5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Tổng tiền hàng:</span>
          <span>{subtotal.toLocaleString()} ₫</span>
        </div>
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', color: '#d32f2f' }}>
            <span>Chiết khấu / Voucher:</span>
            <span>-{discountAmount.toLocaleString()} ₫</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
          <span>Thuế VAT (8%):</span>
          <span>Đã gồm trong giá</span>
        </div>

        <div style={{ borderBottom: '1px solid #000', margin: '4px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 900, margin: '4px 0' }}>
          <span>TỔNG THANH TOÁN:</span>
          <span>{totalAmount.toLocaleString()} ₫</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
          <span>Hình thức:</span>
          <strong>{paymentMethod || 'Chuyển khoản VietQR'}</strong>
        </div>

        {cashGiven > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
              <span>Tiền khách đưa:</span>
              <span>{cashGiven.toLocaleString()} ₫</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: '10px' }}>
              <span>Tiền thối lại:</span>
              <strong>{changeReturned.toLocaleString()} ₫</strong>
            </div>
          </>
        )}
      </div>

      <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

      {/* Barcode Simulation for POS Scanner */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div
          style={{
            fontFamily: "'Libre Barcode 39', monospace, 'Courier New'",
            fontSize: '28px',
            letterSpacing: '2px',
            lineHeight: 1
          }}
        >
          *{orderId}*
        </div>
        <div style={{ fontSize: '9px', letterSpacing: '1px' }}>{orderId}</div>
      </div>

      {/* Footer Notes & Policy */}
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#222', marginTop: 6, lineHeight: 1.4 }}>
        <div>• Miễn phí vệ sinh siêu âm và nắn chỉnh gọng trọn đời.</div>
        <div>• Bảo hành lớp váng dầu tròng kính 12 tháng theo hãng.</div>
        <div style={{ marginTop: 4, fontWeight: 700 }}>CẢM ƠN QUÝ KHÁCH VÀ HẸN GẶP LẠI!</div>
        <div style={{ fontStyle: 'italic', fontSize: '8.5px' }}>OptiVision POS Terminal - Shift Secure Active</div>
      </div>
    </div>
  );
});

export default ReceiptK80;

