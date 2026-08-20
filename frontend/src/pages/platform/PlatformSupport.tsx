import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface SupportSessionItem {
  id: string;
  reason: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  startedAt: string;
  endedAt?: string | null;
  expiresAt: string;
  superAdmin?: { id: string; name: string; email: string };
  targetOrganization?: { id: string; name: string; slug: string };
  targetUser?: { id: string; name: string; email: string };
}

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export const PlatformSupport: React.FC = () => {
  const { startSupportSession } = useAuth();
  const [sessions, setSessions] = useState<SupportSessionItem[]>([]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [supportForm, setSupportForm] = useState({
    targetOrganizationId: '',
    targetUserId: '',
    reason: '',
    durationMinutes: 60,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, orgsRes] = await Promise.all([
        api.get('/platform/support/sessions'),
        api.get('/platform/organizations?limit=100'),
      ]);
      setSessions(sessRes.data.data || []);
      setOrganizations(orgsRes.data.data || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      setShowModal(false);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    setError(null);
    try {
      await api.post(`/platform/support-session/stop/${sessionId}`);
      setActionSuccess('Support impersonation session terminated successfully.');
      void fetchData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
            🔒 Audited Support & Impersonation Sessions
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Time-bounded, fully audited Super Admin diagnostic support access into tenant customer accounts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
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
          + Launch Support Session
        </button>
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

      {/* Support Sessions Table */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading support session history...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No support impersonation sessions recorded.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>Target Organization</th>
                <th style={{ padding: '14px 16px' }}>Target User</th>
                <th style={{ padding: '14px 16px' }}>Audit Reason</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Started & Expiration</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>
                      {s.targetOrganization ? s.targetOrganization.name : 'Unknown Org'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                      {s.targetOrganization ? s.targetOrganization.slug : ''}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {s.targetUser ? s.targetUser.name : 'Org Admin'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                      {s.targetUser ? s.targetUser.email : ''}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#cbd5e1', maxWidth: '240px' }}>
                    {s.reason}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          s.status === 'ACTIVE'
                            ? 'rgba(34,197,94,0.15)'
                            : s.status === 'TERMINATED'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(100,116,139,0.2)',
                        color:
                          s.status === 'ACTIVE'
                            ? '#4ade80'
                            : s.status === 'TERMINATED'
                            ? '#ef4444'
                            : '#94a3b8',
                      }}
                    >
                      {s.status}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                    <div>Start: {new Date(s.startedAt).toLocaleString()}</div>
                    <div>Expires: {new Date(s.expiresAt).toLocaleString()}</div>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {s.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleTerminateSession(s.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Terminate Session
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Start Session Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
              🔒 Launch Audited Support Session
            </h2>

            <form onSubmit={handleStartSession}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Target Customer Organization *
                </label>
                <select
                  required
                  value={supportForm.targetOrganizationId}
                  onChange={(e) => setSupportForm({ ...supportForm, targetOrganizationId: e.target.value })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', outline: 'none' }}
                >
                  <option value="">-- Select Target Tenant --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Diagnostic Audit Reason * (Minimum 5 characters)
                </label>
                <textarea
                  required
                  rows={3}
                  value={supportForm.reason}
                  onChange={(e) => setSupportForm({ ...supportForm, reason: e.target.value })}
                  placeholder="e.g. Investigating stock sync issue reported in ticket #4029"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Session Duration Limit
                </label>
                <select
                  value={supportForm.durationMinutes}
                  onChange={(e) => setSupportForm({ ...supportForm, durationMinutes: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', outline: 'none' }}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour (Standard)</option>
                  <option value={120}>2 Hours</option>
                  <option value={240}>4 Hours</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Launch Support Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformSupport;
