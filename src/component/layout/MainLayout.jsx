import React from 'react';
import { Layout, Menu, Tag, Space, Typography, Button, Tooltip } from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { APP_ROUTES, getAuthorizedMenuItems } from '../../routes/routesConfig';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function MainLayout() {
  const { user, logout, roleInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Find active route title
  const currentRoute = APP_ROUTES.find((r) => r.path === location.pathname);
  const pageTitle = currentRoute ? currentRoute.headerTitle : 'Cổng Vận Hành Nội Bộ OptiVision';

  // Dynamic menu items based strictly on current user's role
  const menuItems = getAuthorizedMenuItems(user?.role, location.pathname);

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh', width: '100vw', background: '#f8fafc' }}>
      {/* Dynamic Sidebar with Brand Primary #086288 */}
      <Sider width={268} style={{ background: '#086288', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
        {/* Brand Header */}
        <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 24px', gap: 12, borderBottom: '1px solid rgba(151, 215, 255, 0.15)' }}>
          <div style={{ background: '#FFEFC4', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EyeOutlined style={{ fontSize: 20, color: '#086288' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', letterSpacing: 0.5 }}>GlassStore</div>
            <div style={{ fontSize: 10, color: '#97D7FF', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>Internal Portal</div>
          </div>
        </div>

        {/* Dynamic RBAC Filtered Menu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <div style={{ padding: '0 12px 10px', fontSize: 11, fontWeight: 700, color: '#97D7FF', letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Menu Tác Nghiệp Được Cấp Quyền ({menuItems.length})
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            style={{ background: 'transparent', borderRight: 0 }}
            items={menuItems}
          />
        </div>

        {/* User Active Role & RBAC Status at Bottom of Sidebar */}
        <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(151, 215, 255, 0.15)', background: 'rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e0f2fe', fontSize: 12, marginBottom: 4 }}>
            <SafetyCertificateOutlined style={{ color: '#97D7FF' }} />
            <span style={{ fontWeight: 700 }}>Phân quyền RBAC Active</span>
          </div>
          <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.roleLabel || 'Nhân sự'}
          </div>
          <div style={{ color: '#97D7FF', fontSize: 11, marginTop: 2 }}>
            Mã NV: <strong>{user?.staffId}</strong>
          </div>
        </div>
      </Sider>

      {/* Main Operational Container */}
      <Layout style={{ background: '#f8fafc', flex: 1 }}>
        {/* Top Header */}
        <Header style={{ background: '#ffffff', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', height: 68 }}>
          <Title level={4} style={{ margin: 0, color: '#086288', fontWeight: 800 }}>
            {pageTitle}
          </Title>

          <Space size={14}>
            {/* Branch Badge */}
            <Tag style={{ background: '#FFEFC4', color: '#086288', borderColor: '#086288', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
              {user?.branchName || 'Chi nhánh Quận 1 (HCM)'}
            </Tag>

            {/* Role Tag */}
            <Tag color={roleInfo?.tagColor || 'blue'} style={{ fontWeight: 700, borderRadius: 20, padding: '2px 10px' }}>
              {user?.roleLabel}
            </Tag>

            {/* Staff Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f9ff', padding: '6px 14px', borderRadius: 20, border: '1px solid #97D7FF' }}>
              <UserOutlined style={{ color: '#086288', fontSize: 14 }} />
              <Text strong style={{ color: '#086288', fontSize: 13 }}>
                {user?.staffName || 'Nhân viên tác nghiệp'}
              </Text>
            </div>

            {/* Logout Shift Button */}
            <Tooltip title="Kết thúc ca làm việc và khóa phiên bảo mật">
              <Button
                type="default"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{
                  borderRadius: 20,
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  fontWeight: 600
                }}
              >
                Đăng Xuất Ca
              </Button>
            </Tooltip>
          </Space>
        </Header>

        {/* Content Outlet */}
        <Content style={{ padding: '24px 32px', minHeight: 'calc(100vh - 68px)', boxSizing: 'border-box' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

