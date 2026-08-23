import React, { useState, useEffect } from 'react';
import { api, handleApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/common/PageHeader';
import { IconUsers, IconTrash, IconCheck, IconShield, IconFileText } from '../components/common/Icons';
import type { OrganizationMember, OrganizationSettings as OrgSettingsType, AuditLogItem } from '../types';

export const OrganizationSettings: React.FC = () => {
  const { activeOrg, hasRole, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'myprofile' | 'profile' | 'members' | 'audit'>('myprofile');
  const [settings, setSettings] = useState<OrgSettingsType | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite Member Modal State
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'SALES',
    password: '',
  });

  const isOrgAdmin = (activeOrg?.role as string) === 'ORG_ADMIN' || (activeOrg?.role as string) === 'ADMIN' || user?.isSuperAdmin;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [settRes, memRes] = await Promise.all([
        api.get('/organizations/settings'),
        api.get('/organizations/members'),
      ]);

      setSettings(settRes.data.data);
      setMembers(memRes.data.data);

      if (isOrgAdmin) {
        try {
          const audRes = await api.get('/organizations/audit');
          setAuditLogs(audRes.data.data || []);
        } catch {
          // ignore audit fetch error
        }
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeOrg?.organizationId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/organizations/settings', {
        name: settings.name,
        businessGstin: settings.businessGstin,
        businessPhone: settings.businessPhone,
        businessEmail: settings.businessEmail,
        businessAddress: settings.businessAddress,
        city: settings.city,
        state: settings.state,
        pincode: settings.pincode,
      });
      setSuccess('Organization profile updated successfully.');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/organizations/members', inviteForm);
      setShowInviteModal(false);
      setSuccess(`Team member '${inviteForm.name}' added successfully.`);
      setInviteForm({ name: '', email: '', role: 'SALES', password: '' });
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleRemoveMember = async (membershipId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this organization?`)) return;
    try {
      await api.delete(`/organizations/members/${membershipId}`);
      setSuccess(`Member ${name} removed.`);
      void loadData();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ORG_ADMIN':
      case 'ADMIN':
        return 'badge-purple';
      case 'SALES':
        return 'badge-blue';
      case 'WAREHOUSE':
        return 'badge-yellow';
      case 'ACCOUNTS':
        return 'badge-green';
      default:
        return 'badge-neutral';
    }
  };

  const getRoleDescription = (role?: string) => {
    switch (role) {
      case 'ORG_ADMIN':
      case 'ADMIN':
        return 'Full business, team, inventory, financial, and administrative management privileges across the organization.';
      case 'SALES':
        return 'Manages customer profiles, creates & issues delivery challans, views product inventory, and receives restocking alerts.';
      case 'WAREHOUSE':
        return 'Performs stock adjustments, handles stock audits, manufactures BOM assemblies, and processes pick & pack dispatches.';
      case 'ACCOUNTS':
        return 'Monitors customer ledgers, payment tracking, invoice reconciliation, and delivery confirmation alerts.';
      default:
        return 'Standard organization workspace member with role-restricted operational access.';
    }
  };

  return (
    <div>
      <PageHeader
        title={isOrgAdmin ? 'Organization & Account Settings' : 'My Profile & Organization Details'}
        subtitle="Manage user account details, role permissions, company business information, and team directory."
      />

      {/* Notifications */}
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

      {/* Modern Dark Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'myprofile', label: 'My Profile & Role', icon: <span style={{ fontSize: '15px' }}>👤</span> },
          { id: 'profile', label: 'Company Details', icon: <span style={{ fontSize: '15px' }}>🏢</span> },
          { id: 'members', label: `Team Directory (${members.length})`, icon: <IconUsers size={16} /> },
          ...(isOrgAdmin ? [{ id: 'audit', label: 'Activity Audit Log', icon: <IconFileText size={16} /> }] : []),
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading account details...</p>
        </div>
      ) : (
        <>
          {/* TAB 0: MY PROFILE & ROLE */}
          {activeTab === 'myprofile' && user && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* User Identity Profile Card */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-hover)',
                      border: '2px solid var(--primary-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{user.name}</h3>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Assigned Role
                    </span>
                    <div style={{ marginTop: '4px' }}>
                      <span className={`badge ${getRoleBadgeClass(activeOrg?.role || user.role || 'SALES')}`} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}>
                        <IconShield size={13} style={{ marginRight: '4px' }} />
                        {activeOrg?.role || user.role || 'SALES'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Role Responsibilities & Access
                    </span>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      {getRoleDescription(activeOrg?.role || user.role)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Organization Info Summary */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>🏢 Current Organization</h4>
                  {activeOrg?.subscription && (
                    <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', border: '1px solid var(--primary-border)', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                      👑 {activeOrg.subscription.planName}
                    </span>
                  )}
                </div>

                {settings ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Legal Entity Name</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{settings.name}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tenant Subdomain</span>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginTop: '2px' }}>{settings.slug}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>GSTIN Number</span>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600, marginTop: '2px' }}>
                        {settings.businessGstin || 'Not configured'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Location</span>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {[settings.city, settings.state, settings.pincode].filter(Boolean).join(', ') || 'Address on file'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading details...</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: COMPANY PROFILE */}
          {activeTab === 'profile' && settings && (
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '16px' }}>
                    🏢 Legal Entity & Business Profile
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {isOrgAdmin ? 'These details appear on printed GST Delivery Challans and invoices.' : 'Official organization profile and business registration data.'}
                  </p>
                </div>
                {activeOrg?.subscription && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-hover)',
                      border: '1px solid var(--primary-border)',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    👑 {activeOrg.subscription.planName}
                  </span>
                )}
              </div>

              {!isOrgAdmin && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    ℹ️ You are viewing company details in read-only mode for role <strong>{activeOrg?.role}</strong>.
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Read-Only</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Organization Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isOrgAdmin}
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="search-input"
                      placeholder="e.g. Apex Logistics & Tech Solutions Pvt Ltd"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Subdomain Identifier (Slug)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={settings.slug}
                      className="search-input"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-tertiary)',
                        cursor: 'not-allowed',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                      Unique SaaS tenant identifier. Managed by system.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      GSTIN (Goods & Services Tax Number)
                    </label>
                    <input
                      type="text"
                      disabled={!isOrgAdmin}
                      value={settings.businessGstin || ''}
                      onChange={(e) => setSettings({ ...settings, businessGstin: e.target.value.toUpperCase() })}
                      className="search-input"
                      placeholder="e.g. 27AAPCA1234F1Z5"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        fontFamily: 'var(--font-mono)',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Business Contact Phone
                    </label>
                    <input
                      type="text"
                      disabled={!isOrgAdmin}
                      value={settings.businessPhone || ''}
                      onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                      className="search-input"
                      placeholder="e.g. +91 98765 43210"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Registered Business Address
                    </label>
                    <textarea
                      rows={2}
                      disabled={!isOrgAdmin}
                      value={settings.businessAddress || ''}
                      onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                      className="search-input"
                      placeholder="Plot No., Building / Industrial Area, Landmark"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        resize: 'vertical',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      City
                    </label>
                    <input
                      type="text"
                      disabled={!isOrgAdmin}
                      value={settings.city || ''}
                      onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                      className="search-input"
                      placeholder="e.g. Mumbai"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      State
                    </label>
                    <input
                      type="text"
                      disabled={!isOrgAdmin}
                      value={settings.state || ''}
                      onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                      className="search-input"
                      placeholder="e.g. Maharashtra"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      disabled={!isOrgAdmin}
                      value={settings.pincode || ''}
                      onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                      className="search-input"
                      placeholder="e.g. 400093"
                      style={{
                        fontSize: '14px',
                        padding: '10px 14px',
                        ...(!isOrgAdmin ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', cursor: 'not-allowed' } : {}),
                      }}
                    />
                  </div>
                </div>

                {isOrgAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ padding: '10px 24px', fontSize: '14px' }}
                    >
                      {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: TEAM MEMBERS */}
          {activeTab === 'members' && (
            <div className="table-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Team Members & Access Control ({members.length})
                  </h3>
                  <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                    Users authorized to access this organization’s inventory, CRM, and financial data.
                  </p>
                </div>
                {hasRole(['ORG_ADMIN', 'ADMIN']) && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <IconUsers size={14} />
                    Add Member
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Team Member</th>
                      <th>Email Address</th>
                      <th>Assigned Role</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.membershipId}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary-hover)',
                                border: '1px solid var(--primary-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                              }}
                            >
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
                          {m.email}
                        </td>
                        <td>
                          <span
                            className={`badge ${getRoleBadgeClass(m.role)}`}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <IconShield size={12} />
                            {m.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge badge-success"
                            style={{
                              backgroundColor: 'var(--success-light)',
                              color: 'var(--success)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            ● {m.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                          {new Date(m.joinedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {hasRole(['ORG_ADMIN', 'ADMIN']) && m.userId !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(m.membershipId, m.name)}
                              className="btn-icon"
                              style={{ color: 'var(--danger)' }}
                              title="Remove member"
                            >
                              <IconTrash size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="table-card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Organization Security Audit Trail
                </h3>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  Immutable log of all administrative actions, membership changes, and settings updates.
                </p>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {log.actor?.name || log.actor?.email || 'System'}
                          </td>
                          <td>
                            <span
                              style={{
                                color: 'var(--primary-hover)',
                                backgroundColor: 'var(--primary-light)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {log.resource}
                          </td>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.metadata || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowInviteModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
              maxWidth: '460px',
              padding: '24px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-lg)',
              margin: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Add Team Member
              </h2>
              <button
                className="btn-icon"
                onClick={() => setShowInviteModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteMember}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="search-input"
                  placeholder="e.g. Ramesh Patel"
                  style={{ width: '100%', fontSize: '13.5px', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="search-input"
                  placeholder="e.g. ramesh@company.com"
                  style={{ width: '100%', fontSize: '13.5px', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Assigned Workspace Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="filter-select"
                  style={{ width: '100%', fontSize: '13.5px', padding: '9px 12px' }}
                >
                  <option value="SALES">SALES — Customers CRM & Delivery Challans</option>
                  <option value="WAREHOUSE">WAREHOUSE — Products, Stock Takes & Inwarding</option>
                  <option value="ACCOUNTS">ACCOUNTS — Ledgers, Invoices & Financial Reports</option>
                  <option value="ORG_ADMIN">ORG_ADMIN — Full Tenant Administration & Settings</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="search-input"
                  placeholder="Min 6 characters"
                  style={{ width: '100%', fontSize: '13.5px', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Confirm & Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSettings;
