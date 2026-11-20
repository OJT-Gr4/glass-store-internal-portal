import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Switch, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, message, Card } from 'antd';
import { voucherApi } from '../../api/voucherApi';
import { customerApi } from '../../api/customerApi';
import { promotionApi } from '../../api/promotionApi';

const tierLabels = { NONE: 'Không yêu cầu hạng', SILVER: 'Hạng Bạc', GOLD: 'Hạng Vàng', DIAMOND: 'Hạng Kim Cương' };
const customerTier = balance => balance >= 10000 ? 'DIAMOND' : balance >= 5000 ? 'GOLD' : balance >= 1000 ? 'SILVER' : 'MEMBER';

export default function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [form] = Form.useForm();
  const discountType = Form.useWatch('discountType', form) || 'PERCENT';
  const [submitting, setSubmitting] = useState(false);
  const [grantVoucher, setGrantVoucher] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [grants, setGrants] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [grantLoading, setGrantLoading] = useState(false);

  const openGrants = async voucher => {
    setGrantVoucher(voucher); setRecipients([]); setGrants([]); setCustomers([]); setGrantLoading(true);
    try {
      const [rows, issued] = await Promise.all([customerApi.getCustomerList(), voucherApi.getGrants(voucher.id)]);
      const enriched = await Promise.all(rows.map(async customer => {
        try { const account = await promotionApi.account(customer.id); return { ...customer, balance: Number(account.balance || 0), tier: account.tierCode || customerTier(Number(account.tierPoints ?? account.balance ?? 0)) }; }
        catch { return { ...customer, unavailable: true }; }
      }));
      setCustomers(enriched); setGrants(issued);
    } catch (err) { message.error(err.message || 'Không thể tải danh sách khách hàng'); }
    finally { setGrantLoading(false); }
  };
  const issueGrants = async () => {
    if (!recipients.length) return;
    setGrantLoading(true);
    try {
      await voucherApi.issue(grantVoucher.id, recipients);
      setGrants(await voucherApi.getGrants(grantVoucher.id)); setRecipients([]);
      message.success('Đã phát voucher cho khách hàng được chọn');
    } catch (err) { message.error(err.message || 'Không thể phát voucher'); }
    finally { setGrantLoading(false); }
  };
  const revokeGrant = async grant => {
    setGrantLoading(true);
    try { await voucherApi.revoke(grantVoucher.id, grant.customerId); setGrants(await voucherApi.getGrants(grantVoucher.id)); }
    catch (err) { message.error(err.message || 'Không thể thu hồi voucher'); }
    finally { setGrantLoading(false); }
  };

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await voucherApi.getAllVouchers();
      if (Array.isArray(data)) {
        setVouchers(data);
      }
    } catch (err) {
      message.error(err.message || 'Không thể tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  const handleToggle = async (id, currentStatus) => {
    try {
      await voucherApi.toggleVoucher(id);
      message.success('Cập nhật trạng thái voucher thành công');
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, active: !currentStatus } : v));
    } catch (err) {
      message.error(err.message || 'Lỗi khi đổi trạng thái voucher');
    }
  };

  const handleDelete = async (id) => {
    try {
      await voucherApi.deleteVoucher(id);
      message.success('Đã ngừng phát hành voucher');
      setVouchers(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      message.error(err.message || 'Lỗi khi xóa voucher');
    }
  };

  const handleOpenModal = (voucher = null) => {
    setEditingVoucher(voucher);
    if (voucher) {
      form.setFieldsValue({
        code: voucher.code,
        name: voucher.name,
        discountType: voucher.discountType || 'PERCENT',
        discountValue: Number(voucher.discountValue || 0),
        minOrderAmount: voucher.minOrderAmount != null ? Number(voucher.minOrderAmount) : 0,
        maxDiscountAmount: voucher.maxDiscountAmount != null ? Number(voucher.maxDiscountAmount) : null,
        channel: voucher.channel || 'ALL',
        requiredTier: voucher.requiredTier || 'NONE',
        active: voucher.active !== false
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        discountType: 'PERCENT',
        discountValue: 10,
        minOrderAmount: 0,
        channel: 'ALL',
        requiredTier: 'NONE',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        ...values,
        code: values.code.trim().toUpperCase()
      };

      if (editingVoucher) {
        await voucherApi.updateVoucher(editingVoucher.id, payload);
        message.success('Cập nhật voucher thành công');
      } else {
        await voucherApi.createVoucher(payload);
        message.success('Tạo voucher mới thành công');
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchVouchers();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message || 'Lỗi lưu thông tin voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    if (channelFilter !== 'ALL' && v.channel && v.channel !== 'ALL' && v.channel !== channelFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchCode = (v.code || '').toLowerCase().includes(q);
      const matchName = (v.name || '').toLowerCase().includes(q);
      return matchCode || matchName;
    }
    return true;
  });

  const columns = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <span className="font-mono font-bold text-[#253c33]">{code}</span>
    },
    {
      title: 'Tên Chương Trình',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="font-medium text-[#202924]">{name}</span>
    },
    {
      title: 'Loại Giảm Giá',
      dataIndex: 'discountType',
      key: 'discountType',
      render: (type) => (
        <Tag color={type === 'PERCENT' ? 'blue' : 'purple'}>
          {type === 'PERCENT' ? 'Phần trăm (%)' : 'Số tiền cố định (₫)'}
        </Tag>
      )
    },
    {
      title: 'Mức Giảm',
      key: 'discountValue',
      render: (_, r) => (
        <span className="font-bold text-[#30483b]">
          {r.discountType === 'PERCENT'
            ? `${r.discountValue}%`
            : `${Number(r.discountValue || 0).toLocaleString('vi-VN')} ₫`}
        </span>
      )
    },
    {
      title: 'Đơn Tối Thiểu',
      dataIndex: 'minOrderAmount',
      key: 'minOrderAmount',
      render: (min) => min ? `${Number(min).toLocaleString('vi-VN')} ₫` : 'Không yêu cầu'
    },
    {
      title: 'Giảm Tối Đa',
      dataIndex: 'maxDiscountAmount',
      key: 'maxDiscountAmount',
      render: (max) => `${Math.min(Number(max ?? 5000000),5000000).toLocaleString('vi-VN')} ₫`
    },
    {
      title: 'Kênh Áp Dụng',
      dataIndex: 'channel',
      key: 'channel',
      render: (ch) => {
        if (ch === 'POS') return <Tag color="green">POS Quầy</Tag>;
        if (ch === 'ONLINE') return <Tag color="cyan">Online Web</Tag>;
        return <Tag color="geekblue">Toàn Chuỗi (ALL)</Tag>;
      }
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'active',
      key: 'active',
      render: (active, record) => (
        <Switch
          checked={active}
          onChange={() => handleToggle(record.id, active)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      )
    },
    {
      title: 'Hạng được dùng', dataIndex: 'requiredTier', key: 'requiredTier',
      render: tier => <Tag color={tier === 'DIAMOND' ? 'purple' : tier === 'GOLD' ? 'gold' : 'default'}>{tierLabels[tier || 'NONE']}</Tag>
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openGrants(record)}>Phát voucher</Button>
          <Button size="small" onClick={() => handleOpenModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Ngừng phát hành voucher này? Lịch sử sử dụng vẫn được giữ lại."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger>
              Ngừng phát hành
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="w-full min-h-screen bg-[#f9f8f4]">
      <div className="flex flex-col w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#dce2d8]/40 shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#70787f]">
              <span>Quản Trị</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>Khuyến Mãi &amp; Tiếp Thị</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-[#253c33] font-semibold">Quản Lý Voucher (S3-16)</span>
            </div>
            <h1 className="text-lg font-bold text-[#202924] mt-1">Danh Mục Mã Giảm Giá &amp; Khuyến Mãi Web-POS</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="primary"
              onClick={() => handleOpenModal(null)}
              className="bg-[#253c33] hover:bg-[#30483b] flex items-center gap-1 rounded-xl"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Thêm Voucher Mới</span>
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#dce2d8]/40 shadow-xs">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tìm theo mã hoặc tên voucher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
            <Select
              value={channelFilter}
              onChange={setChannelFilter}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả kênh bán' },
                { value: 'POS', label: 'Chỉ tại Quầy POS' },
                { value: 'ONLINE', label: 'Chỉ Online Web' }
              ]}
            />
          </div>

          <div className="text-xs text-[#70787f]">
            Tổng số: <strong className="text-[#253c33]">{filteredVouchers.length}</strong> mã giảm giá
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#dce2d8]/40 shadow-xs overflow-hidden">
          <Table
            columns={columns}
            dataSource={filteredVouchers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </div>

        <Modal title={grantVoucher ? `Phát voucher · ${grantVoucher.code}` : 'Phát voucher'} open={!!grantVoucher} onCancel={() => { if (!grantLoading) setGrantVoucher(null); }}
          onOk={issueGrants} okText="Phát cho khách đã chọn" cancelText="Đóng" confirmLoading={grantLoading} okButtonProps={{ disabled: !recipients.length || grantLoading }} width={760}>
          <p className="my-3 text-sm text-[#526d5c]">{tierLabels[grantVoucher?.requiredTier || 'NONE']} · Mỗi khách dùng một lần. Voucher chỉ xuất hiện sau khi được cấp và đúng hạng.</p>
          <label htmlFor="voucher-recipients" className="block mb-2">Khách hàng nhận voucher</label>
          <Select id="voucher-recipients" aria-label="Khách hàng nhận voucher" mode="multiple" showSearch optionFilterProp="label" placeholder="Tìm theo tên, email hoặc số điện thoại" value={recipients}
            onChange={setRecipients} loading={grantLoading} disabled={grantLoading} style={{ width: '100%' }}
            options={customers.map(c => {
              const previous = grants.find(g => g.customerId === c.id && !g.revoked);
              const eligible = !c.unavailable && (!grantVoucher?.requiredTier || grantVoucher.requiredTier === 'NONE' || c.tier === grantVoucher.requiredTier);
              return { value: c.id, label: `${c.fullName || c.name || c.username} · ${c.phoneNumber || c.email || ''} · ${tierLabels[c.tier] || 'Thành Viên'}${previous ? ' · Đã cấp' : !eligible ? ' · Chưa đúng hạng' : ''}`, disabled: !!previous || !eligible };
            })} />
          <Table className="mt-4" size="small" rowKey="id" loading={grantLoading} dataSource={grants} pagination={{ pageSize: 6 }} scroll={{ x: 500 }} columns={[
            { title: 'Khách hàng', render: (_, g) => customers.find(c => c.id === g.customerId)?.fullName || `Khách #${g.customerId}` },
            { title: 'Trạng thái', render: (_, g) => g.usedOrderId ? 'Đã sử dụng' : g.reservedOrderId ? 'Đang giữ cho đơn hàng' : g.revoked ? 'Đã thu hồi' : 'Chưa sử dụng' },
            { title: 'Thao tác', render: (_, g) => !g.usedOrderId && !g.reservedOrderId && !g.revoked ? <Button size="small" danger disabled={grantLoading} onClick={() => revokeGrant(g)}>Thu hồi</Button> : '—' }
          ]} />
        </Modal>
        {/* Create / Edit Modal */}
        <Modal
          title={editingVoucher ? 'Cập Nhật Voucher Khuyến Mãi' : 'Thêm Mới Voucher Khuyến Mãi'}
          open={isModalOpen}
          onOk={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          okText={editingVoucher ? 'Lưu Thay Đổi' : 'Tạo Voucher'}
          cancelText="Hủy"
          confirmLoading={submitting}
          okButtonProps={{ className: 'bg-[#253c33]' }}
        >
          <Form form={form} layout="vertical" className="mt-3">
            <Form.Item name="requiredTier" label="Hạng thành viên được sử dụng" rules={[{ required: true }]}>
              <Select options={Object.entries(tierLabels).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <p className="mb-4 text-xs text-[#526d5c]">Voucher cần được phát riêng cho từng khách. Mỗi khách chỉ dùng một lần; chọn hạng nào thì chỉ hạng đó được dùng.</p>
            <Form.Item
              name="code"
              label="Mã Giảm Giá (Voucher Code)"
              rules={[{ required: true, message: 'Vui lòng nhập mã voucher' }]}
            >
              <Input
                placeholder="VD: BOLON200K, FREELAB2026..."
                disabled={!!editingVoucher}
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>

            <Form.Item
              name="name"
              label="Tên Chương Trình / Mô Tả"
              rules={[{ required: true, message: 'Vui lòng nhập tên chương trình' }]}
            >
              <Input placeholder="VD: Giảm 200k combo gọng Bolon & tròng Crizal" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="discountType"
                label="Loại Giảm Giá"
                rules={[{ required: true, message: 'Vui lòng chọn loại giảm giá' }]}
              >
                <Select
                  options={[
                    { value: 'PERCENT', label: 'Theo Phần Trăm (%)' },
                    { value: 'FIXED', label: 'Số Tiền Cố Định (₫)' }
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="discountValue"
                label="Mức Giảm"
                dependencies={['discountType']}
                rules={[{ required: true, message: 'Vui lòng nhập mức giảm' }, { type:'number', min:0.01, max:discountType==='PERCENT'?100:5000000, message:discountType==='PERCENT'?'Phần trăm giảm tối đa 100%.':'Số tiền giảm tối đa 5.000.000đ.' }]}
              >
                <InputNumber min={discountType==='PERCENT'?0.01:1} max={discountType==='PERCENT'?100:5000000} precision={discountType==='PERCENT'?2:0} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="minOrderAmount"
                label="Đơn Hàng Tối Thiểu (₫)"
              >
                <InputNumber min={0} step={10000} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="maxDiscountAmount"
                label="Mức Giảm Tối Đa (₫, nếu có)"
                extra="Để trống: áp dụng trần hệ thống 5.000.000đ."
                rules={[{type:'number',min:0,max:5000000,message:'Mức giảm tối đa không vượt 5.000.000đ.'}]}
              >
                <InputNumber min={0} max={5000000} precision={0} step={10000} placeholder="Tối đa 5.000.000đ" style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Form.Item
                name="channel"
                label="Kênh Áp Dụng"
                rules={[{ required: true, message: 'Vui lòng chọn kênh áp dụng' }]}
              >
                <Select
                  options={[
                    { value: 'ALL', label: 'Tất cả (ALL)' },
                    { value: 'POS', label: 'POS Quầy' },
                    { value: 'ONLINE', label: 'Online Web' }
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="active"
                label="Kích Hoạt Ngay"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
