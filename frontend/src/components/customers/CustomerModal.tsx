import React from 'react';
import { CustomerFormFields } from './CustomerFormFields';
import type { CustomerFormData } from './CustomerFormFields';

interface CustomerModalProps {
  mode: 'add' | 'edit';
  formData: CustomerFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitError: string | null;
  submitting: boolean;
}

/** Modal wrapper for both Add and Edit customer workflows. */
export function CustomerModal({
  mode,
  formData,
  onChange,
  onSubmit,
  onClose,
  submitError,
  submitting,
}: CustomerModalProps): React.ReactElement {
  const isAdd = mode === 'add';

  return (
    <div className="modal-overlay" role="dialog" aria-modal aria-label={isAdd ? 'Add New Customer' : 'Edit Customer Details'}>
      <div className="modal-dialog">
        <div className="modal-header">
          <span className="modal-title">{isAdd ? 'Add New Customer' : 'Edit Customer Details'}</span>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal" type="button">
            ×
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {submitError && <div className="alert alert-danger">{submitError}</div>}
            <CustomerFormFields formData={formData} onChange={onChange} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? isAdd ? 'Creating...' : 'Saving...'
                : isAdd ? 'Create Customer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
