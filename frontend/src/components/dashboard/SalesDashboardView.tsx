import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DashboardStatsData } from '../../services/dashboard.service';
import type { Customer, Challan, Product } from '../../types';
import type { DashboardElementVisibility } from '../../hooks/useDashboardCustomization';
import { StatusBadge } from '../common/StatusBadge';
import {
  IconUsers, IconTruck, IconPlus, IconCheck, IconClock,
  IconPackage,
} from '../common/Icons';

interface SalesDashboardViewProps {
  stats: DashboardStatsData;
  customers: Customer[];
  recentChallans: Challan[];
  products: Product[];
  customization: DashboardElementVisibility;
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({
  stats,
  customers,
  recentChallans,
  products,
  customization,
}) => {
  const navigate = useNavigate();

  // Find customers with upcoming/scheduled follow-ups
  const scheduledFollowUps = customers
    .filter((c) => c.followUpDate)
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
    .slice(0, 5);

  // Available high-stock products
  const availableCatalog = products
    .filter((p) => p.currentStock > 0)
    .slice(0, 5);

  const showAnyStatCard =
    customization.kpiStats &&
    (customization.statCard1 || customization.statCard2 || customization.statCard3 || customization.statCard4);

  return (
    <div>
      {/* Sales KPI Cards */}
      {showAnyStatCard && (
        <div className="stats-grid">
          {customization.statCard1 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Active CRM Leads</span>
                <div className="stat-card__icon stat-card__icon--purple">
                  <IconUsers size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: 'var(--primary-hover)' }}>
                {stats.customers.leads}
              </div>
              <div className="stat-card__footer">
                Out of {stats.customers.total} total accounts ({stats.customers.active} active clients)
              </div>
            </div>
          )}

          {customization.statCard2 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Orders Dispatched Today</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconCheck size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                {stats.challans.confirmedToday}
              </div>
              <div className="stat-card__footer">
                {stats.challans.totalConfirmed} total confirmed shipments
              </div>
            </div>
          )}

          {customization.statCard3 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Drafts Requiring Sign-off</span>
                <div className="stat-card__icon stat-card__icon--yellow">
                  <IconClock size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: stats.challans.totalDraft > 0 ? 'var(--warning)' : 'inherit' }}>
                {stats.challans.totalDraft}
              </div>
              <div className="stat-card__footer">
                <Link to="/challans" className="color-primary fw-600">
                  Review and confirm dispatches →
                </Link>
              </div>
            </div>
          )}

          {customization.statCard4 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">New Accounts (This Mo.)</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconPlus size={18} />
                </div>
              </div>
              <div className="stat-card__value">+{stats.customers.newThisMonth}</div>
              <div className="stat-card__footer">Monthly customer acquisition pace</div>
            </div>
          )}
        </div>
      )}

      {/* Sales Action Bar */}
      {customization.quickActions && (
        <div className="quick-action-grid">
          <Link to="/challans/new" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--purple">
              <IconTruck size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">+ Create Sales Challan</div>
              <div className="quick-action-card__desc">Book delivery slip for customer</div>
            </div>
          </Link>

          <Link to="/customers" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--green">
              <IconUsers size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">+ Add Customer / Lead</div>
              <div className="quick-action-card__desc">Register new business contact</div>
            </div>
          </Link>
        </div>
      )}

      {/* Two-Column Sales Grid */}
      {customization.secondaryWidgets && (
        <div className="dashboard-two-col">
          {/* Left Column: Scheduled Customer Follow-Ups */}
          <div className="card">
            <div className="flex-between mb-12">
              <div className="flex-center gap-8">
                <IconClock size={16} className="color-primary" />
                <h3 className="card-title" style={{ margin: 0 }}>Client Follow-Up Radar</h3>
              </div>
              <Link to="/customers" className="btn btn-ghost btn-sm color-primary">
                All Clients ({customers.length}) →
              </Link>
            </div>

            {scheduledFollowUps.length === 0 ? (
              <div className="fs-13 color-tertiary" style={{ padding: '20px', textAlign: 'center' }}>
                No upcoming client follow-ups scheduled. Open a customer to set reminders.
              </div>
            ) : (
              <div className="flex-col gap-8">
                {scheduledFollowUps.map((c) => {
                  const dateObj = new Date(c.followUpDate!);
                  const isOverdue = dateObj.getTime() < Date.now();

                  return (
                    <div
                      key={c.id}
                      className="followup-card"
                      onClick={() => navigate(`/customers/${c.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="fw-600 fs-13 color-primary">
                          {c.businessName || c.name}
                        </div>
                        <div className="fs-11 color-tertiary" style={{ marginTop: '2px' }}>
                          {c.notes ? `"${c.notes.slice(0, 45)}…"` : 'No notes'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          className={`badge ${isOverdue ? 'badge-danger' : 'badge-info'}`}
                          style={{ fontSize: '11px' }}
                        >
                          {isOverdue ? 'Overdue: ' : 'Due: '}
                          {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Catalog Availability Check */}
          <div className="card">
            <div className="flex-between mb-12">
              <div className="flex-center gap-8">
                <IconPackage size={16} className="color-success" />
                <h3 className="card-title" style={{ margin: 0 }}>Catalog Stock Quick Check</h3>
              </div>
              <Link to="/products" className="btn btn-ghost btn-sm color-primary">
                Full Catalog →
              </Link>
            </div>

            <div className="flex-col gap-8">
              {availableCatalog.map((p) => {
                const isLow = p.currentStock <= p.minimumStock;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div className="fw-600 fs-13">{p.name}</div>
                      <div className="fs-11 color-tertiary text-mono">₹{Number(p.unitPrice).toFixed(2)} · {p.category}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: isLow ? 'var(--warning)' : 'var(--success)',
                        }}
                      >
                        {p.currentStock} in stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Dispatches Table */}
      {customization.activityStream && (
        <div className="card">
          <div className="flex-between mb-12">
            <div className="flex-center gap-8">
              <IconTruck size={16} className="color-primary" />
              <h3 className="card-title" style={{ margin: 0 }}>Recent Customer Delivery Challans</h3>
            </div>
            <Link to="/challans" className="btn btn-ghost btn-sm color-primary">
              View All Challans →
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan ID</th>
                  <th>Client / Consignee</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentChallans.slice(0, 5).map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/challans/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="text-mono fw-700 color-primary">{c.challanNumber}</td>
                    <td>{c.customer?.businessName || c.customer?.name || '—'}</td>
                    <td className="fw-600">{c.totalQuantity} units</td>
                    <td>{StatusBadge.challan(c.status)}</td>
                    <td className="color-secondary fs-12">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDashboardView;
