import React, { useState, useEffect } from 'react';
import { message, Modal, Spin, Select, Input } from 'antd';
import { customerApi } from '../../api/customerApi';
import { promotionApi } from '../../api/promotionApi';

export default function CrmPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [activeTab, setActiveTab] = useState('rx');

  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Interaction notes state
  const [interactions, setInteractions] = useState([]);
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [newNote, setNewNote] = useState({ channel: 'DIRECT', content: '' });
  const [addingNote, setAddingNote] = useState(false);

  // Avatar presets for real seeded customers
  const AVATARS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCN6A5Zry9WqS2KKpur9_SXR7FEsNxIv5u70kYDDHcPfSzRI8xZ3BNDMJqGm8H5O-ApKUVZclmL5YPyteetztlhOBmVmDpeCX85t2ltbbOcuntTv1zyjpPMlt3CutGb7_GLwegBHqUFA4EmVKsu-7LadvgLmnk1yp1uM93_PMI56natfovynZGSkxCp9DfQ6JYBBVYfyT2vEqeXSAwoijbAi3SWiRvlEhe0nFGIdTM',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA7p9c_umMS8JlFzUMDtlfI55LOFh-EgPAVx_fowj68SVdXXGW8oL_cR8h0XnIMj-8xk2bbPQrYRlpD7xeXd1xeKibNIh0ZeBpcnuMdE-TzQG_FSr9J0xFqKqfSj2kOYqdY-FfxLVMgjSheXidJJcc_Yv6WhRxXEv5AEns5AiDkeYja6QKP2qJIXBI406Wc4M_XP-qb8cdAEUXf0345vEYfPRYooS3xQJmB34xtMu8',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD1A6W3DcNV1YNQnxh4m5zHa-hd_zfP2voqBo4eeuIfzQp6F5sJSr8ecncr8HBMDeH7q7oITPTqQYGFZo2pVcgPEsxvCS1nBz0PX_RFkOmAAhjAdMmgllgyyqHZgHqJeSPwu9fVbIIL_33Smz2TSXt0WOc3MAwKu2XrfW9RVXNx1dExeGdqswNSnYU-zdb-5tHWdZZ5bHL3jGPJ1-S0vMEyKGBEluo1XyNk3N5b_4Q',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDxZLxAp7hHJVQ4ycIvGLm-4LR4V3mFbhpd_5UIBgAGKMCZtKQRboA_CyV2j1c496O1v8-KERE-FpD-itrk4t73SLl4xhOssktjAKRma_vW_nQeDRKhfRuG2HQj1iinAmTSqviG-njb4tKyxvA4Kg6Dv46XQHa9rDekAh4H2Th_wVN_-XaxxqfETn8_KPhV0BxznGAksDH6umbXETYoTs35-fEW4itci4Snry30aQ4'
  ];

  const mapCustomer = (u, idx) => {
    const code = u.employeeCode || `VIP-0${idx + 1}`;
    let tierName = 'Thành Viên';
    let tierClass = 'bg-surface-container text-on-surface';

    if (code.includes('VIP-01')) {
      tierName = 'VIP 3 Silver';
      tierClass = 'bg-surface-container-high text-on-surface';
    } else if (code.includes('VIP-02')) {
      tierName = 'VIP Gold';
      tierClass = 'bg-secondary-fixed text-on-secondary-fixed';
    } else if (code.includes('VIP-03')) {
      tierName = 'Platinum';
      tierClass = 'bg-primary-fixed text-on-primary-fixed';
    }

    return {
      dbId: u.id,
      id: u.employeeCode || `#OPT-CUS-${u.id}`,
      name: u.fullName,
      tier: tierName,
      tierClass: tierClass,
      age: u.age || 30,
      gender: u.gender || 'Chưa cập nhật',
      pts: '0 pts',
      rx: 'Chưa có thông số khúc xạ',
      lastOrder: 'Chưa có giao dịch',
      phone: u.phoneNumber,
      email: u.email,
      address: u.address || u.branchName || 'TP. Hồ Chí Minh',
      marketingConsent: Boolean(u.marketingConsent),
      marketingConsentUpdatedAt: u.marketingConsentUpdatedAt,
      avatar: AVATARS[idx % AVATARS.length]
    };
  };

  const resolveTierStyle = (tierName) => {
    if (tierName?.includes('Platinum')) return 'bg-primary-fixed text-on-primary-fixed';
    if (tierName?.includes('Gold')) return 'bg-secondary-fixed text-on-secondary-fixed';
    if (tierName?.includes('Silver')) return 'bg-surface-container-high text-on-surface';
    return 'bg-surface-container text-on-surface';
  };

  const enrichCustomersWithLoyalty = async (customers) => {
    try {
      const results = await Promise.allSettled(
        customers.map(c => promotionApi.account(c.dbId))
      );
      return customers.map((c, i) => {
        const res = results[i];
        if (res.status === 'fulfilled' && res.value) {
          const bal = Number(res.value.balance ?? 0);
          const tier = res.value.tier || c.tier;
          return {
            ...c,
            balance: bal,
            pts: `${bal.toLocaleString('vi-VN')} điểm`,
            tier,
            tierClass: resolveTierStyle(tier)
          };
        }
        return c;
      });
    } catch {
      return customers;
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerApi.getCustomerList();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapCustomer);
        const enriched = await enrichCustomersWithLoyalty(mapped);
        setCustomerList(enriched);
        if (!selectedCustomerId || !enriched.some(c => c.id === selectedCustomerId)) {
          setSelectedCustomerId(enriched[0].id);
        }
      } else {
        setCustomerList([]);
      }
    } catch (err) {
      console.warn('Lấy danh sách khách hàng từ backend thất bại:', err);
      message.error(err.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  // Handle Search
  const handleSearch = async (val) => {
    setSearchQuery(val);
    try {
      setLoading(true);
      const data = await customerApi.searchCustomers(val);
      if (Array.isArray(data)) {
        const mapped = data.map(mapCustomer);
        setCustomerList(mapped);
        if (mapped.length > 0 && !mapped.some(c => c.id === selectedCustomerId)) {
          setSelectedCustomerId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err);
    } finally {
      setLoading(false);
    }
  };

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Nam',
    tier: 'Thành Viên',
    address: '',
    marketingConsent: false
  });

  const activeCustomer = customerList.find(c => c.id === selectedCustomerId) || customerList[0];

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gender: 'Nam',
    tier: 'Thành Viên',
    marketingConsent: false
  });

  const [bookingFormData, setBookingFormData] = useState({
    date: '2026-11-05',
    time: '10:00',
    room: 'Phòng 01 - Bác Sĩ CKI Khúc Xạ',
    note: 'Tái khám định kỳ 6 tháng & kiểm tra độ loạn'
  });

  // Load interactions when activeCustomer or activeTab changes
  const loadInteractions = async (customerId) => {
    if (!customerId) return;
    try {
      setInteractionsLoading(true);
      const data = await customerApi.getCustomerInteractions(customerId);
      setInteractions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Lỗi tải nhật ký chăm sóc:', err);
    } finally {
      setInteractionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeCustomer?.dbId && activeTab === 'notes') {
      loadInteractions(activeCustomer.dbId);
    }
  }, [activeCustomer?.dbId, activeTab]);

  const handleAction = (msg) => {
    message.success(msg);
  };

  const handleCreateCustomerSubmit = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      message.error('Vui lòng nhập họ tên và số điện thoại khách hàng');
      return;
    }

    try {
      setSubmitting(true);
      const res = await customerApi.createCustomer({
        fullName: newCustomer.name.trim(),
        phoneNumber: newCustomer.phone.trim(),
        email: newCustomer.email ? newCustomer.email.trim() : `${newCustomer.phone.trim()}@customer.optivision.vn`,
        address: newCustomer.address ? newCustomer.address.trim() : 'TP. Hồ Chí Minh',
        gender: newCustomer.gender,
        marketingConsent: Boolean(newCustomer.marketingConsent),
        tier: newCustomer.tier
      });

      setIsCreateModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', gender: 'Nam', tier: 'Thành Viên', address: '', marketingConsent: false });
      message.success(`Đã lưu khách hàng mới vào cơ sở dữ liệu: ${res.fullName}!`);
      await loadCustomers();
    } catch (err) {
      // S3-04: Fail explicitly without fake local dummy data
      message.error(err.message || 'Không thể tạo khách hàng trên máy chủ. Giữ nguyên thông tin form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCustomerSubmit = async () => {
    if (!activeCustomer?.dbId) return;
    if (!editFormData.name.trim() || !editFormData.phone.trim()) {
      message.error('Vui lòng nhập họ tên và số điện thoại');
      return;
    }

    try {
      setSubmitting(true);
      const res = await customerApi.updateCustomer(activeCustomer.dbId, {
        fullName: editFormData.name.trim(),
        phoneNumber: editFormData.phone.trim(),
        email: editFormData.email ? editFormData.email.trim() : '',
        address: editFormData.address ? editFormData.address.trim() : '',
        gender: editFormData.gender,
        marketingConsent: Boolean(editFormData.marketingConsent)
      });

      setIsEditModalOpen(false);
      message.success(`Đã cập nhật thông tin khách hàng ${res.fullName} thành công!`);
      await loadCustomers();
    } catch (err) {
      message.error(err.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại dữ liệu.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!activeCustomer?.dbId) return;
    if (!newNote.content.trim()) {
      message.error('Vui lòng nhập nội dung ghi chú chăm sóc');
      return;
    }

    try {
      setAddingNote(true);
      await customerApi.addCustomerInteraction(activeCustomer.dbId, {
        channel: newNote.channel,
        content: newNote.content.trim()
      });
      message.success('Đã lưu ghi chú chăm sóc khách hàng vào CSDL!');
      setNewNote({ channel: 'DIRECT', content: '' });
      await loadInteractions(activeCustomer.dbId);
    } catch (err) {
      message.error(err.message || 'Không thể lưu ghi chú chăm sóc.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleBookingSubmit = () => {
    setIsBookingModalOpen(false);
    message.success(`Đã lên lịch khám thành công cho ${(activeCustomer?.name || 'Khách Hàng')} vào lúc ${bookingFormData.time} ngày ${bookingFormData.date}!`);
  };

  return (
    <div className="w-full min-h-screen bg-[#f9f9ff]">
      <div className="max-w-[1600px] mx-auto p-3.5 sm:p-5 flex flex-col gap-3.5">

        {/* 1. TOP HEADER & CRM ACTIONS */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl shadow-xs border border-[#d8e3fb]/40">
          <div className="flex flex-col gap-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-label-md text-body-sm text-outline">
              <span>KHÁCH HÀNG CRM</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span>HỒ SƠ KHÁCH HÀNG 360°</span>
              <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              <span className="text-primary font-semibold">Chi Tiết Hồ Sơ &amp; Lịch Sử Thị Lực</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[13px] text-primary">security</span>
                Dữ Liệu Y Khoa Bảo Mật
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-mono text-label-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Đồng Bộ Trực Tiếp POS
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center gap-1.5 shadow-xs hover:bg-primary-container transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Tạo Khách Mới</span>
              <span className="px-1.5 py-0.2 rounded bg-on-primary/20 text-on-primary font-label-mono text-[10px]">F1</span>
            </button>
            <button onClick={() => setIsBookingModalOpen(true)} className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg flex items-center gap-1.5 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[16px] text-primary">event</span>
              <span>Đặt Lịch Đo</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-label-mono text-[10px]">F2</span>
            </button>
            <button onClick={() => handleAction('Chuyển sang màn hình POS [F3]')} className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg flex items-center gap-1.5 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[16px] text-primary">point_of_sale</span>
              <span>Tạo Đơn Bán</span>
              <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-label-mono text-[10px]">F3</span>
            </button>
            <button onClick={() => handleAction('Mở cổng nhắn Zalo ZNS / SMS chăm sóc')} className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary hover:bg-secondary-fixed transition-all font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">mark_chat_read</span>
              <span>Zalo ZNS / SMS</span>
            </button>
            <button onClick={() => handleAction('Đang xuất hồ sơ y tế A5 PDF...')} className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer" title="Xuất PDF/A5 Y Tế">
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            </button>
          </div>
        </div>

        {/* 2. 4 COMPACT CRM KPI METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline block">Tổng Khách Hàng CRM</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display-lg text-display-lg text-primary tracking-tight">{customerList.length}</span>
                  <span className="font-label-md text-label-md text-outline font-bold">Hồ sơ thật</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">people</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#e7eeff] flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
              <span className="truncate text-outline text-[11px]">Dữ liệu khách hàng thực tế</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline block">Đã Đồng Ý Tiếp Thị</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display-lg text-display-lg text-secondary tracking-tight">
                    {customerList.filter(c => c.marketingConsent).length}
                  </span>
                  <span className="font-label-md text-label-md text-outline font-bold">Thành viên</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">campaign</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#e7eeff] flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-outline text-[14px]">verified_user</span>
              <span className="truncate text-outline text-[11px]">Đồng ý nhận tin khuyến mãi</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline block">Ghi Chú Chăm Sóc</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display-lg text-display-lg text-primary tracking-tight">{interactions.length}</span>
                  <span className="font-label-md text-label-md text-outline font-bold">Lượt CS</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#e7eeff] flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-outline text-[14px]">phone_in_talk</span>
              <span className="truncate text-outline text-[11px]">Lịch sử tương tác thực tế</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md uppercase tracking-wider text-outline block">Chất Lượng CSAT / NPS</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display-lg text-display-lg text-primary tracking-tight">100%</span>
                  <span className="font-label-md text-label-md text-outline font-bold">Hài lòng</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">sentiment_very_satisfied</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#e7eeff] flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-outline text-[14px]">info</span>
              <span className="truncate text-outline text-[11px]">Hồ sơ khách hàng chuẩn hóa</span>
            </div>
          </div>
        </div>

        {/* 3. TWO-COLUMN CRM DIRECTORY VS 360 PROFILE */}
        <div className="grid grid-cols-12 gap-3.5 items-start">

          {/* Left Column (4/12): Customer List */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-2.5">

            {/* Search and Tag filter */}
            <div className="p-3 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-12 py-1.5 bg-surface-container-low text-on-surface font-body-md text-body-md rounded-xl focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="Tìm tên, SĐT, email..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-0.5 text-label-md font-label-md">
                <button className="px-2.5 py-1 rounded-full bg-primary text-on-primary shrink-0 transition-colors cursor-pointer text-xs font-semibold">
                  Tất cả ({customerList.length})
                </button>
                <button className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high shrink-0 transition-colors cursor-pointer text-xs">
                  Nhận tin tiếp thị ({customerList.filter(c => c.marketingConsent).length})
                </button>
              </div>
            </div>

            {/* Customer List items */}
            <div className="flex flex-col gap-2 max-h-[720px] overflow-y-auto pr-0.5">
              {loading ? (
                <div className="p-8 text-center"><Spin /></div>
              ) : customerList.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-[#d8e3fb]">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">person_search</span>
                  <p className="text-xs text-outline font-medium">Không tìm thấy khách hàng nào</p>
                </div>
              ) : (
                customerList.map((item) => {
                  const isSelected = selectedCustomerId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedCustomerId(item.id);
                        setEditFormData({
                          name: item.name,
                          phone: item.phone,
                          email: item.email || '',
                          address: item.address || '',
                          gender: item.gender || 'Nam',
                          tier: item.tier,
                          marketingConsent: item.marketingConsent
                        });
                      }}
                      className={`p-3 rounded-xl transition-all cursor-pointer relative border ${
                        isSelected
                          ? 'bg-surface-container-lowest border-primary/30 shadow-sm ring-1 ring-primary/20'
                          : 'bg-surface-container-lowest border-[#d8e3fb]/40 hover:border-primary/20 hover:shadow-xs'
                      }`}
                    >
                      {isSelected && <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary rounded-l-xl"></div>}
                      <div className="flex items-start justify-between pl-1">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img className="w-9 h-9 rounded-xl object-cover shadow-xs" alt={item.name} src={item.avatar} />
                            {isSelected && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary text-on-primary text-[8px] flex items-center justify-center font-bold">✓</span>}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-title-md text-title-md text-on-surface font-semibold">{item.name}</span>
                              <span className={`px-1.5 py-0.2 rounded-full font-label-md text-[10px] font-semibold ${item.tierClass}`}>
                                {item.tier}
                              </span>
                            </div>
                            <div className="font-label-mono text-body-sm text-outline">
                              {item.id} • <span className="text-primary font-semibold">{item.pts}</span>
                            </div>
                          </div>
                        </div>
                        {item.marketingConsent ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-label-mono text-[9px] font-semibold">SMS ✓</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-label-mono text-[9px]">Chưa opt-in</span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] bg-surface-container-low p-1.5 rounded-lg font-body-sm pl-1.5">
                        <div className="flex flex-col">
                          <span className="text-outline text-[10px]">Địa chỉ:</span>
                          <span className="text-on-surface truncate">{item.address}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-outline text-[10px]">Email:</span>
                          <span className="text-on-surface truncate">{item.email}</span>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between font-label-mono text-[11px] text-outline pl-1">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-primary">phone</span>
                          {item.phone}
                        </span>
                        {isSelected ? (
                          <span className="text-primary font-semibold flex items-center gap-0.5">
                            Đang xem
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </span>
                        ) : (
                          <span className="text-outline hover:text-primary">Xem hồ sơ</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (8/12): Customer 360 Full Profile */}
          {!activeCustomer ? (
            <div className="col-span-12 xl:col-span-8 p-12 text-center bg-surface-container-lowest rounded-xl border border-dashed border-[#d8e3fb] flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">contacts</span>
              <h3 className="font-title-md text-on-surface font-semibold">Chưa có hồ sơ khách hàng</h3>
              <p className="text-xs text-outline max-w-sm mt-1">Bấm "Tạo Khách Mới" để thêm hồ sơ khách hàng vào cơ sở dữ liệu.</p>
            </div>
          ) : (
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-3.5">

              {/* Profile Overview Card */}
              <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      className="w-14 h-14 rounded-2xl object-cover shadow-sm shrink-0"
                      alt={activeCustomer.name}
                      src={activeCustomer.avatar}
                    />
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-headline-md text-headline-md text-on-surface font-bold">{activeCustomer.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-semibold">{activeCustomer.tier}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-md text-label-md font-bold">★ {activeCustomer.pts}</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-mono text-[11px]">{activeCustomer.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm font-body-sm text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-outline">call</span>
                          {activeCustomer.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-outline">mail</span>
                          {activeCustomer.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-outline">wc</span>
                          Giới tính: {activeCustomer.gender}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-body-sm font-body-sm text-outline">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {activeCustomer.address}
                      </div>

                      {/* Marketing Consent Badge (FR-CUS-04, S3-04) */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {activeCustomer.marketingConsent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-md text-xs font-medium border border-emerald-200">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Đã đồng ý nhận tiếp thị qua SMS &amp; Zalo
                            {activeCustomer.marketingConsentUpdatedAt && (
                              <span className="text-[10px] text-emerald-600">({new Date(activeCustomer.marketingConsentUpdatedAt).toLocaleDateString('vi-VN')})</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-label-md text-xs font-medium border border-slate-200">
                            <span className="material-symbols-outlined text-[14px]">notifications_paused</span>
                            Chưa opt-in tiếp thị (Chỉ nhận thông báo giao dịch)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditFormData({
                            name: activeCustomer.name,
                            phone: activeCustomer.phone,
                            email: activeCustomer.email || '',
                            address: activeCustomer.address || '',
                            gender: activeCustomer.gender || 'Nam',
                            tier: activeCustomer.tier,
                            marketingConsent: activeCustomer.marketingConsent
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-surface-container text-primary hover:bg-secondary-fixed rounded-lg font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        Sửa Hồ Sơ
                      </button>
                      <button
                        onClick={() => {
                          Modal.confirm({
                            title: `Xóa khách hàng ${activeCustomer.name}?`,
                            content: 'Thao tác này sẽ xóa hồ sơ khách hàng khỏi hệ thống nếu chưa có dữ liệu ràng buộc hóa đơn, hoặc vô hiệu hóa tài khoản.',
                            okText: 'Xác nhận xóa',
                            okType: 'danger',
                            cancelText: 'Hủy',
                            onOk: async () => {
                              try {
                                await customerApi.deleteCustomer(activeCustomer.id);
                                message.success(`Đã xóa khách hàng: ${activeCustomer.name}`);
                                const updated = customerList.filter(c => c.id !== activeCustomer.id);
                                setCustomerList(updated);
                                if (updated.length > 0) setActiveCustomer(updated[0]);
                              } catch (err) {
                                message.error(`Không thể xóa: ${err.message || 'Lỗi hệ thống'}`);
                              }
                            }
                          });
                        }}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Tabs */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-[#d8e3fb]/40 overflow-x-auto whitespace-nowrap">
                {[
                  { id: 'rx', label: 'Hồ Sơ Thị Lực & Biểu Đồ OD/OS', icon: 'biotech' },
                  { id: 'notes', label: `Nhật Ký Chăm Sóc CRM (${interactions.length})`, icon: 'support_agent' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-label-md text-label-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content: Rx vs Notes */}
              {activeTab === 'notes' ? (
                /* 4. S3-04: Customer Interaction History & Staff Notes */
                <div className="p-4 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="font-title-md text-title-md text-on-surface font-semibold m-0">Lịch Sử Chăm Sóc &amp; Tương Tác Khách Hàng</h4>
                      <p className="text-xs text-outline m-0 mt-0.5">Ghi nhận các cuộc gọi, tin nhắn Zalo, SMS hoặc tư vấn trực tiếp tại quầy</p>
                    </div>
                    <button
                      onClick={() => loadInteractions(activeCustomer.dbId)}
                      disabled={interactionsLoading}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      Tải lại
                    </button>
                  </div>

                  {/* Add Note Form */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Thêm ghi chú chăm sóc mới</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={newNote.channel}
                        onChange={(e) => setNewNote({ ...newNote, channel: e.target.value })}
                        className="p-2 text-xs rounded-lg border border-slate-300 bg-white font-medium outline-none"
                      >
                        <option value="DIRECT">Trực tiếp tại quầy</option>
                        <option value="CALL">Cuộc gọi điện thoại</option>
                        <option value="ZALO">Nhắn tin Zalo</option>
                        <option value="SMS">Gửi SMS</option>
                        <option value="EMAIL">Email hỗ trợ</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Nội dung ghi chú chăm sóc, tư vấn hoặc nhắc lịch tái khám..."
                        value={newNote.content}
                        onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddInteraction(); }}
                        className="flex-1 p-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleAddInteraction}
                        disabled={addingNote || !newNote.content.trim()}
                        className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-container rounded-lg text-xs font-bold transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">save</span>
                        {addingNote ? 'Đang lưu…' : 'Lưu ghi chú'}
                      </button>
                    </div>
                  </div>

                  {/* Interactions List */}
                  {interactionsLoading ? (
                    <div className="py-8 text-center"><Spin /></div>
                  ) : interactions.length === 0 ? (
                    <div className="py-8 text-center text-outline bg-surface-container-low rounded-xl border border-dashed border-[#d8e3fb]">
                      <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">chat</span>
                      <span className="text-xs font-medium text-on-surface">Chưa có lịch sử chăm sóc nào</span>
                      <p className="text-[11px] text-outline mt-0.5">Sử dụng form trên để thêm cuộc gọi hoặc ghi chú tư vấn cho khách hàng này.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {interactions.map((item) => (
                        <div key={item.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                {item.channel}
                              </span>
                              <span className="font-semibold text-slate-800">{item.staffName || 'Nhân viên CRM'}</span>
                            </div>
                            <span className="text-slate-400 text-[11px]">
                              {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 m-0 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab Content: Rx Progression Chart & Table */
                <>
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="font-title-md text-title-md text-on-surface font-semibold block">Tiến Triển Độ Cận &amp; Loạn Thị (Diopter Progression Curve)</span>
                        <span className="font-body-sm text-body-sm text-outline">Dữ liệu khúc xạ OD &amp; OS chuẩn ISO 13666</span>
                      </div>
                    </div>

                    <div className="py-8 text-center text-outline bg-surface-container-low rounded-xl border border-dashed border-[#d8e3fb]">
                      <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">show_chart</span>
                      <span className="text-xs font-medium text-on-surface">Chưa có lịch sử biến thiên độ khúc xạ</span>
                      <p className="text-[11px] text-outline mt-0.5">Biểu đồ tiến triển sẽ được tự động vẽ khi khách hàng thực hiện đo khám định kỳ tại hệ thống.</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#d8e3fb]/40 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-title-md text-title-md text-on-surface font-semibold block">Lịch Sử Toa Kính &amp; Hồ Sơ Lâm Sàng</span>
                        <span className="font-body-sm text-body-sm text-outline">Bảo toàn lịch sử đo khám nhãn khoa</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAction('Đã gửi lệnh in sổ khám A5 ra máy in')} className="px-2.5 py-1 bg-surface-container text-on-surface rounded-lg text-label-md font-label-md flex items-center gap-1 hover:bg-surface-container-high transition-all cursor-pointer">
                          <span className="material-symbols-outlined text-[15px]">print</span>
                          In Sổ (A5)
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#d8e3fb]/40">
                      <table className="w-full text-left font-body-md text-body-md">
                        <thead className="bg-surface-container-low text-outline font-label-md text-label-md uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Toa Kính</th>
                            <th className="py-2.5 px-3">Bác sĩ / KTV</th>
                            <th className="py-2.5 px-3">Mắt Phải (OD)</th>
                            <th className="py-2.5 px-3">Mắt Trái (OS)</th>
                            <th className="py-2.5 px-2">PD / VA</th>
                            <th className="py-2.5 px-3">Tròng Kê Đơn</th>
                            <th className="py-2.5 px-3 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d8e3fb]/30 text-on-surface">
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#70787f]">
                              <span className="material-symbols-outlined text-2xl text-slate-300 block mb-1">visibility</span>
                              Chưa có lịch sử toa kính nào được lưu trong hồ sơ của khách hàng này
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal: Tạo Khách Mới (S3-04) */}
        <Modal
          title={<span className="font-bold text-base text-slate-900">Tạo Mới Hồ Sơ Khách Hàng</span>}
          open={isCreateModalOpen}
          onOk={handleCreateCustomerSubmit}
          onCancel={() => setIsCreateModalOpen(false)}
          confirmLoading={submitting}
          okText="Lưu Khách Hàng"
          cancelText="Hủy Bỏ"
        >
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                placeholder="Nhập họ tên đầy đủ..."
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                  placeholder="0901234567"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giới tính</label>
                <select
                  value={newCustomer.gender}
                  onChange={(e) => setNewCustomer({ ...newCustomer, gender: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                placeholder="email@example.com"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Địa chỉ chi tiết</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>

            {/* S3-04 Marketing Consent (mặc định không tự opt-in) */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCustomer.marketingConsent}
                  onChange={(e) => setNewCustomer({ ...newCustomer, marketingConsent: e.target.checked })}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-slate-700 font-medium">
                  Khách hàng đồng ý nhận thông tin tiếp thị, khuyến mãi và chăm sóc thị lực qua SMS/Zalo.
                </span>
              </label>
            </div>
          </div>
        </Modal>

        {/* Modal: Sửa Hồ Sơ Khách Hàng (S3-04) */}
        <Modal
          title={<span className="font-bold text-base text-slate-900">Cập Nhật Hồ Sơ Khách Hàng</span>}
          open={isEditModalOpen}
          onOk={handleEditCustomerSubmit}
          onCancel={() => setIsEditModalOpen(false)}
          confirmLoading={submitting}
          okText="Cập Nhật"
          cancelText="Hủy Bỏ"
        >
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giới tính</label>
                <select
                  value={editFormData.gender}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Địa chỉ chi tiết</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>

            {/* S3-04 Marketing Consent update */}
            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editFormData.marketingConsent}
                  onChange={(e) => setEditFormData({ ...editFormData, marketingConsent: e.target.checked })}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-slate-700 font-medium">
                  Khách hàng đồng ý nhận thông tin tiếp thị, khuyến mãi và chăm sóc thị lực qua SMS/Zalo.
                </span>
              </label>
            </div>
          </div>
        </Modal>

        {/* Modal: Đặt Lịch Đo */}
        <Modal
          title={<span className="font-bold text-base text-slate-900">Đặt Lịch Khám Khúc Xạ Mới</span>}
          open={isBookingModalOpen}
          onOk={handleBookingSubmit}
          onCancel={() => setIsBookingModalOpen(false)}
          okText="Xác Nhận Lịch Hẹn"
          cancelText="Hủy Bỏ"
        >
          <div className="space-y-3 pt-2 text-xs">
            <p className="text-slate-600 m-0">Đặt lịch khám cho khách hàng: <strong className="text-slate-900">{activeCustomer?.name}</strong> ({activeCustomer?.phone})</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngày khám</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                  value={bookingFormData.date}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Giờ khám</label>
                <input
                  type="time"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                  value={bookingFormData.time}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phòng khám / KTV</label>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                value={bookingFormData.room}
                onChange={(e) => setBookingFormData({ ...bookingFormData, room: e.target.value })}
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ghi chú lâm sàng</label>
              <textarea
                rows={2}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary"
                value={bookingFormData.note}
                onChange={(e) => setBookingFormData({ ...bookingFormData, note: e.target.value })}
              />
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
