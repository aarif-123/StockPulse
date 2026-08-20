import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export const SupportSessionBanner: React.FC = () => {
  const { isSupportMode, user, activeOrg, exitSupportSession } = useAuth();

  if (!isSupportMode) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%)',
        color: '#ffffff',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🔒</span>
        <span>
          <strong>SUPER ADMIN SUPPORT SESSION (MONITOR-ONLY):</strong> Impersonating user{' '}
          <strong>{user?.name}</strong> ({user?.email}) in organization{' '}
          <strong>{activeOrg?.organizationName || 'Tenant'}</strong>. All write actions are blocked. Session is logged.
        </span>
      </div>

      <button
        onClick={() => void exitSupportSession()}
        style={{
          backgroundColor: '#ffffff',
          color: '#b91c1c',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        Exit Support Mode ✕
      </button>
    </div>
  );
};
