import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customerService, type CustomerFilterParams } from '../services/customer.service';
import { handleApiError } from '../services/api';
import type { Customer, CustomerType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Table, type TableColumn } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { CustomerModal } from '../components/customers/CustomerModal';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { IconPlus, IconDownload, IconUsers, IconTruck } from '../components/common/Icons';
import type { CustomerFormData } from '../components/customers/CustomerFormFields';
import { exportToCsv } from '../utils/csvExport';

const EMPTY_FORM: CustomerFormData = {
  name: '', mobile: '', email: '', businessName: '', gstNumber: '',
  customerType: 'RETAIL', address: '', status: 'LEAD', followUpDate: '', notes: '',
};


export const Customers: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const canEdit = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerType, setCustomerType] = useState('');

  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_customer_page_size');
    return saved ? Number(saved) : 10;
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: CustomerFilterParams = {
        page, limit: pageSize,
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
  }, [page, pageSize, search, status, customerType]);

  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };

  // Calculate high-level summary metrics
  const metrics = useMemo(() => {
    const total = totalItems || customers.length;
    const active = customers.filter((c) => c.status === 'ACTIVE').length;
    const leads = customers.filter((c) => c.status === 'LEAD').length;
    const withGst = customers.filter((c) => Boolean(c.gstNumber?.trim())).length;
    return { total, active, leads, withGst };
  }, [customers, totalItems]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAdd = () => { setFormData(EMPTY_FORM); setSubmitError(null); setModalMode('add'); };

  const openEdit = (cust: Customer) => {
    setSelectedCust(cust);
    setFormData({
      name: cust.name, mobile: cust.mobile, email: cust.email,
      businessName: cust.businessName, gstNumber: cust.gstNumber ?? '',
      customerType: cust.customerType, address: cust.address,
      status: cust.status, followUpDate: cust.followUpDate ? cust.followUpDate.split('T')[0] : '',
      notes: cust.notes ?? '',
    });
    setSubmitError(null);
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setSelectedCust(null); };

  const validateForm = (): boolean => {
    const required = [formData.name, formData.mobile, formData.email, formData.businessName, formData.address];
    if (required.some((f) => !f.trim())) {
      setSubmitError('Please complete all required fields.');
      return false;
    }
    return true;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await customerService.createCustomer({
        ...formData,
        gstNumber: formData.gstNumber.trim() || undefined,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes.trim() || undefined,
      });
      closeModal();
      void fetchCustomers();
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
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await customerService.updateCustomer(selectedCust.id, {
        name: formData.name.trim(), mobile: formData.mobile.trim(),
        email: formData.email.trim(), businessName: formData.businessName.trim(),
        gstNumber: formData.gstNumber.trim() || undefined,
        customerType: formData.customerType, address: formData.address.trim(),
        status: formData.status, followUpDate: formData.followUpDate || undefined,
        notes: formData.notes.trim() || undefined,
      });
      closeModal();
      void fetchCustomers();
    } catch (err) {
      setSubmitError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Business & Contact',
      render: (c) => {
        const initial = (c.businessName || c.name || 'C').charAt(0).toUpperCase();
        return (
          <div className="customer-cell">
            <div className="customer-avatar">{initial}</div>
            <div>
              <Link to={`/customers/${c.id}`} className="fw-700 color-primary d-block">
                {c.businessName || c.name}
              </Link>
              <div className="fs-12 color-tertiary">
                Contact: {c.name} · {c.mobile}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'gstNumber',
      header: 'Tax Status',
      render: (c) => (
        c.gstNumber ? (
          <span className="badge badge-info text-mono" style={{ fontSize: '11px' }}>
            GST: {c.gstNumber}
          </span>
        ) : (
          <span className="color-tertiary fs-12">Unregistered</span>
        )
      ),
    },
    {
      key: 'customerType',
      header: 'Classification',
      render: (c) => (
        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
          {c.customerType.toLowerCase()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => StatusBadge.customer(c.status),
    },
    {
      key: 'followUpDate',
      header: 'Follow Up',
      render: (c) => (
        c.followUpDate ? (
          <span className="fs-12 fw-600 color-primary">
            {new Date(c.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        ) : (
          <span className="color-tertiary fs-12">—</span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex-center gap-6" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/customers/${c.id}`)}
          >
            View
          </button>
          {canEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); openEdit(c); }}
            >
              Edit
            </button>
          )}
        </div>
      ),
    },
  ];



  const handleExportCsv = () => {
    exportToCsv(
      `customers_${new Date().toISOString().slice(0, 10)}`,
      customers as unknown as Record<string, unknown>[],
      [
        { key: 'name', label: 'Contact Name' },
        { key: 'businessName', label: 'Business Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'email', label: 'Email' },
        { key: 'customerType', label: 'Customer Tier' },
        { key: 'status', label: 'Status' },
        { key: 'gstNumber', label: 'GSTIN' },
        { key: 'address', label: 'Address' },
      ]
    );
  };

  return (
    <div>
      <PageHeader
        title="Customer Directory & CRM"
        subtitle="Manage B2B customer accounts, follow-up reminders, and tax profiles."
        actions={
          <div className="flex-center gap-8">
            {customers.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} id="export-customers-btn">
                <IconDownload size={14} /> Export CSV
              </button>
            )}
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={openAdd} id="add-customer-btn">
                <IconPlus size={14} /> Add Customer
              </button>
            )}
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Total Accounts</span>
            <div className="stat-card__icon stat-card__icon--purple">
              <IconUsers size={18} />
            </div>
          </div>
          <div className="stat-card__value">{metrics.total}</div>
          <div className="stat-card__footer">Registered corporate clients</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Active Clients</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconUsers size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--success)' }}>
            {metrics.active}
          </div>
          <div className="stat-card__footer">Regular ordering accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Prospective Leads</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconUsers size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--warning)' }}>
            {metrics.leads}
          </div>
          <div className="stat-card__footer">In pipeline / awaiting first order</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">GST Compliant</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconTruck size={18} />
            </div>
          </div>
          <div className="stat-card__value">{metrics.withGst}</div>
          <div className="stat-card__footer">Verified tax-registered entities</div>
        </div>
      </div>

      <div className="toolbar-card">
        <SearchBar onSearch={handleSearch} placeholder="Search by name, company, email, phone…" id="customer-search" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show:</span>
          <select
            className="filter-select"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setPage(1);
              localStorage.setItem('stockpulse_customer_page_size', String(newSize));
            }}
            aria-label="Items per page limit"
            style={{ width: 'auto', minWidth: '95px' }}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="30">30 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>

        <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Clients</option>
          <option value="LEAD">Prospect Leads</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select className="filter-select" value={customerType} onChange={(e) => { setCustomerType(e.target.value as CustomerType | ''); setPage(1); }} aria-label="Filter by type">
          <option value="">All Account Tiers</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      <div className="table-card">
        <Table columns={columns} data={customers} keyExtractor={(c) => c.id} isLoading={loading}
          emptyMessage="No customers found matching your filters." />
        {!loading && customers.length > 0 && (
          <div className="pagination-footer">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–
              {Math.min(page * pageSize, totalItems)} of {totalItems} customers
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
                localStorage.setItem('stockpulse_customer_page_size', String(newSize));
              }}
              pageSizeOptions={[10, 25, 30, 50, 100]}
              totalItems={totalItems}
            />
          </div>
        )}
      </div>

      {modalMode && (
        <CustomerModal mode={modalMode} formData={formData} onChange={handleFormChange}
          onSubmit={modalMode === 'add' ? handleAddSubmit : handleEditSubmit}
          onClose={closeModal} submitError={submitError} submitting={submitting} />
      )}
    </div>
  );
};

export default Customers;
