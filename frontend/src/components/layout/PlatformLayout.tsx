import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { IconLogOut, IconMenu } from '../common/Icons';

export const PlatformLayout: React.FC = () => {
  const { user, logout, isSupportMode, exitSupportSession } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchPendingPaymentsCount = async () => {
      try {
        const res = await api.get('/platform/payments?status=PENDING');
        if (Array.isArray(res.data.data)) {
          setPendingPaymentsCount(res.data.data.length);
        }
      } catch {
        // Silently handle layout telemetry fetching
      }
    };

    void fetchPendingPaymentsCount();

    const handlePaymentsUpdated = (e: any) => {
      if (typeof e?.detail?.count === 'number') {
        setPendingPaymentsCount(e.detail.count);
      } else {
        void fetchPendingPaymentsCount();
      }
    };

    window.addEventListener('payments-updated', handlePaymentsUpdated);
    return () => {
      window.removeEventListener('payments-updated', handlePaymentsUpdated);
    };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitSupport = async () => {
    await exitSupportSession();
    navigate('/platform');
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 992) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => setMobileOpen(false);

  if (!user) return null;

  const navItems = [
    { path: '/platform', label: 'Telemetry & Overview', icon: '📊', exact: true },
    { path: '/platform/organizations', label: 'Enterprise Tenants', icon: '🏢' },
    { path: '/platform/users', label: 'User Registry', icon: '👤' },
    { path: '/platform/payments', label: 'Payment Approvals', icon: '💳', badge: pendingPaymentsCount },
    { path: '/platform/plans', label: 'Commercial Plans', icon: '📦' },
    { path: '/platform/support', label: 'Support & Impersonation', icon: '🔒' },
    { path: '/platform/audit', label: 'Global Audit Trail', icon: '📜' },
  ];

  return (
    <div className="layout-container" style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh' }}>
      {/* Impersonation Warning Banner */}
      {isSupportMode && (
        <div
          style={{
            backgroundColor: '#d97706',
            color: '#ffffff',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ ACTIVE IMPERSONATION SUPPORT SESSION: You are viewing tenant data as an impersonated user.</span>
          </div>
          <button
            onClick={handleExitSupport}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            End Support Session & Return
          </button>
        </div>
      )}

      {/* Platform Admin Sidebar */}
      <aside
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{
          backgroundColor: '#0c1017',
          borderRight: '1px solid #1e293b',
        }}
      >
        {/* Left Sidebar Header with Brand + Burger Icon Button */}
        <div
          className="sidebar-header"
          style={{
            borderBottom: '1px solid #1e293b',
            padding: '16px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                flexShrink: 0,
              }}
            >
              👑
            </div>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span className="logo-text" style={{ color: '#f8fafc', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                  StockPulse
                </span>
                <span style={{ fontSize: '9.5px', color: '#f59e0b', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Platform Super Admin
                </span>
              </div>
            )}
          </div>

          {/* Left Sidebar Burger Icon */}
          <button
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle Sidebar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <IconMenu size={18} />
          </button>
        </div>

        <nav className="sidebar-menu" style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, padding: '0 8px 10px 8px' }}>
            Platform Governance
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <li key={item.path} onClick={closeMobileSidebar}>
                  <NavLink
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: isActive ? '#f8fafc' : '#94a3b8',
                      backgroundColor: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '13.5px',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Optimised User Profile Section at Bottom */}
        <div
          className="sidebar-footer"
          style={{
            borderTop: '1px solid #1e293b',
            background: '#090d16',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                color: '#000000',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#f8fafc',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {user.name}
                </div>
                <div style={{ color: '#f59e0b', fontSize: '10.5px', fontWeight: 700, marginTop: '2px' }}>
                  SUPER ADMIN
                </div>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              className="logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <IconLogOut size={15} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ backgroundColor: '#0f172a', minHeight: '100vh' }}>
        <header
          style={{
            backgroundColor: '#0c111d',
            borderBottom: '1px solid #1e293b',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="hamburger-btn header-reopen-btn"
              onClick={toggleSidebar}
              aria-label="Re-open sidebar"
              title="Open Sidebar"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#f59e0b',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <IconMenu size={18} />
            </button>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> Global SaaS Platform Administrator Suite
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontSize: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              ● System Operational
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={closeMobileSidebar}
        />
      )}
    </div>
  );
};

export default PlatformLayout;
