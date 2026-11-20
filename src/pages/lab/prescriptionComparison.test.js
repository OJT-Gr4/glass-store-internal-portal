import test from 'node:test';
import assert from 'node:assert/strict';
import { prescriptionDifferences } from './prescriptionComparison.js';

const rx = { odSph: -2, odCyl: -1, odAxis: 90, odAdd: 0, osSph: -3, osCyl: -.5, osAxis: 80, osAdd: 0, pd: 63 };
test('numeric formatting does not create false conflicts', () => {
  assert.deepEqual(prescriptionDifferences(rx, { ...rx, odSph: '-2.00', pd: '63.0' }), []);
});
test('lists each different field and does not replace the entered measurements', () => {
  assert.deepEqual(prescriptionDifferences(rx, { ...rx, odCyl: 0, osAxis: 100, pd: 64 }),
    [['odCyl', 'OD CYL'], ['osAxis', 'OS AXIS'], ['pd', 'PD']]);
  assert.equal(rx.odCyl, -1);
});
test('missing or invalid numbers are not silently treated as zero', () => {
  for (const value of [null, '', 'invalid']) {
    assert.deepEqual(prescriptionDifferences(rx, { ...rx, odAdd: value }), [['odAdd', 'OD ADD']]);
  }
});
