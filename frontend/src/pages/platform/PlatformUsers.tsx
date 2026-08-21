import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import type { Pagination as PaginationType, UserStatus } from '../../types';
import { OrgInspectorModal } from '../../components/platform/OrgInspectorModal';
import { Pagination } from '../../components/common/Pagination';

interface GlobalUserItem {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  memberships: {
    id: string;
    role: string;
    status: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export const PlatformUsers: React.FC = () => {
  const [users, setUsers] = useState<GlobalUserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_platform_users_page_size');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 10, 5), 100) : 10;
  });
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Inspector & Modal States
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState<boolean>(false);

  // Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    organizationId: '',
  });

  const fetchUsers = useCallback(async (page = 1, currentLimit = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', currentLimit.toString());
      params.append('role', 'ORG_ADMIN'); // Always force role to ORG_ADMIN
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/platform/users?${params.toString()}`);
      if (res.data.pagination) {
        setUsers(res.data.data);
        setPagination(res.data.pagination);
      } else {
        setUsers(res.data.data);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    localStorage.setItem('stockpulse_platform_users_page_size', String(newSize));
    void fetchUsers(1, newSize);
  };

  // Load organizations list for creation dropdown
  const fetchOrganizations = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.get('/platform/organizations?limit=100');
      setOrganizations(res.data.data || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(1);
  }, [fetchUsers]);

  useEffect(() => {
    if (showCreateModal) {
      void fetchOrganizations();
    }
  }, [showCreateModal, fetchOrganizations]);

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus, email: string) => {
    const nextStatus: UserStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Change account status of ${email} to ${nextStatus}?`)) return;

    try {
      await api.patch(`/platform/users/${userId}/status`, { status: nextStatus });
      setActionSuccess(`Updated user account status to ${nextStatus}.`);
      void fetchUsers(pagination.page);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`⚠️ PERMANENT DELETION: Are you sure you want to permanently delete user '${email}'? This will remove all their memberships, support logs, and cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/platform/users/${userId}`);
      setActionSuccess(`User '${email}' has been permanently deleted from the platform.`);
      void fetchUsers(1);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newUser.organizationId) {
      setError('Please select a target Organization to assign this Org Admin to.');
      return;
    }

    try {
      await api.post('/platform/users', newUser);
      setActionSuccess(`Successfully created Org Admin user '${newUser.email}' and assigned to selected organization.`);
      setShowCreateModal(false);
      setNewUser({ name: '', email: '', password: '', organizationId: '' });
      void fetchUsers(1);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
            👤 User Registry
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Monitor and manage Organization Administrator accounts across all customer tenants.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            backgroundColor: '#f59e0b',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
          }}
        >
          <span>➕</span>
          <span>Create Org Admin</span>
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
            placeholder="Search by user name or email address..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading user registry...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No Org Admin accounts found matching filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>User Details</th>
                <th style={{ padding: '14px 16px' }}>Tenant Membership (Click to View Org Hierarchy)</th>
                <th style={{ padding: '14px 16px' }}>Account Status</th>
                <th style={{ padding: '14px 16px' }}>Joined Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>{u.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.memberships.length === 0 ? (
                      <span style={{ color: '#64748b', fontSize: '12px' }}>No org memberships</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {u.memberships.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedOrgId(m.organization.id)}
                            title={`Inspect organization ${m.organization.name}`}
                            style={{
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#38bdf8',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span>🏢</span>
                            <span>{m.organization.name}</span>
                            <span
                              style={{
                                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                color: '#f8fafc',
                                marginLeft: '4px',
                              }}
                            >
                              {m.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: u.status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: u.status === 'ACTIVE' ? '#4ade80' : '#ef4444',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status, u.email)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: u.status === 'ACTIVE' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                          border: u.status === 'ACTIVE' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(34,197,94,0.3)',
                          borderRadius: '6px',
                          color: u.status === 'ACTIVE' ? '#f59e0b' : '#4ade80',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
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
                        title="Delete User permanently"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="pagination-footer">
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Showing {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)}–
              {Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total} administrators
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchUsers(p, pageSize)}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 30, 50, 100]}
              totalItems={pagination.total}
            />
          </div>
        )}
      </div>

      {/* Create Org Admin Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
              ➕ Create New Organization Administrator
            </h2>

            <form onSubmit={handleCreateUserSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Admin Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. admin@tenant.com"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Initial Sign-in Password *
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Assign to Tenant Organization *
                </label>
                {loadingOrgs ? (
                  <div style={{ color: '#94a3b8', fontSize: '12.5px' }}>Loading organizations...</div>
                ) : (
                  <select
                    required
                    value={newUser.organizationId}
                    onChange={(e) => setNewUser({ ...newUser, organizationId: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', outline: 'none' }}
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} (@{org.slug})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingOrgs}
                  style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization Hierarchy Inspector Modal */}
      <OrgInspectorModal organizationId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />
    </div>
  );
};

export default PlatformUsers;
