import React from 'react';
import { ProductImage, money } from './ProductCatalog';

export default function CheckoutPanel({ cart, customer, onCustomer, onGuest, onQuantity, onRemove, onClear,
  products, subtotal, discount, tax, total, voucher, setVoucher, onVoucher,
  usePoints, setUsePoints, method, setMethod, cash, setCash, confirmed, setConfirmed,
  vietqrMode = 'sepay', setVietqrMode,
  paymentRef, cashRef, paying, onPay, lastOrder, onPrint, loyalty, pointsToUse, setPointsToUse, offer, offerError, offerPending, open = true, onCollapse }) {
  return <aside id="pos-checkout" className="pos-checkout" hidden={!open} aria-label="Giỏ hàng và thanh toán" aria-busy={paying}>
    <header className="pos-checkout-heading"><h2>Đơn hàng hiện tại</h2><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} món</span>
      {onCollapse && <button type="button" className="pos-checkout-collapse" aria-label="Thu gọn đơn hàng" title="Thu gọn đơn hàng" aria-expanded={open} aria-controls="pos-checkout" disabled={paying} onClick={onCollapse}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
      </button>}</header>
    <div className="pos-checkout-body" aria-disabled={paying} inert={paying ? '' : undefined}><div className="pos-checkout-scroll">
      <div className="pos-customer"><span className="material-symbols-outlined" aria-hidden="true">person</span><div><strong>{customer.name}</strong>{customer.phone && <p>{customer.phone}</p>}{customer.id && loyalty && <p style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>{loyalty.tier || customer.tier || 'Thành Viên'} · {Number(loyalty.balance || 0).toLocaleString('vi-VN')} điểm</p>}</div>
        <button type="button" onClick={onCustomer}>Đổi khách</button>{customer.id && <button type="button" onClick={onGuest}>Vãng lai</button>}</div>
      <div className="pos-cart-items">{!cart.length ? <div className="pos-cart-empty"><span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span><strong>Chưa có sản phẩm</strong><p>Chọn kính hoặc quét mã để bắt đầu đơn hàng.</p></div> : cart.map(item =>
        <div className="pos-cart-item" key={item.sku} data-cart-sku={item.sku}>
          <ProductImage product={{ ...products.find(p => p.sku === item.sku), ...item }} />
          <div className="pos-cart-description"><strong>{item.name.split(' - ')[0]}</strong><span className="pos-sku">{item.sku}</span>
            {item.quantity > (products.find(p => p.sku === item.sku)?.stockQuantity ?? 0) && (
              <span style={{ color: '#b91c1c', fontSize: '11px', fontWeight: 600, display: 'block' }}>
                Vượt tồn kho ({products.find(p => p.sku === item.sku)?.stockQuantity ?? 0})
              </span>
            )}
            <div className="pos-cart-item-bottom"><div className="pos-stepper"><button type="button" aria-label={`Giảm ${item.name}`} onClick={() => onQuantity(item.sku, -1)}>−</button><span>{item.quantity}</span><button type="button" aria-label={`Tăng ${item.name}`} onClick={() => onQuantity(item.sku, 1)}>+</button></div><strong>{money(item.price * item.quantity)}</strong></div>
          </div>
          <button type="button" className="pos-remove" aria-label={`Xóa ${item.name}`} onClick={() => onRemove(item.sku)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>)}</div>
      <details className="pos-discount"><summary>Áp dụng voucher / mã giảm giá</summary><div className="pos-voucher"><input aria-label="Mã voucher" value={voucher} onChange={e => setVoucher(e.target.value.toUpperCase())} placeholder="Nhập mã voucher" /><button type="button" className="pos-outline" onClick={onVoucher}>Áp dụng</button></div>
        {customer.id ? <div className="pos-points-input"><span>{loyalty ? `${loyalty.balance} điểm · ${money(loyalty.pointValue)}/điểm` : 'Đang tải điểm…'}</span><label>Điểm dùng <input aria-label="Số điểm sử dụng" type="number" min="0" step="1" value={pointsToUse} disabled={!loyalty?.enabled} onChange={e => setPointsToUse(Math.max(0,Math.floor(Number(e.target.value)||0)))} /></label><small>Tối đa {loyalty?.maxRedemptionPercent || 0}% tiền hàng sau voucher. {offer && `Có thể dùng tối đa ${offer.maximumPoints} điểm.`}</small></div> : <p>Khách vãng lai không sử dụng điểm.</p>}</details>
      {offerError && <p role="alert" className="pos-offer-error">{offerError}</p>}
      {offerPending && !offerError && <p role="status" className="pos-offer-error">Đang kiểm tra giá và ưu đãi…</p>}
      </div>
      <dl className="pos-totals"><div><dt>Tạm tính</dt><dd>{money(subtotal)}</dd></div>{Number(offer?.voucherDiscount)>0 && <div><dt>Voucher {offer.voucherCode}</dt><dd>−{money(offer.voucherDiscount)}</dd></div>}{Number(offer?.pointsDiscount)>0 && <div><dt>Dùng {offer.redeemedPoints} điểm</dt><dd>−{money(offer.pointsDiscount)}</dd></div>}<div><dt>Tiền tính thuế</dt><dd>{money(offer?.taxableAmount ?? Math.max(0, subtotal - discount))}</dd></div><div><dt>VAT (8%)</dt><dd>{money(tax)}</dd></div><div className="pos-total"><dt>Tổng thanh toán</dt><dd>{money(total)}</dd></div>{customer.id && total > 0 && <div style={{ color: '#059669', fontWeight: 600, fontSize: '12px', paddingTop: '4px' }}><dt>Điểm tích lũy cộng thêm (1.000đ = 1đ)</dt><dd>+{Math.floor(total / Number(loyalty?.earnUnitAmount || 1000)).toLocaleString('vi-VN')} điểm</dd></div>}</dl>
      <section className="pos-payment" ref={paymentRef} tabIndex={-1} aria-label="Thanh toán">
        <div className="pos-payment-methods">{[['cash', 'payments', 'Tiền mặt'], ['vietqr', 'qr_code_2', 'Chuyển khoản'], ['card', 'credit_card', 'Thẻ']].map(([value, icon, label]) => <button type="button" key={value} aria-pressed={method === value} onClick={() => setMethod(value)}><span className="material-symbols-outlined" aria-hidden="true">{icon}</span>{label}</button>)}</div>
        {method === 'cash' ? (
          <>
            <label className="pos-cash-label" htmlFor="pos-cash">Tiền khách đưa</label>
            <div className="pos-cash-field">
              <input id="pos-cash" type="number" min="0" step="1000" ref={cashRef} aria-label="Tiền khách đưa" value={cash || ''} placeholder="0" onChange={event => setCash(Number(event.target.value))} />
              <span>đ</span>
            </div>
            <div className={`pos-change${cash >= total && total > 0 ? ' is-ready' : ''}`}>
              <span>{cash > 0 && cash < total ? 'Còn thiếu' : 'Tiền thối lại'}</span>
              <strong>{money(cash > 0 && cash < total ? total - cash : Math.max(0, cash - total))}</strong>
            </div>
          </>
        ) : method === 'vietqr' ? (
          <div className="pos-vietqr-options">
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                className={`pos-sub-method${vietqrMode === 'sepay' ? ' is-active' : ''}`}
                onClick={() => setVietqrMode && setVietqrMode('sepay')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: vietqrMode === 'sepay' ? '1.5px solid #086288' : '1px solid #dce7ee',
                  background: vietqrMode === 'sepay' ? '#e0f2fe' : '#ffffff',
                  color: vietqrMode === 'sepay' ? '#0369a1' : '#475569',
                  cursor: 'pointer'
                }}
              >
                SePay Sandbox (Tự động)
              </button>
              <button
                type="button"
                className={`pos-sub-method${vietqrMode === 'manual' ? ' is-active' : ''}`}
                onClick={() => setVietqrMode && setVietqrMode('manual')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: vietqrMode === 'manual' ? '1.5px solid #086288' : '1px solid #dce7ee',
                  background: vietqrMode === 'manual' ? '#e0f2fe' : '#ffffff',
                  color: vietqrMode === 'manual' ? '#0369a1' : '#475569',
                  cursor: 'pointer'
                }}
              >
                Chuyển khoản thủ công
              </button>
            </div>

            {vietqrMode === 'sepay' ? (
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '11.5px',
                color: '#0369a1',
                lineHeight: 1.4
              }}>
                <strong>Cổng SePay VietQR Sandbox</strong>
                <p style={{ margin: '3px 0 0', color: '#0c4a6e', fontSize: '11px' }}>
                  Hệ thống tự động hiển thị mã VietQR và đối soát real-time ngay khi khách chuyển tiền.
                </p>
              </div>
            ) : (
              <label className="pos-payment-confirm">
                <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                Đã nhận tiền chuyển khoản vào tài khoản cửa hàng
              </label>
            )}
          </div>
        ) : (
          <label className="pos-payment-confirm">
            <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
            Đã quẹt thẻ POS thành công tại quầy
          </label>
        )}
      </section>
    </div>
    <button
      type="button"
      className="pos-pay"
      onClick={onPay}
      disabled={paying || !cart.length || offerPending || !!offerError}
      aria-busy={paying}
    >
      {paying
        ? 'Đang lưu đơn hàng…'
        : method === 'vietqr' && vietqrMode === 'sepay'
        ? 'Thanh toán SePay QR · F10'
        : method === 'vietqr'
        ? 'Xác nhận chuyển khoản · F10'
        : method === 'card'
        ? 'Xác nhận quẹt thẻ · F10'
        : 'Thanh toán · F10'}
    </button>
    <div className="pos-checkout-tools">
      <button type="button" className="pos-print pos-outline" onClick={onPrint} disabled={!lastOrder || paying}><span className="material-symbols-outlined" aria-hidden="true">print</span>In hóa đơn</button>
      <button type="button" className="pos-clear" onClick={onClear} disabled={paying || !cart.length}>Xóa giỏ hàng <kbd>F8</kbd></button>
    </div>
    {lastOrder && <p className="pos-last-order" role="status" title={lastOrder.orderCode}>Đã lưu {lastOrder.orderCode}</p>}
  </aside>;
}
