import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import type { AuditLogItem, Pagination } from '../../types';

export const PlatformAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for JSON Metadata Inspection
  const [selectedMetadata, setSelectedMetadata] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (scopeFilter) params.append('scope', scopeFilter);

      const res = await api.get(`/platform/audit?${params.toString()}`);
      if (res.data.pagination) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      } else {
        setLogs(res.data.data);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [search, scopeFilter]);

  useEffect(() => {
    void fetchLogs(1);
  }, [fetchLogs]);

  const formatJsonMetadata = (metadata: string | null | undefined) => {
    if (!metadata) return 'No metadata payload';
    try {
      const parsed = JSON.parse(metadata);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return metadata;
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
          📜 Global Platform Audit Trail & Compliance Explorer
        </h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Immutable audit logs tracking system governance events, organization provisioning, user role mutations, and support sessions.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600 }}>
          ✕ {error}
        </div>
      )}

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          backgroundColor: '#1e293b',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search audit trail by action, resource, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f8fafc',
            fontSize: '13.5px',
            outline: 'none',
          }}
        >
          <option value="">All Audit Scopes</option>
          <option value="PLATFORM">PLATFORM Scope</option>
          <option value="ORGANIZATION">ORGANIZATION Scope</option>
          <option value="BUSINESS">BUSINESS Scope</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No audit log entries found matching current filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>Timestamp</th>
                <th style={{ padding: '14px 16px' }}>Scope</th>
                <th style={{ padding: '14px 16px' }}>Actor</th>
                <th style={{ padding: '14px 16px' }}>Action</th>
                <th style={{ padding: '14px 16px' }}>Resource & Org</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '12px' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#0f172a',
                        color: '#f59e0b',
                        border: '1px solid #334155',
                      }}
                    >
                      {item.scope}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {item.actor ? item.actor.name : 'System'}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                      {item.actor ? item.actor.email : ''}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: '#818cf8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {item.action}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{item.resource}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                      {item.organization ? item.organization.name : 'Platform Wide'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {item.metadata && (
                      <button
                        onClick={() => setSelectedMetadata(item.metadata!)}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect JSON
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div style={{ padding: '16px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total audit records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: pagination.page <= 1 ? '#64748b' : '#f8fafc',
                  borderRadius: '6px',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: pagination.page >= pagination.totalPages ? '#64748b' : '#f8fafc',
                  borderRadius: '6px',
                  cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Metadata Inspector Modal */}
      {selectedMetadata && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '600px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 800 }}>
                📜 Audit Event JSON Metadata Payload
              </h3>
              <button onClick={() => setSelectedMetadata(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <pre
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '16px',
                color: '#4ade80',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                maxHeight: '400px',
                overflowY: 'auto',
                margin: 0,
              }}
            >
              {formatJsonMetadata(selectedMetadata)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAudit;
