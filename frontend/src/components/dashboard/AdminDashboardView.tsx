import React from 'react';
import { Link } from 'react-router-dom';
import type { DashboardStatsData } from '../../services/dashboard.service';
import type { StockMovementReportItem } from '../../services/report.service';
import type { Product } from '../../types';
import type { DashboardElementVisibility } from '../../hooks/useDashboardCustomization';
import { AnalyticsCharts } from '../analytics/AnalyticsCharts';
import { OperationalHealthStrip } from './OperationalHealthStrip';
import {
  IconUsers, IconPackage, IconIndianRupee, IconTruck,
  IconPlus, IconAlertTriangle, IconFileText, IconBarChart,
} from '../common/Icons';

interface AdminDashboardViewProps {
  stats: DashboardStatsData;
  lowStockProducts: Product[];
  recentMovements: StockMovementReportItem[];
  customization: DashboardElementVisibility;
  onQuickInward: (product: Product) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  lowStockProducts,
  recentMovements,
  customization,
  onQuickInward,
}) => {
  const showAnyStatCard =
    customization.kpiStats &&
    (customization.statCard1 || customization.statCard2 || customization.statCard3 || customization.statCard4);

  const showTwoCol = customization.lowStockSection || customization.activityStream;
  const isSingleColInTwoCol =
    (customization.lowStockSection && !customization.activityStream) ||
    (!customization.lowStockSection && customization.activityStream);

  return (
    <div>
      {customization.healthStrip && <OperationalHealthStrip stats={stats} />}

      {/* 4 Core Executive KPI Cards */}
      {showAnyStatCard && (
        <div className="stats-grid">
          {customization.statCard1 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Accounts &amp; Leads</span>
                <div className="stat-card__icon stat-card__icon--purple">
                  <IconUsers size={18} />
                </div>
              </div>
              <div className="stat-card__value">{stats.customers.total}</div>
              <div className="stat-card__footer">
                <span className="color-success fw-600">{stats.customers.active} active</span> · {stats.customers.leads} leads · +{stats.customers.newThisMonth} this mo.
              </div>
            </div>
          )}

          {customization.statCard2 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Catalog Inventory</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconPackage size={18} />
                </div>
              </div>
              <div className="stat-card__value">{stats.products.total}</div>
              <div className="stat-card__footer">
                {stats.products.lowStockCount > 0 ? (
                  <Link to="/products?lowStock=true" className="color-danger fw-600">
                    ⚠️ {stats.products.lowStockCount} low stock alerts
                  </Link>
                ) : (
                  <span className="color-success">Stock healthy</span>
                )}
                {stats.products.outOfStockCount > 0 && (
                  <span className="color-danger"> · {stats.products.outOfStockCount} out of stock</span>
                )}
              </div>
            </div>
          )}

          {customization.statCard3 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Asset Valuation (INR)</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconIndianRupee size={18} />
                </div>
              </div>
              <div className="stat-card__value">
                ₹{stats.products.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-card__footer">
                7d Flow: <strong className="color-success">+{stats.stockMovements.inLast7Days}</strong> in / <strong className="color-danger">-{stats.stockMovements.outLast7Days}</strong> out
              </div>
            </div>
          )}

          {customization.statCard4 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Delivery Challans</span>
                <div className="stat-card__icon stat-card__icon--yellow">
                  <IconTruck size={18} />
                </div>
              </div>
              <div className="stat-card__value">
                {stats.challans.totalConfirmed + stats.challans.totalDraft}
              </div>
              <div className="stat-card__footer">
                <span className="color-success fw-600">{stats.challans.totalConfirmed} confirmed</span> · {stats.challans.totalDraft} draft pending
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Operations Action Bar */}
      {customization.quickActions && (
        <div className="quick-action-grid">
          <Link to="/challans/new" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--purple">
              <IconPlus size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Create Dispatch Challan</div>
              <div className="quick-action-card__desc">Generate outbound delivery slip</div>
            </div>
          </Link>

          <Link to="/customers" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--green">
              <IconUsers size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Manage CRM &amp; Leads</div>
              <div className="quick-action-card__desc">View accounts &amp; follow-ups</div>
            </div>
          </Link>

          <Link to="/products" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--blue">
              <IconPackage size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Inventory &amp; Stock</div>
              <div className="quick-action-card__desc">Monitor SKUs &amp; warehouse bins</div>
            </div>
          </Link>

          <Link to="/reports" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--yellow">
              <IconBarChart size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Movement Audit Log</div>
              <div className="quick-action-card__desc">Download compliance reports</div>
            </div>
          </Link>
        </div>
      )}

      {/* Charts Section */}
      {customization.analyticsCharts && <AnalyticsCharts stats={stats} />}

      {/* Two-Column Operational Hub */}
      {showTwoCol && (
        <div className={`dashboard-two-col ${isSingleColInTwoCol ? 'dashboard-two-col--single' : ''}`}>
          {/* Left Column: Low Stock Alerts & Inward Restock */}
          {customization.lowStockSection && (
            <div className="card">
              <div className="flex-between mb-12">
                <div className="flex-center gap-8">
                  <IconAlertTriangle size={16} className="color-warning" />
                  <h3 className="card-title" style={{ margin: 0 }}>Critical Stock Priority</h3>
                </div>
                <Link to="/products?lowStock=true" className="btn btn-ghost btn-sm color-primary">
                  View all ({stats.products.lowStockCount}) →
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="low-stock-item">
                  <span className="color-success fs-13">All product inventory levels are above minimum safety thresholds.</span>
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
                              {p.sku} · {p.warehouseLocation || 'Main Warehouse'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => onQuickInward(p)}
                          >
                            <IconPlus size={12} />
                            Inward
                          </button>
                        </div>
                        <div className="low-stock-item__levels">
                          <span>Stock: <strong>{p.currentStock}</strong></span>
                          <span>Min: <strong>{p.minimumStock}</strong></span>
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

          {/* Right Column: Live Inventory Movement Activity Stream */}
          {customization.activityStream && (
            <div className="card">
              <div className="flex-between mb-12">
                <div className="flex-center gap-8">
                  <IconFileText size={16} className="color-primary" />
                  <h3 className="card-title" style={{ margin: 0 }}>Recent Inventory Audit Stream</h3>
                </div>
                <Link to="/reports" className="btn btn-ghost btn-sm color-primary">
                  Audit Logs →
                </Link>
              </div>

              {recentMovements.length === 0 ? (
                <div className="fs-13 color-tertiary" style={{ padding: '16px', textAlign: 'center' }}>
                  No recent movements logged yet.
                </div>
              ) : (
                <div className="activity-feed">
                  {recentMovements.map((m) => (
                    <div key={m.id} className="activity-item">
                      <div className={`activity-dot activity-dot--${m.type}`} />
                      <div className="activity-item__content">
                        <div className="activity-item__title">
                          <span>{m.product?.name || 'Product Item'}</span>
                          <span className={m.type === 'IN' ? 'color-success' : 'color-danger'}>
                            {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`} units
                          </span>
                        </div>
                        <div className="activity-item__sub">
                          <span>{m.reason}</span> · <span>By {m.user?.name || 'Staff'}</span> ·{' '}
                          <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

