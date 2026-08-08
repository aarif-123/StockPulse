import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customerService, type CustomerFilterParams } from '../services/customer.service';
import { handleApiError } from '../services/api';
import type { Customer, CustomerType, CustomerStatus } from '../types';
import { useAuth } from '../hooks/useAuth';

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user && ['ADMIN', 'SALES'].includes(user.role);

  // Lists & pagination
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerType, setCustomerType] = useState('');

  // Modal forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL' as CustomerType,
    address: '',
    status: 'LEAD' as CustomerStatus,
    followUpDate: '',
    notes: '',
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: CustomerFilterParams = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status || undefined,
        customerType: customerType || undefined,
      };

      const response = await customerService.getCustomers(filters);
      setCustomers(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, customerType]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounced search reset page
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>, type: 'status' | 'type') => {
    if (type === 'status') setStatus(e.target.value);
    if (type === 'type') setCustomerType(e.target.value);
    setPage(1);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setSubmitError(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setSelectedCust(cust);
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      email: cust.email,
      businessName: cust.businessName,
      gstNumber: cust.gstNumber || '',
      customerType: cust.customerType,
      address: cust.address,
      status: cust.status,
      followUpDate: cust.followUpDate ? cust.followUpDate.split('T')[0] : '',
      notes: cust.notes || '',
    });
    setSubmitError(null);
    setIsEditOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Simple validations
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.email.trim() || !formData.businessName.trim() || !formData.address.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        gstNumber: formData.gstNumber.trim() || undefined,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await customerService.createCustomer(payload);
      setIsAddOpen(false);
      fetchCustomers();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust) return;
    setSubmitError(null);

    if (!formData.name.trim() || !formData.mobile.trim() || !formData.email.trim() || !formData.businessName.trim() || !formData.address.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        businessName: formData.businessName.trim(),
        gstNumber: formData.gstNumber.trim() || undefined,
        customerType: formData.customerType,
        address: formData.address.trim(),
        status: formData.status,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes.trim() || undefined,
      };

      await customerService.updateCustomer(selectedCust.id, payload);
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderBadge = (itemStatus: string) => {
    if (itemStatus === 'ACTIVE') return <span className="badge badge-success">Active</span>;
    if (itemStatus === 'LEAD') return <span className="badge badge-info">Lead</span>;
    return <span className="badge badge-danger">Inactive</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers CRM</h1>
        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Add Customer
          </button>
        )}
      </div>

      {/* Toolbar filters */}
      <div className="toolbar-card">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, mobile, or business name..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="filter-select"
          value={status}
          onChange={(e) => handleFilterChange(e, 'status')}
        >
          <option value="">All Statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        <select
          className="filter-select"
          value={customerType}
          onChange={(e) => handleFilterChange(e, 'type')}
        >
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      {/* Main Table view */}
      {loading ? (
        <div className="page-loader">
          <div className="spinner"></div>
          <p>Loading customers list...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : customers.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>No customers found.</p>
          </div>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Business Name</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} style={{ fontWeight: 600, color: 'var(--primary-hover)' }}>
                        {c.name}
                      </Link>
                    </td>
                    <td>{c.businessName}</td>
                    <td>{c.mobile}</td>
                    <td style={{ textTransform: 'capitalize' }}>{c.customerType.toLowerCase()}</td>
                    <td>{renderBadge(c.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link to={`/customers/${c.id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          View
                        </Link>
                        {canEdit && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleOpenEdit(c)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-footer">
            <span>
              Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, totalItems)} of {totalItems} customers
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal Popup */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Add New Customer</span>
              <span className="modal-close-btn" onClick={() => setIsAddOpen(false)}>×</span>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {submitError && <div className="alert alert-danger">{submitError}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                    onChange={handleFormChange}
                    placeholder="Enter customer specific follow-up details..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal Popup */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="modal-title">Edit Customer Details</span>
              <span className="modal-close-btn" onClick={() => setIsEditOpen(false)}>×</span>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {submitError && <div className="alert alert-danger">{submitError}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      className="form-input"
                      name="mobile"
                      required
                      value={formData.mobile}
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input
                      className="form-input"
                      name="businessName"
                      required
                      value={formData.businessName}
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select
                      className="filter-select"
                      style={{ width: '100%' }}
                      name="customerType"
                      value={formData.customerType}
                      onChange={handleFormChange}
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
                    onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                      onChange={handleFormChange}
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
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Customers;
