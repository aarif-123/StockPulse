import React from 'react';
import type { DashboardStatsData } from '../../services/dashboard.service';

interface AnalyticsChartsProps {
  stats: DashboardStatsData;
}

/**
 * Pure SVG responsive charts — zero external dependencies.
 */
export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ stats }) => {
  const stockIn = stats.stockMovements.inLast7Days;
  const stockOut = stats.stockMovements.outLast7Days;
  const maxStock = Math.max(stockIn, stockOut, 10);

  const inBarHeight = (stockIn / maxStock) * 120;
  const outBarHeight = (stockOut / maxStock) * 120;

  // Donut calculations
  const totalChallans = stats.challans.totalDraft + stats.challans.totalConfirmed + stats.challans.cancelledThisMonth;
  const confirmedPct = totalChallans > 0 ? (stats.challans.totalConfirmed / totalChallans) * 100 : 0;
  const draftPct = totalChallans > 0 ? (stats.challans.totalDraft / totalChallans) * 100 : 0;
  const cancelledPct = totalChallans > 0 ? (stats.challans.cancelledThisMonth / totalChallans) * 100 : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const confirmedDash = (confirmedPct / 100) * circumference;
  const draftDash = (draftPct / 100) * circumference;
  const cancelledDash = (cancelledPct / 100) * circumference;
  const confirmedOffset = 0;
  const draftOffset = -confirmedDash;
  const cancelledOffset = -(confirmedDash + draftDash);

  const net = stockIn - stockOut;

  return (
    <div className="charts-grid">
      {/* Stock Flow Bar Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <span className="chart-card__title">Stock Flow (7 days)</span>
          <span className={`badge ${net >= 0 ? 'badge-success' : 'badge-danger'}`}>
            Net: {net >= 0 ? `+${net}` : net}
          </span>
        </div>
        <p className="fs-12 color-tertiary mb-16">
          Inbound replenishment vs outbound deliveries.
        </p>

        <div className="chart-card__body" style={{ gap: '48px', height: '160px', paddingBottom: '16px' }}>
          {/* IN bar */}
          <div className="flex-col" style={{ alignItems: 'center', gap: '6px' }}>
            <span className="fs-13 fw-700 color-success">+{stockIn}</span>
            <div style={{
              width: '36px',
              height: `${Math.max(inBarHeight, 8)}px`,
              backgroundColor: 'var(--success)',
              borderRadius: '6px 6px 0 0',
              transition: 'height 0.4s ease',
            }} />
            <span className="fs-12 fw-600 color-secondary">IN</span>
          </div>

          {/* OUT bar */}
          <div className="flex-col" style={{ alignItems: 'center', gap: '6px' }}>
            <span className="fs-13 fw-700 color-danger">-{stockOut}</span>
            <div style={{
              width: '36px',
              height: `${Math.max(outBarHeight, 8)}px`,
              backgroundColor: 'var(--danger)',
              borderRadius: '6px 6px 0 0',
              transition: 'height 0.4s ease',
            }} />
            <span className="fs-12 fw-600 color-secondary">OUT</span>
          </div>
        </div>
      </div>

      {/* Donut Chart */}
      <div className="chart-card">
        <div className="chart-card__header">
          <span className="chart-card__title">Challan Status</span>
          <span className="badge badge-info">{totalChallans} total</span>
        </div>
        <p className="fs-12 color-tertiary mb-16">
          Distribution across confirmed, draft, and cancelled.
        </p>

        <div className="flex-center gap-20" style={{ padding: '8px 0' }}>
          {/* SVG Donut */}
          <div style={{ position: 'relative', width: '110px', height: '110px' }}>
            <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="12" />
              {confirmedPct > 0 && (
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--success)" strokeWidth="12"
                  strokeDasharray={`${confirmedDash} ${circumference - confirmedDash}`}
                  strokeDashoffset={confirmedOffset} />
              )}
              {draftPct > 0 && (
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--warning)" strokeWidth="12"
                  strokeDasharray={`${draftDash} ${circumference - draftDash}`}
                  strokeDashoffset={draftOffset} />
              )}
              {cancelledPct > 0 && (
                <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--danger)" strokeWidth="12"
                  strokeDasharray={`${cancelledDash} ${circumference - cancelledDash}`}
                  strokeDashoffset={cancelledOffset} />
              )}
            </svg>
            <div className="flex-col flex-center" style={{ position: 'absolute', inset: 0 }}>
              <span className="fw-700" style={{ fontSize: '16px' }}>{Math.round(confirmedPct)}%</span>
              <span className="fs-12 color-tertiary" style={{ textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.04em' }}>
                Fulfilled
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-col gap-8 fs-12">
            <div className="flex-center gap-8">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />
              <span>Confirmed ({stats.challans.totalConfirmed})</span>
            </div>
            <div className="flex-center gap-8">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)', flexShrink: 0 }} />
              <span>Draft ({stats.challans.totalDraft})</span>
            </div>
            <div className="flex-center gap-8">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)', flexShrink: 0 }} />
              <span>Cancelled ({stats.challans.cancelledThisMonth})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
