import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const SidebarLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  if (!user) return null;

  const role = user.role;

  // Configure navigation visibility based on the user's role
  const showCustomers = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(role);
  const showProducts = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(role);
  const showStock = ['ADMIN', 'WAREHOUSE'].includes(role);
  const showChallans = ['ADMIN', 'SALES', 'ACCOUNTS'].includes(role);

  return (
    <div className="layout-container">
      {/* Sidebar Drawer */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-text">StockPulse Portal</div>
        </div>

        <nav className="sidebar-menu">
          <li className="sidebar-item" onClick={closeMobileSidebar}>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              Dashboard
            </NavLink>
          </li>

          {showCustomers && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink
                to="/customers"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Customers
              </NavLink>
            </li>
          )}

          {showProducts && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink
                to="/products"
                end
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Products
              </NavLink>
            </li>
          )}

          {showStock && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink
                to="/products?lowStock=true"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Stock Alerts
              </NavLink>
            </li>
          )}

          {showChallans && (
            <li className="sidebar-item" onClick={closeMobileSidebar}>
              <NavLink
                to="/challans"
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                Challans
              </NavLink>
            </li>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main-content">
        <header className="header-bar">
          <button className="hamburger-btn" onClick={toggleMobileSidebar} aria-label="Toggle Sidebar">
            ☰
          </button>

          <div className="user-profile">
            <div className="profile-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">{user.role}</span>
            </div>
          </div>
        </header>

        {/* Child Router Views */}
        <main className="page-container">
          <Outlet />
        </main>
      </div>

      {/* Background click overlay for mobile view */}
      {mobileOpen && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.4)', backdropFilter: 'none' }}
          onClick={closeMobileSidebar}
        />
      )}
    </div>
  );
};
