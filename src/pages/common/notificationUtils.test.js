import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePollIntervalMs,
  categoryMeta,
  channelStatusBadge,
  resolvePortalActionRoute,
  applySingleMarkRead,
} from './notificationUtils.js';
import { ROLES } from '../../routes/rolesConfig.js';

test('normalizePollIntervalMs clamps between 5s and 120s and defaults to 15s', () => {
  assert.equal(normalizePollIntervalMs(undefined), 15000);
  assert.equal(normalizePollIntervalMs(1), 5000);
  assert.equal(normalizePollIntervalMs(20), 20000);
  assert.equal(normalizePollIntervalMs(600), 120000);
});

test('channelStatusBadge honestly marks unconfigured SMS as Blocked and In-App as Delivered', () => {
  const inApp = channelStatusBadge('In-App', 'DELIVERED', 'Lưu DB');
  const smsBlocked = channelStatusBadge('SMS', 'BLOCKED_PROVIDER_UNCONFIGURED', 'Thiếu URL');
  const smsSent = channelStatusBadge('SMS', 'SENT', 'HTTP 202');
  assert.equal(inApp.text, 'In-App: Đã nhận');
  assert.equal(smsBlocked.color, 'gold');
  assert.match(smsBlocked.text, /Blocked/);
  assert.equal(smsSent.color, 'green');
});

test('resolvePortalActionRoute blocks unauthorized routes per staff role', () => {
  assert.equal(resolvePortalActionRoute('/orders', ROLES.POS), '/orders');
  assert.equal(resolvePortalActionRoute('/orders', ROLES.OPTOMETRY), null);
  assert.equal(resolvePortalActionRoute('/optometry-appointments', ROLES.OPTOMETRY), '/optometry-appointments');
  assert.equal(resolvePortalActionRoute('/lab', ROLES.LAB), '/lab');
});

test('applySingleMarkRead marks item read and decrements unreadCount once', () => {
  const initial = [
    { id: 10, read: false, title: 'Kính sẵn sàng' },
    { id: 11, read: false, title: 'Lịch hẹn' },
  ];
  const afterFirst = applySingleMarkRead(initial, 2, { id: 10, read: true, readAt: '2026-11-10T10:00:00' });
  assert.equal(afterFirst.unreadCount, 1);
  assert.equal(afterFirst.items[0].read, true);

  const afterRepeat = applySingleMarkRead(afterFirst.items, afterFirst.unreadCount, { id: 10, read: true });
  assert.equal(afterRepeat.unreadCount, 1);
});

test('categoryMeta returns labels for LAB_READY, APPOINTMENT, and WARRANTY', () => {
  assert.equal(categoryMeta('LAB_READY').color, 'green');
  assert.equal(categoryMeta('APPOINTMENT').color, 'blue');
  assert.equal(categoryMeta('WARRANTY').color, 'purple');
});
