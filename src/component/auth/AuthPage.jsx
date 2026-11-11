import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../api/staffApi';
import { authApi } from '../../api/authApi';
import { message, Modal } from 'antd';

// Department roles for registration
const DEPARTMENT_ROLES = [
  { key: 'pos', name: 'Thu Ngân & POS' },
  { key: 'optometry', name: 'Khúc Xạ' },
  { key: 'lab', name: 'KTV Lab Lens' },
  { key: 'admin', name: 'Quản Trị' }
];

const BRANCH_OPTIONS = [
  { value: 'CN-01', label: 'Chi nhánh 01 - Lê Thánh Tôn, Quận 1' },
  { value: 'CN-02', label: 'Chi nhánh 02 - Tràng Tiền, Hà Nội' },
  { value: 'CN-LAB', label: 'Trung tâm Lab Lens Tân Bình' },
  { value: 'HQ', label: 'Trụ sở Quản trị Toàn quốc' }
];

export default function AuthPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');

  // Login Form
  const [storeBranch, setStoreBranch] = useState('CN-01');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('pos');
  const [regBranch, setRegBranch] = useState('CN-01');
  const [regMedicalCert, setRegMedicalCert] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regAgreed, setRegAgreed] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetChallenge, setResetChallenge] = useState(null);
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Simplified Password Strength (Yếu, Trung bình, Mạnh)
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '', textColor: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Yếu', color: 'bg-rose-500', textColor: 'text-rose-600', percent: 33 };
    if (score === 2) return { label: 'Trung bình', color: 'bg-amber-500', textColor: 'text-amber-600', percent: 66 };
    return { label: 'Mạnh', color: 'bg-emerald-500', textColor: 'text-emerald-600', percent: 100 };
  };

  const passwordStrength = getPasswordStrength(regPassword);
  const isConfirmEntered = regConfirmPassword.length > 0;
  const isPasswordMatch = isConfirmEntered && regPassword === regConfirmPassword;
  const isPasswordMismatch = isConfirmEntered && regPassword !== regConfirmPassword;

  // Submit Login
  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();

    const trimmedStaffId = staffId.trim();
    if (!trimmedStaffId) {
      message.error('Vui lòng nhập tài khoản hoặc email!');
      return;
    }

    const trimmedPassword = password;
    if (!trimmedPassword) {
      message.error('Vui lòng nhập mật khẩu!');
      return;
    }

    setIsSubmitting(true);
    try {
      const branchObj = BRANCH_OPTIONS.find((b) => b.value === storeBranch);

      const userData = {
        username: trimmedStaffId,
        password: trimmedPassword,
        branchName: branchObj ? branchObj.label : 'Chi nhánh 01 - Lê Thánh Tôn'
      };

      const defaultRoute = await login(userData);
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }

      const returnUrl = location.state?.from?.pathname || defaultRoute || '/dashboard';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      message.error(err.message || 'Mật khẩu không chính xác hoặc tài khoản không tồn tại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Register
  const handleStaffRegister = async (e) => {
    if (e) e.preventDefault();

    const trimmedName = regFullName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      message.error('Vui lòng nhập họ và tên (ít nhất 3 ký tự)!');
      return;
    }

    const trimmedEmail = regEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      message.error('Vui lòng nhập email hợp lệ!');
      return;
    }

    const trimmedPhone = regPhone.trim().replace(/\s+/g, '');
    const phoneRegex = /^(0|\+84)[0-9]{9}$/;
    if (!trimmedPhone || !phoneRegex.test(trimmedPhone)) {
      message.error('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)!');
      return;
    }

    if (!regPassword || regPassword.length < 8) {
      message.error('Mật khẩu phải có tối thiểu 8 ký tự!');
      return;
    }

    const hasLower = /[a-z]/.test(regPassword);
    const hasUpper = /[A-Z]/.test(regPassword);
    const hasNumber = /\d/.test(regPassword);
    if (!hasLower || !hasUpper || !hasNumber) {
      message.error('Mật khẩu cần chứa chữ hoa, chữ thường và chữ số!');
      return;
    }

    if (!regConfirmPassword) {
      message.error('Vui lòng nhập lại mật khẩu xác nhận!');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      message.error('Mật khẩu xác nhận không trùng khớp!');
      return;
    }

    if (regRole === 'optometry' && !regMedicalCert.trim()) {
      message.error('Vui lòng nhập số chứng chỉ hành nghề khúc xạ!');
      return;
    }

    if (!regAgreed) {
      message.error('Vui lòng đồng ý với quy định bảo mật nội bộ!');
      return;
    }

    setIsSubmitting(true);
    try {
      const roleMapping = {
        pos: 'ROLE_SALES_STAFF',
        optometry: 'ROLE_OPTOMETRIST',
        lab: 'ROLE_LAB_TECH',
        admin: 'ROLE_ADMIN'
      };

      const branchObj = BRANCH_OPTIONS.find((b) => b.value === regBranch);
      const randomCode = `STF-${Math.floor(100 + Math.random() * 900)}`;

      const created = await staffApi.createStaff({
        fullName: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        branchName: branchObj ? branchObj.label : 'Chi nhánh 01 - Lê Thánh Tôn',
        employeeCode: randomCode,
        roleName: roleMapping[regRole] || 'ROLE_SALES_STAFF',
        password: regPassword.trim(),
        status: 'PENDING'
      });

      Modal.success({
        title: 'Gửi yêu cầu đăng ký thành công',
        content: (
          <div className="space-y-2 text-slate-600 text-sm pt-2">
            <p>Hồ sơ của <strong>{trimmedName}</strong> đã được gửi tới Quản trị viên (Admin) để phê duyệt.</p>
            <p className="p-2 bg-slate-100 rounded text-xs font-mono">
              Mã hồ sơ: {created?.employeeCode || randomCode} • Email: {trimmedEmail}
            </p>
            <p className="text-xs text-slate-500">Sau khi Admin duyệt, bạn có thể dùng tài khoản này để đăng nhập.</p>
          </div>
        ),
        onOk: () => {
          setAuthMode('login');
          setStaffId('');
          setPassword('');
        }
      });
    } catch (err) {
      message.error(err.message || 'Lỗi khi gửi yêu cầu đăng ký');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col justify-between antialiased">
      {/* Simple Clean Header */}
      <header className="w-full bg-white border-b border-slate-200 py-3.5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004967] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </div>
            <span className="text-lg font-bold text-[#004967] tracking-tight">OptiVision</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">Hệ Thống Nội Bộ</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className={`w-full ${authMode === 'login' ? 'max-w-[520px]' : 'max-w-[680px]'} bg-white rounded-2xl shadow-sm border border-slate-200 p-7 sm:p-10 transition-all`}>
          {/* Form Header Title */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-[#004967] tracking-tight">
              {authMode === 'login' ? 'Đăng Nhập Nội Bộ' : 'Đăng Ký Nhân Sự Nội Bộ'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {authMode === 'login'
                ? 'Hệ thống quản trị bán hàng & khám khúc xạ chuỗi OptiVision'
                : 'Đăng ký thông tin công tác dành cho nhân viên mới'}
            </p>
          </div>

          {/* Form Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-white text-[#004967] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register'
                  ? 'bg-white text-[#004967] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đăng Ký Tài Khoản
            </button>
          </div>

          {/* Department Select (Register mode only) */}
          {authMode === 'register' && (
            <div className="flex flex-col gap-1.5 mb-5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Phân hệ công tác *
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/60">
                {DEPARTMENT_ROLES.map((item) => {
                  const isActive = regRole === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRegRole(item.key)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                        isActive
                          ? 'bg-[#004967] text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= FORM LOGIN ================= */}
          {authMode === 'login' ? (
            <form onSubmit={handleStaffLogin} className="flex flex-col gap-4">
              {/* Branch */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Chi nhánh làm việc</label>
                <select
                  value={storeBranch}
                  onChange={(e) => setStoreBranch(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967] bg-white cursor-pointer"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Staff ID / Username */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Tài khoản / Email / Mã nhân viên</label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="Nhập username, email hoặc mã NV..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 rounded-xl text-sm font-semibold bg-[#004967] hover:bg-[#086288] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.99] disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <div className="text-center pt-2">
                <span
                  onClick={() => {
                    setResetIdentifier(staffId);
                    setResetChallenge(null);
                    setResetOtpCode('');
                    setResetNewPassword('');
                    setResetModalOpen(true);
                  }}
                  className="text-xs text-slate-500 hover:text-[#004967] cursor-pointer"
                >
                  Quên mật khẩu / Xác thực OTP?
                </span>
              </div>
            </form>
          ) : (
            /* ================= FORM REGISTER ================= */
            <form onSubmit={handleStaffRegister} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nhanvien@optivision.vn"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Chi nhánh làm việc *</label>
                  <select
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967] bg-white cursor-pointer"
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {regRole === 'optometry' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Chứng chỉ hành nghề (CCHN) *</label>
                  <input
                    type="text"
                    required
                    value={regMedicalCert}
                    onChange={(e) => setRegMedicalCert(e.target.value)}
                    placeholder="Số chứng chỉ khúc xạ..."
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                  />
                </div>
              )}

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Mật khẩu *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự..."
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#004967]"
                  />
                  {regPassword && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">Độ mạnh: <strong className={passwordStrength.textColor}>{passwordStrength.label}</strong></span>
                      <span className="text-[10px] text-slate-400">≥8 ký tự • Hoa, thường, số</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu *</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className={`w-full h-11 px-3.5 rounded-xl text-xs transition-all focus:outline-none ${
                      isPasswordMatch
                        ? 'border-2 border-emerald-500 bg-emerald-50/30 text-slate-900'
                        : isPasswordMismatch
                        ? 'border-2 border-rose-400 bg-rose-50/30 text-slate-900'
                        : 'border border-slate-300 text-slate-800 focus:border-[#004967]'
                    }`}
                  />
                </div>
              </div>

              {/* Checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-600 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regAgreed}
                  onChange={(e) => setRegAgreed(e.target.checked)}
                  className="rounded text-[#004967] focus:ring-[#004967]"
                />
                <span>Tôi đồng ý với quy định bảo mật thông tin nội bộ.</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 rounded-xl text-sm font-semibold bg-[#004967] hover:bg-[#086288] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.99] disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? 'Đang gửi hồ sơ...' : 'Đăng ký tài khoản'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Simple Clean Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 OptiVision Eyecare Systems.
      </footer>

      <Modal
        title="Đặt lại mật khẩu qua SMS OTP"
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
      >
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700">Tài khoản / Email / Mã NV</label>
            <input
              type="text"
              value={resetIdentifier}
              onChange={(e) => setResetIdentifier(e.target.value)}
              placeholder="Nhập username, email hoặc mã NV..."
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Số điện thoại đã đăng ký</label>
            <div className="flex gap-2 mt-1">
              <input
                type="tel"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                placeholder="0901000000"
                className="flex-1 h-10 px-3 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const chg = await authApi.sendOtp({
                      identifier: resetIdentifier.trim(),
                      phoneNumber: resetPhone.trim() || undefined,
                      purpose: 'PASSWORD_RESET',
                    });
                    setResetChallenge(chg);
                    message.success(`Đã gửi mã OTP tới ${chg.maskedPhone}`);
                  } catch (err) {
                    message.error(err.message || 'Không gửi được mã OTP');
                  }
                }}
                className="px-3 h-10 rounded-lg bg-[#004967] text-white text-xs font-bold cursor-pointer"
              >
                Gửi OTP
              </button>
            </div>
          </div>
          {resetChallenge && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Mã OTP (đã gửi tới {resetChallenge.maskedPhone})
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetOtpCode}
                  onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 6 chữ số OTP"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Mật khẩu mới</label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs mt-1"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await authApi.resetPassword({
                      challengeId: resetChallenge.challengeId,
                      otpCode: resetOtpCode.trim(),
                      newPassword: resetNewPassword,
                    });
                    message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
                    setResetModalOpen(false);
                  } catch (err) {
                    message.error(err.message || 'Xác thực OTP thất bại');
                  }
                }}
                className="w-full h-10 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận đặt lại mật khẩu
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
