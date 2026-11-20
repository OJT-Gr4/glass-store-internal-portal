export function todayIsoVietnam(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function defaultBookingSlot(now = new Date()) {
  const date = todayIsoVietnam(now);
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  const nextDate = todayIsoVietnam(next);
  const hhmm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(next);
  return { date: nextDate >= date ? nextDate : date, time: hhmm };
}

export function validateAppointmentBooking({ date, time }, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) {
    throw new Error('Vui lòng chọn đầy đủ ngày khám và giờ khám hợp lệ.');
  }
  const timestamp = `${date}T${time}:00+07:00`;
  const scheduled = new Date(timestamp);
  if (!Number.isFinite(scheduled.getTime())) {
    throw new Error('Ngày giờ khám không hợp lệ.');
  }
  const actualDate = todayIsoVietnam(scheduled);
  if (actualDate !== date) {
    throw new Error('Ngày khám không hợp lệ.');
  }
  if (scheduled.getTime() <= now.getTime()) {
    throw new Error('Ngày và giờ khám không được nhỏ hơn thời điểm hiện tại.');
  }
  return { scheduledTime: timestamp };
}

export function formatDiopter(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return (num > 0 ? '+' : '') + num.toFixed(2);
}

export function sortPrescriptionsAsc(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return Number(a?.id || 0) - Number(b?.id || 0);
  });
}

export function validateCustomerPayload({ fullName, phoneNumber, email }) {
  const trimmedName = (fullName || '').trim();
  const trimmedPhone = (phoneNumber || '').trim().replace(/\s+/g, '');
  const trimmedEmail = (email || '').trim();

  if (!trimmedName) {
    throw new Error('Vui lòng nhập họ và tên khách hàng.');
  }
  if (!trimmedPhone) {
    throw new Error('Vui lòng nhập số điện thoại.');
  }
  const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    throw new Error('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
  }
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('Định dạng email không hợp lệ (ví dụ: khachhang@gmail.com).');
  }
  return {
    fullName: trimmedName,
    phoneNumber: trimmedPhone,
    email: trimmedEmail || null
  };
}
