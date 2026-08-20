import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customer.service';
import { handleApiError } from '../services/api';
import type { Customer } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { IconPlus, IconTruck, IconUsers } from '../components/common/Icons';

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  const canEdit = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { void fetchCustomer(); }, [fetchCustomer]);

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!followUpDate || !notes.trim()) {
      toast.warning('Please specify both a date and notes.');
      return;
    }
    setSubmitting(true);
    try {
      await customerService.addFollowUp(id, { followUpDate, notes: notes.trim() });
      toast.success('Follow-up recorded successfully.');
      setFollowUpDate('');
      setNotes('');
      const response = await customerService.getCustomer(id);
      setCustomer(response.data);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-24"><LoadingSkeleton lines={2} /></div>
        <div className="details-grid"><LoadingSkeleton variant="card" count={2} /></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="alert alert-danger" style={{ margin: '32px' }}>
        <strong>Error:</strong> {error || 'Customer not found.'}
        <div className="mt-16">
          <Link to="/customers" className="btn btn-secondary">Back to Customers</Link>
        </div>
      </div>
    );
  }

  const initial = (customer.businessName || customer.name || 'C').charAt(0).toUpperCase();

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <PageHeader
        title={customer.businessName || customer.name}
        subtitle={`Account ID: ${customer.id} · Managed Client`}
        backTo={{ label: 'Customers', href: '/customers' }}
        actions={
          <div className="flex-center gap-8">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/challans/new')}
            >
              <IconPlus size={14} /> New Dispatch Challan
            </button>
          </div>
        }
      />

      {/* Customer Hero Profile Header */}
      <div className="card mb-20" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className="flex-center gap-16">
            <div className="customer-avatar" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
              {initial}
            </div>
            <div>
              <div className="flex-center gap-8 mb-4">
                <h2 className="fs-18 fw-700 color-primary" style={{ margin: 0 }}>
                  {customer.businessName}
                </h2>
                {StatusBadge.customer(customer.status)}
                <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                  {customer.customerType.toLowerCase()}
                </span>
              </div>
              <div className="fs-13 color-secondary">
                Primary Contact: <span className="fw-600 color-primary">{customer.name}</span> · {customer.email} · {customer.mobile}
              </div>
            </div>
          </div>

          <div className="flex-center gap-12">
            {customer.gstNumber ? (
              <span className="badge badge-info text-mono" style={{ padding: '6px 12px', fontSize: '12px' }}>
                GSTIN: {customer.gstNumber}
              </span>
            ) : (
              <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: '12px' }}>
                Unregistered for GST
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="details-grid details-grid--wide">
        {/* Left column: Contact & Business Information */}
        <div>
          <div className="card">
            <h3 className="card-title card-title--bordered">
              <IconUsers size={16} /> Contact & Communication
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Direct Phone</span>
                <span className="info-value fw-600">{customer.mobile}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Work Email</span>
                <span className="info-value">{customer.email}</span>
              </div>
              <div className="info-item info-grid--full">
                <span className="info-label">Billing & Delivery Address</span>
                <span className="info-value">{customer.address}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title card-title--bordered">
              <IconTruck size={16} /> Business & Tax Profile
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Company Name</span>
                <span className="info-value fw-600">{customer.businessName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">GST Identification Number</span>
                <span className="info-value text-mono fw-700 color-primary">{customer.gstNumber || 'Not provided'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Client Tier</span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>{customer.customerType.toLowerCase()} Account</span>
              </div>
              <div className="info-item">
                <span className="info-label">Tax Regime</span>
                <span className="info-value">
                  {customer.gstNumber?.startsWith('27') ? 'Intra-State (CGST + SGST)' : customer.gstNumber ? 'Inter-State (IGST)' : 'Regular / Exempt'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: CRM Follow-Up & Interaction Log */}
        <div>
          <div className="card">
            <h3 className="card-title card-title--bordered">Follow-Up Schedule & Notes</h3>
            <div className="info-item mb-16">
              <span className="info-label">Next Scheduled Contact</span>
              <span className="info-value fw-700" style={{ color: customer.followUpDate ? 'var(--primary-hover)' : 'inherit', fontSize: '15px' }}>
                {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'No upcoming follow-up set'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Latest Account Log / Memo</span>
              <div style={{
                fontSize: '13px',
                background: 'var(--bg-tertiary)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginTop: '6px',
                color: customer.notes ? 'var(--text-primary)' : 'var(--text-tertiary)',
                lineHeight: '1.5',
              }}>
                {customer.notes || 'No active notes or conversation log recorded.'}
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="card">
              <h3 className="card-title card-title--bordered">Record Client Interaction</h3>
              <form onSubmit={handleFollowUpSubmit}>
                <div className="form-group">
                  <label className="form-label">Next Contact Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discussion Notes & Action Items *</label>
                  <textarea
                    className="form-input"
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., Called regarding quarterly pricing quote, agreed to follow up next Tuesday…"
                    style={{ minHeight: '90px', resize: 'vertical' }}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={submitting}
                  id="record-interaction-btn"
                >
                  {submitting ? 'Saving Interaction…' : 'Record Interaction Log'}
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
