import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../services/product.service';
import { handleApiError } from '../services/api';
import type { Product, StockMovement } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { calculateInventoryVelocity } from '../utils/inventoryVelocity';
import { IconPlus, IconAlertTriangle } from '../components/common/Icons';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const canAdjustStock = hasRole(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']);

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
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchProductDetails(), fetchProductMovements()]);
      if (mounted) setLoading(false);
    };
    void loadAll();
    return () => {
      mounted = false;
    };
  }, [fetchProductDetails, fetchProductMovements]);

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

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Quantity must be a positive integer.');
      return;
    }

    if (movementType === 'OUT' && qty > product.currentStock) {
      setSubmitError(`Cannot deduct ${qty} units. Current stock is only ${product.currentStock}.`);
      return;
    }

    if (!reason.trim()) {
      setSubmitError('Please specify the reason for this inventory movement.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await productService.createStockMovement(id, {
        quantity: qty,
        type: movementType,
        reason: reason.trim(),
      });

      setIsMovementOpen(false);
      setMovPage(1);
      toast.success(`Stock ${movementType} (${qty} units) recorded successfully.`);
      await Promise.all([fetchProductDetails(), fetchProductMovements()]);
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-24">
          <LoadingSkeleton lines={2} />
        </div>
        <div className="details-grid">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Product not found.'}
        <div className="mt-16">
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
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title={product.name}
        subtitle={`${product.category} · SKU: ${product.sku}`}
        backTo={{ label: 'Products Catalog', href: '/products' }}
        actions={
          canAdjustStock && (
            <div className="flex-center gap-8">
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleOpenMovement('IN')}
                id="stock-in-btn"
              >
                <IconPlus size={13} /> Stock IN
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleOpenMovement('OUT')}
                id="stock-out-btn"
              >
                - Stock OUT
              </button>
            </div>
          )
        }
      />

      <div className="details-grid">
        {/* Left column: Core Product Information */}
        <div>
          <div className="card">
            <h3 className="card-title card-title--bordered">Inventory Parameters</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">SKU / Code</span>
                <span className="info-value text-mono">{product.sku}</span>
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
            <h3 className="card-title card-title--bordered">Inventory Quantities</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Current Stock Level</span>
                <span
                  className="info-value"
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: isLowStock ? 'var(--danger)' : 'var(--success)',
                  }}
                >
                  {product.currentStock} units
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Minimum Safety Level</span>
                <span className="info-value" style={{ fontSize: '24px', fontWeight: 700 }}>
                  {product.minimumStock} units
                </span>
              </div>
            </div>
            {isLowStock && (
              <div className="alert alert-danger" style={{ marginTop: '16px', marginBottom: 0 }}>
                <IconAlertTriangle size={16} />
                <span><strong>Low Stock Alert!</strong> Current stock level is at or below minimum threshold.</span>
              </div>
            )}
          </div>

          {/* Predictive Velocity & Stock Runway Card */}
          {(() => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentOutflow = movements
              .filter((m) => m.type === 'OUT' && new Date(m.createdAt) >= sevenDaysAgo)
              .reduce((acc, m) => acc + m.quantity, 0);
            const velocity = calculateInventoryVelocity(product.currentStock, recentOutflow, 7);

            return (
              <div className="card">
                <div className="flex-between mb-12">
                  <h3 className="card-title" style={{ margin: 0 }}>Predictive Stock Runway</h3>
                  <span className={`badge ${velocity.badgeClass}`}>
                    {velocity.statusLabel}
                  </span>
                </div>

                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">7-Day Outflow Velocity</span>
                    <span className="info-value fw-600">
                      {recentOutflow} units (~{velocity.dailyRunRate}/day)
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Estimated Days Left</span>
                    <span className="info-value fw-700" style={{ fontSize: '18px' }}>
                      {velocity.daysRemaining !== null ? `${velocity.daysRemaining} days` : 'Stable / No Burn'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right column: Movement Log history */}
        <div>
          <div className="card" style={{ padding: '20px 0 0' }}>
            <h3 className="card-title card-title--bordered" style={{ padding: '0 20px 12px 20px', margin: 0 }}>
              Stock Movement History
            </h3>

            {movements.length === 0 ? (
              <div style={{ padding: '20px' }}>
                <EmptyState
                  title="No stock movements logged"
                  description="All adjustments and delivery deductions for this SKU will appear here."
                />
              </div>
            ) : (
              <div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span className={`badge ${m.type === 'IN' ? 'badge-success' : 'badge-danger'}`}>
                            {m.type === 'IN' ? '▲ IN' : '▼ OUT'}
                          </span>
                        </td>
                        <td className="fw-600">
                          <span style={{ color: m.type === 'IN' ? 'var(--success)' : 'var(--danger)' }}>
                            {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </td>
                        <td
                          style={{
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={m.reason}
                        >
                          {m.reason}
                        </td>
                        <td className="color-secondary fs-12">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Sub pagination */}
                <div
                  className="pagination-footer"
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <span className="fs-12">Total: {movTotalItems} movements</span>
                  <Pagination
                    currentPage={movPage}
                    totalPages={movTotalPages}
                    onPageChange={setMovPage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isMovementOpen && (
        <div className="modal-overlay" role="dialog" aria-modal aria-label={`Record Stock ${movementType}`}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">Record Stock {movementType}</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMovementOpen(false)}
                aria-label="Close modal"
              >
                ×
              </button>
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
                    placeholder={movementType === 'IN' ? 'e.g. Purchase shipment #123' : 'e.g. Damaged / Return'}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMovementOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  id="submit-movement-btn"
                >
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
