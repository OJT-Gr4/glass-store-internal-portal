import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Forbidden403 from '../pages/common/Forbidden403';

/**
 * Route Guard for Authentication
 * Redirects to /login if user is not authenticated
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

/**
 * Route Guard for Role Authorization (RBAC)
 * Intercepts unauthorized access and renders 403 Forbidden
 */
export function RoleGuard({ allowedRoles = [], children }) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRoles)) {
    return <Forbidden403 allowedRoles={allowedRoles} />;
  }

  return children;
}

/**
 * Public-only route (e.g. /login)
 * If user is already authenticated, redirects them directly to their operational dashboard
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={user.defaultRoute || '/pos'} replace />;
  }

  return children;
}

