import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, handleApiError } from '../../services/api';
import type { AuditLogItem } from '../../types';

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

export const PlatformDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ovRes, auditRes] = await Promise.all([
          api.get('/platform/overview'),
          api.get('/platform/audit?limit=5'),
        ]);
        setOverview(ovRes.data.data);
        setRecentAudits(auditRes.data.data || []);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };
    void loadDashboardData();
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div>
      {/* Top Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
            📊 Executive Platform Control Center
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Real-time telemetry metrics, database health monitoring, and commercial subscription status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/platform/organizations')}
            style={{
              padding: '9px 18px',
              backgroundColor: '#f59e0b',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
            }}
          >
            + Provision Tenant Org
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
          }}
        >
          ✕ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#1e293b', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading platform telemetry data...</p>
        </div>
      ) : overview ? (
        <>
          {/* KPI Metrics Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* Card 1: Organizations */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/platform/organizations')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Organizations
                </span>
                <span style={{ fontSize: '18px' }}>🏢</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginTop: '8px', fontFamily: 'monospace' }}>
                {overview.metrics.totalOrganizations}
              </div>
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px', fontWeight: 600 }}>
                {overview.metrics.activeOrganizations} active tenants
              </div>
            </div>

            {/* Card 2: Subscriptions */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/platform/plans')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Active Commercial Tiers
                </span>
                <span style={{ fontSize: '18px' }}>📦</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#6366f1', marginTop: '8px', fontFamily: 'monospace' }}>
                {overview.metrics.activeSubscriptions}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Active paid / trial plans</div>
            </div>

            {/* Card 3: Pending UPI Approvals */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: overview.metrics.pendingPaymentRequests > 0 ? '1px solid #f59e0b' : '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/platform/payments')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pending Payments
                </span>
                <span style={{ fontSize: '18px' }}>💳</span>
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: overview.metrics.pendingPaymentRequests > 0 ? '#f59e0b' : '#22c55e',
                  marginTop: '8px',
                  fontFamily: 'monospace',
                }}
              >
                {overview.metrics.pendingPaymentRequests}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                {overview.metrics.pendingPaymentRequests > 0 ? 'Requires UTR verification' : 'All clear'}
              </div>
            </div>

            {/* Card 4: Registered Users */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => navigate('/platform/users')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Registered Users
                </span>
                <span style={{ fontSize: '18px' }}>👤</span>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#38bdf8', marginTop: '8px', fontFamily: 'monospace' }}>
                {overview.metrics.totalUsers}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>Across all tenant orgs</div>
            </div>
          </div>

          {/* System Health & Performance Widget Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Database & Infrastructure Telemetry */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🗄️</span> Infrastructure & Database Status
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13.5px' }}>PostgreSQL Engine Status</span>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: overview.systemHealth.dbStatus === 'ok' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: overview.systemHealth.dbStatus === 'ok' ? '#4ade80' : '#ef4444',
                    }}
                  >
                    ● {overview.systemHealth.dbStatus.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13.5px' }}>Database Query Latency</span>
                  <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>
                    {overview.systemHealth.dbLatencyMs} ms
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13.5px' }}>Node.js Process Uptime</span>
                  <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>
                    {formatUptime(overview.systemHealth.uptime)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13.5px' }}>Runtime Environment</span>
                  <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                    {overview.systemHealth.environment}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🚀</span> Platform Governance Actions
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  onClick={() => navigate('/platform/organizations')}
                  style={{
                    padding: '14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🏢</div>
                  Provision Tenant
                </button>

                <button
                  onClick={() => navigate('/platform/users')}
                  style={{
                    padding: '14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>👤</div>
                  Global Users
                </button>

                <button
                  onClick={() => navigate('/platform/payments')}
                  style={{
                    padding: '14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>💳</div>
                  Review Payments
                </button>

                <button
                  onClick={() => navigate('/platform/support')}
                  style={{
                    padding: '14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
                  Impersonate Session
                </button>
              </div>
            </div>
          </div>

          {/* Recent Audit Activity Feed */}
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📜</span> Recent Platform Audit Log Activity
              </h3>
              <button
                onClick={() => navigate('/platform/audit')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f59e0b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View All Audit Logs →
              </button>
            </div>

            {recentAudits.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0 }}>No recent audit events recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px 12px' }}>Timestamp</th>
                      <th style={{ padding: '10px 12px' }}>Actor</th>
                      <th style={{ padding: '10px 12px' }}>Action</th>
                      <th style={{ padding: '10px 12px' }}>Resource</th>
                      <th style={{ padding: '10px 12px' }}>Organization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudits.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '10px 12px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '12px' }}>
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#f8fafc', fontWeight: 600 }}>
                          {item.actor ? item.actor.name : 'System'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(99, 102, 241, 0.15)',
                              color: '#818cf8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              fontSize: '12px',
                            }}
                          >
                            {item.action}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{item.resource}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                          {item.organization ? item.organization.name : 'Platform Wide'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default PlatformDashboard;
