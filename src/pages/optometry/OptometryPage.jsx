import React from 'react';
import { Card, Form, Row, Col, Input, InputNumber, Button, Space, Alert, notification } from 'antd';
import { EyeOutlined, CheckCircleOutlined, PrinterOutlined } from '@ant-design/icons';

export default function OptometryPage() {
  return (
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

        <Space size="middle" style={{ marginTop: 12 }}>
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
}

