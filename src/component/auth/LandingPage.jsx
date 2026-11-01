import React, { useState } from 'react';
import {
  EyeOutlined,
  LockOutlined,
  ShopOutlined,
  ToolOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  RightOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import AuthModal from './AuthModal';
import './AuthModal.css';

export default function LandingPage({ onLoginSuccess }) {
  // Modal starts open by default to display Image 2 immediately!
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="optivision-portal-wrapper">
      <div className="optivision-portal-bg" />

      {/* Main Content (Blurred when modal is active) */}
      <div className={`optivision-portal-content ${isModalOpen ? 'is-blurred' : ''}`}>
        {/* Top Operations Navbar */}
        <header className="optivision-portal-header">
          <div className="optivision-portal-logo" onClick={() => setIsModalOpen(true)}>
            <div className="optivision-portal-logo-icon">
              <EyeOutlined />
            </div>
            <div className="optivision-portal-logo-text">
              <span className="optivision-portal-logo-title">OptiVision</span>
              <span className="optivision-portal-logo-sub">CỔNG VẬN HÀNH NỘI BỘ</span>
            </div>
          </div>

          <ul className="optivision-ops-menu">
            <li className="optivision-ops-item active" onClick={() => setIsModalOpen(true)}>
              <ShopOutlined /> Quầy POS & Bán Lẻ
            </li>
            <li className="optivision-ops-item" onClick={() => setIsModalOpen(true)}>
              <MedicineBoxOutlined /> Phòng Đo Khám Khúc Xạ
            </li>
            <li className="optivision-ops-item" onClick={() => setIsModalOpen(true)}>
              <ToolOutlined /> Xưởng Mài Lắp Lab Lens
            </li>
            <li className="optivision-ops-item" onClick={() => setIsModalOpen(true)}>
              <AppstoreOutlined /> Quản Trị Kho & Chuỗi
            </li>
          </ul>

          <div className="optivision-portal-header-right">
            <div className="optivision-helpdesk-pill-btn" onClick={() => setIsModalOpen(true)}>
              <CustomerServiceOutlined />
              <span>IT Helpdesk: +1 (800) 420-OPTIC (Ext 108)</span>
            </div>

            <button
              type="button"
              className="optivision-btn-login-trigger"
              onClick={() => setIsModalOpen(true)}
            >
              <LockOutlined />
              <span>Đăng Nhập Ca</span>
            </button>
          </div>
        </header>

        {/* Enterprise Hero Section */}
        <main className="optivision-portal-hero">
          <div className="optivision-portal-hero-inner">
            <div className="optivision-enterprise-badge">
              <SafetyCertificateOutlined />
              <span>CỔNG VẬN HÀNH NỘI BỘ CHUỖI KÍNH MẮT & Y KHOA TẬP TRUNG</span>
            </div>

            <h1 className="optivision-portal-hero-title">
              Hệ Thống Quản Trị Vận Hành
              <span> Chuỗi Kính Mắt Tập Trung</span>
            </h1>

            <p className="optivision-portal-hero-desc">
              Phân hệ tác nghiệp chuyên biệt dành riêng cho Bác sĩ Khúc xạ y khoa, Kỹ thuật viên mài lắp kính Lab Lens, Nhân viên thu ngân POS và Bộ phận Quản trị tồn kho chuỗi.
            </p>

            {/* Live Operational Metrics Cards */}
            <div className="optivision-metrics-grid">
              <div className="optivision-metric-card">
                <div className="optivision-metric-num">04</div>
                <div className="optivision-metric-label">Chi Nhánh Hoạt Động</div>
                <div className="optivision-metric-sub">Hà Nội & TP.HCM</div>
              </div>

              <div className="optivision-metric-card">
                <div className="optivision-metric-num">128+</div>
                <div className="optivision-metric-label">Hồ Sơ Khúc Xạ OD/OS</div>
                <div className="optivision-metric-sub">Đồng bộ chuẩn y tế</div>
              </div>

              <div className="optivision-metric-card">
                <div className="optivision-metric-num">45</div>
                <div className="optivision-metric-label">Lệnh Lab Mài Lắp</div>
                <div className="optivision-metric-sub">Kiểm định QC 100%</div>
              </div>

              <div className="optivision-metric-card">
                <div className="optivision-metric-num" style={{ color: '#34d399' }}>2FA Active</div>
                <div className="optivision-metric-label">Bảo Mật RBAC</div>
                <div className="optivision-metric-sub">Mã hóa SHA-256</div>
              </div>
            </div>

            {/* Hero CTAs */}
            <div className="optivision-hero-cta-group">
              <button
                type="button"
                className="optivision-btn-hero-primary"
                onClick={() => setIsModalOpen(true)}
              >
                <LockOutlined /> Đăng Nhập Ca Làm Việc <RightOutlined style={{ fontSize: 11 }} />
              </button>
              <button
                type="button"
                className="optivision-btn-hero-secondary"
                onClick={() => setIsModalOpen(true)}
              >
                <CustomerServiceOutlined /> Hỗ Trợ Kỹ Thuật IT Support
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ================= STAFF AUTH MODAL POPUP ================= */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={onLoginSuccess}
      />
    </div>
  );
}
