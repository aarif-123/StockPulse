import React, { useState } from 'react';
import { productService } from '../../services/product.service';
import { handleApiError } from '../../services/api';
import type { Product } from '../../types';

interface QuickStockModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: Product, quantity: number, type: 'IN' | 'OUT') => void;
}

export const QuickStockModal: React.FC<QuickStockModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Purchase Order Inward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTypeChange = (type: 'IN' | 'OUT') => {
    setMovementType(type);
    if (type === 'IN') {
      setReason('Purchase Order Inward');
    } else {
      setReason('Damaged / Scrap Write-off');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (movementType === 'OUT' && qty > product.currentStock) {
      setError(`Cannot deduct ${qty} units. Only ${product.currentStock} units are currently in stock.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await productService.createStockMovement(product.id, {
        quantity: qty,
        type: movementType,
        reason: reason.trim() || (movementType === 'IN' ? 'Quick Stock Inward' : 'Quick Stock Outward'),
      });
      onSuccess(res.data.product, qty, movementType);
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
            <h2 className="modal-title">Quick Stock Adjustment</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Modifying inventory for <strong>{product.name}</strong> ({product.sku})
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" type="button" style={{ fontSize: '20px', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
            ×
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
          alignItems: 'center',
          border: '1px solid var(--border-color)'
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
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Adjustment Direction</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${movementType === 'IN' ? 'btn-success' : 'btn-secondary'} flex-1`}
                onClick={() => handleTypeChange('IN')}
                style={{ padding: '8px 12px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '6px' }}
              >
                ➕ Inward (Add)
              </button>
              <button
                type="button"
                className={`btn ${movementType === 'OUT' ? 'btn-danger' : 'btn-secondary'} flex-1`}
                onClick={() => handleTypeChange('OUT')}
                style={{ padding: '8px 12px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '6px' }}
              >
                ➖ Outward (Deduct)
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" htmlFor="quick-qty" style={{ marginBottom: '6px', display: 'block' }}>
              Quantity {movementType === 'IN' ? 'to Add' : 'to Deduct'} <span style={{ color: 'var(--danger)' }}>*</span>
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
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" htmlFor="quick-reason" style={{ marginBottom: '6px', display: 'block' }}>
              Reason for Adjustment
            </label>
            <input
              type="text"
              id="quick-reason"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier Inward / Damage check"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${movementType === 'IN' ? 'btn-success' : 'btn-danger'}`}
              disabled={loading}
              id="submit-quick-stock-btn"
              style={{ padding: '8px 16px', fontWeight: 600 }}
            >
              {loading ? 'Processing...' : movementType === 'IN' ? `Add ${quantity || 0} Units` : `Deduct ${quantity || 0} Units`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
