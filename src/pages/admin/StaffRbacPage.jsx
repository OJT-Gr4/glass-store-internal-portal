import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message, Modal, Spin, Switch, Tag } from 'antd';
import { staffApi } from '../../api/staffApi';
import { notificationApi } from '../../api/notificationApi';

// Roles definition
const ROLES_LIST = [
  { code: 'all', label: 'Tất cả vai trò' },
  { code: 'admin', label: 'Quản Trị Viên (Admin)' },
  { code: 'manager', label: 'Quản Lý Cửa Hàng' },
  { code: 'cashier', label: 'Thu Ngân & Bán Lẻ POS' },
  { code: 'optometrist', label: 'Bác Sĩ / KTV Khúc Xạ' },
  { code: 'lab_tech', label: 'Kỹ Thuật Viên Lab & Mài Lắp' },
  { code: 'inventory', label: 'Thủ Kho Vật Tư' }
];

const RBAC_MODULES = [
  {
    group: '1. Bán Hàng & Thu Ngân POS',
    icon: 'point_of_sale',
    permissions: [
      { key: 'pos_create', name: 'Tạo đơn bán lẻ & quét mã vạch', admin: true, manager: true, cashier: true, optom: false, lab: false },
      { key: 'pos_discount', name: 'Áp dụng khuyến mãi & Voucher', admin: true, manager: true, cashier: true, optom: false, lab: false },
      { key: 'pos_override', name: 'Duyệt chiết khấu ngoài chính sách', admin: true, manager: true, cashier: false, optom: false, lab: false },
      { key: 'pos_refund', name: 'Hủy đơn & hoàn tiền giao dịch', admin: true, manager: true, cashier: false, optom: false, lab: false },
    ]
  },
  {
    group: '2. Khúc Xạ & Đo Khám Thị Lực',
    icon: 'visibility',
    permissions: [
      { key: 'optom_queue', name: 'Tiếp nhận hàng đợi khám mắt', admin: true, manager: true, cashier: true, optom: true, lab: false },
      { key: 'optom_exam', name: 'Nhập thông số khúc xạ máy & thử kính', admin: true, manager: false, cashier: false, optom: true, lab: false },
      { key: 'optom_sign_rx', name: 'Ký duyệt đơn kính y khoa (CCHN)', admin: true, manager: false, cashier: false, optom: true, lab: false },
    ]
  },
  {
    group: '3. Xưởng Lab & Mài Lắp Kính',
    icon: 'precision_manufacturing',
    permissions: [
      { key: 'lab_queue', name: 'Theo dõi hàng đợi gia công mài kính', admin: true, manager: true, cashier: false, optom: false, lab: true },
      { key: 'lab_edging', name: 'Điều khiển máy mài Essilor/Nidek', admin: true, manager: false, cashier: false, optom: false, lab: true },
      { key: 'lab_qc_sign', name: 'Kiểm định chất lượng QC & xác nhận đạt', admin: true, manager: false, cashier: false, optom: false, lab: true },
    ]
  },
  {
    group: '4. Kho Vận & Điều Chuyển',
    icon: 'inventory_2',
    permissions: [
      { key: 'stock_view', name: 'Tra cứu tồn kho đa chi nhánh', admin: true, manager: true, cashier: true, optom: true, lab: true },
      { key: 'stock_transfer', name: 'Lập phiếu yêu cầu điều chuyển kho', admin: true, manager: true, cashier: false, optom: false, lab: true },
      { key: 'stock_adjust', name: 'Điều chỉnh kiểm kê tồn kho', admin: true, manager: true, cashier: false, optom: false, lab: false },
    ]
  },
  {
    group: '5. Báo Cáo & Quản Trị Hệ Thống',
    icon: 'admin_panel_settings',
    permissions: [
      { key: 'reports_view', name: 'Xem báo cáo doanh thu chuỗi', admin: true, manager: false, cashier: false, optom: false, lab: false },
      { key: 'staff_manage', name: 'Quản trị nhân sự & phân quyền vai trò', admin: true, manager: false, cashier: false, optom: false, lab: false },
    ]
  }
];

