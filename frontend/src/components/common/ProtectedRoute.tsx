import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role, OrgRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (Role | OrgRole)[];
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireSuperAdmin = false,
}) => {
  const { isAuthenticated, user, activeOrg, isSuperAdmin, loading, isSupportMode } = useAuth();

  if (loading) {
    return (
      <div className="auth-checking" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '12px', color: '#64748b' }}>Verifying authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect Super Admins back to Platform Governance if they access tenant routes without a support session
  if (!requireSuperAdmin && isSuperAdmin && !isSupportMode) {
    return <Navigate to="/platform" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="permission-error page-container" style={{ padding: '32px' }}>
        <div className="card error-card" style={{ maxWidth: '520px', margin: '40px auto', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Platform Super Admin Access Required</h2>
          <p style={{ color: '#64748b', marginTop: '12px' }}>
            This portal is restricted to StockPulse Platform Super Administrators.
          </p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
            Back to Organization Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (allowedRoles && user && !isSuperAdmin) {
    const currentRole = activeOrg?.role || user.role;
    const hasAllowedRole = currentRole && (allowedRoles as string[]).includes(currentRole);

    if (!hasAllowedRole) {
      return (
        <div className="permission-error page-container" style={{ padding: '32px' }}>
          <div className="card error-card" style={{ maxWidth: '520px', margin: '40px auto', padding: '24px', textAlign: 'center' }}>
            <h2 style={{ color: '#f59e0b' }}>Access Denied (403)</h2>
            <p style={{ color: '#64748b', marginTop: '12px' }}>
              Your current role (<strong>{currentRole}</strong>) in <strong>{activeOrg?.organizationName || 'your organization'}</strong> does not have permission to view this page.
            </p>
            <a href="/dashboard" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
