import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { CommandPalette } from '../common/CommandPalette';
import { SupportSessionBanner } from './SupportSessionBanner';
import { AiAssistantChatbot } from '../chat/AiAssistantChatbot';
import { NotificationBell } from './NotificationBell';
import {
  IconDashboard, IconUsers, IconPackage, IconFileText,
  IconBarChart, IconSearch, IconLogOut,
  IconMenu, IconShoppingCart, IconSliders, IconClipboardCheck,
  IconLayers, IconIndianRupee, IconBell,
  IconSun, IconMoon,
} from '../common/Icons';

export const SidebarLayout: React.FC = () => {
  const { user, activeOrg, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    if (window.innerWidth <= 992) {
      setMobileOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileSidebar = () => setMobileOpen(false);

  if (!user) return null;

  const currentRole = activeOrg?.role || user.role || 'SALES';
  const isOrgAdmin = currentRole === 'ORG_ADMIN' || currentRole === 'ADMIN' || isSuperAdmin;
  const allowedFeatures = activeOrg?.subscription?.allowedFeatures || [
    'CORE_ERP',
    'CRM',
    'CHALLANS',
    'BASIC_REPORTS',
    'ADVANCED_INVENTORY',
    'WHATSAPP_TX',
    'EXPORT_EXCEL',
    'BOM_ASSEMBLIES',
  ];

  const hasFeature = (feat: string) => isSuperAdmin || allowedFeatures.includes(feat);

  const showCustomers = (['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS'].includes(currentRole) || isSuperAdmin) && hasFeature('CRM');
  const showProducts = (['ORG_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(currentRole) || isSuperAdmin) && hasFeature('CORE_ERP');
  const showReorder = ['ORG_ADMIN', 'ADMIN'].includes(currentRole) || isSuperAdmin;
  const showAim = (['ORG_ADMIN', 'ADMIN', 'ACCOUNTS'].includes(currentRole) || isSuperAdmin) && hasFeature('ADVANCED_INVENTORY');
  const showStockTake = (['ORG_ADMIN', 'ADMIN', 'WAREHOUSE'].includes(currentRole) || isSuperAdmin) && hasFeature('CORE_ERP');
  const showAssemblies = (['ORG_ADMIN', 'ADMIN', 'WAREHOUSE'].includes(currentRole) || isSuperAdmin) && hasFeature('BOM_ASSEMBLIES');
  const showChallans = (['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'].includes(currentRole) || isSuperAdmin) && hasFeature('CHALLANS');
  const showReports = (['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'ACCOUNTS'].includes(currentRole) || isSuperAdmin) && hasFeature('BASIC_REPORTS');

  return (
    <div className="layout-container">
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Tenant Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div className="logo-mark">V</div>
            {!sidebarCollapsed && (
              <span className="logo-text">VyaaparSync</span>
            )}
          </div>
          <button
            className="hamburger-btn"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle Sidebar"
            style={{ width: '32px', height: '32px' }}
          >
            <IconMenu size={18} />
          </button>
        </div>


        <nav className="sidebar-menu">
          {/* If user is also a Platform Super Admin, provide quick link back to Platform Admin Console */}
          {isSuperAdmin && (
            <>
              <div className="sidebar-section-label" style={{ color: '#f59e0b' }}>Platform Admin</div>
              <li className="sidebar-item" onClick={closeMobileSidebar}>
                <NavLink to="/platform" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <span className="nav-icon" style={{ fontSize: '15px' }}>👑</span>
                  Return to Platform Admin
                </NavLink>
              </li>
            </>
          )}

          <div className="sidebar-section-label">Operations</div>
          <li className="sidebar-item" onClick={closeMobileSidebar}>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              <IconDashboard size={18} className="nav-icon" />
              Dashboard
            </NavLink>
          </li>

          {showCustomers && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconUsers size={18} className="nav-icon" />
                Customers (CRM)
              </NavLink>
            </li>
          )}

          {showProducts && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconPackage size={18} className="nav-icon" />
                Product Catalog
              </NavLink>
            </li>
          )}

          {showReorder && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/reorder" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconShoppingCart size={18} className="nav-icon" />
                Purchasing & PO
              </NavLink>
            </li>
          )}

          {showAim && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/aim" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconSliders size={18} className="nav-icon" />
                Inventory AIM
              </NavLink>
            </li>
          )}

          {showStockTake && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/stock-take" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconClipboardCheck size={18} className="nav-icon" />
                Stock Taking
              </NavLink>
            </li>
          )}

          {showAssemblies && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/assemblies" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconLayers size={18} className="nav-icon" />
                BOM Assemblies
              </NavLink>
            </li>
          )}

          {showChallans && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/challans" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconFileText size={18} className="nav-icon" />
                Delivery Challans
              </NavLink>
            </li>
          )}

          {showReports && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
                <IconBarChart size={18} className="nav-icon" />
                Reports
              </NavLink>
            </li>
          )}

          {/* Profile & Account Settings */}
          <div className="sidebar-section-label">{isOrgAdmin ? 'Organization' : 'Account'}</div>
          
          <li className="sidebar-item" onClick={closeMobileSidebar}>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon" style={{ fontSize: '15px' }}>👤</span>
              Profile Settings
            </NavLink>
          </li>

          <li className="sidebar-item" onClick={closeMobileSidebar}>
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active' : '')}>
              <IconBell size={18} className="nav-icon" />
              Alerts & History
            </NavLink>
          </li>

          {isOrgAdmin && (
            <>
              <li className="sidebar-item" onClick={closeMobileSidebar}>
                <NavLink to="/org/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <span className="nav-icon" style={{ fontSize: '15px' }}>⚙️</span>
                  Settings & Members
                </NavLink>
              </li>
              <li className="sidebar-item" onClick={closeMobileSidebar}>
                <NavLink to="/org/billing" className={({ isActive }) => (isActive ? 'active' : '')}>
                  <IconIndianRupee size={18} className="nav-icon" />
                  Billing & Plans
                </NavLink>
              </li>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user__avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user__info">
              <div className="sidebar-user__name">{user.name}</div>
              <div className="sidebar-user__role">{currentRole}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <IconLogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <SupportSessionBanner />
        <header className="header-bar">
          <div className="header-left">
            <button
              className="hamburger-btn header-reopen-btn"
              onClick={toggleSidebar}
              aria-label="Re-open sidebar"
              title="Open Sidebar"
            >
              <IconMenu size={18} />
            </button>

            <button
              className="search-trigger"
              onClick={() => setCommandPaletteOpen(true)}
              title="Search (Ctrl + K)"
            >
              <IconSearch size={14} />
              <span>Search…</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="hamburger-btn theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ width: '38px', height: '38px' }}
            >
              {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="page-container">
          <Outlet />
        </main>
      </div>

      {mobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.4)', backdropFilter: 'none' }}
          onClick={closeMobileSidebar}
        />
      )}

      {/* Floating StockPulse AI Assistant Widget */}
      <AiAssistantChatbot />
    </div>
  );
};

export default SidebarLayout;
