import React, { useState } from 'react';
import {
  Layout, Menu, Table, Form, Input, InputNumber, Button, Tag, Card, Row, Col,
  Statistic, Space, Modal, notification, Badge, Typography, Divider, Steps, Alert
} from 'antd';
import {
  ShopOutlined,
  EyeOutlined,
  ToolOutlined,
  AppstoreOutlined,
  PrinterOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BarcodeOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function App() {
  const [selectedKey, setSelectedKey] = useState('pos');
  const [cartItems, setCartItems] = useState([
    { id: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium - Đen', price: 3250000, qty: 1 },
    { id: 2, sku: 'LNS-CHEMI-160', name: 'Cặp Tròng Chemi U2 1.60', price: 650000, qty: 1 }
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
      prescription: 'OD: -2.50 (-0.75 x 175) | OS: -3.00 (-0.50 x 180)',
      status: 'IN_PROGRESS',
      technician: 'Lê Kỹ Thuật'
    },
    {
      id: 'LAB-20261030-02',
      orderId: 'ORD-20261030-002',
      customer: 'Trần Văn Nam',
      frame: 'Gọng Gentle Monster TR90 (FRM-GM-BLK)',
      lens: 'Tròng Essilor Transitions 1.56',
      prescription: 'OD: -1.75 | OS: -2.00',
      status: 'WAITING_PROCESS',
      technician: 'Chưa phân công'
    }
  ]);

  // Quét mã vạch thêm sản phẩm vào POS
  const handleAddBarcode = () => {
    if (!barcodeInput) return;
    const newItem = {
      id: Date.now(),
      sku: barcodeInput.toUpperCase(),
      name: `Sản phẩm mã ${barcodeInput.toUpperCase()}`,
      price: 1850000,
      qty: 1
    };
    setCartItems([...cartItems, newItem]);
    setBarcodeInput('');
    notification.success({
      message: 'Đã quét mã vạch thành công',
      description: `Đã thêm mã ${newItem.sku} vào đơn bán hàng!`
    });
  };

  const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);

  // Render Màn hình POS Bán lẻ tại quầy
  const renderPosScreen = () => (
    <div>
      <Row gutter={20}>
        <Col span={16}>
          <Card title="Quầy Bán Hàng Trực Tiếp (POS)" bordered={false} className="shadow-sm">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <Input
                prefix={<BarcodeOutlined />}
                placeholder="Quét mã Barcode / SKU bằng máy quét USB hoặc nhập tay..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onPressEnter={handleAddBarcode}
                size="large"
              />
              <Button type="primary" size="large" onClick={handleAddBarcode}>
                Thêm sản phẩm
              </Button>
            </div>

            <Table
              dataSource={cartItems}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Mã SKU', dataIndex: 'sku', render: (val) => <Tag color="blue">{val}</Tag> },
                { title: 'Tên Sản Phẩm', dataIndex: 'name' },
                { title: 'Đơn Giá', dataIndex: 'price', render: (val) => `${val.toLocaleString()} ₫` },
                {
                  title: 'Số Lượng',
                  dataIndex: 'qty',
                  render: (val, record) => (
                    <InputNumber
                      min={1}
                      value={val}
                      onChange={(newQty) => {
                        setCartItems(cartItems.map(item => item.id === record.id ? { ...item, qty: newQty } : item));
                      }}
                    />
                  )
                },
                {
                  title: 'Thành Tiền',
                  render: (_, record) => `${(record.price * record.qty).toLocaleString()} ₫`
                },
                {
                  title: 'Thao tác',
                  render: (_, record) => (
                    <Button danger type="link" onClick={() => setCartItems(cartItems.filter(i => i.id !== record.id))}>
                      Xóa
                    </Button>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Thanh Toán & In Hóa Đơn K80" bordered={false} className="shadow-sm">
            <Form layout="vertical">
              <Form.Item label="Số điện thoại khách hàng">
                <Input prefix={<UserOutlined />} placeholder="Nhập SĐT để tích điểm & bảo hành..." defaultValue="0987654321" />
              </Form.Item>
              <Form.Item label="Họ tên khách hàng">
                <Input defaultValue="Phạm Khách Hàng" />
              </Form.Item>
              <Form.Item label="Mã Voucher / Khuyến mãi">
                <Input.Search placeholder="Nhập mã ưu đãi..." enterButton="Áp dụng" />
              </Form.Item>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Tạm tính:</Text>
                <Text strong>{totalAmount.toLocaleString()} ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Giảm giá:</Text>
                <Text type="success">-0 ₫</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
                <Text strong style={{ fontSize: 22, color: '#f5222d' }}>
                  {totalAmount.toLocaleString()} ₫
                </Text>
              </div>

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<DollarOutlined />}
                  block
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => {
                    notification.success({
                      message: 'Thanh toán hoàn tất',
                      description: 'Đã ghi nhận đơn hàng tại quầy POS và trừ tồn kho!'
                    });
                  }}
                >
                  Xác nhận Thanh toán Tiền Mặt / VietQR
                </Button>
                <Button
                  size="large"
                  icon={<PrinterOutlined />}
                  block
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

  // Render Màn hình Phòng Đo Mắt (Optometry)
  const renderOptometryScreen = () => (
    <Card title="Phòng Khám Khúc Xạ - Nhập Phiếu Đo Mắt (SRS FR-EYE)" className="shadow-sm">
      <Alert
        message="Thông số nhãn khoa chuẩn mực"
        description="Đo mắt lưu riêng biệt thông số Mắt phải (OD) và Mắt trái (OS) bao gồm Độ cầu (SPH), Độ trụ (CYL), Trục loạn (AXIS) và Khoảng cách đồng tử (PD)."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Form layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Card title="MẮT PHẢI (OD - Oculus Dexter)" type="inner" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Độ Cầu (SPH - Cận/Viễn)" required>
                    <InputNumber step={0.25} defaultValue={-2.50} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Độ Trụ (CYL - Loạn thị)">
                    <InputNumber step={0.25} defaultValue={-0.75} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Trục Loạn (AXIS - Độ)">
                    <InputNumber min={0} max={180} defaultValue={175} style={{ width: '100%' }} addonAfter="°" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Độ Cộng Thêm (ADD)">
                    <InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="MẮT TRÁI (OS - Oculus Sinister)" type="inner" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Độ Cầu (SPH - Cận/Viễn)" required>
                    <InputNumber step={0.25} defaultValue={-3.00} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Độ Trụ (CYL - Loạn thị)">
                    <InputNumber step={0.25} defaultValue={-0.50} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Trục Loạn (AXIS - Độ)">
                    <InputNumber min={0} max={180} defaultValue={180} style={{ width: '100%' }} addonAfter="°" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Độ Cộng Thêm (ADD)">
                    <InputNumber step={0.25} defaultValue={0.00} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={24} style={{ marginTop: 24 }}>
          <Col span={8}>
            <Form.Item label="Khoảng cách đồng tử (PD)" required>
              <InputNumber step={0.5} defaultValue={62.5} style={{ width: '100%' }} addonAfter="mm" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Ghi chú & Lời khuyên của Bác sĩ / KTV Khúc xạ">
              <Input defaultValue="Khách hàng ngồi máy tính nhiều, tư vấn tròng kính chống ánh sáng xanh Chemi 1.60." />
            </Form.Item>
          </Col>
        </Row>

        <Space orientation="horizontal" size="middle">
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              notification.success({
                message: 'Lưu đơn đo mắt thành công',
                description: 'Đã lưu đơn kính vào db_lab và gán mã phiếu đo cho khách hàng!'
              });
            }}
          >
            Lưu Kết Quả Đo Mắt (Tạo Prescription)
          </Button>
          <Button size="large" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In Phiếu Khám Khúc Xạ A5
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // Render Màn hình Xưởng Mài Lắp Kính Lab
  const renderLabScreen = () => (
    <Card title="Xưởng Gia Công Mài Lắp Kính (SRS FR-LAB)" className="shadow-sm">
      <Alert
        message="Quy trình gia công khép kín"
        description="Đơn kính sau khi thanh toán được Feign Client chuyển tự động sang Xưởng Lab: KTV mài tròng -> Kiểm tra QC -> Đạt yêu cầu bàn giao."
        type="success"
        showIcon
        style={{ marginBottom: 24 }}
      />
      <Table
        dataSource={labJobs}
        rowKey="id"
        columns={[
          { title: 'Mã Lệnh Lab', dataIndex: 'id', render: (val) => <strong>{val}</strong> },
          { title: 'Mã Đơn Hàng', dataIndex: 'orderId' },
          { title: 'Khách Hàng', dataIndex: 'customer' },
          { title: 'Gọng & Tròng Kính', render: (_, r) => <div><div>{r.frame}</div><Text type="secondary">{r.lens}</Text></div> },
          { title: 'Thông Số Cắt Mài', dataIndex: 'prescription', render: (val) => <Tag color="geekblue">{val}</Tag> },
          {
            title: 'Trạng Thái',
            dataIndex: 'status',
            render: (st) => {
              if (st === 'IN_PROGRESS') return <Tag color="processing">Đang mài tròng</Tag>;
              if (st === 'WAITING_PROCESS') return <Tag color="warning">Chờ xử lý</Tag>;
              return <Tag color="success">Đạt QC - Sẵn sàng giao</Tag>;
            }
          },
          {
            title: 'Hành động Kỹ Thuật',
            render: (_, r) => (
              <Space orientation="horizontal">
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    setLabJobs(labJobs.map(j => j.id === r.id ? { ...j, status: 'READY_FOR_DELIVERY' } : j));
                    notification.success({ message: 'Đạt kiểm định QC', description: 'Kính đã được mài chuẩn xác và sẵn sàng bàn giao!' });
                  }}
                >
                  Xác nhận đạt QC
                </Button>
              </Space>
            )
          }
        ]}
      />
    </Card>
  );

  // Render Màn hình Quản trị / Dashboard
  const renderDashboardScreen = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Doanh Thu Hôm Nay" value={14250000} precision={0} suffix="₫" valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Đơn Hàng POS Tại Quầy" value={12} suffix="đơn" />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Lượt Đo Mắt Khúc Xạ" value={8} suffix="lượt" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic title="Kính Đang Mài Tại Lab" value={3} suffix="cặp" valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Card title="Quản Lý Kho Hàng Khả Dụng (Chi Nhánh Trung Tâm)" className="shadow-sm">
        <Table
          dataSource={[
            { key: 1, sku: 'FRM-BOLON-BLK', name: 'Gọng Bolon Titanium Đen', type: 'Gọng kính', price: '3.250.000 ₫', stock: 45 },
            { key: 2, sku: 'FRM-GM-BLK', name: 'Gọng Gentle Monster TR90', type: 'Gọng kính', price: '1.850.000 ₫', stock: 50 },
            { key: 3, sku: 'LNS-CHEMI-160', name: 'Tròng Kính Chemi U2 1.60', type: 'Tròng thuốc', price: '650.000 ₫', stock: 100 },
            { key: 4, sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Wayfarer', type: 'Kính râm', price: '4.950.000 ₫', stock: 20 },
          ]}
          columns={[
            { title: 'Mã SKU', dataIndex: 'sku' },
            { title: 'Tên Sản Phẩm', dataIndex: 'name' },
            { title: 'Phân Loại', dataIndex: 'type' },
            { title: 'Giá Bán', dataIndex: 'price' },
            { title: 'Tồn Kho Khả Dụng', dataIndex: 'stock', render: (val) => <Tag color={val > 30 ? 'green' : 'orange'}>{val} chiếc</Tag> }
          ]}
        />
      </Card>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="dark">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
          <EyeOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>GlassStore Portal</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={({ key }) => setSelectedKey(key)}
          items={[
            { key: 'pos', icon: <ShopOutlined />, label: 'Bán Hàng POS Quầy' },
            { key: 'optometry', icon: <EyeOutlined />, label: 'Phòng Đo Mắt (OD/OS)' },
            { key: 'lab', icon: <ToolOutlined />, label: 'Xưởng Gia Công Lab' },
            { key: 'dashboard', icon: <AppstoreOutlined />, label: 'Quản Trị & Kho Hàng' },
          ]}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: 0 }}>
            {selectedKey === 'pos' && 'Bán Hàng Tại Quầy (POS Terminal)'}
            {selectedKey === 'optometry' && 'Khám Khúc Xạ & Đơn Kính Thuốc'}
            {selectedKey === 'lab' && 'Quy Trình Gia Công Kính Xưởng Lab'}
            {selectedKey === 'dashboard' && 'Tổng Quan Kinh Doanh & Tồn Kho'}
          </Title>
          <Space>
            <Badge dot>
              <UserOutlined style={{ fontSize: 18 }} />
            </Badge>
            <Text strong>Nguyễn Bán Hàng (Chi nhánh Quận 1)</Text>
          </Space>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          {selectedKey === 'pos' && renderPosScreen()}
          {selectedKey === 'optometry' && renderOptometryScreen()}
          {selectedKey === 'lab' && renderLabScreen()}
          {selectedKey === 'dashboard' && renderDashboardScreen()}
        </Content>
      </Layout>
    </Layout>
  );
}
