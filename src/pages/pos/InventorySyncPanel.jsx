import React, { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { orderApi } from '../../api/orderApi';

export default function InventorySyncPanel({ branchCode, selectedBranch, lastOrder, onSynced }) {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (lastOrder && lastOrder.inventorySyncStatus !== 'SYNCED') { setCode(lastOrder.orderCode); setOrder(lastOrder); } }, [lastOrder]);
  async function lookup(event) {
    event.preventDefault(); setBusy(true);
    try { const result = await orderApi.getOrderByCode(code.trim()); setOrder(await orderApi.getOrderById(result.id)); }
    catch (error) { setOrder(null); message.error(error.message); }
    finally { setBusy(false); }
  }
  function retry() {
    if (!branchCode) { message.warning('Chọn chi nhánh bán hàng trên thanh trên trước.'); return; }
    Modal.confirm({ title: 'Đồng bộ kho cho đơn đã thanh toán?', content: `Đơn ${order.orderCode}. Kho đích: ${selectedBranch}. Chi nhánh đã lưu: ${order.branchName}. Thao tác này không tạo đơn hoặc thu tiền lần nữa.`, okText: 'Xác nhận đồng bộ', cancelText: 'Đóng',
      onOk: async () => {
        setBusy(true);
        try { const saved = await orderApi.retryInventory(order.id, branchCode); setOrder(saved); onSynced();
          if (saved.inventorySyncStatus === 'SYNCED') message.success('Đã trừ kho thành công cho đơn đã lưu.');
          else message.warning('Chưa đồng bộ xong. Bấm Kiểm tra để xem trạng thái mới nhất; không thanh toán lại.');
        } catch (error) { message.error(error.message); }
        finally { setBusy(false); }
      } });
  }
  return <details className="pos-inventory-sync" open={order && order.inventorySyncStatus !== 'SYNCED' ? true : undefined}>
    <summary>Kiểm tra / thử lại đồng bộ kho đơn đã thanh toán</summary>
    <form onSubmit={lookup}><input aria-label="Mã đơn đồng bộ kho" value={code} onChange={e => setCode(e.target.value)} placeholder="Nhập mã OPT-…" required /><button className="pos-outline" disabled={busy}>Kiểm tra</button></form>
    {order && <div><p>Đơn {order.orderCode} · {order.branchName} · Kho: <strong>{{PENDING:'Chờ đồng bộ',SYNCED:'Đã đồng bộ',FAILED:'Thất bại',RECONCILIATION_REQUIRED:'Cần đối soát'}[order.inventorySyncStatus] || order.inventorySyncStatus || 'Chưa xác định'}</strong></p>
      {order.inventorySyncError && <p role="alert">{order.inventorySyncError}</p>}
      {order.inventorySyncStatus !== 'SYNCED' && order.status === 'PAID' && <button type="button" className="pos-outline" disabled={busy} onClick={retry}>Thử lại đồng bộ kho</button>}</div>}
  </details>;
}
