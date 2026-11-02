import React from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';

export default function DashboardPage() {
  return (
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
            { key: 4, sku: 'SUN-RB-WAYF-BLK', name: 'Kính Râm Ray-Ban Wayfarer Polarized', type: 'Kính râm', price: '4.950.000 ₫', stock: 20 }
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
}

