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

const EMPTY_FORM: ProductFormData = {
  name: '', sku: '', category: '', unitPrice: '',
  currentStock: '0', minimumStock: '10', warehouseLocation: '',
};


const CATEGORIES = [
  'Computer Accessories', 'Office Equipment', 'Networking',
  'Software Licenses', 'Storage Devices',
];

export const Products: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  const canEdit = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlLowStock = searchParams.get('lowStock') === 'true';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(urlLowStock);

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [inwardProd, setInwardProd] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_product_page_size');
    return saved ? Number(saved) : 10;
  });

  useEffect(() => { setLowStock(urlLowStock); setPage(1); }, [urlLowStock]);

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
        category: formData.category, unitPrice: Number(formData.unitPrice),
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
        category: formData.category, unitPrice: Number(formData.unitPrice),
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

  const handleInwardSuccess = (p: Product, added: number) => {
    toast.success(`Inward of ${added} units recorded for ${p.name}`);
    void fetchProducts();
  };

  const columns: TableColumn<Product>[] = [
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
              title="Quick Stock Inward"
            >
              + Inward
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



  const handleExportCsv = () => {
    exportToCsv(
      `products_inventory_${new Date().toISOString().slice(0, 10)}`,
      products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category,
        'Unit Price (INR)': p.unitPrice,
        'Current Stock': p.currentStock,
        'Minimum Stock': p.minimumStock,
        'Stock Status': p.currentStock === 0 ? 'Out of Stock' : p.currentStock <= p.minimumStock ? 'Low Stock' : 'Optimal',
        Location: p.warehouseLocation,
      }))
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
              <button className="btn btn-primary btn-sm" onClick={openAdd} id="add-product-btn">
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
            <span className="status-tab__badge">{inventoryMetrics.totalCount}</span>
          </button>
          <button
            type="button"
            className={`status-tab ${lowStock ? 'status-tab--active' : ''}`}
            onClick={() => handleLowStockToggle(true)}
          >
            <span>⚠️ Low Stock Warnings</span>
            <span className="status-tab__badge" style={{ background: 'var(--warning)', color: '#000' }}>
              {inventoryMetrics.lowCount}
            </span>
          </button>
        </div>

        <div className="flex-center gap-8">
          <select
            className="filter-select"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            aria-label="Filter by Category"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="toolbar-card">
        <SearchBar onSearch={handleSearch} placeholder="Search by SKU, product name, or location…" id="product-search" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show:</span>
          <select
            className="filter-select"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setPage(1);
              localStorage.setItem('stockpulse_product_page_size', String(newSize));
            }}
            aria-label="Items per page limit"
            style={{ width: 'auto', minWidth: '95px' }}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="30">30 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <div className="table-card">
        <Table columns={columns} data={products} keyExtractor={(p) => p.id} isLoading={loading}
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

      {modalMode && (
        <ProductModal mode={modalMode} formData={formData} onChange={handleFormChange}
          onSubmit={modalMode === 'add' ? handleAddSubmit : handleEditSubmit}
          onClose={closeModal} submitError={submitError} submitting={submitting} />
      )}
    </div>
  );
};

export default Products;
