import React, { useState } from 'react';
import {
  Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col, Space,
  notification, Typography, Divider, Tooltip
} from 'antd';
import {
  BarcodeOutlined,
  PlusOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  UserOutlined,
  PrinterOutlined,
  QrcodeOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export default function PosPage() {
  const [cartItems, setCartItems] = useState([
    { id: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Mắt Vuông - Đen', category: 'Gọng Kính', price: 3250000, qty: 1 },
    { id: 2, sku: 'LNS-CHEMI-160', name: 'Cặp Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000, qty: 1 }
  ]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0987654321');
  const [customerName, setCustomerName] = useState('Phạm Khách Hàng');

  const quickProducts = [
    { sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium - Đen', category: 'Gọng Kính', price: 3250000 },
    { sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', category: 'Gọng Kính', price: 1850000 },
    { sku: 'LNS-CHEMI-160', name: 'Tròng Chemi U2 BlueCut 1.60', category: 'Tròng Kính', price: 650000 },
    { sku: 'LNS-ESSI-GEN8', name: 'Tròng Đổi Màu Essilor Gen 8', category: 'Tròng Kính', price: 3380000 },
    { sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Polarized', category: 'Kính Râm', price: 4950000 }
  ];

  const handleAddProduct = (itemToAdd) => {
    const existingIndex = cartItems.findIndex((i) => i.sku === itemToAdd.sku);
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
    const found = quickProducts.find((p) => p.sku.toLowerCase() === barcodeInput.trim().toLowerCase());
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

  return (
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
                        setCartItems(cartItems.map((item) => (item.id === record.id ? { ...item, qty: newQty || 1 } : item)));
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
                        onClick={() => setCartItems(cartItems.filter((i) => i.id !== record.id))}
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
}

