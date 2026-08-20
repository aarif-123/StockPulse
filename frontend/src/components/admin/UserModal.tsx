import React, { useState, useEffect } from 'react';
import { createUser, updateUser } from '../../services/admin.service';
import { handleApiError } from '../../services/api';
import type { User, Role, UserStatus } from '../../types/admin';

interface UserModalProps {
  user?: User | null;
  onClose: () => void;
  onSave: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ user, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('SALES');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!user;

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode && user) {
        await updateUser(user.id, {
          name,
          email,
          role,
          status,
          password: password || undefined
        });
      } else {
        await createUser({
          name,
          email,
          role,
          status,
          password: password || undefined
        });
      }
      onSave();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditMode ? 'Edit User Credentials' : 'Add New Platform User'}
          </h3>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">FULL NAME</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">EMAIL ADDRESS</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@business.com"
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">PLATFORM ROLE</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="form-input"
              >
                <option value="SALES">Sales Agent</option>
                <option value="WAREHOUSE">Warehouse Clerk</option>
                <option value="ACCOUNTS">Accountant</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ACCOUNT STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus)}
                className="form-input"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING">Pending Approval</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {isEditMode ? 'PASSWORD RESET (Optional)' : 'INITIAL PASSWORD'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditMode ? 'Leave blank to retain original' : 'At least 6 characters'}
              className="form-input"
            />
          </div>

          <div className="modal-footer" style={{ borderTop: 'none', padding: '16px 0 0 0' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Saving User...' : isEditMode ? 'Update Account' : 'Onboard User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

