import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  getAdminOverview,
  getUsersList,
  getBackdoorAuditLogs,
  getUserActivityLogs,
  startBackdoorSession
} from '../../services/admin.service';
import { handleApiError } from '../../services/api';
import { UserModal } from '../../components/admin/UserModal';
import { LicenseModal } from '../../components/admin/LicenseModal';
import type { User, AdminOverviewStats, BackdoorAuditLog, UserActivityLog, Role, UserStatus } from '../../types/admin';
import { PageHeader } from '../../components/common/PageHeader';
import { Table } from '../../components/common/Table';
import type { TableColumn } from '../../components/common/Table';
import { SearchBar } from '../../components/common/SearchBar';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';

export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, startBackdoorSession: initBackdoor } = useAuth();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'backdoor' | 'activities'>('overview');

  // Core data states
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [backdoorLogs, setBackdoorLogs] = useState<BackdoorAuditLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);

  // Search & Filter states for User Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalType, setModalType] = useState<'user_add' | 'user_edit' | 'license_allot' | 'backdoor_reason' | null>(null);
  const [backdoorReason, setBackdoorReason] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch overview stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminOverview();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin statistics:', err);
    }
  }, []);

  // Fetch users listing
  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsersList(searchQuery || undefined, roleFilter || undefined, statusFilter || undefined);
      setUsers(data);
    } catch (err) {
      setError(handleApiError(err));
    }
  }, [searchQuery, roleFilter, statusFilter]);

  // Fetch backdoor audit logs
  const fetchBackdoorLogs = useCallback(async () => {
    try {
      const data = await getBackdoorAuditLogs();
      setBackdoorLogs(data);
    } catch (err) {
      console.error('Error fetching backdoor logs:', err);
    }
  }, []);

  // Fetch user activity feed
  const fetchActivityLogs = useCallback(async () => {
    try {
      const data = await getUserActivityLogs();
      setActivityLogs(data);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    }
  }, []);

  // Dispatch initial loader
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        await fetchStats();
      } else if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'backdoor') {
        await fetchBackdoorLogs();
      } else if (activeTab === 'activities') {
        await fetchActivityLogs();
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchStats, fetchUsers, fetchBackdoorLogs, fetchActivityLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Backdoor Impersonation start
  const handleStartBackdoor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !backdoorReason.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const data = await startBackdoorSession(selectedUser.id, backdoorReason);
      
      // Update useAuth state
      initBackdoor(data.backdoorToken, data.backdoorLogId, {
        id: data.targetUser.id,
        name: data.targetUser.name,
        email: data.targetUser.email,
        role: data.targetUser.role,
        isSuperAdmin: false,
      });

      // Redirect to main operational dashboard as the target user
      navigate('/dashboard');
    } catch (err) {
      setError(handleApiError(err));
      setSubmitting(false);
    }
  };

  const handleModalSave = () => {
    setModalType(null);
    setSelectedUser(null);
    setBackdoorReason('');
    loadData();
  };

  // Table Columns
  const userColumns: TableColumn<User>[] = [
    {
      key: 'name',
      header: 'Operator Info',
      render: (u) => (
        <div>
          <div style={{ fontWeight: 700 }}>{u.name}</div>
          <div className="fs-12 color-tertiary" style={{ marginTop: '2px' }}>{u.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}`} style={u.role !== 'ADMIN' ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : undefined}>
          {u.role}
        </span>
      ),
    },
    {
      key: 'license',
      header: 'License Status',
      render: (u) => u.license ? (
        <span className={`badge ${u.license.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
          {u.license.status}
        </span>
      ) : (
        <span className="color-tertiary" style={{ fontStyle: 'italic' }}>No License</span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (u) => u.license?.tier || '-',
    },
    {
      key: 'licenseKey',
      header: 'License Key',
      className: 'text-mono',
      render: (u) => u.license?.licenseKey || '-',
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (u) => (
        <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
          {u.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) => (
        <div className="flex-center gap-6" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedUser(u);
              setModalType('user_edit');
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--success)', borderColor: 'var(--success-light)' }}
            onClick={() => {
              setSelectedUser(u);
              setModalType('license_allot');
            }}
          >
            License
          </button>
          {u.id !== currentUser?.id && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--warning)', borderColor: 'var(--warning-light)' }}
              onClick={() => {
                setSelectedUser(u);
                setModalType('backdoor_reason');
              }}
            >
              Monitor 👁️
            </button>
          )}
        </div>
      ),
    },
  ];

  const backdoorColumns: TableColumn<BackdoorAuditLog>[] = [
    {
      key: 'admin',
      header: 'Authorized Admin',
      render: (log) => (
        <div>
          <div style={{ fontWeight: 700 }}>{log.admin?.name || 'Unknown Admin'}</div>
          <div className="fs-12 color-tertiary" style={{ marginTop: '2px' }}>{log.admin?.email}</div>
        </div>
      ),
    },
    {
      key: 'targetUser',
      header: 'Target Monitored User',
      render: (log) => (
        <div>
          <div style={{ fontWeight: 700 }}>{log.targetUser?.name || 'Unknown User'}</div>
          <div className="fs-12 color-tertiary" style={{ marginTop: '2px' }}>{log.targetUser?.email}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <span className="badge badge-primary">
          {log.action}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Support Reason',
      render: (log) => (
        <span style={{ fontStyle: 'italic' }} title={log.reason || ''}>
          {log.reason || 'None provided'}
        </span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (log) => new Date(log.startedAt).toLocaleString(),
    },
    {
      key: 'endedAt',
      header: 'Ended At',
      render: (log) => log.endedAt ? (
        new Date(log.endedAt).toLocaleString()
      ) : (
        <span className="badge badge-success">Active Session</span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'Client IP',
      className: 'text-mono',
      render: (log) => log.ipAddress || '-',
    },
  ];

  return (
    <div>
      {/* Header and Title */}
      <PageHeader
        title="Developer &amp; Admin Portal"
        subtitle="Allot software licenses, manage system access control lists, audit backdoor sessions, and monitor tenant health metrics."
        actions={
          activeTab === 'users' ? (
            <button
              onClick={() => setModalType('user_add')}
              className="btn btn-primary btn-sm"
            >
              ➕ Add New User
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="status-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`status-tab ${activeTab === 'overview' ? 'status-tab--active' : ''}`}
        >
          Overview &amp; System Uptime
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`status-tab ${activeTab === 'users' ? 'status-tab--active' : ''}`}
        >
          User Directory &amp; Licenses
        </button>
        <button
          onClick={() => setActiveTab('backdoor')}
          className={`status-tab ${activeTab === 'backdoor' ? 'status-tab--active' : ''}`}
        >
          Backdoor Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`status-tab ${activeTab === 'activities' ? 'status-tab--active' : ''}`}
        >
          System Activity Feed
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <LoadingSkeleton variant="stat" count={4} />
          <LoadingSkeleton variant="line" lines={8} />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div>
              {/* KPIs Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Total System Users</span>
                    <div className="stat-card__icon stat-card__icon--purple">
                      👤
                    </div>
                  </div>
                  <div className="stat-card__value">{stats.totalUsers}</div>
                  <div className="stat-card__footer">Active operators &amp; administrators</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Active Software Licenses</span>
                    <div className="stat-card__icon stat-card__icon--green">
                      🔑
                    </div>
                  </div>
                  <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                    {stats.activeLicenses}
                  </div>
                  <div className="stat-card__footer">Currently verified licenses</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Licenses Near Expiry</span>
                    <div className="stat-card__icon stat-card__icon--yellow">
                      ⚠️
                    </div>
                  </div>
                  <div className="stat-card__value" style={{ color: 'var(--warning)' }}>
                    {stats.expiringLicenses}
                  </div>
                  <div className="stat-card__footer">Expiring within 7 days</div>
                </div>

                <div className="stat-card">
                  <div className="stat-card__header">
                    <span className="stat-card__label">Backdoor Entry Logs</span>
                    <div className="stat-card__icon stat-card__icon--blue">
                      👁️
                    </div>
                  </div>
                  <div className="stat-card__value" style={{ color: 'var(--info)' }}>
                    {stats.totalBackdoorsInitiated}
                  </div>
                  <div className="stat-card__footer">Total audited support entries</div>
                </div>
              </div>

              {/* System status details */}
              <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                  Database &amp; Server Health
                </h3>
                <div className="info-grid">
                  <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Connection Status</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                        {stats.systemHealth.dbStatus === 'ok' ? '🟢 Operational' : '🔴 Degraded'}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>DB Response Latency</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                        {stats.systemHealth.dbLatencyMs !== undefined ? `${stats.systemHealth.dbLatencyMs} ms` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Platform Uptime</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                        {Math.floor(stats.systemHealth.uptime / 3600)}h {Math.floor((stats.systemHealth.uptime % 3600) / 60)}m
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER DIRECTORY & LICENSE ALLOTMENT */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Search & Filters */}
              <div className="toolbar-card">
                <SearchBar
                  onSearch={setSearchQuery}
                  placeholder="Search user by name or email..."
                  initialValue={searchQuery}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as Role | '')}
                  className="filter-select"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SALES">Sales Agent</option>
                  <option value="WAREHOUSE">Warehouse Clerk</option>
                  <option value="ACCOUNTS">Accountant</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="PENDING">Pending</option>
                </select>
                <button
                  onClick={fetchUsers}
                  className="btn btn-secondary btn-sm"
                >
                  Apply Filters
                </button>
              </div>

              {/* Users Table */}
              <div className="table-card">
                <Table
                  columns={userColumns}
                  data={users}
                  keyExtractor={(u) => u.id}
                  emptyMessage="No matching user accounts found."
                />
              </div>
            </div>
          )}

          {/* TAB 3: BACKDOOR AUDIT TRAIL */}
          {activeTab === 'backdoor' && (
            <div className="table-card">
              <Table
                columns={backdoorColumns}
                data={backdoorLogs}
                keyExtractor={(log) => log.id}
                emptyMessage="No backdoor entry sessions recorded."
              />
            </div>
          )}

          {/* TAB 4: SYSTEM ACTIVITY FEED */}
          {activeTab === 'activities' && (
            <div className="card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Live User Activity Feed (Audit Trail)</h3>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                {activityLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-tertiary)' }}>
                    No activities recorded on the platform yet.
                  </div>
                ) : (
                  activityLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                        👤
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>
                            {log.user?.name} <span className="color-tertiary" style={{ fontWeight: 500, fontSize: '11px' }}>({log.user?.role})</span>
                          </span>
                          <span className="color-tertiary text-mono" style={{ fontSize: '11px' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          Performed action: <strong className="color-primary text-mono" style={{ fontSize: '12px' }}>{log.action}</strong> in module <span className="text-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{log.module}</span>
                        </div>
                        {log.details && (
                          <pre className="text-mono" style={{ margin: 0, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {log.details}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* BACKDOOR ESTABLISH REASON MODAL */}
      {modalType === 'backdoor_reason' && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">
                Confirm Backdoor Monitor Session
              </h3>
              <button
                onClick={() => {
                  setModalType(null);
                  setSelectedUser(null);
                  setBackdoorReason('');
                }}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleStartBackdoor} className="modal-body">
              <div className="alert alert-danger" style={{ marginBottom: '16px', fontSize: '12px' }}>
                ⚠️ <strong>Security Disclaimer:</strong> Entering a backdoor impersonation session lets you view and perform operations as the target user. All actions will be fully tracked as backdoor entry operations.
              </div>

              <div className="form-group">
                <label className="form-label">MONITORED TARGET USER</label>
                <div style={{ fontSize: '13px', fontWeight: 700, backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  {selectedUser.name} ({selectedUser.email})
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">AUDIT REASON FOR ACCESS</label>
                <textarea
                  required
                  placeholder="e.g. Debugging database synchronization issue on challans module for sales agent."
                  value={backdoorReason}
                  onChange={(e) => setBackdoorReason(e.target.value)}
                  rows={3}
                  className="form-input"
                />
              </div>

              <div className="modal-footer" style={{ borderTop: 'none', padding: '16px 0 0 0' }}>
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setSelectedUser(null);
                    setBackdoorReason('');
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning-light)', color: '#000' }}
                >
                  {submitting ? 'Connecting Backdoor...' : 'Establish Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT MODALS */}
      {modalType === 'user_add' && (
        <UserModal onClose={() => setModalType(null)} onSave={handleModalSave} />
      )}

      {modalType === 'user_edit' && selectedUser && (
        <UserModal user={selectedUser} onClose={() => { setModalType(null); setSelectedUser(null); }} onSave={handleModalSave} />
      )}

      {modalType === 'license_allot' && selectedUser && (
        <LicenseModal user={selectedUser} onClose={() => { setModalType(null); setSelectedUser(null); }} onSave={handleModalSave} />
      )}
    </div>
  );
};
