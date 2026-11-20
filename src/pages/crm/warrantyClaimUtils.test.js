import test from 'node:test';
import assert from 'node:assert/strict';
import {
  warrantyStatusMeta,
  nextWarrantyTransition,
  filterWarrantyClaims,
} from './warrantyClaimUtils.js';

test('warrantyStatusMeta maps Vietnamese labels and colors', () => {
  assert.deepEqual(warrantyStatusMeta('WAITING_PROCESS'), {
    key: 'WAITING_PROCESS',
    label: 'Chờ tiếp nhận',
    color: 'orange',
  });
  assert.deepEqual(warrantyStatusMeta('COMPLETED'), {
    key: 'COMPLETED',
    label: 'Hoàn tất',
    color: 'green',
  });
});

test('nextWarrantyTransition advances WAITING_PROCESS -> IN_PROGRESS -> COMPLETED', () => {
  assert.equal(nextWarrantyTransition('WAITING_PROCESS')?.status, 'IN_PROGRESS');
  assert.equal(nextWarrantyTransition('IN_PROGRESS')?.status, 'COMPLETED');
  assert.equal(nextWarrantyTransition('COMPLETED'), null);
});

test('filterWarrantyClaims filters by status and search text', () => {
  const rows = [
    { id: 1, warrantyCode: 'WAR-0863', customerName: 'Phong Trần', customerPhone: '0938773607', productName: 'Gọng Bolon', status: 'WAITING_PROCESS' },
    { id: 2, warrantyCode: 'WAR-0100', customerName: 'Linh Lê', customerPhone: '0911222333', productName: 'Tròng Essilor', status: 'COMPLETED' },
  ];
  assert.equal(filterWarrantyClaims(rows, '', 'ALL').length, 2);
  assert.equal(filterWarrantyClaims(rows, '', 'WAITING_PROCESS').length, 1);
  assert.equal(filterWarrantyClaims(rows, '0863', 'ALL')[0].id, 1);
  assert.equal(filterWarrantyClaims(rows, 'bolon', 'ALL')[0].id, 1);
});
