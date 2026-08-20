import React, { useState } from 'react';
import { productService } from '../../services/product.service';
import { handleApiError } from '../../services/api';
import type { Product } from '../../types';

interface QuickStockModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: Product, addedQuantity: number) => void;
}

export const QuickStockModal: React.FC<QuickStockModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Purchase Order Inward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await productService.createStockMovement(product.id, {
        quantity: qty,
        type: 'IN',
        reason: reason.trim() || 'Quick Stock Inward',
      });
      onSuccess(res.data.product, qty);
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Quick Stock Inward</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Replenishing <strong>{product.name}</strong> ({product.sku})
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}

        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Current Stock</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {product.currentStock} units
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Min Threshold</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--warning)' }}>
              {product.minimumStock} units
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="quick-qty">
              Units to Add <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="number"
              id="quick-qty"
              min="1"
              step="1"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="quick-reason">
              Inward Reason
            </label>
            <input
              type="text"
              id="quick-reason"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. PO #1092 / Supplier Delivery"
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="submit-quick-stock-btn"
            >
              {loading ? 'Adding Stock...' : `+ Add ${quantity || 0} Units`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
