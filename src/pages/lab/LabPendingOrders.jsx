import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Table, Tag, message } from 'antd';
import { labApi } from '../../api/labApi';

const value = input => input == null || input === '' ? '0.00' : String(input);

function formatOrderRx(rx) {
  if (!rx) return 'Toa tiêu chuẩn theo đơn';
  return `OD ${value(rx.odSph)}/${value(rx.odCyl)}x${rx.odAxis ?? 0} · OS ${value(rx.osSph)}/${value(rx.osCyl)}x${rx.osAxis ?? 0} · PD ${rx.pd ?? 62}mm`;
}

export default function LabPendingOrders({ onDispatched }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [dispatchingId, setDispatchingId] = useState(null);
  const [dispatchingAll, setDispatchingAll] = useState(false);

  const reload = useCallback(async () => {
    try {
      setRows(await labApi.getPendingOrders());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [reload]);

  const dispatchOrder = async (row) => {
    if (!row?.id) return;
    setDispatchingId(row.id);
    try {
      await labApi.approveOrderPrescription(row.id, {
        prescriptionId: row.prescriptionId || null,
        expectedVersion: row.prescription?.version ?? null,
        confirmed: true,
      });
      message.success(`Đã chuyển đơn ${row.orderCode} vào danh sách gia công mài kính!`);
      await reload();
      onDispatched?.();
    } catch (err) {
      message.error(err.message || 'Không thể gửi lệnh sang Lab.');
    } finally {
      setDispatchingId(null);
    }
  };

  const dispatchAllOrders = async () => {
    if (!rows.length) return;
    setDispatchingAll(true);
    try {
      for (const row of rows) {
        await labApi.approveOrderPrescription(row.id, {
          prescriptionId: row.prescriptionId || null,
          expectedVersion: row.prescription?.version ?? null,
          confirmed: true,
        });
      }
      message.success(`Đã chuyển toàn bộ ${rows.length} đơn vào xưởng mài kính!`);
      await reload();
      onDispatched?.();
    } catch (err) {
      message.error(err.message || 'Có lỗi khi đồng bộ danh sách đơn sang Lab.');
      await reload();
      onDispatched?.();
    } finally {
      setDispatchingAll(false);
    }
  };

  if (!rows.length && !error) return null;

  return (
    <section className="bg-white rounded-xl border border-[#dce2d8] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#30483b] text-base">Đơn chờ gửi sang Lab ({rows.length})</h2>
          <p className="text-xs text-[#647368] mt-1">
            Đơn đã thanh toán sẵn sàng chuyển xuống máy mài theo thông số trên đơn đặt hàng (không bắt buộc đối chiếu toa phòng khám).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <Button type="primary" loading={dispatchingAll} onClick={dispatchAllOrders}>
              Gửi tất cả sang Lab ({rows.length})
            </Button>
          )}
          <Button onClick={reload}>Tải lại</Button>
        </div>
      </div>
      {error && <Alert type="error" showIcon message={error} />}
      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 760 }}
        columns={[
          { title: 'Đơn hàng', dataIndex: 'orderCode', render: code => <strong>{code}</strong> },
          { title: 'Khách hàng', dataIndex: 'customerName' },
          { title: 'Sản phẩm', dataIndex: 'products', ellipsis: true },
          {
            title: 'Thông số toa đơn hàng',
            render: (_, row) => (
              <span className="text-xs font-mono text-slate-700">
                {formatOrderRx(row.prescription)}
              </span>
            )
          },
          {
            title: 'Trạng thái',
            render: () => <Tag color="blue">Sẵn sàng gửi Lab</Tag>
          },
          {
            title: 'Thao tác',
            render: (_, row) => (
              <Button
                type="primary"
                size="small"
                loading={dispatchingId === row.id}
                onClick={() => dispatchOrder(row)}
              >
                Gửi sang Lab
              </Button>
            )
          }
        ]}
      />
    </section>
  );
}
