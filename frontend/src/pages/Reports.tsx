import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { reportService, type StockMovementReportItem, type ReportsAnalyticsData } from '../services/report.service';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { Table, type TableColumn } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { PageHeader } from '../components/common/PageHeader';
import { IconDownload, IconBarChart, IconPackage } from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';
import { useAuth } from '../hooks/useAuth';

const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const Reports: React.FC = () => {
  const { user } = useAuth();
  const isWarehouse = user?.role === 'WAREHOUSE';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'velocity' | 'categories' | 'audit'>('analytics');
  const [timeRange, setTimeRange] = useState<'7d' | '15d' | '30d' | '90d' | '365d'>('30d');

  // Audit Logs state
  const [movements, setMovements] = useState<StockMovementReportItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [errorAudit, setErrorAudit] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState<'' | 'IN' | 'OUT'>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_reports_page_size');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 20, 5), 100) : 20;
  });

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    localStorage.setItem('stockpulse_reports_page_size', String(newSize));
  };

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<ReportsAnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [errorAnalytics, setErrorAnalytics] = useState<string | null>(null);

  // Load catalog products for dropdown filter
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await productService.getProducts({ limit: 100 });
        setProducts(res.data);
      } catch {
        // Graceful fallback
      }
    }
    void loadProducts();
  }, []);

  // Fetch Audit movements
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    setErrorAudit(null);
    try {
      const res = await reportService.getStockMovements({
        search: search.trim() || undefined,
        productId: productId || undefined,
        type: movementType || undefined,
        page,
        limit: pageSize,
      });
      setMovements(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
        setTotalItems(res.pagination.total);
      }
    } catch (err) {
      setErrorAudit(handleApiError(err));
    } finally {
      setLoadingAudit(false);
    }
  }, [search, productId, movementType, page, pageSize]);

  // Fetch Analytics summary
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setErrorAnalytics(null);
    try {
      const res = await reportService.getAnalytics(timeRange);
      setAnalyticsData(res.data);
    } catch (err) {
      setErrorAnalytics(handleApiError(err));
    } finally {
      setLoadingAnalytics(false);
    }
  }, [timeRange]);

  // Fetch based on active tab
  useEffect(() => {
    if (activeTab === 'audit') {
      void fetchAuditLogs();
    } else {
      void fetchAnalytics();
    }
  }, [activeTab, fetchAuditLogs, fetchAnalytics]);

  const handleExportCsv = () => {
    exportToCsv(
      `stock_movements_audit_${new Date().toISOString().slice(0, 10)}`,
      movements.map((m) => ({
        Date: new Date(m.createdAt).toLocaleString('en-IN'),
        'Product SKU': m.product?.sku ?? '—',
        'Product Name': m.product?.name ?? '—',
        Category: m.product?.category ?? '—',
        Type: m.type,
        Quantity: m.quantity,
        Reason: m.reason,
        'Recorded By': m.user?.name ?? '—',
        Role: m.user?.role ?? '—',
      }))
    );
  };

  const auditColumns: TableColumn<StockMovementReportItem>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      className: 'text-mono',
      render: (m) => (
        <div>
          <div className="fw-600 color-primary">
            {new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="fs-11 color-tertiary">
            {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product / SKU',
      render: (m) => (
        <div>
          <div className="fw-700 color-primary">{m.product?.name ?? '—'}</div>
          <div className="fs-12 text-mono color-tertiary">
            SKU: {m.product?.sku ?? '—'} · {m.product?.category ?? '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Movement',
      render: (m) => (
        <span className={`badge ${m.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
          {m.type === 'IN' ? '↓ Stock IN' : '↑ Stock OUT'}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Units',
      render: (m) => (
        <span className={`fw-700 text-mono fs-13 ${m.type === 'IN' ? 'color-success' : 'color-danger'}`}>
          {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Log Reason',
      render: (m) => (
        <span className="fs-12 color-secondary">{m.reason || 'General inventory adjustment'}</span>
      ),
    },
    {
      key: 'user',
      header: 'Recorded By',
      render: (m) => (
        <div className="flex-center gap-6">
          <div className="customer-avatar" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
            {(m.user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="fs-12 fw-600">{m.user?.name ?? 'System'}</div>
            <div className="fs-10 color-tertiary text-mono" style={{ textTransform: 'uppercase' }}>
              {m.user?.role ?? 'AUTO'}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const showRange = movements.length > 0
    ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`
    : '';

  // Max value calculation for Volume Trend Chart
  const maxTrendVal = useMemo(() => {
    if (!analyticsData) return 10;
    const values = analyticsData.stockMovementTrend.map((t) => Math.max(t.stockIn, t.stockOut));
    return Math.max(...values, 10);
  }, [analyticsData]);

  return (
    <div>
      <PageHeader
        title="Enterprise Inventory Intelligence & Reports"
        subtitle="Scalable analytics, working capital locks, ABC Pareto classifications, and immutable stock audit logs."
        actions={
          activeTab === 'audit' && movements.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} id="export-reports-btn">
              <IconDownload size={14} /> Export Audit Log CSV
            </button>
          )
        }
      />

      {/* Navigation and Range Selector Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Navigation Tabs */}
        <div className="status-tabs" style={{ margin: 0 }}>
          <button
            className={`status-tab ${activeTab === 'analytics' ? 'status-tab--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <IconBarChart size={15} /> Valuation & Capital
          </button>
          <button
            className={`status-tab ${activeTab === 'velocity' ? 'status-tab--active' : ''}`}
            onClick={() => setActiveTab('velocity')}
          >
            ⚡ Velocity & Dead Stock
          </button>
          <button
            className={`status-tab ${activeTab === 'categories' ? 'status-tab--active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            📦 Categories & Margins
          </button>
          <button
            className={`status-tab ${activeTab === 'audit' ? 'status-tab--active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Stock Audit Trail
          </button>
        </div>

        {/* Time Window Range Toggle */}
        {activeTab !== 'audit' && (
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              gap: '2px',
            }}
          >
            {(
              [
                { id: '7d', label: '7D' },
                { id: '15d', label: '15D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D (Quarter)' },
                { id: '365d', label: '1Y (Annual)' },
              ] as const
            ).map((r) => {
              const isSelected = timeRange === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? '#000' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 1. EXECUTIVE VALUATION & ABC TAB ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <>
          {loadingAnalytics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="stats-grid">
                <div className="stat-card" style={{ height: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
                <div className="stat-card" style={{ height: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
                <div className="stat-card" style={{ height: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
                <div className="stat-card" style={{ height: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ) : errorAnalytics ? (
            <div className="alert alert-danger mb-16">{errorAnalytics}</div>
          ) : analyticsData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Executive KPI Cards */}
              <div className="stats-grid">
                {!isWarehouse && (
                  <>
                    <div className="stat-card">
                      <div className="stat-card__header">
                        <span className="stat-card__label">Retail Inventory Valuation</span>
                        <div className="stat-card__icon stat-card__icon--blue">
                          <IconBarChart size={18} />
                        </div>
                      </div>
                      <div className="stat-card__value">{formatINR(analyticsData.totalValuation)}</div>
                      <div className="stat-card__footer">Total selling value across {analyticsData.totalUnits.toLocaleString()} units</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card__header">
                        <span className="stat-card__label">Locked Purchase Capital</span>
                        <div className="stat-card__icon stat-card__icon--purple">
                          <IconBarChart size={18} />
                        </div>
                      </div>
                      <div className="stat-card__value">{formatINR(analyticsData.totalCostValuation)}</div>
                      <div className="stat-card__footer">Purchase cost basis in warehouse</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card__header">
                        <span className="stat-card__label">Unrealized Gross Margin</span>
                        <div className="stat-card__icon stat-card__icon--green">
                          <IconBarChart size={18} />
                        </div>
                      </div>
                      <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                        {analyticsData.grossMarginPercent}%
                      </div>
                      <div className="stat-card__footer">
                        Est. profit: {formatINR(analyticsData.totalValuation - analyticsData.totalCostValuation)}
                      </div>
                    </div>
                  </>
                )}

                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Catalog Health</span>
                    <div className="stat-card__icon stat-card__icon--orange">
                      <IconPackage size={18} />
                    </div>
                  </div>
                  <div className="stat-card__value">{analyticsData.activeSkusCount} <span style={{ fontSize: '14px', color: 'var(--text-tertiary)', fontWeight: 500 }}>/ {analyticsData.totalSkus} SKUs</span></div>
                  <div className="stat-card__footer">
                    <span style={{ color: analyticsData.outOfStockCount > 0 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                      {analyticsData.outOfStockCount} zero stock
                    </span> · {analyticsData.lowStockCount} low threshold
                  </div>
                </div>
              </div>

              {/* ABC Inventory Pareto Analysis Section */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      🏆 ABC Inventory Pareto Analysis (80 / 15 / 5 Rule)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Strategic classification prioritizing working capital control on high-value revenue drivers.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {/* Class A */}
                  <div
                    style={{
                      background: 'rgba(34, 197, 94, 0.06)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ● CLASS A — CRITICAL VALUE
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>
                        {analyticsData.abcAnalysis.classA.percentage}% Capital
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(analyticsData.abcAnalysis.classA.capitalValue)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {analyticsData.abcAnalysis.classA.skuCount} High-value SKUs (Tight cycle counts)
                    </div>
                  </div>

                  {/* Class B */}
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.06)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ● CLASS B — MODERATE VALUE
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                        {analyticsData.abcAnalysis.classB.percentage}% Capital
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(analyticsData.abcAnalysis.classB.capitalValue)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {analyticsData.abcAnalysis.classB.skuCount} Intermediate SKUs (Standard safety stock)
                    </div>
                  </div>

                  {/* Class C */}
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ● CLASS C — BULK / LOW COST
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                        {analyticsData.abcAnalysis.classC.percentage}% Capital
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(analyticsData.abcAnalysis.classC.capitalValue)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {analyticsData.abcAnalysis.classC.skuCount} Bulk SKUs (Automated bulk replenishment)
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement Volume Trend */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Inbound Receipts vs Outbound Client Dispatches
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Daily stock volume changes over the selected {timeRange.toUpperCase()} window
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--success)', borderRadius: '2px' }} />
                      <span className="color-secondary">Restock IN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: 'var(--danger)', borderRadius: '2px' }} />
                      <span className="color-secondary">Dispatch OUT</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    height: '180px',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border-color)',
                    overflowX: 'auto',
                  }}
                >
                  {analyticsData.stockMovementTrend.map((t) => {
                    const inPct = Math.round((t.stockIn / maxTrendVal) * 100);
                    const outPct = Math.round((t.stockOut / maxTrendVal) * 100);
                    return (
                      <div
                        key={t.date}
                        style={{
                          flex: 1,
                          minWidth: '28px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', height: '100%', justifyContent: 'center' }}>
                          <div
                            style={{
                              width: '45%',
                              height: `${Math.max(inPct, 2)}%`,
                              backgroundColor: 'var(--success)',
                              borderRadius: '2px 2px 0 0',
                              transition: 'height 0.2s ease',
                            }}
                            title={`IN: ${t.stockIn} units`}
                          />
                          <div
                            style={{
                              width: '45%',
                              height: `${Math.max(outPct, 2)}%`,
                              backgroundColor: 'var(--danger)',
                              borderRadius: '2px 2px 0 0',
                              transition: 'height 0.2s ease',
                            }}
                            title={`OUT: ${t.stockOut} units`}
                          />
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px', textAlign: 'center' }}>
                          {t.date}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* ── 2. VELOCITY & DEAD STOCK TAB ────────────────────────────────────── */}
      {activeTab === 'velocity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loadingAnalytics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading inventory velocity telemetry...</div>
          ) : analyticsData ? (
            <>
              {/* Dead Stock Capital Alert Banner */}
              {analyticsData.totalDeadStockCapital > 0 && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>⚠️</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#f87171' }}>
                        Trapped Working Capital in Slow-Moving / Dead Stock
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatINR(analyticsData.totalDeadStockCapital)} locked in SKUs with zero movement in the last 45+ days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* Fast-Moving Leaders */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ⚡ Top Fast-Moving Leaders
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Highest outbound dispatch demand in the selected window
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analyticsData.topMovingProducts.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                        No outbound movements recorded in this period.
                      </div>
                    ) : (
                      analyticsData.topMovingProducts.map((p, idx) => (
                        <div
                          key={p.productId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-tertiary)', width: '20px' }}>
                              #{idx + 1}
                            </span>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.productName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                                SKU: {p.sku} · {p.category}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                              {p.totalQty.toLocaleString()} units out
                            </div>
                            <div style={{ fontSize: '11px', color: p.estimatedRunwayDays <= 15 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              Stock: {p.currentStock} ({p.estimatedRunwayDays > 100 ? '>90d' : `${p.estimatedRunwayDays}d`} runway)
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dead Stock / Capital Lock List */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🧊 Dead Stock & Inactive SKUs
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Capital locked in positive-stock products with zero recent velocity
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analyticsData.deadStockProducts.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#22c55e', fontSize: '13px' }}>
                        ✓ Excellent inventory health! No dead stock detected.
                      </div>
                    ) : (
                      analyticsData.deadStockProducts.map((p) => (
                        <div
                          key={p.productId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.productName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              SKU: {p.sku} · {p.currentStock} units idle
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f87171' }}>
                              {formatINR(p.lockedCost)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {p.daysWithoutMovement >= 90 ? '90+ days idle' : `${p.daysWithoutMovement} days idle`}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── 3. CATEGORIES & MARGINS TAB ─────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Category Working Capital & Margin Allocation
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Portfolio distribution of purchase cost, retail value, and profit margins by product family.
              </p>
            </div>
          </div>

          {loadingAnalytics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading category telemetry...</div>
          ) : analyticsData ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Product Category</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>SKUs</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total Units</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Purchase Cost Lock</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Retail Valuation</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gross Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.valuationByCategory.map((c) => (
                    <tr key={c.category} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.category}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {c.skuCount}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {c.totalUnits.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {formatINR(c.totalCostValue)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatINR(c.totalValue)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: c.marginPercent >= 25 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: c.marginPercent >= 25 ? '#4ade80' : '#f59e0b',
                          }}
                        >
                          {c.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* ── 4. IMMUTABLE AUDIT TRAIL TAB ────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div
            className="card"
            style={{
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ width: '100%', paddingLeft: '32px' }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>
                🔍
              </span>
            </div>

            {/* Movement Type Filter */}
            <select
              className="input"
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value as any);
                setPage(1);
              }}
              style={{ width: '160px' }}
            >
              <option value="">All Movement Types</option>
              <option value="IN">↓ Stock Inward</option>
              <option value="OUT">↑ Stock Outward</option>
            </select>

            {/* Product Filter */}
            <select
              className="input"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPage(1);
              }}
              style={{ width: '220px' }}
            >
              <option value="">Filter by Product SKU...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name.slice(0, 24)}
                </option>
              ))}
            </select>
          </div>

          {errorAudit && <div className="alert alert-danger mb-16">{errorAudit}</div>}

          {/* Table Container */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <Table
              columns={auditColumns}
              data={movements}
              keyExtractor={(m) => m.id}
              isLoading={loadingAudit}
              emptyMessage="No stock movements match the specified query filters."
            />

            {/* Pagination Controls */}
            {!loadingAudit && movements.length > 0 && (
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{showRange}</strong> audit movements
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
