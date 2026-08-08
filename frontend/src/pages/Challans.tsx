import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { challanService } from '../services/challan.service';
import { handleApiError } from '../services/api';
import type { Challan } from '../types';
import { useAuth } from '../hooks/useAuth';

export const Challans: React.FC = () => {
  const { user } = useAuth();
  const canCreate = user && ['ADMIN', 'SALES'].includes(user.role);

  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await challanService.getChallans({ page, limit: 10 });
      setChallans(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const renderBadge = (status: string) => {
    if (status === 'CONFIRMED') return <span className="badge badge-success">Confirmed</span>;
    if (status === 'DRAFT') return <span className="badge badge-warning">Draft</span>;
    return <span className="badge badge-danger">Cancelled</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Delivery Challans</h1>
        {canCreate && (
          <Link to="/challans/new" className="btn btn-primary">
            + New Challan
          </Link>
        )}
      </div>

      {loading ? (
        <div className="page-loader">
          <div className="spinner"></div>
          <p>Loading delivery records...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : challans.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No challans found.</p>
            {canCreate && (
              <div style={{ marginTop: '16px' }}>
                <Link to="/challans/new" className="btn btn-primary">
                  Create Draft Challan
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Customer Business</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/challans/${c.id}`} style={{ fontWeight: 700, color: 'var(--primary-hover)' }}>
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td>{c.customer?.businessName || 'N/A'}</td>
                    <td style={{ fontWeight: 600 }}>{c.totalQuantity} items</td>
                    <td>{renderBadge(c.status)}</td>
                    <td>{c.creator?.name || 'N/A'}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/challans/${c.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-footer">
            <span>
              Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, totalItems)} of {totalItems} challans
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
    </div>
  );
};
export default Challans;
