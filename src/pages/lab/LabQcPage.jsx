import React, { useState, useEffect, useCallback } from 'react';
import { labApi } from '../../api/labApi';
import { Alert, message } from 'antd';

export default function LabQcPage() {
  const [selectedTray, setSelectedTray] = useState('');
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState('');

  // Re-edge / Fail Modal state
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [failReason, setFailReason] = useState('');

  // Checklist state (Finishing & Packaging)
  const [checks, setChecks] = useState({
    optics: false,
    mechanics: false,
    coating: false,
    packaging: false
  });

  const toggleCheck = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  useEffect(() => {
    setChecks({ optics: false, mechanics: false, coating: false, packaging: false });
    setFailReason('');
    setIsFailModalOpen(false);
  }, [selectedTray]);

  const handleAction = (msg) => {
    message.success(msg);
  };

  // Helper formatters
  const formatDiopter = (val, fallback = '—') => {
    if (val === null || val === undefined || isNaN(Number(val))) return fallback;
    const n = Number(val);
    return `${n > 0 ? '+' : ''}${n.toFixed(2)} D`;
  };

  const formatAxis = (val, fallback = '—') => {
    if (val === null || val === undefined) return fallback;
    return `${val}°`;
  };

  const getHalfPd = (pd, fallback = '—') => {
    if (!pd || isNaN(Number(pd))) return fallback;
    return `${(Number(pd) / 2).toFixed(1)}mm`;
  };

  // Fetch all lab jobs and filter for QC
  const fetchQcJobs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await labApi.getAllLabJobs();
      if (Array.isArray(data)) {
        setAllJobs(data);
        setSyncError('');
      }
    } catch (err) {
      setSyncError(err.message || 'Không thể đồng bộ hàng đợi QC.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQcJobs();
    const timer = window.setInterval(() => fetchQcJobs(false), 5000);
    return () => window.clearInterval(timer);
  }, [fetchQcJobs]);

  // Yêu cầu 3: Lọc danh sách hàng đợi bên trái theo các đơn có status QC_PENDING
  const qcPendingRaw = allJobs.filter((j) => ['QC_PENDING', 'QC_CHECK'].includes((j.status || '').toUpperCase()));

  const qcQueue = qcPendingRaw.map((j) => ({
    id: `#LAB-2026-0${j.id}`,
    dbId: j.id,
    orderId: j.orderCode || (j.orderId ? `#${j.orderId}` : 'Chưa liên kết đơn'),
    tray: `Khay #${j.id < 10 ? '0' + j.id : j.id}`,
    customer: j.customerName || j.prescription?.customerName || 'Khách Hàng',
    frame: j.frameName || j.frameSku || 'Chưa có thông tin gọng',
    lens: j.lensName || j.lensSku || 'Chưa có thông tin tròng',
    tech: j.technicianName || 'Chưa phân công',
    status: 'inspecting',
    statusLabel: 'Chờ kiểm tra',
    statusClass: 'bg-primary-fixed text-on-primary-fixed',
    priority: j.priority === 'URGENT' ? 'Hỏa tốc' : 'Tiêu chuẩn',
    time: j.createdAt ? new Date(j.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay',
    // Thông số khúc xạ thực tế
    odSphere: j.odSphere ?? j.odSph,
    odCyl: j.odCyl,
    odAxis: j.odAxis,
    odAdd: j.odAdd,
    osSphere: j.osSphere ?? j.osSph,
    osCyl: j.osCyl,
    osAxis: j.osAxis,
    osAdd: j.osAdd,
    pd: j.pd,
    prescriptionNotes: j.prescriptionNotes,
    raw: j
  }));

  // Lọc theo thanh tìm kiếm ở cột trái
  const filteredQcQueue = qcQueue.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.id.toLowerCase().includes(q) ||
      item.customer.toLowerCase().includes(q) ||
      item.tray.toLowerCase().includes(q) ||
      item.frame.toLowerCase().includes(q)
    );
  });

  // Đơn hàng đang được chọn để đo kiểm
  const selectedItem =
    filteredQcQueue.find((q) => q.id === selectedTray || q.dbId === selectedTray) ||
    filteredQcQueue[0] ||
    null;

  // Tự động set selectedTray khi danh sách nạp lần đầu
  useEffect(() => {
    if (!filteredQcQueue.some(item => item.id === selectedTray || item.dbId === selectedTray)) {
      setSelectedTray(filteredQcQueue[0]?.id || '');
    }
  }, [filteredQcQueue, selectedTray]);

  // Metric KPIs
  const passedCount = allJobs.filter((j) => (j.status || '').toUpperCase() === 'QC_PASSED').length;
  const failedCount = allJobs.filter((j) => (j.status || '').toUpperCase() === 'QC_FAILED').length;
  const totalInspected = qcQueue.length + passedCount + failedCount;
  const passRate = totalInspected > 0 ? Math.round((passedCount / (passedCount + failedCount || 1)) * 100) : 100;

  // Nút "ĐẠT CHUẨN (PASS QC) & BÀN GIAO POS"
  const handlePassQc = async () => {
    if (!selectedItem) return;
    if (Object.values(checks).some(value => !value)) { message.warning('Vui lòng hoàn tất các mục kiểm tra QC.'); return; }
    try {
      setIsSubmitting(true);
      await labApi.updateLabJobStatus(selectedItem.dbId, {
        status: 'QC_PASSED',
        qcNotes: 'Đạt chuẩn QC xuất xưởng'
      });
      message.success('ĐÃ NGHIỆM THU ĐẠT CHUẨN (PASS QC)! Chuyển đơn sang quầy POS bàn giao khách.');
      await fetchQcJobs();
    } catch (err) {
      message.error(err.message || 'Lỗi khi nghiệm thu đơn kính QC');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nút "Xác Nhận Yêu Cầu Mài Lại" trong modal
  const handleConfirmReEdge = async () => {
    if (!selectedItem) return;
    const note = failReason.trim();
    if (!note) { message.warning('Vui lòng ghi rõ lý do QC không đạt.'); return; }
    try {
      setIsSubmitting(true);
      await labApi.updateLabJobStatus(selectedItem.dbId, {
        status: 'QC_FAILED',
        qcNotes: note
      });
      message.warning(`Đã lập biên bản yêu cầu mài lại ${selectedItem.id} do không đạt chuẩn QC.`);
      setIsFailModalOpen(false);
      setFailReason('');
      await fetchQcJobs();
    } catch (err) {
      message.error(err.message || 'Lỗi khi gửi yêu cầu mài lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFailReasons = [
    'Lệch tâm PD > 0.5mm',
    'Sai trục Axis > 2°',
    'Xước váng phủ AR',
    'Mẻ mép / Vỡ viền tròng',
    'Gọng lỏng / Không ôm rãnh V'
  ];

  return (
    <div className="w-full min-h-screen bg-[#f9f8f4]">
      <div className="max-w-[1600px] mx-auto p-3.5 sm:p-5 flex flex-col gap-3.5">
        {syncError && <Alert type="error" showIcon message={syncError} />}

        {/* 1. HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl shadow-xs border border-[#dce2d8]/40">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-label-md text-outline">XƯỞNG LAB</span>
              <span className="text-outline">/</span>
              <span className="font-label-md text-label-md text-primary font-semibold">KIỂM TRA CHẤT LƯỢNG (QC) &amp; ĐÓNG GÓI</span>
            </div>
            <h1 className="font-headline-md text-headline-md text-primary font-bold tracking-tight">
              Kiểm Tra Chất Lượng Kính &amp; Đóng Gói (Optical QA)
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Thẩm định sai số khúc xạ qua máy Lensmeter, kiểm tra độ hoàn thiện cơ học và niêm phong tem bàn giao POS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
              Kiểm tra tại bàn QC
            </div>
            <button
              onClick={() => {
                fetchQcJobs();
                message.success('Đã hiệu chuẩn máy đo Lensmeter chuẩn 0.00D & đồng bộ dữ liệu!');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-label-md font-label-md cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[15px] text-primary ${loading ? 'animate-spin' : ''}`}>tune</span>
              <span>Hiệu Chuẩn Máy [F4]</span>
            </button>
          </div>
        </div>

        {/* 2. 4 QC KPI METRIC CARDS (Dữ liệu đếm động theo trạng thái) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Tổng Nghiệm Thu</span>
              <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">eyeglasses</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{totalInspected}</span>
              <span className="font-label-md text-label-md text-outline">cặp</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              {qcQueue.length} đơn đang chờ nghiệm thu
            </div>
          </div>

          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Đạt Chuẩn (Pass QC)</span>
              <div className="w-7 h-7 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-primary font-bold">{passedCount}</span>
              <span className="font-label-md text-label-md text-primary font-semibold">tỷ lệ {passRate}%</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              Kết quả kỹ thuật viên đã xác nhận
            </div>
          </div>

          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-error uppercase tracking-wider font-semibold">Lỗi / Mài Lại</span>
              <div className="w-7 h-7 rounded-lg bg-error-container text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">replay</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-error font-bold">{failedCount}</span>
              <span className="font-label-md text-label-md text-error">cặp</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-error">
              {failedCount > 0 ? 'Đã lập biên bản mài lại phôi' : 'Không có sự cố lệch tâm PD'}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-3 rounded-xl shadow-xs border border-[#dce2d8]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">Chờ Bàn Giao POS</span>
              <div className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">package_2</span>
              </div>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display-lg text-display-lg text-on-secondary-container font-bold">{passedCount}</span>
              <span className="font-label-md text-label-md text-outline">hộp</span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-[#eceee7] text-body-sm text-[11px] text-outline">
              {passedCount > 0 ? 'Sẵn sàng giao cho khách tại quầy' : 'Chưa có đơn hoàn thiện bàn giao'}
            </div>
          </div>
        </div>

        {/* 3. TWO-COLUMN QC WORKSTATION */}
        <div className="grid grid-cols-12 gap-3.5 items-start">

          {/* Left Column (4/12): QC Waiting Queue (Chỉ hiện các đơn QC_PENDING) */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-2.5">
            <div className="p-3 rounded-xl bg-surface-container-lowest shadow-xs border border-[#dce2d8]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  Khay Chờ Đo Kiểm ({filteredQcQueue.length})
                </span>
                <span className="font-label-mono text-[11px] text-outline">F2 Scan</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-primary text-[16px]">qr_code_scanner</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface font-label-mono text-body-md focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-outline"
                  placeholder="Quét mã khay / Mã đơn #LAB-..."
                />
              </div>
            </div>

            {/* Tray List */}
            <div className="flex flex-col gap-2">
              {filteredQcQueue.length === 0 ? (
                <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-[#dce2d8]">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">precision_manufacturing</span>
                  <p className="text-xs text-outline font-medium">
                    {searchQuery ? 'Không tìm thấy khay kính phù hợp' : 'Hiện chưa có kính nào trong hàng đợi chờ QC'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Các đơn ở Xưởng sau khi bấm "Xong Mài → QC" sẽ tự động xuất hiện tại đây
                  </p>
                </div>
              ) : (
                filteredQcQueue.map((item) => {
                  const isSelected = selectedItem && (selectedItem.id === item.id || selectedItem.dbId === item.dbId);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedTray(item.id)}
                      className={`p-3 rounded-xl transition-all cursor-pointer relative border ${
                        isSelected
                          ? 'bg-surface-container-lowest border-primary/30 shadow-sm ring-1 ring-primary/20'
                          : 'bg-surface-container-lowest border-[#dce2d8]/40 hover:border-primary/20 hover:shadow-xs'
                      }`}
                    >
                      {isSelected && <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r"></div>}
                      <div className="flex items-start justify-between pl-1">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-label-mono font-bold text-primary text-xs">{item.id}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${item.statusClass}`}>
                              {item.statusLabel}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-surface-container font-label-mono text-[10px] text-outline">{item.tray}</span>
                          </div>
                          <h3 className="font-title-md text-title-md text-on-surface font-semibold mt-1">{item.customer}</h3>
                          <div className="text-[11px] text-outline mt-0.5 truncate">{item.frame}</div>
                        </div>
                        <span className="text-[10px] font-label-mono text-outline">{item.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (8/12): Focal Inspection Station */}
          {!selectedItem ? (
            <div className="col-span-12 xl:col-span-8 p-12 text-center bg-surface-container-lowest rounded-xl border border-dashed border-[#dce2d8] flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">fact_check</span>
              <h3 className="font-title-md text-on-surface font-semibold">Chưa chọn khay kính cần kiểm tra QC</h3>
              <p className="text-xs text-outline max-w-sm mt-1">
                Chọn một khay kính từ danh sách chờ bên trái hoặc quét mã vạch khay để bắt đầu nghiệm thu quang học.
              </p>
            </div>
          ) : (
            <div className="col-span-12 xl:col-span-8 flex flex-col gap-3">

              {/* Order Details Header */}
              <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#dce2d8]/40 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#eceee7] gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-primary-container text-on-primary font-label-mono font-bold text-xs">
                        ĐƠN ĐANG ĐO: {selectedItem.id}
                      </span>
                      <span className="font-label-mono text-[11px] text-outline">{selectedItem.tray}</span>
                      <span className="px-2 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-md text-[10px] font-semibold">
                        {selectedItem.priority || 'Tiêu chuẩn'}
                      </span>
                    </div>
                    <div className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">
                      Khách: {selectedItem.customer}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-outline block">Kỹ thuật viên mài:</span>
                    <span className="font-title-md text-title-md text-primary font-semibold">{selectedItem.tech}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-body-sm">
                  <div className="p-2 rounded-lg bg-surface-container-low border border-[#dce2d8]/30">
                    <span className="text-[10px] text-outline block">KTV Mài Lắp</span>
                    <span className="font-semibold text-on-surface">{selectedItem.tech}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-[#dce2d8]/30">
                    <span className="text-[10px] text-outline block">Máy Mài 3D</span>
                    <span className="font-semibold text-on-surface">Chưa có thông tin</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-[#dce2d8]/30">
                    <span className="text-[10px] text-outline block">Gọng Kính</span>
                    <span className="font-semibold text-on-surface truncate block">{selectedItem.frame}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-low border border-[#dce2d8]/30">
                    <span className="text-[10px] text-outline block">Tròng Kính</span>
                    <span className="font-semibold text-on-surface truncate block">{selectedItem.lens}</span>
                  </div>
                </div>
              </div>

              <section className="p-3.5 rounded-xl bg-white border border-[#dce2d8]/40 space-y-2">
                <h3 className="font-semibold">Thông số toa kính</h3>
                <table className="w-full text-left text-sm">
                  <thead><tr><th>Mắt</th><th>SPH</th><th>CYL</th><th>AXIS</th></tr></thead>
                  <tbody>{[['OD',selectedItem.odSphere,selectedItem.odCyl,selectedItem.odAxis],['OS',selectedItem.osSphere,selectedItem.osCyl,selectedItem.osAxis]].map(([eye,sph,cyl,axis])=><tr key={eye}><td>{eye}</td><td>{formatDiopter(sph)}</td><td>{formatDiopter(cyl)}</td><td>{formatAxis(axis)}</td></tr>)}</tbody>
                </table>
                <p>PD: {selectedItem.pd != null ? selectedItem.pd + ' mm' : '—'}</p>
                <p className="text-sm text-outline">Kỹ thuật viên đối chiếu kết quả đo thực tế trước khi xác nhận QC.</p>
              </section>

              {/* 4-Item Finishing & Packaging Checklist */}
              <div className="p-3.5 rounded-xl bg-surface-container-lowest shadow-xs border border-[#dce2d8]/40 space-y-2">
                <span className="font-title-md text-title-md text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                  2. Nghiệm Thu Cơ Học &amp; Đóng Gói
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm">
                  <label
                    onClick={() => toggleCheck('optics')}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      checks.optics ? 'bg-surface-container-lowest border-primary/40 text-on-surface' : 'bg-surface-container-low border-[#dce2d8]/40 text-outline'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${checks.optics ? 'text-primary' : 'text-outline'}`}>
                      {checks.optics ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>Đã đối chiếu quang học với toa và kiểm tra khớp gọng</span>
                  </label>

                  <label
                    onClick={() => toggleCheck('coating')}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      checks.coating ? 'bg-surface-container-lowest border-primary/40 text-on-surface' : 'bg-surface-container-low border-[#dce2d8]/40 text-outline'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${checks.coating ? 'text-primary' : 'text-outline'}`}>
                      {checks.coating ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>Váng phủ AR không xước, không bụi khí</span>
                  </label>

                  <label
                    onClick={() => toggleCheck('mechanics')}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      checks.mechanics ? 'bg-surface-container-lowest border-primary/40 text-on-surface' : 'bg-surface-container-low border-[#dce2d8]/40 text-outline'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${checks.mechanics ? 'text-primary' : 'text-outline'}`}>
                      {checks.mechanics ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>Cân chỉnh 4 điểm (Bench Alignment) &amp; Ve mũi</span>
                  </label>

                  <label
                    onClick={() => toggleCheck('packaging')}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      checks.packaging ? 'bg-surface-container-lowest border-primary/40 text-on-surface' : 'bg-surface-container-low border-[#dce2d8]/40 text-outline'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${checks.packaging ? 'text-primary' : 'text-outline'}`}>
                      {checks.packaging ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span>Dán tem niêm phong QC &amp; Khăn lau hãng</span>
                  </label>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest shadow-xs border border-[#dce2d8]/40 gap-3">
                <button
                  onClick={() => setIsFailModalOpen(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-error-container text-on-surface hover:text-on-error-container font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">replay</span>
                  <span>Yêu Cầu Mài Lại (Re-Edge)</span>
                </button>

                <button
                  onClick={handlePassQc}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl bg-primary text-on-primary hover:bg-[#0b4d6b] font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
                    {isSubmitting ? 'progress_activity' : 'verified'}
                  </span>
                  <span>ĐẠT CHUẨN (PASS QC) &amp; BÀN GIAO POS</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL YÊU CẦU MÀI LẠI (RE-EDGE REJECTION MODAL) */}
      {isFailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-5 shadow-2xl border border-[#dce2d8]/60 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-2 border-b border-[#eceee7]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-error-container text-error material-symbols-outlined text-[18px]">replay</span>
                  <h3 className="font-headline-sm text-headline-sm text-error font-bold">Yêu Cầu Mài Lại</h3>
                </div>
                <p className="text-xs text-outline mt-0.5">
                  Lệnh <strong>{selectedItem.id}</strong> • Khách: <strong>{selectedItem.customer}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsFailModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface block">
                Chọn nhanh lỗi phát hiện qua kiểm tra QC:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickFailReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFailReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                      failReason === reason
                        ? 'bg-error text-white border-error shadow-xs'
                        : 'bg-surface-container-low text-on-surface border-[#dce2d8]/50 hover:bg-surface-container'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface block">
                Ghi chú chi tiết lý do từ chối (Gửi KTV Mài Lắp):
              </label>
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-surface-container-low text-on-surface text-body-sm border border-[#dce2d8]/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-error/20 outline-none transition-all placeholder:text-outline"
                placeholder="Nhập lý do chi tiết (ví dụ: Tròng phải mài lệch tâm PD 0.8mm, vát rãnh V quá cạn so với gọng kim loại)..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eceee7]">
              <button
                onClick={() => {
                  setIsFailModalOpen(false);
                  setFailReason('');
                }}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md cursor-pointer hover:bg-surface-container-high transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleConfirmReEdge}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-error text-white font-label-md text-label-md font-semibold cursor-pointer hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span className={`material-symbols-outlined text-[16px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'progress_activity' : 'replay'}
                </span>
                <span>Xác Nhận Lỗi &amp; Trả Về Mài Lại</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
