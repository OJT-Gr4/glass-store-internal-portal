import React, { useState, useEffect, useRef } from 'react';
import LockOutlined from '@ant-design/icons/es/icons/LockOutlined';
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined';
import EyeOutlined from '@ant-design/icons/es/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/es/icons/EyeInvisibleOutlined';
import SafetyCertificateOutlined from '@ant-design/icons/es/icons/SafetyCertificateOutlined';
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined';
import IdcardOutlined from '@ant-design/icons/es/icons/IdcardOutlined';
import ReloadOutlined from '@ant-design/icons/es/icons/ReloadOutlined';
import QuestionCircleOutlined from '@ant-design/icons/es/icons/QuestionCircleOutlined';
import FileProtectOutlined from '@ant-design/icons/es/icons/FileProtectOutlined';
import WindowsOutlined from '@ant-design/icons/es/icons/WindowsOutlined';
import GoogleOutlined from '@ant-design/icons/es/icons/GoogleOutlined';
import { message, notification, Modal } from 'antd';
import './LoginPage.css';

// Preset role configurations for internal staff
const ROLE_CONFIGS = {
  pos: {
    key: 'pos',
    name: 'Thu Ngân / POS',
    staffId: 'NV-OPT-202688',
    staffName: 'Nguyễn Bán Hàng (Thu Ngân)',
    branch: 'branch_01',
    roleLabel: 'Bán Lẻ & POS Quầy',
    initialKey: 'pos'
  },
  optometry: {
    key: 'optometry',
    name: 'KTV Khúc Xạ',
    staffId: 'KTV-OPT-104592',
    staffName: 'BS. Lê Thị Ánh Tuyết (Khúc Xạ)',
    branch: 'branch_01',
    roleLabel: 'Bác Sĩ Khúc Xạ Y Khoa',
    initialKey: 'optometry'
  },
  lab: {
    key: 'lab',
    name: 'KTV Lab Lens',
    staffId: 'LAB-OPT-308115',
    staffName: 'Trần Văn Kỹ Thuật (Lab Lens)',
    branch: 'branch_lab',
    roleLabel: 'Kỹ Thuật Viên Xưởng Lab & QC',
    initialKey: 'lab'
  },
  admin: {
    key: 'admin',
    name: 'Quản Trị / Admin',
    staffId: 'ADM-OPT-001099',
    staffName: 'Phạm Quản Trị Hệ Thống',
    branch: 'branch_01',
    roleLabel: 'Quản Lý Chuỗi & Kiểm Soát Tồn Kho',
    initialKey: 'dashboard'
  }
};

const BRANCH_OPTIONS = [
  { value: 'branch_01', label: 'Chi nhánh 01 - Flagship Lê Thánh Tôn, Quận 1, TP.HCM' },
  { value: 'branch_02', label: 'Chi nhánh 02 - Hai Bà Trưng, Quận 3, TP.HCM' },
  { value: 'branch_03', label: 'Chi nhánh 03 - Phố Huế, Quận Hai Bà Trưng, Hà Nội' },
  { value: 'branch_lab', label: 'Trung tâm Lab Lens & Tổng kho Tân Bình' }
];

