import React, { useState, useEffect } from 'react';
import { allotSoftwareLicense } from '../../services/admin.service';
import { handleApiError } from '../../services/api';
import type { User, LicenseTier, LicenseStatus } from '../../types/admin';

interface LicenseModalProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_FEATURES = [
  { id: 'CORE_ERP', label: 'Core ERP Modules (Stock Catalog & Movements)' },
  { id: 'CRM', label: 'CRM & Customer Directory' },
  { id: 'CHALLANS', label: 'Delivery Challans Module' },
  { id: 'BASIC_REPORTS', label: 'Stock Movement Reports' },
  { id: 'ADVANCED_INVENTORY', label: 'Advanced Inventory & Reorder Auditing' },
  { id: 'WHATSAPP_TX', label: 'WhatsApp Conversational Transaction Engine' },
  { id: 'EXPORT_EXCEL', label: 'Data Export to CSV/Excel' }
];

export const LicenseModal: React.FC<LicenseModalProps> = ({ user, onClose, onSave }) => {
  const [tier, setTier] = useState<LicenseTier>('STARTER');
  const [status, setStatus] = useState<LicenseStatus>('ACTIVE');
  const [maxCustomers, setMaxCustomers] = useState(100);
  const [maxTransactions, setMaxTransactions] = useState(500);
  const [maxProducts, setMaxProducts] = useState(200);
  const [allowedFeatures, setAllowedFeatures] = useState<string[]>(['CORE_ERP', 'CRM']);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user.license) {
      setTier(user.license.tier);
      setStatus(user.license.status);
      setMaxCustomers(user.license.maxCustomers);
      setMaxTransactions(user.license.maxTransactions);
      setAllowedFeatures(user.license.allowedFeatures || []);
      setExpiresAt(user.license.expiresAt ? new Date(user.license.expiresAt).toISOString().split('T')[0] : '');
    }
  }, [user]);

  const handleTierChange = (newTier: LicenseTier) => {
    setTier(newTier);
    if (newTier === 'STARTER') {
      setMaxCustomers(100);
      setMaxTransactions(500);
      setMaxProducts(200);
      setAllowedFeatures(['CORE_ERP', 'CRM', 'BASIC_REPORTS']);
    } else if (newTier === 'PRO') {
      setMaxCustomers(500);
      setMaxTransactions(2500);
      setMaxProducts(1000);
      setAllowedFeatures(['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS', 'ADVANCED_INVENTORY']);
    } else if (newTier === 'ENTERPRISE') {
      setMaxCustomers(2000);
      setMaxTransactions(10000);
      setMaxProducts(5000);
      setAllowedFeatures(['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS', 'ADVANCED_INVENTORY', 'WHATSAPP_TX', 'EXPORT_EXCEL']);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setAllowedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await allotSoftwareLicense(user.id, {
        tier,
        status,
        maxCustomers,
        maxTransactions,
        maxProducts,
        allowedFeatures,
        expiresAt: expiresAt || null,
        notes
      });
      onSave();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            Configure Software License: <span className="color-primary">{user.name}</span>
          </h3>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">LICENSE TIER</label>
              <select
                value={tier}
                onChange={(e) => handleTierChange(e.target.value as LicenseTier)}
                className="form-input"
              >
                <option value="STARTER">Starter Tier</option>
                <option value="PRO">Professional Tier</option>
                <option value="ENTERPRISE">Enterprise Suite</option>
                <option value="CUSTOM">Custom Configuration</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">LICENSE STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LicenseStatus)}
                className="form-input"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>USAGE &amp; QUANTITY LIMITS</h4>
            
            <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', textAlign: 'center' }}>Max Customers</label>
                <input
                  type="number"
                  value={maxCustomers}
                  onChange={(e) => setMaxCustomers(Number(e.target.value))}
                  className="form-input"
                  style={{ textAlign: 'center' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', textAlign: 'center' }}>Max Transactions</label>
                <input
                  type="number"
                  value={maxTransactions}
                  onChange={(e) => setMaxTransactions(Number(e.target.value))}
                  className="form-input"
                  style={{ textAlign: 'center' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', textAlign: 'center' }}>Max Products</label>
                <input
                  type="number"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(Number(e.target.value))}
                  className="form-input"
                  style={{ textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '8px' }}>GRANTED FEATURE PERMISSIONS</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', background: 'var(--bg-tertiary)' }}>
              {AVAILABLE_FEATURES.map((feature) => (
                <label key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={allowedFeatures.includes(feature.id)}
                    onChange={() => handleFeatureToggle(feature.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{feature.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">EXPIRATION DATE (Optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">LICENSE KEY PREVIEW</label>
              <div className="text-mono" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '9px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {user.license?.licenseKey || 'SP-XXXX-XXXX-XXXX (Auto Generated)'}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ADMINISTRATIVE NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Enterprise license approved by finance department."
              rows={2}
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
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary btn-sm"
            >
              {submitting ? 'Allotting Software License...' : 'Apply License Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
