import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { challanService } from '../services/challan.service';
import { dashboardService } from '../services/dashboard.service';
import { handleApiError } from '../services/api';
import type { Challan, ChallanStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';
import { Table, type TableColumn } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { SearchBar } from '../components/common/SearchBar';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ChallanQuickDrawer } from '../components/challans/ChallanQuickDrawer';
import {
  IconPlus,
  IconDownload,
  IconGrid,
  IconList,
  IconCopy,
  IconCheck,
  IconTruck,
  IconClock,
  IconAlertTriangle,
} from '../components/common/Icons';
import { exportToCsv } from '../utils/csvExport';

type SortOption = 'newest' | 'oldest' | 'qty_desc' | 'qty_asc' | 'number_asc';

export const Challans: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const { toasts, toast, removeToast } = useToast();
  const canModify = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);
  const canCreate = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES']);
  const canConfirm = hasRole(['ORG_ADMIN', 'ADMIN', 'SALES', 'WAREHOUSE']);

  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [statusFilter, setStatusFilter] = useState<'ALL' | ChallanStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [datePreset, setDatePreset] = useState<'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS'>('ALL_TIME');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Pagination & User-Configurable Limits
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('stockpulse_challan_page_size');
    return saved ? Number(saved) : 10;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Global Workspace Metric Counts
  const [workspaceMetrics, setWorkspaceMetrics] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    cancelled: 0,
    totalUnits: 0,
  });

  // Quick Drawer & Confirm State
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Save page size preference
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    localStorage.setItem('stockpulse_challan_page_size', String(newSize));
  };

  // Fetch Workspace Metrics
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      const stats = await dashboardService.getStats();
      if (stats && stats.challans) {
        setWorkspaceMetrics({
          total: (stats.challans.totalDraft || 0) + (stats.challans.totalConfirmed || 0) + (stats.challans.cancelledThisMonth || 0),
          draft: stats.challans.totalDraft || 0,
          confirmed: stats.challans.totalConfirmed || 0,
          cancelled: stats.challans.cancelledThisMonth || 0,
          totalUnits: 0,
        });
      }
    } catch {
      // Fallback
    }
  }, []);

  // Fetch Challans with Server-Side Filtering & Limit
  const fetchChallans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await challanService.getChallans({
        page,
        limit: pageSize,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });

      setChallans(response.data);
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchQuery]);

  useEffect(() => {
    void fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  useEffect(() => {
    void fetchChallans();
  }, [fetchChallans]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page, statusFilter]);

  // Client-side sorting and date filtering for the fetched page
  const sortedChallans = useMemo(() => {
    let list = [...challans];

    if (datePreset !== 'ALL_TIME') {
      const now = new Date();
      const cutoff = new Date();
      if (datePreset === 'TODAY') cutoff.setHours(0, 0, 0, 0);
      else if (datePreset === 'YESTERDAY') {
        cutoff.setDate(cutoff.getDate() - 1);
        cutoff.setHours(0, 0, 0, 0);
      } else if (datePreset === 'LAST_7_DAYS') cutoff.setDate(now.getDate() - 7);
      else if (datePreset === 'LAST_30_DAYS') cutoff.setDate(now.getDate() - 30);

      list = list.filter((c) => new Date(c.createdAt) >= cutoff);
    }

    return list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'qty_desc') return b.totalQuantity - a.totalQuantity;
      if (sortBy === 'qty_asc') return a.totalQuantity - b.totalQuantity;
      if (sortBy === 'number_asc') return a.challanNumber.localeCompare(b.challanNumber);
      return 0;
    });
  }, [challans, sortBy, datePreset]);

  const handleStatusFilter = (status: 'ALL' | ChallanStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  const handleCopyNumber = (e: React.MouseEvent, num: string) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(num);
    toast.info(`Copied ${num} to clipboard`);
  };

  const handleQuickConfirm = async (e: React.MouseEvent, challan: Challan) => {
    e.stopPropagation();
    const ok = window.confirm(
      `Confirm Delivery Challan ${challan.challanNumber}? This will deduct inventory.`
    );
    if (!ok) return;

    setActionInProgressId(challan.id);
    try {
      await challanService.confirmChallan(challan.id);
      toast.success(`Challan ${challan.challanNumber} confirmed & stock deducted.`);
      void fetchChallans();
      void fetchGlobalMetrics();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleExportCsv = () => {
    exportToCsv(
      `delivery_challans_${new Date().toISOString().slice(0, 10)}`,
      sortedChallans.map((c) => ({
        'Challan Number': c.challanNumber,
        Customer: c.customer?.businessName || c.customer?.name || '—',
        'Contact Person': c.customer?.name || '—',
        'Customer GSTIN': c.customer?.gstNumber || 'Unregistered',
        'Total Quantity': c.totalQuantity,
        Status: c.status,
        'Created By': c.creator?.name || 'System',
        Date: new Date(c.createdAt).toLocaleDateString(),
      }))
    );
  };

  const columns: TableColumn<Challan>[] = [
    {
      key: 'challanNumber',
      header: 'Challan ID',
      render: (c) => (
        <div className="flex-center gap-6" style={{ justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="copy-pill"
            onClick={(e) => handleCopyNumber(e, c.challanNumber)}
            title="Click to copy Challan ID"
          >
            <IconCopy size={12} />
            <span>{c.challanNumber}</span>
          </button>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer & Consignee',
      render: (c) => {
        const name = c.customer?.businessName || c.customer?.name || 'Unknown';
        const initial = name.charAt(0).toUpperCase();
        return (
          <div className="customer-cell">
            <div className="customer-avatar">{initial}</div>
            <div>
              <div className="customer-cell__title">{name}</div>
              <div className="customer-cell__sub">
                {c.customer?.gstNumber ? (
                  <span
                    className="badge badge-info fs-11"
                    style={{ padding: '1px 5px', fontSize: '10px' }}
                  >
                    GST: {c.customer.gstNumber}
                  </span>
                ) : (
                  <span>Contact: {c.customer?.name || '—'}</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalQuantity',
      header: 'Dispatched Qty',
      render: (c) => (
        <div>
          <div className="fw-700 fs-13" style={{ color: 'var(--text-primary)' }}>
            {c.totalQuantity} units
          </div>
          <div className="fs-11 color-tertiary">
            {c.status === 'CONFIRMED' ? 'Deducted from stock' : 'Stock pending'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => StatusBadge.challan(c.status),
    },
    {
      key: 'creator',
      header: 'Created By',
      render: (c) => (
        <div>
          <div className="fs-13 fw-500">{c.creator?.name || 'System'}</div>
          <div className="fs-11 color-tertiary">{c.creator?.role || 'Staff'}</div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Dispatch Date',
      render: (c) => {
        const dateObj = new Date(c.createdAt);
        return (
          <div>
            <div className="fs-12 fw-500">{dateObj.toLocaleDateString()}</div>
            <div className="fs-11 color-tertiary">
              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex-center gap-6" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedChallanId(c.id);
            }}
            title="Quick Preview"
          >
            Preview
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/challans/${c.id}`);
            }}
          >
            Slip
          </button>

          {c.status === 'DRAFT' && canConfirm && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={(e) => handleQuickConfirm(e, c)}
              disabled={actionInProgressId === c.id}
              title="Confirm Delivery & Deduct Inventory"
            >
              <IconCheck size={13} />
              <span>{actionInProgressId === c.id ? '...' : 'Confirm'}</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Slide-Over Quick Preview Drawer */}
      <ChallanQuickDrawer
        challanId={selectedChallanId}
        isOpen={Boolean(selectedChallanId)}
        onClose={() => setSelectedChallanId(null)}
        onStatusChanged={() => {
          void fetchChallans();
          void fetchGlobalMetrics();
        }}
        canModify={canModify}
        onToast={(type, msg) => {
          if (type === 'success') toast.success(msg);
          else if (type === 'error') toast.error(msg);
          else if (type === 'warning') toast.warning(msg);
          else toast.info(msg);
        }}
      />

      <PageHeader
        title="Delivery Challans"
        subtitle="Manage dispatch operations, track shipment slips, and confirm outbound deliveries."
        actions={
          <div className="flex-center gap-8">
            {challans.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportCsv}
                id="export-challans-btn"
              >
                <IconDownload size={14} /> Export CSV
              </button>
            )}
            {canCreate && (
              <Link to="/challans/new" className="btn btn-primary btn-sm" id="new-challan-btn">
                <IconPlus size={14} /> New Challan
              </Link>
            )}
          </div>
        }
      />

      {error && <div className="alert alert-danger mb-16">{error}</div>}

      {/* Interactive Metric Filter Cards */}
      <div className="stats-grid">
        <div
          className={`stat-card stat-card--clickable ${statusFilter === 'ALL' ? 'stat-card--selected' : ''}`}
          onClick={() => handleStatusFilter('ALL')}
          title="Click to view all challans"
        >
          <div className="stat-card__header">
            <span className="stat-card__label">Total Challans</span>
            <div className="stat-card__icon stat-card__icon--blue">
              <IconTruck size={18} />
            </div>
          </div>
          <div className="stat-card__value">
            {workspaceMetrics.total > 0 ? workspaceMetrics.total : totalItems}
          </div>
          <div className="stat-card__footer">All active & past dispatch records</div>
        </div>

        <div
          className={`stat-card stat-card--clickable ${statusFilter === 'DRAFT' ? 'stat-card--selected' : ''}`}
          onClick={() => handleStatusFilter('DRAFT')}
          title="Click to view draft challans"
        >
          <div className="stat-card__header">
            <span className="stat-card__label">Draft Pending</span>
            <div className="stat-card__icon stat-card__icon--yellow">
              <IconClock size={18} />
            </div>
          </div>
          <div
            className="stat-card__value"
            style={{ color: workspaceMetrics.draft > 0 ? 'var(--warning)' : 'inherit' }}
          >
            {workspaceMetrics.draft}
          </div>
          <div className="stat-card__footer">
            {workspaceMetrics.draft > 0 ? 'Requires delivery confirmation' : 'No pending drafts'}
          </div>
        </div>

        <div
          className={`stat-card stat-card--clickable ${statusFilter === 'CONFIRMED' ? 'stat-card--selected' : ''}`}
          onClick={() => handleStatusFilter('CONFIRMED')}
          title="Click to view confirmed challans"
        >
          <div className="stat-card__header">
            <span className="stat-card__label">Confirmed Dispatches</span>
            <div className="stat-card__icon stat-card__icon--green">
              <IconCheck size={18} />
            </div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--success)' }}>
            {workspaceMetrics.confirmed}
          </div>
          <div className="stat-card__footer">Active confirmed dispatches</div>
        </div>

        <div
          className={`stat-card stat-card--clickable ${statusFilter === 'CANCELLED' ? 'stat-card--selected' : ''}`}
          onClick={() => handleStatusFilter('CANCELLED')}
          title="Click to view cancelled challans"
        >
          <div className="stat-card__header">
            <span className="stat-card__label">Cancelled</span>
            <div className="stat-card__icon stat-card__icon--purple">
              <IconAlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card__value">{workspaceMetrics.cancelled}</div>
          <div className="stat-card__footer">Voided / aborted shipments</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="status-tabs">
        <button
          type="button"
          className={`status-tab ${statusFilter === 'ALL' ? 'status-tab--active' : ''}`}
          onClick={() => handleStatusFilter('ALL')}
        >
          <span>All Dispatches</span>
          <span className="status-tab__count">
            {workspaceMetrics.total > 0 ? workspaceMetrics.total : totalItems}
          </span>
        </button>

        <button
          type="button"
          className={`status-tab ${statusFilter === 'DRAFT' ? 'status-tab--active' : ''}`}
          onClick={() => handleStatusFilter('DRAFT')}
        >
          <span>⚡ Draft Pending</span>
          <span
            className="status-tab__count"
            style={{
              backgroundColor: workspaceMetrics.draft > 0 ? 'var(--warning)' : undefined,
              color: workspaceMetrics.draft > 0 ? '#000' : undefined,
            }}
          >
            {workspaceMetrics.draft}
          </span>
        </button>

        <button
          type="button"
          className={`status-tab ${statusFilter === 'CONFIRMED' ? 'status-tab--active' : ''}`}
          onClick={() => handleStatusFilter('CONFIRMED')}
        >
          <span>✅ Confirmed</span>
          <span className="status-tab__count">{workspaceMetrics.confirmed}</span>
        </button>

        <button
          type="button"
          className={`status-tab ${statusFilter === 'CANCELLED' ? 'status-tab--active' : ''}`}
          onClick={() => handleStatusFilter('CANCELLED')}
        >
          <span>❌ Cancelled</span>
          <span className="status-tab__count">{workspaceMetrics.cancelled}</span>
        </button>
      </div>

      {/* Toolbar: Search + Sort + View Mode Switcher */}
      <div className="toolbar-card">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search by Challan #, customer name, creator…"
          id="challan-search-input"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Date Filter */}
          <select
            className="filter-select"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            aria-label="Filter by Date"
            style={{ width: 'auto' }}
          >
            <option value="ALL_TIME">📅 All Time</option>
            <option value="TODAY">📅 Today</option>
            <option value="YESTERDAY">📅 Yesterday</option>
            <option value="LAST_7_DAYS">📅 Past 7 Days</option>
            <option value="LAST_30_DAYS">📅 Past 30 Days</option>
          </select>

          {/* User-Configurable Page Size Limit Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show:</span>
            <select
              className="filter-select"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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

          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort Challans"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="qty_desc">Sort: Quantity (High to Low)</option>
            <option value="qty_asc">Sort: Quantity (Low to High)</option>
            <option value="number_asc">Sort: Challan Number (A-Z)</option>
          </select>

          {/* View Mode Toggle: Table vs Cards */}
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-toggle__btn ${viewMode === 'table' ? 'view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <IconList size={16} />
            </button>
            <button
              type="button"
              className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Cards View"
            >
              <IconGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {sortedChallans.length === 0 && !loading ? (
        <div className="card">
          <EmptyState
            icon={<IconTruck size={36} />}
            title={
              searchQuery || statusFilter !== 'ALL'
                ? 'No matching challans found'
                : 'No delivery challans yet'
            }
            description={
              searchQuery || statusFilter !== 'ALL'
                ? 'Try resetting your search query or selecting a different status filter.'
                : 'Create your first delivery challan to track product movements and customer shipments.'
            }
            action={
              canCreate && statusFilter === 'ALL' && !searchQuery ? (
                <Link to="/challans/new" className="btn btn-primary btn-sm">
                  <IconPlus size={14} /> Create First Challan
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                    setPage(1);
                  }}
                >
                  Reset Filters
                </button>
              )
            }
          />
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW ── */
        <div className="table-card">
          <Table
            columns={columns}
            data={sortedChallans}
            keyExtractor={(c) => c.id}
            isLoading={loading}
            onRowClick={(c) => setSelectedChallanId(c.id)}
            emptyMessage="No delivery challans found."
          />

          {!loading && totalItems > 0 && (
            <div className="pagination-footer">
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–
                {Math.min(page * pageSize, totalItems)} of {totalItems} challans
              </span>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 30, 50, 100]}
                totalItems={totalItems}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── GRID CARDS VIEW ── */
        <div>
          <div className="challan-grid">
            {sortedChallans.map((c) => {
              const custName = c.customer?.businessName || c.customer?.name || 'Unknown';
              return (
                <div
                  key={c.id}
                  className="challan-card"
                  onClick={() => setSelectedChallanId(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Card Header */}
                  <div className="challan-card__header">
                    <div>
                      <div className="challan-card__number">{c.challanNumber}</div>
                      <div className="challan-card__date">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {StatusBadge.challan(c.status)}
                  </div>

                  {/* Customer Info */}
                  <div className="challan-card__customer">
                    <div className="challan-card__customer-name">{custName}</div>
                    <div className="challan-card__customer-contact">
                      {c.customer?.gstNumber ? `GST: ${c.customer.gstNumber}` : c.customer?.name || '—'}
                    </div>
                  </div>

                  {/* Quantity & Items Count */}
                  <div className="challan-card__meta">
                    <div>
                      <span className="challan-card__meta-label">Total Qty:</span>{' '}
                      <span className="challan-card__meta-value">{c.totalQuantity} units</span>
                    </div>
                    <div>
                      <span className="challan-card__meta-label">Items:</span>{' '}
                      <span className="challan-card__meta-value">{c.items?.length || 0} line items</span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="challan-card__footer" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/challans/${c.id}`)}
                    >
                      Slip
                    </button>
                    {c.status === 'DRAFT' && canModify && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={(e) => handleQuickConfirm(e, c)}
                        disabled={actionInProgressId === c.id}
                      >
                        <IconCheck size={13} />
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && totalItems > 0 && (
            <div className="pagination-footer" style={{ marginTop: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, totalItems)}–
                {Math.min(page * pageSize, totalItems)} of {totalItems} challans
              </span>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[10, 25, 30, 50, 100]}
                totalItems={totalItems}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Challans;
