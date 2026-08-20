import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DashboardStatsData } from '../../services/dashboard.service';
import type { StockMovementReportItem } from '../../services/report.service';
import type { Product, Challan } from '../../types';
import type { DashboardElementVisibility } from '../../hooks/useDashboardCustomization';
import { OperationalHealthStrip } from './OperationalHealthStrip';
import {
  IconPackage, IconAlertTriangle, IconPlus, IconTruck,
  IconBarChart,
} from '../common/Icons';

interface WarehouseDashboardViewProps {
  stats: DashboardStatsData;
  lowStockProducts: Product[];
  pendingChallans: Challan[];
  recentMovements: StockMovementReportItem[];
  customization: DashboardElementVisibility;
  onQuickInward: (product: Product) => void;
}

export const WarehouseDashboardView: React.FC<WarehouseDashboardViewProps> = ({
  stats,
  lowStockProducts,
  pendingChallans,
  recentMovements,
  customization,
  onQuickInward,
}) => {
  const navigate = useNavigate();

  const showAnyStatCard =
    customization.kpiStats &&
    (customization.statCard1 || customization.statCard2 || customization.statCard3 || customization.statCard4);

  const showTwoCol = customization.lowStockSection || customization.secondaryWidgets;
  const isSingleColInTwoCol =
    (customization.lowStockSection && !customization.secondaryWidgets) ||
    (!customization.lowStockSection && customization.secondaryWidgets);

  return (
    <div>
      {customization.healthStrip && <OperationalHealthStrip stats={stats} role="WAREHOUSE" />}

      {/* Warehouse KPI Cards */}
      {showAnyStatCard && (
        <div className="stats-grid">
          {customization.statCard1 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Active Inventory SKUs</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconPackage size={18} />
                </div>
              </div>
              <div className="stat-card__value">{stats.products.total}</div>
              <div className="stat-card__footer">Total catalog items tracked</div>
            </div>
          )}

          {customization.statCard2 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Low Stock Alerts</span>
                <div className="stat-card__icon stat-card__icon--yellow">
                  <IconAlertTriangle size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: stats.products.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
                {stats.products.lowStockCount}
              </div>
              <div className="stat-card__footer">
                {stats.products.lowStockCount > 0 ? 'Below safety thresholds' : 'All levels adequate'}
              </div>
            </div>
          )}

          {customization.statCard3 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Out of Stock (Zero Units)</span>
                <div className="stat-card__icon stat-card__icon--purple">
                  <IconAlertTriangle size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: stats.products.outOfStockCount > 0 ? 'var(--danger)' : 'inherit' }}>
                {stats.products.outOfStockCount}
              </div>
              <div className="stat-card__footer">Requires urgent replenishment</div>
            </div>
          )}

          {customization.statCard4 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">7-Day Movement Velocity</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconBarChart size={18} />
                </div>
              </div>
              <div className="stat-card__value">
                +{stats.stockMovements.inLast7Days} / -{stats.stockMovements.outLast7Days}
              </div>
              <div className="stat-card__footer">Net: {stats.stockMovements.inLast7Days - stats.stockMovements.outLast7Days} units</div>
            </div>
          )}
        </div>
      )}

      {/* Warehouse Quick Action Grid */}
      {customization.quickActions && (
        <div className="quick-action-grid">
          <Link to="/products" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--blue">
              <IconPackage size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Manage Warehouse Inventory</div>
              <div className="quick-action-card__desc">Aisle bins, threshold limits &amp; adjustments</div>
            </div>
          </Link>

          <Link to="/reports" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--green">
              <IconBarChart size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Stock In/Out Audit Logs</div>
              <div className="quick-action-card__desc">Inspect historical material movements</div>
            </div>
          </Link>
        </div>
      )}

      {/* Two-Column Warehouse Layout */}
      {showTwoCol && (
        <div className={`dashboard-two-col ${isSingleColInTwoCol ? 'dashboard-two-col--single' : ''}`}>
          {/* Left Column: Immediate Replenishment Priority Matrix */}
          {customization.lowStockSection && (
            <div className="card">
              <div className="flex-between mb-12">
                <div className="flex-center gap-8">
                  <IconAlertTriangle size={16} className="color-warning" />
                  <h3 className="card-title" style={{ margin: 0 }}>Restock Priority Matrix</h3>
                </div>
                <Link to="/products?lowStock=true" className="btn btn-ghost btn-sm color-primary">
                  View All Low Stock →
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="fs-13 color-success" style={{ padding: '20px', textAlign: 'center' }}>
                  ✓ All warehouse products have healthy inventory levels above safety minimums.
                </div>
              ) : (
                <div className="flex-col gap-8">
                  {lowStockProducts.map((p) => {
                    const ratio = Math.min(100, Math.round((p.currentStock / p.minimumStock) * 100));
                    const barColor = p.currentStock === 0 ? 'var(--danger)' : 'var(--warning)';

                    return (
                      <div key={p.id} className="low-stock-item">
                        <div className="low-stock-item__header">
                          <div>
                            <div className="low-stock-item__name">{p.name}</div>
                            <div className="low-stock-item__meta">
                              SKU: {p.sku} · <strong>Location: {p.warehouseLocation || 'Main Hub'}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onQuickInward(p)}
                          >
                            <IconPlus size={12} />
                            Inward Stock
                          </button>
                        </div>

                        <div className="low-stock-item__levels">
                          <span>Available: <strong>{p.currentStock} units</strong></span>
                          <span>Min Safe: <strong>{p.minimumStock} units</strong></span>
                        </div>

                        <div className="stock-meter-bg">
                          <div
                            className="stock-meter-bar"
                            style={{ width: `${Math.max(5, ratio)}%`, background: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Right Column: Pending Dispatch Queue */}
          {customization.secondaryWidgets && (
            <div className="card">
              <div className="flex-between mb-12">
                <div className="flex-center gap-8">
                  <IconTruck size={16} className="color-primary" />
                  <h3 className="card-title" style={{ margin: 0 }}>Pending Dispatch Prep Queue</h3>
                </div>
                <Link to="/challans" className="btn btn-ghost btn-sm color-primary">
                  All Challans →
                </Link>
              </div>

              {pendingChallans.filter((c) => c.status === 'DRAFT').length === 0 ? (
                <div className="fs-13 color-tertiary" style={{ padding: '20px', textAlign: 'center' }}>
                  No draft challans pending dispatch preparation.
                </div>
              ) : (
                <div className="flex-col gap-8">
                  {pendingChallans
                    .filter((c) => c.status === 'DRAFT')
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="followup-card"
                        onClick={() => navigate(`/challans/${c.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div>
                          <div className="fw-700 text-mono color-primary fs-13">
                            {c.challanNumber}
                          </div>
                          <div className="fs-12 color-secondary">
                            For: {c.customer?.businessName || c.customer?.name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="fw-700 fs-13">{c.totalQuantity} units</div>
                          <span className="badge badge-warning fs-10">Prep &amp; Pack</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Movement Audit Stream */}
      {customization.activityStream && (
        <div className="card">
          <div className="flex-between mb-12">
            <div className="flex-center gap-8">
              <IconBarChart size={16} className="color-primary" />
              <h3 className="card-title" style={{ margin: 0 }}>Recent Warehouse Stock Inflow &amp; Outflow</h3>
            </div>
            <Link to="/reports" className="btn btn-ghost btn-sm color-primary">
              Audit Reports →
            </Link>
          </div>

          <div className="activity-feed">
            {recentMovements.slice(0, 5).map((m) => (
              <div key={m.id} className="activity-item">
                <div className={`activity-dot activity-dot--${m.type}`} />
                <div className="activity-item__content">
                  <div className="activity-item__title">
                    <span>{m.product?.name || 'Item'} ({m.product?.sku})</span>
                    <span className={m.type === 'IN' ? 'color-success' : 'color-danger'}>
                      {m.type === 'IN' ? `+${m.quantity} Stock In` : `-${m.quantity} Dispatched`}
                    </span>
                  </div>
                  <div className="activity-item__sub">
                    <span>Reason: {m.reason}</span> · <span>Operator: {m.user?.name || 'Staff'}</span> ·{' '}
                    <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

