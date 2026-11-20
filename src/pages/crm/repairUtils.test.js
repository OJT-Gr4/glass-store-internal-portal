import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairPayload, pickupDefault } from './repairUtils.js';

const valid=()=>({customerId:42,orderId:99,orderItemId:7,customerName:' Khách ',customerPhone:'0901234567',productName:'Gọng',frameCondition:'Lỏng ốc',lensCondition:'Nguyên vẹn',reportedProblem:'Kính lỏng',physicalCondition:'Không xước khác',requestedServices:['FRAME_ADJUSTMENT'],expectedPickupAt:pickupDefault()});
test('reception preserves actual conditions and adds the current employee and local pickup timestamp',()=>{
  const result=repairPayload(valid(),'QA Staff');
  assert.equal(result.customerName,'Khách');assert.equal(result.receptionEmployee,'QA Staff');
  assert.equal(result.frameCondition,'Lỏng ốc');assert.equal(result.orderId,99);assert.equal(result.customerId,42);assert.match(result.expectedPickupAt,/:00$/);
});
test('missing actor, purchase identity or unsupported service cannot create a receipt',()=>{
  assert.throws(()=>repairPayload(valid(),''),/nhân viên/);
  assert.throws(()=>repairPayload({...valid(),orderId:null},'QA'),/đơn hàng/);
  assert.equal(repairPayload({...valid(),customerId:null},'QA').customerId,null);
  assert.throws(()=>repairPayload({...valid(),customerId:'CUS-42'},'QA'),/không hợp lệ/);
  assert.throws(()=>repairPayload({...valid(),requestedServices:['FAKE_SERVICE']},'QA'),/dịch vụ/);
  assert.throws(()=>repairPayload({...valid(),expectedPickupAt:'2000-01-01T10:00'},'QA'),/Giờ hẹn/);
});
