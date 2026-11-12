import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  message
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi } from '../../api/inventoryApi';
import { stockVoucherApi } from '../../api/stockVoucherApi';
import { ROLES } from '../../routes/rolesConfig';
import { createUuid } from '../../utils/browserSafe';

const VOUCHER_TYPES = {
  RECEIPT: 'Nhập kho',
  ISSUE: 'Xuất kho',
  QUARANTINE: 'Cách ly hàng lỗi'
};

const STATUS_COLORS = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red' };

const emptySupplier = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: ''
};

const makeIdempotencyKey = () => createUuid();

export default function StockVouchersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const [voucherForm] = Form.useForm();
  const [supplierForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('vouchers');
  const [vouchers, setVouchers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defects, setDefects] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingVoucher, setSavingVoucher] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [workingVoucherId, setWorkingVoucherId] = useState(null);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [supplierModal, setSupplierModal] = useState({ open: false, record: null });
  const [rejectVoucher, setRejectVoucher] = useState(null);
  const [auditLocation, setAuditLocation] = useState('BRANCH_01');
  const [auditCounts, setAuditCounts] = useState({});
  const [auditReasons, setAuditReasons] = useState({});
  const [adjustingSku, setAdjustingSku] = useState(null);
  const voucherType = Form.useWatch('type', voucherForm);
  const voucherLocation = Form.useWatch('locationCode', voucherForm);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [voucherResponse, supplierResponse, defectResponse, inventoryResponse, locationResponse] =
        await Promise.all([
          stockVoucherApi.getVouchers(),
          stockVoucherApi.getSuppliers(),
          stockVoucherApi.getDefectiveInventory(),
          inventoryApi.getInventory(),
          inventoryApi.getLocations()
        ]);
      const datasets = [
        voucherResponse?.data,
        supplierResponse?.data,
        defectResponse?.data,
        inventoryResponse?.data,
        locationResponse?.data
      ];
      if (!datasets.every(Array.isArray)) {
        throw new Error('Dữ liệu phiếu kho, nhà cung cấp hoặc tồn kho không hợp lệ.');
      }
      setVouchers(voucherResponse.data);
      setSuppliers(supplierResponse.data);
      setDefects(defectResponse.data);
      setInventory(inventoryResponse.data);
      setLocations(locationResponse.data);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message || 'Không thể tải dữ liệu quản lý kho.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const inventoryOptions = useMemo(() => inventory.map((item) => ({
    value: item.sku,
    label: `${item.sku} — ${item.productName}`
  })), [inventory]);

  const resetVoucherModal = () => {
    setVoucherModalOpen(false);
    voucherForm.resetFields();
  };

  const createVoucher = async (values) => {
    setSavingVoucher(true);
    try {
      const payload = {
        ...values,
        supplierId: values.type === 'RECEIPT' && values.supplierId
          ? Number(values.supplierId)
          : null,
        items: values.items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          quarantinedQuantity: values.type === 'RECEIPT' ? (item.quarantinedQuantity || 0) : 0
        }))
      };
      const response = await stockVoucherApi.createVoucher(payload, makeIdempotencyKey());
      message.success(`Đã tạo phiếu ${response?.data?.voucherCode || ''} ở trạng thái chờ duyệt.`);
      resetVoucherModal();
      setActiveTab('vouchers');
      await loadData();
    } catch (error) {
      message.error(error.message || 'Không thể tạo phiếu kho.');
    } finally {
      setSavingVoucher(false);
    }
  };

  const approveVoucher = async (voucher) => {
    if (workingVoucherId !== null) return;
    setWorkingVoucherId(voucher.id);
    try {
      await stockVoucherApi.approveVoucher(voucher.id);
      message.success(`Đã duyệt phiếu ${voucher.voucherCode} và cập nhật tồn kho.`);
      await loadData();
    } catch (error) {
      message.error(error.message || 'Không thể duyệt phiếu kho.');
      await loadData();
    } finally {
      setWorkingVoucherId(null);
    }
  };

  const reject = async ({ reason }) => {
    if (!rejectVoucher) return;
    setWorkingVoucherId(rejectVoucher.id);
    try {
      await stockVoucherApi.rejectVoucher(rejectVoucher.id, reason);
      message.success(`Đã từ chối phiếu ${rejectVoucher.voucherCode}.`);
      setRejectVoucher(null);
      rejectForm.resetFields();
      await loadData();
    } catch (error) {
      message.error(error.message || 'Không thể từ chối phiếu kho.');
    } finally {
      setWorkingVoucherId(null);
    }
  };

  const openSupplierModal = (record = null) => {
    supplierForm.setFieldsValue(record || emptySupplier);
    setSupplierModal({ open: true, record });
  };

  const saveSupplier = async (values) => {
    setSavingSupplier(true);
    try {
      const { record } = supplierModal;
      if (record) await stockVoucherApi.updateSupplier(record.id, values);
      else await stockVoucherApi.createSupplier(values);
      message.success(`Đã ${record ? 'cập nhật' : 'tạo'} nhà cung cấp.`);
      setSupplierModal({ open: false, record: null });
      supplierForm.resetFields();
      await loadData();
    } catch (error) {
      message.error(error.message || 'Không thể lưu nhà cung cấp.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const toggleSupplier = async (supplier, active) => {
    try {
      await stockVoucherApi.setSupplierActive(supplier.id, active);
      message.success(`Đã ${active ? 'kích hoạt' : 'vô hiệu hóa'} ${supplier.name}.`);
      await loadData();
    } catch (error) {
      message.error(error.message || 'Không thể cập nhật nhà cung cấp.');
    }
  };

  const handleApproveVariance = async (sku, delta, reason) => {
    try {
      setAdjustingSku(sku);
      const auditReason = (reason || '').trim() || 'Biên bản kiểm kê kho định kỳ (S3-20)';
      await inventoryApi.adjustStock({
        sku,
        delta,
        reason: auditReason,
        actor: user?.fullName || 'Quản lý kho'
      });
      message.success(`Đã duyệt điều chỉnh chênh lệch SKU ${sku} (${delta > 0 ? '+' : ''}${delta}) thành công!`);
      setAuditCounts(prev => {
        const next = { ...prev };
        delete next[sku];
        return next;
      });
      await loadData();
    } catch (err) {
      message.error(err.message || 'Lỗi khi duyệt điều chỉnh tồn kho');
    } finally {
      setAdjustingSku(null);
    }
  };

  const exportAuditReport = () => {
    try {
      const headers = ['Mã SKU', 'Tên Sản Phẩm', 'Kho Kiểm Kê', 'Tồn Hệ Thống', 'Thực Tế', 'Chênh Lệch', 'Lý Do'];
      const rows = inventory.map(item => {
        const sysQty = Number(item.quantities?.[auditLocation] ?? 0);
        const counted = auditCounts[item.sku] != null ? auditCounts[item.sku] : sysQty;
        const diff = counted - sysQty;
        return [
          item.sku,
          item.productName,
          auditLocation,
          sysQty,
          counted,
          diff,
          auditReasons[item.sku] || (diff === 0 ? 'Khớp kiểm đếm' : 'Chưa ghi chú')
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bien_Ban_Kiem_Ke_Kho_${auditLocation}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('Đã xuất biên bản kiểm kê kho thành công!');
    } catch (err) {
      message.error('Lỗi khi xuất file: ' + err.message);
    }
  };

  const voucherColumns = [
    { title: 'Mã phiếu', dataIndex: 'voucherCode', key: 'voucherCode' },
    {
      title: 'Loại phiếu',
      dataIndex: 'type',
      key: 'type',
      render: (type) => VOUCHER_TYPES[type] || type
    },
    {
      title: 'Kho',
      key: 'location',
      render: (_, voucher) => `${voucher.locationName} (${voucher.locationCode})`
    },
    {
      title: 'SKU / SL',
      key: 'items',
      render: (_, voucher) => voucher.items.map((item) =>
        `${item.sku}: ${item.quantity}${item.quarantinedQuantity ? ` (cách ly ${item.quarantinedQuantity})` : ''}`
      ).join(', ')
    },
    { title: 'Người tạo', dataIndex: 'createdBy', key: 'createdBy' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, voucher) => isAdmin && voucher.status === 'PENDING' ? (
        <Space>
          <Popconfirm
            title={`Duyệt phiếu ${voucher.voucherCode}?`}
            description="Tồn kho và lịch sử biến động sẽ được cập nhật."
            okText="Duyệt"
            cancelText="Hủy"
            onConfirm={() => approveVoucher(voucher)}
          >
            <Button type="primary" loading={workingVoucherId === voucher.id}>Duyệt</Button>
          </Popconfirm>
          <Button
            danger
            loading={workingVoucherId === voucher.id}
            onClick={() => {
              rejectForm.resetFields();
              setRejectVoucher(voucher);
            }}
          >
            Từ chối
          </Button>
        </Space>
      ) : voucher.decidedBy ? `Bởi ${voucher.decidedBy}` : '—'
    }
  ];

  const supplierColumns = [
    { title: 'Mã', dataIndex: 'code', key: 'code' },
    { title: 'Tên nhà cung cấp', dataIndex: 'name', key: 'name' },
    { title: 'Liên hệ', dataIndex: 'contactPerson', key: 'contactPerson', render: (value) => value || '—' },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', render: (value) => value || '—' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (value) => value || '—' },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      render: (active, supplier) => (
        <Space>
          <Tag color={active ? 'green' : 'default'}>{active ? 'Hoạt động' : 'Đã ẩn'}</Tag>
          {isAdmin && (
            <Switch
              checked={active}
              aria-label={`${active ? 'Vô hiệu hóa' : 'Kích hoạt'} ${supplier.name}`}
              onChange={(checked) => toggleSupplier(supplier, checked)}
            />
          )}
        </Space>
      )
    },
    ...(isAdmin ? [{
      title: 'Thao tác',
      key: 'actions',
      render: (_, supplier) => <Button onClick={() => openSupplierModal(supplier)}>Sửa</Button>
    }] : [])
  ];

  const defectColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Sản phẩm', dataIndex: 'productName', key: 'productName' },
    {
      title: 'Địa điểm',
      key: 'location',
      render: (_, row) => `${row.locationName} (${row.locationCode})`
    },
    { title: 'Tồn vật lý', dataIndex: 'onHandQuantity', key: 'onHandQuantity' },
    {
      title: 'Đang cách ly',
      dataIndex: 'quarantinedQuantity',
      key: 'quarantinedQuantity',
      render: (quantity) => <Tag color="red">{quantity}</Tag>
    }
  ];

  const auditColumns = [
    {
      title: 'Mã SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku) => <span className="font-mono font-bold text-[#086288]">{sku}</span>
    },
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name) => <span className="font-medium text-slate-900">{name}</span>
    },
    {
      title: 'Tồn Hệ Thống',
      key: 'systemStock',
      render: (_, item) => {
        const qty = Number(item.quantities?.[auditLocation] ?? 0);
        return <span className="font-bold text-slate-800">{qty}</span>;
      }
    },
    {
      title: 'Thực Tế (Kiểm Đếm)',
      key: 'countedStock',
      render: (_, item) => {
        const sysQty = Number(item.quantities?.[auditLocation] ?? 0);
        const val = auditCounts[item.sku] != null ? auditCounts[item.sku] : sysQty;
        return (
          <InputNumber
            min={0}
            value={val}
            onChange={(newVal) => setAuditCounts(prev => ({ ...prev, [item.sku]: newVal }))}
            style={{ width: 90 }}
          />
        );
      }
    },
    {
      title: 'Chênh Lệch',
      key: 'variance',
      render: (_, item) => {
        const sysQty = Number(item.quantities?.[auditLocation] ?? 0);
        const counted = auditCounts[item.sku] != null ? auditCounts[item.sku] : sysQty;
        const diff = counted - sysQty;
        if (diff > 0) return <Tag color="blue">+{diff} (Thừa)</Tag>;
        if (diff < 0) return <Tag color="red">{diff} (Thiếu)</Tag>;
        return <Tag color="green">0 (Khớp)</Tag>;
      }
    },
    {
      title: 'Lý Do Chênh Lệch',
      key: 'reason',
      render: (_, item) => {
        const sysQty = Number(item.quantities?.[auditLocation] ?? 0);
        const counted = auditCounts[item.sku] != null ? auditCounts[item.sku] : sysQty;
        const diff = counted - sysQty;
        if (diff === 0) return <span className="text-slate-400 text-xs">Không chênh lệch</span>;
        return (
          <Input
            placeholder="Lý do chênh lệch..."
            value={auditReasons[item.sku] || ''}
            onChange={(e) => setAuditReasons(prev => ({ ...prev, [item.sku]: e.target.value }))}
            style={{ minWidth: 160 }}
          />
        );
      }
    },
    {
      title: 'Thao Tác Duyệt',
      key: 'action',
      render: (_, item) => {
        const sysQty = Number(item.quantities?.[auditLocation] ?? 0);
        const counted = auditCounts[item.sku] != null ? auditCounts[item.sku] : sysQty;
        const diff = counted - sysQty;
        if (diff === 0) {
          return <span className="text-emerald-600 text-xs font-semibold">Đạt chuẩn</span>;
        }
        return (
          <Popconfirm
            title={`Duyệt điều chỉnh SKU ${item.sku} (${diff > 0 ? '+' : ''}${diff})?`}
            description="Tồn kho hệ thống sẽ được tự động điều chỉnh theo số lượng thực tế kiểm kê."
            okText="Duyệt chênh lệch"
            cancelText="Hủy"
            onConfirm={() => handleApproveVariance(item.sku, diff, auditReasons[item.sku])}
          >
            <Button
              type="primary"
              size="small"
              loading={adjustingSku === item.sku}
              className="bg-[#086288]"
            >
              Duyệt Chênh Lệch
            </Button>
          </Popconfirm>
        );
      }
    }
  ];

  const tabs = [
    { key: 'vouchers', label: `Phiếu kho (${vouchers.length})` },
    { key: 'suppliers', label: `Nhà cung cấp (${suppliers.length})` },
    { key: 'defects', label: `Hàng cách ly (${defects.length})` },
    { key: 'audit', label: `Kiểm kê & Duyệt chênh lệch (S3-20)` }
  ];

  return (
    <main className="min-h-screen w-full bg-[#f9f9ff]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl border border-[#d8e3fb]/50 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#086288]">Kho vận / Nghiệp vụ kho</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Phiếu nhập, xuất và hàng lỗi</h1>
            <p className="mt-1 text-sm text-slate-600">Phiếu chỉ cập nhật tồn sau khi Admin duyệt.</p>
          </div>
          <Space wrap>
            {isAdmin && activeTab === 'suppliers' && (
              <Button icon={<PlusOutlined />} onClick={() => openSupplierModal()}>Thêm nhà cung cấp</Button>
            )}
            {activeTab === 'vouchers' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                voucherForm.resetFields();
                setVoucherModalOpen(true);
              }}>
                Tạo phiếu
              </Button>
            )}
            {activeTab === 'audit' && (
              <Button onClick={exportAuditReport}>Xuất biên bản kiểm kê</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => loadData(true)} loading={loading}>Làm mới</Button>
          </Space>
        </header>

        {loadError && (
          <Alert
            type="error"
            showIcon
            message="Không thể tải dữ liệu kho"
            description={loadError}
          />
        )}

        <section className="rounded-xl border border-[#d8e3fb]/50 bg-white p-4 shadow-sm sm:p-5">
          <Tabs activeKey={activeTab} items={tabs} onChange={setActiveTab} />
          {loading && !vouchers.length && !suppliers.length && !defects.length ? (
            <div className="flex justify-center py-12"><Spin /></div>
          ) : (
            <>
              {activeTab === 'vouchers' && (
                <Table
                  rowKey="id"
                  columns={voucherColumns}
                  dataSource={vouchers}
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: loadError ? 'Không có dữ liệu phiếu kho.' : 'Chưa có phiếu kho.' }}
                />
              )}
              {activeTab === 'suppliers' && (
                <Table
                  rowKey="id"
                  columns={supplierColumns}
                  dataSource={suppliers}
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: loadError ? 'Không có dữ liệu nhà cung cấp.' : 'Chưa có nhà cung cấp.' }}
                />
              )}
              {activeTab === 'defects' && (
                <Table
                  rowKey={(row) => `${row.sku}-${row.locationCode}`}
                  columns={defectColumns}
                  dataSource={defects}
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  locale={{ emptyText: loadError ? 'Không có dữ liệu hàng cách ly.' : 'Không có hàng đang cách ly.' }}
                />
              )}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Chọn kho kiểm kê:</span>
                      <Select
                        value={auditLocation}
                        onChange={setAuditLocation}
                        style={{ width: 240 }}
                        options={[
                          { value: 'BRANCH_01', label: 'Chi nhánh 01 (Flagship Q.1)' },
                          { value: 'BRANCH_02', label: 'Chi nhánh 02 (Tràng Tiền)' },
                          { value: 'LAB', label: 'Tổng kho Lab' }
                        ]}
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      Gợi ý: Nhập số lượng thực tế kiểm đếm. Nếu có chênh lệch, nhập lý do và bấm <strong>Duyệt Chênh Lệch</strong> để hệ thống tự động ghi nhận cân đối kho.
                    </div>
                  </div>

                  <Table
                    rowKey="sku"
                    columns={auditColumns}
                    dataSource={inventory}
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    locale={{ emptyText: 'Chưa có sản phẩm trong kho.' }}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Modal
        title="Tạo phiếu kho"
        open={voucherModalOpen}
        onCancel={resetVoucherModal}
        onOk={() => voucherForm.submit()}
        confirmLoading={savingVoucher}
        okText="Tạo phiếu"
        cancelText="Hủy"
        width={760}
        destroyOnClose
      >
        <Form
          form={voucherForm}
          layout="vertical"
          initialValues={{ type: 'RECEIPT', items: [{ quantity: 1, quarantinedQuantity: 0 }] }}
          onFinish={createVoucher}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Form.Item name="type" label="Loại phiếu" rules={[{ required: true }]}>
              <Select options={Object.entries(VOUCHER_TYPES).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="locationCode" label="Kho" rules={[{ required: true, message: 'Chọn kho.' }]}>
              <Select
                placeholder="Chọn địa điểm"
                options={locations.map((location) => ({
                  value: location.code,
                  label: `${location.name} (${location.code})`
                }))}
              />
            </Form.Item>
          </div>
          {voucherType === 'RECEIPT' && (
            <Form.Item name="supplierId" label="Nhà cung cấp">
              <Select
                allowClear
                placeholder="Không bắt buộc"
                options={suppliers.filter((supplier) => supplier.active).map((supplier) => ({
                  value: supplier.id,
                  label: `${supplier.code} — ${supplier.name}`
                }))}
              />
            </Form.Item>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Form.Item name="reason" label="Lý do" rules={[{ required: true, whitespace: true, max: 500 }]}>
              <Input maxLength={500} />
            </Form.Item>
            <Form.Item name="reference" label="Mã tham chiếu" rules={[{ max: 120 }]}>
              <Input maxLength={120} />
            </Form.Item>
          </div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...field }) => (
                  <div key={key} className="grid items-start gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
                    <Form.Item
                      {...field}
                      name={[name, 'sku']}
                      label="SKU"
                      rules={[{ required: true, message: 'Chọn SKU.' }]}
                    >
                      <Select
                        showSearch
                        optionFilterProp="label"
                        placeholder="Chọn SKU"
                        options={inventoryOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[name, 'quantity']}
                      label="Số lượng"
                      rules={[{ required: true, type: 'number', min: 1, message: 'Nhập số lượng lớn hơn 0.' }]}
                    >
                      <InputNumber min={1} precision={0} className="w-full" />
                    </Form.Item>
                    {voucherType === 'RECEIPT' ? (
                      <Form.Item
                        {...field}
                        name={[name, 'quarantinedQuantity']}
                        label="Nhập cách ly"
                        rules={[{ type: 'number', min: 0, message: 'Không thể âm.' }]}
                      >
                        <InputNumber min={0} precision={0} className="w-full" />
                      </Form.Item>
                    ) : <div />}
                    <Button className="mt-8" danger disabled={fields.length === 1} onClick={() => remove(name)}>
                      Xóa
                    </Button>
                  </div>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1, quarantinedQuantity: 0 })}>
                  Thêm SKU
                </Button>
              </div>
            )}
          </Form.List>
          {voucherType !== 'RECEIPT' && (
            <p className="mt-3 text-xs text-slate-500">
              {voucherType === 'QUARANTINE'
                ? 'Số lượng sẽ chuyển từ tồn bán được sang cách ly tại kho đã chọn.'
                : 'Phiếu xuất chỉ lấy từ tồn bán được; hàng cách ly không thể xuất.'}
              {voucherLocation ? ` Kho: ${voucherLocation}.` : ''}
            </p>
          )}
        </Form>
      </Modal>

      <Modal
        title={`${supplierModal.record ? 'Sửa' : 'Thêm'} nhà cung cấp`}
        open={supplierModal.open}
        onCancel={() => {
          if (!savingSupplier) {
            setSupplierModal({ open: false, record: null });
            supplierForm.resetFields();
          }
        }}
        onOk={() => supplierForm.submit()}
        confirmLoading={savingSupplier}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={supplierForm} layout="vertical" initialValues={emptySupplier} onFinish={saveSupplier}>
          <Form.Item name="code" label="Mã" rules={[{ required: true, whitespace: true }, { max: 50 }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true, whitespace: true }, { max: 160 }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="contactPerson" label="Người liên hệ" rules={[{ max: 160 }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="phone" label="Điện thoại" rules={[{ max: 40 }]}>
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', max: 254 }]}>
            <Input maxLength={254} />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Từ chối phiếu ${rejectVoucher?.voucherCode || ''}`}
        open={Boolean(rejectVoucher)}
        onCancel={() => {
          setRejectVoucher(null);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        confirmLoading={workingVoucherId === rejectVoucher?.id}
        okText="Từ chối phiếu"
        cancelText="Hủy"
      >
        <Form form={rejectForm} layout="vertical" onFinish={reject}>
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, whitespace: true, max: 500, message: 'Nhập lý do từ chối.' }]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
