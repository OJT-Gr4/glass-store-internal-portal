import React, { useState } from 'react';

export const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

function shortName(product) {
  const name = product.name.split(' - ')[0];
  return name.replace(/^(Gọng Kính|Gọng kính|Tròng Kính|Tròng kính|Kính Mát|Kính mát)\s+/i, '');
}

export function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  const fallbackImg = product.category === 'SUNGLASSES'
    ? 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80'
    : 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=500&q=80';

  if (product.category === 'LENS') return <div className="pos-product-image pos-lens-art" role="img" aria-label={`Minh họa tròng kính: ${product.name}`}>
    <svg viewBox="0 0 240 140" aria-hidden="true"><ellipse cx="85" cy="78" rx="52" ry="35" fill="#e3edf2" stroke="#bacdd7" strokeWidth="2" transform="rotate(-18 85 78)" /><ellipse cx="153" cy="73" rx="52" ry="35" fill="#f4f8fb" fillOpacity=".85" stroke="#bacdd7" strokeWidth="2" transform="rotate(18 153 73)" /><path d="M119 60 Q150 42 177 69 M50 81 Q58 57 89 56" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" /></svg>
  </div>;
  if (product.category === 'ACCESSORY') return <div className="pos-product-image pos-accessory-art" role="img" aria-label={`Minh họa phụ kiện: ${product.name}`}><span className="material-symbols-outlined" aria-hidden="true">{product.sku.includes('CLEANER') ? 'cleaning_services' : 'cases'}</span></div>;
  return <div className="pos-product-image">
    <img src={(!product.image || failed) ? fallbackImg : product.image} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
  </div>;
}

export default function ProductCatalog({ products, count, cart, loading, error, category, setCategory,
  search, setSearch, searchRef, onSearch, onAdd, prescription, onSelectPrescription, onAddLens }) {
  const categories = [['ALL', `Tất cả (${count})`], ['FRAME', 'Gọng kính'], ['LENS', 'Tròng kính'], ['SUNGLASSES', 'Kính mát'], ['ACCESSORY', 'Phụ kiện']];
  return <section className="pos-catalog" aria-label="Danh mục sản phẩm">
    <header className="pos-heading"><span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
      <div><h1>Bán hàng tại quầy</h1><p>Chọn sản phẩm và hoàn tất thanh toán</p></div>
    </header>
    <form className="pos-search" onSubmit={onSearch}>
      <span className="material-symbols-outlined" aria-hidden="true">barcode_scanner</span>
      <input ref={searchRef} aria-label="Tìm Barcode hoặc SKU" placeholder="Quét Barcode / SKU / tên sản phẩm"
        value={search} onChange={event => setSearch(event.target.value)} />
      <kbd>F2</kbd>
    </form>
    <nav className="pos-categories" aria-label="Loại sản phẩm">{categories.map(([value, label]) =>
      <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</nav>
    <div className="pos-prescription">
      <span className="material-symbols-outlined" aria-hidden="true">clinical_notes</span>
      <div>{prescription ? <><strong>{prescription.code} · {prescription.customer}</strong><p>OD: {prescription.od} · OS: {prescription.os} · PD: {prescription.pd}</p></> : 'Chưa liên kết toa khám'}</div>
      <button type="button" className="pos-outline" onClick={onSelectPrescription}>{prescription ? 'Đổi toa' : 'Chọn toa'}</button>
      {prescription && <button type="button" className="pos-outline" onClick={onAddLens}>Thêm tròng</button>}
    </div>
    {loading && <p role="status" className="pos-empty">Đang tải sản phẩm từ catalog...</p>}
    {error && <p role="alert" className="pos-error">{error}</p>}
    {!loading && !error && !products.length && <div className="pos-empty">Không tìm thấy sản phẩm phù hợp.<button type="button" className="pos-outline" onClick={() => { setSearch(''); setCategory('ALL'); }}>Xóa bộ lọc</button></div>}
    <div className="pos-product-grid" data-pos-product-grid>{products.map(product => {
      const quantity = cart.find(item => item.sku === product.sku)?.quantity || 0;
      const soldOut = product.stockQuantity <= 0;
      const isLow = !soldOut && product.stockQuantity < 5;
      return <article className={`pos-product-card${quantity ? ' is-selected' : ''}${soldOut ? ' is-sold-out' : ''}`} key={product.sku}>
        <button type="button" className="pos-product-select" data-pos-sku={product.sku}
          disabled={soldOut} aria-label={`Thêm ${product.name} vào giỏ hàng`} onClick={() => onAdd(product)}>
          <div className="pos-product-visual"><ProductImage product={product} />
            {quantity > 0 && <span className="pos-quantity-badge" aria-label={`Đã chọn ${quantity}`}>{quantity}</span>}
            <span className={`pos-stock${soldOut ? ' is-empty' : isLow ? ' is-low' : ''}`}>
              {soldOut ? 'Hết hàng' : isLow ? `Tồn ít: ${product.stockQuantity}` : `Tồn: ${product.stockQuantity}`}
            </span>
          </div>
          <div className="pos-product-info"><span className="pos-brand">{product.brand}</span>
            <h2 title={product.name}>{shortName(product)}</h2><span className="pos-sku">{product.sku}</span></div>
        </button>
        <div className="pos-product-bottom"><strong>{money(product.price)}</strong>
          <button type="button" disabled={soldOut} className="pos-add" aria-label={`Thêm ${product.name}`} onClick={() => onAdd(product)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" /></svg>
          </button></div>
      </article>;
    })}</div>
  </section>;
}
