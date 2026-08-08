import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { handleApiError } from '../services/api';
import type { Customer } from '../types';
import { useAuth } from '../hooks/useAuth';

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canEdit = user && ['ADMIN', 'SALES'].includes(user.role);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Follow-up form states
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await customerService.getCustomer(id);
      setCustomer(response.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!followUpDate || !notes.trim()) {
      setSubmitError('Please complete all follow-up fields.');
      return;
    }

    setSubmitting(true);
    try {
      await customerService.addFollowUp(id, { followUpDate, notes: notes.trim() });
      setSubmitSuccess(true);
      setFollowUpDate('');
      setNotes('');
      // Reload customer data to show new follow up details
      const response = await customerService.getCustomer(id);
      setCustomer(response.data);
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
        <p>Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Customer not found.'}
        <div style={{ marginTop: '16px' }}>
          <Link to="/customers" className="btn btn-secondary">
            Back to Customers List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/customers" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
            ← Back to Customers
          </Link>
          <h1 className="page-title" style={{ marginTop: '8px' }}>{customer.name}</h1>
        </div>
      </div>

      <div className="details-grid">
        {/* Left column: profile info */}
        <div>
          <div className="card">
            <h3 className="card-title">Customer Profile</h3>
            <div className="info-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="info-item">
                <span className="info-label">Mobile Number</span>
                <span className="info-value">{customer.mobile}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value">{customer.email}</span>
              </div>
              <div className="info-item" style={{ gridColumn: 'span 2' }}>
                <span className="info-label">Full Address</span>
                <span className="info-value">{customer.address}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Business Information</h3>
            <div className="info-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="info-item">
                <span className="info-label">Company Name</span>
                <span className="info-value">{customer.businessName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">GST Number</span>
                <span className="info-value">{customer.gstNumber || 'Not Provided'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Customer Type</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>
                  {customer.customerType.toLowerCase()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">
                  <span className={`badge ${customer.status === 'ACTIVE' ? 'badge-success' : customer.status === 'LEAD' ? 'badge-info' : 'badge-danger'}`}>
                    {customer.status}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: follow-up info & actions */}
        <div>
          <div className="card">
            <h3 className="card-title">Follow Up Schedule</h3>
            <div className="info-list" style={{ gap: '12px' }}>
              <div className="info-item">
                <span className="info-label">Next Scheduled Date</span>
                <span className="info-value" style={{ fontWeight: 600, color: customer.followUpDate ? 'var(--primary-hover)' : 'inherit' }}>
                  {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : 'No Schedule Set'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Latest Notes</span>
                <span className="info-value" style={{ fontSize: '14px', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {customer.notes || 'No follow-up notes.'}
                </span>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="card">
              <h3 className="card-title">Record Follow Up</h3>
              {submitError && <div className="alert alert-danger">{submitError}</div>}
              {submitSuccess && <div className="alert alert-success" style={{ background: 'var(--success-light)', color: '#34d399' }}>Follow up saved!</div>}

              <form onSubmit={handleFollowUpSubmit}>
                <div className="form-group">
                  <label className="form-label">Next Contact Date</label>
                  <input
                    className="form-input"
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Conversation Notes</label>
                  <textarea
                    className="form-input"
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide details about the recent interaction..."
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    disabled={submitting}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Record Interaction'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CustomerDetails;
