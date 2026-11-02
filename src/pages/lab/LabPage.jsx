import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, notification } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function LabPage() {
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

  return (
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
                  setLabJobs(labJobs.map((j) => (j.id === r.id ? { ...j, status: 'READY_FOR_DELIVERY' } : j)));
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
}

