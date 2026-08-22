import React, { useState, useEffect, useCallback } from 'react';
import { api, handleApiError } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { OrgStatus, Pagination as PaginationType } from '../../types';
import { OrgInspectorModal } from '../../components/platform/OrgInspectorModal';
import { Pagination } from '../../components/common/Pagination';

interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
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

export const PlatformOrganizations: React.FC = () => {
  const { startSupportSession } = useAuth();
  const [organizations, setOrganizations] = useState<OrgListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_platform_orgs_page_size');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 10, 5), 100) : 10;
  });
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Provision Modal State
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

  // Selected Org Inspector Modal State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async (page = 1, currentLimit = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', currentLimit.toString());
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/platform/organizations?${params.toString()}`);
      if (res.data.pagination) {
        setOrganizations(res.data.data);
        setPagination(res.data.pagination);
      } else {
        setOrganizations(res.data.data);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    localStorage.setItem('stockpulse_platform_orgs_page_size', String(newSize));
    void fetchOrganizations(1, newSize);
  };

  useEffect(() => {
    void fetchOrganizations(1);
  }, [fetchOrganizations]);

  const handleNameChange = (name: string) => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setOrgForm((prev) => ({ ...prev, name, slug: generatedSlug }));
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: any = { ...orgForm };
      if (!payload.adminPassword) {
        delete payload.adminPassword;
      }
      await api.post('/platform/organizations', payload);
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
      void fetchOrganizations(1);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleUpdateStatus = async (orgId: string, status: OrgStatus) => {
    try {
      await api.patch(`/platform/organizations/${orgId}/status`, { status });
      setActionSuccess(`Organization status updated to ${status}.`);
      void fetchOrganizations(pagination.page);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleImpersonateOrg = async (orgId: string) => {
    try {
      const response = await api.post('/platform/support-session/start', {
        targetOrganizationId: orgId,
        reason: 'Platform Admin Impersonation Support',
        durationMinutes: 60,
      });
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
      window.location.href = '/dashboard';
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.4px' }}>
            🏢 Enterprise Tenant Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Provision new tenant accounts, manage commercial subscriptions, and inspect organization telemetry.
          </p>
        </div>
        <button
          onClick={() => setShowOrgModal(true)}
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
          <span>Provision Tenant Org</span>
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
        }}
      >
        <div style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Search by organization name, slug, email, or GSTIN..."
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
          <option value="TRIAL">TRIAL</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Organizations Table */}
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
            Loading tenant directory...
          </div>
        ) : organizations.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No tenant organizations found matching current query.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '14px 16px' }}>Organization Details</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Subscription Plan</th>
                <th style={{ padding: '14px 16px' }}>Telemetry Counts</th>
                <th style={{ padding: '14px 16px' }}>Provisioned Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td data-label="Organization Details" style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '14px' }}>{org.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>@{org.slug}</div>
                    {org.businessGstin && (
                      <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                        GSTIN: {org.businessGstin}
                      </div>
                    )}
                  </td>
                  <td data-label="Status" style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          org.status === 'ACTIVE'
                            ? 'rgba(34,197,94,0.15)'
                            : org.status === 'SUSPENDED'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          org.status === 'ACTIVE'
                            ? '#4ade80'
                            : org.status === 'SUSPENDED'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td data-label="Subscription Plan" style={{ padding: '14px 16px' }}>
                    {org.activeSubscription ? (
                      <div>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{org.activeSubscription.planName}</span>
                        <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                          Ends: {new Date(org.activeSubscription.currentPeriodEnd).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>No subscription</span>
                    )}
                  </td>
                  <td data-label="Telemetry Counts" style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '12.5px' }}>
                    👥 {org.counts.memberships} users • 📦 {org.counts.products} SKUs • 🧾 {org.counts.challans} challans
                  </td>
                  <td data-label="Provisioned Date" style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td data-label="Actions" style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setSelectedOrgId(org.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect Hierarchy
                      </button>
                      <button
                        onClick={() => handleImpersonateOrg(org.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          borderRadius: '6px',
                          color: '#f59e0b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Impersonate
                      </button>
                      {org.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(org.id, 'SUSPENDED')}
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
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(org.id, 'ACTIVE')}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(34,197,94,0.15)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: '6px',
                            color: '#4ade80',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="pagination-footer">
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Showing {Math.min((pagination.page - 1) * pageSize + 1, pagination.total)}–
              {Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total} organizations
            </span>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchOrganizations(p, pageSize)}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 30, 50, 100]}
              totalItems={pagination.total}
            />
          </div>
        )}
      </div>

      {/* Provision Org Modal */}
      {showOrgModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '540px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', fontWeight: 800 }}>
              🏢 Provision New Customer Tenant Organization
            </h2>

            <form onSubmit={handleCreateOrg}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={orgForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Logistics Pvt Ltd"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                  Slug / URL Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={orgForm.slug}
                  onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                  placeholder="e.g. acme-logistics"
                  style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orgForm.adminName}
                    onChange={(e) => setOrgForm({ ...orgForm, adminName: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                    Admin Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={orgForm.adminEmail}
                    onChange={(e) => setOrgForm({ ...orgForm, adminEmail: e.target.value })}
                    placeholder="admin@acme.com"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={orgForm.businessGstin}
                    onChange={(e) => setOrgForm({ ...orgForm, businessGstin: e.target.value })}
                    placeholder="27AAACA0000A1Z5"
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12.5px', marginBottom: '6px', fontWeight: 600 }}>
                    Initial Plan Tier
                  </label>
                  <select
                    value={orgForm.planCode}
                    onChange={(e) => setOrgForm({ ...orgForm, planCode: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  >
                    <option value="growth_v1">Growth Tier (Recommended)</option>
                    <option value="starter_v1">Starter Tier</option>
                    <option value="enterprise_v1">Enterprise Tier</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Provision Organization
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

export default PlatformOrganizations;
