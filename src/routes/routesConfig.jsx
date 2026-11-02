import React from 'react';
import {
  ShopOutlined,
  EyeOutlined,
  ToolOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { ROLES } from './rolesConfig';
import PosPage from '../pages/pos/PosPage';
import OptometryPage from '../pages/optometry/OptometryPage';
import LabPage from '../pages/lab/LabPage';
import DashboardPage from '../pages/dashboard/DashboardPage';

export const APP_ROUTES = [
  {
    path: '/pos',
    key: 'pos',
    label: 'Bán Hàng POS Quầy',
    headerTitle: 'Hệ Thống Bán Lẻ Tại Quầy (POS Terminal)',
    icon: <ShopOutlined style={{ fontSize: 18 }} />,
    allowedRoles: [ROLES.ADMIN, ROLES.POS],
    component: <PosPage />
  },
  {
    path: '/optometry',
    key: 'optometry',
    label: 'Phòng Đo Mắt (OD/OS)',
    headerTitle: 'Khám Khúc Xạ & Đơn Kính Thuốc Chuẩn Nhãn Khoa',
    icon: <EyeOutlined style={{ fontSize: 18 }} />,
    allowedRoles: [ROLES.ADMIN, ROLES.OPTOMETRY],
    component: <OptometryPage />
  },
  {
    path: '/lab',
    key: 'lab',
    label: 'Xưởng Gia Công Lab',
    headerTitle: 'Quy Trình Gia Công Kính Xưởng Lab & QC',
    icon: <ToolOutlined style={{ fontSize: 18 }} />,
    allowedRoles: [ROLES.ADMIN, ROLES.LAB],
    component: <LabPage />
  },
  {
    path: '/dashboard',
    key: 'dashboard',
    label: 'Quản Trị & Tồn Kho',
    headerTitle: 'Tổng Quan Kinh Doanh & Tồn Kho Chi Nhánh',
    icon: <AppstoreOutlined style={{ fontSize: 18 }} />,
    allowedRoles: [ROLES.ADMIN],
    component: <DashboardPage />
  }
];

/**
 * Filter menu items dynamically according to the user's role
 */
export function getAuthorizedMenuItems(userRole, currentPath) {
  if (!userRole) return [];

  return APP_ROUTES
    .filter((route) => {
      if (userRole === ROLES.ADMIN) return true;
      return route.allowedRoles.includes(userRole);
    })
    .map((route) => {
      const isSelected = currentPath === route.path;
      return {
        key: route.path,
        icon: route.icon,
        label: route.label,
        style: isSelected
          ? { background: '#4D8DBA', color: '#ffffff', borderRadius: 8, fontWeight: 700, margin: '4px 0' }
          : { color: '#e0f2fe', margin: '4px 0' }
      };
    });
}

