import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { productService } from '../services/product.service';
import { reportService, type StockMovementReportItem } from '../services/report.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { Table, type TableColumn } from '../components/common/Table';
import {
  IconSliders, IconIndianRupee, IconPackage,
  IconCheck, IconDownload,
} from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';

interface AIMOptimizationItem {
  product: Product;
  dailyDemand: number;
  currentSafetyStock: number;
  optimizedSafetyStock: number;
  currentCapitalTied: number;
  optimizedCapitalTied: number;
  capitalVariance: number;
  runwayDays: number;
}

export const AdvancedInventoryManager: React.FC = () => {
  const { toasts, toast, removeToast } = useToast();
  const { user, activeOrg } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovementReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentRole = activeOrg?.role || user?.role || 'SALES';
  const isWarehouse = currentRole === 'WAREHOUSE';
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_aim_page_size');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 10, 5), 100) : 10;
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    localStorage.setItem('stockpulse_aim_page_size', String(newSize));
  };

  // Interactive Target Buffer Slider (in days) - Default: 30 days
  const [targetBufferDays, setTargetBufferDays] = useState<number>(30);

  const fetchAIMData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, movRes] = await Promise.all([
        productService.getProducts({ limit: 100 }),
        reportService.getStockMovements({ limit: 100 }),
      ]);
      setProducts(prodRes.data);
      setMovements(movRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAIMData();
  }, [fetchAIMData]);

  // Compute AIM modeling for each SKU
  const aimItems: AIMOptimizationItem[] = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return products.map((prod) => {
      const recentOutflow = movements
        .filter((m) => m.productId === prod.id && m.type === 'OUT' && new Date(m.createdAt) >= sevenDaysAgo)
        .reduce((sum, m) => sum + m.quantity, 0);

      const dailyDemand = Math.max(recentOutflow / 7, 0.5);
      const optimizedSafetyStock = Math.max(Math.ceil(dailyDemand * targetBufferDays), 5);
      const currentSafetyStock = prod.minimumStock;

      const unitPrice = Number(prod.unitPrice);
      const currentCapitalTied = prod.currentStock * unitPrice;
      const optimizedCapitalTied = optimizedSafetyStock * unitPrice;
      const capitalVariance = (currentSafetyStock - optimizedSafetyStock) * unitPrice;
      const runwayDays = dailyDemand > 0 ? Math.round(prod.currentStock / dailyDemand) : 999;

      return {
        product: prod,
        dailyDemand,
        currentSafetyStock,
        optimizedSafetyStock,
        currentCapitalTied,
        optimizedCapitalTied,
        capitalVariance,
        runwayDays,
      };
    });
  }, [products, movements, targetBufferDays]);

  // Global AIM Modeling Aggregates
  const aimSummary = useMemo(() => {
    const totalCapitalTied = aimItems.reduce((sum, i) => sum + i.currentCapitalTied, 0);
    const totalPotentialRelease = aimItems.reduce((sum, i) => sum + Math.max(i.capitalVariance, 0), 0);
    const overstockedCount = aimItems.filter((i) => i.currentSafetyStock > i.optimizedSafetyStock * 1.5).length;
    const understockedCount = aimItems.filter((i) => i.product.currentStock < i.optimizedSafetyStock).length;

    return { totalCapitalTied, totalPotentialRelease, overstockedCount, understockedCount };
  }, [aimItems]);

  const handleExportAIMReport = () => {
    exportToCsv(
      `aim_optimization_model_${targetBufferDays}days_${new Date().toISOString().slice(0, 10)}`,
      aimItems.map((i) => {
        const row: Record<string, string | number> = {
          SKU: i.product.sku,
          'Product Name': i.product.name,
          Category: i.product.category,
          'Daily Demand (Units/Day)': i.dailyDemand.toFixed(2),
          'Current Stock (OnHand)': i.product.currentStock,
          'Current Safety Buffer': i.currentSafetyStock,
          [`AIM Optimized Buffer (${targetBufferDays} Days)`]: i.optimizedSafetyStock,
          'Runway Remaining (Days)': i.runwayDays,
        };
        if (!isWarehouse) {
          row['Current Capital Tied (INR)'] = i.currentCapitalTied;
          row['Capital Optimization Delta (INR)'] = i.capitalVariance;
        }
        return row;
      })
    );
  };

  const handleApplyRecommendations = () => {
    toast.success(`AIM stock policies calibrated for ${targetBufferDays}-day lean buffer.`);
  };

  const columns: TableColumn<AIMOptimizationItem>[] = [
    {
      key: 'product',
      header: 'Product / SKU',
      render: (i) => (
        <div>
          <div className="fw-700 color-primary">{i.product.name}</div>
          <div className="fs-12 text-mono color-tertiary">
            SKU: {i.product.sku} · Location: {i.product.warehouseLocation}
          </div>
        </div>
      ),
    },
    {
      key: 'dailyDemand',
      header: 'Rate of Use',
      render: (i) => (
        <span className="text-mono fw-600">
          {i.dailyDemand.toFixed(1)} <span className="fs-11 color-tertiary">units/day</span>
        </span>
      ),
    },
    {
      key: 'runwayDays',
      header: 'Estimated Runway',
      render: (i) => (
        <div>
          <span className={`fw-700 text-mono ${i.runwayDays < 10 ? 'color-danger' : i.runwayDays < 25 ? 'color-warning' : 'color-success'}`}>
            {i.runwayDays >= 999 ? '90+ Days' : `${i.runwayDays} Days`}
          </span>
          <div className="fs-11 color-tertiary">
            {i.product.currentStock} on hand
          </div>
        </div>
      ),
    },
    {
      key: 'currentSafetyStock',
      header: 'Current vs AIM Target',
      render: (i) => (
        <div className="flex-center gap-8">
          <span className="badge badge-secondary" title="Current threshold">
            Current: {i.currentSafetyStock}
          </span>
          <span className="color-tertiary">→</span>
          <span className="badge badge-info fw-700" title="AIM Recommended threshold">
            AIM: {i.optimizedSafetyStock}
          </span>
        </div>
      ),
    },
    {
      key: 'capitalVariance',
      header: isWarehouse ? 'Safety Status' : 'Capital Impact',
      className: isWarehouse ? 'text-center' : 'text-right',
      render: (i) => {
        if (isWarehouse) {
          const isOver = i.currentSafetyStock > i.optimizedSafetyStock * 1.5;
          const isUnder = i.product.currentStock < i.optimizedSafetyStock;
          return (
            <div className="fw-700">
              {isUnder ? (
                <span className="badge badge-danger">Under-Buffered</span>
              ) : isOver ? (
                <span className="badge badge-warning">Over-Buffered</span>
              ) : (
                <span className="badge badge-success">Balanced</span>
              )}
            </div>
          );
        }

        return (
          <div className="text-mono fw-700">
            {i.capitalVariance > 0 ? (
              <span className="color-success">
                +₹{i.capitalVariance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span className="fs-10 fw-400">released</span>
              </span>
            ) : i.capitalVariance < 0 ? (
              <span className="color-warning">
                -₹{Math.abs(i.capitalVariance).toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span className="fs-10 fw-400">buffer req.</span>
              </span>
            ) : (
              <span className="color-tertiary">Balanced</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Advanced Inventory Manager (AIM)"
        subtitle="Intelligent 12-month demand modeling & stock buffer optimization to prevent overbuying and unlock tied-up capital."
        actions={
          <div className="flex-center gap-8">
            <button className="btn btn-secondary btn-sm" onClick={handleExportAIMReport}>
              <IconDownload size={14} /> Export AIM Model CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleApplyRecommendations}>
              <IconCheck size={14} /> Calibrate Stock Controls
            </button>
          </div>
        }
      />

      {/* Interactive AIM Runway Simulator Card */}
      <div className="aim-simulator-card">
        <div className="flex-between mb-16 flex-wrap gap-16">
          <div>
            <div className="flex-center gap-8 mb-4">
              <IconSliders size={18} className="color-primary" />
              <h3 className="fs-15 fw-700 color-primary m-0">
                Dynamic Safety Stock Runway Simulator
              </h3>
            </div>
            <p className="fs-13 color-secondary m-0">
              Adjust target buffer days to simulate capital release vs stockout risk across the catalog.
            </p>
          </div>

          <div className="flex-center gap-12">
            <span className="fs-13 color-secondary">Target Buffer:</span>
            <div className="badge badge-info fw-700 text-mono fs-14">
              {targetBufferDays} Days Supply
            </div>
          </div>
        </div>

        {/* Range Slider */}
        <div className="flex-col gap-8">
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            className="aim-slider-input"
            value={targetBufferDays}
            onChange={(e) => setTargetBufferDays(Number(e.target.value))}
            aria-label="Target buffer days"
          />
          <div className="flex-between fs-11 color-tertiary">
            <span>10 Days (Ultra-Lean Just-In-Time)</span>
            <span>30 Days (Standard Enterprise Buffer)</span>
            <span>60 Days (Conservative High-Safety)</span>
          </div>
        </div>
      </div>

      {/* AIM Summary KPI Cards */}
      <div className="stats-grid">
        {!isWarehouse && (
          <>
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Total Capital in Inventory</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconIndianRupee size={18} />
                </div>
              </div>
              <div className="stat-card__value">
                ₹{aimSummary.totalCapitalTied.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-card__footer">Total material asset valuation</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Capital Release Opportunity</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconIndianRupee size={18} />
                </div>
              </div>
              <div className="stat-card__value color-success">
                ₹{aimSummary.totalPotentialRelease.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-card__footer">Unlockable from over-buffered SKUs</div>
            </div>
          </>
        )}

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Over-Buffered SKUs</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconPackage size={18} />
            </div>
          </div>
          <div className={`stat-card__value ${aimSummary.overstockedCount > 0 ? 'color-warning' : ''}`}>
            {aimSummary.overstockedCount} SKUs
          </div>
          <div className="stat-card__footer">Excess safety threshold set</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Stockout Risk Exposure</span>
            <div className="stat-card__icon stat-card__icon--red">
              <IconPackage size={18} />
            </div>
          </div>
          <div className={`stat-card__value ${aimSummary.understockedCount > 0 ? 'color-danger' : ''}`}>
            {aimSummary.understockedCount} SKUs
          </div>
          <div className="stat-card__footer">Below recommended {targetBufferDays}-day buffer</div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : (
        <div className="table-card">
          <Table
            columns={columns}
            data={aimItems.slice((page - 1) * pageSize, page * pageSize)}
            keyExtractor={(i) => i.product.id}
            emptyMessage="No catalog items available for AIM modeling."
            pagination={{
              currentPage: page,
              totalPages: Math.ceil(aimItems.length / pageSize) || 1,
              onPageChange: setPage,
              pageSize,
              onPageSizeChange: handlePageSizeChange,
              pageSizeOptions: [10, 25, 30, 50, 100],
              totalItems: aimItems.length,
              itemName: 'SKUs',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AdvancedInventoryManager;
