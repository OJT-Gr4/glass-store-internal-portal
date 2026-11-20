import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOmsStatusMeta,
  getPaidStageAction,
  normalizeOmsStatus,
  requiresLabProcessing,
} from './omsOrderUtils.js';

test('frame-only and accessory orders do not show Đang gia công when PREPARING', () => {
  const frameOrder = { id: 1, orderType: 'FRAME_ONLY', status: 'PREPARING' };
  const accessoryOrder = { id: 2, orderType: 'ACCESSORY', status: 'PREPARING' };

  assert.equal(normalizeOmsStatus(frameOrder.status), 'PROCESSING');
  assert.equal(requiresLabProcessing(frameOrder), false);
  assert.deepEqual(getOmsStatusMeta(frameOrder.status, frameOrder), ['Đang chuẩn bị hàng', 'gold']);
  assert.deepEqual(getOmsStatusMeta(accessoryOrder.status, accessoryOrder), ['Đang chuẩn bị hàng', 'gold']);
  assert.equal(getPaidStageAction(frameOrder).label, 'Chuẩn bị giao hàng');
});

test('prescription / lens orders show Đang gia công and Chuyển xưởng Lab', () => {
  const rxOrder = { id: 3, orderType: 'COMPLETE_GLASSES', status: 'PREPARING', labConfirmedAt: '2026-11-20T10:00:00' };
  const lensOrder = { id: 4, orderType: 'LENS_ONLY', status: 'PROCESSING', labConfirmedAt: '2026-11-20T10:00:00' };

  assert.equal(requiresLabProcessing(rxOrder), true);
  assert.deepEqual(getOmsStatusMeta(rxOrder.status, rxOrder), ['Đang gia công', 'orange']);
  assert.deepEqual(getOmsStatusMeta(lensOrder.status, lensOrder), ['Đang gia công', 'orange']);
  assert.equal(getPaidStageAction(rxOrder, false).label, 'Chuyển xưởng Lab');
  assert.equal(getPaidStageAction(rxOrder, true).label, 'Chuyển gia công');
});

test('all prescription orders wait for POS approval regardless of clinical source', () => {
  const order = { orderType: 'LENS_ONLY', status: 'PREPARING', prescription: { source: 'CUSTOMER_PROVIDED' } };
  assert.deepEqual(getOmsStatusMeta(order.status, order), ['Chờ POS xác nhận', 'orange']);
  assert.equal(getPaidStageAction(order).label, 'Chờ POS xác nhận');
  order.prescription.source = 'CLINICAL_REVISION';
  assert.deepEqual(getOmsStatusMeta(order.status, order), ['Chờ POS xác nhận', 'orange']);
  order.labConfirmedAt = '2026-11-20T10:00:00';
  assert.deepEqual(getOmsStatusMeta(order.status, order), ['Đang gia công', 'orange']);
});
