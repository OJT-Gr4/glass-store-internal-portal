import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './routes/rolesConfig';
import { ProtectedRoute, RoleGuard, PublicOnlyRoute } from './routes/RouteGuard';
import MainLayout from './component/layout/MainLayout';
import AuthPage from './component/auth/AuthPage';

// Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import PosPage from './pages/pos/PosPage';
import OrdersOmsPage from './pages/orders/OrdersOmsPage';
import OptometryAppointmentsPage from './pages/optometry/OptometryAppointmentsPage';
import OptometryPage from './pages/optometry/OptometryPage';
import LabPage from './pages/lab/LabPage';
import LabQcPage from './pages/lab/LabQcPage';
import InventoryPage from './pages/inventory/InventoryPage';
import StockTransferPage from './pages/inventory/StockTransferPage';
import StockVouchersPage from './pages/inventory/StockVouchersPage';
import CrmPage from './pages/crm/CrmPage';
import WarrantyPage from './pages/crm/WarrantyPage';
import ReportsPage from './pages/admin/ReportsPage';
import StaffRbacPage from './pages/admin/StaffRbacPage';
import CatalogManagementPage from './pages/admin/CatalogManagementPage';
import VoucherManagementPage from './pages/admin/VoucherManagementPage';
import NotFound404 from './pages/common/NotFound404';

// Component to handle root redirection based on user's auth status and role
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.defaultRoute || '/dashboard'} replace />;
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#086288',
          colorLink: '#4D8DBA',
          colorSuccess: '#086288',
          borderRadius: 8,
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
        }
      }}
    >
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            {/* Public Login Route (redirects to workspace if already logged in) */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <AuthPage />
                </PublicOnlyRoute>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected Operational Portal Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* 1. TỔNG QUAN: Bàn làm việc Overview */}
              <Route
                path="/dashboard"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY, ROLES.LAB]}>
                    <DashboardPage />
                  </RoleGuard>
                }
              />

              {/* 2. BÁN HÀNG & POS */}
              <Route
                path="/pos"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS]}>
                    <PosPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/orders"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS]}>
                    <OrdersOmsPage />
                  </RoleGuard>
                }
              />

              {/* 3. KHÚC XẠ & LÂM SÀNG */}
              <Route
                path="/optometry-appointments"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPTOMETRY]}>
                    <OptometryAppointmentsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/optometry"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPTOMETRY]}>
                    <OptometryPage />
                  </RoleGuard>
                }
              />

              {/* 4. LAB GIA CÔNG */}
              <Route
                path="/lab"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <LabPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/lab-qc"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <LabQcPage />
                  </RoleGuard>
                }
              />

              {/* 5. KHO VẬN & VẬT TƯ */}
              <Route
                path="/inventory"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <InventoryPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/stock-transfer"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <StockTransferPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/stock-vouchers"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <StockVouchersPage />
                  </RoleGuard>
                }
              />

              {/* 6. KHÁCH HÀNG & BẢO HÀNH */}
              <Route
                path="/crm"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS, ROLES.OPTOMETRY]}>
                    <CrmPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/warranty"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS]}>
                    <WarrantyPage />
                  </RoleGuard>
                }
              />

              {/* 7. QUẢN TRỊ & BÁO CÁO */}
              <Route
                path="/reports"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <ReportsPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/settings"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <StaffRbacPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/catalog-management"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <CatalogManagementPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/vouchers"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <VoucherManagementPage />
                  </RoleGuard>
                }
              />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound404 />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
