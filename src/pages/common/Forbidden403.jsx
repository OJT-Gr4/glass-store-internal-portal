import React from 'react';
import { Result, Button, Tag, Space, Typography } from 'antd';
import { LockOutlined, ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;

export default function Forbidden403({ allowedRoles = [] }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 16px rgba(8, 98, 136, 0.05)'
      }}
    >
      <Result
        status="403"
        title={<span style={{ color: '#074d75', fontWeight: 800, fontSize: 26 }}>403 - Quyền Truy Cập Bị Từ Chối (RBAC Denied)</span>}
        subTitle={
          <div style={{ maxWidth: 540, margin: '0 auto', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            <p>
              Tài khoản của bạn <strong>{user?.staffName}</strong> hiện đang mang vai trò{' '}
              <Tag color="geekblue" style={{ fontWeight: 700 }}>{user?.roleLabel || user?.role}</Tag>
              không nằm trong danh sách phân quyền được phép truy cập phân hệ tác nghiệp này.
            </p>
            {allowedRoles.length > 0 && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px dashed #cbd5e1', marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Phân hệ này yêu cầu vai trò:</Text>{' '}
                {allowedRoles.map((r) => (
                  <Tag key={r} color="orange" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    {r}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        }
        extra={
          <Space size={14}>
            <Button
              type="primary"
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(user?.defaultRoute || '/pos')}
              style={{
                background: '#074d75',
                borderColor: '#074d75',
                fontWeight: 700,
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(7, 77, 117, 0.25)'
              }}
            >
              Về Phân Hệ Của Bạn ({user?.roleLabel})
            </Button>
            <Button
              size="large"
              icon={<SafetyCertificateOutlined />}
              onClick={() => navigate('/login')}
              style={{ borderRadius: 8, borderColor: '#4D8DBA', color: '#086288', fontWeight: 600 }}
            >
              Đổi Tài Khoản / Đăng Nhập Lại
            </Button>
          </Space>
        }
      />
    </div>
  );
}

