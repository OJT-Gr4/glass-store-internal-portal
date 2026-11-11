import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/rolesConfig';
import { Drawer, Empty, Modal, Spin, Tag, message } from 'antd';
import { catalogManagementApi } from '../../api/catalogManagementApi';
import { notificationApi } from '../../api/notificationApi';
import { compressImageToDataUrl, DEFAULT_AVATAR_URL, isValidImageInput } from '../../utils/imageUploadUtils';
import {
  applySingleMarkRead,
  categoryMeta,
  channelStatusBadge,
  formatNotificationTime,
  normalizePollIntervalMs,
  resolvePortalActionRoute,
} from '../../pages/common/notificationUtils';


export default function MainLayout() {
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(DEFAULT_AVATAR_URL);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Current logged in role
  const currentRole = user?.role || ROLES.ADMIN;

  const [selectedBranch, setSelectedBranch] = useState('');
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Real persisted transactional notification state (GLAS-25)
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pollIntervalMs, setPollIntervalMs] = useState(15000);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const activeUserIdRef = useRef(user?.id || null);
  activeUserIdRef.current = user?.id || null;

  const refreshUnreadSummary = useCallback(async () => {
    const uid = activeUserIdRef.current;
    if (!uid) return;
    try {
      const summary = await notificationApi.getUnreadSummary();
      if (activeUserIdRef.current !== uid) return;
      setUnreadCount(Number(summary.unreadCount) || 0);
      if (summary.pollIntervalSeconds) {
        setPollIntervalMs(normalizePollIntervalMs(summary.pollIntervalSeconds));
      }
    } catch {
      // Summary polling failures must stay silent unless user explicitly opens drawer
    }
  }, []);

  const loadInbox = useCallback(async (unreadOnlyFlag = filterUnreadOnly) => {
    const uid = activeUserIdRef.current;
    if (!uid) return;
    setNotifLoading(true);
    setNotifError('');
    try {
      const inbox = await notificationApi.getInbox({ unreadOnly: unreadOnlyFlag });
      if (activeUserIdRef.current !== uid) return;
      setNotifications(inbox.items || []);
      setUnreadCount(Number(inbox.unreadCount) || 0);
      if (inbox.pollIntervalSeconds) {
        setPollIntervalMs(normalizePollIntervalMs(inbox.pollIntervalSeconds));
      }
    } catch (error) {
      if (activeUserIdRef.current === uid) {
        setNotifError(error.message || 'Không thể tải thông báo từ máy chủ.');
      }
    } finally {
      if (activeUserIdRef.current === uid) {
        setNotifLoading(false);
      }
    }
  }, [filterUnreadOnly]);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setNotifError('');
    if (!user?.id) return undefined;
    refreshUnreadSummary();
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        refreshUnreadSummary();
        if (notificationDrawerOpen) {
          loadInbox(filterUnreadOnly);
        }
      }
    }, pollIntervalMs);
    const onFocus = () => refreshUnreadSummary();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id, pollIntervalMs, notificationDrawerOpen, filterUnreadOnly, refreshUnreadSummary, loadInbox]);

  const handleOpenNotifications = () => {
    setNotificationDrawerOpen(true);
    loadInbox(filterUnreadOnly);
  };

  const handleMarkAsRead = async (item) => {
    try {
      const updated = await notificationApi.markAsRead(item.id);
      const next = applySingleMarkRead(notifications, unreadCount, updated);
      setNotifications(filterUnreadOnly ? next.items.filter((row) => !row.read) : next.items);
      setUnreadCount(next.unreadCount);
      refreshUnreadSummary();
    } catch (error) {
      message.error(error.message || 'Không thể đánh dấu đã đọc.');
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await notificationApi.markAllAsRead();
      const nowIso = new Date().toISOString();
      setNotifications((prev) => (filterUnreadOnly ? [] : prev.map((row) => ({ ...row, read: true, readAt: row.readAt || nowIso }))));
      setUnreadCount(Number(res.unreadCount ?? 0));
      message.success('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (error) {
      message.error(error.message || 'Không thể đánh dấu tất cả đã đọc.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleOpenNotificationTarget = async (item) => {
    if (!item.read) {
      await handleMarkAsRead(item);
    }
    const route = resolvePortalActionRoute(item.actionRoute, currentRole);
    if (route) {
      setNotificationDrawerOpen(false);
      navigate(route);
    } else {
      message.info('Vai trò hiện tại không có quyền mở trực tiếp màn hình đích này.');
    }
  };

  useEffect(() => {
    let active = true;
    catalogManagementApi.getPublicLocations()
      .then((response) => {
        if (!Array.isArray(response?.data)) throw new Error('Dữ liệu địa điểm không hợp lệ.');
        if (!active) return;
        const locs = response.data;
        setLocations(locs);
        setSelectedBranch((current) => {
          if (current && locs.some((l) => l.code === current)) return current;
          const userBranch = locs.find(
            (l) =>
              l.code === user?.branch ||
              l.name === user?.branchName ||
              (user?.branchName && l.name?.toLowerCase().includes(user.branchName.toLowerCase()))
          )?.code;
          return userBranch || locs.find((l) => l.code === 'BRANCH_01')?.code || locs[0]?.code || '';
        });
      })
      .catch((error) => {
        if (active) message.error(error.message || 'Không thể tải danh sách địa điểm.');
      })
      .finally(() => {
        if (active) setLocationsLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Master definition of all navigation categories with strict RBAC access control
  const allNavSections = [
    {
      title: 'TỔNG QUAN',
      allowedRoles: [ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY, ROLES.LAB],
      items: [
        {
          key: '/dashboard',
          label: 'Bàn làm việc (Overview)',
          icon: 'space_dashboard',
          allowedRoles: [ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY, ROLES.LAB]
        }
      ]
    },
    {
      title: 'BÁN HÀNG & POS',
      allowedRoles: [ROLES.ADMIN, ROLES.POS],
      items: [
        {
          key: '/pos',
          label: 'POS Bán hàng & Thu ngân',
          icon: 'point_of_sale',
          allowedRoles: [ROLES.ADMIN, ROLES.POS]
        },
        {
          key: '/orders',
          label: 'Quản Lý Đơn Hàng OMS',
          icon: 'receipt_long',
          allowedRoles: [ROLES.ADMIN, ROLES.POS]
        }
      ]
    },
    {
      title: 'KHÚC XẠ & LÂM SÀNG',
      allowedRoles: [ROLES.ADMIN, ROLES.OPTOMETRY],
      items: [
        {
          key: '/optometry-appointments',
          label: 'Lịch hẹn đo khúc xạ',
          icon: 'calendar_month',
          allowedRoles: [ROLES.ADMIN, ROLES.OPTOMETRY]
        },
        {
          key: '/optometry',
          label: 'Hồ sơ toa kính OD/OS',
          icon: 'medical_information',
          allowedRoles: [ROLES.ADMIN, ROLES.OPTOMETRY]
        }
      ]
    },
    {
      title: 'LAB GIA CÔNG',
      allowedRoles: [ROLES.ADMIN, ROLES.LAB],
      items: [
        {
          key: '/lab',
          label: 'Điều phối mài lắp kính',
          icon: 'precision_manufacturing',
          allowedRoles: [ROLES.ADMIN, ROLES.LAB]
        },
        {
          key: '/lab-qc',
          label: 'Kiểm tra chất lượng (QC)',
          icon: 'verified',
          allowedRoles: [ROLES.ADMIN, ROLES.LAB]
        }
      ]
    },
    {
      title: 'KHO VẬN & VẬT TƯ',
      allowedRoles: [ROLES.ADMIN, ROLES.LAB],
      items: [
        {
          key: '/inventory',
          label: 'Tồn kho chi nhánh',
          icon: 'inventory_2',
          allowedRoles: [ROLES.ADMIN, ROLES.LAB]
        },
        {
          key: '/stock-transfer',
          label: 'Nhập / Xuất / Chuyển kho',
          icon: 'move_up',
          allowedRoles: [ROLES.ADMIN, ROLES.LAB]
        },
        {
          key: '/stock-vouchers',
          label: 'Phiếu kho & hàng lỗi',
          icon: 'inventory',
          allowedRoles: [ROLES.ADMIN, ROLES.LAB]
        }
      ]
    },
    {
      title: 'KHÁCH HÀNG & BẢO HÀNH',
      allowedRoles: [ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY],
      items: [
        {
          key: '/crm',
          label: 'Hồ sơ khách hàng CRM',
          icon: 'badge',
          allowedRoles: [ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY]
        },
        {
          key: '/warranty',
          label: 'Phiếu bảo hành & Đổi trả',
          icon: 'assignment_return',
          allowedRoles: [ROLES.ADMIN, ROLES.POS]
        }
      ]
    },
    {
      title: 'QUẢN TRỊ & BÁO CÁO',
      allowedRoles: [ROLES.ADMIN],
      items: [
        {
          key: '/reports',
          label: 'Báo cáo doanh thu & KPIs',
          icon: 'analytics',
          allowedRoles: [ROLES.ADMIN]
        },
        {
          key: '/settings',
          label: 'Cấu hình hệ thống & Phân quyền',
          icon: 'settings',
          allowedRoles: [ROLES.ADMIN]
        },
        {
          key: '/catalog-management',
          label: 'Danh mục, thương hiệu & địa điểm',
          icon: 'category',
          allowedRoles: [ROLES.ADMIN]
        },
        {
          key: '/vouchers',
          label: 'Quản lý Voucher & Khuyến mãi',
          icon: 'local_activity',
          allowedRoles: [ROLES.ADMIN]
        }
      ]
    }
  ];

  // Strictly filter navigation sections and items by the logged in role
  const navSections = allNavSections
    .filter(section => !section.allowedRoles || section.allowedRoles.includes(currentRole))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.allowedRoles || item.allowedRoles.includes(currentRole))
    }))
    .filter(section => section.items.length > 0);

  const handleNavClick = (key) => {
    navigate(key);
  };

  return (
    <div className="bg-[#f9f9ff] font-sans text-[#111c2d] min-h-screen flex selection:bg-[#c6e7ff]">
      {/* ---------------- 1. FIXED LEFT SIDEBAR ---------------- */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#f0f3ff] z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-[#d8e3fb]/50">
        {/* Brand Header */}
        <div
          className="h-16 px-6 flex items-center gap-3 bg-[#f0f3ff] border-b border-[#e7eeff] cursor-pointer select-none"
          onClick={() => navigate('/dashboard')}
        >
          <div className="w-9 h-9 rounded-xl bg-[#086288] flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-[#cae6ff] text-[20px]">eyeglasses</span>
          </div>
          <div>
            <span className="text-lg text-[#004967] font-bold block leading-tight">OptiVision</span>
            <span className="text-[10px] text-[#19648f] tracking-widest uppercase block font-bold">
              Clinical &amp; Retail
            </span>
          </div>
        </div>

        {/* Navigation Menu (Filtered by Current User's Role) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx}>
              <div className="px-3 mb-1.5 text-[11px] text-[#40484e] font-bold uppercase tracking-wider">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const isActive =
                    location.pathname === item.key ||
                    (item.key === '/dashboard' && location.pathname === '/');
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavClick(item.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#086288] text-white font-bold shadow-sm'
                          : 'text-[#40484e] hover:bg-[#dee8ff] hover:text-[#111c2d]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="p-3 border-t border-[#e7eeff] bg-[#e7eeff]/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setAvatarDraft(user?.avatarUrl || DEFAULT_AVATAR_URL);
              setAvatarModalOpen(true);
            }}
            title="Nhấn để cập nhật ảnh đại diện"
            className="flex items-center gap-2 overflow-hidden text-left hover:bg-white/60 rounded-xl p-1 -m-1 transition cursor-pointer flex-1"
          >
            <img
              src={user?.avatarUrl || DEFAULT_AVATAR_URL}
              alt={user?.staffName || 'Nhân sự OptiVision'}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR_URL;
              }}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#cde5f5] bg-white flex-shrink-0"
            />
            <div className="overflow-hidden leading-tight">
              <div className="text-xs font-bold text-[#111c2d] truncate">
                {user?.staffName || 'Nhân sự OptiVision'}
              </div>
              <div className="text-[10px] text-[#086288] font-semibold truncate">
                {user?.roleLabel || 'Nhân viên'} · Đổi avatar
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất ca"
            className="p-1.5 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>

      {/* ---------------- 2. MAIN CONTAINER (PL-72) ---------------- */}
      <div className="pl-72 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="fixed top-0 left-72 right-0 h-16 bg-[#f9f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 sm:px-8 flex items-center justify-between gap-4 border-b border-[#e7eeff]">
          {/* Branch Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={locationsLoading || locations.length === 0}
                aria-label="Chọn địa điểm"
                className="appearance-none bg-[#e7eeff] hover:bg-[#dee8ff] text-[#111c2d] text-xs font-bold pl-8 pr-7 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#086288] cursor-pointer transition-colors"
              >
                {locations.map((location) => (
                  <option key={location.code} value={location.code}>
                    {location.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#004967] text-[18px] pointer-events-none">
                store
              </span>
              <span className="material-symbols-outlined absolute right-2 top-2.5 text-[#40484e] text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-4">
            {/* Quick POS Order Button (for Admin & POS only) */}
            {(currentRole === ROLES.ADMIN || currentRole === ROLES.POS) && (
              <button
                type="button"
                onClick={() => navigate('/pos')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#086288] hover:bg-[#004967] text-white text-xs font-bold shadow-[0_4px_14px_rgba(8,98,136,0.2)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Tạo đơn POS nhanh</span>
              </button>
            )}

            {/* Quick Optometry Room Button (for Optometry) */}
            {currentRole === ROLES.OPTOMETRY && (
              <button
                type="button"
                onClick={() => navigate('/optometry')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-[0_4px_14px_rgba(2,132,199,0.2)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">medical_services</span>
                <span>Phòng khám khúc xạ</span>
              </button>
            )}

            {/* Quick Lab Workstation Button (for Lab) */}
            {currentRole === ROLES.LAB && (
              <button
                type="button"
                onClick={() => navigate('/lab')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-bold shadow-[0_4px_14px_rgba(15,118,110,0.2)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
                <span>Xưởng mài lắp Lab</span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              type="button"
              data-testid="portal-notification-bell"
              aria-label="Thông báo giao dịch"
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-xl text-[#40484e] hover:bg-[#e7eeff] hover:text-[#111c2d] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span
                  data-testid="portal-notification-badge"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-[#dee8ff]" />

            {/* User Profile Dropdown Menu */}
            <div className="relative">
              <div
                className="flex items-center gap-2.5 cursor-pointer select-none p-1 rounded-xl hover:bg-[#f0f3ff] transition-colors"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-[#004967] text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs text-[#111c2d] font-bold leading-tight">
                    {user?.staffName || 'Nhân sự OptiVision'}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#8fcdfd]/30 text-[#005881] text-[10px] font-bold w-fit leading-tight mt-0.5">
                    {user?.roleLabel || 'Nhân viên'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#70787f]">
                  {isUserMenuOpen ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {/* Dropdown Box */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 top-12 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-2 text-xs">
                    <div className="p-2 border-b border-slate-100 mb-1">
                      <div className="font-bold text-[#111c2d]">{user?.staffName || 'Nhân sự'}</div>
                      <div className="text-[11px] text-[#70787f]">{user?.email || 'nhansu@optivision.vn'}</div>
                      <div className="text-[10px] font-mono text-[#004967] mt-0.5">
                        Mã định danh: {user?.employeeCode || 'NV-OPT-2026'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-semibold cursor-pointer text-left"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Đăng Xuất Tài Khoản</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="pt-16 flex-1 flex flex-col">
          <Outlet context={{ selectedBranch, locations, setSelectedBranch }} />
        </div>
      </div>

      {/* Real Persisted Notification Drawer (GLAS-25) */}
      <Drawer
        title={
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-[#004967]">Hộp Thư Thông Báo Giao Dịch</div>
              <div className="text-[11px] text-[#70787f] font-normal">
                Chủ sở hữu: {user?.staffName} · Polling {Math.round(pollIntervalMs / 1000)}s · Chưa đọc: {unreadCount}
              </div>
            </div>
          </div>
        }
        placement="right"
        width={440}
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilterUnreadOnly(false);
                  loadInbox(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  !filterUnreadOnly ? 'bg-[#086288] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterUnreadOnly(true);
                  loadInbox(true);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterUnreadOnly ? 'bg-[#086288] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Chưa đọc ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadInbox(filterUnreadOnly)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Làm mới
              </button>
              <button
                type="button"
                disabled={markingAllRead || unreadCount === 0}
                onClick={handleMarkAllAsRead}
                className="px-2.5 py-1 rounded-lg bg-[#e7eeff] text-[#004967] text-xs font-bold hover:bg-[#dee8ff] disabled:opacity-50 cursor-pointer"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          </div>

          {currentRole === ROLES.ADMIN && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#f0f3ff] border border-[#d8e3fb] text-[11px]">
              <span className="text-[#40484e]">Quản trị kênh &amp; cổng SMS/Email:</span>
              <button
                type="button"
                onClick={() => {
                  setNotificationDrawerOpen(false);
                  navigate('/settings?tab=notifications');
                }}
                className="font-bold text-[#004967] hover:underline cursor-pointer"
              >
                Mở cấu hình kênh thông báo →
              </button>
            </div>
          )}

          {notifError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {notifError}
            </div>
          )}

          {notifLoading && notifications.length === 0 ? (
            <div className="py-12 flex justify-center">
              <Spin tip="Đang tải thông báo…" />
            </div>
          ) : notifications.length === 0 ? (
            <Empty
              description={filterUnreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo giao dịch nào'}
              className="py-8"
            />
          ) : (
            <div className="space-y-2.5">
              {notifications.map((item) => {
                const cat = categoryMeta(item.category);
                const inApp = channelStatusBadge('In-App', item.inAppStatus, 'Lưu DB');
                const actionTarget = resolvePortalActionRoute(item.actionRoute, currentRole);
                return (
                  <div
                    key={item.id}
                    data-testid={`portal-notif-item-${item.id}`}
                    className={`p-3 rounded-xl border transition-all ${
                      item.read
                        ? 'bg-white border-slate-200'
                        : 'bg-[#f0f7ff] border-[#086288] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag color={cat.color} className="!text-[10px] !m-0">{cat.label}</Tag>
                        {item.referenceCode && (
                          <span className="text-[10px] font-mono font-bold text-[#004967] bg-[#e7eeff] px-1.5 py-0.5 rounded">
                            {item.referenceCode}
                          </span>
                        )}
                        {!item.read ? (
                          <Tag color="red" className="!text-[10px] !m-0">Chưa đọc</Tag>
                        ) : (
                          <Tag className="!text-[10px] !m-0">Đã đọc</Tag>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-[#111c2d] mt-1.5">{item.title}</div>
                    <p className="text-xs text-[#40484e] mt-1 mb-2 leading-relaxed">{item.message}</p>

                    <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-[#70787f]">
                      <div className="flex items-center gap-1.5">
                        <Tag color={inApp.color} className="!text-[10px] !m-0">{inApp.text}</Tag>
                        <span>{formatNotificationTime(item.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(item)}
                            className="px-2 py-1 rounded-md bg-white border border-[#086288] text-[#086288] hover:bg-[#e7eeff] text-[11px] font-semibold cursor-pointer"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                        {actionTarget && (
                          <button
                            type="button"
                            onClick={() => handleOpenNotificationTarget(item)}
                            className="px-2 py-1 rounded-md bg-[#086288] text-white hover:bg-[#004967] text-[11px] font-semibold cursor-pointer"
                          >
                            Mở màn hình
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Drawer>

      <Modal
        title="Cập Nhật Ảnh Đại Diện Nhân Sự"
        open={avatarModalOpen}
        onCancel={() => !avatarSaving && setAvatarModalOpen(false)}
        confirmLoading={avatarSaving}
        okText="Lưu ảnh đại diện"
        cancelText="Đóng"
        onOk={async () => {
          const val = (avatarDraft || '').trim();
          if (val && !isValidImageInput(val)) {
            message.error('Link ảnh không hợp lệ (cần bắt đầu bằng http://, https:// hoặc tải tệp ảnh).');
            return;
          }
          setAvatarSaving(true);
          try {
            await updateAvatar(val || DEFAULT_AVATAR_URL);
            message.success('Đã cập nhật ảnh đại diện thành công!');
            setAvatarModalOpen(false);
          } catch (err) {
            message.error(err.message || 'Không thể lưu ảnh đại diện.');
          } finally {
            setAvatarSaving(false);
          }
        }}
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-[#f0f3ff] border border-[#dee8ff]">
            <img
              src={avatarDraft || DEFAULT_AVATAR_URL}
              alt="Xem trước avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = DEFAULT_AVATAR_URL;
              }}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-[#086288] bg-white shrink-0"
            />
            <div className="text-xs space-y-1">
              <div className="font-bold text-[#111c2d]">{user?.staffName || 'Nhân sự'}</div>
              <div className="text-[#086288] font-semibold">{user?.roleLabel}</div>
              <button
                type="button"
                onClick={() => setAvatarDraft(DEFAULT_AVATAR_URL)}
                className="text-[11px] text-[#086288] underline cursor-pointer"
              >
                Khôi phục ảnh mặc định
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Dán link ảnh (URL) hoặc tải tệp từ máy</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={avatarDraft.startsWith('data:image/') ? '' : avatarDraft}
                onChange={(e) => setAvatarDraft(e.target.value)}
                placeholder={avatarDraft.startsWith('data:image/') ? 'Đã chọn ảnh từ máy (hoặc nhập link mới)' : 'https://...'}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#086288]"
              />
              <label className="px-3 py-2 rounded-lg bg-[#e7eeff] hover:bg-[#dee8ff] text-[#004967] text-xs font-bold cursor-pointer shrink-0">
                Tải ảnh
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const compressed = await compressImageToDataUrl(file, 256, 0.85);
                      setAvatarDraft(compressed);
                    } catch (err) {
                      message.error(err.message);
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
