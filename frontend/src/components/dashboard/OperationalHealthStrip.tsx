import React from 'react';
import type { DashboardStatsData } from '../../services/dashboard.service';
import type { Role } from '../../types';

interface OperationalHealthStripProps {
  stats: DashboardStatsData;
  role?: Role;
}

export const OperationalHealthStrip: React.FC<OperationalHealthStripProps> = ({ stats, role = 'ADMIN' }) => {
  // Stock health ratio
  const totalProds = Math.max(stats.products.total, 1);
  const healthyProds = Math.max(0, stats.products.total - stats.products.lowStockCount - stats.products.outOfStockCount);
  const stockHealthPct = Math.round((healthyProds / totalProds) * 100);

  // Delivery fulfillment ratio
  const totalChallans = Math.max(stats.challans.totalConfirmed + stats.challans.totalDraft + stats.challans.cancelledThisMonth, 1);
  const fulfillmentPct = Math.round((stats.challans.totalConfirmed / totalChallans) * 100);

  // Customer conversion ratio
  const totalCust = Math.max(stats.customers.total, 1);
  const activePct = Math.round((stats.customers.active / totalCust) * 100);

  // Daily movement burn rate
  const dailyInflow = (stats.stockMovements.inLast7Days / 7).toFixed(1);
  const dailyOutflow = (stats.stockMovements.outLast7Days / 7).toFixed(1);

  // Out of stock ratio for warehouse
  const outOfStockPct = Math.round((stats.products.outOfStockCount / totalProds) * 100);

  const isWarehouse = role === 'WAREHOUSE';
  const showAccounts = role === 'ADMIN' || role === 'SALES' || role === 'ACCOUNTS';

  return (
    <div className="card mb-20" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <div className="flex-between mb-12">
        <div className="flex-center gap-8">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
          <span className="fw-700 fs-13 color-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isWarehouse ? 'Warehouse Storage & Dispatch Efficiency Pulse' : 'Real-Time Operational Efficiency Pulse'}
          </span>
        </div>
        <span className="fs-12 color-tertiary">Live Business Health Index</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        {/* 1. Stock Safety Index */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div className="flex-between mb-4">
            <span className="fs-12 color-secondary">Catalog Health</span>
            <span className={`fw-700 fs-13 ${stockHealthPct >= 80 ? 'color-success' : 'color-warning'}`}>
              {stockHealthPct}%
            </span>
          </div>
          <div className="stock-meter-bg" style={{ height: '5px' }}>
            <div
              className="stock-meter-bar"
              style={{
                width: `${stockHealthPct}%`,
                background: stockHealthPct >= 80 ? 'var(--success)' : 'var(--warning)',
              }}
            />
          </div>
          <div className="fs-11 color-tertiary mt-4">
            {healthyProds} of {stats.products.total} SKUs optimal
          </div>
        </div>

        {/* 2. Warehouse: Out of Stock Priority OR Standard: Active Accounts */}
        {isWarehouse ? (
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div className="flex-between mb-4">
              <span className="fs-12 color-secondary">Replenishment Priority</span>
              <span className={`fw-700 fs-13 ${stats.products.outOfStockCount > 0 ? 'color-danger' : 'color-success'}`}>
                {stats.products.outOfStockCount} Out
              </span>
            </div>
            <div className="stock-meter-bg" style={{ height: '5px' }}>
              <div
                className="stock-meter-bar"
                style={{
                  width: `${Math.min(outOfStockPct * 5, 100)}%`,
                  background: stats.products.outOfStockCount > 0 ? 'var(--danger)' : 'var(--success)',
                }}
              />
            </div>
            <div className="fs-11 color-tertiary mt-4">
              {stats.products.lowStockCount} items below safety limit
            </div>
          </div>
        ) : showAccounts ? (
          <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div className="flex-between mb-4">
              <span className="fs-12 color-secondary">Active Accounts</span>
              <span className="fw-700 fs-13 color-success">
                {activePct}%
              </span>
            </div>
            <div className="stock-meter-bg" style={{ height: '5px' }}>
              <div
                className="stock-meter-bar"
                style={{
                  width: `${activePct}%`,
                  background: 'var(--success)',
                }}
              />
            </div>
            <div className="fs-11 color-tertiary mt-4">
              {stats.customers.active} active · {stats.customers.leads} leads
            </div>
          </div>
        ) : null}

        {/* 3. Fulfillment Rate */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div className="flex-between mb-4">
            <span className="fs-12 color-secondary">Dispatch Fulfillment</span>
            <span className="fw-700 fs-13 color-primary">
              {fulfillmentPct}%
            </span>
          </div>
          <div className="stock-meter-bg" style={{ height: '5px' }}>
            <div
              className="stock-meter-bar"
              style={{
                width: `${fulfillmentPct}%`,
                background: 'var(--primary)',
              }}
            />
          </div>
          <div className="fs-11 color-tertiary mt-4">
            {stats.challans.totalConfirmed} delivered · {stats.challans.totalDraft} draft
          </div>
        </div>

        {/* 4. Daily Velocity Pace */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div className="flex-between mb-4">
            <span className="fs-12 color-secondary">Daily Velocity</span>
            <span className="fw-700 fs-12 text-mono">
              <span className="color-success">+{dailyInflow}</span> / <span className="color-danger">-{dailyOutflow}</span>
            </span>
          </div>
          <div className="stock-meter-bg" style={{ height: '5px' }}>
            <div
              className="stock-meter-bar"
              style={{
                width: '65%',
                background: 'var(--info)',
              }}
            />
          </div>
          <div className="fs-11 color-tertiary mt-4">
            Average units movement / day
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalHealthStrip;
