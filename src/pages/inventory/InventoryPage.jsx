import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../routes/rolesConfig';
import { isLowStock } from './inventoryUtils';

const CATEGORY_LABELS = {
  FRAME: 'Gọng kính',
  LENS: 'Tròng kính',
  SUNGLASSES: 'Kính mát',
  ACCESSORY: 'Phụ kiện'
};

const quantityAt = (item, locationCode) => Number(item.quantities?.[locationCode] ?? 0);
const sellableQuantityAt = (item, locationCode) => Number(
  item.sellableQuantities?.[locationCode] ?? quantityAt(item, locationCode)
);

export default function InventoryPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationError, setReconciliationError] = useState('');

  const loadInventory = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [response, locationsResponse] = await Promise.all([
        inventoryApi.getInventory(),
        inventoryApi.getLocations()
      ]);
      if (!Array.isArray(response?.data) || !Array.isArray(locationsResponse?.data)) {
        throw new Error('Dữ liệu tồn kho từ máy chủ không hợp lệ.');
      }
      setInventory(response.data);
      setLocations(locationsResponse.data.map((location) => ({
        code: location.code,
        label: location.name
      })));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Không thể tải dữ liệu tồn kho.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const reconcileInventory = async () => {
    setReconciliationLoading(true);
    setReconciliationError('');
    try {
      const response = await inventoryApi.getReconciliation();
      if (!response?.data
          || !Array.isArray(response.data.balanceVariances)
          || !Array.isArray(response.data.transferVariances)) {
        throw new Error('Dữ liệu đối soát từ máy chủ không hợp lệ.');
      }
      setReconciliation(response.data);
    } catch (reconciliationLoadError) {
      setReconciliationError(reconciliationLoadError.message || 'Không thể đối soát tồn kho.');
    } finally {
      setReconciliationLoading(false);
    }
  };

  useEffect(() => {
    loadInventory(true);
    const refreshTimer = window.setInterval(() => loadInventory(), 15000);
    const handleSync = () => loadInventory();
    window.addEventListener('inventory-changed', handleSync);
    window.addEventListener('storage', (e) => {
      if (e.key === 'optivision_last_inventory_sync') handleSync();
    });
    window.addEventListener('focus', handleSync);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('inventory-changed', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [loadInventory]);

  const activeLocations = locations.length > 0 ? locations : DEFAULT_LOCATIONS;

  const filteredInventory = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesQuery = !searchTerm
        || item.sku?.toLowerCase().includes(searchTerm)
        || item.productName?.toLowerCase().includes(searchTerm);
      const matchesCategory = category === 'ALL' || category === 'LOW_STOCK' || item.productType === category;
      const matchesLowStock = category !== 'LOW_STOCK'
        || locations.some(({ code }) => isLowStock(quantityAt(item, code)));
      return matchesQuery && matchesCategory && matchesLowStock;
    });
  }, [inventory, locations, query, category]);

  const lowStockLocations = locations.reduce((total, { code }) =>
    total + inventory.filter((item) => isLowStock(quantityAt(item, code))).length, 0);

  return (
    <main className="min-h-screen w-full bg-[#f9f9ff]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl border border-[#d8e3fb]/50 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#086288]">Kho vận / Tồn kho</p>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Đồng bộ trực tiếp với quầy POS
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Tồn kho đa chi nhánh</h1>
            <p className="mt-1 text-sm text-slate-600">Số lượng theo SKU tại từng địa điểm. Cảnh báo áp dụng riêng từng kho khi tồn dưới 5.</p>
          </div>
          <button
            type="button"
            onClick={() => loadInventory(true)}
            disabled={loading}
            className="rounded-lg bg-[#086288] px-4 py-2 text-sm font-semibold text-white hover:bg-[#064e6d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
          {user?.role === ROLES.ADMIN && (
            <button
              type="button"
              onClick={reconcileInventory}
              disabled={reconciliationLoading}
              className="rounded-lg border border-[#086288] px-4 py-2 text-sm font-semibold text-[#086288] hover:bg-sky-50 disabled:opacity-60"
            >
              {reconciliationLoading ? 'Đang đối soát…' : 'Đối soát tồn'}
            </button>
          )}
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#d8e3fb]/50 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU đang theo dõi</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{inventory.length}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Lượt cảnh báo tồn thấp</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{lowStockLocations}</p>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Không thể đồng bộ tồn kho: {error}
          </div>
        )}

        {user?.role === ROLES.ADMIN && reconciliationError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Không thể đối soát: {reconciliationError}
          </div>
        )}
        {user?.role === ROLES.ADMIN && reconciliation && (
          <section className="space-y-3 rounded-xl border border-[#d8e3fb]/50 bg-white p-4 shadow-sm" aria-label="Kết quả đối soát tồn kho">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Đối soát tồn kho</h2>
              <span className="text-xs text-slate-500">
                Kiểm tra lúc {new Date(reconciliation.checkedAt).toLocaleString('vi-VN')}
              </span>
            </div>
            <p className="text-sm text-slate-700">{reconciliation.coverageNote}</p>
            {reconciliation.balanceVariances.length === 0 && reconciliation.transferVariances.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                Không phát hiện sai lệch giữa số dư tổng và tồn theo địa điểm, hoặc giữa phiếu điều chuyển và biến động tương ứng.
              </p>
            ) : (
              <div className="space-y-4">
                {reconciliation.balanceVariances.length > 0 && (
                  <div className="overflow-x-auto">
                    <h3 className="mb-2 text-sm font-semibold text-red-800">Sai lệch số dư theo SKU</h3>
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead className="bg-red-50 text-xs uppercase text-red-800">
                        <tr><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Sản phẩm</th><th className="px-3 py-2">Tổng variant</th><th className="px-3 py-2">Tổng địa điểm</th><th className="px-3 py-2">Chênh lệch</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reconciliation.balanceVariances.map((row) => (
                          <tr key={row.sku}>
                            <td className="px-3 py-2 font-mono">{row.sku}</td><td className="px-3 py-2">{row.productName}</td>
                            <td className="px-3 py-2">{row.variantStockQuantity}</td><td className="px-3 py-2">{row.locationQuantity}</td>
                            <td className="px-3 py-2 font-semibold text-red-700">{row.difference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {reconciliation.transferVariances.length > 0 && (
                  <div className="overflow-x-auto">
                    <h3 className="mb-2 text-sm font-semibold text-red-800">Sai lệch phiếu / biến động điều chuyển</h3>
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-red-50 text-xs uppercase text-red-800">
                        <tr><th className="px-3 py-2">Mã phiếu</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Xuất dự kiến / thực tế</th><th className="px-3 py-2">Nhập dự kiến / thực tế</th><th className="px-3 py-2">Chi tiết</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reconciliation.transferVariances.map((row, index) => (
                          <tr key={`${row.transferCode}-${row.sku}-${index}`}>
                            <td className="px-3 py-2 font-mono">{row.transferCode}</td><td className="px-3 py-2">{row.status}</td><td className="px-3 py-2 font-mono">{row.sku}</td>
                            <td className="px-3 py-2">{row.expectedOutQuantity} / {row.actualOutQuantity}</td>
                            <td className="px-3 py-2">{row.expectedInQuantity} / {row.actualInQuantity}</td><td className="px-3 py-2">{row.issue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-[#d8e3fb]/50 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="sr-only" htmlFor="inventory-search">Tìm SKU hoặc sản phẩm</label>
            <input
              id="inventory-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm SKU hoặc tên sản phẩm…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#086288] md:max-w-md"
            />
            <div className="flex flex-wrap gap-2" aria-label="Lọc sản phẩm">
              {[
                ['ALL', 'Tất cả'],
                ['FRAME', 'Gọng kính'],
                ['LENS', 'Tròng kính'],
                ['LOW_STOCK', 'Có cảnh báo']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={category === value}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === value
                      ? value === 'LOW_STOCK' ? 'bg-red-100 text-red-800' : 'bg-[#086288] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading && inventory.length === 0 ? (
            <div role="status" className="py-12 text-center text-sm text-slate-600">Đang tải tồn kho…</div>
          ) : error && inventory.length === 0 ? (
            <div role="alert" className="py-12 text-center text-sm text-red-800">Không thể tải dữ liệu tồn kho: {error}</div>
          ) : !error && filteredInventory.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-600">
              {inventory.length === 0 ? 'Chưa có dữ liệu tồn kho.' : 'Không tìm thấy sản phẩm phù hợp.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-3">SKU</th>
                    <th scope="col" className="px-3 py-3">Sản phẩm</th>
                    <th scope="col" className="px-3 py-3">Loại</th>
                    {locations.map((location) => (
                      <th scope="col" key={location.code} className="px-3 py-3 text-center">{location.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((item) => (
                    <tr key={item.sku} className="hover:bg-slate-50">
                      <th scope="row" className="whitespace-nowrap px-3 py-3 font-mono text-xs font-semibold text-[#086288]">
                        {item.sku}
                      </th>
                      <td className="px-3 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-3 py-3 text-slate-600">{CATEGORY_LABELS[item.productType] || item.productType}</td>
                      {locations.map((location) => {
                        const quantity = quantityAt(item, location.code);
                        const sellableQuantity = sellableQuantityAt(item, location.code);
                        const lowStock = isLowStock(quantity);
                        return (
                          <td key={location.code} className="px-3 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                                lowStock ? 'bg-red-100 text-red-800' : 'bg-emerald-50 text-emerald-800'
                              }`}
                              aria-label={`${quantity} chiếc, ${sellableQuantity} bán được${lowStock ? ', cảnh báo tồn thấp' : ''}`}
                            >
                              {quantity}
                              {lowStock && <span className="text-[10px]">Thấp</span>}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">Bán được: {sellableQuantity}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
