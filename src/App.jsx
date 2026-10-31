import React, { useState } from 'react';
import {
  ConfigProvider, Layout, Menu, Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col,
  Statistic, Space, notification, Badge, Typography, Divider, Alert
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
  CreditCardOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [selectedKey, setSelectedKey] = useState('pos');
  const [cartItems, setCartItems] = useState([
    { id: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Mắt Vuông - Đen', price: 3250000, qty: 1 },
    { id: 2, sku: 'LNS-CHEMI-160', name: 'Cặp Tròng Chemi U2 BlueCut 1.60', price: 650000, qty: 1 }
  ]);
  const [barcodeInput, setBarcodeInput] = useState('');

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

  const handleAddBarcode = () => {
    if (!barcodeInput.trim()) return;
    const newItem = {
      id: Date.now(),
      sku: barcodeInput.trim().toUpperCase(),
      name: `Sản phẩm mã ${barcodeInput.trim().toUpperCase()}`,
      price: 1850000,
      qty: 1
    };
    setCartItems([...cartItems, newItem]);
    setBarcodeInput('');
    notification.success({
      message: 'Đã thêm sản phẩm',
      description: `Đã đưa mã SKU [${newItem.sku}] vào đơn hàng quầy.`
    });
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Màn hình POS Bán lẻ tại quầy
  const renderPosScreen = () => (
    <div>
      <Row gutter={24}>
        <Col xs={24} lg={15}>
          <Card
            title={
              <Space>
                <BarcodeOutlined style={{ color: '#086288', fontSize: 18 }} />
                <span style={{ color: '#086288', fontWeight: 700 }}>Danh Sách Sản Phẩm Trong Đơn</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(8, 98, 136, 0.06)' }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <Input
                prefix={<BarcodeOutlined style={{ color: '#4D8DBA' }} />}
                placeholder="Quét mã vạch Barcode hoặc nhập SKU (VD: FRM-BOLON-SIL)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={handleAddBarcode}
                size="large"
                style={{ borderRadius: 8 }}
              />
              <Button
                type="primary"
                size="large"
                onClick={handleAddBarcode}
                style={{ background: '#086288', borderColor: '#086288', borderRadius: 8, padding: '0 24px', fontWeight: 600 }}
              >
                Thêm Vào Đơn
              </Button>
            </div>

            <Table
              dataSource={cartItems}
              rowKey="id"
              pagination={false}
              bordered
              columns={[
                {
                  title: 'Mã SKU',
                  dataIndex: 'sku',
                  width: 140,
                  render: (val) => (
                    <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 600 }}>
                      {val}
                    </Tag>
                  )
                },
                {
                  title: 'Tên Sản Phẩm',
                  dataIndex: 'name',
                  render: (val) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{val}</span>
                },
                {
                  title: 'Đơn Giá',
                  dataIndex: 'price',
                  width: 120,
                  align: 'right',
                  render: (val) => `${val.toLocaleString()} ₫`
                },
                {
                  title: 'Số Lượng',
                  dataIndex: 'qty',
                  width: 100,
                  align: 'center',
                  render: (val, record) => (
                    <InputNumber
                      min={1}
                      value={val}
                      style={{ width: 60 }}
                      onChange={(newQty) => {
                        setCartItems(cartItems.map(item => item.id === record.id ? { ...item, qty: newQty || 1 } : item));
                      }}
                    />
                  )
                },
                {
                  title: 'Thành Tiền',
                  width: 130,
                  align: 'right',
                  render: (_, record) => (
                    <span style={{ fontWeight: 700, color: '#086288' }}>
                      {(record.price * record.qty).toLocaleString()} ₫
                    </span>
                  )
                },
                {
                  title: '',
                  width: 60,
                  align: 'center',
                  render: (_, record) => (
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => setCartItems(cartItems.filter(i => i.id !== record.id))}
                    />
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title={
              <Space>
                <CreditCardOutlined style={{ color: '#086288', fontSize: 18 }} />
                <span style={{ color: '#086288', fontWeight: 700 }}>Thông Tin Thanh Toán & Xuất Bill</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(8, 98, 136, 0.06)' }}
          >
            <Form layout="vertical">
              <Form.Item label={<span style={{ fontWeight: 600 }}>Khách hàng (SĐT)</span>} style={{ marginBottom: 12 }}>
                <Input prefix={<UserOutlined style={{ color: '#4D8DBA' }} />} placeholder="Nhập SĐT khách hàng..." defaultValue="0987654321" size="middle" />
              </Form.Item>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Họ và tên</span>} style={{ marginBottom: 12 }}>
                <Input defaultValue="Phạm Khách Hàng" size="middle" />
              </Form.Item>
              <Form.Item label={<span style={{ fontWeight: 600 }}>Mã Giảm Giá / Voucher</span>} style={{ marginBottom: 16 }}>
                <Input.Search placeholder="Nhập mã ưu đãi..." enterButton="Áp dụng" size="middle" />
              </Form.Item>

              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Tạm tính tiền hàng:</Text>
                  <Text strong>{totalAmount.toLocaleString()} ₫</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Ưu đãi giảm giá:</Text>
                  <Text style={{ color: '#086288', fontWeight: 600 }}>-0 ₫</Text>
                </div>
                <Divider style={{ margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 16, color: '#1e293b' }}>Tổng Phải Thu:</Text>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#086288' }}>
                    {totalAmount.toLocaleString()} ₫
                  </span>
                </div>
              </div>

              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Button
                  type="primary"
                  size="large"
                  icon={<DollarOutlined />}
                  block
                  style={{
                    background: '#086288',
                    borderColor: '#086288',
                    height: 48,
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(8, 98, 136, 0.25)'
                  }}
                  onClick={() => {
                    notification.success({
                      message: 'Thanh toán thành công',
                      description: 'Đã hoàn tất thanh toán và cập nhật kho tự động!'
                    });
                  }}
                >
                  Xác Nhận Thu Tiền / Quét VietQR
                </Button>
                <Button
                  size="large"
                  icon={<PrinterOutlined />}
                  block
                  style={{ height: 42, borderRadius: 8, borderColor: '#4D8DBA', color: '#086288', fontWeight: 600 }}
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

  // Màn hình Phòng Đo Mắt Khúc Xạ (Optometry)
  const renderOptometryScreen = () => (
    <Card
      title={
        <Space>
          <EyeOutlined style={{ color: '#086288', fontSize: 20 }} />
          <span style={{ color: '#086288', fontWeight: 700 }}>Phòng Khám Khúc Xạ - Phiếu Đo Thị Lực Chuẩn (OD/OS)</span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(8, 98, 136, 0.06)' }}
    >
      <Alert
        message="Chuẩn hóa theo ISO khúc xạ mắt"
        description="Lưu riêng biệt thông số Mắt phải (OD) và Mắt trái (OS) bao gồm Độ cầu (SPH), Độ trụ (CYL), Trục loạn (AXIS) và Khoảng cách đồng tử (PD)."
        type="info"
        showIcon
        style={{ marginBottom: 24, background: '#f0f9ff', borderColor: '#97D7FF' }}
      />
      <Form layout="vertical">
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card
              title={<span style={{ color: '#086288', fontWeight: 700 }}>MẮT PHẢI (OD - Oculus Dexter)</span>}
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

          <Col xs={24} md={12}>
            <Card
              title={<span style={{ color: '#086288', fontWeight: 700 }}>MẮT TRÁI (OS - Oculus Sinister)</span>}
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
            <Form.Item label={<span style={{ fontWeight: 600 }}>Chỉ định & Ghi chú chuyên môn</span>}>
              <Input defaultValue="Mắt điều tiết nhiều, khuyến nghị dùng tròng Chemi BlueCut 1.60 giảm mỏi mắt." size="large" />
            </Form.Item>
          </Col>
        </Row>

        <Space orientation="horizontal" size="middle" style={{ marginTop: 12 }}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            style={{ background: '#086288', borderColor: '#086288', borderRadius: 8, height: 46, fontWeight: 600 }}
            onClick={() => {
              notification.success({
                message: 'Đã lưu phiếu khám thị lực',
                description: 'Đã lưu đơn kính thành công vào db_lab!'
              });
            }}
          >
            Lưu Phiếu Đo Mắt (Tạo Prescription)
          </Button>
          <Button size="large" icon={<PrinterOutlined />} style={{ borderRadius: 8, height: 46, borderColor: '#4D8DBA', color: '#086288' }} onClick={() => window.print()}>
            In Phiếu Đo Khúc Xạ A5
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // Màn hình Xưởng Mài Lắp Kính Lab
  const renderLabScreen = () => (
    <Card
      title={
        <Space>
          <ToolOutlined style={{ color: '#086288', fontSize: 20 }} />
          <span style={{ color: '#086288', fontWeight: 700 }}>Xưởng Gia Công Mài Lắp Kính & Kiểm Định QC</span>
        </Space>
      }
      bordered={false}
      style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(8, 98, 136, 0.06)' }}
    >
      <Table
        dataSource={labJobs}
        rowKey="id"
        bordered
        columns={[
          { title: 'Mã Lệnh Lab', dataIndex: 'id', width: 160, render: (val) => <strong style={{ color: '#086288' }}>{val}</strong> },
          { title: 'Mã Đơn Hàng', dataIndex: 'orderId', width: 160 },
          { title: 'Khách Hàng', dataIndex: 'customer', width: 160 },
          {
            title: 'Gọng & Tròng Kính',
            render: (_, r) => (
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.frame}</div>
                <Text style={{ color: '#4D8DBA' }}>{r.lens}</Text>
              </div>
            )
          },
          {
            title: 'Thông Số Cắt Mài',
            dataIndex: 'prescription',
            render: (val) => <Tag style={{ background: '#f0f9ff', borderColor: '#97D7FF', color: '#086288' }}>{val}</Tag>
          },
          {
            title: 'Trạng Thái',
            dataIndex: 'status',
            width: 180,
            render: (st) => {
              if (st === 'IN_PROGRESS') return <Tag color="processing">Đang mài tròng</Tag>;
              if (st === 'WAITING_PROCESS') return <Tag style={{ background: '#FFEFC4', color: '#086288', border: '1px solid #FFEFC4' }}>Chờ xử lý</Tag>;
              return <Tag color="success">Đạt QC - Sẵn sàng giao</Tag>;
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

  // Màn hình Quản trị & Tồn Kho
  const renderDashboardScreen = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Doanh Thu Hôm Nay" value={14250000} precision={0} suffix="₫" valueStyle={{ color: '#086288', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Đơn Hàng POS Quầy" value={12} suffix="đơn" valueStyle={{ color: '#4D8DBA', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Lượt Đo Mắt Khúc Xạ" value={8} suffix="lượt" valueStyle={{ color: '#086288', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic title="Kính Đang Mài Lab" value={3} suffix="cặp" valueStyle={{ color: '#e69900', fontWeight: 700 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span style={{ color: '#086288', fontWeight: 700 }}>Tồn Kho Khả Dụng - Chi Nhánh Trung Tâm</span>}
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(8, 98, 136, 0.06)' }}
      >
        <Table
          dataSource={[
            { key: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Đen', type: 'Gọng kính', price: '3.250.000 ₫', stock: 45 },
            { key: 2, sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', type: 'Gọng kính', price: '1.850.000 ₫', stock: 50 },
            { key: 3, sku: 'LNS-CHEMI-160', name: 'Tròng Kính Chemi U2 BlueCut 1.60', type: 'Tròng thuốc', price: '650.000 ₫', stock: 100 },
            { key: 4, sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Wayfarer Polarized', type: 'Kính râm', price: '4.950.000 ₫', stock: 20 },
          ]}
          columns={[
            { title: 'Mã SKU', dataIndex: 'sku', render: (val) => <Tag style={{ background: '#FFEFC4', color: '#086288' }}>{val}</Tag> },
            { title: 'Tên Sản Phẩm', dataIndex: 'name', render: (val) => <strong>{val}</strong> },
            { title: 'Phân Loại', dataIndex: 'type' },
            { title: 'Giá Bán', dataIndex: 'price', align: 'right' },
            {
              title: 'Tồn Kho Khả Dụng',
              dataIndex: 'stock',
              align: 'center',
              render: (val) => <Tag color="green" style={{ fontWeight: 600 }}>{val} chiếc</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );

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
      <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Sidebar với Tone màu #086288 */}
        <Sider width={250} style={{ background: '#086288' }}>
          <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderBottom: '1px solid rgba(151, 215, 255, 0.15)' }}>
            <div style={{ background: '#FFEFC4', padding: 6, borderRadius: 8, display: 'flex' }}>
              <EyeOutlined style={{ fontSize: 20, color: '#086288' }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>GlassStore</div>
              <div style={{ fontSize: 10, color: '#97D7FF', textTransform: 'uppercase', letterSpacing: 1 }}>Internal Portal</div>
            </div>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={({ key }) => setSelectedKey(key)}
            style={{ background: 'transparent', borderRight: 0, padding: '12px 8px' }}
            items={[
              {
                key: 'pos',
                icon: <ShopOutlined style={{ fontSize: 16 }} />,
                label: 'Bán Hàng POS Quầy',
                style: selectedKey === 'pos' ? { background: '#4D8DBA', color: '#fff', borderRadius: 8, fontWeight: 700 } : { color: '#e0f2fe' }
              },
              {
                key: 'optometry',
                icon: <EyeOutlined style={{ fontSize: 16 }} />,
                label: 'Phòng Đo Mắt (OD/OS)',
                style: selectedKey === 'optometry' ? { background: '#4D8DBA', color: '#fff', borderRadius: 8, fontWeight: 700 } : { color: '#e0f2fe' }
              },
              {
                key: 'lab',
                icon: <ToolOutlined style={{ fontSize: 16 }} />,
                label: 'Xưởng Gia Công Lab',
                style: selectedKey === 'lab' ? { background: '#4D8DBA', color: '#fff', borderRadius: 8, fontWeight: 700 } : { color: '#e0f2fe' }
              },
              {
                key: 'dashboard',
                icon: <AppstoreOutlined style={{ fontSize: 16 }} />,
                label: 'Quản Trị & Tồn Kho',
                style: selectedKey === 'dashboard' ? { background: '#4D8DBA', color: '#fff', borderRadius: 8, fontWeight: 700 } : { color: '#e0f2fe' }
              },
            ]}
          />
        </Sider>

        <Layout style={{ background: '#f8fafc' }}>
          <Header style={{ background: '#fff', padding: '0 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', height: 68 }}>
            <Title level={4} style={{ margin: 0, color: '#086288', fontWeight: 800 }}>
              {selectedKey === 'pos' && 'Hệ Thống Bán Lẻ Tại Quầy (POS Terminal)'}
              {selectedKey === 'optometry' && 'Khám Khúc Xạ & Lưu Đơn Kính Thuốc'}
              {selectedKey === 'lab' && 'Quy Trình Gia Công Kính Xưởng Lab & QC'}
              {selectedKey === 'dashboard' && 'Tổng Quan Kinh Doanh & Tồn Kho Chi Nhánh'}
            </Title>
            <Space size={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '6px 14px', borderRadius: 20, border: '1px solid #97D7FF' }}>
                <UserOutlined style={{ color: '#086288', fontSize: 14 }} />
                <Text strong style={{ color: '#086288', fontSize: 13 }}>Nguyễn Bán Hàng (Chi nhánh Quận 1)</Text>
              </div>
            </Space>
          </Header>

          <Content style={{ margin: '24px 28px', minHeight: 280 }}>
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
