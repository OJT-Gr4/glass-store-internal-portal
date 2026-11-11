import React, { useState } from 'react';
import { message } from 'antd';
import { customerApi } from '../../api/customerApi';

export default function CustomerReceptionModal({
  open,
  onClose,
  customers = [],
  onSelectCustomer,
  onCustomerCreated
}) {
  const [tab, setTab] = useState('search'); // 'search' | 'create'
  const [searchQuery, setSearchQuery] = useState('');

  // Create Customer Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('NAM');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!open) return null;

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.phoneNumber || '').includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim().replace(/\s+/g, '');
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại.');
      return;
    }
    // Vietnam phone format validation (10 digits starting with 0)
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Định dạng email không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        email: trimmedEmail || undefined,
        address: address.trim() || undefined,
        gender,
        marketingConsent,
        tier: 'STANDARD'
      };

      const newCustomer = await customerApi.createCustomer(payload);
      if (!newCustomer || !newCustomer.id) {
        throw new Error('Máy chủ chưa trả về mã khách hàng hợp lệ.');
      }

      message.success(`Đã tạo thành công khách hàng: ${newCustomer.fullName}`);
      if (onCustomerCreated) {
        onCustomerCreated(newCustomer);
      }
      // Reset form
      setFullName('');
      setPhoneNumber('');
      setEmail('');
      setAddress('');
      setGender('NAM');
      setMarketingConsent(true);
      onClose();
    } catch (err) {
      console.error('Lỗi tạo khách hàng từ POS:', err);
      setErrorMessage(err.message || 'Không thể tạo hồ sơ khách hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#263143]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-slate-100 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#004967] text-[26px]">
              person_add
            </span>
            <div>
              <h3 className="text-base text-[#111c2d] font-bold">
                Tiếp Nhận Khách Hàng
              </h3>
              <p className="text-xs text-slate-500">
                Tìm kiếm khách hàng cũ hoặc tạo nhanh khách hàng mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#70787f] hover:text-[#111c2d] transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setTab('search'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'search'
                ? 'bg-white text-[#004967] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">search</span>
            Tìm kiếm khách ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => { setTab('create'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'create'
                ? 'bg-[#004967] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            + Tạo nhanh khách mới
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Search Existing */}
        {tab === 'search' && (
          <div className="space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#70787f] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên, số điện thoại hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-[#f8faff] hover:bg-[#e7eeff] border border-slate-100 hover:border-[#004967]/20 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#111c2d] truncate">
                        {c.fullName}
                      </span>
                      {c.id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          #{c.id}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#70787f] flex items-center gap-2 mt-0.5">
                      <span>{c.phoneNumber || 'Chưa có SĐT'}</span>
                      {c.email && <span className="truncate">• {c.email}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 px-3 py-1 rounded-lg bg-[#004967] text-white text-xs font-semibold group-hover:bg-[#003850] transition-colors"
                  >
                    Tiếp nhận
                  </button>
                </div>
              ))}

              {filteredCustomers.length === 0 && (
                <div className="py-10 text-center text-[#70787f] text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] text-slate-300">
                    person_off
                  </span>
                  <span>Không tìm thấy khách hàng nào phù hợp.</span>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="text-[#004967] font-bold hover:underline"
                  >
                    + Tạo nhanh khách mới ngay
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Create New Customer */}
        {tab === 'create' && (
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="0901234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={11}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giới tính
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                >
                  <option value="NAM">Nam</option>
                  <option value="NU">Nữ</option>
                  <option value="KHAC">Khác</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#004967]/30"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="rounded text-[#004967]"
              />
              <span>Đồng ý nhận tin nhắn chăm sóc và thông báo bảo hành (SMS/Zalo)</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTab('search')}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-[#004967] hover:bg-[#003850] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      how_to_reg
                    </span>
                    Tạo & Tiếp Nhận Ngay
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer for search tab */}
        {tab === 'search' && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Tổng số: <strong>{filteredCustomers.length}</strong> khách hàng
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

