import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { productService, type ProductFilterParams } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { Table, type TableColumn } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { ProductModal, type ProductFormData } from '../components/products/ProductModal';
import { QuickStockModal } from '../components/products/QuickStockModal';
import { PageHeader } from '../components/common/PageHeader';
import { IconPlus, IconDownload, IconPackage, IconAlertTriangle, IconIndianRupee } from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';

import { AddProductChoiceModal } from '../components/products/AddProductChoiceModal';
import { BulkImportModal } from '../components/products/BulkImportModal';

const EMPTY_FORM: ProductFormData = {
  name: '', sku: '', category: '', unitPrice: '',
  currentStock: '0', minimumStock: '10', warehouseLocation: '',
};

const DEFAULT_CATEGORIES = [
  'Computer Accessories', 'Office Equipment', 'Networking',
  'Software Licenses', 'Storage Devices',
];

export const Products: React.FC = () => {
  const { hasRole, user, activeOrg } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  const canEdit = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);
  const currentRole = activeOrg?.role || user?.role || 'SALES';
  const isWarehouse = currentRole === 'WAREHOUSE';

  const [searchParams, setSearchParams] = useSearchParams();
  const urlLowStock = searchParams.get('lowStock') === 'true';
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(urlLowStock);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'stock_desc' | 'stock_asc' | 'price_desc'>('newest');
  const [datePreset, setDatePreset] = useState<'ALL_TIME' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'>('ALL_TIME');

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [inwardProd, setInwardProd] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dynamically merge categories from products table + defaults
  const categoriesList = useMemo(() => {
    const set = new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category).filter(Boolean)]);
    return Array.from(set);
  }, [products]);


  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_product_page_size');
    return saved ? Number(saved) : 10;
  });

  useEffect(() => {
    setLowStock(urlLowStock);
    if (urlSearch) setSearch(urlSearch);
    setPage(1);
  }, [urlLowStock, urlSearch]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ProductFilterParams = {
        page, limit: pageSize,
        search: search.trim() || undefined,
        category: category || undefined,
        lowStock: lowStock ? true : undefined,
      };
      const response = await productService.getProducts(filters);
      setProducts(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, category, lowStock]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };

  const handleLowStockToggle = (val: boolean) => {
    setLowStock(val);
    setPage(1);
    if (val) setSearchParams({ lowStock: 'true' });
    else setSearchParams({});
  };

  // Product inventory metrics
  const inventoryMetrics = useMemo(() => {
    const totalCount = totalItems || products.length;
    const lowCount = products.filter((p) => p.currentStock <= p.minimumStock).length;
    const zeroCount = products.filter((p) => p.currentStock === 0).length;
    const totalValuation = products.reduce((acc, p) => acc + (p.currentStock * Number(p.unitPrice)), 0);
    return { totalCount, lowCount, zeroCount, totalValuation };
  }, [products, totalItems]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (datePreset !== 'ALL_TIME') {
      const now = new Date();
      const cutoff = new Date();
      if (datePreset === 'TODAY') cutoff.setHours(0, 0, 0, 0);
      else if (datePreset === 'LAST_7_DAYS') cutoff.setDate(now.getDate() - 7);
      else if (datePreset === 'LAST_30_DAYS') cutoff.setDate(now.getDate() - 30);

      list = list.filter((p) => {
        const itemDate = new Date(p.createdAt || p.updatedAt || Date.now());
        return itemDate >= cutoff;
      });
    }

    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      if (sortOrder === 'newest') return timeB - timeA;
      if (sortOrder === 'oldest') return timeA - timeB;
      if (sortOrder === 'stock_desc') return b.currentStock - a.currentStock;
      if (sortOrder === 'stock_asc') return a.currentStock - b.currentStock;
      if (sortOrder === 'price_desc') return Number(b.unitPrice) - Number(a.unitPrice);
      return 0;
    });

    return list;
  }, [products, datePreset, sortOrder]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAdd = () => { setFormData(EMPTY_FORM); setSubmitError(null); setModalMode('add'); };

  const openEdit = (prod: Product) => {
    setSelectedProd(prod);
    setFormData({
      name: prod.name, sku: prod.sku, category: prod.category,
      unitPrice: String(prod.unitPrice), currentStock: String(prod.currentStock),
      minimumStock: String(prod.minimumStock), warehouseLocation: prod.warehouseLocation,
    });
    setSubmitError(null);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setSelectedProd(null); };

  const validateForm = (): boolean => {
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category || !formData.warehouseLocation.trim()) {
      setSubmitError('Please complete all required fields.');
      return false;
    }
    return true;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await productService.createProduct({
        name: formData.name.trim(), sku: formData.sku.trim().toUpperCase(),
        category: formData.category, unitPrice: isWarehouse ? 0 : Number(formData.unitPrice),
        currentStock: Number(formData.currentStock), minimumStock: Number(formData.minimumStock),
        warehouseLocation: formData.warehouseLocation.trim(),
      });
      closeModal();
      toast.success('Product created successfully.');
      void fetchProducts();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    setSubmitError(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await productService.updateProduct(selectedProd.id, {
        name: formData.name.trim(), sku: formData.sku.trim().toUpperCase(),
        category: formData.category, unitPrice: isWarehouse ? Number(selectedProd.unitPrice) : Number(formData.unitPrice),
        minimumStock: Number(formData.minimumStock), warehouseLocation: formData.warehouseLocation.trim(),
      });
      closeModal();
      toast.success('Product updated successfully.');
      void fetchProducts();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInwardSuccess = (p: Product, quantity: number, type: 'IN' | 'OUT') => {
    toast.success(`${type === 'IN' ? 'Inward receipt' : 'Outward deduction'} of ${quantity} units recorded for ${p.name}`);
    void fetchProducts();
  };

  const columns = useMemo<TableColumn<Product>[]>(() => {
    const baseCols: TableColumn<Product>[] = [
      {
        key: 'name',
        header: 'Product Details',
        render: (p) => (
          <div>
            <Link to={`/products/${p.id}`} className="fw-700 color-primary d-block">
              {p.name}
            </Link>
            <div className="fs-12 text-mono color-tertiary">
              SKU: {p.sku} · Location: <span className="color-primary fw-600">{p.warehouseLocation}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Category',
        render: (p) => (
          <span className="badge badge-secondary">{p.category}</span>
        ),
      },
      {
        key: 'unitPrice',
        header: 'Unit Price',
        className: 'text-mono',
        render: (p) => `₹${Number(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      },
      {
        key: 'currentStock',
        header: 'Stock Level',
        render: (p) => {
          const isLow = p.currentStock <= p.minimumStock;
          const isZero = p.currentStock === 0;
          const pct = Math.min(Math.round((p.currentStock / Math.max(p.minimumStock * 2, 1)) * 100), 100);

          return (
            <div style={{ minWidth: '130px' }}>
              <div className="flex-between mb-4">
                <span className={`fw-700 fs-13 ${isZero ? 'color-danger' : isLow ? 'color-warning' : 'color-success'}`}>
                  {p.currentStock} units
                </span>
                <span className="fs-11 color-tertiary">min: {p.minimumStock}</span>
              </div>
              <div className="stock-meter-bg" style={{ height: '4px' }}>
                <div
                  className="stock-meter-bar"
                  style={{
                    width: `${pct}%`,
                    background: isZero ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                  }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (p) => (
          <div className="flex-center gap-6" style={{ justifyContent: 'flex-end' }}>
            {canEdit && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setInwardProd(p)}
                title="Quick Stock Adjustment"
              >
                ⚡ Adjust Stock
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/products/${p.id}`)}
            >
              Details
            </button>
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
              >
                Edit
              </button>
            )}
          </div>
        ),
      },
    ];

    if (isWarehouse) {
      return baseCols.filter(col => col.key !== 'unitPrice');
    }
    return baseCols;
  }, [canEdit, navigate, isWarehouse]);



  const handleExportCsv = () => {
    exportToCsv(
      `products_inventory_${new Date().toISOString().slice(0, 10)}`,
      products.map((p) => {
        const row: Record<string, string | number> = {
          SKU: p.sku,
          Name: p.name,
          Category: p.category,
          'Current Stock': p.currentStock,
          'Minimum Stock': p.minimumStock,
          'Stock Status': p.currentStock === 0 ? 'Out of Stock' : p.currentStock <= p.minimumStock ? 'Low Stock' : 'Optimal',
          Location: p.warehouseLocation || '—',
        };
        if (!isWarehouse) {
          row['Unit Price (INR)'] = p.unitPrice;
        }
        return row;
      })
    );
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {inwardProd && (
        <QuickStockModal
          product={inwardProd}
          isOpen={true}
          onClose={() => setInwardProd(null)}
          onSuccess={handleInwardSuccess}
        />
      )}

      <PageHeader
        title={lowStock ? 'Critical Stock Warnings' : 'Catalog & Inventory Management'}
        subtitle={lowStock ? 'Products currently below safety reorder threshold.' : 'Track stock levels, warehouse storage locations, and unit pricing.'}
        actions={
          <div className="flex-center gap-8">
            {products.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} id="export-products-btn">
                <IconDownload size={14} /> Export CSV
              </button>
            )}
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setIsChoiceModalOpen(true)} id="add-product-btn">
                <IconPlus size={14} /> Add Product
              </button>
            )}
          </div>
        }
      />

      {/* Inventory KPI Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Active Catalog SKUs</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconPackage size={18} />
            </div>
          </div>
          <div className="stat-card__value">{inventoryMetrics.totalCount}</div>
          <div className="stat-card__footer">Total material SKUs in system</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Low Stock Alerts</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: inventoryMetrics.lowCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {inventoryMetrics.lowCount}
          </div>
          <div className="stat-card__footer">Below safety threshold</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Out of Stock (Zero)</span>
            <div className="stat-card__icon stat-card__icon--red">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: inventoryMetrics.zeroCount > 0 ? 'var(--danger)' : 'inherit' }}>
            {inventoryMetrics.zeroCount}
          </div>
          <div className="stat-card__footer">Requires immediate replenishment</div>
        </div>

        {!isWarehouse && (
          <div className="stat-card">
            <div className="stat-card__header">
              <span className="stat-card__label">Page Stock Valuation</span>
              <div className="stat-card__icon stat-card__icon--green">
                <IconIndianRupee size={18} />
              </div>
            </div>
            <div className="stat-card__value">
              ₹{inventoryMetrics.totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="stat-card__footer">Asset value of listed items</div>
          </div>
        )}
      </div>

      {/* Category Pills & Filters */}
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="status-tabs">
          <button
            type="button"
            className={`status-tab ${!lowStock ? 'status-tab--active' : ''}`}
            onClick={() => handleLowStockToggle(false)}
          >
            <span>All Catalog Items</span>
            <span className="status-tab__count">{inventoryMetrics.totalCount}</span>
          </button>
          <button
            type="button"
            className={`status-tab ${lowStock ? 'status-tab--active' : ''}`}
            onClick={() => handleLowStockToggle(true)}
          >
            <span>⚠️ Low Stock Warnings</span>
            <span
              className="status-tab__count"
              style={
                inventoryMetrics.lowCount > 0
                  ? { background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' }
                  : undefined
              }
            >
              {inventoryMetrics.lowCount}
            </span>
          </button>
        </div>

        <div className="flex-center gap-8 flex-wrap">
          {/* Date Filter */}
          <select
            className="filter-select"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            aria-label="Filter by Date Created"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            <option value="ALL_TIME">📅 All Time</option>
            <option value="TODAY">📅 Added Today</option>
            <option value="LAST_7_DAYS">📅 Past 7 Days</option>
            <option value="LAST_30_DAYS">📅 Past 30 Days</option>
          </select>

          {/* Category Filter */}
          <select
            className="filter-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filter by Category"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            <option value="">📂 All Categories</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Recency & Stock Sorting */}
          <select
            className="filter-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            aria-label="Sort Order"
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            <option value="newest">⬇️ Newest Added (Recency)</option>
            <option value="oldest">⬆️ Oldest First</option>
            <option value="stock_desc">📦 Stock: High to Low</option>
            <option value="stock_asc">📦 Stock: Low to High</option>
            {!isWarehouse && <option value="price_desc">💰 Price: High to Low</option>}
          </select>
        </div>
      </div>

      <div className="toolbar-card">
        <SearchBar onSearch={handleSearch} placeholder="Search by SKU, product name, or location…" id="product-search" />
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <div className="table-card">
        <Table columns={columns} data={filteredProducts} keyExtractor={(p) => p.id} isLoading={loading}
          emptyMessage="No products found matching your query." />
        {!loading && products.length > 0 && (
          <div className="pagination-footer">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–
              {Math.min(page * pageSize, totalItems)} of {totalItems} products
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
                localStorage.setItem('stockpulse_product_page_size', String(newSize));
              }}
              pageSizeOptions={[10, 25, 30, 50, 100]}
              totalItems={totalItems}
            />
          </div>
        )}
      </div>

      {/* Choice Modal (Single vs Bulk) */}
      <AddProductChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectManual={openAdd}
        onSelectBulk={() => setIsBulkModalOpen(true)}
      />

      {/* Bulk CSV / Excel Import Modal */}
      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => {
          toast.success(`Successfully imported ${count} products into catalog.`);
          void fetchProducts();
        }}
        isWarehouseRole={isWarehouse}
      />

      {modalMode && (
        <ProductModal mode={modalMode} formData={formData} onChange={handleFormChange}
          onSubmit={modalMode === 'add' ? handleAddSubmit : handleEditSubmit}
          onClose={closeModal} submitError={submitError} submitting={submitting} />
      )}
    </div>
  );
};

export default Products;

