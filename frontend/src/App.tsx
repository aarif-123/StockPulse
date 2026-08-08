import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { SidebarLayout } from './components/layout/SidebarLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { Products } from './pages/Products';
import { ProductDetails } from './pages/ProductDetails';
import { Challans } from './pages/Challans';
import { CreateChallan } from './pages/CreateChallan';
import { ChallanDetails } from './pages/ChallanDetails';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Path */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Administration Console Paths */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Customer CRM Module */}
            <Route
              path="customers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="customers/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <CustomerDetails />
                </ProtectedRoute>
              }
            />

            {/* Product & Stock Catalog Module */}
            <Route
              path="products"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']}>
                  <ProductDetails />
                </ProtectedRoute>
              }
            />

            {/* Sales Challans Delivery Module */}
            <Route
              path="challans"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <Challans />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                  <CreateChallan />
                </ProtectedRoute>
              }
            />
            <Route
              path="challans/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                  <ChallanDetails />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
