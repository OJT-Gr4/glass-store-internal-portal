import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES } from './routes/rolesConfig';
import { ProtectedRoute, RoleGuard, PublicOnlyRoute } from './routes/RouteGuard';
import MainLayout from './component/layout/MainLayout';
import AuthPage from './component/auth/AuthPage';
import PosPage from './pages/pos/PosPage';
import OptometryPage from './pages/optometry/OptometryPage';
import LabPage from './pages/lab/LabPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import NotFound404 from './pages/common/NotFound404';

// Component to handle root redirection based on user's auth status and role
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.defaultRoute || '/pos'} replace />;
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
        <BrowserRouter>
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
              {/* POS / Cashier Terminal: Allowed for Admin & POS */}
              <Route
                path="/pos"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.POS]}>
                    <PosPage />
                  </RoleGuard>
                }
              />

              {/* Optometry Clinical Exam (OD/OS): Allowed for Admin & Optometry */}
              <Route
                path="/optometry"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.OPTOMETRY]}>
                    <OptometryPage />
                  </RoleGuard>
                }
              />

              {/* Lab Lens Edging & QC: Allowed for Admin & Lab */}
              <Route
                path="/lab"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.LAB]}>
                    <LabPage />
                  </RoleGuard>
                }
              />

              {/* Central Chain & Inventory Dashboard: Allowed for Admin only */}
              <Route
                path="/dashboard"
                element={
                  <RoleGuard allowedRoles={[ROLES.ADMIN]}>
                    <DashboardPage />
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
