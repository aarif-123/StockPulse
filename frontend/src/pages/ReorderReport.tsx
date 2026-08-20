import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { Table, type TableColumn } from '../components/common/Table';
import { PurchaseOrderModal, type GeneratedPOData } from '../components/purchasing/PurchaseOrderModal';
import {
  IconShoppingCart, IconDownload, IconAlertTriangle,
  IconPackage, IconIndianRupee,
} from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';

interface ReorderItem extends Product {
  recommendedOrderQty: number;
  estimatedCost: number;
  urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  selected: boolean;
}

export const ReorderReport: React.FC = () => {
  const { hasRole } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canOrder = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE', 'ACCOUNTS']);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SHORT_ONLY'>('SHORT_ONLY');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generated PO Modal state
  const [generatedPO, setGeneratedPO] = useState<GeneratedPOData | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getProducts({ limit: 100 });
      setProducts(res.data);
      // Pre-select low stock items
      const initialSelected = new Set<string>();
      res.data.forEach((p) => {
        if (p.currentStock <= p.minimumStock) {
          initialSelected.add(p.id);
        }
      });
      setSelectedIds(initialSelected);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  // Compute reorder items
  const reorderList: ReorderItem[] = useMemo(() => {
    return products.map((p) => {
      const isZero = p.currentStock === 0;
      const isLow = p.currentStock <= p.minimumStock;
      const urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' = isZero ? 'CRITICAL' : isLow ? 'WARNING' : 'HEALTHY';

      // Recommended formula: target 2.5x minimum safety stock minus current on-hand
      const targetStock = Math.max(p.minimumStock * 2.5, p.minimumStock + 10);
      const recommendedOrderQty = Math.max(Math.ceil(targetStock - p.currentStock), 0);
      const estimatedCost = recommendedOrderQty * Number(p.unitPrice);

      return {
        ...p,
        recommendedOrderQty,
        estimatedCost,
        urgency,
        selected: selectedIds.has(p.id),
      };
    });
  }, [products, selectedIds]);

  const displayedList = useMemo(() => {
    if (filterMode === 'SHORT_ONLY') {
      return reorderList.filter((item) => item.urgency !== 'HEALTHY' || item.recommendedOrderQty > 0);
    }
    return reorderList;
  }, [reorderList, filterMode]);

  // Summary KPI Metrics
  const summary = useMemo(() => {
    const criticalCount = reorderList.filter((i) => i.urgency === 'CRITICAL').length;
    const warningCount = reorderList.filter((i) => i.urgency === 'WARNING').length;
    const selectedItems = reorderList.filter((i) => selectedIds.has(i.id));
    const selectedUnits = selectedItems.reduce((sum, i) => sum + i.recommendedOrderQty, 0);
    const selectedCapital = selectedItems.reduce((sum, i) => sum + i.estimatedCost, 0);

    return { criticalCount, warningCount, selectedCount: selectedItems.length, selectedUnits, selectedCapital };
  }, [reorderList, selectedIds]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === displayedList.length && displayedList.length > 0) {
      setSelectedIds(new Set());
    } else {
      const all = new Set<string>();
      displayedList.forEach((i) => all.add(i.id));
      setSelectedIds(all);
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGeneratePO = () => {
    const itemsToOrder = reorderList.filter((i) => selectedIds.has(i.id) && i.recommendedOrderQty > 0);
    if (itemsToOrder.length === 0) {
      toast.warning('Please select at least one item with a recommended order quantity.');
      return;
    }

    const poItems = itemsToOrder.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const total = item.recommendedOrderQty * unitPrice;
      return {
        product: item,
        orderQty: item.recommendedOrderQty,
        unitPrice,
        total,
      };
    });

    const subtotal = poItems.reduce((sum, item) => sum + item.total, 0);
    const gstAmount = subtotal * 0.18; // 18% standard GST
    const grandTotal = subtotal + gstAmount;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${new Date().getFullYear()}-${randomSuffix}`;

    setGeneratedPO({
      poNumber,
      createdAt: new Date().toISOString(),
      items: poItems,
      subtotal,
      gstAmount,
      grandTotal,
      supplierName: 'Primary Authorized Hardware & Component Vendors',
    });

    toast.success(`Purchase Order ${poNumber} generated successfully.`);
  };

  const handleExportCsv = () => {
    exportToCsv(
      `purchasing_reorder_report_${new Date().toISOString().slice(0, 10)}`,
      reorderList.map((i) => ({
        SKU: i.sku,
        'Product Name': i.name,
        Category: i.category,
        Location: i.warehouseLocation,
        'Current Stock': i.currentStock,
        'Minimum Safety Stock': i.minimumStock,
        'Recommended Order Qty': i.recommendedOrderQty,
        'Unit Price (INR)': i.unitPrice,
        'Estimated Procurement Cost': i.estimatedCost,
        Urgency: i.urgency,
      }))
    );
  };

  const columns: TableColumn<ReorderItem>[] = [
    {
      key: 'selected',
      header: 'Select',
      render: (item) => (
        <input
          type="checkbox"
          className="checkbox-input"
          checked={selectedIds.has(item.id)}
          onChange={() => handleToggleItem(item.id)}
          aria-label={`Select ${item.name}`}
        />
      ),
    },
    {
      key: 'name',
      header: 'Product / SKU',
      render: (item) => (
        <div>
          <div className="fw-700 color-primary">{item.name}</div>
          <div className="fs-12 text-mono color-tertiary">
            SKU: {item.sku} · Location: <span className="color-primary fw-600">{item.warehouseLocation}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <span className="badge badge-secondary">{item.category}</span>,
    },
    {
      key: 'currentStock',
      header: 'Stock Status',
      render: (item) => (
        <div>
          <div className="flex-between mb-4">
            <span className={`fw-700 fs-13 ${item.urgency === 'CRITICAL' ? 'color-danger' : item.urgency === 'WARNING' ? 'color-warning' : 'color-success'}`}>
              {item.currentStock} units
            </span>
            <span className="fs-11 color-tertiary">min: {item.minimumStock}</span>
          </div>
          <span className={`badge ${item.urgency === 'CRITICAL' ? 'badge-danger' : item.urgency === 'WARNING' ? 'badge-warning' : 'badge-success'}`}>
            {item.urgency === 'CRITICAL' ? 'Out of Stock' : item.urgency === 'WARNING' ? 'Low Stock' : 'Optimal'}
          </span>
        </div>
      ),
    },
    {
      key: 'recommendedOrderQty',
      header: 'Suggested Order',
      render: (item) => (
        <span className="fw-700 text-mono fs-14 color-primary">
          +{item.recommendedOrderQty} units
        </span>
      ),
    },
    {
      key: 'estimatedCost',
      header: 'Estimated Cost',
      className: 'text-mono',
      render: (item) => `₹${item.estimatedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title="Purchasing & Reorder Planning Hub"
        subtitle="Dynamic Min/Max replenishment engine — auto-calculate order requirements and generate vendor Purchase Orders."
        actions={
          <div className="flex-center gap-8">
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
              <IconDownload size={14} /> Export Report CSV
            </button>
            {canOrder && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleGeneratePO}
                disabled={summary.selectedCount === 0}
              >
                <IconShoppingCart size={14} /> Generate PO ({summary.selectedCount} Items)
              </button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Critical Stockouts (0 Stock)</span>
            <div className="stat-card__icon stat-card__icon--red">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: summary.criticalCount > 0 ? 'var(--danger)' : 'inherit' }}>
            {summary.criticalCount} SKUs
          </div>
          <div className="stat-card__footer">Immediate procurement required</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Below Minimum Buffer</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: summary.warningCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {summary.warningCount} SKUs
          </div>
          <div className="stat-card__footer">Nearing replenishment point</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Selected For Purchase</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconPackage size={18} />
            </div>
          </div>
          <div className="stat-card__value">{summary.selectedUnits} units</div>
          <div className="stat-card__footer">{summary.selectedCount} products selected</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Estimated PO Value</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconIndianRupee size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--success)' }}>
            ₹{summary.selectedCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-card__footer">+18% estimated GST on PO</div>
        </div>
      </div>

      {/* Filter Tabs & Selection Toggle */}
      <div className="flex-between mb-16 flex-wrap gap-10">
        <div className="status-tabs">
          <button
            type="button"
            className={`status-tab ${filterMode === 'SHORT_ONLY' ? 'status-tab--active' : ''}`}
            onClick={() => setFilterMode('SHORT_ONLY')}
          >
            <span>⚠️ Items Requiring Reorder</span>
            <span className="status-tab__badge">{summary.criticalCount + summary.warningCount}</span>
          </button>
          <button
            type="button"
            className={`status-tab ${filterMode === 'ALL' ? 'status-tab--active' : ''}`}
            onClick={() => setFilterMode('ALL')}
          >
            <span>All Catalog Products</span>
            <span className="status-tab__badge">{products.length}</span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleToggleSelectAll}
        >
          {selectedIds.size === displayedList.length && displayedList.length > 0 ? 'Deselect All' : 'Select All Filtered'}
        </button>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {loading ? (
        <LoadingSkeleton lines={5} />
      ) : (
        <div className="table-card">
          <Table
            columns={columns}
            data={displayedList}
            keyExtractor={(i) => i.id}
            emptyMessage="All items are currently at healthy inventory levels."
          />
        </div>
      )}

      {/* Modular Purchase Order Preview Modal */}
      <PurchaseOrderModal
        po={generatedPO}
        onClose={() => setGeneratedPO(null)}
        onConfirm={() => {
          setGeneratedPO(null);
          toast.success('PO confirmed and logged for procurement queue.');
        }}
      />
    </div>
  );
};

export default ReorderReport;
