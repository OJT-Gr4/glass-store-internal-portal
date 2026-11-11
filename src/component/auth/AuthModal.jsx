import React, { useState, useEffect, useRef } from 'react';
import CloseOutlined from '@ant-design/icons/es/icons/CloseOutlined';
import LockOutlined from '@ant-design/icons/es/icons/LockOutlined';
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined';
import EyeOutlined from '@ant-design/icons/es/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/es/icons/EyeInvisibleOutlined';
import UserOutlined from '@ant-design/icons/es/icons/UserOutlined';
import RightOutlined from '@ant-design/icons/es/icons/RightOutlined';
import SafetyCertificateOutlined from '@ant-design/icons/es/icons/SafetyCertificateOutlined';
import ShopOutlined from '@ant-design/icons/es/icons/ShopOutlined';
import IdcardOutlined from '@ant-design/icons/es/icons/IdcardOutlined';
import ReloadOutlined from '@ant-design/icons/es/icons/ReloadOutlined';
import QuestionCircleOutlined from '@ant-design/icons/es/icons/QuestionCircleOutlined';
import FileProtectOutlined from '@ant-design/icons/es/icons/FileProtectOutlined';
import WindowsOutlined from '@ant-design/icons/es/icons/WindowsOutlined';
import GoogleOutlined from '@ant-design/icons/es/icons/GoogleOutlined';
import { message, notification, Modal } from 'antd';
import './AuthModal.css';

