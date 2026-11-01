import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Modal,
  Tooltip,
  notification
} from 'antd';
import {
  ShopOutlined,
  EyeOutlined,
  ToolOutlined,
  LockOutlined,
  IdcardOutlined,
  CustomerServiceOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  ArrowLeftOutlined,
  FileProtectOutlined
} from '@ant-design/icons';
import './AuthPage.css';

const { Option } = Select;

// Preset sample staff for quick role demonstration
const ROLE_CONFIGS = {
  pos: {
    key: 'pos',
    name: 'Thu Ngân / POS',
    staffId: 'NV-OPT-202688',
    staffName: 'Nguyễn Bán Hàng (Thu Ngân)',
    branch: 'branch_01',
    roleLabel: 'Thu Ngân & Bán Lẻ POS',
    initialKey: 'pos'
  },
  optometry: {
    key: 'optometry',
    name: 'KTV Khúc Xạ',
    staffId: 'KTV-OPT-104592',
    staffName: 'BS. Lê Thị Ánh Tuyết (Khúc Xạ)',
    branch: 'branch_01',
    roleLabel: 'Bác Sĩ / Kỹ Thuật Viên Khúc Xạ',
    initialKey: 'optometry'
  },
  lab: {
    key: 'lab',
    name: 'KTV Lab Lens',
    staffId: 'LAB-OPT-308115',
    staffName: 'Trần Văn Kỹ Thuật (Lab Mài Kính)',
    branch: 'branch_lab',
    roleLabel: 'Kỹ Thuật Viên Xưởng Cắt Mài Lab',
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

export default function AuthPage({ onLoginSuccess }) {
  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState('login');
  const [selectedRole, setSelectedRole] = useState('pos');

  // Login Form States
  const [selectedBranch, setSelectedBranch] = useState('branch_01');
  const [staffId, setStaffId] = useState(ROLE_CONFIGS.pos.staffId);
  const [password, setPassword] = useState('Secret2026@');
  const [showPassword, setShowPassword] = useState(false);

  // OTP 6 digits
  const [otpDigits, setOtpDigits] = useState(['7', '4', '1', '9', '0', '2']);
  const otpRefs = useRef([]);

  // OTP Refresh Countdown
  const [otpTimer, setOtpTimer] = useState(28);

  // Modals
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Registration Form
  const [regForm] = Form.useForm();

  // Countdown timer effect
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          // generate random 6-digit OTP for refresh demonstration
          const newCode = Math.floor(100000 + Math.random() * 900000).toString().split('');
          setOtpDigits(newCode);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // Handle Role Switch
  const handleRoleChange = (roleKey) => {
    setSelectedRole(roleKey);
    const conf = ROLE_CONFIGS[roleKey];
    if (conf) {
      setStaffId(conf.staffId);
      if (conf.branch) setSelectedBranch(conf.branch);
    }
  };

  // Handle OTP individual box input
  const handleOtpChange = (index, value) => {
    const char = value.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto-focus to next box if char entered
    if (char && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      setOtpDigits(pasteData.split(''));
      message.success('Đã dán mã Smart OTP 6 số thành công!');
      otpRefs.current[5]?.focus();
    }
  };

  // Regenerate OTP manually
  const handleRegenerateOtp = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString().split('');
    setOtpDigits(newCode);
    setOtpTimer(30);
    message.info('Đã cấp mã Smart OTP mới từ thiết bị Authenticator.');
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
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 6) {
      message.error('Vui lòng nhập đủ 6 số Smart OTP xác thực 2 bước!');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const conf = ROLE_CONFIGS[selectedRole];
      const branchObj = BRANCH_OPTIONS.find(b => b.value === selectedBranch);

      notification.success({
        message: 'Đăng nhập thành công!',
        description: `Chào mừng ${conf.staffName} (${conf.roleLabel}). Phiên làm việc bảo mật SHA-256 + 2FA đã kích hoạt.`,
        placement: 'topRight'
      });

      if (onLoginSuccess) {
        onLoginSuccess({
          role: selectedRole,
          staffId: staffId,
          staffName: conf.staffName,
          branchName: branchObj ? branchObj.label : 'Chi nhánh Lê Thánh Tôn',
          initialKey: conf.initialKey
        });
      }
    }, 600);
  };

  // Submit Register
  const handleRegisterSubmit = (values) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Modal.success({
        title: 'Hồ sơ đã được gửi phê duyệt thành công!',
        content: (
          <div>
            <p>Hồ sơ cấp tài khoản tác nghiệp nhân sự của <strong>{values.fullName}</strong> đã được chuyển tới Phòng IT Security và Ban Giám Đốc Chi Nhánh.</p>
            <p>Mã định danh tạm thời: <strong style={{ color: '#086288' }}>{values.staffId || 'NV-OPT-NEW'}</strong></p>
            <p style={{ color: '#64748b', fontSize: 13 }}>Bạn có thể đăng nhập ngay bằng tài khoản demo có sẵn để bắt đầu ca làm việc.</p>
          </div>
        ),
        onOk: () => {
          setAuthMode('login');
        }
      });
    }, 800);
  };

  return (
    <div className="optivision-auth-wrapper">
      {/* ---------------- Top Navbar ---------------- */}
      <header className="optivision-auth-header">
        <div className="optivision-logo-group" onClick={() => setAuthMode('login')}>
          <div className="optivision-eye-logo">
            <EyeOutlined style={{ fontSize: 20 }} />
          </div>
          <div className="optivision-logo-text">
            <span className="optivision-logo-title">OptiVision</span>
            <span className="optivision-logo-subtitle">CỔNG VẬN HÀNH NỘI BỘ</span>
          </div>
        </div>

        <div className="optivision-header-right">
          <div className="optivision-helpdesk-pill" onClick={() => setIsHelpdeskOpen(true)}>
            <CustomerServiceOutlined style={{ fontSize: 16 }} />
            <span>IT Helpdesk / Hotline: +1 (800) 420-OPTIC (Ext 108)</span>
          </div>

          <Tooltip title="Tài khoản bảo mật y khoa">
            <div className="optivision-user-badge-btn" onClick={() => handleRegenerateOtp()}>
              <UserOutlined />
            </div>
          </Tooltip>
        </div>
      </header>

      {/* ---------------- Main Dual-Pane Body ---------------- */}
      <main className="optivision-auth-body">
        <div className="optivision-auth-container">
          {/* Left Column: Information & Modules */}
          <section className="optivision-left-pane">
            <div>
              <div className="optivision-retail-tag">
                <EyeOutlined />
                <span>OptiVision Retail & Eyecare</span>
              </div>

              <h1 className="optivision-portal-heading">Cổng Vận Hành Nội Bộ</h1>
              <p className="optivision-portal-desc">
                Hệ thống quản lý bán hàng, phòng khám đo mắt và trung tâm gia công kính mắt tập trung.
              </p>

              <div className="optivision-feature-list">
                <div className="optivision-feature-item">
                  <div className="optivision-feature-icon-box">
                    <ShopOutlined />
                  </div>
                  <div className="optivision-feature-text">
                    <span className="optivision-feature-title">Bán lẻ & POS</span>
                    <span className="optivision-feature-sub">Thanh toán hóa đơn & quản lý bán lẻ tại điểm</span>
                  </div>
                </div>

                <div className="optivision-feature-item">
                  <div className="optivision-feature-icon-box">
                    <MedicineBoxOutlined />
                  </div>
                  <div className="optivision-feature-text">
                    <span className="optivision-feature-title">Khúc xạ & Đơn kính</span>
                    <span className="optivision-feature-sub">Hồ sơ thị lực và theo dõi toa thuốc chuẩn y khoa</span>
                  </div>
                </div>

                <div className="optivision-feature-item">
                  <div className="optivision-feature-icon-box">
                    <ToolOutlined />
                  </div>
                  <div className="optivision-feature-text">
                    <span className="optivision-feature-title">Mài lắp & Kho vận</span>
                    <span className="optivision-feature-sub">Điều phối Lab Lens và kiểm soát tồn kho toàn chuỗi</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="optivision-security-notice">
              <LockOutlined className="optivision-security-notice-icon" />
              <span>Vui lòng đăng xuất sau ca làm việc và không chia sẻ mã bảo mật OTP.</span>
            </div>
          </section>

          {/* Right Column: Authentication Card */}
          <section className="optivision-right-pane">
            {authMode === 'login' ? (
              /* ================= LOGIN MODE ================= */
              <div>
                {/* Form Title & RBAC Badge */}
                <div className="optivision-form-header">
                  <div className="optivision-form-title-group">
                    <h2>Đăng Nhập Cổng Nội Bộ</h2>
                    <p>Xác thực chứng danh nhân sự y khoa & chuỗi bán lẻ</p>
                  </div>
                  <div className="optivision-rbac-badge">
                    <SafetyCertificateOutlined />
                    <span>RBAC + 2FA Active</span>
                  </div>
                </div>

                {/* Quick Role Switcher */}
                <div className="optivision-role-section">
                  <span className="optivision-role-label">CHỌN PHÂN HỆ TÁC NGHIỆP NHANH</span>
                  <div className="optivision-role-switch-bar">
                    {Object.values(ROLE_CONFIGS).map((item) => (
                      <div
                        key={item.key}
                        className={`optivision-role-tab ${selectedRole === item.key ? 'active' : ''}`}
                        onClick={() => handleRoleChange(item.key)}
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleLoginSubmit}>
                  {/* Branch select */}
                  <div className="optivision-field-group">
                    <div className="optivision-field-header">
                      <label className="optivision-field-label">
                        Cơ sở / Chi nhánh làm việc <span className="required-star">*</span>
                      </label>
                      <span className="optivision-field-hint" style={{ fontFamily: 'monospace' }}>
                        ISO-LOC-2026
                      </span>
                    </div>
                    <Select
                      className="optivision-select"
                      style={{ width: '100%' }}
                      value={selectedBranch}
                      onChange={(val) => setSelectedBranch(val)}
                      prefix={<ShopOutlined style={{ color: '#086288', marginRight: 6 }} />}
                    >
                      {BRANCH_OPTIONS.map((b) => (
                        <Option key={b.value} value={b.value}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ShopOutlined style={{ color: '#086288' }} />
                            <span>{b.label}</span>
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* Staff ID */}
                  <div className="optivision-field-group">
                    <div className="optivision-field-header">
                      <label className="optivision-field-label">
                        Mã định danh nhân viên (Staff ID) <span className="required-star">*</span>
                      </label>
                      <span className="optivision-field-hint">Định dạng NV-OPT-XXXXXX</span>
                    </div>
                    <Input
                      className="optivision-input"
                      prefix={<IdcardOutlined style={{ color: '#086288', marginRight: 6, fontSize: 16 }} />}
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="NV-OPT-XXXXXX"
                    />
                  </div>

                  {/* Password */}
                  <div className="optivision-field-group">
                    <div className="optivision-field-header">
                      <label className="optivision-field-label">
                        Mật khẩu tài khoản nội bộ <span className="required-star">*</span>
                      </label>
                      <span className="optivision-sha-badge">
                        <CheckCircleOutlined /> Mã hóa SHA-256
                      </span>
                    </div>
                    <Input.Password
                      className="optivision-input"
                      prefix={<LockOutlined style={{ color: '#086288', marginRight: 6, fontSize: 16 }} />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu ca làm việc"
                      visibilityToggle={{
                        visible: showPassword,
                        onVisibleChange: setShowPassword
                      }}
                    />
                  </div>

                  {/* 2FA Smart OTP */}
                  <div className="optivision-field-group">
                    <div className="optivision-field-header">
                      <label className="optivision-field-label">
                        Mã Smart OTP xác thực 2 bước (2FA){' '}
                        <Tooltip title="Mã bảo mật xác thực cấp cao được đồng bộ tự động từ OptiVision Authenticator Token">
                          <InfoCircleOutlined style={{ color: '#086288', fontSize: 12, cursor: 'pointer' }} />
                        </Tooltip>
                      </label>
                      <span
                        className="optivision-field-hint"
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={handleRegenerateOtp}
                      >
                        <ReloadOutlined spin={otpTimer <= 3} style={{ fontSize: 11 }} />
                        Làm mới: {otpTimer}s
                      </span>
                    </div>

                    <div className="optivision-otp-row" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpRefs.current[idx] = el)}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="optivision-otp-box"
                        />
                      ))}
                    </div>

                    <p className="optivision-otp-subtext">
                      Nhập chuỗi OTP từ ứng dụng OptiVision Authenticator hoặc khóa bảo mật phần cứng YubiKey.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="optivision-submit-btn"
                    loading={isSubmitting}
                    icon={<LockOutlined />}
                  >
                    Đăng nhập ca làm việc (Secure Login)
                  </Button>
                </form>

                {/* Secondary Actions */}
                <div className="optivision-form-links">
                  <span className="optivision-link" onClick={() => setIsForgotOpen(true)}>
                    <QuestionCircleOutlined /> Quên mật khẩu / Yêu cầu cấp lại qua IT Support
                  </span>
                  <button
                    type="button"
                    className="optivision-tab-mode-btn"
                    onClick={() => setAuthMode('register')}
                  >
                    Đăng ký nhân sự mới →
                  </button>
                </div>
              </div>
            ) : (
              /* ================= REGISTER MODE ================= */
              <div>
                <div className="optivision-form-header">
                  <div className="optivision-form-title-group">
                    <h2>Đăng Ký Tài Khoản Tác Nghiệp</h2>
                    <p>Cấp mới chứng danh nhân sự y tế & chuỗi cửa hàng mắt kính</p>
                  </div>
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setAuthMode('login')}
                    style={{ color: '#086288', fontWeight: 600 }}
                  >
                    Quay lại Đăng nhập
                  </Button>
                </div>

                <Form
                  form={regForm}
                  layout="vertical"
                  onFinish={handleRegisterSubmit}
                  initialValues={{
                    branch: 'branch_01',
                    department: 'pos'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Item
                      name="fullName"
                      label={<span style={{ fontWeight: 700 }}>Họ và tên nhân sự</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                    >
                      <Input
                        prefix={<UserOutlined style={{ color: '#086288' }} />}
                        placeholder="VD: Trần Hoàng Long"
                        className="optivision-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="staffId"
                      label={<span style={{ fontWeight: 700 }}>Mã NV đề xuất</span>}
                      rules={[{ required: true, message: 'Nhập mã NV' }]}
                    >
                      <Input
                        prefix={<IdcardOutlined style={{ color: '#086288' }} />}
                        placeholder="NV-OPT-XXXXXX"
                        className="optivision-input"
                      />
                    </Form.Item>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Item
                      name="phone"
                      label={<span style={{ fontWeight: 700 }}>Số điện thoại nội bộ</span>}
                      rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                    >
                      <Input
                        prefix={<PhoneOutlined style={{ color: '#086288' }} />}
                        placeholder="0987.xxx.xxx"
                        className="optivision-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label={<span style={{ fontWeight: 700 }}>Email OptiVision</span>}
                      rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: '#086288' }} />}
                        placeholder="staff@optivision.vn"
                        className="optivision-input"
                      />
                    </Form.Item>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Item
                      name="department"
                      label={<span style={{ fontWeight: 700 }}>Phân hệ công tác</span>}
                      rules={[{ required: true }]}
                    >
                      <Select className="optivision-select">
                        <Option value="pos">Bán lẻ & POS Quầy</Option>
                        <Option value="optometry">Phòng Đo Mắt & Khúc Xạ</Option>
                        <Option value="lab">Xưởng Gia Công Lab Lens</Option>
                        <Option value="admin">Quản Trị Chuỗi & Kho</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="branch"
                      label={<span style={{ fontWeight: 700 }}>Chi nhánh trực thuộc</span>}
                      rules={[{ required: true }]}
                    >
                      <Select className="optivision-select">
                        {BRANCH_OPTIONS.map(b => (
                          <Option key={b.value} value={b.value}>{b.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </div>

                  <Form.Item
                    name="medicalLicense"
                    label={
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontWeight: 700 }}>Số CCHN Khúc Xạ Y Khoa (nếu có)</span>
                        <span style={{ color: '#64748b', fontSize: 11 }}>Dành cho KTV Khúc Xạ</span>
                      </div>
                    }
                  >
                    <Input
                      prefix={<FileProtectOutlined style={{ color: '#086288' }} />}
                      placeholder="CCHN-BYT-xxxxxx"
                      className="optivision-input"
                    />
                  </Form.Item>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Form.Item
                      name="password"
                      label={<span style={{ fontWeight: 700 }}>Mật khẩu tài khoản</span>}
                      rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#086288' }} />}
                        placeholder="Mật khẩu bảo mật"
                        className="optivision-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label={<span style={{ fontWeight: 700 }}>Xác nhận mật khẩu</span>}
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Xác nhận lại mật khẩu' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Mật khẩu không khớp!'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: '#086288' }} />}
                        placeholder="Nhập lại mật khẩu"
                        className="optivision-input"
                      />
                    </Form.Item>
                  </div>

                  <Button
                    type="primary"
                    htmlType="submit"
                    className="optivision-submit-btn"
                    loading={isSubmitting}
                    icon={<SafetyCertificateOutlined />}
                  >
                    Gửi Hồ Sơ Phê Duyệt Cấp Quyền (Submit)
                  </Button>
                </Form>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    className="optivision-tab-mode-btn"
                    onClick={() => setAuthMode('login')}
                  >
                    ← Đã có tài khoản? Quay lại đăng nhập ca làm việc
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ---------------- Bottom System Footer ---------------- */}
      <footer className="optivision-auth-footer">
        <div className="optivision-footer-left">
          <span>OptiVision OS v1.0</span>
          <span>•</span>
          <span>ISO/IEC/IEEE 29148:2018 Optical Specification Compliant</span>
          <span>•</span>
          <span>Encrypted Clinical Dispatch</span>
        </div>

        <div className="optivision-footer-right">
          <span className="optivision-footer-link" onClick={() => setIsHelpdeskOpen(true)}>
            Security Notice
          </span>
          <span className="optivision-footer-link" onClick={() => setIsHelpdeskOpen(true)}>
            Dispensing Support
          </span>
          <span>© 2024 OptiVision Retail Inc.</span>
        </div>
      </footer>

      {/* ---------------- IT Helpdesk Modal ---------------- */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#086288' }}>
            <CustomerServiceOutlined style={{ fontSize: 22 }} />
            <span style={{ fontWeight: 800, fontSize: 17 }}>Trung Tâm Hỗ Trợ Kỹ Thuật (IT Helpdesk)</span>
          </div>
        }
        open={isHelpdeskOpen}
        onCancel={() => setIsHelpdeskOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsHelpdeskOpen(false)} style={{ background: '#086288' }}>
            Đóng
          </Button>
        ]}
      >
        <div style={{ padding: '10px 0', fontSize: 14, lineHeight: 1.6 }}>
          <p>
            <strong>Hotline khẩn cấp toàn chuỗi:</strong>{' '}
            <span style={{ color: '#086288', fontWeight: 700 }}>+1 (800) 420-OPTIC (Nhánh 108)</span>
          </p>
          <p>
            <strong>Thời gian hỗ trợ:</strong> 24/7 cho các ca trực phòng khám mắt và máy mài lens tự động.
          </p>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', margin: '14px 0' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Quy chuẩn an toàn bảo mật:</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 13 }}>
              <li>Không cung cấp Smart OTP cho bất kỳ ai kể cả quản trị viên IT.</li>
              <li>Khi kết thúc ca trực, bắt buộc bấm "Đăng xuất" để bàn giao máy POS / Máy đo khúc xạ.</li>
              <li>Khóa Smart Token YubiKey phải luôn mang theo người phụ trách ca.</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* ---------------- Forgot Password Modal ---------------- */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#086288' }}>
            <LockOutlined style={{ fontSize: 20 }} />
            <span style={{ fontWeight: 800 }}>Yêu Cầu Cấp Lại Mật Khẩu Nội Bộ</span>
          </div>
        }
        open={isForgotOpen}
        onCancel={() => setIsForgotOpen(false)}
        onOk={() => {
          if (!forgotEmail) {
            message.warning('Vui lòng nhập Email hoặc Mã Staff ID');
            return;
          }
          message.success(`Đã gửi đường link khôi phục mật khẩu tạm thời về địa chỉ liên kết với: ${forgotEmail}`);
          setIsForgotOpen(false);
          setForgotEmail('');
        }}
        okText="Gửi yêu cầu reset"
        cancelText="Hủy"
        okButtonProps={{ style: { background: '#086288' } }}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#475569', fontSize: 13 }}>
            Nhập mã nhân viên Staff ID hoặc Email nội bộ để IT Security cấp phát mã mở khóa khẩn cấp qua tin nhắn SMS nội bộ:
          </p>
          <Input
            prefix={<MailOutlined style={{ color: '#086288' }} />}
            placeholder="VD: NV-OPT-202688 hoặc staff@optivision.vn"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            size="large"
            style={{ borderRadius: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
}

