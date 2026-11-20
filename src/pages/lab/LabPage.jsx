import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { labApi } from '../../api/labApi';
import { Alert, message, Modal } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/rolesConfig';

export default function LabPage() {
  const { user } = useAuth();
  const canOperate = [ROLES.ADMIN, ROLES.LAB].includes(user?.role);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queueOrders, setQueueOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState('');

  // Fetch live lab jobs from API
  const fetchLiveLabJobs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const jobs = await labApi.getAllLabJobs();
      if (Array.isArray(jobs)) {
        const mapped = jobs.map((j, idx) => {
          const status = (j.status || 'PENDING').toUpperCase();
          const rawStatus = ({ CREATED: 'PENDING', QUEUED: 'RECEIVED', QC_CHECK: 'QC_PENDING' })[status] || status;

          // Map status styling and human readable labels
          let statusLabel = 'Chờ nạp máy';
          let statusClass = 'bg-surface-container-high text-primary';
          let actionLabel = 'Tiếp nhận';

          if (rawStatus === 'RECEIVED') {
            statusLabel = 'Đã tiếp nhận'; actionLabel = 'Nạp Vào Máy';
          } else if (rawStatus === 'IN_PROGRESS') {
            statusLabel = 'Đang mài';
            statusClass = 'bg-primary-fixed text-on-primary-fixed';
            actionLabel = 'Xong Mài → QC';
          } else if (rawStatus === 'QC_PENDING') {
            statusLabel = 'Chờ kiểm định QC';
            statusClass = 'bg-secondary-container text-on-secondary-container';
            actionLabel = 'Sang Bàn QC';
          } else if (rawStatus === 'QC_PASSED') {
            statusLabel = 'Đã duyệt QC';
            statusClass = 'bg-secondary-fixed text-on-secondary-fixed';
            actionLabel = 'Đã Đạt QC';
          } else if (rawStatus === 'QC_FAILED') {
            statusLabel = 'Lỗi / Cần mài lại';
            statusClass = 'bg-error-container text-error';
            actionLabel = 'Mài Lại';
          }

          // Format RX summary
          let rxSummary = 'Toa khúc xạ tiêu chuẩn';
          if (j.odSphere != null || j.osSphere != null) {
            const od = j.odSphere ?? j.odSph ?? '0.00';
            const os = j.osSphere ?? j.osSph ?? '0.00';
            rxSummary = `OD ${od > 0 ? '+' : ''}${od} / OS ${os > 0 ? '+' : ''}${os}`;
          } else if (j.prescription) {
            rxSummary = `OD ${j.prescription.odSph || '0.00'} / OS ${j.prescription.osSph || '0.00'}`;
          }

          return {
            id: `#LAB-2026-0${j.id}`,
            dbId: j.id,
            rawStatus,
            tray: j.trayNumber || `Khay #${j.id}`,
            orderId: j.orderCode || (j.orderId ? `#${j.orderId}` : 'Chưa liên kết đơn'),
            customer: j.customerName || j.prescription?.customerName || 'Khách hàng',
            customerTier: j.customerTier,
            phone: j.customerPhone || '—',
            frame: j.frameName || j.frameSku || 'Không kèm gọng',
            lens: j.lensName || j.lensSku || 'Chưa có thông tin tròng',
            rxSummary,
            machine: j.machineName || 'Chưa phân máy',
            tech: j.technicianName || 'KTV Xưởng Lab',
            statusLabel,
            statusClass,
            actionLabel,
            priority: j.priority === 'URGENT' ? 'Hỏa tốc' : 'Tiêu chuẩn',
            timeRemaining: rawStatus === 'QC_PASSED' ? 'Sẵn sàng giao' : '—',
            qcNotes: j.qcNotes || '',
            raw: j
          };
        });
        setQueueOrders(mapped);
        setSyncError('');
      }
    } catch (err) {
      setSyncError(err.message || 'Không thể đồng bộ lệnh mài.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveLabJobs();
    const timer = window.setInterval(() => fetchLiveLabJobs(false), 5000);
    return () => window.clearInterval(timer);
  }, [fetchLiveLabJobs]);

  useEffect(() => {
    setSelectedOrder(previous => previous ? queueOrders.find(item => item.dbId === previous.dbId) || null : null);
  }, [queueOrders]);

  // Handle action status updates
  const handleUpdateJobStatus = async (dbId, newStatus, successMsg) => {
    if (!canOperate) { message.info('Chỉ quản lý hoặc kỹ thuật viên xưởng được thao tác gia công.'); return; }
    try {
      setLoading(true);
      await labApi.updateLabJobStatus(dbId, { status: newStatus });
      message.success(successMsg || 'Cập nhật trạng thái thành công!');
      await fetchLiveLabJobs();
    } catch (err) {
      message.error(err.message || 'Lỗi khi cập nhật trạng thái gia công');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (msg) => {
    message.success(msg);
  };

  // Dynamic status counters
  const totalCount = queueOrders.length;
  const waitingCount = queueOrders.filter((o) => ['PENDING','WAITING_PROCESS','RECEIVED'].includes(o.rawStatus)).length;
  const inProgressCount = queueOrders.filter((o) => o.rawStatus === 'IN_PROGRESS').length;
  const qcPendingCount = queueOrders.filter((o) => o.rawStatus === 'QC_PENDING').length;
  const qcPassedCount = queueOrders.filter((o) => o.rawStatus === 'QC_PASSED').length;
  const priorityCount = queueOrders.filter((o) => o.priority.includes('Hỏa tốc')).length;

  // Machine Telemetry references
  const inProgressList = queueOrders.filter((o) => o.rawStatus === 'IN_PROGRESS');
  const machine1Order = inProgressList[0] || null;
  const machine2Order = inProgressList[1] || null;
  const machine3Order = inProgressList[2] || null;

  // Filtered orders by tab and search
  const filteredOrders = queueOrders.filter((order) => {
    if (activeTab === 'waiting' && !['PENDING','WAITING_PROCESS','RECEIVED'].includes(order.rawStatus)) return false;
    if (activeTab === 'in_progress' && order.rawStatus !== 'IN_PROGRESS') return false;
    if (activeTab === 'qc_pending' && order.rawStatus !== 'QC_PENDING') return false;
    if (activeTab === 'qc_passed' && order.rawStatus !== 'QC_PASSED') return false;
    if (activeTab === 'priority' && !order.priority.includes('Hỏa tốc')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = (order.id || '').toLowerCase().includes(q);
      const matchOrderId = (order.orderId || '').toLowerCase().includes(q);
      const matchCustomer = (order.customer || '').toLowerCase().includes(q);
      const matchFrame = (order.frame || '').toLowerCase().includes(q);
      const matchLens = (order.lens || '').toLowerCase().includes(q);
      const matchTray = (order.tray || '').toLowerCase().includes(q);
      if (!matchId && !matchOrderId && !matchCustomer && !matchFrame && !matchLens && !matchTray) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#f9f8f4]">
      <div className="max-w-[1600px] mx-auto p-3.5 sm:p-5 flex flex-col gap-3.5">
        {syncError && <Alert type="error" showIcon message={syncError} />}

        {/* 1. CLEAN HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl shadow-xs border border-[#dce2d8]/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md text-outline">XƯỞNG GIA CÔNG LAB</span>
              <span className="text-outline">/</span>
              <span className="font-label-md text-label-md text-primary font-semibold">ĐIỀU PHỐI MÀI LẮP</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Máy Trạm Tự Động v4.2
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary font-bold tracking-tight">
              Điều Phối Mài Lắp Kính
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Theo dõi tiến độ cắt mài tròng tự động, tiếp nhận khay kỹ thuật và luân chuyển sang bàn kiểm tra QC.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAction('Đã mở máy quét mã vạch khay kỹ thuật [F2]')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-xs hover:bg-[#0b4d6b] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">barcode_scanner</span>
              <span>Quét Khay [F2]</span>
            </button>
            <button
              onClick={() => handleAction('Mở phiếu yêu cầu xuất phôi tròng từ tủ kho')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-label-lg text-label-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">inventory_2</span>
              <span>Xuất Phôi Kho</span>
            </button>
            <button
              onClick={() => {
                fetchLiveLabJobs();
                message.success('Đã làm mới dữ liệu lệnh mài xưởng Lab!');
              }}
              className="p-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Đồng bộ thiết bị"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin text-primary' : ''}`}>sync</span>
            </button>
          </div>
        </div>

        {/* 2. 4 CORE METRIC CARDS (Dữ liệu đếm động theo trạng thái thực tế) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Tổng Lệnh Hôm Nay */}
          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Tổng Lệnh Hôm Nay</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{totalCount}</span>
              <span className="font-label-md text-label-md text-outline">lệnh gia công</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              {waitingCount} Chờ nạp • {inProgressCount} Đang mài
            </div>
          </div>

          {/* Card 2: Chờ Gán Máy & Phôi (PENDING) */}
          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Chờ Gán Máy &amp; Phôi</span>
              <div className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-secondary font-bold">{waitingCount}</span>
              <span className="font-label-md text-label-md text-outline">khay chờ nạp</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-secondary">
              Có sẵn phôi tại ngăn tủ Lab
            </div>
          </div>

          {/* Card 3: Đang Mài Tự Động (IN_PROGRESS) */}
          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Đang Mài Tự Động</span>
              <div className="w-7 h-7 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">precision_manufacturing</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-primary font-bold">{inProgressCount}</span>
              <span className="font-label-md text-label-md text-outline">máy đang cắt</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              {inProgressCount > 0 ? `${inProgressCount} máy đang chạy tải` : 'Tất cả máy đang chờ lệnh'}
            </div>
          </div>

          {/* Card 4: Chờ QC Kiểm Tra (QC_PENDING) */}
          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Chờ QC Kiểm Tra</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">rule</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{qcPendingCount}</span>
              <span className="font-label-md text-label-md text-outline">đơn sẵn sàng</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              Lensmeter &amp; bàn giao đóng gói
            </div>
          </div>
        </div>

        {/* 3. COMPACT MACHINE STATUS TELEMETRY STRIP (Dynamic Machine State) */}
        <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">monitor_heart</span>
              <span className="font-title-md text-title-md text-on-surface font-semibold">Trạng Thái Máy Mài Tự Động (Telemetry Grid)</span>
            </div>
            <span className="text-[10px] text-outline">Tự động đồng bộ: Live</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Machine 1 */}
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-[#dce2d8]/40 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">01</span>
                    <strong className="text-on-surface text-xs">Essilor Delta 200 #01</strong>
                  </div>
                  <span className="text-[10px] text-outline block mt-0.5">Trạm Mài 3D Chính</span>
                </div>
                {machine1Order ? (
                  <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Đang cắt
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full bg-surface-container-high text-primary text-[10px] font-semibold">
                    SẴN SÀNG
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {machine1Order ? (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-label-mono text-primary font-bold">{machine1Order.id}</span>
                      <span className="text-outline">{machine1Order.timeRemaining}</span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '68%' }}></div>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-outline">Hàng đợi trống • Sẵn sàng tiếp nhận lệnh</div>
                )}
              </div>
            </div>

            {/* Machine 2 */}
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-[#dce2d8]/40 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center">02</span>
                    <strong className="text-on-surface text-xs">Essilor Delta 200 #02</strong>
                  </div>
                  <span className="text-[10px] text-outline block mt-0.5">Chuyên Gọng Kim Loại</span>
                </div>
                {machine2Order ? (
                  <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> Đang cắt
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full bg-surface-container-high text-primary text-[10px] font-semibold">
                    SẴN SÀNG
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {machine2Order ? (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-label-mono text-secondary font-bold">{machine2Order.id}</span>
                      <span className="text-outline">{machine2Order.timeRemaining}</span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                      <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: '52%' }}></div>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-outline">Hàng đợi trống • Sẵn sàng tiếp nhận lệnh</div>
                )}
              </div>
            </div>

            {/* Machine 3 */}
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-[#dce2d8]/40 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-surface-container-high text-primary text-[10px] font-bold flex items-center justify-center">03</span>
                    <strong className="text-on-surface text-xs">Nidek ME-1200 Multi</strong>
                  </div>
                  <span className="text-[10px] text-outline block mt-0.5">Vát Mini &amp; Kính Khoan</span>
                </div>
                {machine3Order ? (
                  <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Đang cắt
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full bg-surface-container-high text-primary text-[10px] font-semibold">
                    SẴN SÀNG
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                {machine3Order ? (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-label-mono text-primary font-bold">{machine3Order.id}</span>
                      <span className="text-outline">{machine3Order.timeRemaining}</span>
                    </div>
                    <div className="w-full bg-surface-variant rounded-full h-1.5 overflow-hidden">
                      <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: '40%' }}></div>
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-outline">Hàng đợi trống • Sẵn sàng cắt mài</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. STREAMLINED LAB QUEUE TABLE */}
        <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-[#dce2d8]/40 space-y-2.5">
          {/* Search & Filter pills in one compact bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[260px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-outline"
                placeholder="Tìm mã lệnh #LAB, đơn hàng, khách hàng, SKU gọng..."
                type="text"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-label-md font-label-md">
              {[
                { id: 'all', label: `Tất cả (${totalCount})` },
                { id: 'waiting', label: `Chờ nạp (${waitingCount})` },
                { id: 'in_progress', label: `Đang mài (${inProgressCount})` },
                { id: 'qc_pending', label: `Chờ QC (${qcPendingCount})` },
                { id: 'qc_passed', label: `Đã duyệt QC (${qcPassedCount})` },
                { id: 'priority', label: `Hỏa tốc (${priorityCount})`, isHighlight: true }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                  } ${tab.isHighlight && activeTab !== tab.id ? 'text-primary font-semibold' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#dce2d8]/40">
            <table className="w-full text-left font-body-md text-body-md">
              <thead className="bg-surface-container-low text-outline font-label-md text-label-md uppercase">
                <tr>
                  <th className="py-2.5 px-3">Khay / Lệnh</th>
                  <th className="py-2.5 px-3">Khách Hàng &amp; Đơn</th>
                  <th className="py-2.5 px-3">Gọng &amp; Tròng Kính</th>
                  <th className="py-2.5 px-2">Toa OD/OS</th>
                  <th className="py-2.5 px-3">Máy &amp; KTV</th>
                  <th className="py-2.5 px-3">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce2d8]/30 text-on-surface">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-outline">
                      <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">precision_manufacturing</span>
                        <span className="text-sm font-medium text-on-surface">Chưa có lệnh mài kính nào phù hợp bộ lọc</span>
                        <span className="text-xs text-outline mt-0.5">
                          {activeTab !== 'all' ? 'Thử chọn tab "Tất cả" hoặc xóa bộ lọc tìm kiếm' : 'Khi nhân viên thu ngân POS hoặc Bác sĩ tạo đơn kính thuốc, lệnh sẽ xuất hiện tại đây'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-mono text-primary font-bold text-xs">{order.id}</span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-container font-label-mono text-[10px] text-outline">{order.tray}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <strong className="text-on-surface text-xs block">{order.customer}</strong>
                        <span className="inline-block my-1 rounded-full border border-[#dce2d8] bg-[#eceee7] px-2 py-0.5 text-[10px] font-semibold text-[#253c33]">{order.customerTier || 'Chưa tải được hạng'}</span><br />
                        <span className="text-[10px] text-outline">{order.orderId}</span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="text-xs text-on-surface truncate font-medium">{order.frame}</div>
                        <div className="text-[11px] text-primary truncate">{order.lens}</div>
                      </td>
                      <td className="py-2.5 px-2 font-label-mono text-[11px] text-outline">
                        {order.rxSummary}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-on-surface block font-medium">{order.machine}</span>
                        <span className="text-[10px] text-outline">{order.tech}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${order.statusClass}`}>
                          {order.statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {order.rawStatus === 'IN_PROGRESS' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateJobStatus(
                                order.dbId,
                                'QC_PENDING',
                                `Đã đánh dấu hoàn tất mài ${order.id}. Chuyển sang bàn kiểm tra QC!`
                              );
                            }}
                            disabled={loading}
                            className="px-2.5 py-1 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:bg-[#0b4d6b] transition-all cursor-pointer shadow-xs"
                          >
                            Xong Mài → QC
                          </button>
                        ) : ['PENDING', 'WAITING_PROCESS', 'RECEIVED', 'QC_FAILED'].includes(order.rawStatus) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateJobStatus(
                                order.dbId,
                                ['RECEIVED', 'QC_FAILED'].includes(order.rawStatus) ? 'IN_PROGRESS' : 'RECEIVED',
                                `Đã cập nhật lệnh ${order.id}.`
                              );
                            }}
                            disabled={loading}
                            className="px-2.5 py-1 bg-secondary text-on-secondary rounded-lg text-label-md font-label-md hover:bg-primary transition-all cursor-pointer"
                          >
                            {order.rawStatus === 'QC_FAILED' ? 'Mài lại' : order.rawStatus === 'RECEIVED' ? 'Nạp Vào Máy' : 'Tiếp nhận'}
                          </button>
                        ) : order.rawStatus === 'QC_PENDING' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/lab-qc');
                            }}
                            className="px-2.5 py-1 bg-surface-container text-primary rounded-lg text-label-md font-label-md hover:bg-surface-container-high transition-all cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <span>Sang Bàn QC</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className="px-2.5 py-1 bg-surface-container text-outline rounded-lg text-label-md font-label-md hover:bg-surface-container-high transition-all cursor-pointer"
                          >
                            Chi Tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-1 flex items-center justify-between text-body-sm font-body-sm text-outline">
            <span>Hiển thị {filteredOrders.length} lệnh gia công</span>
            <span className="text-primary font-medium">Lab SLA cam kết: 45 phút/đơn tiêu chuẩn</span>
          </div>
        </div>

        {/* 5. SLIDE-OVER DETAIL MODAL FOR SELECTED ORDER */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-lg w-full rounded-xl p-4 shadow-xl border border-[#dce2d8]/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#eceee7]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-mono font-bold text-primary text-sm">{selectedOrder.id}</span>
                    <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-semibold">{selectedOrder.tray}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${selectedOrder.statusClass}`}>{selectedOrder.statusLabel}</span>
                  </div>
                  <span className="text-xs text-outline">Đơn gốc: {selectedOrder.orderId} • Khách: {selectedOrder.customer} ({selectedOrder.phone})</span>
                  <span className="block text-xs font-semibold text-primary mt-1">{selectedOrder.customerTier || 'Chưa tải được hạng'}</span>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="p-2.5 bg-surface-container-low rounded-xl text-body-sm space-y-1.5 border border-[#dce2d8]/30">
                <div><strong>Gọng kính:</strong> {selectedOrder.frame}</div>
                <div><strong>Tròng kính:</strong> {selectedOrder.lens}</div>
                <div className="font-label-mono text-primary font-semibold">Thông số: {selectedOrder.rxSummary}</div>
                <div><strong>Máy chỉ định:</strong> {selectedOrder.machine} • <strong>KTV:</strong> {selectedOrder.tech}</div>
                {selectedOrder.qcNotes && (
                  <div className="text-xs text-error font-medium pt-1 border-t border-[#eceee7]">
                    <strong>Ghi chú QC:</strong> {selectedOrder.qcNotes}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  {['PENDING', 'WAITING_PROCESS', 'RECEIVED', 'QC_FAILED'].includes(selectedOrder.rawStatus) && (
                    <button
                      onClick={() => {
                        const o = selectedOrder;
                        setSelectedOrder(null);
                        handleUpdateJobStatus(o.dbId, ['RECEIVED', 'QC_FAILED'].includes(o.rawStatus) ? 'IN_PROGRESS' : 'RECEIVED', `Đã cập nhật lệnh ${o.id}.`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md cursor-pointer hover:bg-primary shadow-xs"
                    >
                      {selectedOrder.rawStatus === 'QC_FAILED' ? 'Mài lại' : selectedOrder.rawStatus === 'RECEIVED' ? 'Nạp Vào Máy Mài' : 'Tiếp nhận'}
                    </button>
                  )}
                  {selectedOrder.rawStatus === 'IN_PROGRESS' && (
                    <button
                      onClick={() => {
                        const o = selectedOrder;
                        setSelectedOrder(null);
                        handleUpdateJobStatus(o.dbId, 'QC_PENDING', `Đã chuyển ${o.id} sang bàn kiểm tra QC!`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md cursor-pointer hover:bg-[#0b4d6b] shadow-xs"
                    >
                      Hoàn Tất Mài → QC
                    </button>
                  )}
                  {selectedOrder.rawStatus === 'QC_PENDING' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        navigate('/lab-qc');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-secondary-fixed text-on-secondary-fixed font-label-md text-label-md cursor-pointer hover:bg-secondary flex items-center gap-1 shadow-xs"
                    >
                      <span>Mở Màn Hình Nghiệm Thu QC</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedOrder(null)} className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md cursor-pointer hover:bg-surface-container-high">
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      handleAction(`Đã in phiếu kỹ thuật mã vạch cho ${selectedOrder.id}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1 shadow-xs cursor-pointer hover:bg-[#0b4d6b]"
                  >
                    <span className="material-symbols-outlined text-[15px]">print</span>
                    <span>In Phiếu Kỹ Thuật</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
