import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Alert, message, Modal } from 'antd';
import { orderApi } from '../../api/orderApi';
import { productApi } from '../../api/productApi';
import { useAuth } from '../../context/AuthContext';
import ReceiptPreview from './ReceiptPreview';
import ProductCatalog, { money } from './ProductCatalog';
import CheckoutPanel from './CheckoutPanel';
import './pos.css';
import { prescriptionApi } from '../../api/prescriptionApi';
import { customerApi } from '../../api/customerApi';
import { useOutletContext } from 'react-router-dom';
import InventorySyncPanel from './InventorySyncPanel';
import { inventoryApi } from '../../api/inventoryApi';
import { promotionApi } from '../../api/promotionApi';
import useHeldCarts from './useHeldCarts';
import HeldCartsPanel from './HeldCartsPanel';
import CancelOrderPanel from './CancelOrderPanel';
import usePosPayment from './usePosPayment';
import { getPosSellableQuantity, resolvePosBranchCode } from './posInventoryUtils';

export default function PosPage() {
  const { user } = useAuth();
  const { selectedBranch } = useOutletContext() || {};
  const branchCode = resolvePosBranchCode(selectedBranch);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Search / Barcode input
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef(null);
  const paymentRef = useRef(null);
  const cashInputRef = useRef(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const checkoutToggleRef = useRef(null);

  function openCheckout() {
    setCheckoutOpen(true);
    requestAnimationFrame(() => {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      (cashInputRef.current || paymentRef.current)?.focus({ preventScroll: true });
    });
  }

  function collapseCheckout() {
    if (isPaymentLocked()) return;
    setCheckoutOpen(false);
    requestAnimationFrame(() => checkoutToggleRef.current?.focus({ preventScroll: true }));
  }

  // Cart state
  const [cart, setCart] = useState([]);

  // Customer state
  const [customer, setCustomer] = useState({
    name: 'Khách vãng lai',
    tier: 'Vãng lai',
    phone: '',
    points: 0,
    pointValue: 0
  });

  // Customer selection modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [dbCustomers, setDbCustomers] = useState([]);

  useEffect(() => {
    customerApi.getCustomerList().then(res => {
      if (Array.isArray(res)) setDbCustomers(res);
    }).catch(e => console.warn('Sync customer list for POS:', e));
  }, []);

  const handleSelectCustomer = (c) => {
    if (linkedRx?.customerId && linkedRx.customerId !== c.id) setLinkedRx(null);
    setCustomer({
      id: c.id,
      name: c.fullName,
      phone: c.phoneNumber || '',
      tier: c.membershipTier || 'Thành Viên',
      points: c.loyaltyPoints || 0,
      pointValue: 0
    });
    message.success(`Đã tiếp nhận khách hàng: ${c.fullName}`);
  };

  const handleCustomerCreated = (newC) => {
    setDbCustomers(prev => [newC, ...prev]);
    if (linkedRx?.customerId && linkedRx.customerId !== newC.id) setLinkedRx(null);
    setCustomer({
      id: newC.id,
      name: newC.fullName,
      phone: newC.phoneNumber || '',
      tier: 'Thành viên mới',
      points: 0,
      pointValue: 0
    });
    message.success(`Đã tạo và tiếp nhận khách hàng: ${newC.fullName} (Mã KH: #${newC.id})`);
  };
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [loyalty, setLoyalty] = useState(null);
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [offer, setOffer] = useState(null);
  const [offerError, setOfferError] = useState('');
  const held = useHeldCarts(user?.staffId, branchCode);
  const [voucherCode, setVoucherCode] = useState('');

  // Payment tab: 'vietqr' | 'cash' | 'card'
  const [payTab, setPayTab] = useState('cash');
  const [vietqrMode, setVietqrMode] = useState('sepay'); // 'sepay' | 'manual'
  const [sepayPendingOrder, setSepayPendingOrder] = useState(null);
  const [isSepayModalOpen, setIsSepayModalOpen] = useState(false);
  const [cashGiven, setCashGiven] = useState(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const { paying, uncertainPayment, canRetryPayment, isPaymentLocked, submitPayment, retryPayment } = usePosPayment({
    staffId: user?.staffId,
    branchCode,
    onRestored: restorePayment,
    onPaid: acceptPayment,
  });

  function restorePayment(payload) {
    setCart(payload.items.map(item => ({
      id: item.skuId,
      sku: item.skuId,
      name: item.productName || item.skuId,
      price: Number(item.expectedUnitPrice),
      quantity: item.quantity,
    })));
    setCustomer({ id: payload.customerId, name: payload.customerName, phone: payload.customerPhone });
    setPayTab(payload.paymentMethod === 'CASH' ? 'cash' : payload.paymentMethod === 'VIETQR' ? 'vietqr' : 'card');
    setCashGiven(payload.cashReceived || 0);
    setCheckoutOpen(true);
  }

  // Rx Modal state
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [linkedRx, setLinkedRx] = useState(null);

  // Product catalog list
  const [catalogProducts, setCatalogProducts] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchLiveCatalog = async () => {
      setCatalogLoading(true); setCatalogError('');
      if (!branchCode) {
        setCatalogProducts([]);
        setCatalogError('POS chỉ hỗ trợ bán hàng tại Chi nhánh 01 hoặc Chi nhánh 02. Hãy chọn đúng chi nhánh trên thanh điều hướng.');
        setCatalogLoading(false);
        return;
      }
      try {
        const [res, stockResponse] = await Promise.all([productApi.getAllProducts(), inventoryApi.getInventory()]);
        if (!active) return;
        const inventoryRows = stockResponse.data || stockResponse;
        const inventoryBySku = new Map(
          (Array.isArray(inventoryRows) ? inventoryRows : []).map(row => [row.sku, row])
        );
        const products = res?.data || res;
        if (Array.isArray(products) && products.length > 0) {
          const list = [];
          products.forEach(p => {
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach(v => {
                const stockQty = inventoryRows.find(row => row.sku === v.sku)?.quantities?.[branchCode] ?? 0;
                list.push({
                  sku: v.sku || ('SKU-' + v.id),
                  barcode: v.barcode || '',
                  shortSku: (v.sku || '').split('-').pop() || 'SKU',
                  name: (p.name + ' - ' + (v.name || v.color || '')).trim(),
                  brand: p.brandName || 'OptiVision',
                  category: p.productType,
                  price: Number(v.price ?? 0),
                  stockQuantity: getPosSellableQuantity(inventoryBySku.get(v.sku), branchCode),
                  stock: getPosSellableQuantity(inventoryBySku.get(v.sku), branchCode) + ' cái',
                  image: v.imageUrl || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=500&q=80'
                });
              });
            }
          });
          if (list.length > 0) {
            setCatalogProducts(list);
          }
        }
      } catch (err) {
        if (active) { setCatalogProducts([]); setCatalogError('Không tải được sản phẩm và tồn chi nhánh. Hãy thử tải lại.'); }
      } finally {
        if (active) setCatalogLoading(false);
      }
    };
    fetchLiveCatalog();
    return () => { active = false; };
  }, [catalogVersion, branchCode]);

  useEffect(() => {
    const handleSync = () => setCatalogVersion(v => v + 1);
    window.addEventListener('inventory-changed', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'optivision_last_inventory_sync') handleSync();
    });
    return () => {
      window.removeEventListener('inventory-changed', handleSync);
    };
  }, []);

  const [availablePrescriptions, setAvailablePrescriptions] = useState([]);
  useEffect(() => {
    prescriptionApi.getAllPrescriptions().then(list => {
      if (Array.isArray(list)) {
        const mapped = list.map(rx => ({
          id: rx.id,
          code: '#RX-2026-' + rx.id,
          customer: rx.customerName || 'Khách hàng',
          customerId: rx.customerId || null,
          phone: rx.customerPhone || '0901 000 000',
          timeAgo: 'Hôm nay',
          od: 'Sph ' + (rx.odSph || 0) + ' | Cyl ' + (rx.odCyl || 0) + ' | Ax ' + (rx.odAxis || 180) + '°',
          os: 'Sph ' + (rx.osSph || 0) + ' | Cyl ' + (rx.osCyl || 0) + ' | Ax ' + (rx.osAxis || 180) + '°',
          pd: (rx.pd || 63) + 'mm',
          doctor: rx.optometristName || 'BS. Khúc Xạ'
        }));
        setAvailablePrescriptions(mapped);
      }
    }).catch(e => console.warn('Sync rx modal error:', e));
  }, []);

  useEffect(() => {
    if (catalogLoading || catalogError) return;
    setCart(current => current.map(item => {
      const product = catalogProducts.find(product => product.sku === item.sku);
      return product ? { ...item, price: product.price, name: product.name, image: product.image } : item;
    }));
  }, [catalogProducts, catalogLoading, catalogError]);

  const offerKey = JSON.stringify({ items: cart.map(item => ({ skuId: item.sku, quantity: item.quantity, price: item.price })), prescriptionId: linkedRx?.id || null, customerId: customer.id || null, voucherCode: appliedVoucher, pointsToUse, branchCode, catalogVersion });
  const offerReady = offer?.key === offerKey;
  const subtotal = offerReady ? Number(offer.subtotal) : cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountTotal = offerReady ? Number(offer.voucherDiscount) + Number(offer.pointsDiscount) : 0;
  const vatAmount = offerReady ? Number(offer.vatAmount) : Math.round(subtotal * .08);
  const grandTotal = offerReady ? Number(offer.finalAmount) : subtotal + vatAmount;
  useEffect(() => { setPaymentConfirmed(false); }, [grandTotal, payTab, offerKey]);
  useEffect(() => {
    let active = true; setLoyalty(null); setPointsToUse(0);
    if (customer.id) promotionApi.account(customer.id).then(value => { if (active) setLoyalty(value); }).catch(error => { if (active) message.error(error.message); });
    return () => { active = false; };
  }, [customer.id, catalogVersion]);
  useEffect(() => {
    let active = true; setOfferError('');
    if (!cart.length) { setOffer(null); return; }
    const timer = setTimeout(() => promotionApi.quote({ customerId: customer.id || null, prescriptionId: linkedRx?.id || null, voucherCode: appliedVoucher, pointsToUse,
      items: cart.map(item => ({ skuId: item.sku, productName: item.name, quantity: item.quantity, unitPrice: item.price,
        prescriptionId: linkedRx && catalogProducts.find(product => product.sku === item.sku)?.category === 'LENS' ? linkedRx.id : null }))
    }).then(result => { if (active) setOffer({ ...result, key: offerKey }); }).catch(error => { if (active) { setOffer(null); setOfferError(error.message); } }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [offerKey]);

  function clearCurrentCart() { setCart([]); setCustomer({ name: 'Khách vãng lai', tier: 'Vãng lai', phone: '', points: 0, pointValue: 0 }); setCashGiven(0); setPaymentConfirmed(false); setVoucherCode(''); setAppliedVoucher(''); setPointsToUse(0); setLinkedRx(null); setOffer(null); }
  function holdCart() {
    if (isPaymentLocked() || uncertainPayment) return false;
    try { held.hold(cart, customer, appliedVoucher, pointsToUse, linkedRx); clearCurrentCart(); message.success('Đã lưu đơn tạm. Có thể tạo đơn mới.'); return true; }
    catch (error) { message.error(error.message); return false; }
  }
  function restoreCart(draft) {
    if (draft.branchCode !== branchCode) { message.error('Đơn tạm thuộc chi nhánh khác.'); return false; }
    if (isPaymentLocked() || uncertainPayment || catalogLoading) { message.warning('Chờ kiểm tra thanh toán / tải tồn kho xong.'); return false; }
    const restoredRx = availablePrescriptions.find(rx => draft.prescriptionId ? rx.id === draft.prescriptionId : rx.code === draft.prescriptionCode) || draft.linkedRx;
    if ((draft.prescriptionId || draft.prescriptionCode) && !restoredRx) {
      message.warning('Chưa tìm thấy toa kính của đơn tạm. Đơn vẫn được giữ; hãy tải lại danh sách toa trước khi khôi phục.');
      return false;
    }
    const unavailable = draft.items.filter(item => !catalogProducts.some(product => product.sku === item.sku && product.stockQuantity >= item.quantity));
    if (unavailable.length) { message.warning('Đơn tạm vẫn được giữ: không đủ tồn cho ' + unavailable.map(i => i.sku).join(', ')); return false; }
    const restore = () => {
      if (cart.length && !holdCart()) return;
      try { held.remove(draft.id); } catch(error) { message.error(error.message); return; }
      const rebuilt = draft.items.map(item => { const product = catalogProducts.find(p => p.sku === item.sku); return { id: product.sku, sku: product.sku, name: product.name, image: product.image, sub: product.brand, price: product.price, quantity: item.quantity }; });
      setCart(rebuilt); setCustomer({ ...draft.customer, points: 0, pointValue: 0 }); setVoucherCode(draft.voucherCode || '');setAppliedVoucher(draft.voucherCode || '');setPointsToUse(0);setCashGiven(0);setOffer(null);
      setLinkedRx(restoredRx || null);
      message.info('Đã khôi phục. Giá, voucher và điểm sẽ được kiểm tra lại; chọn lại số điểm muốn dùng.');
    };
    if (cart.length) Modal.confirm({ title: 'Giỏ hiện tại có sản phẩm', content: 'Lưu giỏ hiện tại thành đơn tạm rồi khôi phục đơn đã chọn?', okText: 'Lưu và khôi phục', cancelText: 'Giữ giỏ hiện tại', onOk: restore });
    else restore();
    return true;
  }

  // Add product to cart
  const handleAddToCart = (product) => {
    if (isPaymentLocked() || uncertainPayment) return;
    if (!catalogProducts.some(p => p.sku === product.sku)) {
      message.warning('Chỉ có thể bán sản phẩm trong catalog.');
      return;
    }
    if ((cart.find(item => item.sku === product.sku)?.quantity || 0) >= product.stockQuantity) {
      message.warning('Số lượng vượt tồn kho hiện tại.');
      return;
    }
    const existingIndex = cart.findIndex((item) => item.sku === product.sku);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: product.sku,
          sku: product.sku,
          name: product.name,
          image: product.image,
          sub: product.brand,
          price: product.price,
          quantity: 1,
          rxInfo: null
        }
      ]);
    }
    message.success({ key: 'pos-add-product', content: `Đã thêm ${product.name.split(' - ')[0]}`, duration: 1.5 });
    if (!checkoutOpen) return;
    requestAnimationFrame(() => {
      const paymentBounds = paymentRef.current?.getBoundingClientRect();
      if (paymentBounds && (paymentBounds.top < 72 || paymentBounds.bottom > window.innerHeight)) {
        paymentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (cashInputRef.current) {
        cashInputRef.current.focus({ preventScroll: true });
        cashInputRef.current.select();
      } else {
        paymentRef.current?.focus({ preventScroll: true });
      }
    });
  };

  // Adjust quantity
  const handleQtyChange = (sku, delta) => {
    if (isPaymentLocked() || uncertainPayment) return;
    const item = cart.find(p => p.sku === sku);
    const product = catalogProducts.find(p => p.sku === sku);
    if (delta > 0 && item.quantity >= (product?.stockQuantity ?? 0)) {
      message.warning('Số lượng vượt tồn kho hiện tại.');
      return;
    }
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.sku === sku) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Remove single item
  const handleRemoveItem = (sku) => {
    if (isPaymentLocked() || uncertainPayment) return;
    setCart((prev) => prev.filter((item) => item.sku !== sku));
    message.info('Đã xóa sản phẩm khỏi giỏ hàng.');
  };

  // Clear entire cart
  const handleClearCart = () => {
    if (isPaymentLocked() || uncertainPayment) return;
    Modal.confirm({
      title: 'Xóa giỏ hàng?',
      content: 'Bạn có chắc chắn muốn làm trống toàn bộ đơn bán hiện tại (F8)?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: () => {
        setCart([]);
        message.info('Giỏ hàng đã được làm trống.');
      }
    });
  };

  // Barcode Submit
  const handleBarcodeSubmit = (e) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const found = catalogProducts.find(
      (p) =>
        p.sku.toLowerCase() === query ||
        p.barcode.toLowerCase() === query ||
        p.name.toLowerCase().includes(query)
    );

    if (found) {
      handleAddToCart(found);
    } else {
      message.warning('Không tìm thấy sản phẩm theo Barcode / SKU này.');
    }
    setBarcodeInput('');
  };

  // Add a lens from the live catalog, never a fabricated SKU.
  const handleInsertRxCombo = () => {
    const lens = catalogProducts.find(p => p.category === 'LENS' && p.stockQuantity > 0);
    if (!lens) { message.warning('Không có tròng kính còn hàng trong catalog.'); return; }
    handleAddToCart(lens);
  };

  // Select prescription from modal
  const handleSelectPrescription = (rx) => {
    if (uncertainPayment) return;
    setLinkedRx({
      id: rx.id,
      customerId: rx.customerId,
      code: rx.code,
      doctor: rx.doctor,
      customer: rx.customer,
      od: rx.od,
      os: rx.os,
      pd: rx.pd
    });
    setCustomer({
      id: rx.customerId || null,
      tier: rx.customerId ? 'Thành viên' : 'Vãng lai',
      points: 0,
      pointValue: 0,
      name: rx.customer,
      phone: rx.phone
    });
    setIsRxModalOpen(false);
    message.success(`Đã liên kết ${rx.code} cho khách ${rx.customer}!`);
  };

  function completeOrderSuccess(saved, cashReceived) {
    setLastOrder({ ...saved, cashGiven: cashReceived });
    setCatalogVersion(value => value + 1);
    clearCurrentCart();
    // Dispatch custom event to notify InventoryPage and any other tabs
    window.dispatchEvent(new CustomEvent('inventory-changed', { detail: { branchCode, orderCode: saved.orderCode } }));
    try {
      localStorage.setItem('optivision_last_inventory_sync', Date.now().toString());
    } catch {}
    if (saved.inventorySyncStatus === 'RECONCILIATION_REQUIRED' || saved.inventorySyncStatus === 'FAILED') {
      message.warning(`Đơn ${saved.orderCode} đã ghi nhận tiền; kho cần đối soát. Không thanh toán lại.`);
    } else if (saved.inventorySyncStatus === 'PENDING') {
      message.warning(`Đơn ${saved.orderCode} đã thanh toán; kho đang chờ đồng bộ và sẽ thử lại.`);
    } else {
      message.success('Đã lưu đơn ' + saved.orderCode + '. Bạn có thể in hóa đơn.');
    }
    setReceiptOpen(true);
  }

  function acceptPayment(saved, payload) {
    if (saved.status === 'PENDING_PAYMENT' && saved.paymentMethod === 'VIETQR' && payload.gatewayRequested) {
      setSepayPendingOrder(saved);
      setIsSepayModalOpen(true);
      return;
    }
    completeOrderSuccess(saved, payload.cashReceived);
  }

  // Only clear the cart after the API has persisted the sale.
  const handleExecutePayment = async () => {
    if (isPaymentLocked()) return;
    if (uncertainPayment) { message.warning('Kiểm tra / thử lại yêu cầu cũ trước khi thanh toán đơn mới.'); return; }
    if (!checkoutOpen) { openCheckout(); return; }
    if (!cart.length) { message.warning('Giỏ hàng đang trống!'); return; }
    if (linkedRx && !Number.isSafeInteger(linkedRx.id)) { message.warning('Toa kính thiếu ID hợp lệ. Vui lòng chọn lại toa trước khi thanh toán.'); return; }
    if (!offerReady) { message.warning(offerError || 'Chờ backend kiểm tra giá và ưu đãi.'); return; }
    if (!branchCode || branchCode === 'LAB') {
      message.warning('Vui lòng chọn Chi nhánh 01 hoặc Chi nhánh 02 trên thanh điều hướng (Kho Lab không phục vụ bán lẻ POS).');
      return;
    }
    if (catalogLoading || cart.some(item => item.quantity > (catalogProducts.find(product => product.sku === item.sku)?.stockQuantity ?? 0))) {
      message.warning('Sản phẩm không đủ tồn tại chi nhánh đang chọn. Kiểm tra giỏ hàng trước khi thanh toán.'); return;
    }
    const isSepay = payTab === 'vietqr' && vietqrMode === 'sepay';
    if (!isSepay && payTab !== 'cash' && !paymentConfirmed) {
      message.warning('Vui lòng xác nhận đã nhận tiền chuyển khoản / giao dịch thẻ thành công.'); return;
    }
    if (payTab === 'cash' && (!Number.isFinite(Number(cashGiven)) || Number(cashGiven) < grandTotal)) {
      message.warning('Tiền khách đưa chưa đủ thanh toán.'); return;
    }
    const orderPayload = {
      customerId: customer.id || null,
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: 'POS',
      voucherCode: appliedVoucher || null,
      pointsToUse,
      cashReceived: payTab === 'cash' ? Number(cashGiven) : null,
      manualPaymentConfirmed: payTab !== 'cash' && !isSepay && paymentConfirmed,
      gatewayRequested: isSepay,
      paymentMethod: payTab === 'vietqr' ? 'VIETQR' : payTab === 'cash' ? 'CASH' : 'CARD',
      staffName: user?.staffName || user?.fullName || user?.staffId || 'Thu ngân',
      branchName: branchName || selectedBranch,
      branchCode,
      items: cart.map(item => ({
        skuId: item.sku, productName: item.name,
        prescriptionId: linkedRx && catalogProducts.find(product => product.sku === item.sku)?.category === 'LENS' ? linkedRx.id : null,
        quantity: item.quantity, expectedUnitPrice: item.price
      }))
    };
    await submitPayment(orderPayload);
  };

  // POS hotkeys: F2 search, F4 hold, F8 clear, F10 checkout
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.repeat && ['F2', 'F4', 'F8', 'F10'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        holdCart();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleClearCart();

      } else if (e.key === 'F10') {
        e.preventDefault();
        handleExecutePayment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, grandTotal, payTab, cashGiven, customer, discountTotal, user, linkedRx, paymentConfirmed, selectedBranch, branchCode, catalogLoading, catalogProducts, offerReady, offerError, appliedVoucher, pointsToUse, offerKey, checkoutOpen, uncertainPayment]);

  // Filter products by category
  const categoryProducts =
    selectedCategory === 'ALL'
      ? catalogProducts
      : catalogProducts.filter((p) => p.category === selectedCategory);

  const query = barcodeInput.trim().toLowerCase();
  const filteredProducts = categoryProducts.filter(p => !query ||
    [p.sku, p.barcode, p.name].some(value => value.toLowerCase().includes(query)));

  return (
    <main className="pos-page">
      {uncertainPayment && <Alert type="warning" showIcon message="Yêu cầu thanh toán trước chưa rõ kết quả" description="Không tạo đơn mới. Thử lại đúng yêu cầu và khóa đã gửi; nếu đã ghi nhận, hệ thống trả đơn cũ. Yêu cầu vẫn được giữ khi tải lại trang."
        action={<button type="button" className="pos-outline" disabled={paying || !canRetryPayment} onClick={retryPayment}>Kiểm tra / thử lại yêu cầu cũ</button>} />}
      <div className="pos-today-tools"><HeldCartsPanel drafts={held.drafts} onHold={holdCart} onRestore={restoreCart} onDelete={id => { try { held.remove(id); } catch(error) { message.error(error.message); } }} disabled={paying || uncertainPayment || catalogLoading} />
        <CancelOrderPanel lastOrder={lastOrder} onChanged={saved => { if (saved.id === lastOrder?.id) setLastOrder(saved); setCatalogVersion(value => value + 1); }} />
        <button type="button" className="pos-outline" onClick={() => setHistoryOpen(true)}>Tra cứu lịch sử POS</button>
        <button type="button" className="pos-outline" disabled={paying || uncertainPayment || catalogLoading} onClick={() => Modal.confirm({
          title: 'Cập nhật giá và tồn kho?', content: 'Giỏ hàng được giữ nguyên số lượng. Giá sẽ lấy lại từ catalog; hãy kiểm tra tổng tiền mới trước khi thanh toán.',
          okText: 'Cập nhật', cancelText: 'Giữ giá hiện tại', onOk: () => { setOffer(null); setCashGiven(0); setCatalogVersion(value => value + 1); }
        })}>Cập nhật giá / tồn kho</button></div>
      {/* Branch & Live Inventory Sync Status Bar */}
      <div className="pos-branch-bar">
        <div className="pos-branch-bar-left">
          <span className="material-symbols-outlined">storefront</span>
          <div>
            <span className="pos-branch-bar-title">Chi nhánh bán hàng POS</span>
            <div className="pos-branch-bar-name">
              <span>{branchName}</span>
              <span className="pos-branch-code-badge">{branchCode}</span>
            </div>
          </div>
        </div>
        <div className="pos-branch-bar-right">
          <span className="pos-live-dot"></span>
          <span>Tồn kho đồng bộ theo chi nhánh</span>
        </div>
      </div>

      {branchCode === 'LAB' && (
        <Alert
          type="error"
          showIcon
          message="Kho Lab Lens & Tổng kho không phục vụ bán lẻ trực tiếp"
          description="Kho Lab chỉ dùng cho lưu kho & gia công tròng kính, không hỗ trợ tạo đơn POS bán lẻ. Vui lòng chọn Chi nhánh 01 hoặc Chi nhánh 02 trên thanh điều hướng góc trên."
          style={{ margin: '12px 20px 0' }}
        />
      )}

      <InventorySyncPanel branchCode={branchCode} selectedBranch={branchName || selectedBranch} lastOrder={lastOrder} onSynced={() => setCatalogVersion(value => value + 1)} />
      <ReceiptPreview order={selectedReceiptOrder || lastOrder} open={receiptOpen} onClose={() => { setReceiptOpen(false); setSelectedReceiptOrder(null); }} />
      {!catalogLoading && !catalogError && branchCode && catalogProducts.length > 0
        && !catalogProducts.some(product => product.stockQuantity > 0) && <Alert showIcon type="info"
          message="Chi nhánh này chưa có hàng để bán. Cần tạo phiếu điều chuyển và xác nhận nhận hàng từ kho nguồn."
          style={{ marginBottom: 12 }} />}
      <div className={`pos-workspace${checkoutOpen ? '' : ' is-checkout-collapsed'}`}>
        <ProductCatalog products={filteredProducts} count={catalogProducts.length} cart={cart}
          loading={catalogLoading} error={catalogError} category={selectedCategory} setCategory={setSelectedCategory}
          search={barcodeInput} setSearch={setBarcodeInput} searchRef={barcodeRef} onSearch={handleBarcodeSubmit}
          onAdd={handleAddToCart} prescription={linkedRx} onSelectPrescription={() => setIsRxModalOpen(true)} onAddLens={handleInsertRxCombo} />
        <CheckoutPanel cart={cart} customer={customer} products={catalogProducts} open={checkoutOpen} onCollapse={collapseCheckout}
          onCustomer={() => setIsCustomerModalOpen(true)}
          onGuest={() => { setLinkedRx(null); setCustomer({ name: 'Khách vãng lai', tier: 'Vãng lai', phone: '', points: 0, pointValue: 0 }); }}
          onQuantity={handleQtyChange} onRemove={handleRemoveItem} onClear={handleClearCart}
          subtotal={subtotal} discount={discountTotal} tax={vatAmount} total={grandTotal}
          voucher={voucherCode} setVoucher={value => { setVoucherCode(value); setAppliedVoucher(''); }} onVoucher={() => setAppliedVoucher(voucherCode.trim().toUpperCase())}
          usePoints={usePoints} setUsePoints={setUsePoints} pointsToUse={pointsToUse} setPointsToUse={setPointsToUse}
          loyalty={loyalty} offer={offerReady ? offer : null} offerError={offerError} offerPending={cart.length > 0 && !offerReady}
          method={payTab} setMethod={setPayTab} cash={cashGiven} setCash={setCashGiven}
          vietqrMode={vietqrMode} setVietqrMode={setVietqrMode}
          confirmed={paymentConfirmed} setConfirmed={setPaymentConfirmed} paymentRef={paymentRef} cashRef={cashInputRef}
          paying={paying || uncertainPayment} onPay={handleExecutePayment} lastOrder={lastOrder} onPrint={() => setReceiptOpen(true)} />
      </div>
      {!checkoutOpen && <button type="button" ref={checkoutToggleRef} className="pos-checkout-reopen" aria-label="Mở đơn hàng hiện tại" aria-expanded={false} aria-controls="pos-checkout" onClick={openCheckout}>
        <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
        <span><strong>Đơn hiện tại · {cart.reduce((sum, item) => sum + item.quantity, 0)} món</strong><small>{money(grandTotal)} · Mở để thanh toán</small></span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
      </button>}

      {/* ================= MODAL: Chọn Toa Khám Khúc Xạ ================= */}
      {isRxModalOpen && (
        <div className="fixed inset-0 bg-[#263143]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl flex flex-col gap-4 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#004967] text-[24px]">
                  assignment_turned_in
                </span>
                <h3 className="text-base text-[#111c2d] font-bold">
                  Chọn Toa Khám Khúc Xạ Chờ Lên Đơn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="text-[#70787f] hover:text-[#111c2d] transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availablePrescriptions.length === 0 ? (
                <div className="py-12 text-center text-[#70787f] flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">eyeglasses</span>
                  <span className="font-semibold text-sm">Chưa có toa khám khúc xạ nào trong CSDL</span>
                  <p className="text-xs text-[#70787f] mt-1 max-w-md">
                    Bác sĩ khúc xạ tại phòng đo mắt chưa lưu toa kính nào. Toa sau khi khám xong sẽ tự động hiển thị tại đây.
                  </p>
                </div>
              ) : (
                availablePrescriptions.map((rx) => (
                  <div
                    key={rx.code}
                    onClick={() => handleSelectPrescription(rx)}
                    className="p-4 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] border border-[#dee8ff]/50 transition-colors cursor-pointer flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#004967] font-bold">
                        {rx.code} • {rx.customer} ({rx.phone})
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#cae6ff] text-[#001e30] text-[10px] font-bold">
                        {rx.timeAgo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-100 text-[#111c2d]">
                      <div>OD (Mắt phải): {rx.od}</div>
                      <div>OS (Mắt trái): {rx.os}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#f0f3ff] text-[#40484e] text-xs font-bold hover:bg-[#dee8ff] transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: Tiếp Nhận & Tạo Nhanh Khách Hàng (S3-23) ================= */}
      <CustomerReceptionModal
        open={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={dbCustomers}
        onSelectCustomer={handleSelectCustomer}
        onCustomerCreated={handleCustomerCreated}
      />

      {/* ================= MODAL: Tra Cứu Lịch Sử Giao Dịch POS (S3-23) ================= */}
      <PosHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        branchCode={branchCode}
        selectedBranch={branchName || selectedBranch}
        currentUser={user}
        onSelectReceipt={(order) => {
          setSelectedReceiptOrder(order);
          setReceiptOpen(true);
        }}
        onOrderChanged={(saved) => {
          if (saved.id === lastOrder?.id) setLastOrder(saved);
          setCatalogVersion(v => v + 1);
        }}
      />

      {/* ================= MODAL: Cổng thanh toán SePay VietQR Sandbox ================= */}
      <PosSepayModal
        open={isSepayModalOpen}
        order={sepayPendingOrder}
        onSuccess={(updatedOrder) => {
          setIsSepayModalOpen(false);
          completeOrderSuccess(updatedOrder, null);
        }}
        onManualSettled={(settledOrder) => {
          setIsSepayModalOpen(false);
          completeOrderSuccess(settledOrder, null);
        }}
        onClose={() => {
          setIsSepayModalOpen(false);
        }}
      />
    </main>
  );
}
