// ============================================================
// OptiVision RBAC (Role-Based Access Control) Constants
// ============================================================

export const ROLES = {
  ADMIN: 'admin',
  POS: 'pos',
  OPTOMETRY: 'optometry',
  LAB: 'lab'
};

export const ROLE_INFO = {
  [ROLES.ADMIN]: {
    name: 'Quản Trị / Giám Đốc Chuỗi',
    color: '#7c3aed',
    tagColor: 'purple',
    badgeText: 'Full System Admin (RBAC-00)',
    defaultRoute: '/dashboard'
  },
  [ROLES.POS]: {
    name: 'Thu Ngân / Bán Lẻ POS',
    color: '#086288',
    tagColor: 'cyan',
    badgeText: 'POS Cashier Terminal',
    defaultRoute: '/pos'
  },
  [ROLES.OPTOMETRY]: {
    name: 'Bác Sĩ / KTV Khúc Xạ',
    color: '#0284c7',
    tagColor: 'blue',
    badgeText: 'Clinical Optometrist (OD/OS)',
    defaultRoute: '/optometry'
  },
  [ROLES.LAB]: {
    name: 'KTV Gia Công Lab Lens',
    color: '#0f766e',
    tagColor: 'geekblue',
    badgeText: 'Lens Lab Technician & QC',
    defaultRoute: '/lab'
  }
};

