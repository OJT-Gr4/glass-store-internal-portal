import React, { useState, useEffect, useMemo } from 'react';
import { Modal, message } from 'antd';
import { orderApi } from '../../api/orderApi';
import { money } from './ProductCatalog';

export default function PosHistoryModal({
  open,
  onClose,
  branchCode,
  selectedBranch,
  currentUser,
  onSelectReceipt,
  onOrderChanged
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [filterBranch, setFilterBranch] = useState(branchCode || 'ALL');
  const [dateMode, setDateMode] = useState('TODAY'); // 'TODAY' | 'ALL' | 'CUSTOM'
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [customDate, setCustomDate] = useState(todayStr);
  const [filterStaff, setFilterStaff] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel order dialog state
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Sync default filterBranch when branchCode changes
  useEffect(() => {
    if (branchCode) setFilterBranch(branchCode);
  }, [branchCode]);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await orderApi.getAllOrders();
      if (Array.isArray(data)) {
        // POS orders usually have channel 'POS' or we include all
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử đơn POS:', err);
      setError(err.message || 'Không thể tải danh sách đơn hàng từ máy chủ.');
      message.error('Không tải được lịch sử đơn hàng từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOrders();
    }
  }, [open]);

  // Distinct staff names for filter dropdown
  const staffList = useMemo(() => {
    const set = new Set();
    orders.forEach(o => {
      if (o.staffName && o.staffName.trim()) set.add(o.staffName.trim());
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Branch filter
      if (filterBranch !== 'ALL') {
        const matchesBranch =
          order.branchCode === filterBranch ||
          (filterBranch === 'BRANCH_01' && (order.branchName || '').includes('01')) ||
          (filterBranch === 'BRANCH_02' && (order.branchName || '').includes('02'));
        if (!matchesBranch) return false;
      }

      // Date filter
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
        if (dateMode === 'TODAY' && orderDate !== todayStr) return false;
        if (dateMode === 'CUSTOM' && orderDate !== customDate) return false;
      }

      // Staff filter
      if (filterStaff !== 'ALL' && order.staffName !== filterStaff) {
        return false;
      }

      // Status filter
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'REFUND_PENDING' && order.refundStatus !== 'PENDING') return false;
        if (filterStatus === 'REFUNDED' && order.refundStatus !== 'CONFIRMED') return false;
        if (filterStatus !== 'REFUND_PENDING' && filterStatus !== 'REFUNDED' && order.status !== filterStatus) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (order.orderCode || '').toLowerCase();
        const customer = (order.customerName || '').toLowerCase();
        const phone = (order.customerPhone || '').toLowerCase();
        if (!code.includes(q) && !customer.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [orders, filterBranch, dateMode, todayStr, customDate, filterStaff, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let paidCount = 0;
    let cancelledCount = 0;

    filteredOrders.forEach(o => {
      if (o.status === 'PAID') {
        totalRevenue += Number(o.finalAmount || 0);
        paidCount++;
      } else if (o.status === 'CANCELLED') {
        cancelledCount++;
      }
    });

    return { totalRevenue, paidCount, cancelledCount, totalCount: filteredOrders.length };
  }, [filteredOrders]);

  const handleExecuteCancel = async () => {
    if (!cancelReason.trim()) {
      message.warning('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    setCancelBusy(true);
    try {
      const saved = await orderApi.cancel(cancellingOrder.id, cancelReason.trim(), refundConfirmed);
      message.success(`Đã hủy đơn ${saved.orderCode || cancellingOrder.orderCode}`);
      setCancellingOrder(null);
      setCancelReason('');
      setRefundConfirmed(false);
      // Refresh list
      await fetchOrders();
      if (onOrderChanged) onOrderChanged(saved);
    } catch (err) {
      console.error('Lỗi hủy đơn:', err);
      message.error(err.message || 'Không thể hủy đơn hàng.');
    } finally {
      setCancelBusy(false);
    }
  };

  const handleConfirmRefund = (order) => {
    Modal.confirm({
      title: `Xác nhận đã hoàn tiền cho đơn ${order.orderCode}?`,
      content: `Số tiền: ${money(order.finalAmount)}. Chỉ xác nhận khi đã chi trả tiền mặt hoặc chuyển khoản hoàn tất cho khách.`,
      okText: 'Đã hoàn tiền thực tế',
      cancelText: 'Chưa hoàn',
      onOk: async () => {
        try {
          const saved = await orderApi.confirmRefund(order.id);
          message.success('Đã cập nhật trạng thái hoàn tiền thành công.');
          await fetchOrders();
          if (onOrderChanged) onOrderChanged(saved);
        } catch (err) {
          message.error(err.message || 'Lỗi khi xác nhận hoàn tiền.');
        }
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[#263143]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col border border-slate-100 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004967] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111c2d]">
                Lịch Sử Giao Dịch POS
              </h2>
              <p className="text-xs text-slate-500">
                Tra cứu hóa đơn đã bán, in lại phiếu K80 và quản lý hủy đơn theo quyền thu ngân
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              Làm mới
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm mã đơn, tên khách, số ĐT..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
              />
            </div>

            {/* Branch selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Chi nhánh:</span>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                <option value="BRANCH_01">Chi nhánh 01 (Quận 1)</option>
                <option value="BRANCH_02">Chi nhánh 02 (Bình Thạnh)</option>
              </select>
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Ngày:</span>
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setDateMode('TODAY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    dateMode === 'TODAY' ? 'bg-white text-[#004967] shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('ALL')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    dateMode === 'ALL' ? 'bg-white text-[#004967] shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Tất cả ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('CUSTOM')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                    dateMode === 'CUSTOM' ? 'bg-white text-[#004967] shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Khác...
                </button>
              </div>
              {dateMode === 'CUSTOM' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700"
                />
              )}
            </div>

            {/* Staff filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Thu ngân:</span>
              <select
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
              >
                <option value="ALL">Tất cả nhân viên</option>
                {staffList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PAID">Đã thanh toán (PAID)</option>
                <option value="CANCEL_PENDING">Đang chờ hủy</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                <option value="REFUND_PENDING">Chờ hoàn tiền</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>
            </div>
          </div>

          {/* Quick stats KPI bar */}
          <div className="flex items-center gap-6 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="material-symbols-outlined text-[16px] text-[#004967]">shopping_bag</span>
              <span>Tổng số đơn: <strong className="text-slate-900">{stats.totalCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">payments</span>
              <span>Doanh thu thực thu: <strong>{money(stats.totalRevenue)}</strong> ({stats.paidCount} đơn)</span>
            </div>
            {stats.cancelledCount > 0 && (
              <div className="flex items-center gap-1.5 text-rose-600">
                <span className="material-symbols-outlined text-[16px] text-rose-500">cancel</span>
                <span>Đã hủy: <strong>{stats.cancelledCount}</strong> đơn</span>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchOrders}
                className="font-bold underline cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
              <span className="material-symbols-outlined text-[36px] animate-spin text-[#004967]">
                progress_activity
              </span>
              <span className="text-xs">Đang tải lịch sử đơn hàng từ máy chủ...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-[48px] text-slate-300">
                inventory_2
              </span>
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy đơn hàng nào</p>
              <p className="text-xs text-slate-400">Thử thay đổi bộ lọc ngày, chi nhánh hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Mã Đơn / Thời Gian</th>
                    <th className="py-2.5 px-3">Khách Hàng</th>
                    <th className="py-2.5 px-3">Chi Nhánh & Thu Ngân</th>
                    <th className="py-2.5 px-3">Sản Phẩm</th>
                    <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(order => {
                    const isPaid = order.status === 'PAID';
                    const isCancelled = order.status === 'CANCELLED';
                    const isCancelPending = order.status === 'CANCEL_PENDING';
                    const isRefundPending = order.refundStatus === 'PENDING';
                    const isRefundConfirmed = order.refundStatus === 'CONFIRMED';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Order Code & Date */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block font-mono">
                            {order.orderCode}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">
                            {order.customerName || 'Khách vãng lai'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {order.customerPhone ? order.customerPhone : 'Không có SĐT'}
                          </span>
                          {order.customerId && (
                            <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              KH #{order.customerId}
                            </span>
                          )}
                        </td>

                        {/* Branch & Staff */}
                        <td className="py-3 px-3">
                          <span className="text-slate-700 block font-medium">
                            {order.branchName || 'Tại quầy POS'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Thu ngân: <strong>{order.staffName || 'Thu ngân'}</strong>
                          </span>
                        </td>

                        {/* Items summary */}
                        <td className="py-3 px-3 max-w-[200px]">
                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div>
                              <span className="font-semibold text-slate-700">
                                {order.items.length} món:
                              </span>{' '}
                              <span className="text-slate-600 text-[11px] truncate block" title={order.items.map(i => `${i.productName || i.skuId} (x${i.quantity})`).join(', ')}>
                                {order.items[0]?.productName || order.items[0]?.skuId}
                                {order.items.length > 1 ? ` +${order.items.length - 1} món khác` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không có món</span>
                          )}
                        </td>

                        {/* Amount & Method */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-slate-900 block">
                            {money(order.finalAmount)}
                          </span>
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                            {{
                              CASH: 'Tiền mặt',
                              VIETQR: 'VietQR',
                              SEPAY: 'SePay',
                              CARD: 'Thẻ'
                            }[order.paymentMethod] || order.paymentMethod}
                          </span>
                        </td>

                        {/* Status Badges */}
                        <td className="py-3 px-3 text-center">
                          {isPaid && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              Đã thanh toán
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              Đã hủy
                            </span>
                          )}
                          {isCancelPending && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Đang hủy kho
                            </span>
                          )}
                          {!isPaid && !isCancelled && !isCancelPending && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              {order.status}
                            </span>
                          )}

                          {isRefundPending && (
                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                              Chờ hoàn tiền
                            </div>
                          )}
                          {isRefundConfirmed && (
                            <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
                              Đã hoàn tiền
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Re-print K80 Receipt */}
                            <button
                              type="button"
                              onClick={() => onSelectReceipt(order)}
                              title="In lại hóa đơn K80"
                              className="px-2.5 py-1 rounded-lg bg-[#004967] hover:bg-[#003850] text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                print
                              </span>
                              In lại K80
                            </button>

                            {/* Cancel Order Action */}
                            {(isPaid || isCancelPending) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancellingOrder(order);
                                  setCancelReason(order.cancelReason || '');
                                  setRefundConfirmed(false);
                                }}
                                title="Hủy đơn tại quầy"
                                className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                {isCancelPending ? 'Thử lại hủy' : 'Hủy đơn'}
                              </button>
                            )}

                            {/* Confirm Refund Action */}
                            {isCancelled && isRefundPending && (
                              <button
                                type="button"
                                onClick={() => handleConfirmRefund(order)}
                                title="Xác nhận hoàn tiền cho khách"
                                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Hoàn tiền
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs">
          <span className="text-slate-500">
            Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn hàng
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancellingOrder && (
        <Modal
          title={`Hủy đơn hàng POS: ${cancellingOrder.orderCode}`}
          open={Boolean(cancellingOrder)}
          onCancel={() => setCancellingOrder(null)}
          footer={null}
          centered
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div>Khách hàng: <strong>{cancellingOrder.customerName}</strong> ({cancellingOrder.customerPhone || 'Không có SĐT'})</div>
              <div>Tổng tiền thanh toán: <strong className="text-rose-600 text-sm">{money(cancellingOrder.finalAmount)}</strong></div>
              <div>Chi nhánh: <strong>{cancellingOrder.branchName}</strong> · Thu ngân: <strong>{cancellingOrder.staffName}</strong></div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Lý do hủy đơn <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do hủy (ví dụ: Khách đổi ý, nhập nhầm thông tin sản phẩm, hoàn tiền mặt...)"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                maxLength={255}
                className="w-full p-2.5 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                required
              />
            </div>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={refundConfirmed}
                onChange={e => setRefundConfirmed(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span className="font-semibold">
                Xác nhận đã hoàn tiền thực tế cho khách (Tiền mặt / Chuyển khoản hoàn lại)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={cancelBusy}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleExecuteCancel}
                disabled={cancelBusy}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {cancelBusy ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    Đang xử lý hủy...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      delete_forever
                    </span>
                    Xác nhận hủy đơn
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

