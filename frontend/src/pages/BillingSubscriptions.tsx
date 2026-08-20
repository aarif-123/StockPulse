import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, handleApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/common/PageHeader';
import { IconCheck } from '../components/common/Icons';
import type { Plan, PaymentRequest } from '../types';

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt?: string | null;
  };
  plan: {
    id: string;
    name: string;
    code: string;
    monthlyPriceINR: number;
    yearlyPriceINR: number;
    allowedFeatures: string[];
  };
  usage: {
    users: { current: number; limit: number };
    products: { current: number; limit: number };
    customers: { current: number; limit: number };
    transactions: { current: number; limit: number };
    warehouses: { current: number; limit: number };
  };
}

export const BillingSubscriptions: React.FC = () => {
  const { activeOrg } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upgrade / Manual UPI Payment Modal State
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('YEARLY');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, plansRes, histRes] = await Promise.all([
        api.get('/organizations/subscription'),
        api.get('/payments/plans'),
        api.get('/payments/history'),
      ]);

      setSubData(subRes.data.data);
      setAvailablePlans(plansRes.data.data);
      setPaymentHistory(histRes.data.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeOrg?.organizationId]);

  // Watch query parameters to auto-open upgrade modal
  useEffect(() => {
    if (availablePlans.length > 0) {
      const qPlanId = searchParams.get('planId');
      const qCycle = searchParams.get('billingCycle')?.toUpperCase();

      if (qPlanId) {
        // Map query planId to database plan
        const matchedPlan = availablePlans.find(
          (p) =>
            p.id === qPlanId ||
            p.code === qPlanId ||
            (qPlanId === 'BASIC' && p.code === 'starter_v1') ||
            (qPlanId === 'PREMIUM' && p.code === 'growth_v1') ||
            (qPlanId === 'ENTERPRISE' && p.code === 'enterprise_v1')
        );

        if (matchedPlan) {
          setSelectedPlanForUpgrade(matchedPlan);
          if (qCycle === 'MONTHLY' || qCycle === 'YEARLY') {
            setBillingCycle(qCycle as 'MONTHLY' | 'YEARLY');
          }
          
          // Clear query params so they don't persist on page reload/refresh
          setSearchParams({}, { replace: true });
        }
      }
    }
  }, [availablePlans, searchParams, setSearchParams]);

  const handleSubmitUpiPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForUpgrade) return;
    setSubmittingPayment(true);
    setError(null);
    try {
      await api.post('/payments/manual-upi', {
        planId: selectedPlanForUpgrade.id,
        billingCycle,
        referenceNumber: utrNumber.trim(),
      });
      setSuccess(`Payment request submitted for ${selectedPlanForUpgrade.name}. Super Admin will verify UTR shortly.`);
      setSelectedPlanForUpgrade(null);
      setUtrNumber('');
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const calculateUsagePct = (current: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  return (
    <div>
      <PageHeader
        title="Billing & Subscription Plans"
        subtitle="Manage your SaaS subscription, monitor active resource quotas, and upgrade plans."
      />

      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: 'var(--success-light)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          <IconCheck size={16} />
          {success}
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '13.5px',
            fontWeight: 500,
          }}
        >
          ✕ {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading subscription details...</p>
        </div>
      ) : (
        <>
          {/* Current Active Plan Overview & Quota Gauges */}
          {subData && (
            <div className="card" style={{ padding: '28px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {subData.plan.name}
                    </h2>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: subData.subscription.status === 'ACTIVE' ? 'var(--success-light)' : 'var(--warning-light)',
                        color: subData.subscription.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)',
                        border: subData.subscription.status === 'ACTIVE' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(234,179,8,0.3)',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      ● {subData.subscription.status}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                    Valid until <strong style={{ color: 'var(--text-primary)' }}>{new Date(subData.subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> ({subData.subscription.billingCycle.toLowerCase()} cycle)
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary-hover)', fontFamily: 'var(--font-mono)' }}>
                    ₹{(subData.subscription.billingCycle === 'YEARLY' ? subData.plan.yearlyPriceINR : subData.plan.monthlyPriceINR).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>billed {subData.subscription.billingCycle.toLowerCase()}</div>
                </div>
              </div>

              {/* Quota Progress Bars */}
              <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Resource Utilization vs Plan Quotas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {[
                  { label: 'Products (SKUs)', current: subData.usage.products.current, limit: subData.usage.products.limit },
                  { label: 'Customers (CRM)', current: subData.usage.customers.current, limit: subData.usage.customers.limit },
                  { label: 'User Seats', current: subData.usage.users.current, limit: subData.usage.users.limit },
                  { label: 'Monthly Transactions', current: subData.usage.transactions.current, limit: subData.usage.transactions.limit },
                ].map((q) => {
                  const pct = calculateUsagePct(q.current, q.limit);
                  const isNearLimit = pct >= 80;
                  return (
                    <div
                      key={q.label}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q.label}</span>
                        <span style={{ color: isNearLimit ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {q.current} / {q.limit}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: isNearLimit ? 'var(--danger)' : 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upgrade Commercial Plans Grid */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Available Commercial Plans
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {availablePlans.map((plan) => {
                const isCurrentPlan = subData?.plan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    className="card"
                    style={{
                      border: isCurrentPlan ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: isCurrentPlan ? '0 0 0 1px var(--primary-light), var(--shadow-md)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      margin: 0,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</h3>
                        {isCurrentPlan && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--primary-light)',
                              color: 'var(--primary-hover)',
                              border: '1px solid var(--primary-border)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 16px 0', minHeight: '38px' }}>
                        {plan.description}
                      </p>
                      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
                        ₹{Number(plan.yearlyPriceINR).toLocaleString()} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 400 }}>/ year</span>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: '6px' }}>• Up to <strong style={{ color: 'var(--text-primary)' }}>{plan.maxUsers}</strong> User seats</div>
                        <div style={{ marginBottom: '6px' }}>• Up to <strong style={{ color: 'var(--text-primary)' }}>{plan.maxProducts}</strong> Products</div>
                        <div style={{ marginBottom: '6px' }}>• Up to <strong style={{ color: 'var(--text-primary)' }}>{plan.maxCustomers}</strong> Customers</div>
                        <div style={{ marginBottom: '6px' }}>• Up to <strong style={{ color: 'var(--text-primary)' }}>{plan.maxTransactions}</strong> Tx/mo</div>
                      </div>

                      <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {plan.allowedFeatures.map((f) => (
                          <span
                            key={f}
                            style={{
                              fontSize: '10.5px',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPlanForUpgrade(plan)}
                      disabled={isCurrentPlan}
                      className={`btn ${isCurrentPlan ? 'btn-secondary' : 'btn-primary'}`}
                      style={{
                        marginTop: '24px',
                        width: '100%',
                        padding: '10px',
                        fontSize: '13.5px',
                      }}
                    >
                      {isCurrentPlan ? 'Active Plan' : `Upgrade via UPI QR`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Requests & Invoices History */}
          {paymentHistory.length > 0 && (
            <div className="table-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Payment Verification History
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  Track your manual UPI payment requests and approval statuses.
                </p>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan Tier</th>
                      <th>Billing Cycle</th>
                      <th>Amount Paid</th>
                      <th>UTR / Reference</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                          {new Date(p.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.plan?.name || p.planId}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.billingCycle}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          ₹{Number(p.amountINR).toLocaleString()}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {p.referenceNumber}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: p.status === 'APPROVED' ? 'var(--success-light)' : p.status === 'PENDING' ? 'var(--warning-light)' : 'var(--danger-light)',
                              color: p.status === 'APPROVED' ? 'var(--success)' : p.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            ● {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Manual UPI Upgrade Modal */}
      {selectedPlanForUpgrade && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPlanForUpgrade(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-lg)',
              margin: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Upgrade to {selectedPlanForUpgrade.name}
              </h2>
              <button
                className="btn-icon"
                onClick={() => setSelectedPlanForUpgrade(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUpiPayment}>
              {/* Billing Cycle Toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`btn ${billingCycle === 'YEARLY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Yearly (Save 15%) — ₹{Number(selectedPlanForUpgrade.yearlyPriceINR).toLocaleString()}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`btn ${billingCycle === 'MONTHLY' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '10px' }}
                >
                  Monthly — ₹{Number(selectedPlanForUpgrade.monthlyPriceINR).toLocaleString()}
                </button>
              </div>

              {/* UPI Payment Instructions Box */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                  <img
                    src="/payment_qr.jpg"
                    alt="UPI Payment QR Code"
                    style={{
                      width: '200px',
                      height: 'auto',
                      borderRadius: '12px',
                      border: '4px solid #fff',
                      boxShadow: 'var(--shadow-md)',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Scan this QR code with any UPI app to pay
                  </div>
                </div>
                
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
                  UPI ID (Selectable)
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary-hover)', fontFamily: 'var(--font-mono)', marginBottom: '8px', userSelect: 'all' }}>
                  mohdaarif92422@oksbi
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                  Payee Name: <strong style={{ color: 'var(--text-primary)' }}>Mohmmed Aarif</strong>
                  <br />
                  Amount: <strong style={{ color: 'var(--primary-hover)', fontSize: '14.5px', fontFamily: 'var(--font-mono)' }}>₹{Number(billingCycle === 'YEARLY' ? selectedPlanForUpgrade.yearlyPriceINR : selectedPlanForUpgrade.monthlyPriceINR).toLocaleString()}</strong>
                </div>
              </div>

              {/* UTR Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  12-Digit UPI Transaction Reference Number (UTR / Ref ID)
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9A-Za-z-]{8,24}"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="search-input"
                  placeholder="e.g. 423891028392"
                  style={{ width: '100%', fontSize: '14px', padding: '10px 14px', fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Found on your UPI payment confirmation screen.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="btn btn-primary"
                >
                  {submittingPayment ? 'Submitting...' : 'Submit UTR for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSubscriptions;
