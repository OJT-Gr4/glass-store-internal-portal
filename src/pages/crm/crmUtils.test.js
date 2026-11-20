import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDiopter,
  sortPrescriptionsAsc,
  todayIsoVietnam,
  validateAppointmentBooking,
} from './crmUtils.js';

test('validateAppointmentBooking rejects past dates and times in Asia/Ho_Chi_Minh', () => {
  const now = new Date('2026-11-13T08:03:00+07:00');
  assert.equal(todayIsoVietnam(now), '2026-11-13');

  assert.throws(
    () => validateAppointmentBooking({ date: '2026-11-05', time: '10:00' }, now),
    /không được nhỏ hơn/
  );
  assert.throws(
    () => validateAppointmentBooking({ date: '2026-11-13', time: '07:30' }, now),
    /không được nhỏ hơn/
  );
  const ok = validateAppointmentBooking({ date: '2026-11-13', time: '10:00' }, now);
  assert.equal(ok.scheduledTime, '2026-11-13T10:00:00+07:00');
});

test('sortPrescriptionsAsc and formatDiopter order visits chronologically', () => {
  const sorted = sortPrescriptionsAsc([
    { id: 12, createdAt: '2026-11-13T08:00:00', odSph: -2.25 },
    { id: 9, createdAt: '2026-10-01T09:00:00', odSph: -1.75 },
  ]);
  assert.deepEqual(sorted.map(x => x.id), [9, 12]);
  assert.equal(formatDiopter(-1.75), '-1.75');
  assert.equal(formatDiopter(1.25), '+1.25');
  assert.equal(formatDiopter(0), '0.00');
});
