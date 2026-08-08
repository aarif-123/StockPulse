import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService, type ProductFilterParams } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';

export const Products: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMIN', 'WAREHOUSE'].includes(user.role);

  // Router Query Params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLowStock = searchParams.get('lowStock') === 'true';

  // Lists & pagination
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(urlLowStock);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields (Note: Omit currentStock from the Edit Form entirely)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: '',
    currentStock: '0', // Only for Add form initialization
    minimumStock: '10',
    warehouseLocation: '',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ProductFilterParams = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        category: category || undefined,
        lowStock: lowStock || undefined,
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
  }, [page, search, category, lowStock]);

  // Sync lowStock state with URL changes
  useEffect(() => {
    setLowStock(urlLowStock);
    setPage(1);
  }, [urlLowStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleToggleLowStock = () => {
    const nextVal = !lowStock;
    setLowStock(nextVal);
    setPage(1);
    setSearchParams(nextVal ? { lowStock: 'true' } : {});
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      unitPrice: '',
      currentStock: '0', // Add allows setting initial stock
      minimumStock: '10',
      warehouseLocation: '',
    });
    setSubmitError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setSelectedProd(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitPrice: String(prod.unitPrice),
      currentStock: String(prod.currentStock), // Read-only snapshot context
      minimumStock: String(prod.minimumStock),
      warehouseLocation: prod.warehouseLocation,
    });
    setSubmitError(null);
    setIsEditOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Simple validations
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category.trim() || !formData.unitPrice || !formData.minimumStock || !formData.warehouseLocation.trim()) {
      setSubmitError('Please complete all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        unitPrice: parseFloat(formData.unitPrice),
        currentStock: parseInt(formData.currentStock, 10),
        minimumStock: parseInt(formData.minimumStock, 10),
        warehouseLocation: formData.warehouseLocation.trim(),
      };

      await productService.createProduct(payload);
      setIsAddOpen(false);
      fetchProducts();
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

    if (!formData.name.trim() || !formData.sku.trim() || !formData.category.trim() || !formData.unitPrice || !formData.minimumStock || !formData.warehouseLocation.trim()) {
      setSubmitError('Please complete all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        unitPrice: parseFloat(formData.unitPrice),
        // Note: Omit currentStock entirely from the edit payload
        minimumStock: parseInt(formData.minimumStock, 10),
        warehouseLocation: formData.warehouseLocation.trim(),
      };

      await productService.updateProduct(selectedProd.id, payload);
      setIsEditOpen(false);
      fetchProducts();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // List unique categories dynamically from current list (fallback options if list is empty)
  const categories = ['Computer Accessories', 'Office Equipment', 'Networking', 'Software Licenses', 'Storage Devices'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{lowStock ? 'Stock Alert Products' : 'Product Inventory'}</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Create Product
          </button>
        )}
      </div>

      {/* Toolbar filters */}
      <div className="toolbar-card">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, SKU, or category..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="filter-select"
          value={category}
          onChange={handleCategoryChange}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button 
          onClick={handleToggleLowStock}
          className={`btn ${lowStock ? 'btn-primary' : 'btn-secondary'}`}
        >
          {lowStock ? 'Show All Products' : 'Show Low Stock Alerts'}
        </button>
      </div>

      {/* Main Grid table */}
      {loading ? (
        <div className="page-loader">
          <div className="spinner"></div>
          <p>Loading catalog details...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : products.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No products found.</p>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Code</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock Levels</th>
                  <th>Warehouse Location</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/products/${p.id}`} style={{ fontWeight: 600, color: 'var(--primary-hover)' }}>
                          {p.name}
                        </Link>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{p.sku}</td>
                      <td>{p.category}</td>
                      <td>₹{Number(p.unitPrice).toFixed(2)}</td>
                      <td>
                        <span 
                          style={{ 
                            fontWeight: 700, 
                            color: isLow ? 'var(--danger)' : 'var(--success)'
                          }}
                        >
                          {p.currentStock}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}> (min: {p.minimumStock})</span>
                      </td>
                      <td>{p.warehouseLocation}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Link to={`/products/${p.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            View
                          </Link>
                          {canEdit && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                              onClick={() => handleOpenEdit(p)}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-footer">
            <span>
              Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, totalItems)} of {totalItems} products
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal Popup */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Add New Product</span>
              <span className="modal-close-btn" onClick={() => setIsAddOpen(false)}>×</span>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {submitError && <div className="alert alert-danger">{submitError}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input
                      className="form-input"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Wireless Mouse"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input
                      className="form-input"
                      name="sku"
                      required
                      value={formData.sku}
                      onChange={handleFormChange}
                      placeholder="e.g. MOU-001"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      className="form-input"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.unitPrice}
                      onChange={handleFormChange}
                      placeholder="e.g. 499.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Initial Stock Level *</label>
                    <input
                      className="form-input"
                      name="currentStock"
                      type="number"
                      min="0"
                      required
                      value={formData.currentStock}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Alert Stock *</label>
                    <input
                      className="form-input"
                      name="minimumStock"
                      type="number"
                      min="0"
                      required
                      value={formData.minimumStock}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Storage Location *</label>
                  <input
                    className="form-input"
                    name="warehouseLocation"
                    required
                    value={formData.warehouseLocation}
                    onChange={handleFormChange}
                    placeholder="e.g. WH-A-01"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal Popup — Notice currentStock is omitted completely */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Edit Product Details</span>
              <span className="modal-close-btn" onClick={() => setIsEditOpen(false)}>×</span>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {submitError && <div className="alert alert-danger">{submitError}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input
                      className="form-input"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU / Code *</label>
                    <input
                      className="form-input"
                      name="sku"
                      required
                      value={formData.sku}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹) *</label>
                    <input
                      className="form-input"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.unitPrice}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  {/* currentStock is not editable and is omitted here */}
                  <div className="form-group">
                    <label className="form-label">Minimum Alert Stock *</label>
                    <input
                      className="form-input"
                      name="minimumStock"
                      type="number"
                      min="0"
                      required
                      value={formData.minimumStock}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse Storage Location *</label>
                    <input
                      className="form-input"
                      name="warehouseLocation"
                      required
                      value={formData.warehouseLocation}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Products;
