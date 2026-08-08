import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import type { Challan } from '../types';
import { useAuth } from '../hooks/useAuth';

export const ChallanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canModify = user && ['ADMIN', 'SALES'].includes(user.role);

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchChallanDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await challanService.getChallan(id);
      setChallan(response.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChallanDetails();
  }, [fetchChallanDetails]);

  const handleConfirm = async () => {
    if (!id || !challan) return;
    setActionError(null);

    const isConfirmed = window.confirm(
      `Are you sure you want to confirm Delivery Challan ${challan.challanNumber}? This will reduce inventory levels and cannot be undone.`
    );
    if (!isConfirmed) return;

    setActionLoading(true);
    try {
      const response = await challanService.confirmChallan(id);
      setChallan(response.data);
      alert('Challan confirmed successfully.');
    } catch (err) {
      setActionError(handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !challan) return;
    setActionError(null);

    const isCancelled = window.confirm(
      `Are you sure you want to cancel Delivery Challan ${challan.challanNumber}? This will mark it as cancelled without affecting stock levels.`
    );
    if (!isCancelled) return;

    setActionLoading(true);
    try {
      const response = await challanService.cancelChallan(id);
      setChallan(response.data);
      alert('Challan cancelled successfully.');
    } catch (err) {
      setActionError(handleApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Loading delivery challan details...</p>
      </div>
    );
  }

  if (error || !challan) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Challan record not found.'}
        <div style={{ marginTop: '16px' }}>
          <Link to="/challans" className="btn btn-secondary">
            Back to Challans List
          </Link>
        </div>
      </div>
    );
  }

  const renderBadge = (status: string) => {
    if (status === 'CONFIRMED') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'DRAFT') return <span className="badge badge-warning">Draft</span>;
    return <span className="badge badge-danger">Cancelled</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/challans" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Challans
          </Link>
          <h1 className="page-title" style={{ marginTop: '8px' }}>Challan: {challan.challanNumber}</h1>
        </div>

        {challan.status === 'DRAFT' && canModify && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-danger" onClick={handleCancel} disabled={actionLoading}>
              Cancel Challan
            </button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={actionLoading}>
              {actionLoading ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          </div>
        )}
      </div>

      {actionError && <div className="alert alert-danger" style={{ marginBottom: '24px' }}>{actionError}</div>}

      <div className="details-grid">
        {/* Left column: List of items copied at draft creation time */}
        <div className="card" style={{ padding: '24px 0 0' }}>
          <h3 className="card-title" style={{ padding: '0 24px 12px 24px' }}>Products Snapshots List</h3>
          
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {challan.items?.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '13px' }}>{item.sku}</td>
                    <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td>{item.quantity} units</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: general settings metadata */}
        <div>
          <div className="card">
            <h3 className="card-title">Challan Summary</h3>
            <div className="info-list" style={{ gap: '16px' }}>
              <div className="info-item">
                <span className="info-label">Customer / Client</span>
                <span className="info-value" style={{ fontWeight: 600 }}>
                  {challan.customer?.businessName || 'N/A'}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Name: {challan.customer?.name}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{renderBadge(challan.status)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Authoritative Total Quantity</span>
                <span className="info-value" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {challan.totalQuantity} items
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Created By</span>
                <span className="info-value">{challan.creator?.name} ({challan.creator?.email})</span>
              </div>
              <div className="info-item">
                <span className="info-label">Creation Date</span>
                <span className="info-value">{new Date(challan.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChallanDetails;
