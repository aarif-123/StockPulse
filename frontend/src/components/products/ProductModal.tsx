/**
 * Product modal — handles both Add and Edit modes.
 * The key distinction: Add includes Initial Stock, Edit omits currentStock
 * (stock is only modified through explicit stock-in/out movements).
 */

import React from 'react';

export interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  currentStock: string; // Only used in Add mode
  minimumStock: string;
  warehouseLocation: string;
}

const CATEGORIES = [
  'Computer Accessories',
  'Office Equipment',
  'Networking',
  'Software Licenses',
  'Storage Devices',
];

interface ProductModalProps {
  mode: 'add' | 'edit';
  formData: ProductFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitError: string | null;
  submitting: boolean;
}

export function ProductModal({
  mode,
  formData,
  onChange,
  onSubmit,
  onClose,
  submitError,
  submitting,
}: ProductModalProps): React.ReactElement {
  const isAdd = mode === 'add';

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label={isAdd ? 'Add New Product' : 'Edit Product Details'}>
      <div className="modal-dialog">
        <div className="modal-header">
          <span className="modal-title">{isAdd ? 'Add New Product' : 'Edit Product Details'}</span>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal" type="button">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
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
                  onChange={onChange}
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
                  onChange={onChange}
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
                  onChange={onChange}
                  required
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => (
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
                  onChange={onChange}
                  placeholder="e.g. 499.00"
                />
              </div>
            </div>

            <div className="form-row">
              {/* Initial stock only shown on Add — Edit uses stock movements */}
              {isAdd && (
                <div className="form-group">
                  <label className="form-label">Initial Stock Level *</label>
                  <input
                    className="form-input"
                    name="currentStock"
                    type="number"
                    min="0"
                    required
                    value={formData.currentStock}
                    onChange={onChange}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Minimum Alert Stock *</label>
                <input
                  className="form-input"
                  name="minimumStock"
                  type="number"
                  min="0"
                  required
                  value={formData.minimumStock}
                  onChange={onChange}
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
                onChange={onChange}
                placeholder="e.g. WH-A-01"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? isAdd ? 'Creating...' : 'Saving...'
                : isAdd ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
