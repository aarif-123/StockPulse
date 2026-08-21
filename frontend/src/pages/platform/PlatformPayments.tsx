import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import type { PaymentRequest } from '../../types';

export const PlatformPayments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Rejection Reason Modal State
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Proof Image Preview Modal State
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter ? `/platform/payments?status=${statusFilter}` : '/platform/payments';
      const res = await api.get(url);
      const data = res.data.data || [];
      setPayments(data);
      if (statusFilter === 'PENDING') {
        window.dispatchEvent(new CustomEvent('payments-updated', { detail: { count: data.length } }));
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const handleReviewPayment = async (paymentId: string, approve: boolean, reason?: string) => {
    setError(null);
    try {
      await api.post(`/platform/payments/${paymentId}/review`, {
        approved: approve,
        rejectionReason: reason,
      });
      setActionSuccess(`Payment request successfully ${approve ? 'APPROVED' : 'REJECTED'}.`);
      setRejectingPaymentId(null);
      setRejectionReason('');
      window.dispatchEvent(new CustomEvent('payments-updated'));
      void fetchPayments();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
          💳 Financial Payment Approvals & Verification Queue
        </h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Review manual UPI QR payments, verify bank UTR reference numbers, and manage automatic tenant plan activation.
        </p>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 }}>
          ✕ {error}
        </div>
      )}

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', marginBottom: '24px' }}>
        {[
          { id: 'PENDING', label: '⏳ Pending Review' },
          { id: 'APPROVED', label: '✓ Approved' },
          { id: 'REJECTED', label: '✕ Rejected' },
          { id: '', label: 'All Requests' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: isActive ? '#1e293b' : 'transparent',
                borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                color: isActive ? '#f8fafc' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Payment Requests Table */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading payment verification queue...
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No payment requests found for the selected filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>Organization</th>
                <th style={{ padding: '14px 16px' }}>Plan & Amount</th>
                <th style={{ padding: '14px 16px' }}>Reference / UTR</th>
                <th style={{ padding: '14px 16px' }}>Submitted By</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>
                      {p.organization ? p.organization.name : 'Unknown Org'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                      {p.organization ? p.organization.slug : ''}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '14px', fontFamily: 'monospace' }}>
                      ₹{p.amountINR}
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
                      {p.plan ? p.plan.name : 'Subscription Plan'} ({p.billingCycle})
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>
                      {p.referenceNumber}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                      Method: {p.paymentMethod}
                    </div>
                    {p.proofUrl && (
                      <button
                        onClick={() => setPreviewProofUrl(p.proofUrl!)}
                        style={{
                          marginTop: '4px',
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                        }}
                      >
                        View Payment Receipt 🖼️
                      </button>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {p.submitter ? p.submitter.name : 'User'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                      {p.submitter ? p.submitter.email : ''}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>
                      {new Date(p.submittedAt).toLocaleString()}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          p.status === 'APPROVED'
                            ? 'rgba(34,197,94,0.15)'
                            : p.status === 'REJECTED'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          p.status === 'APPROVED'
                            ? '#4ade80'
                            : p.status === 'REJECTED'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {p.status}
                    </span>
                    {p.rejectionReason && (
                      <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                        Reason: {p.rejectionReason}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {p.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleReviewPayment(p.id, true)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: '#22c55e',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                          }}
                        >
                          Approve & Activate
                        </button>
                        <button
                          onClick={() => setRejectingPaymentId(p.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>
                        Reviewed by {p.reviewer ? p.reviewer.name : 'System'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectingPaymentId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '440px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#ef4444', fontWeight: 800 }}>
              Reject Payment Request
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
              Please provide a clear reason for rejecting this payment submission (e.g. UTR mismatch, invalid screenshot).
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection rationale..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '13px',
                marginBottom: '16px',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setRejectingPaymentId(null)}
                style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewPayment(rejectingPaymentId, false, rejectionReason)}
                style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {previewProofUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '15px' }}>Payment Proof Attachment</h3>
              <button onClick={() => setPreviewProofUrl(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <img src={previewProofUrl} alt="Payment Proof" style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformPayments;
