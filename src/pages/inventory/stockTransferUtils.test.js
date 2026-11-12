import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTransferPayload,
  getQuantityAtLocation,
  getSellableQuantityAtLocation,
  validateTransferForm
} from './stockTransferUtils.js';

const locations = [
  { code: 'LAB', name: 'Tổng kho Lab' },
  { code: 'BRANCH_01', name: 'Chi nhánh 01' }
];
const inventory = [{
  sku: 'FRAME-001',
  quantities: { LAB: 20, BRANCH_01: 5 },
  sellableQuantities: { LAB: 18, BRANCH_01: 4 }
}];

function form(sourceLocationCode = 'LAB', destinationLocationCode = 'BRANCH_01', quantity = '3') {
  return {
    sourceLocationCode,
    destinationLocationCode,
    locations,
    inventory,
    lines: [{ sku: 'FRAME-001', quantity }]
  };
}

test('validates transfers in either direction against selected source stock', () => {
  assert.equal(validateTransferForm(form()), null);
  assert.equal(validateTransferForm(form('BRANCH_01', 'LAB', '4')), null);
  assert.equal(getQuantityAtLocation(inventory[0], 'BRANCH_01'), 5);
  assert.equal(getSellableQuantityAtLocation(inventory[0], 'BRANCH_01'), 4);
  assert.equal(validateTransferForm(form('BRANCH_01', 'LAB', '5')), 'Số lượng điều chuyển vượt tồn hiện tại tại kho nguồn.');
});

test('requires distinct valid locations and positive integer quantities', () => {
  assert.match(validateTransferForm(form('', 'BRANCH_01')), /kho nguồn/);
  assert.match(validateTransferForm(form('LAB', 'LAB')), /phải khác nhau/);
  assert.match(validateTransferForm(form('LAB', 'UNKNOWN')), /kho đích/);
  assert.match(validateTransferForm(form('LAB', 'BRANCH_01', '0')), /số lượng nguyên/);
  assert.match(validateTransferForm(form('LAB', 'BRANCH_01', '-1')), /số lượng nguyên/);
  assert.match(validateTransferForm(form('LAB', 'BRANCH_01', '1.5')), /số lượng nguyên/);
});

test('rejects duplicate SKUs and builds the backend request shape', () => {
  const duplicate = form();
  duplicate.lines.push({ sku: 'FRAME-001', quantity: '1' });
  assert.match(validateTransferForm(duplicate), /một lần/);
  assert.deepEqual(buildTransferPayload({
    sourceLocationCode: 'BRANCH_01',
    destinationLocationCode: 'LAB',
    reason: ' return ',
    lines: [{ sku: ' FRAME-001 ', quantity: '2' }]
  }), {
    sourceLocationCode: 'BRANCH_01',
    destinationLocationCode: 'LAB',
    reason: 'return',
    items: [{ sku: 'FRAME-001', quantity: 2 }]
  });
});
