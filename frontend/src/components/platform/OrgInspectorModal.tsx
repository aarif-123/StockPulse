import React, { useState, useEffect } from 'react';
import { api, handleApiError } from '../../services/api';

interface OrgDetailsData {
  id: string;
  name: string;
  slug: string;
  status: string;
  currency: string;
  businessGstin?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  createdAt: string;
  subscriptions: {
    id: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    plan: {
      id: string;
      name: string;
      code: string;
      monthlyPriceINR: number;
      yearlyPriceINR: number;
      maxUsers: number;
      maxProducts: number;
      maxCustomers: number;
      maxWarehouses: number;
      maxTransactions: number;
      allowedFeatures: string[];
    };
  }[];
  memberships: {
    id: string;
    role: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
      isSuperAdmin: boolean;
    };
  }[];
  _count: {
    memberships: number;
    customers: number;
    products: number;
    challans: number;
    transactions: number;
  };
}

interface Props {
  organizationId: string | null;
  onClose: () => void;
}

export const OrgInspectorModal: React.FC<Props> = ({ organizationId, onClose }) => {
  const [org, setOrg] = useState<OrgDetailsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'credentials' | 'plan'>('roster');

  useEffect(() => {
    if (!organizationId) {
      setOrg(null);
      return;
    }

    const fetchOrgDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/platform/organizations/${organizationId}`);
        setOrg(res.data.data);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchOrgDetails();
  }, [organizationId]);

  if (!organizationId) return null;

  const currentSub = org?.subscriptions && org.subscriptions.length > 0 ? org.subscriptions[0] : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0c111d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 700,
              }}
            >
              🏢
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  {org?.name || 'Organization Inspector'}
                </h2>
                {org?.status && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: org.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: org.status === 'ACTIVE' ? '#4ade80' : '#ef4444',
                    }}
                  >
                    {org.status}
                  </span>
                )}
              </div>
              {org?.slug && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                  slug: @{org.slug} • Created {new Date(org.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '16px',
            }}
            title="Close Inspector"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
              Fetching organization telemetry & hierarchy...
            </div>
          ) : error ? (
            <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px' }}>
              ✕ {error}
            </div>
          ) : org ? (
            <div>
              {/* Telemetry KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Team Members</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {org._count.memberships}
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>B2B Customers</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                    {org._count.customers}
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Catalog SKUs</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80', marginTop: '4px' }}>
                    {org._count.products}
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Delivery Challans</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                    {org._count.challans}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', marginBottom: '20px' }}>
                <button
                  onClick={() => setActiveTab('roster')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'roster' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeTab === 'roster' ? '#38bdf8' : '#94a3b8',
                    fontWeight: activeTab === 'roster' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                  }}
                >
                  👥 Organization User Hierarchy ({org.memberships.length})
                </button>
                <button
                  onClick={() => setActiveTab('credentials')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'credentials' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeTab === 'credentials' ? '#38bdf8' : '#94a3b8',
                    fontWeight: activeTab === 'credentials' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                  }}
                >
                  🏢 Business Profile & Credentials
                </button>
                <button
                  onClick={() => setActiveTab('plan')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'plan' ? '2px solid #38bdf8' : '2px solid transparent',
                    color: activeTab === 'plan' ? '#38bdf8' : '#94a3b8',
                    fontWeight: activeTab === 'plan' ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                  }}
                >
                  📦 Commercial Plan & Limits
                </button>
              </div>

              {/* Tab 1: Organization Member Hierarchy Roster */}
              {activeTab === 'roster' && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                    Active Organization Members & Assigned Roles
                  </h3>
                  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0c111d', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '10px 14px' }}>Member Name</th>
                          <th style={{ padding: '10px 14px' }}>Email Address</th>
                          <th style={{ padding: '10px 14px' }}>Assigned Org Role</th>
                          <th style={{ padding: '10px 14px' }}>Account Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {org.memberships.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>
                              {m.user.name}
                              {m.user.isSuperAdmin && (
                                <span style={{ marginLeft: '6px', fontSize: '10px', color: '#f59e0b', fontWeight: 800 }}>👑 SUPER ADMIN</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{m.user.email}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                }}
                              >
                                {m.role}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  backgroundColor: m.user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: m.user.status === 'ACTIVE' ? '#4ade80' : '#ef4444',
                                }}
                              >
                                {m.user.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Business Credentials & Address */}
              {activeTab === 'credentials' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '13.5px', fontWeight: 700 }}>
                      📋 GSTIN & Legal Identity
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Business GSTIN: </span>
                        <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{org.businessGstin || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Contact Email: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.businessEmail || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Contact Phone: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.businessPhone || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Base Currency: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.currency}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#38bdf8', fontSize: '13.5px', fontWeight: 700 }}>
                      📍 Registered Physical Address
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Address: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.businessAddress || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>City: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.city || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>State: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.state || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Pincode: </span>
                        <strong style={{ color: '#f8fafc' }}>{org.pincode || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Commercial Plan Details */}
              {activeTab === 'plan' && (
                <div>
                  {currentSub ? (
                    <div style={{ backgroundColor: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 800 }}>
                            ACTIVE COMMERCIAL PLAN
                          </span>
                          <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                            {currentSub.plan.name}
                          </h3>
                        </div>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          {currentSub.status} ({currentSub.billingCycle})
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Allowed Users</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                            {currentSub.plan.maxUsers} Users
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Allowed Products</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                            {currentSub.plan.maxProducts.toLocaleString()} SKUs
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Max Allowed Customers</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                            {currentSub.plan.maxCustomers.toLocaleString()} Accounts
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Current Subscription Expiry</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                            {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                      No active subscription plan configured for this organization.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e293b', backgroundColor: '#0c111d', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
            }}
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrgInspectorModal;
