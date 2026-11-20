import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Input, Select, Button, Card, Row, Col, Statistic, Space, Modal, message, Tooltip } from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  DownloadOutlined,
  SearchOutlined,
  CreditCardOutlined,
  BankOutlined,
  RollbackOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { orderApi } from '../../api/orderApi';

const money = val => Number(val || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function PaymentReconciliationPage() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, paymentsRes] = await Promise.allSettled([
        orderApi.getAllOrders(),
        orderApi.getAllPayments()
      ]);

      const loadedOrders = ordersRes.status === 'fulfilled' ? (ordersRes.value || []) : [];
      const loadedPayments = paymentsRes.status === 'fulfilled' ? (paymentsRes.value || []) : [];

      setOrders(Array.isArray(loadedOrders) ? loadedOrders : []);
      setPayments(Array.isArray(loadedPayments) ? loadedPayments : []);
    } catch (err) {
      message.error('Không thể tải dữ liệu đối soát: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Merge orders and payments for reconciliation matrix
  const reconciliationData = useMemo(() => {
    const paymentMapByOrder = new Map();
    payments.forEach(p => {
      if (!p.orderId) return;
      if (!paymentMapByOrder.has(p.orderId)) {
        paymentMapByOrder.set(p.orderId, []);
      }
      paymentMapByOrder.get(p.orderId).push(p);
    });

    return orders.map(order => {
      const relatedPayments = paymentMapByOrder.get(order.id) || [];
      const successfulPayments = relatedPayments.filter(p => p.status === 'SUCCESS');
      const refundedPayments = relatedPayments.filter(p => p.status === 'REFUNDED');
      
      const totalPaid = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalRefunded = refundedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const orderAmount = Number(order.finalAmount || 0);

      // Determine Primary Payment Record
      const primaryPayment = successfulPayments[0] || refundedPayments[0] || relatedPayments[0] || null;

      // Determine Reconciliation Status
      let reconciliationStatus = 'UNPAID';
      let discrepancy = 0;

      if (order.status === 'REFUNDED' || order.refundStatus === 'CONFIRMED' || totalRefunded > 0) {
        reconciliationStatus = 'REFUNDED';
        discrepancy = 0;
      } else if (order.status === 'CANCELLED') {
        reconciliationStatus = totalPaid > 0 ? 'REFUND_PENDING' : 'CANCELLED_UNPAID';
      } else if (totalPaid > 0) {
        discrepancy = totalPaid - orderAmount;
        if (Math.abs(discrepancy) < 1) {
          reconciliationStatus = 'MATCHED';
        } else {
          reconciliationStatus = 'MISMATCHED';
        }
      } else if (order.status === 'PAID' || order.status === 'COMPLETED') {
        // Order marked paid/completed but no gateway log (e.g. manual counter settlement)
        reconciliationStatus = 'MATCHED_MANUAL';
      }

      return {
        key: order.id,
        orderId: order.id,
        orderCode: order.orderCode,
        customerName: order.customerName || 'Khách vãng lai',
        customerPhone: order.customerPhone || '',
        channel: order.channel || 'POS',
        branchName: order.branchName || 'Chi nhánh POS',
        orderAmount,
        totalPaid: totalPaid > 0 ? totalPaid : (reconciliationStatus === 'MATCHED_MANUAL' ? orderAmount : 0),
        discrepancy,
        paymentMethod: primaryPayment?.paymentMethod || order.paymentMethod || 'CASH',
        transactionCode: primaryPayment?.transactionCode || primaryPayment?.externalTransactionId || '—',
        provider: primaryPayment?.provider || (order.paymentMethod === 'VIETQR' ? 'SePay VietQR' : 'Tiền mặt tại quầy'),
        orderStatus: order.status,
        reconciliationStatus,
        createdAt: order.createdAt,
        paidAt: primaryPayment?.paidAt || primaryPayment?.createdAt || order.createdAt,
        rawOrder: order,
        relatedPayments
      };
    });
  }, [orders, payments]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalOrderValue = 0;
    let totalCollected = 0;
    let totalRefunded = 0;
    let matchedCount = 0;
    let mismatchedCount = 0;

    reconciliationData.forEach(item => {
      totalOrderValue += item.orderAmount;
      if (['MATCHED', 'MATCHED_MANUAL'].includes(item.reconciliationStatus)) {
        totalCollected += item.totalPaid;
        matchedCount += 1;
      } else if (item.reconciliationStatus === 'MISMATCHED') {
        totalCollected += item.totalPaid;
        mismatchedCount += 1;
      } else if (item.reconciliationStatus === 'REFUNDED') {
        totalRefunded += item.orderAmount;
      }
    });

    const matchRate = reconciliationData.length > 0
      ? Math.round((matchedCount / reconciliationData.length) * 100)
      : 100;

    return {
      totalOrderValue,
      totalCollected,
      totalRefunded,
      matchedCount,
      mismatchedCount,
      matchRate,
      totalOrders: reconciliationData.length
    };
  }, [reconciliationData]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return reconciliationData.filter(row => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'MATCHED' && !['MATCHED', 'MATCHED_MANUAL'].includes(row.reconciliationStatus)) return false;
        if (statusFilter === 'MISMATCHED' && row.reconciliationStatus !== 'MISMATCHED') return false;
        if (statusFilter === 'UNPAID' && !['UNPAID', 'CANCELLED_UNPAID'].includes(row.reconciliationStatus)) return false;
        if (statusFilter === 'REFUNDED' && !['REFUNDED', 'REFUND_PENDING'].includes(row.reconciliationStatus)) return false;
      }

      if (methodFilter !== 'ALL' && row.paymentMethod !== methodFilter) {
        return false;
      }

      if (channelFilter !== 'ALL' && row.channel !== channelFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCode = row.orderCode?.toLowerCase().includes(q);
        const matchTxn = row.transactionCode?.toLowerCase().includes(q);
        const matchName = row.customerName?.toLowerCase().includes(q);
        const matchPhone = row.customerPhone?.toLowerCase().includes(q);
        if (!matchCode && !matchTxn && !matchName && !matchPhone) return false;
      }

      return true;
    });
  }, [reconciliationData, statusFilter, methodFilter, channelFilter, search]);

  const exportCsv = () => {
    const headers = ['Mã đơn', 'Khách hàng', 'SĐT', 'Kênh', 'Chi nhánh', 'Phương thức', 'Mã GD SePay/Ngân hàng', 'Tiền đơn (VND)', 'Thực nhận (VND)', 'Chênh lệch', 'Trạng thái đơn', 'Trạng thái đối soát', 'Thời gian'];
    const rows = filteredData.map(r => [
      r.orderCode,
      `"${r.customerName}"`,
      r.customerPhone,
      r.channel,
      `"${r.branchName}"`,
      r.paymentMethod,
      r.transactionCode,
      r.orderAmount,
      r.totalPaid,
      r.discrepancy,
      r.orderStatus,
      r.reconciliationStatus,
      r.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Doi_soat_thanh_toan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Đã xuất file đối soát CSV thành công!');
  };

  const columns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (code, record) => (
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{code}</span>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {new Date(record.createdAt).toLocaleString('vi-VN')}
          </div>
        </div>
      )
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{r.customerPhone || '—'}</div>
        </div>
      )
    },
    {
      title: 'Kênh / Chi nhánh',
      key: 'channel',
      render: (_, r) => (
        <div>
          <Tag color={r.channel === 'POS' ? 'blue' : 'purple'}>{r.channel}</Tag>
          <span style={{ fontSize: 12, color: '#475569' }}>{r.branchName}</span>
        </div>
      )
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        if (method === 'VIETQR') return <Tag color="cyan" icon={<BankOutlined />}>VietQR (SePay)</Tag>;
        if (method === 'CASH') return <Tag color="green" icon={<DollarOutlined />}>Tiền mặt</Tag>;
        return <Tag color="geekblue" icon={<CreditCardOutlined />}>{method}</Tag>;
      }
    },
    {
      title: 'Giá trị đơn',
      dataIndex: 'orderAmount',
      key: 'orderAmount',
      align: 'right',
      render: val => <span style={{ fontWeight: 600 }}>{money(val)}</span>
    },
    {
      title: 'Thực nhận',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      align: 'right',
      render: (val, r) => (
        <span style={{ fontWeight: 700, color: val > 0 ? '#059669' : '#94a3b8' }}>
          {money(val)}
        </span>
      )
    },
    {
      title: 'Mã GD SePay/Ngân hàng',
      dataIndex: 'transactionCode',
      key: 'transactionCode',
      render: (code) => (
        <Tooltip title="Mã tham chiếu đối soát SePay / Ngân hàng">
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#0369a1' }}>{code}</span>
        </Tooltip>
      )
    },
    {
      title: 'Trạng thái đối soát',
      key: 'reconciliationStatus',
      align: 'center',
      render: (_, r) => {
        switch (r.reconciliationStatus) {
          case 'MATCHED':
          case 'MATCHED_MANUAL':
            return <Tag color="success" icon={<CheckCircleOutlined />}>ĐÃ KHỚP 100%</Tag>;
          case 'MISMATCHED':
            return <Tag color="error" icon={<CloseCircleOutlined />}>LỆCH TIỀN ({money(r.discrepancy)})</Tag>;
          case 'REFUNDED':
            return <Tag color="purple" icon={<RollbackOutlined />}>ĐÃ HOÀN TIỀN</Tag>;
          case 'REFUND_PENDING':
            return <Tag color="orange" icon={<SyncOutlined spin />}>CHỜ HOÀN TIỀN</Tag>;
          default:
            return <Tag color="default">CHƯA THANH TOÁN</Tag>;
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, r) => (
        <Button
          size="small"
          type="link"
          icon={<InfoCircleOutlined />}
          onClick={() => setSelectedItem(r)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Đối Soát Thanh Toán
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            Đối chiếu số liệu đơn hàng và dòng tiền thực nhận qua ngân hàng SePay VietQR / Tiền mặt tại quầy
          </p>
        </div>
        <Space>
          <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportCsv} style={{ background: '#30483b', borderColor: '#30483b' }}>
            Xuất file đối soát (CSV)
          </Button>
        </Space>
      </div>

      {/* Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng doanh thu đơn hàng"
              value={metrics.totalOrderValue}
              formatter={v => money(v)}
              valueStyle={{ color: '#0f172a', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Thực thu SePay & Quầy"
              value={metrics.totalCollected}
              formatter={v => money(v)}
              valueStyle={{ color: '#059669', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng tiền đã hoàn trả"
              value={metrics.totalRefunded}
              formatter={v => money(v)}
              valueStyle={{ color: '#9333ea', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tỷ lệ đối soát khớp"
              value={metrics.matchRate}
              suffix="%"
              valueStyle={{ color: metrics.matchRate >= 95 ? '#0284c7' : '#d97706', fontWeight: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters Card */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={8} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm theo mã đơn, mã GD SePay, tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={5} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Tất cả trạng thái đối soát', value: 'ALL' },
                { label: 'Đã khớp (100% MATCHED)', value: 'MATCHED' },
                { label: 'Lệch tiền (MISMATCHED)', value: 'MISMATCHED' },
                { label: 'Chưa thanh toán (UNPAID)', value: 'UNPAID' },
                { label: 'Đã hoàn tiền (REFUNDED)', value: 'REFUNDED' }
              ]}
            />
          </Col>
          <Col xs={12} sm={5} md={5}>
            <Select
              style={{ width: '100%' }}
              value={methodFilter}
              onChange={setMethodFilter}
              options={[
                { label: 'Tất cả phương thức', value: 'ALL' },
                { label: 'VietQR (SePay)', value: 'VIETQR' },
                { label: 'Tiền mặt (Cash)', value: 'CASH' },
                { label: 'Thẻ (Card)', value: 'CARD' }
              ]}
            />
          </Col>
          <Col xs={12} sm={4} md={4}>
            <Select
              style={{ width: '100%' }}
              value={channelFilter}
              onChange={setChannelFilter}
              options={[
                { label: 'Tất cả kênh bán', value: 'ALL' },
                { label: 'Kênh POS quầy', value: 'POS' },
                { label: 'Kênh Web Online', value: 'ONLINE' }
              ]}
            />
          </Col>
          <Col xs={12} sm={2} md={2} style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {filteredData.length} kết quả
            </span>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          pagination={{ pageSize: 15, showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn đối soát` }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          title={`Chi tiết đối soát: ${selectedItem.orderCode}`}
          open={!!selectedItem}
          onCancel={() => setSelectedItem(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedItem(null)}>
              Đóng
            </Button>
          ]}
          width={650}
        >
          <div style={{ spaceY: 12 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <Row gutter={[12, 8]}>
                <Col span={12}><strong>Khách hàng:</strong> {selectedItem.customerName}</Col>
                <Col span={12}><strong>Số điện thoại:</strong> {selectedItem.customerPhone || '—'}</Col>
                <Col span={12}><strong>Kênh bán:</strong> {selectedItem.channel} ({selectedItem.branchName})</Col>
                <Col span={12}><strong>Trạng thái đơn:</strong> <Tag color="blue">{selectedItem.orderStatus}</Tag></Col>
                <Col span={12}><strong>Tổng tiền đơn:</strong> <span style={{ color: '#30483b', fontWeight: 'bold' }}>{money(selectedItem.orderAmount)}</span></Col>
                <Col span={12}><strong>Thực nhận:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{money(selectedItem.totalPaid)}</span></Col>
                <Col span={24}><strong>Mã tham chiếu ngân hàng:</strong> <code style={{ color: '#0369a1' }}>{selectedItem.transactionCode}</code></Col>
              </Row>
            </div>

            <h4 style={{ margin: '12px 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
              Lịch sử các giao dịch thanh toán (Payments):
            </h4>
            {selectedItem.relatedPayments.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>Chưa có bản ghi giao dịch ngân hàng hoặc tiền mặt.</p>
            ) : (
              selectedItem.relatedPayments.map((p, idx) => (
                <div key={idx} style={{ padding: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{p.paymentMethod} · {money(p.amount)}</strong>
                    <Tag color={p.status === 'SUCCESS' ? 'green' : p.status === 'REFUNDED' ? 'purple' : 'orange'}>{p.status}</Tag>
                  </div>
                  <div style={{ color: '#64748b' }}>
                    <div>Mã GD nội bộ: {p.transactionCode}</div>
                    {p.externalTransactionId && <div>Mã SePay/Ngân hàng: {p.externalTransactionId}</div>}
                    <div>Thời gian: {p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : new Date(p.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
