import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { PlatformLayout } from './components/layout/PlatformLayout';

// Public Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';

// Tenant Business Pages
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Products } from './pages/Products';
import { ProductDetails } from './pages/ProductDetails';
import { Challans } from './pages/Challans';
import { CreateChallan } from './pages/CreateChallan';
import { ChallanDetails } from './pages/ChallanDetails';
import { Reports } from './pages/Reports';
import { ReorderReport } from './pages/ReorderReport';
import { AdvancedInventoryManager } from './pages/AdvancedInventoryManager';
import { StockTake } from './pages/StockTake';
import { ProductionAssemblies } from './pages/ProductionAssemblies';
import { OrganizationSettings } from './pages/OrganizationSettings';
import { BillingSubscriptions } from './pages/BillingSubscriptions';

// Platform Super Admin Suite Pages
import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformOrganizations from './pages/platform/PlatformOrganizations';
import PlatformUsers from './pages/platform/PlatformUsers';
import PlatformPayments from './pages/platform/PlatformPayments';
import PlatformPlans from './pages/platform/PlatformPlans';
import PlatformSupport from './pages/platform/PlatformSupport';
import PlatformAudit from './pages/platform/PlatformAudit';

const HomeOrDashboard: React.FC = () => {
  const { user, token } = useAuth();
  if (token && user) {
    if (user.isSuperAdmin) {
      return <Navigate to="/platform" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public SaaS Landing Page */}
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/pricing" element={<Landing />} />

          {/* Public Authentication Path */}
          <Route path="/login" element={<Login />} />

          {/* ════════════════════════════════════════════════════════════════════
              1. PLATFORM SUPER ADMIN SUITE (SaaS Owner / Operator Governance)
             ════════════════════════════════════════════════════════════════════ */}
          <Route
            path="platform"
            element={
              <ProtectedRoute requireSuperAdmin>
                <PlatformLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PlatformDashboard />} />
            <Route path="organizations" element={<PlatformOrganizations />} />
            <Route path="users" element={<PlatformUsers />} />
            <Route path="payments" element={<PlatformPayments />} />
            <Route path="plans" element={<PlatformPlans />} />
            <Route path="support" element={<PlatformSupport />} />
            <Route path="audit" element={<PlatformAudit />} />
          </Route>

          {/* ════════════════════════════════════════════════════════════════════
              2. TENANT BUSINESS WORKSPACE (Organization Operations)
             ════════════════════════════════════════════════════════════════════ */}
          <Route
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />

            {/* Tenant Organization Administration & Billing */}
            <Route
              path="org/settings"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN']}>
                  <OrganizationSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="org/billing"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN']}>
                  <BillingSubscriptions />
                </ProtectedRoute>
              }
            />

            {/* Customer CRM Module */}
            <Route
              path="customers"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="customers/:id"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS']}>
                  <CustomerDetails />
                </ProtectedRoute>
              }
            />

            {/* Product & Stock Catalog Module */}
            <Route
              path="products"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                  <ProductDetails />
                </ProtectedRoute>
              }
            />

            {/* Purchasing & Reorder Hub */}
            <Route
              path="reorder"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'ACCOUNTS', 'SALES']}>
                  <ReorderReport />
                </ProtectedRoute>
              }
            />

            {/* Advanced Inventory Manager (AIM) */}
            <Route
              path="aim"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'ACCOUNTS']}>
                  <AdvancedInventoryManager />
                </ProtectedRoute>
              }
            />

            {/* Stock Taking & Physical Audit */}
            <Route
              path="stock-take"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']}>
                  <StockTake />
                </ProtectedRoute>
              }
            />

            {/* Production & Assemblies / BOM */}
            <Route
              path="assemblies"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'SALES']}>
                  <ProductionAssemblies />
                </ProtectedRoute>
              }
            />

            {/* Sales Challans Delivery Module */}
            <Route
              path="challans"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Challans />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/new"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES']}>
                  <CreateChallan />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/:id"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'SALES', 'ACCOUNTS']}>
                  <ChallanDetails />
                </ProtectedRoute>
              }
            />

            {/* Stock Movement Audit Reports Module */}
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'ACCOUNTS']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
