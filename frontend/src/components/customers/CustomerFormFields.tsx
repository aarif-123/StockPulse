/**
 * Shared form fields used by both Add and Edit customer modals.
 * The parent owns formData state; this component only renders inputs.
 */

import React from 'react';
import type { CustomerType, CustomerStatus } from '../../types';

export interface CustomerFormData {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
}

interface CustomerFormFieldsProps {
  formData: CustomerFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => void;
}

export function CustomerFormFields({
  formData,
  onChange,
}: CustomerFormFieldsProps): React.ReactElement {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            className="form-input"
            name="name"
            required
            value={formData.name}
            onChange={onChange}
            placeholder="e.g. John Doe"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number *</label>
          <input
            className="form-input"
            name="mobile"
            required
            value={formData.mobile}
            onChange={onChange}
            placeholder="e.g. 9876543210"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input
            className="form-input"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={onChange}
            placeholder="e.g. john@example.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Business Name *</label>
          <input
            className="form-input"
            name="businessName"
            required
            value={formData.businessName}
            onChange={onChange}
            placeholder="e.g. Doe Enterprises"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">GST Number (Optional)</label>
          <input
            className="form-input"
            name="gstNumber"
            value={formData.gstNumber}
            onChange={onChange}
            placeholder="15-digit GSTIN"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Customer Type *</label>
          <select
            className="filter-select"
            style={{ width: '100%' }}
            name="customerType"
            value={formData.customerType}
            onChange={onChange}
          >
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Address *</label>
        <input
          className="form-input"
          name="address"
          required
          value={formData.address}
          onChange={onChange}
          placeholder="Full Business Address"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status *</label>
          <select
            className="filter-select"
            style={{ width: '100%' }}
            name="status"
            value={formData.status}
            onChange={onChange}
          >
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Follow Up Date (Optional)</label>
          <input
            className="form-input"
            name="followUpDate"
            type="date"
            value={formData.followUpDate}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes (Optional)</label>
        <textarea
          className="form-input"
          style={{ minHeight: '80px', resize: 'vertical' }}
          name="notes"
          value={formData.notes}
          onChange={onChange}
          placeholder="Enter customer specific follow-up details..."
        />
      </div>
    </>
  );
}
