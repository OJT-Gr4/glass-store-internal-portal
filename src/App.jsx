import React, { useState, useEffect } from 'react';
import {
  ConfigProvider, Layout, Menu, Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col,
  Statistic, Space, notification, Typography, Divider, Alert, Tooltip, Spin
} from 'antd';
import {
  ShopOutlined,
  EyeOutlined,
  ToolOutlined,
  AppstoreOutlined,
  PrinterOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BarcodeOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  PlusOutlined,
  QrcodeOutlined,
  LogoutOutlined,
  LockOutlined,
  MailOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  getAccessToken,
  getStoredUser,
  setTokens,
  setStoredUser,
  clearTokens,
  isTokenExpired,
  refreshAccessToken
} from './authUtils';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ─── RBAC: role → allowed menu keys ──────────────────────────────────────────
const ROLE_MENU_MAP = {
  ROLE_ADMIN:       ['pos', 'optometry', 'lab', 'dashboard'],
  ROLE_SALES_STAFF: ['pos'],
  ROLE_OPTOMETRIST: ['optometry'],
  ROLE_LAB_TECH:    ['lab'],
};

function getRoleLabel(roles = []) {
  if (roles.includes('ROLE_ADMIN'))       return { label: 'Quản trị viên', color: '#7c3aed' };
  if (roles.includes('ROLE_SALES_STAFF')) return { label: 'Nhân viên bán hàng', color: '#086288' };
  if (roles.includes('ROLE_OPTOMETRIST')) return { label: 'Kỹ thuật viên khúc xạ', color: '#0369a1' };
  if (roles.includes('ROLE_LAB_TECH'))    return { label: 'Kỹ thuật viên Lab', color: '#0f766e' };
  return { label: 'Nhân viên', color: '#64748b' };
}

function getAllowedKeys(roles = []) {
  const allowed = new Set();
  roles.forEach(r => {
    (ROLE_MENU_MAP[r] || []).forEach(k => allowed.add(k));
  });
  return [...allowed];
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || data?.error || 'Đăng nhập thất bại.';
        setError(msg);
        return;
      }
      setTokens(data.accessToken, data.refreshToken);
      setStoredUser(data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError('Không thể kết nối tới máy chủ. Vui lòng kiểm tra backend đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#086288', borderRadius: 8 } }}>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #074768 0%, #0284c7 50%, #38bdf8 100%)',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
      }}>
        <div style={{
          background: '#ffffff', borderRadius: 20, padding: '48px 44px', width: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#FFEFC4', borderRadius: 16, padding: 14, marginBottom: 12
            }}>
              <EyeOutlined style={{ fontSize: 32, color: '#086288' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#086288', letterSpacing: 0.5 }}>GlassStore</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700, marginTop: 2 }}>
              Internal Portal
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Dành cho nhân viên nội bộ</div>
          </div>

          {/* Error */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Email nhân viên
              </label>
              <Input
                size="large"
                prefix={<MailOutlined style={{ color: '#4D8DBA' }} />}
                placeholder="email@glassstore.vn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Mật khẩu
              </label>
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: '#4D8DBA' }} />}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </div>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              style={{
                background: '#086288', borderColor: '#086288', height: 48,
                fontSize: 15, fontWeight: 700, borderRadius: 8,
                boxShadow: '0 4px 14px rgba(8, 98, 136, 0.35)'
              }}
            >
              {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
            </Button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: 24, padding: '12px 16px', background: '#f8fafc',
            borderRadius: 8, border: '1px dashed #cbd5e1'
          }}>
            <Text style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700 }}>
              Tài khoản thử nghiệm:
            </Text>
            <Text style={{ fontSize: 11, color: '#475569' }}>
              SALES: sales@glassstore.vn / 123456<br />
              OPTOMETRIST: optometrist@glassstore.vn / 123456<br />
              LAB: lab@glassstore.vn / 123456<br />
              ADMIN: admin@glassstore.vn / 123456
            </Text>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>
              © 2026 GlassStore Internal Portal — Bảo mật 256-bit SSL
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

