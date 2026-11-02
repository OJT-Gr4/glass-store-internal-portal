import React, { useState, useEffect, useRef } from 'react';
import {
  Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col, Space,
  notification, Typography, Divider, Tooltip, Modal, Tabs, Badge, Drawer, Switch,
  Radio
} from 'antd';
import {
  BarcodeOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  UserOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import { PRODUCT_CATALOG, findProductByBarcodeOrSku } from './posDatabase';
import ReceiptK80 from './ReceiptK80';
import { useAuth } from '../../context/AuthContext';
import './PosPage.css';

const { Text, Title } = Typography;

export default function PosPage() {
  const { user } = useAuth();

  // Cart State (Mặc định giỏ hàng trống khi mở ca thu ngân, không gán sẵn sản phẩm mẫu)
  const [cartItems, setCartItems] = useState([]);

  // Last Scanned Item for visual highlight
  const [lastScannedSku, setLastScannedSku] = useState(null);

  // Barcode Input
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);

  // Sound toggle (Beep on scan)
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Customer Information
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [customerName, setCustomerName] = useState('Phạm Khách Hàng');
  const [customerTier, setCustomerTier] = useState('VIP Gold (Tích lũy 450 điểm)');

  // Discount / Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);

  // Payment method: 'vietqr' | 'cash' | 'card'
  const [paymentMethod, setPaymentMethod] = useState('vietqr');
  const [cashGiven, setCashGiven] = useState(0);

  // Active Order ID state để giữ đồng bộ tuyệt đối từ VietQR sang Hóa Đơn In
  const [activeOrderId, setActiveOrderId] = useState(() => `ORD-${Date.now().toString().slice(-8)}`);

  // Modals
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isHeldDrawerOpen, setIsHeldDrawerOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Held Orders (Lưu đơn tạm)
  const [heldOrders, setHeldOrders] = useState([]);

  // Printable Receipt Ref (Chỉ gắn duy nhất vào container in, không gắn vào modal preview)
  const receiptPrintRef = useRef(null);
  const handlePrintReceipt = useReactToPrint({
    content: () => receiptPrintRef.current,
    documentTitle: `Hoa_Don_${completedOrder?.orderId || activeOrderId || 'K80'}`
  });

  // Synthesized Web Audio API POS Scanner Beep
  const playScannerBeep = (isSuccess = true) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        // High crisp retail scanner beep (1760Hz for 80ms)
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.08);
      } else {
        // Low error double-beep
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.22);
      }
    } catch (e) {
      // AudioContext could be blocked if no user interaction yet
    }
  };

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Core Barcode Processing Function
  const handleProcessScannedCode = (scannedCode) => {
    if (!scannedCode || !scannedCode.trim()) return;
    const cleanCode = scannedCode.trim();

    const product = findProductByBarcodeOrSku(cleanCode);

    // CHẶN NGAY LẬP TỨC NẾU MÃ KHÔNG TỒN TẠI
    if (!product) {
      playScannerBeep(false);
      notification.error({
        message: 'Từ chối quét mã - Không tìm thấy!',
        description: `Mã barcode/SKU [${cleanCode}] không tồn tại trong hệ thống kho. Tuyệt đối không thêm vào đơn hàng!`,
        duration: 3.5
      });
      setBarcodeInput('');
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
      return; // Dừng ngay tại đây, không thay đổi giỏ hàng, không tạo sản phẩm!
    }

    // CHỈ THỰC HIỆN KHI TÌM THẤY SẢN PHẨM HỢP LỆ TRONG KHO
    playScannerBeep(true);
    setLastScannedSku(product.sku);

    setCartItems((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.sku === product.sku);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [...prevCart, { ...product, id: Date.now(), qty: 1 }];
    });

    notification.success({
      message: 'Quét Barcode thành công!',
      description: `Đã thêm [${product.name}] (SKU: ${product.sku}) vào đơn hàng.`,
      duration: 2
    });

    setBarcodeInput('');
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 50);
  };

  // Giữ ref hàm xử lý quét mã để useEffect không cần dependency và không re-bind listener
  const handleProcessScannedCodeRef = useRef(handleProcessScannedCode);
  handleProcessScannedCodeRef.current = handleProcessScannedCode;

  // Global Hardware Barcode Scanner Listener
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e) => {
      const target = e.target;
      const targetTag = target?.tagName?.toUpperCase();
      const isInputOrTextarea = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || target?.isContentEditable;

      // Bỏ qua khi người dùng đang gõ trong bất kỳ ô input nào (SĐT, Họ Tên, Voucher, Barcode Input)
      if (isInputOrTextarea) {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Khi máy quét gửi ký tự kết thúc Enter
      if (e.key === 'Enter') {
        if (scanBuffer.length >= 2 && diff < 120) {
          e.preventDefault();
          handleProcessScannedCodeRef.current(scanBuffer.trim());
          scanBuffer = '';
          return;
        }
        scanBuffer = '';
        return;
      }

      // Bỏ qua các phím điều khiển (Shift, Ctrl, Alt...)
      if (e.key.length !== 1) return;

      // Máy quét phần cứng gửi ký tự cực nhanh (thường < 80ms)
      if (diff < 80) {
        scanBuffer += e.key;
      } else {
        scanBuffer = e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Input Enter handler
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    handleProcessScannedCode(barcodeInput);
  };

  // Quantity changes
  const handleUpdateQty = (itemId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
    notification.info({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
  };

  // Clear cart
  const handleClearCart = () => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xóa toàn bộ đơn hàng hiện tại?',
      okText: 'Xóa giỏ hàng',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        setCartItems([]);
        setDiscountPercent(0);
        setDiscountFixed(0);
        setVoucherCode('');
        setCompletedOrder(null);
        setActiveOrderId(`ORD-${Date.now().toString().slice(-8)}`);
        notification.info({ message: 'Đã làm mới giỏ hàng' });
        barcodeInputRef.current?.focus();
      }
    });
  };

  // Reset & Bắt đầu đơn hàng mới
  const handleStartNewOrder = () => {
    setCartItems([]);
    setDiscountPercent(0);
    setDiscountFixed(0);
    setVoucherCode('');
    setCompletedOrder(null);
    setActiveOrderId(`ORD-${Date.now().toString().slice(-8)}`);
    setIsReceiptModalOpen(false);
    setIsQrModalOpen(false);
    notification.success({ message: 'Đã sẵn sàng tạo đơn hàng mới!' });
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Apply Voucher
  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (code === 'TET2026') {
      setDiscountPercent(10);
      setDiscountFixed(0);
      notification.success({ message: 'Áp dụng mã TET2026', description: 'Giảm giá 10% tổng đơn hàng.' });
    } else if (code === 'VIP5') {
      setDiscountPercent(5);
      setDiscountFixed(0);
      notification.success({ message: 'Áp dụng mã VIP5', description: 'Giảm giá 5% cho khách hàng thân thiết.' });
    } else if (code === 'COMBO100K') {
      setDiscountPercent(0);
      setDiscountFixed(100000);
      notification.success({ message: 'Áp dụng mã COMBO100K', description: 'Trừ trực tiếp 100.000 ₫.' });
    } else {
      notification.error({ message: 'Mã voucher không hợp lệ', description: 'Thử các mã mẫu: TET2026 (10%), VIP5 (5%), COMBO100K (-100K).' });
    }
  };

  // Financial Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100) + discountFixed;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeReturned = Math.max(0, cashGiven - totalAmount);

  // Hold current order (Lưu tạm đơn)
  const handleHoldOrder = () => {
    if (cartItems.length === 0) {
      notification.warning({ message: 'Giỏ hàng đang trống, không thể lưu tạm!' });
      return;
    }

    const newHold = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      time: new Date().toLocaleTimeString('vi-VN'),
      customerName,
      customerPhone,
      cartItems: [...cartItems],
      totalAmount
    };

    setHeldOrders([newHold, ...heldOrders]);
    setCartItems([]);
    setCompletedOrder(null);
    setActiveOrderId(`ORD-${Date.now().toString().slice(-8)}`);
    notification.success({
      message: 'Đã lưu tạm đơn hàng!',
      description: `Đã đưa đơn của khách [${customerName}] vào danh sách chờ. Sẵn sàng phục vụ khách tiếp theo.`
    });
    barcodeInputRef.current?.focus();
  };

  // Resume held order (Khôi phục đơn tạm)
  const handleResumeOrder = (heldOrder) => {
    setCartItems(heldOrder.cartItems);
    setCustomerName(heldOrder.customerName);
    setCustomerPhone(heldOrder.customerPhone);
    setHeldOrders(heldOrders.filter((h) => h.id !== heldOrder.id));
    setCompletedOrder(null);
    setActiveOrderId(`ORD-${Date.now().toString().slice(-8)}`);
    setIsHeldDrawerOpen(false);
    notification.success({
      message: 'Đã khôi phục đơn hàng!',
      description: `Đơn [${heldOrder.id}] của [${heldOrder.customerName}] đã đưa trở lại quầy POS.`
    });
    barcodeInputRef.current?.focus();
  };

  // Chuẩn bị dữ liệu đơn hàng đồng bộ tuyệt đối mã orderId
  const generateOrderData = (method, customOrderId = null) => {
    return {
      orderId: customOrderId || completedOrder?.orderId || activeOrderId,
      cashierName: user?.staffName || 'Nguyễn Bán Hàng',
      cashierStaffId: user?.staffId || 'NV-OPT-202688',
      branchName: user?.branchName || 'Chi nhánh 01 - Flagship Lê Thánh Tôn, Quận 1',
      customerName,
      customerPhone,
      cartItems: [...cartItems],
      subtotal,
      discountAmount,
      vatAmount: Math.round(totalAmount * 0.08),
      totalAmount,
      paymentMethod:
        method === 'vietqr' ? 'Chuyển Khoản VietQR 247' : method === 'cash' ? 'Tiền Mặt (Cash)' : 'Quẹt Thẻ POS Terminal',
      cashGiven: method === 'cash' ? cashGiven : 0,
      changeReturned: method === 'cash' ? changeReturned : 0,
      createdAt: new Date().toLocaleString('vi-VN')
    };
  };

  // Execute Payment
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      notification.warning({ message: 'Giỏ hàng đang trống! Vui lòng quét sản phẩm trước khi thanh toán.' });
      return;
    }

    const orderData = generateOrderData(paymentMethod, activeOrderId);
    setCompletedOrder(orderData);

    if (paymentMethod === 'vietqr') {
      setIsQrModalOpen(true);
    } else {
      notification.success({
        message: 'Thanh toán thành công!',
        description: `Đã hoàn tất thanh toán ${totalAmount.toLocaleString()} ₫.`
      });
      setIsReceiptModalOpen(true);
    }
  };

  // Preview Receipt Handler
  const handlePreviewReceipt = () => {
    if (cartItems.length === 0 && !completedOrder) {
      notification.warning({ message: 'Giỏ hàng đang trống, chưa có đơn để xem trước!' });
      return;
    }
    const orderData = completedOrder || generateOrderData(paymentMethod, activeOrderId);
    setCompletedOrder(orderData);
    setIsReceiptModalOpen(true);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ---------------- 1. Barcode Scanner Hardware Status Banner ---------------- */}
      <div className="pos-scanner-banner">
        <div className="pos-scanner-status">
          <div className="pos-scanner-pulse-dot" />
          <div className="pos-scanner-text">
            <h4>MÁY QUÉT BARCODE HID: SẴN SÀNG NHẬN DỮ LIỆU</h4>
            <p>Hệ thống tự động bắt tín hiệu phím Enter từ đầu quét mã vạch USB / Bluetooth tốc độ cao</p>
          </div>
        </div>

        <Space size={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 255, 255, 0.12)', padding: '6px 12px', borderRadius: 20 }}>
            <SoundOutlined />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Âm thanh Beep:</span>
            <Switch checked={soundEnabled} onChange={setSoundEnabled} size="small" />
          </div>

          <Badge count={heldOrders.length}>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => setIsHeldDrawerOpen(true)}
              style={{ background: '#ffffff', color: '#086288', fontWeight: 700, borderRadius: 8 }}
            >
              Đơn Tạm ({heldOrders.length})
            </Button>
          </Badge>
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        {/* ================= LEFT COLUMN: Scanner & Cart Table ================= */}
        <Col xs={24} xl={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <BarcodeOutlined style={{ color: '#086288', fontSize: 22 }} />
                  <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>
                    Quét Mã Vạch Sản Phẩm Vào Đơn ({cartItems.length} sản phẩm)
                  </span>
                </Space>
                <Space>
                  <Button
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={handleHoldOrder}
                    disabled={cartItems.length === 0}
                    style={{ borderColor: '#4D8DBA', color: '#086288', fontWeight: 600 }}
                  >
                    Lưu Tạm Đơn
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<ClearOutlined />}
                    onClick={handleClearCart}
                    disabled={cartItems.length === 0}
                  >
                    Xóa Hết
                  </Button>
                </Space>
              </div>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
          >
            {/* Dedicated Barcode Scanner Input */}
            <div className="pos-barcode-input-container">
              <Input
                ref={barcodeInputRef}
                className="pos-barcode-big-input"
                prefix={<BarcodeOutlined style={{ color: '#086288', fontSize: 22, marginRight: 8 }} />}
                placeholder="Dùng máy quét bắn tia laser Barcode hoặc nhập SKU rồi nhấn Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={handleBarcodeSubmit}
                size="large"
              // suffix={
              //   <div className="pos-laser-badge">
              //     <ThunderboltOutlined /> Enter = Thêm
              //   </div>
              // }
              />
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleBarcodeSubmit}
                style={{
                  background: '#086288',
                  borderColor: '#086288',
                  height: 50,
                  padding: '0 24px',
                  fontWeight: 700,
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(8, 98, 136, 0.28)'
                }}
              >
                Nhập Mã
              </Button>
            </div>

            {/* Quick Catalog / Barcode Scanner Simulation Pills */}
            <div className="pos-quick-catalog">
              <div className="pos-quick-catalog-header">
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>
                  ⚡ Thử quét Barcode mẫu (Bấm 1 chạm để mô phỏng máy quét bắn tia phát tiếng Beep):
                </span>
                <span style={{ fontSize: 11, color: '#086288' }}>
                  Kho: {PRODUCT_CATALOG.length} mã khả dụng
                </span>
              </div>

              <div className="pos-quick-catalog-pills">
                {PRODUCT_CATALOG.map((p) => (
                  <button
                    key={p.sku}
                    type="button"
                    className="pos-barcode-demo-btn"
                    onClick={() => handleProcessScannedCode(p.barcode)}
                    title={`Barcode: ${p.barcode} | Giá: ${p.price.toLocaleString()} ₫`}
                  >
                    <BarcodeOutlined style={{ color: '#086288' }} />
                    <span>{p.sku}</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>({p.price.toLocaleString()} ₫)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Items Table */}
            <Table
              dataSource={cartItems}
              rowKey="id"
              pagination={false}
              bordered
              style={{ borderRadius: 8, overflow: 'hidden' }}
              rowClassName={(record) => (record.sku === lastScannedSku ? 'pos-cart-row-highlight' : '')}
              locale={{
                emptyText: (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: '#64748b' }}>
                    <BarcodeOutlined style={{ fontSize: 40, color: '#94a3b8', marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Đơn hàng hiện chưa có sản phẩm nào</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Dùng máy quét laser Barcode hoặc bấm vào các sản phẩm mẫu phía trên để thêm vào đơn
                    </div>
                  </div>
                )
              }}
              columns={[
                {
                  title: 'Mã SKU / Barcode',
                  width: 170,
                  render: (_, r) => (
                    <div>
                      <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, borderRadius: 4 }}>
                        {r.sku}
                      </Tag>
                      {r.barcode && (
                        <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                          BC: {r.barcode}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  title: 'Tên Sản Phẩm / Dịch Vụ',
                  dataIndex: 'name',
                  render: (val, r) => (
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>{val}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#4D8DBA', fontWeight: 500 }}>
                          Phân loại: {r.category}
                        </span>
                        {r.brand && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            • Hãng: {r.brand}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                },
                {
                  title: 'Đơn Giá',
                  dataIndex: 'price',
                  width: 130,
                  align: 'right',
                  render: (val) => (
                    <span style={{ fontWeight: 600, color: '#334155' }}>
                      {val.toLocaleString()} ₫
                    </span>
                  )
                },
                {
                  title: 'Số Lượng',
                  dataIndex: 'qty',
                  width: 135,
                  align: 'center',
                  render: (val, record) => (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <Button
                        size="small"
                        icon={<MinusOutlined style={{ fontSize: 10 }} />}
                        onClick={() => handleUpdateQty(record.id, -1)}
                      />
                      <InputNumber
                        min={1}
                        max={99}
                        value={val}
                        style={{ width: 50, textAlign: 'center', borderRadius: 4 }}
                        onChange={(newVal) => {
                          setCartItems(
                            cartItems.map((i) => (i.id === record.id ? { ...i, qty: newVal || 1 } : i))
                          );
                        }}
                      />
                      <Button
                        size="small"
                        icon={<PlusOutlined style={{ fontSize: 10 }} />}
                        onClick={() => handleUpdateQty(record.id, 1)}
                      />
                    </div>
                  )
                },
                {
                  title: 'Thành Tiền',
                  width: 140,
                  align: 'right',
                  render: (_, record) => (
                    <span style={{ fontWeight: 800, color: '#086288', fontSize: 14 }}>
                      {(record.price * record.qty).toLocaleString()} ₫
                    </span>
                  )
                },
                {
                  title: '',
                  width: 48,
                  align: 'center',
                  render: (_, record) => (
                    <Tooltip title="Xóa khỏi đơn">
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(record.id)}
                      />
                    </Tooltip>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* ================= RIGHT COLUMN: Checkout & Payment ================= */}
        <Col xs={24} xl={8}>
          <Card
            title={
              <Space>
                <CreditCardOutlined style={{ color: '#086288', fontSize: 20 }} />
                <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>
                  Thanh Toán & Hóa Đơn
                </span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
          >
            {/* Customer Information Box */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#086288' }}>
                  <UserOutlined /> THÔNG TIN KHÁCH HÀNG
                </span>
                <Tag color="gold" style={{ fontWeight: 700 }}>
                  VIP Gold
                </Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Số điện thoại</div>
                  <Input
                    size="middle"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ borderRadius: 6 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Họ và tên</div>
                  <Input
                    size="middle"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ borderRadius: 6 }}
                  />
                </div>
              </div>
            </div>

            {/* Voucher Discount */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Mã Giảm Giá / Voucher</span>
                <span style={{ fontSize: 11, color: '#086288', cursor: 'pointer' }} onClick={() => setVoucherCode('TET2026')}>
                  Mẫu: TET2026
                </span>
              </div>
              <Input.Search
                placeholder="Nhập mã (TET2026, VIP5, COMBO100K)..."
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                onSearch={handleApplyVoucher}
                enterButton={<span style={{ fontWeight: 700 }}>Áp Dụng</span>}
                size="large"
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* Price Summary Breakdown */}
            <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13.5 }}>Tổng tiền hàng:</Text>
                <Text strong style={{ fontSize: 13.5 }}>{subtotal.toLocaleString()} ₫</Text>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#d97706', fontSize: 13 }}>Chiết khấu voucher:</Text>
                  <Text style={{ color: '#d97706', fontWeight: 700, fontSize: 13 }}>
                    -{discountAmount.toLocaleString()} ₫
                  </Text>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Thuế VAT (8%):</Text>
                <Text style={{ color: '#64748b', fontSize: 12 }}>Đã gồm trong giá</Text>
              </div>

              <Divider style={{ margin: '10px 0', borderColor: '#e2e8f0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 15, color: '#0f172a' }}>TỔNG THANH TOÁN:</Text>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#086288', lineHeight: 1.2 }}>
                  {totalAmount.toLocaleString()} ₫
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8 }}>
                CHỌN PHƯƠNG THỨC THANH TOÁN
              </span>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%' }}
                buttonStyle="solid"
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <Radio.Button value="vietqr" style={{ textAlign: 'center', borderRadius: 6, fontWeight: 600 }}>
                    <QrcodeOutlined /> VietQR
                  </Radio.Button>
                  <Radio.Button value="cash" style={{ textAlign: 'center', borderRadius: 6, fontWeight: 600 }}>
                    <DollarOutlined /> Tiền Mặt
                  </Radio.Button>
                  <Radio.Button value="card" style={{ textAlign: 'center', borderRadius: 6, fontWeight: 600 }}>
                    <CreditCardOutlined /> Cà Thẻ
                  </Radio.Button>
                </div>
              </Radio.Group>
            </div>

            {/* Cash Payment Extra Controls */}
            {paymentMethod === 'cash' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>Tiền khách đưa:</span>
                  <InputNumber
                    size="middle"
                    value={cashGiven}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
                    onChange={(val) => setCashGiven(val || 0)}
                    style={{ width: 140, fontWeight: 700, textAlign: 'right' }}
                  />
                </div>

                <div className="pos-cash-quick-buttons">
                  <div className="pos-cash-pill" onClick={() => setCashGiven(totalAmount)}>
                    Đủ tiền
                  </div>
                  <div className="pos-cash-pill" onClick={() => setCashGiven(1000000)}>
                    1.000.000 ₫
                  </div>
                  <div className="pos-cash-pill" onClick={() => setCashGiven(2000000)}>
                    2.000.000 ₫
                  </div>
                  <div className="pos-cash-pill" onClick={() => setCashGiven(5000000)}>
                    5.000.000 ₫
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 6, borderTop: '1px dashed #fde68a' }}>
                  <span style={{ fontWeight: 700, color: '#92400e' }}>Tiền thối lại:</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: changeReturned >= 0 ? '#059669' : '#dc2626' }}>
                    {changeReturned.toLocaleString()} ₫
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined style={{ fontSize: 18 }} />}
                block
                disabled={cartItems.length === 0}
                style={{
                  background: cartItems.length === 0 ? '#cbd5e1' : '#086288',
                  borderColor: cartItems.length === 0 ? '#cbd5e1' : '#086288',
                  height: 50,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  boxShadow: cartItems.length === 0 ? 'none' : '0 4px 14px rgba(8, 98, 136, 0.3)'
                }}
                onClick={handleCheckout}
              >
                {paymentMethod === 'vietqr'
                  ? 'Tạo Mã VietQR Thu Tiền'
                  : paymentMethod === 'cash'
                    ? 'Xác Nhận Thu Tiền Mặt'
                    : 'Xác Nhận Quẹt Thẻ POS'}
              </Button>

              <Button
                size="large"
                icon={<PrinterOutlined />}
                block
                disabled={cartItems.length === 0 && !completedOrder}
                style={{
                  height: 44,
                  borderRadius: 8,
                  borderColor: '#4D8DBA',
                  color: '#086288',
                  fontWeight: 700,
                  background: '#ffffff'
                }}
                onClick={handlePreviewReceipt}
              >
                In Hóa Đơn Nhiệt K80 (Xem Trước)
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ================= VietQR Interactive Modal ================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#086288' }}>
            <QrcodeOutlined style={{ fontSize: 22 }} />
            <span style={{ fontWeight: 800, fontSize: 17 }}>Thanh Toán Quét Mã VietQR Chuyển Khoản 24/7</span>
          </div>
        }
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={[
          <Button key="back" onClick={() => setIsQrModalOpen(false)}>
            Quay Lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setIsQrModalOpen(false);
              const syncedOrder = completedOrder || generateOrderData('vietqr', activeOrderId);
              setCompletedOrder(syncedOrder);
              notification.success({
                message: 'Đã nhận tiền thành công!',
                description: `Hệ thống ghi nhận giao dịch VietQR [${syncedOrder.orderId}] số tiền ${totalAmount.toLocaleString()} ₫ thành công.`
              });
              setIsReceiptModalOpen(true);
            }}
            style={{ background: '#086288' }}
          >
            Đã Nhận Tiền & In Hóa Đơn
          </Button>
        ]}
      >
        {(() => {
          const currentOrderId = completedOrder?.orderId || activeOrderId;
          const qrMemo = `OPTIVISION ${currentOrderId}`;
          return (
            <div className="pos-vietqr-box">
              <img
                className="pos-vietqr-img"
                src={`https://api.vietqr.io/image/970422-0988776655-compact2.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(qrMemo)}&accountName=OPTIVISION%20RETAIL`}
                alt="VietQR Payment"
              />
              <div style={{ marginTop: 12, fontSize: 14 }}>
                <div>Ngân hàng thụ hưởng: <strong>MBBank (Ngân Hàng Quân Đội)</strong></div>
                <div>Số tài khoản: <strong>0988 7766 55</strong></div>
                <div>Số tiền: <strong style={{ color: '#086288', fontSize: 18 }}>{totalAmount.toLocaleString()} ₫</strong></div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                  Nội dung CK: <strong>{qrMemo}</strong>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ================= Printable Receipt K80 Preview Modal ================= */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#086288' }}>
            <PrinterOutlined style={{ fontSize: 20 }} />
            <span style={{ fontWeight: 800 }}>Xem Trước & In Hóa Đơn Nhiệt K80 Chuẩn POS</span>
          </div>
        }
        open={isReceiptModalOpen}
        onCancel={() => setIsReceiptModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsReceiptModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="new"
            icon={<ReloadOutlined />}
            onClick={handleStartNewOrder}
          >
            Tạo Đơn Hàng Mới
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrintReceipt}
            style={{ background: '#086288' }}
          >
            In Ra Máy In K80
          </Button>
        ]}
      >
        <div style={{ maxHeight: '65vh', overflowY: 'auto', background: '#e2e8f0', padding: '16px', borderRadius: 8 }}>
          {/* Modal Preview KHÔNG gắn receiptPrintRef để tránh đè ref của phần tử in */}
          <ReceiptK80 orderData={completedOrder || generateOrderData(paymentMethod, activeOrderId)} />
        </div>
      </Modal>

      {/* Hidden print container dedicated for react-to-print (DUY NHẤT GẮN REF TẠI ĐÂY) */}
      <div className="pos-receipt-print-container">
        <ReceiptK80 ref={receiptPrintRef} orderData={completedOrder || generateOrderData(paymentMethod, activeOrderId)} />
      </div>

      {/* ================= Held Orders Drawer (Đơn lưu tạm) ================= */}
      <Drawer
        title={<span style={{ fontWeight: 800, color: '#086288' }}>Danh Sách Đơn Lưu Tạm ({heldOrders.length})</span>}
        placement="right"
        width={420}
        onClose={() => setIsHeldDrawerOpen(false)}
        open={isHeldDrawerOpen}
      >
        {heldOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            Chưa có đơn hàng nào được lưu tạm.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {heldOrders.map((ho) => (
              <Card
                key={ho.id}
                size="small"
                style={{ borderRadius: 8, border: '1px solid #cfe0ef' }}
                title={<strong style={{ color: '#086288' }}>{ho.id} • {ho.customerName}</strong>}
                extra={<span style={{ fontSize: 11, color: '#64748b' }}>{ho.time}</span>}
              >
                <div style={{ fontSize: 12, marginBottom: 6 }}>SĐT: {ho.customerPhone}</div>
                <div style={{ fontSize: 12, marginBottom: 8 }}>
                  Gồm <strong>{ho.cartItems.length} sản phẩm</strong> - Tổng: <strong style={{ color: '#086288' }}>{ho.totalAmount.toLocaleString()} ₫</strong>
                </div>
                <Button
                  type="primary"
                  size="middle"
                  block
                  icon={<ReloadOutlined />}
                  style={{ background: '#086288' }}
                  onClick={() => handleResumeOrder(ho)}
                >
                  Khôi Phục & Tiếp Tục Thu Ngân
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
