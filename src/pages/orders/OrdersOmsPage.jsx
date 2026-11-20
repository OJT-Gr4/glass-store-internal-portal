import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Empty, Input, Modal, Table, Tag, message, Radio } from 'antd';
import { orderApi } from '../../api/orderApi';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OrderShippingLabel from './OrderShippingLabel';
import { assertSavedTransition } from './shippingLabelUtils.js';
import {
  getOmsStatusMeta,
  getPaidStageAction,
  normalizeOmsStatus as normalizeStatus,
  requiresLabProcessing,
  needsClinicalReview,
} from './omsOrderUtils.js';
import '../workspace.css';

const CARRIERS = [
  { id: 'GHTK', name: 'GHTK (Giao Hàng Tiết Kiệm)', prefix: 'GHTK-HN', color: 'green', desc: 'Giao nhanh toàn quốc, mạng lưới rộng' },
  { id: 'AhaMove', name: 'AhaMove Siêu Tốc', prefix: 'AHA-SG', color: 'orange', desc: 'Giao hỏa tốc nội thành trong 2 giờ' },
  { id: 'Nội bộ', name: 'Đội Vận Chuyển Nội Bộ', prefix: 'NB-DELI', color: 'blue', desc: 'Tài xế showroom giao trực tiếp tận tay' }
];


const money = value => value == null ? '—' : Number(value).toLocaleString('vi-VN') + ' ₫';
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const code = order => order.orderCode ? (order.orderCode.startsWith('#') ? order.orderCode : `#${order.orderCode}`) : `#${order.id}`;

const statusTag = (value, order = null) => {
  const cfg = getOmsStatusMeta(value, order);
  return <Tag color={cfg[1]}>{cfg[0]}</Tag>;
};

