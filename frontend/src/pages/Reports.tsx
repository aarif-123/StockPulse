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

const PAGE_LIMIT = 15;

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

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'audit'>('analytics');

  // Audit Logs state
  const [movements, setMovements] = useState<StockMovementReportItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [errorAudit, setErrorAudit] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [movementType, setMovementType] = useState<'' | 'IN' | 'OUT'>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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
        productId: productId || undefined,
        type: movementType || undefined,
        page,
        limit: PAGE_LIMIT,
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
  }, [productId, movementType, page]);

  // Fetch Analytics summary
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setErrorAnalytics(null);
    try {
      const res = await reportService.getAnalytics();
      setAnalyticsData(res.data);
    } catch (err) {
      setErrorAnalytics(handleApiError(err));
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Fetch based on active tab
  useEffect(() => {
    if (activeTab === 'audit') {
      void fetchAuditLogs();
    } else {
      void fetchAnalytics();
    }
  }, [activeTab, fetchAuditLogs, fetchAnalytics]);

  // Compute metrics across current page in audit logs view
  const auditMetrics = useMemo(() => {
    const totalIn = movements.filter((m) => m.type === 'IN').reduce((sum, m) => sum + m.quantity, 0);
    const totalOut = movements.filter((m) => m.type === 'OUT').reduce((sum, m) => sum + m.quantity, 0);
    const net = totalIn - totalOut;
    return { totalIn, totalOut, net, totalRecords: totalItems || movements.length };
  }, [movements, totalItems]);

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
        <span className="fs-12 color-secondary">{m.reason}</span>
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
    ? `${(page - 1) * PAGE_LIMIT + 1}–${Math.min(page * PAGE_LIMIT, totalItems)} of ${totalItems}`
    : '';

  // Max value calculation for Volume Trend Chart
  const maxTrendVal = useMemo(() => {
    if (!analyticsData) return 10;
    const values = analyticsData.stockMovementTrend.map((t) => Math.max(t.stockIn, t.stockOut));
    return Math.max(...values, 10);
  }, [analyticsData]);

  // Max value calculation for Category Distribution
  const maxCategoryVal = useMemo(() => {
    if (!analyticsData) return 10;
    const values = analyticsData.valuationByCategory.map((c) =>
      isWarehouse ? c.totalStock : c.totalValue
    );
    return Math.max(...values, 10);
  }, [analyticsData, isWarehouse]);

  return (
    <div>
      <PageHeader
        title="Inventory Audit Log & Reports"
        subtitle="Complete immutable trail of warehouse material receipts, customer shipments, and analytical forecasts."
        actions={
          activeTab === 'audit' && movements.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} id="export-reports-btn">
              <IconDownload size={14} /> Export Audit Log CSV
            </button>
          )
        }
      />

      {/* Tabs Menu */}
      <div className="status-tabs" style={{ marginBottom: '24px' }}>
        <button
          className={`status-tab ${activeTab === 'analytics' ? 'status-tab--active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <IconBarChart size={16} /> Analytics & Insights Dashboard
        </button>
        <button
          className={`status-tab ${activeTab === 'audit' ? 'status-tab--active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <IconPackage size={16} /> Stock Movement Audit Log
        </button>
      </div>

      {/* RENDER ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <>
          {loadingAnalytics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="stats-grid">
                <div className="stat-card" style={{ height: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
                <div className="stat-card" style={{ height: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
                <div className="stat-card" style={{ height: '120px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', animation: 'pulse 1.5s infinite' }} />
              </div>
              <div style={{ height: '300px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ) : errorAnalytics ? (
            <div className="alert alert-danger mb-16">{errorAnalytics}</div>
          ) : analyticsData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* KPI Summary Cards */}
              <div className="stats-grid">
                {!isWarehouse && (
                  <>
                    <div className="stat-card">
                      <div className="stat-card__header">
                        <span className="stat-card__label">Inventory Valuation</span>
                        <div className="stat-card__icon stat-card__icon--blue">
                          <IconBarChart size={18} />
                        </div>
                      </div>
                      <div className="stat-card__value">{formatINR(analyticsData.totalValuation)}</div>
                      <div className="stat-card__footer">Total selling value of stock</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-card__header">
                        <span className="stat-card__label">Locked Capital (Cost)</span>
                        <div className="stat-card__icon stat-card__icon--purple">
                          <IconBarChart size={18} />
                        </div>
                      </div>
                      <div className="stat-card__value">{formatINR(analyticsData.totalCostValuation)}</div>
                      <div className="stat-card__footer">Total purchase cost value</div>
                    </div>
                  </>
                )}

                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Active SKUs</span>
                    <div className="stat-card__icon stat-card__icon--green">
                      <IconPackage size={18} />
                    </div>
                  </div>
                  <div className="stat-card__value">{analyticsData.activeSkusCount}</div>
                  <div className="stat-card__footer">Products currently in stock</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Runway Risks</span>
                    <div className="stat-card__icon stat-card__icon--red">
                      <IconPackage size={18} />
                    </div>
                  </div>
                  <div className="stat-card__value" style={{ color: 'var(--danger)' }}>
                    {analyticsData.lowStockCount}
                  </div>
                  <div className="stat-card__footer">{analyticsData.outOfStockCount} items completely out of stock</div>
                </div>
              </div>

              {/* Graphical Charts Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Chart 1: Stock Movements Trend */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h3 className="fs-15 fw-700 color-primary" style={{ margin: 0 }}>Stock Volume Movement Trend</h3>
                    <p className="fs-11 color-tertiary" style={{ margin: '4px 0 0 0' }}>Comparing inbound receipts vs outbound client dispatches (15 days)</p>
                  </div>
                  
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '2px' }} />
                      <span className="color-secondary">Restock IN</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--danger)', borderRadius: '2px' }} />
                      <span className="color-secondary">Dispatch OUT</span>
                    </div>
                  </div>

                  {/* Responsive SVG Chart */}
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <svg viewBox="0 0 560 220" width="100%" height="220" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                        const y = 20 + ratio * 140;
                        const val = Math.round(maxTrendVal * (1 - ratio));
                        return (
                          <g key={index}>
                            <line x1="42" y1={y} x2="540" y2={y} stroke="var(--border-color)" strokeDasharray="3,3" />
                            <text x="32" y={y + 4} textAnchor="end" fill="var(--text-tertiary)" fontSize="9" fontFamily="monospace">
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* X Axis */}
                      <line x1="42" y1="160" x2="540" y2="160" stroke="var(--border-color)" strokeWidth="1" />

                      {/* Bars rendering */}
                      {analyticsData.stockMovementTrend.map((t, idx) => {
                        const x = 52 + idx * 32;
                        const inHeight = maxTrendVal > 0 ? (t.stockIn / maxTrendVal) * 140 : 0;
                        const outHeight = maxTrendVal > 0 ? (t.stockOut / maxTrendVal) * 140 : 0;
                        const inY = 160 - inHeight;
                        const outY = 160 - outHeight;

                        return (
                          <g key={idx}>
                            {t.stockIn > 0 && (
                              <rect x={x} y={inY} width="8" height={inHeight} fill="var(--success)" rx="1.5">
                                <title>{`${t.date}: +${t.stockIn} units received`}</title>
                              </rect>
                            )}
                            {t.stockOut > 0 && (
                              <rect x={x + 10} y={outY} width="8" height={outHeight} fill="var(--danger)" rx="1.5">
                                <title>{`${t.date}: -${t.stockOut} units dispatched`}</title>
                              </rect>
                            )}
                            {idx % 2 === 0 && (
                              <text x={x + 9} y="178" textAnchor="middle" fill="var(--text-tertiary)" fontSize="8">
                                {t.date}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Chart 2: Category Breakdown */}
                <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h3 className="fs-15 fw-700 color-primary" style={{ margin: 0 }}>
                      {isWarehouse ? 'Catalog Volume by Category' : 'Capital Valuation by Category'}
                    </h3>
                    <p className="fs-11 color-tertiary" style={{ margin: '4px 0 0 0' }}>
                      {isWarehouse ? 'Breakdown of total physical units currently stored' : 'Capital locks allocated across categories'}
                    </p>
                  </div>

                  {/* Valuation or Volume Progress List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center', height: '100%' }}>
                    {analyticsData.valuationByCategory.length === 0 ? (
                      <div className="fs-12 color-tertiary text-center">No category data recorded.</div>
                    ) : (
                      analyticsData.valuationByCategory.map((c, index) => {
                        const currentVal = isWarehouse ? c.totalStock : c.totalValue;
                        const pct = maxCategoryVal > 0 ? Math.round((currentVal / maxCategoryVal) * 100) : 0;
                        return (
                          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                              <span className="color-primary">{c.category}</span>
                              <span className="color-secondary text-mono">
                                {isWarehouse ? `${c.totalStock} units` : formatINR(c.totalValue)}
                              </span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  backgroundColor: 'var(--accent-purple)',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Rank Lists */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Rank 1: Top Moving Products */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 className="fs-14 fw-700 color-primary mb-12" style={{ margin: '0 0 12px 0' }}>⚡ Fastest Moving Products</h3>
                  <p className="fs-11 color-tertiary mb-16" style={{ margin: '0 0 16px 0' }}>Highest dispatch sales volumes over the past 30 days</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analyticsData.topMovingProducts.length === 0 ? (
                      <div className="fs-12 color-tertiary">No dispatches logged in 30 days.</div>
                    ) : (
                      analyticsData.topMovingProducts.map((p, idx) => (
                        <div key={idx} className="flex-center" style={{ justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div className="fs-12 fw-700 color-primary">{p.productName}</div>
                            <div className="fs-10 text-mono color-tertiary">SKU: {p.sku}</div>
                          </div>
                          <span className="badge badge-success text-mono fw-700">
                            -{p.totalQty} units
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Rank 2: Stockout Runway Forecast */}
                <div className="card" style={{ padding: '20px' }}>
                  <h3 className="fs-14 fw-700 color-primary mb-12" style={{ margin: '0 0 12px 0' }}>🚨 Stockout Risk Forecast</h3>
                  <p className="fs-11 color-tertiary mb-16" style={{ margin: '0 0 16px 0' }}>Products with lowest days of inventory runway based on daily velocity</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {analyticsData.stockoutRiskRunway.length === 0 ? (
                      <div className="fs-12 color-tertiary">All products have stable inventory.</div>
                    ) : (
                      analyticsData.stockoutRiskRunway.map((r, idx) => {
                        let badgeClass = 'badge-success';
                        let prefix = 'STABLE: ';
                        if (r.daysRunway <= 3) {
                          badgeClass = 'badge-danger';
                          prefix = 'CRITICAL: ';
                        } else if (r.daysRunway <= 7) {
                          badgeClass = 'badge-warning';
                          prefix = 'WARNING: ';
                        }

                        return (
                          <div key={idx} className="flex-center" style={{ justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <div>
                              <div className="fs-12 fw-700 color-primary">{r.productName}</div>
                              <div className="fs-10 text-mono color-tertiary">
                                Stock: {r.currentStock} units · Velocity: {r.avgDailySales}/day
                              </div>
                            </div>
                            <span className={`badge ${badgeClass} text-mono fw-700`}>
                              {prefix}{r.daysRunway} days
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : null}
        </>
      )}

      {/* RENDER AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <>
          <div className="toolbar-card">
            <select
              className="filter-select"
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setPage(1); }}
              aria-label="Filter by Product"
              style={{ minWidth: '220px' }}
            >
              <option value="">All Catalog Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={movementType}
              onChange={(e) => { setMovementType(e.target.value as '' | 'IN' | 'OUT'); setPage(1); }}
              aria-label="Filter by Movement Type"
            >
              <option value="">All Movement Types</option>
              <option value="IN">↓ Stock IN (Receipts)</option>
              <option value="OUT">↑ Stock OUT (Dispatches)</option>
            </select>
          </div>

          {errorAudit && <div className="alert alert-danger mb-16">{errorAudit}</div>}

          {/* Stats Summary for Audit Tab */}
          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Total Audit Events</span>
                <div className="stat-card__icon stat-card__icon--blue">
                  <IconBarChart size={18} />
                </div>
              </div>
              <div className="stat-card__value">{auditMetrics.totalRecords}</div>
              <div className="stat-card__footer">Immutable transactions logged</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Page Inflow Receipts</span>
                <div className="stat-card__icon stat-card__icon--green">
                  <IconPackage size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                +{auditMetrics.totalIn}
              </div>
              <div className="stat-card__footer">Units added via stock-in / restock</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Page Outflow Deliveries</span>
                <div className="stat-card__icon stat-card__icon--red">
                  <IconPackage size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: 'var(--danger)' }}>
                -{auditMetrics.totalOut}
              </div>
              <div className="stat-card__footer">Units dispatched to clients</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Net Volume Movement</span>
                <div className="stat-card__icon stat-card__icon--purple">
                  <IconBarChart size={18} />
                </div>
              </div>
              <div className="stat-card__value" style={{ color: auditMetrics.net >= 0 ? 'var(--success)' : 'var(--warning)' }}>
                {auditMetrics.net >= 0 ? `+${auditMetrics.net}` : auditMetrics.net}
              </div>
              <div className="stat-card__footer">Net balance on this page</div>
            </div>
          </div>

          <div className="table-card">
            <Table
              columns={auditColumns}
              data={movements}
              keyExtractor={(m) => m.id}
              isLoading={loadingAudit}
              emptyMessage="No stock movements found for the selected filters."
            />
            {!loadingAudit && movements.length > 0 && (
              <div className="pagination-footer">
                <span>{showRange} movement records</span>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
