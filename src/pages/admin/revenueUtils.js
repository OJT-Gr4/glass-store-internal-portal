export const REVENUE_STATUSES = ['PAID', 'PENDING_CONFIRMATION', 'CONFIRMED', 'LAB_DISPATCH_FAILED', 'PROCESSING', 'COMPLETED', 'DELIVERED', 'SHIPPING', 'PREPARING', 'READY_FOR_PICKUP'];
export function isRevenueOrder(order) {
  return REVENUE_STATUSES.includes(String(order.status || '').toUpperCase()) && Number.isFinite(Number(order.finalAmount)) && Number(order.finalAmount) >= 0;
}
export function revenueBranch(order) {
  if (String(order.channel).toUpperCase() === 'ONLINE') return { code: 'ONLINE', name: 'Website trực tuyến' };
  const code = String(order.branchCode || '').toUpperCase();
  if (code === 'BRANCH_01') return { code, name: 'Chi nhánh 01 - Lê Thánh Tôn' };
  if (code === 'BRANCH_02') return { code, name: 'Chi nhánh 02 - Tràng Tiền (HN)' };
  const text = String(order.branchName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/chi nhanh 01|le thanh ton|flagship|q\.1/.test(text)) return revenueBranch({ ...order, branchCode: 'BRANCH_01' });
  if (/chi nhanh 02|trang tien|ha noi|hoan kiem/.test(text)) return revenueBranch({ ...order, branchCode: 'BRANCH_02' });
  return { code: 'UNKNOWN', name: 'POS chưa xác định chi nhánh' };
}
function vnDate(value) {
  const input = typeof value === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+$/.test(value) ? `${value}+07:00` : value;
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function inReportingPeriod(order, period, now = new Date()) {
  if (!order.createdAt) return false;
  const day = vnDate(order.createdAt), today = vnDate(now);
  if (!day || day > today) return false;
  if (period === 'today') return day === today;
  if (period === 'month') return day.slice(0, 7) === today.slice(0, 7);
  if (period === 'quarter') return day.slice(0, 4) === today.slice(0, 4) && Math.floor((Number(day.slice(5, 7)) - 1) / 3) === Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  if (period === '7days') return Date.parse(`${today}T00:00:00+07:00`) - Date.parse(`${day}T00:00:00+07:00`) <= 6 * 86400000;
  return true;
}
export function aggregateRevenue(orders) {
  const paid = orders.filter(isRevenueOrder), branches = new Map(), products = new Map();
  let total = 0;
  for (const order of paid) {
    const amount = Number(order.finalAmount); total += amount;
    const branch = revenueBranch(order), group = branches.get(branch.code) || { ...branch, count: 0, revenue: 0 };
    group.count++; group.revenue += amount; branches.set(branch.code, group);
    const lines = (order.items || []).filter(line => Number(line.quantity) > 0);
    const weights = lines.map(line => Math.max(0, Number(line.subtotal ?? line.totalPrice ?? Number(line.unitPrice || 0) * Number(line.quantity)) || 0));
    const sum = weights.reduce((a, b) => a + b, 0); let allocated = 0;
    lines.forEach((line, index) => {
      const revenue = index === lines.length - 1 ? amount - allocated : sum > 0 ? Math.round(amount * weights[index] / sum) : 0;
      allocated += revenue;
      const name = line.productName || line.skuId || line.sku || 'Sản phẩm';
      const product = products.get(name) || { name, quantity: 0, revenue: 0 };
      product.quantity += Number(line.quantity); product.revenue += revenue; products.set(name, product);
    });
  }
  return { paid, total, branches: [...branches.values()].sort((a, b) => b.revenue - a.revenue), products: [...products.values()].sort((a, b) => b.revenue - a.revenue) };
}