export default function OrdersOmsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all'); // 'all' | 'PAID' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED'
  const [channel, setChannel] = useState('all');
  
  // Drawer & Labels
  const [activeId, setActiveId] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState(null);

  // Popup Modal Chi Tiết Đơn Hàng
  const [modalOrder, setModalOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Phân quyền theo vai trò (Subtask 4.1 GS-132)
  const userRole = (user?.role || '').toLowerCase();
  const isLabStaff = userRole === 'lab';
  const isOptometrist = userRole === 'optometry';
  const isReadOnly = isLabStaff || isOptometrist;

  // Modal Bàn Giao Vận Chuyển & Gán Tracking Code (Task 2)
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [shippingOrder, setShippingOrder] = useState(null);
  const [selectedCarrier, setSelectedCarrier] = useState('GHTK');
  const [inputTrackingCode, setInputTrackingCode] = useState('');
  const [shippingNote, setShippingNote] = useState('');

  const activeOrder = useMemo(() => {
    return orders.find(order => order.id === activeId) || null;
  }, [orders, activeId]);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderApi.getAllOrders();
      const data = response?.data ?? response;
      if (!Array.isArray(data)) throw new Error("Dữ liệu đơn hàng không hợp lệ.");
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Không tải được đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);
  useEffect(() => {
    setModalOrder(previous => previous ? orders.find(order => order.id === previous.id) || null : null);
  }, [orders]);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('order');
    if (!requested) return;
    const found = orders.find(order => order.orderCode === requested || String(order.id) === requested);
    if (found) {
      setActiveId(found.id);
      setModalOrder(found);
    }
  }, [orders, location.search]);

  // Bộ lọc đơn hàng chuẩn 5 trạng thái
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi-VN');
    return orders.filter(order => {
      const orderStatus = normalizeStatus(order.status);
      const orderChannel = (order.channel || '').toUpperCase();

      // Status filter
      if (status !== 'all') {
        if (orderStatus !== status) {
          return false;
        }
      }

      // Channel filter
      if (channel !== 'all' && orderChannel !== channel.toUpperCase()) {
        return false;
      }

      // Keyword query
      if (keyword) {
        const matchCode = code(order).toLowerCase().includes(keyword);
        const matchName = String(order.customerName || '').toLowerCase().includes(keyword);
        const matchPhone = String(order.customerPhone || '').includes(keyword);
        const matchTracking = String(order.trackingCode || '').toLowerCase().includes(keyword);
        return matchCode || matchName || matchPhone || matchTracking;
      }

      return true;
    });
  }, [orders, query, status, channel]);

  // Xuất file Excel
  const exportOrders = async () => {
    try {
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(filtered.map(order => ({
        'Mã đơn': code(order),
        'Khách hàng': order.customerName || 'Khách vãng lai',
        'Điện thoại': order.customerPhone || '—',
        'Kênh': order.channel,
        'Ngày tạo': date(order.createdAt),
        'Đơn vị vận chuyển': order.carrierName || '—',
        'Mã vận đơn': order.trackingCode || '—',
        'Tổng tiền': order.finalAmount,
        'Trạng thái': getOmsStatusMeta(order.status, order)[0],
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Đơn hàng');
      XLSX.writeFile(workbook, `Don-hang-OMS-${new Date().toLocaleDateString('sv-SE')}.xlsx`);
      message.success('Xuất file Excel danh sách đơn hàng thành công!');
    } catch {
      message.error('Không thể xuất danh sách đơn hàng.');
    }
  };

  // Cập nhật trạng thái đơn hàng (Gọi PATCH API /api/orders/{id}/status thật)
  const handleUpdateStatus = async (orderId, targetStatus, extraParams = {}) => {
    if (updating) return null;
    if (isReadOnly) {
      message.warning('Tài khoản của bạn chỉ có quyền xem, không có thẩm quyền chuyển trạng thái đơn hàng OMS.');
      return;
    }
    setUpdating(true);
    message.loading({ content: `Đang chuyển trạng thái đơn hàng sang ${targetStatus}...`, key: 'oms-update' });
    try {
      const currentOrder = orders.find(o => o.id === orderId);
      const payload = {
        status: targetStatus,
        reason: extraParams.reason || `Chuyển trạng thái sang ${targetStatus}`,
        carrierName: extraParams.carrierName || currentOrder?.carrierName || undefined,
        trackingCode: extraParams.trackingCode || currentOrder?.trackingCode || undefined
      };

      const response = await orderApi.updateOrderStatus(orderId, payload);
      const saved = response?.data ?? response;
      assertSavedTransition(saved, orderId, targetStatus);

      // Cập nhật state local bảo toàn thông tin vận đơn trước đó
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          ...saved,
        };
      }));

      if (modalOrder && modalOrder.id === orderId) {
        setModalOrder(prev => ({
          ...prev,
          ...saved,
        }));

        // Làm mới danh sách lịch sử chuyển trạng thái
        orderApi.getOrderHistory(orderId).then(res => {
          const histList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          setOrderHistory(histList);
        }).catch(() => {});
      }

      if (targetStatus === 'COMPLETED') {
        message.success({
          content: 'Máy chủ đã xác nhận hoàn tất đơn hàng.',
          key: 'oms-update',
          duration: 3
        });
      } else {
        message.success({
          content: `Chuyển trạng thái sang [${targetStatus}] thành công!`,
          key: 'oms-update',
          duration: 3
        });
      }
      return saved;
    } catch (err) {
      console.error('Lỗi khi chuyển trạng thái đơn hàng:', err);
      const errorMsg = err?.message || err?.data?.message || 'Máy chủ từ chối chuyển trạng thái đơn hàng (bước chuyển không hợp lệ).';
      message.error({
        content: `Không thể chuyển bước: ${errorMsg}`,
        key: 'oms-update',
        duration: 4
      });
      // Subtask 4.2: Khôi phục lại trạng thái giao diện chuẩn, tránh dữ liệu rác
      await loadOrders();
      return null;
    } finally {
      setUpdating(false);
    }
  };

  // Mở modal bàn giao đơn vị vận chuyển
  const openShippingModal = (order, e) => {
    if (e) e.stopPropagation();
    setShippingOrder(order);
    const defaultCarrier = order.carrierName || 'GHTK';
    setSelectedCarrier(defaultCarrier);
    setInputTrackingCode(order.trackingCode || '');
    setShippingNote(order.notes || '');
    setShippingModalOpen(true);
  };

  // Xác nhận bàn giao vận chuyển (SHIPPING)
  const handleConfirmShipping = async (andPrint = false) => {
    if (!shippingOrder || updating) return;
    if (!inputTrackingCode.trim()) {
      message.error('Vui lòng nhập mã vận đơn được đơn vị vận chuyển cung cấp.');
      return;
    }
    const orderId = shippingOrder.id;
    const carrier = selectedCarrier;
    const tracking = inputTrackingCode.trim();

    const saved = await handleUpdateStatus(orderId, 'SHIPPING', {
      carrierName: carrier,
      trackingCode: tracking,
      reason: shippingNote ? `Bàn giao ${carrier}: ${shippingNote}` : `Bàn giao đơn vị ${carrier} vận chuyển`
    });

    if (!saved) return;
    setShippingModalOpen(false);

    if (andPrint) {
      setLabelOrder(saved);
      setLabelOpen(true);
    }
  };

  // Mở Popup xem chi tiết đơn hàng (tự động nạp lịch sử trạng thái Audit Trail)
  const handleOpenDetailModal = (order, e) => {
    if (e) e.stopPropagation();
    setModalOrder(order);
    setIsModalOpen(true);
    setOrderHistory([]);
    setLoadingHistory(true);
    orderApi.getOrderHistory(order.id)
      .then(res => {
        const histList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setOrderHistory(histList);
      })
      .catch(err => {
        console.warn('Lỗi tải lịch sử đơn hàng:', err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  };

  // Mở modal in nhãn A5
  const handleOpenLabelModal = (order, e) => {
    if (e) e.stopPropagation();
    setLabelOrder(order);
    setLabelOpen(true);
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      render: (_, order) => (
        <span
          className="workspace-code font-bold text-[#253c33] hover:underline cursor-pointer"
          onClick={() => { setActiveId(order.id); setModalOrder(order); }}
        >
          {code(order)}
        </span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      render: date,
      responsive: ['md'],
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      render: (name, order) => (
        <div>
          <div className="font-semibold text-slate-900">{name || 'Khách vãng lai'}</div>
          <div className="text-xs text-slate-500 font-mono">{order.customerPhone || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Kênh bán',
      dataIndex: 'channel',
      render: channel => (
        <Tag color={channel === 'POS' ? 'blue' : 'purple'}>
          {channel === 'POS' ? 'Tại quầy POS' : 'Website Online'}
        </Tag>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Vận chuyển & Vận đơn',
      key: 'shipping',
      render: (_, order) => {
        if (order.carrierName || order.trackingCode) {
          const carrierColor = order.carrierName === 'AhaMove' ? 'orange' : (order.carrierName === 'GHTK' ? 'green' : 'blue');
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Tag color={carrierColor} className="text-[10px] font-bold m-0">
                  {order.carrierName || 'Vận chuyển'}
                </Tag>
                <span className="font-mono text-xs font-bold text-slate-800">
                  {order.trackingCode || '—'}
                </span>
              </div>
              {order.completedAt && (
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                  <span>Hoàn tất: {date(order.completedAt)}</span>
                </div>
              )}
            </div>
          );
        }
        return (
          <span className="text-xs text-slate-400 italic">Chưa gán vận đơn</span>
        );
      }
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'finalAmount',
      align: 'right',
      render: value => <span className="font-bold text-slate-900">{money(value)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (value, order) => statusTag(value, order),
    },
    {
      title: 'Thao tác luồng chuẩn',
      key: 'workflow',
      align: 'right',
      render: (_, order) => {
        const norm = normalizeStatus(order.status);
        const paidAction = getPaidStageAction(order, false);
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
            {/* Nút hành động chuẩn theo từng bước (Chỉ người có thẩm quyền mới được bấm) */}
            {norm === 'PAID' && (
              <Button
                size="small"
                type="primary"
                disabled={isReadOnly || updating || needsClinicalReview(order)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-40"
                onClick={() => handleUpdateStatus(order.id, 'PREPARING', { reason: paidAction.reason })}
                title={isReadOnly ? 'Vai trò của bạn không có quyền chuyển bước OMS' : paidAction.tooltip}
              >
                {paidAction.label}
              </Button>
            )}

            {norm === 'PROCESSING' && !needsClinicalReview(order) && (
              <>
                <Button
                  size="small"
                  type="primary"
                  disabled={isReadOnly || updating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-40"
                  onClick={e => openShippingModal(order, e)}
                  title={isReadOnly ? 'Vai trò của bạn không có quyền chuyển bước OMS' : 'Bàn giao cho đơn vị vận chuyển'}
                >
                  Bàn giao Shipper
                </Button>
                <Button
                  size="small"
                  disabled={isReadOnly || updating}
                  className="border-cyan-600 text-cyan-700 font-semibold"
                  onClick={() => handleUpdateStatus(order.id, 'READY_FOR_PICKUP', { reason: 'Sẵn sàng giao kính tại quầy' })}
                >
                  Nhận tại quầy
                </Button>
              </>
            )}

            {(norm === 'SHIPPING' || norm === 'READY_FOR_PICKUP') && (
              <Button
                size="small"
                type="primary"
                disabled={isReadOnly || updating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-40"
                onClick={() => handleUpdateStatus(order.id, 'COMPLETED', { reason: 'Giao hàng thành công - Khách đã nhận kính' })}
                title={isReadOnly ? 'Vai trò của bạn không có quyền chuyển bước OMS' : 'Xác nhận hoàn tất đơn & ghi nhận doanh thu'}
              >
                Hoàn tất đơn
              </Button>
            )}

            {norm === 'CANCEL_REQUESTED' && (
              <>
                <Button
                  size="small"
                  danger
                  disabled={isReadOnly || updating}
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await orderApi.approveCancelRequest(order.id, 'Nhân viên duyệt yêu cầu hủy đơn');
                      await loadOrders();
                      message.success('Đã duyệt hủy đơn hàng và giải phóng tồn kho.');
                    } catch (err) {
                      message.error(err.message || 'Không thể duyệt hủy đơn.');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  Duyệt hủy
                </Button>
                <Button
                  size="small"
                  disabled={isReadOnly || updating}
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await orderApi.rejectCancelRequest(order.id, 'Từ chối yêu cầu hủy - Đơn tiếp tục xử lý');
                      await loadOrders();
                      message.success('Đã từ chối yêu cầu hủy và khôi phục trạng thái đơn.');
                    } catch (err) {
                      message.error(err.message || 'Không thể từ chối yêu cầu hủy.');
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  Từ chối hủy
                </Button>
              </>
            )}

            {norm === 'REFUND_PENDING' && (
              <Button
                size="small"
                type="primary"
                disabled={isReadOnly || updating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                onClick={async () => {
                  setUpdating(true);
                  try {
                    await orderApi.confirmRefund(order.id);
                    await loadOrders();
                    message.success('Đã xác nhận hoàn tiền thành công!');
                  } catch (err) {
                    message.error(err.message || 'Không thể xác nhận hoàn tiền.');
                  } finally {
                    setUpdating(false);
                  }
                }}
              >
                Xác nhận hoàn tiền
              </Button>
            )}

            {norm === 'COMPLETED' && (
              <Tag color="green" className="font-semibold text-xs">Đã ghi nhận doanh thu</Tag>
            )}

            {/* Nút In nhãn dán A5 */}
            <Button
              size="small"
              onClick={e => handleOpenLabelModal(order, e)}
              title="In nhãn vận chuyển A5 & Tem hàng dễ vỡ"
            >
              Nhãn A5
            </Button>

            {/* Nút Xem Chi Tiết Modal Popup */}
            <Button
              size="small"
              type="primary"
              className="bg-[#253c33]"
              onClick={e => handleOpenDetailModal(order, e)}
            >
              Chi tiết
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-3.5 sm:p-5 max-w-[1600px] min-w-0 mx-auto w-full space-y-5">
      {/* ---------------- 1. TIÊU ĐỀ & METRICS RIBBON ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-xl font-black text-[#253c33] tracking-tight">
            Quản Lý Đơn Hàng Chuỗi (OMS) &amp; Điều Phối Giao Hàng
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 mt-1">
            Quản trị luồng đơn hàng đa kênh (POS &amp; Online): PAID → PREPARING / PROCESSING (Chuẩn bị hàng / Xưởng Lab) → SHIPPING (Bàn giao Shipper) → COMPLETED (Giao thành công &amp; Ghi nhận doanh thu)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportOrders} disabled={!filtered.length}>
            Xuất Excel
          </Button>
          <Button type="primary" className="bg-[#253c33]" onClick={loadOrders} loading={loading}>
            Làm mới
          </Button>
        </div>
      </div>

      {/* Cảnh báo phân quyền chỉ xem (Subtask 4.1 GS-132) */}
      {isReadOnly && (
        <Alert
          type="info"
          showIcon
          message={`Chế độ xem chỉ đọc đối với vai trò ${user?.staffName || userRole.toUpperCase()}: Bạn không có thẩm quyền điều phối giao hàng OMS. Vui lòng đăng nhập tài khoản Quản lý chuỗi hoặc Thu ngân POS để thực hiện chuyển bước.`}
        />
      )}

      {/* ---------------- 2. BỘ LỌC ĐƠN HÀNG THEO TRẠNG THÁI (YÊU CẦU ĐỀ BÀI) ---------------- */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 space-y-3">
        {/* Thanh tìm kiếm & chọn kênh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Input.Search
            allowClear
            aria-label="Tìm đơn hàng"
            placeholder="Tìm theo mã đơn (OPT-...), tên khách hàng, số điện thoại, mã vận đơn..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="max-w-md"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Kênh bán:</span>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">Tất cả kênh bán</option>
              <option value="POS">Quầy POS Bán lẻ</option>
              <option value="ONLINE">Website Online</option>
            </select>
          </div>
        </div>

        {/* Thanh nút bấm lọc 5 trạng thái chuẩn: PAID, PROCESSING, SHIPPING, COMPLETED, CANCELLED */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-nowrap scrollbar-thin">
          <button
            type="button"
            onClick={() => setStatus('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'all' ? 'bg-[#253c33] text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Tất cả ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setStatus('PAID')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'PAID' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
            }`}
          >
            Đã thanh toán (PAID) ({orders.filter(o => normalizeStatus(o.status) === 'PAID').length})
          </button>

          <button
            type="button"
            onClick={() => setStatus('PROCESSING')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'PROCESSING' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            Đang chuẩn bị / Gia công ({orders.filter(o => normalizeStatus(o.status) === 'PROCESSING').length})
          </button>

          <button
            type="button"
            onClick={() => setStatus('SHIPPING')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'SHIPPING' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            Đang giao (SHIPPING) ({orders.filter(o => normalizeStatus(o.status) === 'SHIPPING').length})
          </button>

          <button
            type="button"
            onClick={() => setStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            Hoàn tất (COMPLETED) ({orders.filter(o => normalizeStatus(o.status) === 'COMPLETED').length})
          </button>

          <button
            type="button"
            onClick={() => setStatus('CANCELLED')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              status === 'CANCELLED' ? 'bg-slate-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
            }`}
          >
            Đã hủy (CANCELLED) ({orders.filter(o => normalizeStatus(o.status) === 'CANCELLED').length})
          </button>
        </div>
      </div>

      {/* ---------------- 3. BẢNG DỮ LIỆU ĐƠN HÀNG ---------------- */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden min-w-0">
        {error ? (
          <div className="p-4">
            <Alert type="error" showIcon message={error} action={<Button onClick={loadOrders}>Thử lại</Button>} />
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có đơn hàng phù hợp" /> }}
          />
        )}
      </div>

      {/* ---------------- 4. POPUP MODAL XEM CHI TIẾT ĐƠN HÀNG (YÊU CẦU ĐỀ BÀI) ---------------- */}
      {modalOrder && (
        <Modal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          width={900}
          title={
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-lg font-black text-slate-900">
                Chi Tiết Đơn Hàng {code(modalOrder)}
              </span>
              <Tag color={modalOrder.channel === 'POS' ? 'blue' : 'purple'}>
                {modalOrder.channel === 'POS' ? 'Tại quầy POS' : 'Website Online'}
              </Tag>
              {statusTag(modalOrder.status, modalOrder)}
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Chuyển trạng thái:</span>
                {isReadOnly ? (
                  <Tag color="default">Chế độ xem chỉ đọc (Không có quyền OMS)</Tag>
                ) : (
                  <>
                    {['PAID', 'CONFIRMED'].includes(modalOrder.status) && (() => {
                      const action = getPaidStageAction(modalOrder, true);
                      return (
                        <Button size="small" loading={updating} disabled={needsClinicalReview(modalOrder)} onClick={() => handleUpdateStatus(modalOrder.id, 'PREPARING', { reason: action.reason })}>
                          {action.label}
                        </Button>
                      );
                    })()}
                    {normalizeStatus(modalOrder.status) === 'PROCESSING' && !needsClinicalReview(modalOrder) && (
                    <>
                      <Button size="small" type="primary" className="bg-indigo-600" onClick={() => openShippingModal(modalOrder)}>
                        Bàn giao Shipper (SHIPPING)
                      </Button>
                      <Button size="small" className="border-cyan-600 text-cyan-700" onClick={() => handleUpdateStatus(modalOrder.id, 'READY_FOR_PICKUP', { reason: 'Sẵn sàng giao kính tại quầy' })}>
                        Chờ nhận tại quầy (READY_FOR_PICKUP)
                      </Button>
                    </>
                    )}
                    {['SHIPPING', 'READY_FOR_PICKUP'].includes(modalOrder.status) && (
                    <Button size="small" type="primary" className="bg-emerald-600" onClick={() => handleUpdateStatus(modalOrder.id, 'COMPLETED', { reason: 'Giao hàng thành công' })}>
                      COMPLETED (Hoàn tất)
                    </Button>
                    )}
                    {modalOrder.status === 'CANCEL_REQUESTED' && (
                      <>
                        <Button size="small" danger loading={updating} onClick={async () => {
                          setUpdating(true);
                          try {
                            await orderApi.approveCancelRequest(modalOrder.id, 'Duyệt yêu cầu hủy đơn');
                            await loadOrders();
                            message.success('Đã duyệt hủy đơn hàng.');
                          } catch (err) {
                            message.error(err.message || 'Không thể duyệt hủy đơn.');
                          } finally { setUpdating(false); }
                        }}>Duyệt hủy</Button>
                        <Button size="small" loading={updating} onClick={async () => {
                          setUpdating(true);
                          try {
                            await orderApi.rejectCancelRequest(modalOrder.id, 'Từ chối yêu cầu hủy đơn');
                            await loadOrders();
                            message.success('Đã từ chối yêu cầu hủy đơn.');
                          } catch (err) {
                            message.error(err.message || 'Không thể từ chối hủy đơn.');
                          } finally { setUpdating(false); }
                        }}>Từ chối hủy</Button>
                      </>
                    )}
                    {modalOrder.status === 'REFUND_PENDING' && (
                      <Button size="small" type="primary" className="bg-amber-600" loading={updating} onClick={async () => {
                        setUpdating(true);
                        try {
                          await orderApi.confirmRefund(modalOrder.id);
                          await loadOrders();
                          message.success('Đã xác nhận hoàn tiền thành công.');
                        } catch (err) {
                          message.error(err.message || 'Không thể xác nhận hoàn tiền.');
                        } finally { setUpdating(false); }
                      }}>Xác nhận hoàn tiền</Button>
                    )}
                    {modalOrder.channel === 'POS' && ['PAID', 'CANCEL_PENDING'].includes(modalOrder.status) && (
                      <Button size="small" danger loading={updating} onClick={() => Modal.confirm({
                        title: 'Hủy đơn hàng?',
                        content: 'Đơn đã thanh toán sẽ được đối soát kho và chờ xác nhận hoàn tiền.',
                        okText: 'Hủy đơn', cancelText: 'Đóng',
                        onOk: async () => {
                          setUpdating(true);
                          try {
                            await orderApi.cancel(modalOrder.id, 'Quản lý hủy đơn hàng', false);
                            await loadOrders();
                            message.success('Đã tiếp nhận yêu cầu hủy đơn.');
                          } catch (err) {
                            message.error(err.message || 'Không thể hủy đơn.');
                            throw err;
                          } finally { setUpdating(false); }
                        }
                      })}>Hủy đơn</Button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => handleOpenLabelModal(modalOrder)}>
                  In phiếu A5
                </Button>
                <Button type="primary" className="bg-[#253c33]" onClick={() => setIsModalOpen(false)}>Đóng</Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {/* Visual Stepper Trạng Thái Chuỗi */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quy trình xử lý đơn hàng chuỗi OMS
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'].map((st, idx) => {
                  const currentNorm = normalizeStatus(modalOrder.status);
                  const isCurrent = currentNorm === st;
                  const stepIndex = ['PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED'].indexOf(currentNorm);
                  const isDone = stepIndex >= idx && currentNorm !== 'CANCELLED';

                  let bg = 'bg-white text-slate-400 border-slate-200';
                  if (isCurrent) bg = 'bg-[#253c33] text-white border-[#253c33] font-bold shadow-xs';
                  else if (isDone) bg = 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';

                  const labels = {
                    PAID: '1. Đã thanh toán',
                    PROCESSING: requiresLabProcessing(modalOrder) ? '2. Xưởng Lab mài kính' : '2. Chuẩn bị & đóng gói hàng',
                    SHIPPING: '3. Bàn giao Shipper',
                    COMPLETED: '4. Giao thành công'
                  };

                  return (
                    <div key={st} className={`p-2 rounded-lg border ${bg} transition-all`}>
                      <div className="text-[11px] font-bold">{labels[st]}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">
                        {isCurrent ? 'Đang thực hiện' : (isDone ? 'Đã hoàn thành' : 'Chờ xử lý')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thông tin Khách hàng & Vận chuyển */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Thông Tin Khách Hàng
                </span>
                <div className="text-sm font-bold text-slate-900">{modalOrder.customerName || 'Khách vãng lai'}</div>
                <div className="text-slate-600 font-mono">SĐT: <strong>{modalOrder.customerPhone || '—'}</strong></div>
                <div className="text-slate-600">Địa chỉ giao: <strong>{modalOrder.shippingAddress || 'Nhận tại quầy'}</strong></div>
                {modalOrder.notes && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mt-1">
                    Ghi chú: {modalOrder.notes}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Thông Tin Vận Chuyển &amp; Điều Phối
                </span>
                <div className="text-slate-600">
                  Đơn vị vận chuyển: <strong className="text-indigo-700">{modalOrder.carrierName || 'Chưa gán đơn vị'}</strong>
                </div>
                <div className="text-slate-600">
                  Mã vận đơn (Tracking Code): <strong className="font-mono text-slate-900">{modalOrder.trackingCode || 'Chưa có mã'}</strong>
                </div>
                <div className="text-slate-600">
                  Kênh tiếp nhận: <strong>{modalOrder.channel === 'POS' ? (modalOrder.branchName || 'Quầy POS Flagship') : 'Website Online'}</strong>
                </div>
                <div className="text-slate-600">
                  Thời gian tạo đơn: <strong className="font-mono">{date(modalOrder.createdAt)}</strong>
                </div>
                {modalOrder.completedAt && (
                  <div className="text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200 mt-1">
                    Hoàn tất ca đơn &amp; Ghi nhận doanh thu: {date(modalOrder.completedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Danh Sách Mắt Kính & Sản Phẩm */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Danh Sách Mắt Kính &amp; Sản Phẩm Trong Đơn
              </span>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Tên sản phẩm</th>
                      <th className="p-2.5">Mã SKU</th>
                      <th className="p-2.5 text-right">Đơn giá</th>
                      <th className="p-2.5 text-center">SL</th>
                      <th className="p-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(modalOrder.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                        <td className="p-2.5 font-mono text-slate-600">{item.skuId || item.sku || '—'}</td>
                        <td className="p-2.5 text-right font-mono">{money(item.unitPrice)}</td>
                        <td className="p-2.5 text-center font-bold text-[#253c33]">{item.quantity ?? 1}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {money(item.subtotal ?? (Number(item.unitPrice || 0) * (item.quantity ?? 1)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chi Tiết Thanh Toán & Quyết Toán */}
            <div className="bg-[#f1f2ec] p-4 rounded-xl border border-[#dce2d8] space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Quyết Toán &amp; Hình Thức Thanh Toán
              </span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="text-slate-600">Phương thức: <strong className="text-[#253c33]">{modalOrder.paymentMethod || 'VIETQR'}</strong></div>
                  <div className="text-slate-600">Trạng thái đơn: {statusTag(modalOrder.status, modalOrder)}</div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền hàng:</span>
                    <span className="font-mono">{money(modalOrder.totalAmount)}</span>
                  </div>
                  {Number(modalOrder.discountAmount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Giảm giá:</span>
                      <span className="font-mono text-emerald-700">−{money(modalOrder.discountAmount)}</span>
                    </div>
                  )}
                  {Number(modalOrder.taxAmount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Thuế VAT:</span>
                      <span className="font-mono">{money(modalOrder.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black text-[#253c33] pt-1 border-t border-slate-200">
                    <span>TỔNG THANH TOÁN:</span>
                    <span className="text-base font-mono">{money(modalOrder.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lịch Sử Chuyển Trạng Thái (Audit Trail - Subtask 4.2 GS-133) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Lịch Sử Chuyển Trạng Thái (Audit Trail)
                </span>
                {loadingHistory && <span className="text-[11px] text-slate-400 font-medium">Đang tải lịch sử...</span>}
              </div>

              {orderHistory.length === 0 && !loadingHistory ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  Chưa ghi nhận bản ghi thay đổi trạng thái nào cho đơn hàng này.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2">Thời gian</th>
                        <th className="p-2">Chuyển trạng thái</th>
                        <th className="p-2">Người thực hiện</th>
                        <th className="p-2">Lý do / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderHistory.map((h, i) => (
                        <tr key={h.id || i} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {h.changedAt ? new Date(h.changedAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="p-2 font-semibold">
                            <span className="text-slate-500">{h.fromStatus || 'Khởi tạo'}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className="text-[#253c33] font-bold">{h.toStatus}</span>
                          </td>
                          <td className="p-2 text-slate-700 whitespace-nowrap">
                            <Tag color="geekblue" className="text-[10px] m-0">{h.actor || 'SYSTEM'}</Tag>
                          </td>
                          <td className="p-2 text-slate-600">
                            {h.reason || 'Cập nhật trạng thái chuỗi'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- 5. MODAL BÀN GIAO VẬN CHUYỂN & GÁN MÃ VẬN ĐƠN (TASK 2) ---------------- */}
      {shippingOrder && (
        <Modal
          open={shippingModalOpen}
          onCancel={() => setShippingModalOpen(false)}
          width={600}
          title={
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <span className="text-base font-black text-slate-900">
                Bàn Giao Shipper &amp; Gán Mã Vận Đơn: {code(shippingOrder)}
              </span>
            </div>
          }
          footer={
            <div className="flex justify-between items-center pt-2">
              <Button onClick={() => setShippingModalOpen(false)}>Hủy</Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleConfirmShipping(true)}
                  loading={updating}
                  className="border-indigo-600 text-indigo-700"
                >
                  Lưu &amp; In nhãn A5 ngay
                </Button>
                <Button
                  type="primary"
                  className="bg-indigo-600"
                  onClick={() => handleConfirmShipping(false)}
                  loading={updating}
                >
                  Xác nhận Bàn giao (SHIPPING)
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {/* Chọn Đơn Vị Vận Chuyển */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                1. Chọn Đơn vị vận chuyển (Carrier):
              </label>
              <Radio.Group
                value={selectedCarrier}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCarrier(val);
                  setInputTrackingCode('');
                }}
                className="w-full space-y-2"
              >
                {CARRIERS.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedCarrier === c.id
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      setSelectedCarrier(c.id);
                      setInputTrackingCode('');
                    }}
                  >
                    <Radio value={c.id}>
                      <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">{c.desc}</span>
                    </Radio>
                    <Tag color={c.color} className="font-mono text-[10px] font-bold">
                      {c.id}
                    </Tag>
                  </div>
                ))}
              </Radio.Group>
            </div>

            {/* Nhập hoặc Sinh Mã Vận Đơn (Tracking Code) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">
                  2. Mã vận đơn (Tracking Code):
                </label>
              </div>

              <Input
                size="large"
                value={inputTrackingCode}
                onChange={e => setInputTrackingCode(e.target.value)}
                placeholder="VD: GHTK-HN-2026884 hoặc AHA-SG-993214"
                className="font-mono font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-500">
                Nhập mã thật đã được cấp. Mã QR trên nhãn A5 chứa đúng mã vận đơn đã lưu.
              </p>
            </div>

            {/* Ghi chú điều phối */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">
                3. Ghi chú bàn giao / Tên tài xế (Tùy chọn):
              </label>
              <Input.TextArea
                rows={2}
                value={shippingNote}
                onChange={e => setShippingNote(e.target.value)}
                placeholder="Nhập ghi chú cho shipper, số điện thoại tài xế nhận gói kính..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------- 6. DRAWER CHI TIẾT (TƯƠNG THÍCH CODE NHÓM) ---------------- */}
      <Drawer
        title={activeOrder ? `Đơn ${code(activeOrder)}` : 'Chi tiết đơn'}
        open={activeId !== null}
        onClose={() => setActiveId(null)}
        width={520}
      >
        {activeOrder && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              {statusTag(activeOrder.status)}
              {activeOrder.carrierName && (
                <Tag color="indigo" className="font-mono">
                  {activeOrder.carrierName}: {activeOrder.trackingCode}
                </Tag>
              )}
            </div>

            <section className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <h2 className="font-bold text-slate-800 text-sm">Khách hàng</h2>
              <p className="font-bold text-slate-900">{activeOrder.customerName || 'Khách vãng lai'}</p>
              <p className="text-slate-600 font-mono">{activeOrder.customerPhone || 'Chưa có số điện thoại'}</p>
              {activeOrder.shippingAddress && <p className="text-slate-500">{activeOrder.shippingAddress}</p>}
            </section>

            <section className="space-y-1.5">
              <h2 className="font-bold text-slate-800 text-sm">Sản phẩm</h2>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 space-y-1">
                {(activeOrder.items || []).map((item, index) => (
                  <div className="flex justify-between py-1" key={item.id || index}>
                    <div>
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-slate-500 text-[11px] font-mono">{item.quantity ?? 1} × {money(item.unitPrice)}</div>
                    </div>
                    <span className="font-bold font-mono">{money(item.subtotal ?? (Number(item.unitPrice || 0) * (item.quantity ?? 1)))}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#f1f2ec] p-3 rounded-xl border border-[#dce2d8] space-y-1">
              <div className="flex justify-between"><span>Tiền hàng</span><span className="font-mono">{money(activeOrder.totalAmount)}</span></div>
              {Number(activeOrder.discountAmount) > 0 && <div className="flex justify-between text-emerald-700"><span>Giảm giá</span><span className="font-mono">−{money(activeOrder.discountAmount)}</span></div>}
              {Number(activeOrder.taxAmount) > 0 && <div className="flex justify-between"><span>Thuế</span><span className="font-mono">{money(activeOrder.taxAmount)}</span></div>}
              <div className="flex justify-between font-bold text-sm text-[#253c33] pt-1 border-t border-slate-200">
                <span>Tổng tiền</span>
                <span className="font-mono">{money(activeOrder.finalAmount)}</span>
              </div>
              <div className="text-slate-500 text-[11px] pt-1">
                <span>Phương thức: </span><strong>{activeOrder.paymentMethod || 'VIETQR'}</strong>
              </div>
            </section>

            <div className="space-y-2 pt-2">
              <Button block type="dashed" onClick={() => handleOpenLabelModal(activeOrder)}>
                Xem &amp; In nhãn vận chuyển A5 dán hộp kính
              </Button>
              <Button block type="primary" className="bg-[#253c33]" onClick={() => setIsModalOpen(true)}>
                Mở Popup Chi Tiết Toàn Diện
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ---------------- 7. COMPONENT IN NHÃN VẬN CHUYỂN A5 & TEM HÀNG DỄ VỠ ---------------- */}
      <OrderShippingLabel
        order={labelOrder || activeOrder || modalOrder}
        open={labelOpen}
        onClose={() => setLabelOpen(false)}
      />
    </div>
  );
}
