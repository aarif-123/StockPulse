import React from 'react';
import { Link } from 'react-router-dom';
import type { DashboardStatsData } from '../../services/dashboard.service';
import type { Customer, Challan } from '../../types';
import type { DashboardElementVisibility } from '../../hooks/useDashboardCustomization';
import { AnalyticsCharts } from '../analytics/AnalyticsCharts';
import {
  IconIndianRupee, IconTruck, IconUsers, IconDownload,
  IconBarChart,
} from '../common/Icons';
import { exportToCsv } from '../../utils/csvExport';

interface AccountsDashboardViewProps {
  stats: DashboardStatsData;
  customers: Customer[];
  challans: Challan[];
  customization: DashboardElementVisibility;
}

export const AccountsDashboardView: React.FC<AccountsDashboardViewProps> = ({
  stats,
  customers,
  challans,
  customization,
}) => {
  // Compute GST distribution
  const registeredGst = customers.filter((c) => Boolean(c.gstNumber?.trim())).length;
  const unregistered = customers.length - registeredGst;

  const handleExportTaxAudit = () => {
    exportToCsv(
      `accounts_tax_audit_${new Date().toISOString().slice(0, 10)}`,
      customers.map((c) => ({
        'Customer Name': c.name,
        'Business Name': c.businessName,
        GSTIN: c.gstNumber || 'Unregistered',
        'Tax Classification': c.gstNumber?.startsWith('27') ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)',
        Type: c.customerType,
        Status: c.status,
        Address: c.address,
      }))
    );
  };

  const showAnyStatCard =
    customization.kpiStats &&
    (customization.statCard1 || customization.statCard2 || customization.statCard3 || customization.statCard4);

  const showTwoCol = customization.secondaryWidgets || customization.activityStream;
  const isSingleColInTwoCol =
    (customization.secondaryWidgets && !customization.activityStream) ||
    (!customization.secondaryWidgets && customization.activityStream);

  return (
    <div>
      {/* Financial & Accounting KPI Cards */}
      {showAnyStatCard && (
        <div className="stats-grid">
          {customization.statCard1 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Total Capital in Inventory</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconIndianRupee size={18} />
                </div>
              </div>
              <div className="stat-card__value">
                ₹{stats.products.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-card__footer">Total material asset valuation</div>
            </div>
          )}

          {customization.statCard2 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Confirmed Billing Slips</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconTruck size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                {stats.challans.totalConfirmed}
              </div>
              <div className="stat-card__footer">
                {stats.challans.confirmedToday} confirmed today
              </div>
            </div>
          )}

          {customization.statCard3 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Unconfirmed Drafts</span>
                <div className="stat-card__icon stat-card__icon--yellow">
                  <IconBarChart size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: stats.challans.totalDraft > 0 ? 'var(--warning)' : 'inherit' }}>
                {stats.challans.totalDraft}
              </div>
              <div className="stat-card__footer">Pending confirmation &amp; revenue recognition</div>
            </div>
          )}

          {customization.statCard4 && (
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Tax Compliant Entities</span>
                <div className="stat-card__icon stat-card__icon--purple">
                  <IconUsers size={18} />
                </div>
              </div>
              <div className="stat-card__value">{registeredGst} / {customers.length}</div>
              <div className="stat-card__footer">
                {customers.length > 0 ? Math.round((registeredGst / customers.length) * 100) : 0}% have verified GSTIN
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accounts Quick Export & Action Bar */}
      {customization.quickActions && (
        <div className="quick-action-grid">
          <button
            type="button"
            className="quick-action-card"
            onClick={handleExportTaxAudit}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <div className="quick-action-card__icon stat-card__icon--green">
              <IconDownload size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Export GST Tax Audit CSV</div>
              <div className="quick-action-card__desc">Download client tax classification data</div>
            </div>
          </button>

          <Link to="/challans" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--purple">
              <IconTruck size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Delivery Challan Invoices</div>
              <div className="quick-action-card__desc">Inspect confirmed sales shipments</div>
            </div>
          </Link>

          <Link to="/reports" className="quick-action-card">
            <div className="quick-action-card__icon stat-card__icon--yellow">
              <IconBarChart size={20} />
            </div>
            <div>
              <div className="quick-action-card__title">Inventory Flow Audit</div>
              <div className="quick-action-card__desc">Material balance &amp; movement logs</div>
            </div>
          </Link>
        </div>
      )}

      {/* Invoice Charts */}
      {customization.analyticsCharts && <AnalyticsCharts stats={stats} />}

      {/* Two-Column Accounts Section */}
      {showTwoCol && (
        <div className={`dashboard-two-col ${isSingleColInTwoCol ? 'dashboard-two-col--single' : ''}`}>
          {/* Left Column: Tax & Entity Compliance */}
          {customization.secondaryWidgets && (
            <div className="card">
              <h3 className="card-title card-title--bordered">GST Compliance &amp; Tax Breakdown</h3>

              <div className="info-list" style={{ gap: '14px' }}>
                <div className="info-item">
                  <span className="info-label">GST Registered Clients</span>
                  <span className="info-value fw-600 color-success">
                    {registeredGst} accounts ({unregistered} unregistered)
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Maharashtra State Base Code</span>
                  <span className="info-value text-mono">27 (Intra-State CGST + SGST applied on local shipments)</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Default GST Tax Rate</span>
                  <span className="info-value fw-600">18.0% Standard GST (with multi-rate breakdown support)</span>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: Billing Status of Recent Challans */}
          {customization.activityStream && (
            <div className="card">
              <div className="flex-between mb-12">
                <h3 className="card-title" style={{ margin: 0 }}>Recent Invoice Billing Queue</h3>
                <Link to="/challans" className="btn btn-ghost btn-sm color-primary">
                  All Challans →
                </Link>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Challan</th>
                      <th>Customer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.slice(0, 5).map((c) => (
                      <tr key={c.id}>
                        <td className="text-mono fw-700 color-primary">{c.challanNumber}</td>
                        <td>{c.customer?.businessName || c.customer?.name}</td>
                        <td>
                          <span className={`badge ${c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

