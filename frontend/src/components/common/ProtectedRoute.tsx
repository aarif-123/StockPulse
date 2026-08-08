import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-checking">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated requests to the login screen
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User does not possess the correct authorization level
    return (
      <div className="permission-error page-container">
        <div className="card error-card">
          <h2>Access Denied (403)</h2>
          <p>Your current role (<strong>{user.role}</strong>) does not have permission to view this page.</p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
