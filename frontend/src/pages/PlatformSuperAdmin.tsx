import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, handleApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { AuditLogItem, PaymentRequest, Plan } from '../types';

interface PlatformOverview {
  metrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    totalUsers: number;
    activeSubscriptions: number;
    pendingPaymentRequests: number;
    totalAuditLogs: number;
  };
  systemHealth: {
    dbStatus: string;
    dbLatencyMs: number;
    uptime: number;
    environment: string;
  };
}

interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
  currency: string;
  businessGstin?: string;
  businessEmail?: string;
  createdAt: string;
  activeSubscription?: {
    id: string;
    status: string;
    planName: string;
    planCode: string;
    currentPeriodEnd: string;
  } | null;
  counts: {
    memberships: number;
    customers: number;
    products: number;
    challans: number;
  };
}

interface PlatformSuperAdminProps {
  initialTab?: 'overview' | 'organizations' | 'payments' | 'plans' | 'support' | 'audit';
}

export const PlatformSuperAdmin: React.FC<PlatformSuperAdminProps> = ({ initialTab = 'overview' }) => {
  const { startSupportSession } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'payments' | 'plans' | 'support' | 'audit'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [organizations, setOrganizations] = useState<OrgListItem[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Organization Modal State
  const [showOrgModal, setShowOrgModal] = useState<boolean>(false);
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    businessGstin: '',
    planCode: 'growth_v1',
  });

  // Support Session Impersonation Modal State
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [supportForm, setSupportForm] = useState({
    targetOrganizationId: '',
    targetUserId: '',
    reason: '',
    durationMinutes: 60,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, orgsRes, payRes, plnRes, audRes] = await Promise.all([
        api.get('/platform/overview'),
        api.get('/platform/organizations'),
        api.get('/platform/payments'),
        api.get('/platform/plans'),
        api.get('/platform/audit'),
      ]);

      setOverview(ovRes.data.data);
      setOrganizations(orgsRes.data.data);
      setPayments(payRes.data.data);
      setPlans(plnRes.data.data);
      setAuditLogs(audRes.data.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/platform/organizations', orgForm);
      setShowOrgModal(false);
      setActionSuccess(`Tenant Organization '${orgForm.name}' provisioned successfully.`);
      setOrgForm({
        name: '',
        slug: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        businessGstin: '',
        planCode: 'growth_v1',
      });
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleUpdateOrgStatus = async (orgId: string, status: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await api.patch(`/platform/organizations/${orgId}/status`, { status });
      setActionSuccess(`Organization status updated to ${status}.`);
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleReviewPayment = async (paymentId: string, approve: boolean) => {
    try {
      await api.post(`/platform/payments/${paymentId}/review`, { approve });
      setActionSuccess(`Payment request ${approve ? 'APPROVED' : 'REJECTED'}.`);
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleLaunchSupportSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/platform/support-session/start', supportForm);
      const { session, impersonationToken, targetUser, targetOrganization } = response.data.data;
      
      const targetOrgSummary = {
        organizationId: targetOrganization.id,
        organizationName: targetOrganization.name,
        organizationSlug: targetOrganization.slug,
        role: 'ORG_ADMIN' as const,
        status: 'ACTIVE',
      };

      const targetUserObj = {
        ...targetUser,
        isSuperAdmin: false,
        role: 'ORG_ADMIN' as const,
      };

      startSupportSession(impersonationToken, session.id, targetUserObj, targetOrgSummary);
      setShowSupportModal(false);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            👑 Global SaaS Platform Administration
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
            Tenant organization directory, commercial licensing limits, and payment approval queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowOrgModal(true)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13.5px' }}
          >
            + Provision Tenant Org
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--success-light)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontWeight: 500, fontSize: '13.5px' }}>
          ✓ {actionSuccess}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontWeight: 500, fontSize: '13.5px' }}>
          ✕ {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        {[
          { id: 'overview', label: '📊 System Health & Metrics', path: '/platform' },
          { id: 'organizations', label: `🏢 Organizations (${organizations.length})`, path: '/platform/organizations' },
          { id: 'payments', label: `💳 Payment Approvals (${payments.filter((p) => p.status === 'PENDING').length} Pending)`, path: '/platform/payments' },
          { id: 'plans', label: `📦 Plan Tiers (${plans.length})`, path: '/platform/plans' },
          { id: 'support', label: '🔒 Support Sessions', path: '/platform/support' },
          { id: 'audit', label: '📜 Global Audit Trail', path: '/platform/audit' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                padding: '10px 18px',
                border: 'none',
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading platform telemetry...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Organizations</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>{overview.metrics.totalOrganizations}</div>
                  <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>{overview.metrics.activeOrganizations} active tenants</div>
                </div>

                <div className="card" style={{ padding: '20px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Subscriptions</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--primary-hover)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>{overview.metrics.activeSubscriptions}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Commercial tiers</div>
                </div>

                <div className="card" style={{ padding: '20px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending UPI Approvals</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: overview.metrics.pendingPaymentRequests > 0 ? 'var(--warning)' : 'var(--success)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                    {overview.metrics.pendingPaymentRequests}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Requires UTR check</div>
                </div>

                <div className="card" style={{ padding: '20px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Registered Users</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>{overview.metrics.totalUsers}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Across all tenant orgs</div>
                </div>

                <div className="card" style={{ padding: '20px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>PostgreSQL Latency</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: overview.systemHealth.dbLatencyMs <= 80 ? '#22c55e' : overview.systemHealth.dbLatencyMs <= 150 ? '#eab308' : '#ef4444',
                    marginTop: '6px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {overview.systemHealth.dbLatencyMs} ms
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: overview.systemHealth.dbLatencyMs <= 80 ? '#22c55e' : overview.systemHealth.dbLatencyMs <= 150 ? '#eab308' : '#ef4444',
                    marginTop: '4px',
                    fontWeight: 600
                  }}>
                    {overview.systemHealth.dbLatencyMs <= 80 ? '● Excellent' : overview.systemHealth.dbLatencyMs <= 150 ? '● Normal' : '● High DB Latency'}
                  </div>
                </div>
              </div>

              {/* Context & Platform Governance Description */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {/* Platform Governance Context Card */}
                <div className="card" style={{ padding: '24px', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 className="card-title" style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🛡️</span> SaaS Operator Governance
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6' }}>
                      This administrative command center allows global platform management for the StockPulse multi-tenant cluster. As a Super Admin, you are authorized to provision brand new tenant business spaces, supervise commercial subscriptions, audit platform-wide payment approvals, and initiate secure diagnostics via timed customer impersonation sessions.
                    </p>
                  </div>
                  <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)', fontSize: '12.5px', color: '#fbbf24' }}>
                    <strong>Rule of Least Privilege:</strong> Every write operation and impersonation session is logged irreversibly to the immutable Global Audit Trail.
                  </div>
                </div>

                {/* Operations Quick Hub */}
                <div className="card" style={{ padding: '24px', margin: 0, border: '1px solid var(--border-color)' }}>
                  <h3 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚡</span> Global Operations Hub
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                      onClick={() => navigate('/platform/organizations')}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>🏢</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Tenant Registry</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Provision and suspend orgs</div>
                    </button>

                    <button
                      onClick={() => navigate('/platform/payments')}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>💳</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Payment Queue</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Approve UPI registrations</div>
                    </button>

                    <button
                      onClick={() => navigate('/platform/support')}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>🔒</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Support Diagnostics</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Impersonate customer views</div>
                    </button>

                    <button
                      onClick={() => navigate('/platform/audit')}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>📜</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Audit Logs</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Investigate access activity</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* System Details */}
              <div className="card" style={{ padding: '24px', border: '1px solid var(--border-color)' }}>
                <h3 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Platform Runtime & Infrastructure</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '13.5px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Database Engine:</span> <strong style={{ color: 'var(--text-primary)' }}>PostgreSQL (Supabase Pooler)</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span> <strong style={{ color: 'var(--text-primary)' }}>{Math.floor(overview.systemHealth.uptime / 60)} minutes</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Node Environment:</span> <strong style={{ color: 'var(--text-primary)' }}>{overview.systemHealth.environment}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Audit Log Records:</span> <strong style={{ color: 'var(--text-primary)' }}>{overview.metrics.totalAuditLogs} events</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATIONS */}
          {activeTab === 'organizations' && (
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Organization Name</th>
                      <th>Slug / Subdomain</th>
                      <th>Active Plan</th>
                      <th>Status</th>
                      <th>Usage (Users/Products/Challans)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {org.name}
                          {org.businessGstin && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              GSTIN: {org.businessGstin}
                            </div>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>{org.slug}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'var(--primary-light)',
                              color: 'var(--primary-hover)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {org.activeSubscription?.planName || 'Free Tier'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: org.status === 'ACTIVE' ? 'var(--success-light)' : 'var(--warning-light)',
                              color: org.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            ● {org.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {org.counts.memberships} users • {org.counts.products} SKUs • {org.counts.challans} challans
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {org.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleUpdateOrgStatus(org.id, 'SUSPENDED')}
                                className="btn btn-sm btn-danger"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateOrgStatus(org.id, 'ACTIVE')}
                                className="btn btn-sm btn-success"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSupportForm({
                                  targetOrganizationId: org.id,
                                  targetUserId: '',
                                  reason: `Investigating tenant issue for ${org.name}`,
                                  durationMinutes: 60,
                                });
                                setShowSupportModal(true);
                              }}
                              className="btn btn-sm btn-secondary"
                            >
                              Support
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS QUEUE */}
          {activeTab === 'payments' && (
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Organization</th>
                      <th>Plan / Cycle</th>
                      <th>Amount</th>
                      <th>UTR / Reference</th>
                      <th>Status</th>
                      <th>Review Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                          No pending UPI payment requests.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                            {new Date(p.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.organization?.name || p.organizationId}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{p.plan?.name || p.planId} ({p.billingCycle.toLowerCase()})</td>
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
                          <td>
                            {p.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => handleReviewPayment(p.id, true)}
                                  className="btn btn-sm btn-success"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewPayment(p.id, false)}
                                  className="btn btn-sm btn-danger"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PLANS */}
          {activeTab === 'plans' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {plans.map((pl) => (
                <div key={pl.id} className="card" style={{ padding: '24px', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{pl.name}</h3>
                    <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                      {pl.code}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', minHeight: '38px', margin: '0 0 16px 0' }}>{pl.description}</p>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(pl.monthlyPriceINR).toLocaleString()} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 400 }}>/ month</span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '6px' }}>• Max Users: <strong style={{ color: 'var(--text-primary)' }}>{pl.maxUsers}</strong></div>
                    <div style={{ marginBottom: '6px' }}>• Max Products: <strong style={{ color: 'var(--text-primary)' }}>{pl.maxProducts}</strong></div>
                    <div style={{ marginBottom: '6px' }}>• Max Customers: <strong style={{ color: 'var(--text-primary)' }}>{pl.maxCustomers}</strong></div>
                    <div style={{ marginBottom: '6px' }}>• Max Monthly Transactions: <strong style={{ color: 'var(--text-primary)' }}>{pl.maxTransactions}</strong></div>
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {pl.allowedFeatures.map((feat) => (
                      <span key={feat} style={{ fontSize: '10.5px', background: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SUPPORT SESSIONS */}
          {activeTab === 'support' && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: '0 0 4px 0', fontSize: '18px' }}>
                    🔒 Customer Support & Diagnostic Sessions
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                    As a Platform Super Admin, you can launch a time-bounded, audited support session to troubleshoot issues inside a specific customer organization without asking for their passwords.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSupportForm({
                      targetOrganizationId: organizations[0]?.id || '',
                      targetUserId: '',
                      reason: '',
                      durationMinutes: 60,
                    });
                    setShowSupportModal(true);
                  }}
                  className="btn btn-primary"
                >
                  + Launch Support Session
                </button>
              </div>

              <div style={{ backgroundColor: 'var(--warning-light)', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--warning)', fontSize: '14px', fontWeight: 700 }}>
                  🛡️ Security & Compliance Rules for Support Sessions:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                  <li>Every support session requires a valid customer ticket reference and a clear justification.</li>
                  <li>All actions taken during support mode are immutably logged to the Global Audit Trail.</li>
                  <li>A prominent banner is displayed while in support mode, allowing immediate exit at any time.</li>
                  <li>Support session tokens expire automatically after 1 hour.</li>
                </ul>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '20px 0 12px 0', color: 'var(--text-primary)' }}>
                Active Tenant Organizations Available for Support
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{org.name}</strong>
                        <span style={{ fontSize: '10px', background: org.status === 'ACTIVE' ? 'var(--success-light)' : 'var(--warning-light)', color: org.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {org.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Slug: <code>{org.slug}</code> • Plan: <strong style={{ color: 'var(--text-primary)' }}>{org.activeSubscription?.planName || 'Free'}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        Members: {org.counts.memberships} | Products: {org.counts.products} | Challans: {org.counts.challans}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSupportForm({
                          targetOrganizationId: org.id,
                          targetUserId: '',
                          reason: `Investigating tenant issue for ${org.name}`,
                          durationMinutes: 60,
                        });
                        setShowSupportModal(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '16px', alignSelf: 'flex-start' }}
                    >
                      Troubleshoot Organization
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Metadata / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actor?.email || log.actor?.name || 'System'}</td>
                        <td style={{ color: 'var(--primary-hover)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{log.action}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{log.resource}</td>
                        <td style={{ color: 'var(--text-tertiary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.metadata || '—'}
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

      {/* Provision Organization Modal */}
      {showOrgModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowOrgModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
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
              maxWidth: '500px',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-lg)',
              margin: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Provision New Customer Organization
              </h2>
              <button className="btn-icon" onClick={() => setShowOrgModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="search-input"
                  placeholder="e.g. Zenith Trading Co"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Subdomain Slug</label>
                <input
                  type="text"
                  required
                  value={orgForm.slug}
                  onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="search-input"
                  placeholder="e.g. zenith-trading"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Admin Full Name</label>
                <input
                  type="text"
                  required
                  value={orgForm.adminName}
                  onChange={(e) => setOrgForm({ ...orgForm, adminName: e.target.value })}
                  className="search-input"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Admin Email</label>
                <input
                  type="email"
                  required
                  value={orgForm.adminEmail}
                  onChange={(e) => setOrgForm({ ...orgForm, adminEmail: e.target.value })}
                  className="search-input"
                  placeholder="e.g. rahul@zenithtrading.com"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Password</label>
                <input
                  type="password"
                  required
                  value={orgForm.adminPassword}
                  onChange={(e) => setOrgForm({ ...orgForm, adminPassword: e.target.value })}
                  className="search-input"
                  placeholder="Min 6 characters"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Plan</label>
                <select
                  value={orgForm.planCode}
                  onChange={(e) => setOrgForm({ ...orgForm, planCode: e.target.value })}
                  className="filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="growth_v1">Growth Pro (₹499/mo)</option>
                  <option value="starter_v1">Starter Basic (₹149/mo)</option>
                  <option value="enterprise_v1">Enterprise (₹1,499/mo)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support Session Impersonation Modal */}
      {showSupportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSupportModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
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
              maxWidth: '480px',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-lg)',
              margin: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Launch Monitored Support Session
              </h2>
              <button className="btn-icon" onClick={() => setShowSupportModal(false)}>✕</button>
            </div>
            <form onSubmit={handleLaunchSupportSession}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Organization</label>
                <select
                  value={supportForm.targetOrganizationId}
                  onChange={(e) => setSupportForm({ ...supportForm, targetOrganizationId: e.target.value })}
                  className="filter-select"
                  style={{ width: '100%' }}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Troubleshooting Reason & Justification
                </label>
                <textarea
                  required
                  rows={2}
                  value={supportForm.reason}
                  onChange={(e) => setSupportForm({ ...supportForm, reason: e.target.value })}
                  className="search-input"
                  placeholder="Ticket #8492: Troubleshooting GST invoice calculation glitch"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Start Monitored Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSuperAdmin;
