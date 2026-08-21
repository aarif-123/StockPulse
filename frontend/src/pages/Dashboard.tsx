import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dashboardService, type DashboardStatsData } from '../services/dashboard.service';
import { productService } from '../services/product.service';
import { customerService } from '../services/customer.service';
import { challanService } from '../services/challan.service';
import { reportService, type StockMovementReportItem } from '../services/report.service';
import { handleApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useDashboardCustomization } from '../hooks/useDashboardCustomization';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { QuickStockModal } from '../components/products/QuickStockModal';
import { DashboardCustomizerModal } from '../components/dashboard/DashboardCustomizerModal';
import { AdminDashboardView } from '../components/dashboard/AdminDashboardView';
import { SalesDashboardView } from '../components/dashboard/SalesDashboardView';
import { WarehouseDashboardView } from '../components/dashboard/WarehouseDashboardView';
import { AccountsDashboardView } from '../components/dashboard/AccountsDashboardView';
import { IconSliders, IconRefresh } from '../components/common/Icons';
import type { Product, Customer, Challan, Role } from '../types';

export const Dashboard: React.FC = () => {
  const { user, activeOrg } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const [searchParams] = useSearchParams();

  const effectiveRole = activeOrg?.role || user?.role || 'ADMIN';
  const normalizedRole: Role = effectiveRole === 'ORG_ADMIN' ? 'ADMIN' : (effectiveRole as Role);

  const viewQuery = searchParams.get('view')?.toUpperCase();
  const activeRoleView: Role =
    normalizedRole === 'ADMIN' && viewQuery && ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'].includes(viewQuery)
      ? (viewQuery as Role)
      : normalizedRole;

  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [recentMovements, setRecentMovements] = useState<StockMovementReportItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductForInward, setSelectedProductForInward] = useState<Product | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Dashboard customization hook (persists in localStorage per user & active role view)
  const {
    config: customizationConfig,
    toggleElement,
    setElement,
    applyPreset,
    resetToDefaults,
    hasHiddenElements,
    hiddenCount,
    visibleCount,
    totalElements,
    isAllElementsHidden,
  } = useDashboardCustomization(user?.id, activeRoleView);

  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        statsRes,
        lowStockRes,
        prodRes,
        custRes,
        challanRes,
        movRes,
      ] = await Promise.allSettled([
        dashboardService.getStats(),
        productService.getProducts({ lowStock: true, limit: 6 }),
        productService.getProducts({ limit: 20 }),
        customerService.getCustomers({ limit: 20 }),
        challanService.getChallans({ limit: 10 }),
        reportService.getStockMovements({ limit: 8 }),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      } else {
        setError(handleApiError(statsRes.reason));
      }

      if (lowStockRes.status === 'fulfilled') {
        setLowStockProducts(lowStockRes.value.data);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data);
      }
      if (custRes.status === 'fulfilled') {
        setCustomers(custRes.value.data);
      }
      if (challanRes.status === 'fulfilled') {
        setChallans(challanRes.value.data);
      }
      if (movRes.status === 'fulfilled') {
        setRecentMovements(movRes.value.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  const handleStockAddedSuccess = (updatedProduct: Product, addedQty: number, type: 'IN' | 'OUT') => {
    toast.success(`${type === 'IN' ? 'Inward' : 'Outward'} of ${addedQty} units recorded for ${updatedProduct.name}`);
    void fetchAllDashboardData();
  };

  const getDashboardSubtitle = () => {
    if (activeRoleView === 'ADMIN') return `Welcome back, ${user?.name} · Executive Operations Command Center`;
    if (activeRoleView === 'SALES') return `Welcome back, ${user?.name} · Sales CRM & Order Dispatch Hub`;
    if (activeRoleView === 'WAREHOUSE') return `Welcome back, ${user?.name} · Warehouse Logistics & Inventory Control`;
    if (activeRoleView === 'ACCOUNTS') return `Welcome back, ${user?.name} · Financial Capital & GST Compliance`;
    return `Welcome back, ${user?.name}`;
  };

  const getDashboardTitle = () => {
    if (activeRoleView === 'ADMIN') return 'Executive Dashboard';
    if (activeRoleView === 'SALES') return 'Sales & CRM Dashboard';
    if (activeRoleView === 'WAREHOUSE') return 'Warehouse Ops Dashboard';
    if (activeRoleView === 'ACCOUNTS') return 'Finance & Accounts Dashboard';
    return 'Dashboard';
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Quick Inward Stock Modal */}
      {selectedProductForInward && (
        <QuickStockModal
          product={selectedProductForInward}
          isOpen={true}
          onClose={() => setSelectedProductForInward(null)}
          onSuccess={handleStockAddedSuccess}
        />
      )}

      {/* Dashboard Element Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        role={activeRoleView}
        config={customizationConfig}
        onToggle={toggleElement}
        onSetElement={setElement}
        onApplyPreset={applyPreset}
        onReset={resetToDefaults}
        visibleCount={visibleCount}
        totalElements={totalElements}
      />

      <PageHeader
        title={getDashboardTitle()}
        subtitle={getDashboardSubtitle()}
        actions={
          <div className="flex-center gap-8">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCustomizerOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Customize stats, widgets, and layout elements on this dashboard"
              id="customize-dashboard-btn"
            >
              <IconSliders size={14} className="color-primary" />
              Customize View
              {hasHiddenElements && (
                <span
                  style={{
                    background: 'rgba(124, 58, 237, 0.2)',
                    color: '#c084fc',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(124, 58, 237, 0.35)',
                    marginLeft: '2px',
                  }}
                >
                  {hiddenCount} hidden
                </span>
              )}
            </button>
          </div>
        }
      />

      {error && (
        <div className="alert alert-danger mb-20">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="flex-col gap-20">
          <LoadingSkeleton variant="stat" count={4} />
          <LoadingSkeleton variant="card" count={2} />
        </div>
      ) : stats ? (
        <>
          {isAllElementsHidden ? (
            <div className="card text-center" style={{ padding: '60px 24px', margin: '20px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎛️</div>
              <h3 className="card-title" style={{ fontSize: '18px', marginBottom: '6px' }}>
                All Dashboard Elements are Currently Hidden
              </h3>
              <p className="color-tertiary fs-13" style={{ maxWidth: '440px', margin: '0 auto 20px auto' }}>
                You have turned off all stats, action grids, and widgets for this role view. You can restore default visibility or select specific cards to show.
              </p>
              <div className="flex-center gap-12">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={resetToDefaults}
                >
                  <IconRefresh size={14} />
                  Restore Default View
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCustomizerOpen(true)}
                >
                  <IconSliders size={14} />
                  Open Customizer
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeRoleView === 'ADMIN' && (
                <AdminDashboardView
                  stats={stats}
                  lowStockProducts={lowStockProducts}
                  recentMovements={recentMovements}
                  customization={customizationConfig}
                  onQuickInward={(p) => setSelectedProductForInward(p)}
                />
              )}

              {activeRoleView === 'SALES' && (
                <SalesDashboardView
                  stats={stats}
                  customers={customers}
                  recentChallans={challans}
                  products={products}
                  customization={customizationConfig}
                />
              )}

              {activeRoleView === 'WAREHOUSE' && (
                <WarehouseDashboardView
                  stats={stats}
                  lowStockProducts={lowStockProducts}
                  pendingChallans={challans}
                  recentMovements={recentMovements}
                  customization={customizationConfig}
                  onQuickInward={(p) => setSelectedProductForInward(p)}
                />
              )}

              {activeRoleView === 'ACCOUNTS' && (
                <AccountsDashboardView
                  stats={stats}
                  customers={customers}
                  challans={challans}
                  customization={customizationConfig}
                />
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;

