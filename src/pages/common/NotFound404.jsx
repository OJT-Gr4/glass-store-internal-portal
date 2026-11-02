import React from 'react';
import { Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function NotFound404() {
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
        padding: 32
      }}
    >
      <Result
        status="404"
        title={<span style={{ color: '#074d75', fontWeight: 800 }}>404 - Không Tìm Thấy Trang</span>}
        subTitle="Đường dẫn tác nghiệp không tồn tại hoặc đã được chuyển dời trong hệ thống nội bộ."
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            size="large"
            onClick={() => navigate(user ? (user.defaultRoute || '/pos') : '/login')}
            style={{ background: '#086288', borderRadius: 8, fontWeight: 700 }}
          >
            Quay Về Trang Chủ
          </Button>
        }
      />
    </div>
  );
}