// ─── FORBIDDEN CARD ───────────────────────────────────────────────────────────
function ForbiddenCard() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Card style={{ textAlign: 'center', borderRadius: 16, padding: '32px 48px', maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
        <Title level={3} style={{ color: '#dc2626', margin: '0 0 8px' }}>403 – Không có quyền</Title>
        <Text type="secondary">
          Bạn không có quyền truy cập chức năng này.<br />
          Vui lòng liên hệ quản trị viên nếu cần.
        </Text>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [selectedKey, setSelectedKey] = useState('pos');

  // POS state
  const [cartItems, setCartItems] = useState([
    { id: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Mắt Vuông - Đen', category: 'Gọng Kính', price: 3250000, qty: 1 },
    { id: 2, sku: 'LNS-CHEMI-160', name: 'Cặp Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000, qty: 1 }
  ]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [customerName, setCustomerName] = useState('Phạm Khách Hàng');

  const [labJobs, setLabJobs] = useState([
    {
      id: 'LAB-20261030-01', orderId: 'ORD-20261030-001', customer: 'Phạm Khách Hàng',
      frame: 'Gọng Bolon Titanium (FRM-BOLON-BLK)', lens: 'Tròng Chemi U2 1.60',
      prescription: 'OD: -2.50 (-0.75 x 175°) | OS: -3.00 (-0.50 x 180°)',
      status: 'IN_PROGRESS', technician: 'Lê Kỹ Thuật'
    },
    {
      id: 'LAB-20261030-02', orderId: 'ORD-20261030-002', customer: 'Trần Văn Nam',
      frame: 'Gọng Gentle Monster TR90 (FRM-GM-BLK)', lens: 'Tròng Essilor Transitions Gen 8',
      prescription: 'OD: -1.75 | OS: -2.00',
      status: 'WAITING_PROCESS', technician: 'Chưa phân công'
    }
  ]);

  // ── Restore session on mount ──
  useEffect(() => {
    const token = getAccessToken();
    const user  = getStoredUser();
    if (token && user && !isTokenExpired(token)) {
      setCurrentUser(user);
      // Set initial key based on roles
      const roles = user.roles || [];
      const allowed = getAllowedKeys(roles);
      if (allowed.length > 0) setSelectedKey(allowed[0]);
    }
    setSessionChecked(true);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    const roles = user.roles || [];
    const allowed = getAllowedKeys(roles);
    if (allowed.length > 0) setSelectedKey(allowed[0]);
    notification.success({
      message: `Chào mừng, ${user.fullName || user.email}!`,
      description: `Đã đăng nhập thành công với vai trò ${getRoleLabel(roles).label}.`
    });
  };

  const handleLogout = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') })
        });
      }
    } catch (_) { /* ignore logout API failure */ }
    clearTokens();
    setCurrentUser(null);
    notification.info({ message: 'Đã đăng xuất khỏi hệ thống.' });
  };

  // Quick products
  const quickProducts = [
    { sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium - Đen', category: 'Gọng Kính', price: 3250000 },
    { sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', category: 'Gọng Kính', price: 1850000 },
    { sku: 'LNS-CHEMI-160', name: 'Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000 },
    { sku: 'LNS-ESSI-GEN8', name: 'Tròng Đổi Màu Essilor Gen 8', category: 'Tròng Kính', price: 3380000 },
    { sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Polarized', category: 'Kính Râm', price: 4950000 }
  ];

  const handleAddProduct = (itemToAdd) => {
    const idx = cartItems.findIndex(i => i.sku === itemToAdd.sku);
    if (idx > -1) {
      const updated = [...cartItems];
      updated[idx].qty += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { ...itemToAdd, id: Date.now(), qty: 1 }]);
    }
    notification.success({ message: 'Đã thêm sản phẩm', description: `[${itemToAdd.name}] đã vào đơn hàng.` });
  };

  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;
    const found = quickProducts.find(p => p.sku.toLowerCase() === barcodeInput.trim().toLowerCase());
    if (found) {
      handleAddProduct(found);
    } else {
      handleAddProduct({
        sku: barcodeInput.trim().toUpperCase(),
        name: `Sản phẩm mã ${barcodeInput.trim().toUpperCase()}`,
        category: 'Kính Mắt',
        price: 1500000
      });
    }
    setBarcodeInput('');
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  // ── POS Screen ──
  const renderPosScreen = () => (
    <div style={{ width: '100%' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  <BarcodeOutlined style={{ color: '#086288', fontSize: 20 }} />
                  <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>
                    Danh Sách Sản Phẩm Trong Đơn ({cartItems.length})
                  </span>
                </Space>
                <Tag style={{ background: '#FFEFC4', color: '#086288', border: '1px solid #086288', fontWeight: 700 }}>
                  Quầy POS 01
                </Tag>
              </div>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Input
                prefix={<BarcodeOutlined style={{ color: '#4D8DBA', fontSize: 18 }} />}
                placeholder="Quét mã vạch Barcode hoặc nhập SKU (VD: FRM-BOLON-BLK)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={handleBarcodeSubmit}
                size="large"
                style={{ borderRadius: 8, fontSize: 14 }}
              />
              <Button
                type="primary" size="large" icon={<PlusOutlined />} onClick={handleBarcodeSubmit}
                style={{ background: '#086288', borderColor: '#086288', borderRadius: 8, padding: '0 24px', fontWeight: 700 }}
              >
                Thêm Vào Đơn
              </Button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Thêm nhanh mẫu:</span>
              {quickProducts.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => handleAddProduct(p)}
                  style={{
                    border: '1px solid #4D8DBA', background: '#ffffff', color: '#086288',
                    padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FFEFC4'; e.currentTarget.style.borderColor = '#086288'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#4D8DBA'; }}
                >
                  <PlusOutlined style={{ fontSize: 10, color: '#086288' }} />
                  {p.name}
                </button>
              ))}
            </div>

            <Table
              dataSource={cartItems} rowKey="id" pagination={false} bordered
              style={{ borderRadius: 8, overflow: 'hidden' }}
              columns={[
                {
                  title: 'Mã SKU', dataIndex: 'sku', width: 150,
                  render: (val) => <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, borderRadius: 4 }}>{val}</Tag>
                },
                {
                  title: 'Tên Sản Phẩm / Dịch Vụ', dataIndex: 'name',
                  render: (val, r) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{val}</div>
                      {r.category && <span style={{ fontSize: 11, color: '#4D8DBA', fontWeight: 500 }}>Phân loại: {r.category}</span>}
                    </div>
                  )
                },
                {
                  title: 'Đơn Giá', dataIndex: 'price', width: 140, align: 'right',
                  render: (val) => <span style={{ fontWeight: 600, color: '#334155' }}>{val.toLocaleString()} ₫</span>
                },
                {
                  title: 'Số Lượng', dataIndex: 'qty', width: 120, align: 'center',
                  render: (val, record) => (
                    <InputNumber
                      min={1} max={99} value={val} style={{ width: 68, borderRadius: 6 }}
                      onChange={(newQty) => setCartItems(cartItems.map(item => item.id === record.id ? { ...item, qty: newQty || 1 } : item))}
                    />
                  )
                },
                {
                  title: 'Thành Tiền', width: 150, align: 'right',
                  render: (_, record) => <span style={{ fontWeight: 800, color: '#086288', fontSize: 14 }}>{(record.price * record.qty).toLocaleString()} ₫</span>
                },
                {
                  title: '', width: 50, align: 'center',
                  render: (_, record) => (
                    <Tooltip title="Xóa khỏi đơn">
                      <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setCartItems(cartItems.filter(i => i.id !== record.id))} />
                    </Tooltip>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            title={
              <Space>
                <CreditCardOutlined style={{ color: '#086288', fontSize: 20 }} />
                <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>Thanh Toán & Hóa Đơn</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
          >
            <Form layout="vertical">
              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Số điện thoại khách hàng</span>} style={{ marginBottom: 12 }}>
                <Input prefix={<UserOutlined style={{ color: '#4D8DBA' }} />} placeholder="Nhập SĐT khách hàng..." value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Họ và tên khách hàng</span>} style={{ marginBottom: 12 }}>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nhập tên khách..." size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Mã giảm giá / Voucher</span>} style={{ marginBottom: 16 }}>
                <Input.Search placeholder="Nhập mã KM (VD: TET2026, VIP10)..." enterButton={<span style={{ fontWeight: 600 }}>Áp dụng</span>} size="large" style={{ borderRadius: 8 }} />
              </Form.Item>

              <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>Tạm tính tiền hàng:</Text>
                  <Text strong style={{ fontSize: 14 }}>{totalAmount.toLocaleString()} ₫</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>Ưu đãi giảm giá:</Text>
                  <Text style={{ color: '#086288', fontWeight: 700, fontSize: 14 }}>-0 ₫</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>Thuế VAT (đã bao gồm):</Text>
                  <Text style={{ color: '#64748b', fontSize: 13 }}>8%</Text>
                </div>
                <Divider style={{ margin: '12px 0', borderColor: '#e2e8f0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 16, color: '#0f172a' }}>Tổng Tiền Thanh Toán:</Text>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#086288', lineHeight: 1.2 }}>
                    {totalAmount.toLocaleString()} ₫
                  </div>
                </div>
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Button
                  type="primary" size="large" icon={<QrcodeOutlined style={{ fontSize: 18 }} />} block
                  style={{ background: '#086288', borderColor: '#086288', height: 50, fontSize: 15, fontWeight: 700, borderRadius: 8 }}
                  onClick={() => notification.success({ message: 'Thanh toán thành công!', description: `Đã thu ${totalAmount.toLocaleString()} ₫ cho khách hàng ${customerName}.` })}
                >
                  Xác Nhận Thu Tiền / Quét VietQR
                </Button>
                <Button
                  size="large" icon={<PrinterOutlined />} block
                  style={{ height: 44, borderRadius: 8, borderColor: '#4D8DBA', color: '#086288', fontWeight: 700, background: '#ffffff' }}
                  onClick={() => window.print()}
                >
                  In Hóa Đơn Nhiệt K80
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // ── Optometry Screen ──
  const renderOptometryScreen = () => (
    <Card
      title={
        <Space>
          <EyeOutlined style={{ color: '#086288', fontSize: 22 }} />
          <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>Phòng Khám Khúc Xạ - Phiếu Đo Thị Lực Chuẩn Nhãn Khoa (OD / OS)</span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
    >
      <Alert
        message="Chuẩn hóa theo Tiêu chuẩn Khúc xạ Nhãn khoa Quốc tế"
        description="Lưu riêng biệt thông số Mắt Phải (OD) và Mắt Trái (OS) bao gồm: SPH (Độ cầu), CYL (Độ trụ), AXIS (Trục loạn), ADD (Độ nhìn gần) và PD (Khoảng cách đồng tử) để đồng bộ cho xưởng mài lắp Lab."
        type="info" showIcon
        style={{ marginBottom: 24, background: '#f0f9ff', borderColor: '#97D7FF', borderRadius: 8 }}
      />
      <Form layout="vertical">
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card title={<span style={{ color: '#086288', fontWeight: 800 }}>MẮT PHẢI (OD - Oculus Dexter)</span>} type="inner" style={{ background: '#f0f9ff', borderColor: '#97D7FF', borderRadius: 10 }}>
              <Row gutter={16}>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cầu (SPH)</span>} required><InputNumber step={0.25} defaultValue={-2.50} style={{ width: '100%' }} size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Trụ (CYL)</span>}><InputNumber step={0.25} defaultValue={-0.75} style={{ width: '100%' }} size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Trục Loạn (AXIS)</span>}><InputNumber min={0} max={180} defaultValue={175} style={{ width: '100%' }} size="large" addonAfter="°" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cộng (ADD)</span>}><InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} size="large" /></Form.Item></Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<span style={{ color: '#086288', fontWeight: 800 }}>MẮT TRÁI (OS - Oculus Sinister)</span>} type="inner" style={{ background: '#fffbeb', borderColor: '#FFEFC4', borderRadius: 10 }}>
              <Row gutter={16}>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cầu (SPH)</span>} required><InputNumber step={0.25} defaultValue={-3.00} style={{ width: '100%' }} size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Trụ (CYL)</span>}><InputNumber step={0.25} defaultValue={-0.50} style={{ width: '100%' }} size="large" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Trục Loạn (AXIS)</span>}><InputNumber min={0} max={180} defaultValue={180} style={{ width: '100%' }} size="large" addonAfter="°" /></Form.Item></Col>
                <Col span={12}><Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cộng (ADD)</span>}><InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} size="large" /></Form.Item></Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginTop: 20 }}>
          <Col xs={24} md={8}>
            <Form.Item label={<span style={{ fontWeight: 600 }}>Khoảng cách đồng tử (PD)</span>} required>
              <InputNumber step={0.5} defaultValue={62.5} style={{ width: '100%' }} size="large" addonAfter="mm" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item label={<span style={{ fontWeight: 600 }}>Chỉ định & Lời khuyên của Kỹ thuật viên</span>}>
              <Input defaultValue="Mắt điều tiết nhiều, ưu tiên tròng Chemi BlueCut 1.60 hoặc Essilor Crizal để lọc ánh sáng xanh máy tính." size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Space size="middle" style={{ marginTop: 12 }}>
          <Button
            type="primary" size="large" icon={<CheckCircleOutlined />}
            style={{ background: '#086288', borderColor: '#086288', borderRadius: 8, height: 46, fontWeight: 700 }}
            onClick={() => notification.success({ message: 'Đã lưu đơn khám thị lực', description: 'Đã lưu thông số Prescription vào cơ sở dữ liệu db_lab.' })}
          >
            Lưu Phiếu Đo Mắt (Tạo Prescription)
          </Button>
          <Button size="large" icon={<PrinterOutlined />} style={{ borderRadius: 8, height: 46, borderColor: '#4D8DBA', color: '#086288', fontWeight: 600 }} onClick={() => window.print()}>
            In Phiếu Khám Khúc Xạ A5
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // ── Lab Screen ──
  const renderLabScreen = () => (
    <Card
      title={
        <Space>
          <ToolOutlined style={{ color: '#086288', fontSize: 22 }} />
          <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>Xưởng Gia Công Mài Lắp Kính & Kiểm Định Chất Lượng (QC)</span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
    >
      <Table
        dataSource={labJobs} rowKey="id" bordered
        columns={[
          { title: 'Mã Lệnh Lab', dataIndex: 'id', width: 170, render: (val) => <strong style={{ color: '#086288' }}>{val}</strong> },
          { title: 'Mã Đơn Hàng', dataIndex: 'orderId', width: 160 },
          { title: 'Khách Hàng', dataIndex: 'customer', width: 170 },
          {
            title: 'Gọng & Tròng Kính Được Chỉ Định',
            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.frame}</div>
                <Text style={{ color: '#4D8DBA', fontWeight: 500 }}>{r.lens}</Text>
              </div>
            )
          },
          {
            title: 'Thông Số Cắt Mài (Độ khúc xạ)', dataIndex: 'prescription',
            render: (val) => <Tag style={{ background: '#f0f9ff', borderColor: '#97D7FF', color: '#086288', fontWeight: 600 }}>{val}</Tag>
          },
          {
            title: 'Trạng Thái', dataIndex: 'status', width: 190,
            render: (st) => {
              if (st === 'IN_PROGRESS') return <Tag color="processing" style={{ fontWeight: 600 }}>Đang mài tròng</Tag>;
              if (st === 'WAITING_PROCESS') return <Tag style={{ background: '#FFEFC4', color: '#086288', border: '1px solid #FFEFC4', fontWeight: 600 }}>Chờ xử lý</Tag>;
              return <Tag color="success" style={{ fontWeight: 600 }}>Đạt QC - Sẵn sàng giao</Tag>;
            }
          },
          {
            title: 'Thao tác QC', width: 170, align: 'center',
            render: (_, r) => (
              <Button
                size="middle" type="primary"
                style={{ background: '#086288', borderColor: '#086288', borderRadius: 6, fontWeight: 600 }}
                onClick={() => {
                  setLabJobs(labJobs.map(j => j.id === r.id ? { ...j, status: 'READY_FOR_DELIVERY' } : j));
                  notification.success({ message: 'Xác nhận kiểm định QC đạt', description: 'Kính đã được kiểm tra chất lượng và sẵn sàng bàn giao khách!' });
                }}
              >
                Xác Nhận Đạt QC
              </Button>
            )
          }
        ]}
      />
    </Card>
  );

  // ── Dashboard Screen ──
  const renderDashboardScreen = () => (
    <div>
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: '#fff', borderLeft: '4px solid #086288', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Doanh Thu Ca POS" value={14250000} precision={0} suffix="₫" valueStyle={{ color: '#086288', fontWeight: 800 }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: '#fff', borderLeft: '4px solid #4D8DBA', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Đơn Hàng Đã Bán" value={12} suffix="đơn" valueStyle={{ color: '#4D8DBA', fontWeight: 800 }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: '#fff', borderLeft: '4px solid #97D7FF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Lượt Đo Mắt Khúc Xạ" value={8} suffix="khách" valueStyle={{ color: '#086288', fontWeight: 800 }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: '#fff', borderLeft: '4px solid #FFEFC4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Kính Đang Mài Lab" value={3} suffix="cặp" valueStyle={{ color: '#086288', fontWeight: 800 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>Tồn Kho Khả Dụng - Chi Nhánh Quận 1</span>}
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
      >
        <Table
          dataSource={[
            { key: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Đen', type: 'Gọng kính', price: '3.250.000 ₫', stock: 45 },
            { key: 2, sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', type: 'Gọng kính', price: '1.850.000 ₫', stock: 50 },
            { key: 3, sku: 'LNS-CHEMI-160', name: 'Tròng Kính Chemi U2 BlueCut 1.60', type: 'Tròng thuốc', price: '650.000 ₫', stock: 100 },
            { key: 4, sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Wayfarer Polarized', type: 'Kính râm', price: '4.950.000 ₫', stock: 20 },
          ]}
          columns={[
            { title: 'Mã SKU', dataIndex: 'sku', render: (val) => <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700 }}>{val}</Tag> },
            { title: 'Tên Sản Phẩm', dataIndex: 'name', render: (val) => <strong>{val}</strong> },
            { title: 'Phân Loại', dataIndex: 'type' },
            { title: 'Giá Bán Niêm Yết', dataIndex: 'price', align: 'right' },
            {
              title: 'Tồn Kho Khả Dụng', dataIndex: 'stock', align: 'center',
              render: (val) => <Tag color="success" style={{ fontWeight: 700, padding: '2px 8px' }}>{val} chiếc</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );

  // ─── Loading splash ───────────────────────────────────────────────────────
  if (!sessionChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Spin size="large" tip="Đang kiểm tra phiên đăng nhập..." />
      </div>
    );
  }

  // ─── Not logged in ────────────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // ─── RBAC: determine allowed keys & menu items ────────────────────────────
  const userRoles   = currentUser.roles || [];
  const allowedKeys = getAllowedKeys(userRoles);
  const roleInfo    = getRoleLabel(userRoles);

  const allMenuItems = [
    { key: 'pos',       icon: <ShopOutlined style={{ fontSize: 18 }} />,       label: 'Bán Hàng POS Quầy' },
    { key: 'optometry', icon: <EyeOutlined style={{ fontSize: 18 }} />,         label: 'Phòng Đo Mắt (OD/OS)' },
    { key: 'lab',       icon: <ToolOutlined style={{ fontSize: 18 }} />,        label: 'Xưởng Gia Công Lab' },
    { key: 'dashboard', icon: <AppstoreOutlined style={{ fontSize: 18 }} />,    label: 'Quản Trị & Tồn Kho' },
  ];

  const visibleMenuItems = allMenuItems
    .filter(item => allowedKeys.includes(item.key))
    .map(item => ({
      ...item,
      style: selectedKey === item.key
        ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
        : { color: '#e0f2fe', margin: '4px 0' }
    }));

  const isAllowed = allowedKeys.includes(selectedKey);

  const screenTitles = {
    pos:        'Hệ Thống Bán Lẻ Tại Quầy (POS Terminal)',
    optometry:  'Khám Khúc Xạ & Đơn Kính Thuốc Chuẩn Nhãn Khoa',
    lab:        'Quy Trình Gia Công Kính Xưởng Lab & QC',
    dashboard:  'Tổng Quan Kinh Doanh & Tồn Kho Chi Nhánh',
  };

  // ─── Main layout (logged in) ──────────────────────────────────────────────
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#086288',
          colorLink: '#4D8DBA',
          colorSuccess: '#086288',
          borderRadius: 8,
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', width: '100vw', background: '#f8fafc' }}>
        {/* Sidebar */}
        <Sider width={260} style={{ background: '#086288', boxShadow: '2px 0 10px rgba(0,0,0,0.05)' }}>
          <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 24px', gap: 12, borderBottom: '1px solid rgba(151, 215, 255, 0.15)' }}>
            <div style={{ background: '#FFEFC4', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EyeOutlined style={{ fontSize: 20, color: '#086288' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: 0.5 }}>GlassStore</div>
              <div style={{ fontSize: 10, color: '#97D7FF', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>Internal Portal</div>
            </div>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ background: 'transparent', borderRight: 0, padding: '16px 12px' }}
            items={visibleMenuItems}
          />

          {/* User info in sidebar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px', borderTop: '1px solid rgba(151, 215, 255, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFEFC4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserOutlined style={{ color: '#086288', fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.fullName || currentUser.email}
                </div>
                <div style={{ fontSize: 10, color: '#97D7FF', fontWeight: 600 }}>{roleInfo.label}</div>
              </div>
              <Tooltip title="Đăng xuất">
                <button
                  onClick={handleLogout}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#97D7FF', padding: 4, borderRadius: 6, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#97D7FF'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <LogoutOutlined style={{ fontSize: 16 }} />
                </button>
              </Tooltip>
            </div>
          </div>
        </Sider>

        <Layout style={{ background: '#f8fafc', flex: 1 }}>
          <Header style={{ background: '#ffffff', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', height: 68 }}>
            <Title level={4} style={{ margin: 0, color: '#086288', fontWeight: 800 }}>
              {screenTitles[selectedKey] || ''}
            </Title>
            <Space size={16}>
              <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                Chi nhánh Quận 1 (HCM)
              </Tag>
              <Tag style={{ background: roleInfo.color, color: '#ffffff', border: 'none', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                {roleInfo.label}
              </Tag>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '6px 14px', borderRadius: 20, border: '1px solid #97D7FF' }}>
                <UserOutlined style={{ color: '#086288', fontSize: 14 }} />
                <Text strong style={{ color: '#086288', fontSize: 13 }}>{currentUser.fullName || currentUser.email}</Text>
              </div>
              <Button
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ borderColor: '#dc2626', color: '#dc2626', borderRadius: 8, fontWeight: 600 }}
              >
                Đăng xuất
              </Button>
            </Space>
          </Header>

          <Content style={{ padding: '24px 32px', minHeight: 'calc(100vh - 68px)', boxSizing: 'border-box' }}>
            {!isAllowed ? (
              <ForbiddenCard />
            ) : (
              <>
                {selectedKey === 'pos'       && renderPosScreen()}
                {selectedKey === 'optometry' && renderOptometryScreen()}
                {selectedKey === 'lab'       && renderLabScreen()}
                {selectedKey === 'dashboard' && renderDashboardScreen()}
              </>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
