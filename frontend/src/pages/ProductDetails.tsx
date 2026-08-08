import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product, StockMovement } from '../types';
import { useAuth } from '../hooks/useAuth';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canAdjustStock = user && ['ADMIN', 'WAREHOUSE'].includes(user.role);

  // States
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Movement history pagination
  const [movPage, setMovPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [movTotalItems, setMovTotalItems] = useState(0);

  // Movement dialog forms
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    if (!id) return;
    try {
      const prodRes = await productService.getProduct(id);
      setProduct(prodRes.data);
    } catch (err) {
      setError(handleApiError(err));
    }
  }, [id]);

  const fetchProductMovements = useCallback(async () => {
    if (!id) return;
    try {
      const movRes = await productService.getStockMovements(id, { page: movPage, limit: 5 });
      setMovements(movRes.data);
      if (movRes.pagination) {
        setMovTotalPages(movRes.pagination.totalPages);
        setMovTotalItems(movRes.pagination.total);
      }
    } catch (err) {
      setError(handleApiError(err));
    }
  }, [id, movPage]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchProductDetails(), fetchProductMovements()]);
      setLoading(false);
    };
    bootstrap();
  }, [id, fetchProductDetails, fetchProductMovements]);

  // Handle page change for movements pagination
  useEffect(() => {
    fetchProductMovements();
  }, [movPage, fetchProductMovements]);

  const handleOpenMovement = (type: 'IN' | 'OUT') => {
    setMovementType(type);
    setQuantity('');
    setReason('');
    setSubmitError(null);
    setIsMovementOpen(true);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !product) return;
    setSubmitError(null);

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Quantity must be an integer greater than zero.');
      return;
    }

    if (!reason.trim()) {
      setSubmitError('Please specify a reason for this movement.');
      return;
    }

    if (movementType === 'OUT' && qty > product.currentStock) {
      setSubmitError(`Insufficient stock. Max available to pull out is ${product.currentStock}.`);
      return;
    }

    setSubmitting(true);
    try {
      await productService.createStockMovement(id, {
        type: movementType,
        quantity: qty,
        reason: reason.trim(),
      });

      setIsMovementOpen(false);
      setMovPage(1); // Reset page to view latest movement
      
      // Reload details to show updated stock level and log
      await Promise.all([fetchProductDetails(), fetchProductMovements()]);
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Loading inventory details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Product not found.'}
        <div style={{ marginTop: '16px' }}>
          <Link to="/products" className="btn btn-secondary">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const isLowStock = product.currentStock <= product.minimumStock;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/products" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Products Catalog
          </Link>
          <h1 className="page-title" style={{ marginTop: '8px' }}>{product.name}</h1>
        </div>

        {canAdjustStock && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-success" onClick={() => handleOpenMovement('IN')}>
              Stock IN (+)
            </button>
            <button className="btn btn-danger" onClick={() => handleOpenMovement('OUT')}>
              Stock OUT (-)
            </button>
          </div>
        )}
      </div>

      <div className="details-grid">
        {/* Left column: Core Product Information */}
        <div>
          <div className="card">
            <h3 className="card-title">Inventory Parameters</h3>
            <div className="info-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="info-item">
                <span className="info-label">SKU / Code</span>
                <span className="info-value" style={{ fontFamily: 'var(--mono)' }}>{product.sku}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category</span>
                <span className="info-value">{product.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Storage Location</span>
                <span className="info-value">{product.warehouseLocation}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Unit Catalog Price</span>
                <span className="info-value">₹{Number(product.unitPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Inventory Quantities</h3>
            <div className="info-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="info-item">
                <span className="info-label">Current Stock Level</span>
                <span 
                  className="info-value" 
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: 700, 
                    color: isLowStock ? 'var(--danger)' : 'var(--success)' 
                  }}
                >
                  {product.currentStock}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Minimum Stock Alert</span>
                <span className="info-value" style={{ fontSize: '24px', fontWeight: 700 }}>
                  {product.minimumStock}
                </span>
              </div>
            </div>
            {isLowStock && (
              <div className="alert alert-danger" style={{ marginTop: '20px', marginBottom: 0 }}>
                ⚠️ <strong>Low Stock Alert!</strong> Current stock levels are below the required threshold.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Movement Log history */}
        <div>
          <div className="card" style={{ padding: '24px 0 0' }}>
            <h3 className="card-title" style={{ padding: '0 24px 12px 24px' }}>Movement History</h3>
            
            {movements.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>No stock movements logged.</p>
              </div>
            ) : (
              <div>
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 16px' }}>Type</th>
                      <th style={{ padding: '10px 16px' }}>Qty</th>
                      <th style={{ padding: '10px 16px' }}>Reason</th>
                      <th style={{ padding: '10px 16px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={m.type === 'IN' ? 'movement-badge-IN' : 'movement-badge-OUT'}>
                            {m.type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{m.quantity}</td>
                        <td style={{ padding: '10px 16px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.reason}>
                          {m.reason}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Sub pagination */}
                <div className="pagination-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                  <span style={{ fontSize: '12px' }}>Total: {movTotalItems} items</span>
                  <div className="pagination-controls" style={{ gap: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      disabled={movPage === 1}
                      onClick={() => setMovPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: '12px' }}>{movPage} / {movTotalPages}</span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      disabled={movPage === movTotalPages}
                      onClick={() => setMovPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isMovementOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Record Stock {movementType}</span>
              <span className="modal-close-btn" onClick={() => setIsMovementOpen(false)}>×</span>
            </div>
            <form onSubmit={handleMovementSubmit}>
              <div className="modal-body">
                {submitError && <div className="alert alert-danger">{submitError}</div>}

                <div className="form-group">
                  <label className="form-label">Adjust Quantity *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity to adjust"
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for movement *</label>
                  <input
                    className="form-input"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={movementType === 'IN' ? 'e.g. Purchase order #123' : 'e.g. Defective return'}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsMovementOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : `Record Stock ${movementType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductDetails;
