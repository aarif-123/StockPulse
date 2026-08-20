/**
 * Inventory Velocity & Stockout Risk Forecasting Module.
 *
 * Predicts days of inventory remaining based on recent outflow run-rates.
 */

export type StockHealthStatus = 'OUT_OF_STOCK' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'SURPLUS';

export interface VelocityAnalysis {
  dailyRunRate: number;
  daysRemaining: number | null; // null if no burn rate (infinite/zero movement)
  status: StockHealthStatus;
  statusLabel: string;
  badgeClass: string;
}

/**
 * Calculates days of stock remaining from current stock and recent outflow volume.
 *
 * @param currentStock Current available inventory units.
 * @param periodOutflow Total units shipped/consumed in the historical window.
 * @param daysInPeriod Historical window in days (default 7 days).
 */
export function calculateInventoryVelocity(
  currentStock: number,
  periodOutflow: number = 0,
  daysInPeriod: number = 7
): VelocityAnalysis {
  const stock = Math.max(0, currentStock);
  const outflow = Math.max(0, periodOutflow);
  const period = Math.max(1, daysInPeriod);

  if (stock === 0) {
    return {
      dailyRunRate: Number((outflow / period).toFixed(1)),
      daysRemaining: 0,
      status: 'OUT_OF_STOCK',
      statusLabel: 'Out of Stock',
      badgeClass: 'badge-danger',
    };
  }

  const dailyRunRate = outflow / period;

  if (dailyRunRate === 0) {
    return {
      dailyRunRate: 0,
      daysRemaining: null,
      status: 'SURPLUS',
      statusLabel: 'Low Velocity / Dormant',
      badgeClass: 'badge-info',
    };
  }

  const daysRemaining = Math.round(stock / dailyRunRate);

  if (daysRemaining <= 3) {
    return {
      dailyRunRate: Number(dailyRunRate.toFixed(1)),
      daysRemaining,
      status: 'CRITICAL',
      statusLabel: `🔴 Stockout in ~${daysRemaining}d`,
      badgeClass: 'badge-danger',
    };
  }

  if (daysRemaining <= 7) {
    return {
      dailyRunRate: Number(dailyRunRate.toFixed(1)),
      daysRemaining,
      status: 'WARNING',
      statusLabel: `🟡 Reorder in ~${daysRemaining}d`,
      badgeClass: 'badge-warning',
    };
  }

  return {
    dailyRunRate: Number(dailyRunRate.toFixed(1)),
    daysRemaining,
    status: 'HEALTHY',
    statusLabel: `🟢 ${daysRemaining}d Cover`,
    badgeClass: 'badge-success',
  };
}
