import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Modal, Table, Tag, message } from 'antd';
import { labApi } from '../../api/labApi';

const number = value => value == null ? '—' : String(value);
export default function PosLabOrders() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const reload = useCallback(async () => {
    try { setRows(await labApi.getPendingOrders()); setError(''); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { reload(); const timer = setInterval(reload, 5000); return () => clearInterval(timer); }, [reload]);
  async function approve() {
    if (!selected || !confirmed || saving) return;
    setSaving(true); setReviewError('');
    try {
      await labApi.approveOrderPrescription(selected.id, { confirmed: true });
      message.success('POS đã xác nhận. Lệnh được đồng bộ sang xưởng Lab theo thông số đơn hàng.');
      setSelected(null); await reload();
    } catch (err) { setReviewError(err.message); }
    finally { setSaving(false); }
  }
  return <section className="bg-white rounded-xl border border-[#dce2d8] p-4 space-y-3">
    <div className="flex flex-wrap justify-between items-center gap-3"><div>
      <h2 className="font-semibold text-[#30483b]">POS xác nhận đơn kính trước khi gửi Lab ({rows.length})</h2>
      <p className="text-xs text-[#647368] mt-1">Đơn đã thanh toán cần kiểm tra khách hàng và thông số. Xưởng chỉ tiếp nhận sau bước xác nhận này.</p>
    </div><Button onClick={reload}>Tải lại</Button></div>
    {error && <Alert type="error" showIcon message={error} />}
    <Table size="small" rowKey="id" dataSource={rows} pagination={{ pageSize: 5 }} scroll={{ x: 760 }} columns={[
      { title: 'Đơn hàng', dataIndex: 'orderCode', render: text => <strong>{text}</strong> },
      { title: 'Khách hàng', dataIndex: 'customerName' },
      { title: 'Sản phẩm', dataIndex: 'products', ellipsis: true },
      { title: 'Trạng thái', render: (_, row) => <Tag color={row.state === 'WAITING_POS' ? 'orange' : 'blue'}>{row.state === 'WAITING_POS' ? 'Chờ POS xác nhận' : 'Đang đồng bộ Lab'}</Tag> },
      { title: 'Thao tác', render: (_, row) => <Button onClick={() => { setSelected(row); setConfirmed(false); setReviewError(''); }}>Kiểm tra / xác nhận</Button> },
    ]} />
    <Modal title={`POS xác nhận · ${selected?.orderCode || ''}`} open={!!selected} onCancel={() => { if (!saving) setSelected(null); }}
      onOk={approve} okText="Xác nhận và gửi Lab" cancelText="Đóng" confirmLoading={saving} okButtonProps={{ disabled: !confirmed || saving }} width={740}>
      <p className="my-3">Khách hàng: <strong>{selected?.customerName || 'Chưa có thông tin'}</strong></p>
      <p className="my-3">Sản phẩm: {selected?.products}</p>
      {reviewError && <Alert type="error" showIcon message={reviewError} />}
      <div className="overflow-x-auto my-4"><table className="w-full text-sm text-left"><thead><tr>{['Mắt', 'SPH', 'CYL', 'AXIS', 'ADD'].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>
        {['od', 'os'].map(eye => <tr key={eye}><th className="p-2">{eye.toUpperCase()}</th>{['Sph', 'Cyl', 'Axis', 'Add'].map(field => <td className="p-2" key={field}>{number(selected?.prescription?.[eye + field])}</td>)}</tr>)}
      </tbody></table><p className="p-2">PD: {number(selected?.prescription?.pd)} mm</p></div>
      <Alert type="info" showIcon message="Giữ nguyên thông số trên đơn hàng" description="Không tự lấy số đo từ một lần khám khác để thay vào đơn. Nếu thiếu hoặc sai thông số, cần xác minh với khách trước khi gửi xưởng." />
      <Checkbox className="mt-4" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}>Tôi đã xác minh đúng khách hàng, sản phẩm và thông số gia công của đơn này.</Checkbox>
    </Modal>
  </section>;
}
