import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

interface SearchableProductSelectProps {
  products: Product[];
  selectedId: string;
  onSelect: (productId: string) => void;
}

const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  selectedId,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId),
    [products, selectedId]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', minWidth: '260px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          color: selectedProduct ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '8px',
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedProduct ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{selectedProduct.sku}</strong>
              <span style={{ color: 'var(--text-secondary)' }}>- {selectedProduct.name}</span>
            </span>
          ) : (
            'Filter by Product SKU...'
          )}
        </span>
        {selectedProduct ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onSelect('');
            }}
            style={{
              color: 'var(--text-tertiary)',
              padding: '2px 4px',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            title="Clear SKU Filter"
          >
            ✕
          </span>
        ) : (
          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>▼</span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '300px',
            backgroundColor: '#18181b', // Pure dark elevated background
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65)',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '320px',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search SKU, product name, category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: '#f4f4f5',
                fontSize: '12.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            <div
              onClick={() => {
                onSelect('');
                setIsOpen(false);
                setQuery('');
              }}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '12.5px',
                color: !selectedId ? 'var(--primary)' : '#a1a1aa',
                backgroundColor: !selectedId ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                fontWeight: !selectedId ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>All Products (No SKU filter)</span>
              {!selectedId && <span style={{ color: 'var(--primary)' }}>✓</span>}
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#71717a', fontSize: '12px' }}>
                No matching products found.
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      transition: 'background-color 0.1s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            color: isSelected ? 'var(--primary)' : '#f4f4f5',
                            fontSize: '12px',
                          }}
                        >
                          {p.sku}
                        </span>
                        {p.category && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: '#a1a1aa',
                            }}
                          >
                            {p.category}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#d4d4d8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
                          marginTop: '2px',
                        }}
                      >
                        {p.name}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          color: p.currentStock > 0 ? '#71717a' : 'var(--danger)',
                        }}
                      >
                        {p.currentStock} in stock
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  const [selectedMovement, setSelectedMovement] = useState<StockMovementReportItem | null>(null);

  // Category Sort state
  const [catSortField, setCatSortField] = useState<'category' | 'skuCount' | 'totalUnits' | 'totalCostValue' | 'totalValue' | 'marginPercent'>('totalCostValue');
  const [catSortAsc, setCatSortAsc] = useState<boolean>(false);

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
        const res = await productService.getProducts({ limit: 200 });
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

  // Quick shortcut to jump to Audit tab filtered by product
  const jumpToProductAudit = (targetProductId: string) => {
    setProductId(targetProductId);
    setSearch('');
    setMovementType('');
    setPage(1);
    setActiveTab('audit');
  };

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
        Reason: m.reason || 'General inventory adjustment',
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
        <div style={{ cursor: 'pointer' }} onClick={() => setSelectedMovement(m)}>
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
        <div style={{ cursor: 'pointer' }} onClick={() => setSelectedMovement(m)}>
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
          {m.type === 'IN' ? `+${m.quantity.toLocaleString()}` : `-${m.quantity.toLocaleString()}`}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Log Reason',
      render: (m) => (
        <span className="fs-12 color-secondary" style={{ maxWidth: '260px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.reason || 'General inventory adjustment'}
        </span>
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
            <div className="fs-10 color-tertiary text-mono">
              {m.user?.role ?? 'OPERATIONS'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      render: (m) => (
        <button
          onClick={() => setSelectedMovement(m)}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11.5px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          🔍 Inspect
        </button>
      ),
    },
  ];

  const showRange = movements.length > 0
    ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`
    : '';

  // Sorted Categories
  const sortedCategories = useMemo(() => {
    if (!analyticsData) return [];
    const list = [...analyticsData.valuationByCategory];
    list.sort((a, b) => {
      let aVal: any = a[catSortField];
      let bVal: any = b[catSortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return catSortAsc ? -1 : 1;
      if (aVal > bVal) return catSortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [analyticsData, catSortField, catSortAsc]);

  const toggleCatSort = (field: typeof catSortField) => {
    if (catSortField === field) {
      setCatSortAsc(!catSortAsc);
    } else {
      setCatSortField(field);
      setCatSortAsc(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Enterprise Inventory Intelligence & Reports"
        subtitle="Scalable analytics, working capital locks, material throughput velocity, and immutable audit logs."
        actions={
          activeTab === 'audit' && movements.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} id="export-reports-btn">
              <IconDownload size={14} /> Export Audit Log CSV
            </button>
          )
        }
      />

      {/* Navigation Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Period:</span>
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
          </div>
        )}
      </div>

      {/* ── 1. EXECUTIVE VALUATION & HEALTH MATRIX TAB ───────────────────────── */}
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

              {/* 🎯 Inventory Health & Reorder Urgency Command Center */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      🛡️ Inventory Health & Working Capital Allocation
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Real-time risk status and capital concentration across your warehouse portfolio.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* Pillar 1: Critical Reorder */}
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase' }}>
                        🚨 Critical Reorder
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        {analyticsData.inventoryHealthMatrix?.criticalReorder.status || 'ATTENTION'}
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {analyticsData.inventoryHealthMatrix?.criticalReorder.skuCount ?? analyticsData.lowStockCount} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>SKUs</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                      {analyticsData.inventoryHealthMatrix?.criticalReorder.description || 'Stock at or below minimum threshold (< 7d runway)'}
                    </p>
                  </div>

                  {/* Pillar 2: Healthy Buffer */}
                  <div
                    style={{
                      background: 'rgba(34, 197, 94, 0.06)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase' }}>
                        🟢 Healthy Buffer
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        OPTIMAL
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {analyticsData.inventoryHealthMatrix?.healthyBuffer.skuCount ?? Math.max(0, analyticsData.activeSkusCount - analyticsData.lowStockCount)} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>SKUs</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                      {analyticsData.inventoryHealthMatrix?.healthyBuffer.description || 'Active products with balanced 15–45 day demand buffers'}
                    </p>
                  </div>

                  {/* Pillar 3: Overstock / Excess */}
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.06)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                        ⚠️ Excess Overstock
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        MONITOR
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {analyticsData.inventoryHealthMatrix?.excessOverstock.skuCount ?? 0} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 500 }}>SKUs</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                      {analyticsData.inventoryHealthMatrix?.excessOverstock.description || 'High unit concentration with > 90d inventory runway'}
                    </p>
                  </div>

                  {/* Pillar 4: Dead Stock Locked Capital */}
                  <div
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                        🧊 Idle Capital Lock
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                        {analyticsData.deadStockProducts.length} SKUs
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatINR(analyticsData.totalDeadStockCapital)}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                      Zero outbound activity recorded over the last 45+ days
                    </p>
                  </div>
                </div>
              </div>

              {/* 📊 Stock Flow Throughput & Velocity Summary */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ⚡ Warehouse Material Flow & Throughput Velocity ({timeRange.toUpperCase()})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Comprehensive material intake vs client fulfillment telemetry over the selected period.
                    </p>
                  </div>
                </div>

                {/* Flow Throughput Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>📥 Total Material Inflow</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      +{analyticsData.stockFlowMetrics?.totalInwardUnits.toLocaleString() ?? 0} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>units</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {analyticsData.stockFlowMetrics?.inflowSharePercent ?? 50}% of total volume
                    </span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>📤 Total Client Dispatches</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      -{analyticsData.stockFlowMetrics?.totalOutwardUnits.toLocaleString() ?? 0} <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>units</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {analyticsData.stockFlowMetrics?.outflowSharePercent ?? 50}% of total volume
                    </span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>⚖️ Net Stock Delta</span>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        marginTop: '4px',
                        color: (analyticsData.stockFlowMetrics?.netThroughput ?? 0) >= 0 ? '#4ade80' : '#f87171',
                      }}
                    >
                      {(analyticsData.stockFlowMetrics?.netThroughput ?? 0) >= 0
                        ? `+${(analyticsData.stockFlowMetrics?.netThroughput ?? 0).toLocaleString()}`
                        : (analyticsData.stockFlowMetrics?.netThroughput ?? 0).toLocaleString()}{' '}
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>units</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {(analyticsData.stockFlowMetrics?.netThroughput ?? 0) >= 0 ? 'Net inventory accumulation' : 'Net inventory depletion'}
                    </span>
                  </div>
                </div>

                {/* Peak Flow Activity Timeline */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🔥 Top Peak Activity Flow Days
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {(analyticsData.stockFlowMetrics?.peakFlowDays || []).map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>📅 {p.date}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            <span style={{ color: 'var(--success)' }}>+{p.inbound} in</span> · <span style={{ color: 'var(--danger)' }}>-{p.outbound} out</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--primary)' }}>
                            {p.totalVolume.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>total units flow</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    Highest outbound dispatch demand in the selected window (Click SKU to inspect logs)
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
                          onClick={() => jumpToProductAudit(p.productId)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
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
                          onClick={() => jumpToProductAudit(p.productId)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f87171')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Category Working Capital & Margin Allocation
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Portfolio distribution of purchase cost, retail value, and profit margins. Click column headers to sort.
              </p>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Sorted by <strong>{catSortField}</strong> ({catSortAsc ? 'Ascending' : 'Descending'})
            </span>
          </div>

          {loadingAnalytics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading category telemetry...</div>
          ) : analyticsData ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => toggleCatSort('category')}>
                      Product Category {catSortField === 'category' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleCatSort('skuCount')}>
                      SKUs {catSortField === 'skuCount' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleCatSort('totalUnits')}>
                      Total Units {catSortField === 'totalUnits' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleCatSort('totalCostValue')}>
                      Purchase Cost Lock {catSortField === 'totalCostValue' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleCatSort('totalValue')}>
                      Retail Valuation {catSortField === 'totalValue' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleCatSort('marginPercent')}>
                      Gross Margin {catSortField === 'marginPercent' ? (catSortAsc ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((c) => (
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
          {/* Modern Dark Filter Bar */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              flexWrap: 'wrap',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            {/* Search Input with Clear Button */}
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="Search by product name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  paddingRight: search ? '30px' : '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Movement Type Filter */}
            <select
              value={movementType}
              onChange={(e) => {
                setMovementType(e.target.value as any);
                setPage(1);
              }}
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                minWidth: '175px',
                outline: 'none',
              }}
            >
              <option value="" style={{ backgroundColor: '#18181b', color: '#f4f4f5' }}>All Movement Types</option>
              <option value="IN" style={{ backgroundColor: '#18181b', color: '#4ade80' }}>↓ Stock Inward</option>
              <option value="OUT" style={{ backgroundColor: '#18181b', color: '#f87171' }}>↑ Stock Outward</option>
            </select>

            {/* Modern Advance Searchable SKU Combobox Filter */}
            <SearchableProductSelect
              products={products}
              selectedId={productId}
              onSelect={(pId) => {
                setProductId(pId);
                setPage(1);
              }}
            />

            {/* Clear All Filters */}
            {(search || productId || movementType) && (
              <button
                onClick={() => {
                  setSearch('');
                  setProductId('');
                  setMovementType('');
                  setPage(1);
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                Reset Filters
              </button>
            )}
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

            {/* Pagination Controls - Standardized layout with clearance from DOST AI floating button */}
            {!loadingAudit && movements.length > 0 && (
              <div
                className="pagination-footer"
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  paddingRight: '220px', // Extra spacing ensures no collision with floating DOST AI widget
                }}
              >
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{showRange}</strong> audit movements
                </span>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 15, 20, 50, 100]}
                  totalItems={totalItems}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE MODAL: STOCK MOVEMENT INSPECTOR ──────────────────────── */}
      {selectedMovement && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedMovement(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${selectedMovement.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                  {selectedMovement.type === 'IN' ? '↓ Stock Inward Receipt' : '↑ Stock Outward Dispatch'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  ID: {selectedMovement.id.slice(-8)}
                </span>
              </div>
              <button
                onClick={() => setSelectedMovement(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  fontSize: '20px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedMovement.product?.name ?? 'Unknown Product'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                SKU: {selectedMovement.product?.sku ?? '—'} · Category: {selectedMovement.product?.category ?? 'General'}
              </p>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '11px' }}>Quantity Transacted</span>
                <strong style={{ fontSize: '18px', color: selectedMovement.type === 'IN' ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                  {selectedMovement.type === 'IN' ? `+${selectedMovement.quantity}` : `-${selectedMovement.quantity}`} units
                </strong>
              </div>

              <div>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '11px' }}>Current Warehouse Stock</span>
                <strong style={{ fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedMovement.product?.currentStock ?? '—'} units
                </strong>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '11px' }}>Event Timestamp</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {new Date(selectedMovement.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '11px' }}>Reason / Origin Document</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {selectedMovement.reason || 'General stock intake / dispatch ledger log'}
                </span>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '11px' }}>Operator / System Actor</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {selectedMovement.user?.name ?? 'System'} ({selectedMovement.user?.email ?? 'automation@stockpulse.internal'})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedMovement(null);
                  jumpToProductAudit(selectedMovement.productId);
                }}
              >
                Filter All Movements for this SKU
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedMovement(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