// Role configurations for internal staff
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

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState('pos');

  // Login Form States (Exact match to Image 1 and Image 2 design)
  const [selectedBranch, setSelectedBranch] = useState('branch_01');
  const [staffId, setStaffId] = useState(ROLE_CONFIGS.pos.staffId);
  const [password, setPassword] = useState('Secret2026@');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regStaffId, setRegStaffId] = useState('');
  const [regBranch, setRegBranch] = useState('branch_01');
  const [regLicense, setRegLicense] = useState('');
  const [regPass, setRegPass] = useState('');


  if (!isOpen) return null;

  // Handle Role Switch
  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const conf = ROLE_CONFIGS[roleKey];
    if (conf) {
      setStaffId(conf.staffId);
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

    if (onClose) onClose();
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
    if (onClose) onClose();
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
    <div className="optivision-modal-overlay" onClick={onClose}>
      <div className="optivision-staff-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ================= LEFT PANE (Dark Ocean Navy) ================= */}
        <section className="optivision-staff-modal-left">
          <div>
            {/* Pill Tag */}
            <div className="optivision-staff-tag">
              <SafetyCertificateOutlined />
              <span>OptiVision Retail & Eyecare</span>
            </div>

            {/* Heading */}
            <h2 className="optivision-staff-left-title">
              Cổng Vận Hành Nội Bộ
              <span>Quản Trị Tập Trung</span>
            </h2>

            {/* Subtitle */}
            <p className="optivision-staff-left-desc">
              Hệ thống quản lý bán hàng POS, phòng khám đo mắt khúc xạ và trung tâm gia công kính mắt Lab Lens chuẩn y khoa.
            </p>

            {/* Clinical Prescription Box (OD/OS Live Sync) */}
            <div className="optivision-staff-clinical-box">
              <div className="optivision-staff-clinical-header">
                <span className="optivision-staff-clinical-title">
                  <span style={{ color: '#38bdf8' }}>•</span> Hồ Sơ Thị Lực Chuẩn Nhãn Khoa (OD / OS)
                </span>
                <span className="optivision-staff-live-sync">
                  <span className="optivision-staff-live-dot" /> Live Sync
                </span>
              </div>

              <table className="optivision-staff-table">
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
                    <td className="eye-col">OD (Phải)</td>
                    <td>-2.25</td>
                    <td>-0.75</td>
                    <td>175°</td>
                  </tr>
                  <tr>
                    <td className="eye-col">OS (Trái)</td>
                    <td>-2.00</td>
                    <td>-0.50</td>
                    <td>62.5 mm</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Lab Lens Banner Card */}
            <div className="optivision-staff-lab-banner">
              <div className="optivision-staff-lab-info">
                <span className="optivision-staff-lab-name">Phòng Lab Mài Kính & Kho Vận</span>
                <span className="optivision-staff-lab-sub">
                  <CheckCircleOutlined style={{ color: '#38bdf8' }} /> Điều phối Lab Lens & QC kiểm định
                </span>
              </div>
              <span className="optivision-staff-lab-badge">20+ Chi Nhánh</span>
            </div>

            {/* 3 Bullet Features */}
            <div className="optivision-staff-features">
              <div className="optivision-staff-feature-line">
                <CheckCircleOutlined className="optivision-staff-feature-icon" />
                <span>Xác thực chứng danh nhân sự phân quyền RBAC & 2FA</span>
              </div>
              <div className="optivision-staff-feature-line">
                <CheckCircleOutlined className="optivision-staff-feature-icon" />
                <span>Đồng bộ toa kính thuốc tức thời giữa Phòng khám & Xưởng mài</span>
              </div>
              <div className="optivision-staff-feature-line">
                <CheckCircleOutlined className="optivision-staff-feature-icon" />
                <span>Mã hóa bảo mật cấp y khoa SHA-256 & Smart Token</span>
              </div>
            </div>
          </div>

          {/* Left Footer meta */}
          <div className="optivision-staff-left-foot">
            <span>OptiVision OS v1.0</span>
            <span>Encrypted Clinical Dispatch</span>
          </div>
        </section>

        {/* ================= RIGHT PANE (Clean White Form) ================= */}
        <section className="optivision-staff-modal-right">
          {/* Top Bar: Switcher + RBAC + Close */}
          <div className="optivision-staff-top-bar">
            <div className="optivision-staff-switch-pill">
              <button
                type="button"
                className={`optivision-staff-mode-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                Đăng Nhập Ca
              </button>
              <button
                type="button"
                className={`optivision-staff-mode-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => setMode('register')}
              >
                Cấp Tài Khoản Mới
              </button>
            </div>

            <div className="optivision-staff-top-meta">
              <span className="optivision-staff-rbac-badge">
                <SafetyCertificateOutlined /> RBAC + 2FA Active
              </span>
              <button
                type="button"
                className="optivision-staff-close-btn"
                onClick={onClose}
                title="Đóng popup (Esc)"
              >
                <CloseOutlined />
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            /* ================= LOGIN FORM FOR STAFF ================= */
            <div>
              <div className="optivision-staff-title-group" style={{ marginBottom: 16 }}>
                <h2>Đăng Nhập Cổng Nội Bộ</h2>
                <p>Hệ thống quản lý tác nghiệp chuỗi kính mắt OptiVision</p>
              </div>

              <form onSubmit={handleLoginSubmit}>
                {/* Branch Selection */}
                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Cơ sở / Chi nhánh làm việc <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <select
                    className="optivision-staff-select"
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
                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Tài khoản / Email / Mã nhân viên <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <input
                    type="text"
                    className="optivision-staff-input"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="Nhập email, username hoặc mã nhân viên..."
                    required
                  />
                </div>

                {/* Password */}
                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Mật khẩu <span style={{ color: '#ef4444' }}>*</span></span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="optivision-staff-input"
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
                <button type="submit" className="optivision-staff-submit-btn">
                  <LockOutlined style={{ fontSize: 14 }} />
                  Đăng nhập ca làm việc (Secure Login)
                </button>
              </form>

              {/* Forgot password */}
              <div className="optivision-staff-links">
                <span
                  className="optivision-staff-link"
                  onClick={() => message.info('Vui lòng liên hệ IT Helpdesk nhánh 108 để cấp lại mật khẩu.')}
                >
                  <QuestionCircleOutlined /> Quên mật khẩu / Yêu cầu cấp lại qua IT Support
                </span>
              </div>

              {/* Enterprise SSO Divider */}
              <div className="optivision-staff-divider">
                <span>Hoặc đăng nhập với hệ thống SSO nội bộ</span>
              </div>

              <div className="optivision-staff-sso-row">
                <button
                  type="button"
                  className="optivision-staff-sso-btn"
                  onClick={() => handleEnterpriseSSO('Google Workspace Enterprise')}
                >
                  <GoogleOutlined style={{ color: '#ea4335', fontSize: 14 }} />
                  <span>Google Workspace</span>
                </button>

                <button
                  type="button"
                  className="optivision-staff-sso-btn"
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
              <div className="optivision-staff-title-group">
                <h2>Cấp Mới Chứng Danh Nhân Sự</h2>
                <p>Đăng ký tài khoản tác nghiệp chuỗi kính mắt OptiVision</p>
              </div>

              <form onSubmit={handleRegisterSubmit}>
                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Họ và tên nhân sự</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-staff-input"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="VD: Trần Văn Kỹ Thuật"
                    required
                  />
                </div>

                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Mã Staff ID đề xuất</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-staff-input"
                    value={regStaffId}
                    onChange={(e) => setRegStaffId(e.target.value)}
                    placeholder="NV-OPT-XXXXXX"
                    required
                  />
                </div>

                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Chi nhánh công tác</span>
                  </div>
                  <select
                    className="optivision-staff-select"
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                  >
                    {BRANCH_OPTIONS.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>

                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Chứng chỉ hành nghề nhãn khoa (nếu là KTV Khúc Xạ)</span>
                  </div>
                  <input
                    type="text"
                    className="optivision-staff-input"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    placeholder="CCHN-BYT-xxxxxx"
                  />
                </div>

                <div className="optivision-staff-field">
                  <div className="optivision-staff-field-label-row">
                    <span>Mật khẩu thiết lập</span>
                  </div>
                  <input
                    type="password"
                    className="optivision-staff-input"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>

                <button type="submit" className="optivision-staff-submit-btn">
                  <FileProtectOutlined />
                  Gửi Hồ Sơ Phê Duyệt Cấp Quyền (Submit)
                </button>
              </form>
            </div>
          )}

          {/* Modal bottom compliance footer */}
          <div className="optivision-staff-footer-note">
            <span>ISO/IEC/IEEE 29148:2018 Compliant</span>
            <span>Security Notice • Dispensing Support • © 2024 OptiVision Retail Inc.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