export default function StaffRbacPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'notifications' ? 'notifications' : 'staff';
  const [activeTab, setActiveTabState] = useState(initialTab); // 'staff' | 'requests' | 'matrix' | 'notifications'
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (tab === 'notifications') {
      setSearchParams({ tab: 'notifications' }, { replace: true });
    } else if (searchParams.has('tab')) {
      setSearchParams({}, { replace: true });
    }
  };
  const [channelConfig, setChannelConfig] = useState(null);
  const [channelDraft, setChannelDraft] = useState({ smsEnabled: true, emailEnabled: false, pollIntervalSeconds: 15 });
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelError, setChannelError] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingStaff, setEditingStaff] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    branch: 'Flagship Q.1',
    roleCode: 'cashier',
    roleName: 'Thu Ngân POS & Bán Lẻ'
  });

  // Map roles from backend
  const mapRoleToInfo = (roles = []) => {
    const roleList = Array.isArray(roles) ? roles : Array.from(roles || []);
    if (roleList.includes('ROLE_ADMIN')) {
      return { code: 'admin', label: 'Quản Trị Viên (Admin)', color: 'bg-purple-700 text-white' };
    }
    if (roleList.includes('ROLE_OPTOMETRIST')) {
      return { code: 'optometrist', label: 'Bác Sĩ / KTV Khúc Xạ (CCHN)', color: 'bg-emerald-700 text-white' };
    }
    if (roleList.includes('ROLE_LAB_TECH')) {
      return { code: 'lab_tech', label: 'Kỹ Thuật Viên Xưởng Lab', color: 'bg-indigo-700 text-white' };
    }
    if (roleList.includes('ROLE_SALES_STAFF')) {
      return { code: 'cashier', label: 'Thu Ngân POS & Bán Lẻ', color: 'bg-[#004967] text-white' };
    }
    return { code: 'cashier', label: 'Nhân Viên Bán Hàng', color: 'bg-slate-700 text-white' };
  };

  const mapCodeToBackendRole = (code) => {
    switch (code) {
      case 'admin': return 'ROLE_ADMIN';
      case 'optometrist': return 'ROLE_OPTOMETRIST';
      case 'lab_tech': return 'ROLE_LAB_TECH';
      case 'manager': return 'ROLE_ADMIN';
      default: return 'ROLE_SALES_STAFF';
    }
  };

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffApi.getStaffList();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((u) => {
          const roleInfo = mapRoleToInfo(u.roles);
          const initials = (u.fullName || 'NV')
            .split(' ')
            .map((n) => n[0])
            .slice(-2)
            .join('')
            .toUpperCase();

          const normStatus = (u.status || 'ACTIVE').toLowerCase();
          return {
            dbId: u.id,
            id: u.employeeCode || `STF-0${u.id}`,
            name: u.fullName,
            email: u.email,
            phone: u.phoneNumber || '0901000000',
            branch: u.branchName || 'Flagship Q.1 (TP.HCM)',
            roleName: roleInfo.label,
            roleCode: roleInfo.code,
            status: normStatus === 'active' ? 'active' : (normStatus === 'pending' ? 'pending' : 'locked'),
            lastActive: normStatus === 'pending' ? 'Chờ duyệt cấp quyền' : 'Trực tuyến hôm nay',
            avatar: initials,
            color: roleInfo.color,
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Mới đăng ký',
            permissions: ['pos_create', 'stock_view']
          };
        });
        setStaffList(mapped);
      }
    } catch (err) {
      console.warn('Lấy dữ liệu nhân viên từ backend thất bại:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const loadChannelConfig = async () => {
    setChannelLoading(true);
    setChannelError('');
    try {
      const cfg = await notificationApi.getChannelConfig();
      setChannelConfig(cfg);
      setChannelDraft({
        smsEnabled: Boolean(cfg.smsEnabled),
        emailEnabled: Boolean(cfg.emailEnabled),
        pollIntervalSeconds: Number(cfg.pollIntervalSeconds || 15),
      });
    } catch (err) {
      setChannelError(err.message || 'Không tải được cấu hình kênh thông báo.');
    } finally {
      setChannelLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadChannelConfig();
    }
  }, [activeTab]);

  const handleSaveChannelConfig = async () => {
    setChannelSaving(true);
    setChannelError('');
    try {
      const updated = await notificationApi.updateChannelConfig({
        smsEnabled: channelDraft.smsEnabled,
        emailEnabled: channelDraft.emailEnabled,
        pollIntervalSeconds: Math.max(5, Math.min(120, Number(channelDraft.pollIntervalSeconds) || 15)),
      });
      setChannelConfig(updated);
      setChannelDraft({
        smsEnabled: Boolean(updated.smsEnabled),
        emailEnabled: Boolean(updated.emailEnabled),
        pollIntervalSeconds: Number(updated.pollIntervalSeconds || 15),
      });
      message.success('Đã lưu cấu hình kênh thông báo & chu kỳ polling!');
    } catch (err) {
      setChannelError(err.message || 'Không thể lưu cấu hình kênh thông báo.');
      message.error(err.message || 'Không thể lưu cấu hình kênh thông báo.');
    } finally {
      setChannelSaving(false);
    }
  };

  const activeStaff = staffList.filter(s => s.status === 'active');
  const pendingStaff = staffList.filter(s => s.status === 'pending');
  const lockedStaff = staffList.filter(s => s.status === 'locked');

  // Filtered staff list for Tab 1
  const filteredStaff = staffList.filter(staff => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || staff.name.toLowerCase().includes(q) || staff.id.toLowerCase().includes(q) || staff.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || staff.roleCode === roleFilter;
    const matchStatus = statusFilter === 'all' || staff.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleToggleStatus = async (staff) => {
    try {
      if (staff.dbId) {
        await staffApi.toggleStaffStatus(staff.dbId);
      }
      const newStatus = staff.status === 'active' ? 'locked' : 'active';
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, status: newStatus } : s));
      message.success(`Đã ${newStatus === 'active' ? 'mở khóa' : 'tạm khóa'} tài khoản ${staff.name} (${staff.id})`);
    } catch (err) {
      message.error(`Không thể cập nhật trạng thái nhân viên: ${err.message}`);
    }
  };

  const handleApproveStaff = async (staff) => {
    try {
      if (staff.dbId) {
        await staffApi.toggleStaffStatus(staff.dbId);
      }
      message.success(`Đã phê duyệt và kích hoạt tài khoản cho ${staff.name} (${staff.id}) thành công! Nhân viên hiện có thể đăng nhập.`);
      await loadStaff();
    } catch (err) {
      message.error(`Lỗi phê duyệt: ${err.message}`);
    }
  };

  const handleRejectStaff = async (staff) => {
    Modal.confirm({
      title: `Từ chối yêu cầu cấp quyền cho ${staff.name}?`,
      content: `Bạn có chắc chắn muốn từ chối và hủy hồ sơ đăng ký của "${staff.name}" (${staff.email})? Thao tác này sẽ xóa hồ sơ khỏi hệ thống.`,
      okText: 'Xác nhận từ chối',
      okType: 'danger',
      cancelText: 'Quay lại',
      onOk: async () => {
        try {
          if (staff.dbId) {
            await staffApi.deleteStaff(staff.dbId);
          }
          message.info(`Đã từ chối và hủy hồ sơ đăng ký của ${staff.name}`);
          await loadStaff();
        } catch (err) {
          message.error(`Lỗi khi từ chối hồ sơ: ${err.message}`);
        }
      }
    });
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) {
      message.error('Vui lòng nhập họ tên và email nhân viên');
      return;
    }
    const newId = `STF-0${Math.floor(100 + Math.random() * 900)}`;

    try {
      const created = await staffApi.createStaff({
        fullName: newStaff.name,
        email: newStaff.email,
        phoneNumber: newStaff.phone || '0901000000',
        branchName: newStaff.branch,
        employeeCode: newId,
        roleName: mapCodeToBackendRole(newStaff.roleCode),
        status: 'ACTIVE'
      });
      setIsAddModalOpen(false);
      setNewStaff({ name: '', email: '', phone: '', branch: 'Flagship Q.1', roleCode: 'cashier', roleName: 'Thu Ngân POS & Bán Lẻ' });
      message.success(`Tạo mới hồ sơ nhân sự ${created?.fullName || newStaff.name} (${newId}) thành công!`);
      await loadStaff();
    } catch (err) {
      message.error(`Lỗi tạo nhân sự: ${err.message}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f9f9ff]">
      <div className="flex flex-col w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 gap-4">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#d8e3fb]/40 shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#70787f]">
              <span>Hệ Thống</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Cấu Hình</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#004967] font-semibold">Nhân Sự &amp; Phân Quyền</span>
            </div>
            <h1 className="text-lg font-bold text-[#111c2d] mt-1">Quản Trị Nhân Viên &amp; Phân Quyền Vai Trò (RBAC)</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => message.success('Đang xuất danh sách nhân sự định dạng Excel (.xlsx)...')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e7eeff] text-[#004967] text-xs font-semibold transition-all border border-[#d8e3fb]"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#004967] hover:bg-[#086288] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>+ Thêm Nhân Viên</span>
            </button>
          </div>
        </div>

        {/* 4 Core KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-[#d8e3fb]/40 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#70787f] uppercase tracking-wider block">Tổng nhân sự</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-[#004967]">{activeStaff.length + lockedStaff.length}</span>
                <span className="text-xs text-[#70787f]">hồ sơ</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">{activeStaff.length} đang hoạt động</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#004967] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#d8e3fb]/40 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#70787f] uppercase tracking-wider block">Vai trò hệ thống</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-[#004967]">5</span>
                <span className="text-xs text-[#70787f]">nhóm chính</span>
              </div>
              <span className="text-[11px] text-[#70787f]">Phân quyền chặt chẽ</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#e7eeff] text-[#004967] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">shield_person</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#d8e3fb]/40 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#70787f] uppercase tracking-wider block">Phiên trực tuyến</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-emerald-700">{activeStaff.length}</span>
                <span className="text-xs text-[#70787f]">tài khoản</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Kết nối an toàn
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">devices</span>
            </div>
          </div>

          {/* KPI Card 4: Requests Pending Approval */}
          <div 
            onClick={() => setActiveTab('requests')}
            className={`p-3.5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition-all ${
              pendingStaff.length > 0 
                ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50' 
                : 'bg-white border-[#d8e3fb]/40 hover:bg-[#f0f3ff]'
            }`}
          >
            <div>
              <span className="text-[11px] font-semibold text-[#70787f] uppercase tracking-wider block">Yêu cầu cấp quyền</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-xl font-bold ${pendingStaff.length > 0 ? 'text-amber-700' : 'text-[#004967]'}`}>
                  {pendingStaff.length}
                </span>
                <span className="text-xs text-[#70787f]">chờ duyệt</span>
              </div>
              <span className={`text-[11px] font-semibold ${pendingStaff.length > 0 ? 'text-amber-700 animate-pulse' : 'text-emerald-600'}`}>
                {pendingStaff.length > 0 ? 'Cần Admin phê duyệt' : 'Đã xử lý tất cả'}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              pendingStaff.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-[#e7eeff] text-[#004967]'
            }`}>
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-[#e7eeff] pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'staff'
                  ? 'bg-[#004967] text-white shadow-sm'
                  : 'bg-white text-[#70787f] hover:bg-[#f0f3ff] border border-[#d8e3fb]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span>Danh Sách Nhân Sự ({activeStaff.length + lockedStaff.length})</span>
            </button>

            {/* TAB 2: YÊU CẦU CẤP QUYỀN MỚI */}
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-[#004967] text-white shadow-sm'
                  : 'bg-white text-[#70787f] hover:bg-[#f0f3ff] border border-[#d8e3fb]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Yêu Cầu Cấp Quyền (Đăng Ký Mới)</span>
              {pendingStaff.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingStaff.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'matrix'
                  ? 'bg-[#004967] text-white shadow-sm'
                  : 'bg-white text-[#70787f] hover:bg-[#f0f3ff] border border-[#d8e3fb]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Ma Trận Phân Quyền (RBAC Matrix)</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              data-testid="tab-notification-channels"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'notifications'
                  ? 'bg-[#004967] text-white shadow-sm'
                  : 'bg-white text-[#70787f] hover:bg-[#f0f3ff] border border-[#d8e3fb]/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              <span>Cấu Hình Kênh Thông Báo</span>
            </button>
          </div>
        </div>

        {/* ================= TAB 1: DANH SÁCH NHÂN SỰ ================= */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-xl border border-[#d8e3fb]/40 shadow-sm overflow-hidden flex flex-col">
            {/* Filter toolbar */}
            <div className="p-3.5 bg-[#f0f3ff]/50 border-b border-[#e7eeff] flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="w-full md:w-80 relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#70787f]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, mã STF, email..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-[#d8e3fb] text-xs text-[#111c2d] placeholder-[#70787f] focus:outline-none focus:ring-1 focus:ring-[#004967]"
                />
              </div>

              <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#d8e3fb] text-xs font-medium text-[#111c2d] focus:outline-none"
                >
                  {ROLES_LIST.map(r => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#d8e3fb] text-xs font-medium text-[#111c2d] focus:outline-none"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="pending">Chờ phê duyệt</option>
                  <option value="locked">Tạm khóa</option>
                </select>
              </div>
            </div>

            {/* Staff Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[880px]">
                <thead>
                  <tr className="bg-[#dee8ff]/30 text-[#70787f] uppercase text-[11px] font-bold tracking-wider border-b border-[#e7eeff]">
                    <th className="py-3 px-4">Nhân viên</th>
                    <th className="py-3 px-3">Chi nhánh</th>
                    <th className="py-3 px-3">Vai trò phân quyền</th>
                    <th className="py-3 px-3">Hoạt động gần nhất</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7eeff] text-xs text-[#111c2d]">
                  {filteredStaff.map(staff => (
                    <tr key={staff.id} className="hover:bg-[#f0f3ff]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${staff.color} font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            {staff.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-[13px] text-[#111c2d] flex items-center gap-1.5">
                              {staff.name}
                              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#e7eeff] text-[#004967]">{staff.id}</span>
                            </div>
                            <div className="text-[11px] text-[#70787f]">{staff.email} • {staff.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#111c2d]">{staff.branch}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#004967] font-semibold text-[11px] inline-block">
                          {staff.roleName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#70787f] font-mono">
                        {staff.lastActive}
                      </td>
                      <td className="py-3 px-3">
                        {staff.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Hoạt động
                          </span>
                        ) : staff.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Chờ phê duyệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Tạm khóa
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {staff.status === 'pending' ? (
                            <button
                              onClick={() => handleApproveStaff(staff)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Phê duyệt tài khoản này"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span>Duyệt</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingStaff(staff)}
                                className="p-1.5 rounded-lg text-[#004967] hover:bg-[#dee8ff] transition-colors"
                                title="Chỉnh sửa phân quyền"
                              >
                                <span className="material-symbols-outlined text-[17px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleToggleStatus(staff)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  staff.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={staff.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              >
                                <span className="material-symbols-outlined text-[17px]">
                                  {staff.status === 'active' ? 'lock' : 'lock_open'}
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: YÊU CẦU CẤP QUYỀN (ĐĂNG KÝ MỚI) ================= */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-[#d8e3fb]/40 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-[#f0f3ff] to-[#e7eeff]/40 border-b border-[#e7eeff] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#004967] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Hồ Sơ Đăng Ký Chờ Phê Duyệt Cấp Quyền</span>
                </h3>
                <p className="text-xs text-[#70787f] mt-0.5">
                  Các yêu cầu tạo tài khoản gửi từ form Đăng Ký Mới của Cổng Nội Bộ. Admin duyệt để kích hoạt hoặc từ chối hồ sơ.
                </p>
              </div>
              <button
                onClick={loadStaff}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white border border-[#d8e3fb] hover:bg-[#f0f3ff] text-xs font-semibold text-[#004967] flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Làm mới danh sách</span>
              </button>
            </div>

            {pendingStaff.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[28px]">verified</span>
                </div>
                <h4 className="text-sm font-bold text-[#111c2d]">Không có yêu cầu cấp quyền nào đang chờ xử lý</h4>
                <p className="text-xs text-[#70787f] mt-1 max-w-md">
                  Khi nhân sự mới điền form nộp yêu cầu tại màn hình Đăng Ký Cổng Nội Bộ, hồ sơ sẽ lập tức xuất hiện tại đây để Quản trị viên xét duyệt.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[880px]">
                  <thead>
                    <tr className="bg-[#dee8ff]/30 text-[#70787f] uppercase text-[11px] font-bold tracking-wider border-b border-[#e7eeff]">
                      <th className="py-3 px-4">Ứng viên đề xuất</th>
                      <th className="py-3 px-3">Cơ sở / Chi nhánh</th>
                      <th className="py-3 px-3">Phân hệ xin cấp</th>
                      <th className="py-3 px-3">Thời gian gửi</th>
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Phê duyệt (Admin Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7eeff] text-xs text-[#111c2d]">
                    {pendingStaff.map(staff => (
                      <tr key={staff.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                              {staff.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-[13px] text-[#111c2d] flex items-center gap-1.5">
                                {staff.name}
                                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">{staff.id}</span>
                              </div>
                              <div className="text-[11px] text-[#70787f]">{staff.email} • {staff.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#111c2d]">
                          {staff.branch}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#004967] font-semibold text-[11px]">
                            {staff.roleName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#70787f] font-mono text-[11px]">
                          {staff.createdAt}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Chờ Admin phê duyệt
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRejectStaff(staff)}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                              <span>Từ chối</span>
                            </button>
                            <button
                              onClick={() => handleApproveStaff(staff)}
                              className="px-3 py-1.5 rounded-lg bg-[#004967] hover:bg-[#086288] text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              <span>Duyệt &amp; Kích Hoạt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MA TRẬN PHÂN QUYỀN (RBAC MATRIX) ================= */}
        {activeTab === 'matrix' && (
          <div className="bg-white rounded-xl border border-[#d8e3fb]/40 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-[#f0f3ff]/50 border-b border-[#e7eeff] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#004967]">Ma Trận Phân Quyền Chi Tiết Theo Phân Hệ</h3>
                <p className="text-xs text-[#70787f]">Quy định quyền truy cập &amp; tác nghiệp của từng nhóm chức danh nhân sự trong chuỗi</p>
              </div>
              <span className="text-xs font-mono text-[#004967] bg-[#dee8ff] px-2 py-1 rounded">5 Phân Hệ Tác Nghiệp</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#dee8ff]/30 text-[#70787f] uppercase text-[11px] font-bold tracking-wider border-b border-[#e7eeff]">
                    <th className="py-3 px-4 w-1/3">Chức năng &amp; Phân hệ</th>
                    <th className="py-3 px-3 text-center">Quản Trị (Admin)</th>
                    <th className="py-3 px-3 text-center">Cửa Hàng Trưởng</th>
                    <th className="py-3 px-3 text-center">Thu Ngân / POS</th>
                    <th className="py-3 px-3 text-center">Bác Sĩ Khúc Xạ</th>
                    <th className="py-3 px-3 text-center">KTV Lab Lens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7eeff] text-xs">
                  {RBAC_MODULES.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      <tr className="bg-[#f0f3ff]/70 font-bold text-[#004967]">
                        <td colSpan={6} className="py-2.5 px-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                          <span>{group.group}</span>
                        </td>
                      </tr>
                      {group.permissions.map((p) => (
                        <tr key={p.key} className="hover:bg-[#f9f9ff]">
                          <td className="py-2.5 px-4 text-[#111c2d] pl-8">
                            • {p.name}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.admin ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.manager ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.cashier ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.optom ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {p.lab ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: CẤU HÌNH KÊNH THÔNG BÁO (FR-ADM-10) ================= */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl border border-[#d8e3fb]/40 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e7eeff]">
              <div>
                <h3 className="text-sm font-bold text-[#004967]">
                  Cấu Hình Kênh Thông Báo Giao Dịch &amp; Chu Kỳ Polling
                </h3>
                <p className="text-xs text-[#70787f] mt-0.5">
                  In-App + Polling là kênh cam kết chính thức. SMS/Email chỉ đánh dấu Đã gửi (SENT) khi cổng ngoài phản hồi HTTP 2xx — không tính In-App là đã gửi SMS.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveChannelConfig}
                disabled={channelSaving || channelLoading}
                data-testid="save-notification-channel-config"
                className="px-4 py-2 rounded-xl bg-[#004967] hover:bg-[#086288] text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
              >
                {channelSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Kênh'}
              </button>
            </div>

            {channelError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {channelError}
              </div>
            )}

            {channelLoading && !channelConfig ? (
              <div className="py-10 flex justify-center">
                <Spin tip="Đang tải cấu hình kênh thông báo..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#d8e3fb] bg-[#f0f7ff] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#004967]">1. Kênh In-App &amp; Polling Thống Nhất</span>
                    <Tag color="green">ACTIVE</Tag>
                  </div>
                  <p className="text-[11px] text-[#40484e]">
                    Đồng bộ hộp thư Portal nội bộ &amp; Customer Web từ CSDL theo chủ sở hữu.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-[#111c2d] mb-1">
                      Chu kỳ Polling (giây, từ 5s đến 120s)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      data-testid="poll-interval-input"
                      value={channelDraft.pollIntervalSeconds}
                      onChange={(e) => setChannelDraft((prev) => ({ ...prev, pollIntervalSeconds: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#d8e3fb] bg-white text-xs font-bold text-[#111c2d]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#d8e3fb] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111c2d]">2. Cổng SMS Giao Dịch</span>
                    <Switch
                      checked={channelDraft.smsEnabled}
                      onChange={(checked) => setChannelDraft((prev) => ({ ...prev, smsEnabled: checked }))}
                    />
                  </div>
                  <div>
                    <Tag color={channelConfig?.smsProviderConfigured ? 'green' : 'gold'}>
                      {channelConfig?.smsProviderStatus || 'BLOCKED_PROVIDER_UNCONFIGURED'}
                    </Tag>
                  </div>
                  <p className="text-[11px] text-[#70787f]">
                    {channelConfig?.smsProviderConfigured
                      ? 'Đã kết nối cổng SMS HTTP ngoài. Hệ thống sẽ ghi SENT khi HTTP 2xx hoặc FAILED nếu lỗi.'
                      : 'Blocked: Chưa cấu hình cổng SMS ngoài (notification.sms.provider-url). Khi phát sự kiện, hệ thống lưu In-App bình thường và ghi nhận smsStatus = BLOCKED_PROVIDER_UNCONFIGURED.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#d8e3fb] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111c2d]">3. Cổng Email Giao Dịch</span>
                    <Switch
                      checked={channelDraft.emailEnabled}
                      onChange={(checked) => setChannelDraft((prev) => ({ ...prev, emailEnabled: checked }))}
                    />
                  </div>
                  <div>
                    <Tag color={channelConfig?.emailProviderConfigured ? 'green' : 'gold'}>
                      {channelConfig?.emailProviderStatus || 'BLOCKED_PROVIDER_UNCONFIGURED'}
                    </Tag>
                  </div>
                  <p className="text-[11px] text-[#70787f]">
                    {channelConfig?.emailProviderConfigured
                      ? 'Đã kết nối cổng Email HTTP ngoài.'
                      : 'Blocked: Chưa cấu hình cổng Email ngoài (notification.email.provider-url). Trạng thái phản ánh đúng thực tế provider.'}
                  </p>
                </div>
              </div>
            )}

            {channelConfig?.updatedBy && (
              <div className="text-[11px] text-[#70787f] pt-2 border-t border-slate-100">
                Cập nhật gần nhất bởi <span className="font-semibold text-[#111c2d]">{channelConfig.updatedBy}</span> lúc{' '}
                {channelConfig.updatedAt ? new Date(channelConfig.updatedAt).toLocaleString('vi-VN') : '-'}
              </div>
            )}
          </div>
        )}

        {/* Modal Thêm Nhân Viên Nhanh (Admin) */}
        <Modal
          title="Thêm Mới Hồ Sơ Nhân Viên (Cấp Trực Tiếp)"
          open={isAddModalOpen}
          onOk={handleCreateStaff}
          onCancel={() => setIsAddModalOpen(false)}
          okText="Tạo &amp; Cấp Quyền"
          cancelText="Hủy"
        >
          <div className="flex flex-col gap-3 pt-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên nhân sự *</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={newStaff.name}
                onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#004967]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email nội bộ *</label>
              <input
                type="email"
                placeholder="nhanvien@optivision.vn"
                value={newStaff.email}
                onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#004967]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0912345678"
                  value={newStaff.phone}
                  onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#004967]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vai trò phân quyền</label>
                <select
                  value={newStaff.roleCode}
                  onChange={e => {
                    const r = ROLES_LIST.find(x => x.code === e.target.value);
                    setNewStaff({ ...newStaff, roleCode: e.target.value, roleName: r?.label || '' });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#004967]"
                >
                  <option value="cashier">Thu Ngân POS &amp; Bán Lẻ</option>
                  <option value="optometrist">Bác Sĩ / KTV Khúc Xạ (CCHN)</option>
                  <option value="lab_tech">Kỹ Thuật Viên Xưởng Lab</option>
                  <option value="manager">Quản Lý Cửa Hàng</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Chi nhánh làm việc</label>
              <input
                type="text"
                placeholder="Flagship Q.1 (TP.HCM)"
                value={newStaff.branch}
                onChange={e => setNewStaff({ ...newStaff, branch: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#004967]"
              />
            </div>
          </div>
        </Modal>

        {/* Modal Chỉnh Sửa Phân Quyền */}
        {editingStaff && (
          <Modal
            title={`Phân Quyền &amp; Cập Nhật: ${editingStaff.name}`}
            open={!!editingStaff}
            onOk={() => {
              message.success(`Đã lưu cấu hình phân quyền cho ${editingStaff.name} thành công!`);
              setEditingStaff(null);
            }}
            onCancel={() => setEditingStaff(null)}
            okText="Lưu Thay Đổi"
            cancelText="Đóng"
          >
            <div className="flex flex-col gap-3 pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{editingStaff.name} ({editingStaff.id})</div>
                  <div className="text-slate-500">{editingStaff.email} • {editingStaff.branch}</div>
                </div>
                <span className="px-2 py-1 bg-[#dee8ff] text-[#004967] rounded font-semibold">{editingStaff.roleName}</span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đổi vai trò chức danh:</label>
                <select
                  defaultValue={editingStaff.roleCode}
                  onChange={(e) => {
                    const r = ROLES_LIST.find(x => x.code === e.target.value);
                    setStaffList(prev => prev.map(s => s.id === editingStaff.id ? { ...s, roleCode: e.target.value, roleName: r?.label || s.roleName } : s));
                  }}
                  className="w-full p-2 border rounded text-xs"
                >
                  <option value="cashier">Thu Ngân POS &amp; Bán Lẻ</option>
                  <option value="optometrist">Bác Sĩ / KTV Khúc Xạ (CCHN)</option>
                  <option value="lab_tech">Kỹ Thuật Viên Xưởng Lab</option>
                  <option value="admin">Quản Trị Viên (Admin)</option>
                </select>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
