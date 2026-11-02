import React, { useState } from 'react';
import {
  ConfigProvider, Layout, Menu, Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col,
  Statistic, Space, notification, Typography, Divider, Alert, Tooltip
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
  LogoutOutlined
} from '@ant-design/icons';
import AuthPage from './component/auth/AuthPage';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedKey, setSelectedKey] = useState('pos');
  const [cartItems, setCartItems] = useState([
    { id: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Mắt Vuông - Đen', category: 'Gọng Kính', price: 3250000, qty: 1 },
    { id: 2, sku: 'LNS-CHEMI-160', name: 'Cặp Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000, qty: 1 }
  ]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [customerName, setCustomerName] = useState('Phạm Khách Hàng');

  // Sample quick products to add easily
  const quickProducts = [
    { sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium - Đen', category: 'Gọng Kính', price: 3250000 },
    { sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', category: 'Gọng Kính', price: 1850000 },
    { sku: 'LNS-CHEMI-160', name: 'Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000 },
    { sku: 'LNS-ESSI-GEN8', name: 'Tròng Đổi Màu Essilor Gen 8', category: 'Tròng Kính', price: 3380000 },
    { sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Polarized', category: 'Kính Râm', price: 4950000 }
  ];

  // Sample Lab Jobs
  const [labJobs, setLabJobs] = useState([
    {
      id: 'LAB-20261030-01',
      orderId: 'ORD-20261030-001',
      customer: 'Phạm Khách Hàng',
      frame: 'Gọng Bolon Titanium (FRM-BOLON-BLK)',
      lens: 'Tròng Chemi U2 1.60',
      prescription: 'OD: -2.50 (-0.75 x 175°) | OS: -3.00 (-0.50 x 180°)',
      status: 'IN_PROGRESS',
      technician: 'Lê Kỹ Thuật'
    },
    {
      id: 'LAB-20261030-02',
      orderId: 'ORD-20261030-002',
      customer: 'Trần Văn Nam',
      frame: 'Gọng Gentle Monster TR90 (FRM-GM-BLK)',
      lens: 'Tròng Essilor Transitions Gen 8',
      prescription: 'OD: -1.75 | OS: -2.00',
      status: 'WAITING_PROCESS',
      technician: 'Chưa phân công'
    }
  ]);

  const handleAddProduct = (itemToAdd) => {
    const existingIndex = cartItems.findIndex(i => i.sku === itemToAdd.sku);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].qty += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, { ...itemToAdd, id: Date.now(), qty: 1 }]);
    }
    notification.success({
      message: 'Đã thêm sản phẩm',
      description: `Đã đưa [${itemToAdd.name}] vào đơn hàng.`
    });
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

  // Màn hình 1: Bán Hàng POS Quầy
  const renderPosScreen = () => (
    <div style={{ width: '100%' }}>
      <Row gutter={[24, 24]}>
        {/* Left Column: Product Table & Barcode */}
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
            {/* Barcode input row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Input
                prefix={<BarcodeOutlined style={{ color: '#4D8DBA', fontSize: 18 }} />}
                placeholder="Quét mã vạch Barcode hoặc nhập SKU (VD: FRM-BOLON-BLK, LNS-CHEMI-160)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={handleBarcodeSubmit}
                size="large"
                style={{ borderRadius: 8, fontSize: 14 }}
              />
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleBarcodeSubmit}
                style={{
                  background: '#086288',
                  borderColor: '#086288',
                  borderRadius: 8,
                  padding: '0 24px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(8, 98, 136, 0.25)'
                }}
              >
                Thêm Vào Đơn
              </Button>
            </div>

            {/* Quick add product pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Thêm nhanh mẫu:</span>
              {quickProducts.map((p) => (
                <button
                  key={p.sku}
                  onClick={() => handleAddProduct(p)}
                  style={{
                    border: '1px solid #4D8DBA',
                    background: '#ffffff',
                    color: '#086288',
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFEFC4';
                    e.currentTarget.style.borderColor = '#086288';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#4D8DBA';
                  }}
                >
                  <PlusOutlined style={{ fontSize: 10, color: '#086288' }} />
                  {p.name}
                </button>
              ))}
            </div>

            {/* Cart Table */}
            <Table
              dataSource={cartItems}
              rowKey="id"
              pagination={false}
              bordered
              style={{ borderRadius: 8, overflow: 'hidden' }}
              columns={[
                {
                  title: 'Mã SKU',
                  dataIndex: 'sku',
                  width: 150,
                  render: (val) => (
                    <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, borderRadius: 4 }}>
                      {val}
                    </Tag>
                  )
                },
                {
                  title: 'Tên Sản Phẩm / Dịch Vụ',
                  dataIndex: 'name',
                  render: (val, r) => (
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{val}</div>
                      {r.category && (
                        <span style={{ fontSize: 11, color: '#4D8DBA', fontWeight: 500 }}>
                          Phân loại: {r.category}
                        </span>
                      )}
                    </div>
                  )
                },
                {
                  title: 'Đơn Giá',
                  dataIndex: 'price',
                  width: 140,
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
                  width: 120,
                  align: 'center',
                  render: (val, record) => (
                    <InputNumber
                      min={1}
                      max={99}
                      value={val}
                      style={{ width: 68, borderRadius: 6 }}
                      onChange={(newQty) => {
                        setCartItems(cartItems.map(item => item.id === record.id ? { ...item, qty: newQty || 1 } : item));
                      }}
                    />
                  )
                },
                {
                  title: 'Thành Tiền',
                  width: 150,
                  align: 'right',
                  render: (_, record) => (
                    <span style={{ fontWeight: 800, color: '#086288', fontSize: 14 }}>
                      {(record.price * record.qty).toLocaleString()} ₫
                    </span>
                  )
                },
                {
                  title: '',
                  width: 50,
                  align: 'center',
                  render: (_, record) => (
                    <Tooltip title="Xóa khỏi đơn">
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => setCartItems(cartItems.filter(i => i.id !== record.id))}
                      />
                    </Tooltip>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* Right Column: Checkout & Bill Payment */}
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
            <Form layout="vertical">
              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Số điện thoại khách hàng</span>} style={{ marginBottom: 12 }}>
                <Input
                  prefix={<UserOutlined style={{ color: '#4D8DBA' }} />}
                  placeholder="Nhập SĐT khách hàng..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Họ và tên khách hàng</span>} style={{ marginBottom: 12 }}>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập tên khách..."
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 700, color: '#1e293b' }}>Mã giảm giá / Voucher</span>} style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="Nhập mã KM (VD: TET2026, VIP10)..."
                  enterButton={<span style={{ fontWeight: 600 }}>Áp dụng</span>}
                  size="large"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Price Breakdown Box */}
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
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#086288', lineHeight: 1.2 }}>
                      {totalAmount.toLocaleString()} ₫
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<QrcodeOutlined style={{ fontSize: 18 }} />}
                  block
                  style={{
                    background: '#086288',
                    borderColor: '#086288',
                    height: 50,
                    fontSize: 15,
                    fontWeight: 700,
                    borderRadius: 8,
                    boxShadow: '0 4px 14px rgba(8, 98, 136, 0.3)'
                  }}
                  onClick={() => {
                    notification.success({
                      message: 'Thanh toán thành công!',
                      description: `Đã thu ${totalAmount.toLocaleString()} ₫ cho khách hàng ${customerName}. Đơn hàng đã ghi nhận vào db_order.`
                    });
                  }}
                >
                  Xác Nhận Thu Tiền / Quét VietQR
                </Button>
                <Button
                  size="large"
                  icon={<PrinterOutlined />}
                  block
                  style={{
                    height: 44,
                    borderRadius: 8,
                    borderColor: '#4D8DBA',
                    color: '#086288',
                    fontWeight: 700,
                    background: '#ffffff'
                  }}
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

  // Màn hình 2: Phòng Đo Mắt Khúc Xạ (Optometry)
  const renderOptometryScreen = () => (
    <Card
      title={
        <Space>
          <EyeOutlined style={{ color: '#086288', fontSize: 22 }} />
          <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>
            Phòng Khám Khúc Xạ - Phiếu Đo Thị Lực Chuẩn Nhãn Khoa (OD / OS)
          </span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
    >
      <Alert
        message="Chuẩn hóa theo Tiêu chuẩn Khúc xạ Nhãn khoa Quốc tế"
        description="Lưu riêng biệt thông số Mắt Phải (OD) và Mắt Trái (OS) bao gồm: SPH (Độ cầu), CYL (Độ trụ), AXIS (Trục loạn), ADD (Độ nhìn gần) và PD (Khoảng cách đồng tử) để đồng bộ cho xưởng mài lắp Lab."
        type="info"
        showIcon
        style={{ marginBottom: 24, background: '#f0f9ff', borderColor: '#97D7FF', borderRadius: 8 }}
      />
      <Form layout="vertical">
        <Row gutter={24}>
          {/* Mắt Phải */}
          <Col xs={24} md={12}>
            <Card
              title={<span style={{ color: '#086288', fontWeight: 800 }}>MẮT PHẢI (OD - Oculus Dexter)</span>}
              type="inner"
              style={{ background: '#f0f9ff', borderColor: '#97D7FF', borderRadius: 10 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cầu (SPH)</span>} required>
                    <InputNumber step={0.25} defaultValue={-2.50} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Trụ (CYL)</span>}>
                    <InputNumber step={0.25} defaultValue={-0.75} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Trục Loạn (AXIS)</span>}>
                    <InputNumber min={0} max={180} defaultValue={175} style={{ width: '100%' }} size="large" addonAfter="°" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cộng (ADD)</span>}>
                    <InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Mắt Trái */}
          <Col xs={24} md={12}>
            <Card
              title={<span style={{ color: '#086288', fontWeight: 800 }}>MẮT TRÁI (OS - Oculus Sinister)</span>}
              type="inner"
              style={{ background: '#fffbeb', borderColor: '#FFEFC4', borderRadius: 10 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cầu (SPH)</span>} required>
                    <InputNumber step={0.25} defaultValue={-3.00} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Trụ (CYL)</span>}>
                    <InputNumber step={0.25} defaultValue={-0.50} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Trục Loạn (AXIS)</span>}>
                    <InputNumber min={0} max={180} defaultValue={180} style={{ width: '100%' }} size="large" addonAfter="°" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<span style={{ fontWeight: 600 }}>Độ Cộng (ADD)</span>}>
                    <InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} size="large" />
                  </Form.Item>
                </Col>
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

        <Space orientation="horizontal" size="middle" style={{ marginTop: 12 }}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            style={{ background: '#086288', borderColor: '#086288', borderRadius: 8, height: 46, fontWeight: 700 }}
            onClick={() => {
              notification.success({
                message: 'Đã lưu đơn khám thị lực',
                description: 'Đã lưu thông số Prescription vào cơ sở dữ liệu db_lab.'
              });
            }}
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

  // Màn hình 3: Xưởng Gia Công Lab & QC
  const renderLabScreen = () => (
    <Card
      title={
        <Space>
          <ToolOutlined style={{ color: '#086288', fontSize: 22 }} />
          <span style={{ color: '#086288', fontWeight: 800, fontSize: 16 }}>
            Xưởng Gia Công Mài Lắp Kính & Kiểm Định Chất Lượng (QC)
          </span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(8, 98, 136, 0.08)' }}
    >
      <Table
        dataSource={labJobs}
        rowKey="id"
        bordered
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
            title: 'Thông Số Cắt Mài (Độ khúc xạ)',
            dataIndex: 'prescription',
            render: (val) => <Tag style={{ background: '#f0f9ff', borderColor: '#97D7FF', color: '#086288', fontWeight: 600 }}>{val}</Tag>
          },
          {
            title: 'Trạng Thái',
            dataIndex: 'status',
            width: 190,
            render: (st) => {
              if (st === 'IN_PROGRESS') return <Tag color="processing" style={{ fontWeight: 600 }}>Đang mài tròng</Tag>;
              if (st === 'WAITING_PROCESS') return <Tag style={{ background: '#FFEFC4', color: '#086288', border: '1px solid #FFEFC4', fontWeight: 600 }}>Chờ xử lý</Tag>;
              return <Tag color="success" style={{ fontWeight: 600 }}>Đạt QC - Sẵn sàng giao</Tag>;
            }
          },
          {
            title: 'Thao tác QC',
            width: 170,
            align: 'center',
            render: (_, r) => (
              <Button
                size="middle"
                type="primary"
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

  // Màn hình 4: Quản Trị & Kho Hàng
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
              title: 'Tồn Kho Khả Dụng',
              dataIndex: 'stock',
              align: 'center',
              render: (val) => <Tag color="success" style={{ fontWeight: 700, padding: '2px 8px' }}>{val} chiếc</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );

  if (!isAuthenticated) {
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
        <AuthPage
          onLoginSuccess={(userData) => {
            setIsAuthenticated(true);
            setCurrentUser(userData);
            if (userData && userData.initialKey) {
              setSelectedKey(userData.initialKey);
            }
          }}
        />
      </ConfigProvider>
    );
  }

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
        {/* Sidebar với Tone màu chính #086288 */}
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
            items={[
              {
                key: 'pos',
                icon: <ShopOutlined style={{ fontSize: 18 }} />,
                label: 'Bán Hàng POS Quầy',
                style: selectedKey === 'pos'
                  ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
                  : { color: '#e0f2fe', margin: '4px 0' }
              },
              {
                key: 'optometry',
                icon: <EyeOutlined style={{ fontSize: 18 }} />,
                label: 'Phòng Đo Mắt (OD/OS)',
                style: selectedKey === 'optometry'
                  ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
                  : { color: '#e0f2fe', margin: '4px 0' }
              },
              {
                key: 'lab',
                icon: <ToolOutlined style={{ fontSize: 18 }} />,
                label: 'Xưởng Gia Công Lab',
                style: selectedKey === 'lab'
                  ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
                  : { color: '#e0f2fe', margin: '4px 0' }
              },
              {
                key: 'dashboard',
                icon: <AppstoreOutlined style={{ fontSize: 18 }} />,
                label: 'Quản Trị & Tồn Kho',
                style: selectedKey === 'dashboard'
                  ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
                  : { color: '#e0f2fe', margin: '4px 0' }
              },
            ]}
          />
        </Sider>

        <Layout style={{ background: '#f8fafc', flex: 1 }}>
          <Header style={{ background: '#ffffff', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', height: 68 }}>
            <Title level={4} style={{ margin: 0, color: '#086288', fontWeight: 800 }}>
              {selectedKey === 'pos' && 'Hệ Thống Bán Lẻ Tại Quầy (POS Terminal)'}
              {selectedKey === 'optometry' && 'Khám Khúc Xạ & Đơn Kính Thuốc Chuẩn Nhãn Khoa'}
              {selectedKey === 'lab' && 'Quy Trình Gia Công Kính Xưởng Lab & QC'}
              {selectedKey === 'dashboard' && 'Tổng Quan Kinh Doanh & Tồn Kho Chi Nhánh'}
            </Title>
            <Space size={14}>
              <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                {currentUser?.branchName || 'Chi nhánh Quận 1 (HCM)'}
              </Tag>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '6px 14px', borderRadius: 20, border: '1px solid #97D7FF' }}>
                <UserOutlined style={{ color: '#086288', fontSize: 14 }} />
                <Text strong style={{ color: '#086288', fontSize: 13 }}>
                  {currentUser?.staffName || 'Nguyễn Bán Hàng (Thu Ngân)'}
                </Text>
              </div>
              <Button
                type="default"
                icon={<LogoutOutlined />}
                onClick={() => {
                  setIsAuthenticated(false);
                  notification.info({
                    message: 'Đã kết thúc ca làm việc',
                    description: 'Hệ thống đã khóa phiên làm việc an toàn.'
                  });
                }}
                style={{
                  borderRadius: 20,
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  fontWeight: 600
                }}
              >
                Đăng Xuất Ca
              </Button>
            </Space>
          </Header>

          <Content style={{ padding: '24px 32px', minHeight: 'calc(100vh - 68px)', boxSizing: 'border-box' }}>
            {selectedKey === 'pos' && renderPosScreen()}
            {selectedKey === 'optometry' && renderOptometryScreen()}
            {selectedKey === 'lab' && renderLabScreen()}
            {selectedKey === 'dashboard' && renderDashboardScreen()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
