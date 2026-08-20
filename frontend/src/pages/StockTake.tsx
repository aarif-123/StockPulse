import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import {
  IconClipboardCheck, IconDownload, IconCheck, IconAlertTriangle,
  IconSearch, IconRefresh,
} from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';

interface StockTakeItem {
  product: Product;
  countedQty: number | '';
  isCounted: boolean;
  varianceQty: number;
  varianceValue: number;
}

export const StockTake: React.FC = () => {
  const { hasRole } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canReconcile = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [scanSkuInput, setScanSkuInput] = useState<string>('');
  const [countsMap, setCountsMap] = useState<Record<string, number | ''>>({});
  const [reconciling, setReconciling] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts({ limit: 100 });
      setProducts(res.data);
      const initialCounts: Record<string, number | ''> = {};
      res.data.forEach((p) => {
        initialCounts[p.id] = p.currentStock;
      });
      setCountsMap(initialCounts);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const zones = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.warehouseLocation) {
        const zone = p.warehouseLocation.split('-')[0] + '-' + (p.warehouseLocation.split('-')[1] || '');
        set.add(zone.replace(/-$/, ''));
      }
    });
    return Array.from(set).sort();
  }, [products]);

  const stockTakeRows: StockTakeItem[] = useMemo(() => {
    return products.map((p) => {
      const counted = countsMap[p.id];
      const hasCount = counted !== undefined && counted !== '';
      const physical = hasCount ? Number(counted) : p.currentStock;
      const varianceQty = physical - p.currentStock;
      const varianceValue = varianceQty * Number(p.unitPrice);

      return {
        product: p,
        countedQty: counted !== undefined ? counted : '',
        isCounted: hasCount,
        varianceQty,
        varianceValue,
      };
    });
  }, [products, countsMap]);

  const filteredRows = useMemo(() => {
    if (selectedZone === 'ALL') return stockTakeRows;
    return stockTakeRows.filter((r) => r.product.warehouseLocation?.startsWith(selectedZone));
  }, [stockTakeRows, selectedZone]);

  const auditSummary = useMemo(() => {
    const itemsWithVariance = stockTakeRows.filter((r) => r.varianceQty !== 0);
    const totalVarianceUnits = itemsWithVariance.reduce((sum, r) => sum + r.varianceQty, 0);
    const netVarianceINR = itemsWithVariance.reduce((sum, r) => sum + r.varianceValue, 0);
    const accuracyRate = stockTakeRows.length > 0
      ? Math.round(((stockTakeRows.length - itemsWithVariance.length) / stockTakeRows.length) * 100)
      : 100;

    return {
      discrepancyCount: itemsWithVariance.length,
      totalVarianceUnits,
      netVarianceINR,
      accuracyRate,
    };
  }, [stockTakeRows]);

  const handleCountChange = (productId: string, val: string) => {
    if (val === '') {
      setCountsMap((prev) => ({ ...prev, [productId]: '' }));
      return;
    }
    const parsed = parseInt(val, 10);
    setCountsMap((prev) => ({
      ...prev,
      [productId]: isNaN(parsed) ? '' : Math.max(parsed, 0),
    }));
  };

  const handleQuickIncrement = (productId: string) => {
    setCountsMap((prev) => {
      const current = typeof prev[productId] === 'number' ? (prev[productId] as number) : 0;
      return { ...prev, [productId]: current + 1 };
    });
  };

  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanSkuInput.trim().toUpperCase();
    if (!query) return;

    const matched = products.find((p) => p.sku.toUpperCase() === query || p.name.toUpperCase().includes(query));
    if (matched) {
      handleQuickIncrement(matched.id);
      toast.success(`+1 Count tallied for ${matched.name} (${matched.sku})`);
      setScanSkuInput('');
    } else {
      toast.error(`SKU or Barcode "${query}" not found in catalog.`);
    }
  };

  const handleReconcileDiscrepancies = async () => {
    const itemsToReconcile = stockTakeRows.filter((r) => r.varianceQty !== 0);
    if (itemsToReconcile.length === 0) {
      toast.success('No discrepancies found. Inventory is 100% accurate!');
      return;
    }

    setReconciling(true);
    let successCount = 0;
    try {
      for (const item of itemsToReconcile) {
        const qtyDiff = Math.abs(item.varianceQty);
        const type = item.varianceQty > 0 ? 'IN' : 'OUT';
        await productService.createStockMovement(item.product.id, {
          type,
          quantity: qtyDiff,
          reason: `Physical cycle count audit reconciliation: Variance ${item.varianceQty > 0 ? `+${qtyDiff}` : `-${qtyDiff}`} units`,
        });
        successCount++;
      }
      toast.success(`Successfully reconciled ${successCount} inventory discrepancies into stock movement logs.`);
      void fetchCatalog();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setReconciling(false);
    }
  };

  const handleExportStockTakeCSV = () => {
    exportToCsv(
      `physical_stock_take_audit_${new Date().toISOString().slice(0, 10)}`,
      stockTakeRows.map((r) => ({
        SKU: r.product.sku,
        'Product Name': r.product.name,
        Location: r.product.warehouseLocation,
        'System Stock': r.product.currentStock,
        'Physical Count': r.countedQty,
        'Variance Units': r.varianceQty,
        'Variance Impact (INR)': r.varianceValue,
        Status: r.varianceQty === 0 ? 'Matched' : r.varianceQty > 0 ? 'Surplus' : 'Deficit',
      }))
    );
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Stock Taking & Cycle Counting Audit"
        subtitle="Physical inventory verification tool — scan barcodes, detect system vs physical discrepancies, and reconcile inventory."
        actions={
          <div className="flex-center gap-8">
            <button className="btn btn-secondary btn-sm" onClick={handleExportStockTakeCSV}>
              <IconDownload size={14} /> Export Audit Sheet CSV
            </button>
            {canReconcile && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleReconcileDiscrepancies}
                disabled={reconciling || auditSummary.discrepancyCount === 0}
              >
                <IconCheck size={14} />
                {reconciling ? 'Reconciling...' : `Reconcile Variances (${auditSummary.discrepancyCount} SKUs)`}
              </button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Inventory Accuracy Rate</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconClipboardCheck size={18} />
            </div>
          </div>
          <div className={`stat-card__value ${auditSummary.accuracyRate >= 90 ? 'color-success' : 'color-warning'}`}>
            {auditSummary.accuracyRate}%
          </div>
          <div className="stat-card__footer">Physical count match ratio</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Discrepancy Items</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className={`stat-card__value ${auditSummary.discrepancyCount > 0 ? 'color-warning' : ''}`}>
            {auditSummary.discrepancyCount} SKUs
          </div>
          <div className="stat-card__footer">Items requiring reconciliation</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Net Unit Variance</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconRefresh size={18} />
            </div>
          </div>
          <div className="stat-card__value text-mono">
            {auditSummary.totalVarianceUnits > 0 ? `+${auditSummary.totalVarianceUnits}` : auditSummary.totalVarianceUnits} units
          </div>
          <div className="stat-card__footer">Net surplus / deficit balance</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Financial Variance Impact</span>
            <div className="stat-card__icon stat-card__icon--purple">
              <IconClipboardCheck size={18} />
            </div>
          </div>
          <div className="stat-card__value text-mono">
            ₹{Math.abs(auditSummary.netVarianceINR).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-card__footer">Discrepancy asset impact</div>
        </div>
      </div>

      {/* Barcode Scanner / SKU Rapid Tally Input */}
      <div className="stock-take-scan-card">
        <form onSubmit={handleBarcodeScanSubmit} className="flex-between flex-wrap gap-12">
          <div className="flex-center gap-10 flex-1">
            <IconSearch size={18} className="color-primary" />
            <input
              className="form-input flex-1"
              type="text"
              placeholder="Scan Barcode or type SKU (e.g. LOG-MX3S-001) and press Enter to tally +1..."
              value={scanSkuInput}
              onChange={(e) => setScanSkuInput(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            + Tally Scan
          </button>
        </form>
      </div>

      {/* Zone Selector Tabs */}
      <div className="flex-between mb-16 flex-wrap gap-10">
        <div className="status-tabs">
          <button
            type="button"
            className={`status-tab ${selectedZone === 'ALL' ? 'status-tab--active' : ''}`}
            onClick={() => setSelectedZone('ALL')}
          >
            <span>All Warehouse Locations</span>
            <span className="status-tab__badge">{products.length}</span>
          </button>
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              className={`status-tab ${selectedZone === zone ? 'status-tab--active' : ''}`}
              onClick={() => setSelectedZone(zone)}
            >
              <span>{zone} Zone</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : (
        <div className="table-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Bin Location</th>
                  <th className="text-right">System Stock</th>
                  <th className="text-right">Physical Count</th>
                  <th className="text-right">Variance</th>
                  <th className="text-right">Impact (INR)</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.product.id} className={r.varianceQty !== 0 ? 'bg-warning-subtle' : ''}>
                    <td>
                      <div className="fw-700 color-primary">{r.product.name}</div>
                      <div className="fs-12 text-mono color-tertiary">SKU: {r.product.sku}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary text-mono">{r.product.warehouseLocation}</span>
                    </td>
                    <td className="text-right fw-700 text-mono">{r.product.currentStock}</td>
                    <td className="text-right">
                      <input
                        type="number"
                        min="0"
                        className="form-input stock-take-qty-input"
                        value={r.countedQty}
                        onChange={(e) => handleCountChange(r.product.id, e.target.value)}
                        aria-label={`Count for ${r.product.name}`}
                      />
                    </td>
                    <td className="text-right">
                      <span className={`badge ${r.varianceQty === 0 ? 'badge-success' : r.varianceQty > 0 ? 'badge-info' : 'badge-danger'}`}>
                        {r.varianceQty === 0 ? '✓ Match' : r.varianceQty > 0 ? `+${r.varianceQty} Surplus` : `${r.varianceQty} Deficit`}
                      </span>
                    </td>
                    <td className="text-right text-mono fw-600">
                      {r.varianceValue !== 0 ? (
                        <span className={r.varianceValue > 0 ? 'color-info' : 'color-danger'}>
                          {r.varianceValue > 0 ? `+₹${r.varianceValue.toFixed(0)}` : `-₹${Math.abs(r.varianceValue).toFixed(0)}`}
                        </span>
                      ) : (
                        <span className="color-tertiary">₹0</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleQuickIncrement(r.product.id)}
                        title="Quick +1 Count"
                      >
                        +1 Tally
                      </button>
                    </td>
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

export default StockTake;
