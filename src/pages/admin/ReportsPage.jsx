import React, { useState, useEffect } from 'react';
import { orderApi } from '../../api/orderApi';
import { customerApi } from '../../api/customerApi';
import { message } from 'antd';
import { aggregateRevenue, revenueBranch, inReportingPeriod, isRevenueOrder, REVENUE_STATUSES } from './revenueUtils';

export default function ReportsPage() {
  const [liveOrders, setLiveOrders] = useState([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [timeframe, setTimeframe] = useState('month');
  const [branch, setBranch] = useState('all');
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => orderApi.getAllOrders().then(orders => {
      if (!Array.isArray(orders)) throw new Error('Dữ liệu báo cáo không hợp lệ.');
      if (active) { setLiveOrders(orders); setSyncError(''); setLastSync(new Date()); }
    }).catch(() => { if (active) setSyncError('Chưa đồng bộ được báo cáo mới nhất. Hệ thống sẽ thử lại.'); });
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener('focus', load);
    customerApi.getCustomerList().then(customers => { if (active && Array.isArray(customers)) setCustomerTotal(customers.length); }).catch(() => {});
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);

  const filteredOrders = liveOrders.filter(order => inReportingPeriod(order, timeframe) && (branch === 'all' || revenueBranch(order).code === branch));
  const summary = aggregateRevenue(filteredOrders);
  const validRevenueStatuses = REVENUE_STATUSES;
  const paidOrders = summary.paid;
  const totalRevenue = summary.total;
  const totalOrderCount = filteredOrders.length;
  const posCount = filteredOrders.filter(o => o.channel === 'POS').length;
  const onlineCount = filteredOrders.filter(o => o.channel === 'ONLINE').length;
  const avgOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const completedCount = filteredOrders.filter(o => String(o.status || '').toUpperCase() === 'COMPLETED').length;
  const qcPassRate = totalOrderCount > 0 ? ((completedCount / totalOrderCount) * 100).toFixed(1) : '0.0';

  const topProducts = summary.products.slice(0, 5);
  const branchList = summary.branches;

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      message.warning('Không có dữ liệu đơn hàng trong kỳ lọc hiện tại để xuất file.');
      return;
    }

    message.loading({ content: 'Đang trích xuất báo cáo doanh thu tài chính từ CSDL...', key: 'rep', duration: 1 });
    
    try {
      const headers = ['Mã Đơn Hàng', 'Ngày Tạo', 'Kênh Bán', 'Chi Nhánh', 'Khách Hàng', 'Số Điện Thoại', 'Trạng Thái', 'Thanh Toán', 'Giá Trị Đơn (VNĐ)', 'Doanh Thu Ghi Nhận (VNĐ)'];
      const rows = filteredOrders.map(order => [
        order.orderCode || `#${order.id}`,
        order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—',
        order.channel === 'POS' ? 'Tại Quầy (POS)' : 'Trực Tuyến (Online)',
        revenueBranch(order).name,
        order.customerName || 'Khách vãng lai',
        order.customerPhone || '—',
        order.status || 'Chưa cập nhật',
        order.paymentMethod || 'Chưa cập nhật',
        Number(order.finalAmount || 0).toLocaleString('vi-VN'),
        (isRevenueOrder(order) ? Number(order.finalAmount) : 0).toLocaleString('vi-VN')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `OptiVision_Bao_Cao_Doanh_Thu_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success({ content: `Đã xuất báo cáo ${filteredOrders.length} đơn hàng ra file Excel (CSV) thành công!`, key: 'rep' });
    } catch (err) {
      message.error({ content: 'Lỗi khi trích xuất báo cáo: ' + err.message, key: 'rep' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#f9f8f4]">
      <div className="flex flex-col w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 gap-4">
        {/* Header Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#70787f]">
              <span>Quản Trị</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Báo Cáo &amp; Phân Tích</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#253c33] font-semibold">Doanh Thu &amp; Vận Hành</span>
            </div>
            <h1 className="text-lg font-bold text-[#202924] mt-1">Báo Cáo Doanh Thu Đa Kênh &amp; Hiệu Quả Chuỗi</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe pills */}
            <div className="flex items-center bg-[#f1f2ec] p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeframe === 'today' ? 'bg-[#253c33] text-white shadow-xs' : 'text-[#70787f] hover:text-[#202924]'}`}
              >
                Hôm Nay
              </button>
              <button
                onClick={() => setTimeframe('7days')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeframe === '7days' ? 'bg-[#253c33] text-white shadow-xs' : 'text-[#70787f] hover:text-[#202924]'}`}
              >
                7 Ngày
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeframe === 'month' ? 'bg-[#253c33] text-white shadow-xs' : 'text-[#70787f] hover:text-[#202924]'}`}
              >
                Tháng Này
              </button>
              <button
                onClick={() => setTimeframe('quarter')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${timeframe === 'quarter' ? 'bg-[#253c33] text-white shadow-xs' : 'text-[#70787f] hover:text-[#202924]'}`}
              >
                Quý Này
              </button>
            </div>

            {/* Branch selector */}
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#dce2d8] text-xs font-semibold text-[#202924] focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả chi nhánh</option>
              <option value="BRANCH_01">Chi nhánh 01 - Lê Thánh Tôn</option>
              <option value="BRANCH_02">Chi nhánh 02 - Tràng Tiền (HN)</option>
              <option value="ONLINE">Website trực tuyến</option>
              <option value="UNKNOWN">POS chưa xác định chi nhánh</option>
            </select>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f1f2ec] hover:bg-[#eceee7] text-[#253c33] text-xs font-semibold transition-all border border-[#dce2d8] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">table_view</span>
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#253c33] hover:bg-[#30483b] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>In (F10)</span>
            </button>
          </div>
        </div>

        {syncError && <p role="alert" className="text-sm text-amber-800">{syncError}</p>}
        <p className="text-xs text-[#40484e]">Doanh thu theo các đơn tạo trong kỳ đã thanh toán, sau giảm giá và gồm VAT; loại đơn chưa thanh toán, hủy hoặc hoàn tiền. Đơn website ghi riêng ở Online. Tự đồng bộ 15 giây{lastSync ? ` · Cập nhật ${lastSync.toLocaleTimeString('vi-VN')}` : ''}.</p>
        {/* 4 Core KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
            <div className="flex items-center justify-between text-[#70787f] text-[11px] font-semibold uppercase">
              <span>Doanh Thu Đã Thanh Toán</span>
              <span className="p-1.5 rounded-lg bg-[#eceee7] text-[#253c33]">
                <span className="material-symbols-outlined text-[18px]">payments</span>
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-[#253c33]">{totalRevenue.toLocaleString('vi-VN')}</span>
              <span className="text-xs text-[#70787f]">₫</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="text-outline">Từ {paidOrders.length} đơn đã thanh toán hợp lệ</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
            <div className="flex items-center justify-between text-[#70787f] text-[11px] font-semibold uppercase">
              <span>Đơn Hàng Trong Hệ Thống</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-[#202924]">{totalOrderCount}</span>
              <span className="text-xs text-[#70787f]">đơn kính</span>
            </div>
            <div className="mt-2 text-[11px] text-[#70787f] flex justify-between">
              <span>POS: <strong>{posCount}</strong></span>
              <span>Online: <strong>{onlineCount}</strong></span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
            <div className="flex items-center justify-between text-[#70787f] text-[11px] font-semibold uppercase">
              <span>Giá Trị Trung Bình (AOV)</span>
              <span className="p-1.5 rounded-lg bg-[#eceee7] text-[#253c33]">
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-[#253c33]">{avgOrderValue.toLocaleString('vi-VN')}</span>
              <span className="text-xs text-[#70787f]">₫</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="text-outline">Tính trên các đơn đã phát sinh</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
            <div className="flex items-center justify-between text-[#70787f] text-[11px] font-semibold uppercase">
              <span>Tổng Khách Hàng CRM</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-700">{customerTotal}</span>
              <span className="text-xs text-[#70787f]">hồ sơ</span>
            </div>
            <div className="mt-2 text-[11px] text-[#70787f]">
              Tỷ lệ hoàn tất đơn: <strong className="text-emerald-700">{qcPassRate}%</strong>
            </div>
          </div>
        </div>

        {/* Analytical Section 1: Revenue Overview + Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Revenue Chart Box */}
          <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#202924]">Tổng Quan Doanh Thu</h3>
                <p className="text-xs text-[#70787f]">Đối chiếu giữa kênh bán lẻ POS tại cửa hàng và đơn hàng trực tuyến</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#253c33]"></span>
                  <span className="text-[#40484e] font-medium">POS Cửa Hàng ({posCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span className="text-[#40484e] font-medium">Online ({onlineCount})</span>
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-outline bg-slate-50/50 rounded-xl border border-dashed border-[#dce2d8]">
                <span className="material-symbols-outlined text-[40px] text-outline/40 mb-1">query_stats</span>
                <span className="text-xs font-semibold text-[#40484e]">Chưa có dữ liệu giao dịch trong kỳ</span>
                <span className="text-[11px] text-outline mt-0.5">Các số liệu biểu đồ sẽ tự động xuất hiện khi có đơn bán hàng</span>
              </div>
            ) : (
              <div className="p-4 bg-[#f1f2ec]/60 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline">Tổng giá trị đơn POS:</span>
                  <span className="font-bold font-mono text-[#253c33]">
                    {filteredOrders.filter(o => o.channel === 'POS' && validRevenueStatuses.includes(String(o.status || '').toUpperCase())).reduce((acc, o) => acc + Number(o.finalAmount || 0), 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="w-full bg-[#dce2d8]/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[#253c33] h-full rounded-full transition-all"
                    style={{
                      width: totalRevenue > 0
                        ? `${(filteredOrders.filter(o => o.channel === 'POS' && validRevenueStatuses.includes(String(o.status || '').toUpperCase())).reduce((acc, o) => acc + Number(o.finalAmount || 0), 0) / totalRevenue * 100).toFixed(1)}%`
                        : '0%'
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-outline">Tổng giá trị đơn Online:</span>
                  <span className="font-bold font-mono text-sky-600">
                    {filteredOrders.filter(o => o.channel === 'ONLINE' && validRevenueStatuses.includes(String(o.status || '').toUpperCase())).reduce((acc, o) => acc + Number(o.finalAmount || 0), 0).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="w-full bg-[#dce2d8]/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{
                      width: totalRevenue > 0
                        ? `${(filteredOrders.filter(o => o.channel === 'ONLINE' && validRevenueStatuses.includes(String(o.status || '').toUpperCase())).reduce((acc, o) => acc + Number(o.finalAmount || 0), 0) / totalRevenue * 100).toFixed(1)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 p-3 bg-[#f1f2ec] rounded-xl flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#253c33] text-[20px] shrink-0">insights</span>
              <p className="text-xs text-[#40484e]">
                Hệ thống báo cáo tự động đồng bộ thời gian thực với cơ sở dữ liệu đơn hàng POS và đơn trực tuyến OMS.
              </p>
            </div>
          </div>

          {/* Branch Performance Comparison */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
            <h3 className="text-sm font-bold text-[#202924] mb-1">Doanh Số Theo Chi Nhánh</h3>
            <p className="text-xs text-outline mb-3">Số liệu thực tế từ các điểm bán</p>

            {branchList.length === 0 ? (
              <div className="py-12 text-center text-outline bg-slate-50/50 rounded-xl border border-dashed border-[#dce2d8]">
                <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">store</span>
                <span className="text-xs font-medium">Chưa có doanh số phát sinh theo chi nhánh</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {branchList.map((b, idx) => {
                  const pct = totalRevenue > 0 ? ((b.revenue / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <div key={b.name}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-[#202924]">{idx + 1}. {b.name}</span>
                        <span className="font-mono text-[#253c33]">{b.revenue.toLocaleString('vi-VN')} ₫ ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#f1f2ec]">
                        <div
                          className="h-full rounded-full bg-[#253c33]"
                          style={{ width: `${Math.min(100, Number(pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Top Selling Products */}
        <div className="bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#202924]">Top Sản Phẩm Bán Ra Trong Kỳ</h3>
              <p className="text-xs text-[#70787f]">Xếp hạng theo doanh số các sản phẩm được ghi nhận trong đơn hàng</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#eceee7] text-[#253c33] text-xs font-semibold">
              {topProducts.length} sản phẩm
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f1f2ec] text-[#70787f] uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                  <th className="py-2.5 px-3 text-center">Số Lượng Đã Bán</th>
                  <th className="py-2.5 px-3 text-right">Doanh Số Ghi Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce2d8]/30">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-[#70787f]">
                      <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">inventory_2</span>
                      Chưa có sản phẩm nào được bán trong cơ sở dữ liệu đơn hàng
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#f1f2ec]/50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#253c33]">{p.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{p.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#253c33]">
                        {p.revenue.toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