export default function LoginPage({ onLoginSuccess }) {
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState('pos');

  // Login Form States (Direct match to Image 2)
  const [selectedBranch, setSelectedBranch] = useState('branch_01');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle Role Switch
  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const conf = ROLE_CONFIGS[roleKey];
    if (conf) {
      
      if (conf.branch) setSelectedBranch(conf.branch);
    }
  };

  // Submit Login
  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault();

    if (!staffId.trim()) {
      message.error('Vui lòng nhập Mã định danh nhân viên (Staff ID)!');
      return;
    }
    if (!password.trim()) {
      message.error('Vui lòng nhập Mật khẩu tài khoản nội bộ!');
      return;
    }


    const conf = ROLE_CONFIGS[selectedRole];
    const branchObj = BRANCH_OPTIONS.find(b => b.value === selectedBranch);

    notification.success({
      message: 'Đăng nhập ca làm việc thành công!',
      description: `Chào mừng ${conf.staffName} (${conf.roleLabel}). Phiên tác nghiệp bảo mật SHA-256 + 2FA đã kích hoạt.`,
      placement: 'topRight'
    });

    if (onLoginSuccess) {
      onLoginSuccess({
        role: selectedRole,
        staffId: staffId,
        staffName: conf.staffName,
        branchName: branchObj ? branchObj.label : 'Chi nhánh 01 - Flagship Lê Thánh Tôn',
        initialKey: conf.initialKey
      });
    }
  };

  // Handle Enterprise SSO Login
  const handleEnterpriseSSO = (provider) => {
    const conf = ROLE_CONFIGS[selectedRole];
    notification.success({
      message: `Đăng nhập qua ${provider} thành công!`,
      description: `Đã xác thực danh tính nhân sự nội bộ ${conf.staffName}.`,
      placement: 'topRight'
    });
    if (onLoginSuccess) {
      onLoginSuccess({
        role: selectedRole,
        staffId: conf.staffId,
        staffName: conf.staffName,
        branchName: 'Chi nhánh 01 - Flagship Lê Thánh Tôn',
        initialKey: conf.initialKey
      });
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e) => {
    if (e) e.preventDefault();
    if (!regName.trim() || !regStaffId.trim()) {
      message.error('Vui lòng nhập đầy đủ họ tên và mã NV đề xuất!');
      return;
    }
    Modal.success({
      title: 'Hồ sơ cấp quyền nhân sự đã được gửi phê duyệt!',
      content: (
        <div>
          <p>Hồ sơ của <strong>{regName}</strong> ({regStaffId}) đã chuyển tới IT Security và Trưởng ca chi nhánh.</p>
          <p style={{ color: '#086288', fontWeight: 600 }}>Bạn có thể đăng nhập ngay bằng mã demo có sẵn để bắt đầu ca.</p>
        </div>
      ),
      onOk: () => setMode('login')
    });
  };

  return (
    <div className="optivision-login-wrapper">
      <div className="optivision-login-card">
        {/* ================= LEFT PANE (Dark Ocean Navy) ================= */}
        <section className="optivision-login-left">
          <div>
            {/* Pill Tag */}
            <div className="optivision-brand-tag">
              <SafetyCertificateOutlined />
              <span>OptiVision Retail & Eyecare</span>
            </div>

            {/* Heading */}
            <h1 className="optivision-left-title">
              Cổng Vận Hành Nội Bộ
              <span>Quản Trị Tập Trung</span>
            </h1>

            {/* Subtitle */}
            <p className="optivision-left-desc">
              Hệ thống quản lý bán hàng POS, phòng khám đo mắt khúc xạ và trung tâm gia công kính mắt Lab Lens chuẩn y khoa.
            </p>

            {/* Clinical Prescription Box (OD/OS Live Sync) */}
            <div className="optivision-clinical-box">
              <div className="optivision-clinical-header">
                <span className="optivision-clinical-title">
                  <span style={{ color: '#38bdf8' }}>•</span> Hồ Sơ Thị Lực Chuẩn Nhãn Khoa (OD / OS)
                </span>
                <span className="optivision-live-sync">
                  <span className="optivision-live-dot" /> Live Sync
                </span>
              </div>

              <table className="optivision-prescription-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>MẮT</th>
                    <th>SPH (CẦU)</th>
                    <th>CYL (TRỤ)</th>
                    <th>AXIS / PD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="eye-label">OD (Phải)</td>
                    <td>-2.25</td>
                    <td>-0.75</td>
                    <td>175°</td>
                  </tr>
                  <tr>
                    <td className="eye-label">OS (Trái)</td>
                    <td>-2.00</td>
                    <td>-0.50</td>
                    <td>62.5 mm</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Lab Lens Banner Card */}
            <div className="optivision-lab-banner">
              <div className="optivision-lab-banner-text">
                <span className="optivision-lab-title">Phòng Lab Mài Kính & Kho Vận</span>
                <span className="optivision-lab-sub">
                  <CheckCircleOutlined style={{ color: '#38bdf8' }} /> Điều phối Lab Lens & QC kiểm định
                </span>
              </div>
              <span className="optivision-lab-tag">20+ Chi Nhánh</span>
            </div>

            {/* 3 Bullet Features */}
            <div className="optivision-left-features">
              <div className="optivision-feature-item">
                <CheckCircleOutlined className="optivision-feature-icon" />
                <span>Xác thực chứng danh nhân sự phân quyền theo vai trò (RBAC)</span>
              </div>
              <div className="optivision-feature-item">
                <CheckCircleOutlined className="optivision-feature-icon" />
                <span>Đồng bộ toa kính thuốc tức thời giữa Phòng khám & Xưởng mài</span>
              </div>
              <div className="optivision-feature-item">
                <CheckCircleOutlined className="optivision-feature-icon" />
                <span>Bảo mật tiêu chuẩn y khoa & mã hóa mật khẩu</span>
              </div>
            </div>
          </div>

          {/* Left Footer meta */}
          <div className="optivision-left-footer-meta">
            <span>OptiVision OS v1.0</span>
            <span>Encrypted Clinical Dispatch</span>
          </div>
        </section>

        {/* ================= RIGHT PANE (Clean White Form) ================= */}
        <section className="optivision-login-right">
          {/* Top Bar: Switcher + RBAC (No Close Button) */}
          <div className="optivision-right-top-bar">
            <div className="optivision-mode-switch-pill">
              <button
                type="button"
                className={`optivision-mode-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                Đăng Nhập Ca
              </button>
              <button
                type="button"
                className={`optivision-mode-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => setMode('register')}
              >
                Cấp Tài Khoản Mới
              </button>
            </div>

            <div className="optivision-rbac-badge">
              <SafetyCertificateOutlined /> Phân Quyền RBAC
            </div>
          </div>

          {mode === 'login' ? (
            /* ================= LOGIN FORM FOR STAFF (Image 2) ================= */
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 className="optivision-form-header-title">Đăng Nhập Cổng Nội Bộ</h2>
                <p className="optivision-form-header-desc">Hệ thống quản lý tác nghiệp chuỗi kính mắt OptiVision</p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                {/* Branch Selection */}
                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Cơ sở / Chi nhánh làm việc <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <select
                    className="optivision-form-select"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff ID */}
                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Tài khoản / Email / Mã nhân viên <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <input
                    type="text"
                    className="optivision-form-input"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="Nhập email, username hoặc mã nhân viên..."
                    required
                  />
                </div>

                {/* Password */}
                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Mật khẩu <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="optivision-form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu ca làm việc"
                      style={{ paddingRight: 36 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button type="submit" className="optivision-btn-login-submit">
                  <LockOutlined style={{ fontSize: 14 }} />
                  Đăng nhập ca làm việc (Secure Login)
                </button>
              </form>

              {/* Forgot password */}
              <div className="optivision-sub-actions">
                <span
                  className="optivision-sub-link"
                  onClick={() => message.info('Vui lòng liên hệ IT Helpdesk nhánh 108 để cấp lại mật khẩu.')}
                >
                  <QuestionCircleOutlined /> Quên mật khẩu / Yêu cầu cấp lại qua IT Support
                </span>
              </div>

              {/* Enterprise SSO Divider */}
              <div className="optivision-sso-separator">
                <span>Hoặc đăng nhập với hệ thống SSO nội bộ</span>
              </div>

              <div className="optivision-sso-buttons">
                <button
                  type="button"
                  className="optivision-btn-sso"
                  onClick={() => handleEnterpriseSSO('Google Workspace Enterprise')}
                >
                  <GoogleOutlined style={{ color: '#ea4335', fontSize: 14 }} />
                  <span>Google Workspace</span>
                </button>

                <button
                  type="button"
                  className="optivision-btn-sso"
                  onClick={() => handleEnterpriseSSO('Microsoft Entra ID')}
                >
                  <WindowsOutlined style={{ color: '#0078d4', fontSize: 14 }} />
                  <span>Microsoft Entra ID</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= REGISTER FORM FOR NEW STAFF ================= */
            <div>
              <div style={{ marginBottom: 14 }}>
                <h2 className="optivision-form-header-title">Cấp Mới Chứng Danh Nhân Sự</h2>
                <p className="optivision-form-header-desc">Đăng ký tài khoản tác nghiệp chuỗi kính mắt OptiVision</p>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Họ và tên nhân sự</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-form-input"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="VD: Trần Văn Kỹ Thuật"
                    required
                  />
                </div>

                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Mã Staff ID đề xuất</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-form-input"
                    value={regStaffId}
                    onChange={(e) => setRegStaffId(e.target.value)}
                    placeholder="NV-OPT-XXXXXX"
                    required
                  />
                </div>

                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Chi nhánh công tác</span>
                  </div>
                  <select
                    className="optivision-form-select"
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Chứng chỉ hành nghề nhãn khoa (nếu là KTV Khúc Xạ)</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-form-input"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="CCHN-BYT-xxxxxx"
                  />
                </div>

                <div className="optivision-form-row">
                  <div className="optivision-label-row">
                    <span>Mật khẩu thiết lập</span>
                  </div>
                  <input
                    type="password"
                    className="optivision-form-input"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>

                <button type="submit" className="optivision-btn-login-submit">
                  <FileProtectOutlined />
                  Gửi Hồ Sơ Phê Duyệt Cấp Quyền (Submit)
                </button>
              </form>
            </div>
          )}

          {/* Footer Notes */}
          <div className="optivision-login-footer-meta">
            <span>ISO/IEC/IEEE 29148:2018 Compliant</span>
            <span>Security Notice • Dispensing Support • © 2024 OptiVision Retail Inc.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
