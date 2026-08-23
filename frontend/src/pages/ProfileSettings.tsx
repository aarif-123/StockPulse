import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api, handleApiError } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { IconCheck, IconShield } from '../components/common/Icons';

export const ProfileSettings: React.FC = () => {
  const { user, activeOrg } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getRoleBadgeClass = (role?: string) => {
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
        return 'Full business, team, inventory, financial, and administrative management privileges.';
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/auth/profile', { name, phone, avatarUrl });
      setSuccess('Your profile details have been updated successfully.');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    setSavingPassword(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setSuccess('Your password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Profile Settings"
        subtitle="Manage your personal user account profile, display name, contact phone, and security password."
      />

      {/* Alert Messages */}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Personal Details & Avatar Card */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            👤 Personal Details & Avatar
          </h3>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-hover)',
                  border: '2px solid var(--primary-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                {name.charAt(0).toUpperCase() || 'U'}
              </div>

              <div style={{ flex: 1 }}>
                <span className={`badge ${getRoleBadgeClass(activeOrg?.role || user?.role)}`} style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700 }}>
                  <IconShield size={12} style={{ marginRight: '4px' }} />
                  {activeOrg?.role || user?.role || 'SALES'} Role
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {activeOrg?.organizationName || 'StockPulse Workspace'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="search-input"
                  placeholder="Your Full Name"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="search-input"
                  style={{ fontSize: '14px', padding: '10px 14px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-tertiary)', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Email address managed by your Organization Admin.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="search-input"
                  placeholder="e.g. +91 98765 43210"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Profile Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="search-input"
                  placeholder="https://example.com/avatar.jpg"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '13.5px' }}
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
            🔒 Security & Password
          </h3>

          <form onSubmit={handleUpdatePassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="search-input"
                  placeholder="Enter current password"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="search-input"
                  placeholder="At least 6 characters"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="search-input"
                  placeholder="Re-enter new password"
                  style={{ fontSize: '14px', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                type="submit"
                disabled={savingPassword}
                className="btn btn-secondary"
                style={{ padding: '8px 20px', fontSize: '13.5px' }}
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Role Capabilities Summary */}
          <div style={{ marginTop: '24px', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Role Capabilities ({activeOrg?.role || user?.role || 'SALES'})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {getRoleDescription(activeOrg?.role || user?.role)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
