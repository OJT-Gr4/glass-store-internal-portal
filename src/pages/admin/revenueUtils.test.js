import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateRevenue, isRevenueOrder, revenueBranch, inReportingPeriod } from './revenueUtils.js';
const order = (status, channel, branchCode, finalAmount) => ({ status, channel, branchCode, finalAmount, items: [{ productName: 'Gọng', quantity: 2, unitPrice: 100 }, { productName: 'Tròng', quantity: 1, unitPrice: 100 }] });
test('paid POS orders accrue to their actual branch and website remains Online', () => {
  const rows = [order('PAID','POS','BRANCH_01',270), order('COMPLETED','POS','BRANCH_02',600), order('PAID','ONLINE','BRANCH_01',150), order('PENDING_PAYMENT','POS','BRANCH_01',999), order('REFUNDED','POS','BRANCH_02',999)];
  const summary = aggregateRevenue(rows);
  assert.equal(summary.total,1020);assert.equal(summary.paid.length,3);
  assert.equal(summary.branches.find(b=>b.code==='BRANCH_01').revenue,270);
  assert.equal(summary.branches.find(b=>b.code==='BRANCH_02').revenue,600);
  assert.equal(summary.branches.find(b=>b.code==='ONLINE').revenue,150);
  assert.equal(summary.products.reduce((s,p)=>s+p.revenue,0),1020);assert.equal(summary.products.find(p=>p.name==='Gọng').quantity,6);
});
test('refunds cancellations invalid amounts and unknown statuses do not count', () => {
  for(const status of ['PENDING_PAYMENT','CANCELLED','REFUND_PENDING','REFUNDED','UNKNOWN',null])assert.equal(isRevenueOrder(order(status,'POS','BRANCH_01',500)),false);
  assert.equal(isRevenueOrder(order('PAID','POS','BRANCH_01',-1)),false);
  assert.equal(isRevenueOrder(order('PAID','POS','BRANCH_01','bad')),false);
  assert.equal(isRevenueOrder(order('CONFIRMED','POS','BRANCH_01',0)),true);
});
test('legacy branch names resolve without assigning unknown POS sales to branch 01', () => {
  assert.equal(revenueBranch({channel:'POS',branchName:'Chi Nhánh Hoàn Kiếm (Hà Nội)'}).code,'BRANCH_02');
  assert.equal(revenueBranch({channel:'POS'}).code,'UNKNOWN');
  assert.equal(revenueBranch({channel:'ONLINE',branchCode:'BRANCH_02'}).code,'ONLINE');
});
test('month and quarter filters follow calendar boundaries in Vietnam', () => {
  const now=new Date('2026-11-20T03:00:00Z');
  assert.equal(inReportingPeriod({createdAt:'2026-10-31T23:59:00'},'month',now),false);
  assert.equal(inReportingPeriod({createdAt:'2026-11-01T00:00:00'},'month',now),true);
  assert.equal(inReportingPeriod({createdAt:'2026-10-01T00:00:00'},'quarter',now),true);
  assert.equal(inReportingPeriod({createdAt:'2026-09-30T23:59:00'},'quarter',now),false);
  assert.equal(inReportingPeriod({createdAt:'2026-11-21T00:00:00'},'month',now),false);
});
