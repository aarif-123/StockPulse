import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api, handleApiError } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import {
  IconCheck,
  IconExternalLink,
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconInfo,
  IconCheckCircle,
  IconList,
  IconGrid,
  IconClock,
  IconShield,
  IconX,
} from '../components/common/Icons';

export interface NotificationItem {
  id: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  payload?: Record<string, any>;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type DatePreset = 'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

export const NotificationHistory: React.FC = () => {
  const { activeOrg } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Notification Modal state
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // View state: 'timeline' or 'table'
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL_TIME');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Compute actual ISO dates based on preset selection
  const getDateRange = () => {
    if (datePreset === 'CUSTOM') {
      return { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
    }

    const now = new Date();
    if (datePreset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      return { startDate: todayStr, endDate: todayStr };
    }

    if (datePreset === 'YESTERDAY') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      return { startDate: yestStr, endDate: yestStr };
    }

    if (datePreset === 'LAST_7_DAYS') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      return { startDate: past7.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }

    if (datePreset === 'LAST_30_DAYS') {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      return { startDate: past30.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }

    return { startDate: undefined, endDate: undefined };
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange();

      const params: Record<string, any> = {
        page: currentPage,
        limit: 15,
        sortOrder,
      };

      if (statusFilter === 'UNREAD') params.unread = true;
      if (search.trim()) params.search = search.trim();
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/notifications', {
        params,
        headers: activeOrg ? { 'x-organization-id': activeOrg.organizationId } : {},
      });

      let items: NotificationItem[] = res.data.items || [];
      if (statusFilter === 'READ') {
        items = items.filter((n) => n.isRead);
      }

      setNotifications(items);
      setUnreadCount(res.data.unreadCount || 0);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [
    activeOrg?.organizationId,
    currentPage,
    statusFilter,
    severityFilter,
    typeFilter,
    datePreset,
    customStartDate,
    customEndDate,
    sortOrder,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory();
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`, {}, {
        headers: activeOrg ? { 'x-organization-id': activeOrg.organizationId } : {},
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification({ ...selectedNotification, isRead: true });
      }
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {}, {
        headers: activeOrg ? { 'x-organization-id': activeOrg.organizationId } : {},
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (selectedNotification) {
        setSelectedNotification({ ...selectedNotification, isRead: true });
      }
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleOpenDetails = (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    setSelectedNotification(item);
  };

  const getSeverityBadge = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="badge badge-danger" style={{ fontSize: '10px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <IconAlertTriangle size={11} /> CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="badge badge-warning" style={{ fontSize: '10px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <IconAlertTriangle size={11} /> WARNING
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="badge badge-success" style={{ fontSize: '10px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <IconCheckCircle size={11} /> SUCCESS
          </span>
        );
      default:
        return (
          <span className="badge badge-info" style={{ fontSize: '10px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
            <IconInfo size={11} /> INFO
          </span>
        );
    }
  };

  const getSeverityColor = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'SUCCESS': return '#10b981';
      default: return '#3b82f6';
    }
  };

  // Helper to generate rich business analysis for any notification
  const getDetailedNotificationExplanation = (item: NotificationItem) => {
    const type = item.type || 'SYSTEM_NOTICE';
    const title = (item.title || '').toLowerCase();
    const role = activeOrg?.role || 'SALES';

    if (type === 'STOCK_LOW' || title.includes('low stock')) {
      return {
        overview: 'Safety inventory threshold breach detected for catalog items.',
        impact: 'Available stock has fallen below the safety threshold. Continuing sales without restocking risks backorder fulfillment delays.',
        actionNeeded: `As a ${role} member, initiate a purchase requisition or coordinate with procurement to replenish stock.`,
        categoryLabel: 'Inventory Safety Threshold',
      };
    }

    if (type.includes('REORDER') || title.includes('replenished') || title.includes('restock')) {
      return {
        overview: 'Inventory inward restock batch successfully processed and added to catalog stock.',
        impact: 'Available stock levels updated across warehouse locations. Backorders can now be safely dispatched.',
        actionNeeded: `Sales and warehouse teams can now issue delivery challans and process pending customer orders.`,
        categoryLabel: 'Stock Replenishment & Restock',
      };
    }

    if (type === 'CHALLAN_PENDING' || title.includes('challan')) {
      return {
        overview: 'Delivery challan order issued for outward customer dispatch.',
        impact: 'Item stock reserved in warehouse. Pending physical pick, pack, and driver dispatch confirmation.',
        actionNeeded: 'Warehouse dispatch team should verify physical items against the challan sheet prior to dispatch.',
        categoryLabel: 'Sales Delivery Dispatch',
      };
    }

    if (type === 'ASSEMBLY_READY' || title.includes('assembly')) {
      return {
        overview: 'Bill of Materials (BOM) manufacturing assembly completed.',
        impact: 'Raw material sub-assemblies deducted and finished goods inventory credited to catalog.',
        actionNeeded: 'Inspect finished assembly goods and transfer to primary warehouse storage bin.',
        categoryLabel: 'Production & Manufacturing',
      };
    }

    return {
      overview: 'Operational business activity recorded in the organization workspace audit log.',
      impact: 'Catalog state, permission scope, or system entity updated according to workspace rules.',
      actionNeeded: 'No immediate action required. Maintained for operational audit compliance.',
      categoryLabel: 'Operational System Log',
    };
  };

  const criticalCount = notifications.filter((n) => n.severity === 'CRITICAL' || n.severity === 'WARNING').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Sleek Header */}
      <PageHeader
        title="Role Alerts & Audit Feed"
        subtitle="Operational event stream for inventory, delivery challans, assemblies, and payments."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleMarkAllRead}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  fontSize: '12px',
                  height: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                }}
              >
                <IconCheck size={14} /> Mark All Read ({unreadCount})
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchHistory}
              style={{ fontSize: '12px', height: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 12px' }}
            >
              <IconRefresh size={14} /> Refresh
            </button>
          </div>
        }
      />

      {/* COMPACT SUMMARY METRICS BAR */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '8px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {/* Total Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Total Logged:</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pagination.total || notifications.length}</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)' }}></div>

          {/* Unread Pill */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === 'UNREAD' ? 'ALL' : 'UNREAD')}
            title="Click to toggle unread filter"
          >
            <span style={{ color: 'var(--text-tertiary)' }}>Unread:</span>
            <span
              style={{
                backgroundColor: unreadCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: unreadCount > 0 ? '#f87171' : 'var(--text-tertiary)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: unreadCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
              }}
            >
              {unreadCount} Action Needed
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)' }}></div>

          {/* Warnings Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Warnings / Critical:</span>
            <span
              style={{
                backgroundColor: criticalCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: criticalCount > 0 ? '#fbbf24' : 'var(--text-tertiary)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                border: criticalCount > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
              }}
            >
              {criticalCount} Alerts
            </span>
          </div>
        </div>

        {/* Role Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Role Target:</span>
          <span className="badge badge-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>
            {activeOrg?.role || 'SALES'}
          </span>
        </div>
      </div>

      {/* COMPREHENSIVE MULTI-FILTER TOOLBAR */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Top Control Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-tertiary)', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                fontSize: '12px',
                backgroundColor: statusFilter === 'ALL' ? 'var(--bg-elevated)' : 'transparent',
                color: statusFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: statusFilter === 'ALL' ? 600 : 400,
              }}
            >
              All ({pagination.total || notifications.length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('UNREAD'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                fontSize: '12px',
                backgroundColor: statusFilter === 'UNREAD' ? 'var(--bg-elevated)' : 'transparent',
                color: statusFilter === 'UNREAD' ? '#60a5fa' : 'var(--text-tertiary)',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: statusFilter === 'UNREAD' ? 600 : 400,
              }}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('READ'); setCurrentPage(1); }}
              style={{
                height: '28px',
                padding: '0 12px',
                fontSize: '12px',
                backgroundColor: statusFilter === 'READ' ? 'var(--bg-elevated)' : 'transparent',
                color: statusFilter === 'READ' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: statusFilter === 'READ' ? 600 : 400,
              }}
            >
              Read History
            </button>
          </div>

          {/* Search Box & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '220px', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search title or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
                style={{
                  fontSize: '12px',
                  paddingLeft: '32px',
                  paddingRight: '10px',
                  height: '32px',
                  width: '100%',
                  borderRadius: '6px',
                }}
              />
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                title="Timeline View"
                onClick={() => setViewMode('timeline')}
                style={{
                  height: '28px',
                  width: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: viewMode === 'timeline' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'timeline' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <IconList size={14} />
              </button>
              <button
                type="button"
                title="Table View"
                onClick={() => setViewMode('table')}
                style={{
                  height: '28px',
                  width: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <IconGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Filter Row: Date Range, Severity, Category & Recency Ordering */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Date Preset Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>📅 Date:</span>
              <select
                className="filter-select"
                value={datePreset}
                onChange={(e) => { setDatePreset(e.target.value as DatePreset); setCurrentPage(1); }}
                style={{ fontSize: '12px', height: '30px', padding: '0 8px', borderRadius: '6px' }}
              >
                <option value="ALL_TIME">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Past 7 Days</option>
                <option value="LAST_30_DAYS">Past 30 Days</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
            </div>

            {/* Custom Date Pickers (Shown if CUSTOM selected) */}
            {datePreset === 'CUSTOM' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
                  className="filter-select"
                  style={{ fontSize: '11px', height: '30px', padding: '0 6px', borderRadius: '6px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
                  className="filter-select"
                  style={{ fontSize: '11px', height: '30px', padding: '0 6px', borderRadius: '6px' }}
                />
              </div>
            )}

            {/* Category Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>📂 Category:</span>
              <select
                className="filter-select"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '12px', height: '30px', padding: '0 8px', borderRadius: '6px' }}
              >
                <option value="ALL">All Categories</option>
                <option value="STOCK_LOW">📦 Low Stock Breach</option>
                <option value="CHALLAN_PENDING">🚚 Delivery Challan</option>
                <option value="REORDER_RECOMMENDED">🛒 Reorder Needed</option>
                <option value="ASSEMBLY_READY">⚙️ Production Assembly</option>
                <option value="SYSTEM_NOTICE">📢 System Notice</option>
                <option value="CREDIT_RISK_ALERT">💳 Credit Risk Alert</option>
              </select>
            </div>

            {/* Severity Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>⚠️ Severity:</span>
              <select
                className="filter-select"
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: '12px', height: '30px', padding: '0 8px', borderRadius: '6px' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="WARNING">🟡 Warning</option>
                <option value="INFO">🔵 Info</option>
                <option value="SUCCESS">🟢 Success</option>
              </select>
            </div>
          </div>

          {/* Recency Sort Order */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>⇅ Sort:</span>
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as 'desc' | 'asc'); setCurrentPage(1); }}
              style={{ fontSize: '12px', height: '30px', padding: '0 8px', borderRadius: '6px' }}
            >
              <option value="desc">⬇️ Newest First (Recency)</option>
              <option value="asc">⬆️ Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* FEED CONTENT CONTAINER */}
      {loading ? (
        <div className="card p-30 text-center color-tertiary fs-13">
          <div className="spinner mx-auto mb-10"></div>
          Loading notification feed...
        </div>
      ) : error ? (
        <div className="card p-24 text-center color-danger fs-13">
          Failed to fetch notifications: {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-36 text-center" style={{ borderRadius: '8px' }}>
          <div className="fs-32 mb-8">🔕</div>
          <h4 className="fw-700 fs-15 mb-4">No notifications found</h4>
          <p className="fs-12 color-tertiary" style={{ maxWidth: '400px', margin: '0 auto' }}>
            {statusFilter === 'UNREAD'
              ? 'Great job! You have addressed all unread alerts.'
              : 'No historical notifications match your selected date, category, or search filters.'}
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* CLEAN TIMELINE CARDS */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenDetails(item)}
              style={{
                borderRadius: '8px',
                backgroundColor: item.isRead ? 'var(--bg-secondary)' : 'rgba(59, 130, 246, 0.04)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${getSeverityColor(item.severity)}`,
                padding: '14px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              {/* Top Row: Meta Badges + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {getSeverityBadge(item.severity)}

                  <span className="badge badge-secondary" style={{ fontSize: '10px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {(item.type || 'SYSTEM_NOTICE').replace(/_/g, ' ')}
                  </span>

                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <IconClock size={11} />
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                  </span>

                  {!item.isRead && (
                    <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 5px', backgroundColor: '#3b82f6', color: '#fff' }}>
                      NEW
                    </span>
                  )}
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={(e) => handleOpenDetails(item, e)}
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    View Details <IconExternalLink size={11} />
                  </button>

                  {!item.isRead ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      title="Mark Read"
                      style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px 8px' }}
                    >
                      Mark Read
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Read</span>
                  )}
                </div>
              </div>

              {/* Title Row */}
              <div style={{ fontWeight: 700, fontSize: '14px', color: item.isRead ? 'var(--text-primary)' : '#60a5fa', marginBottom: '4px' }}>
                {item.title || 'Notification Alert'}
              </div>

              {/* Message Row */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>
                {item.message || ''}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* STRUCTURED AUDIT TABLE VIEW WITH SINGLE-LINE WRAP FIX */
        <div className="card p-0 overflow-hidden mb-20" style={{ borderRadius: '8px' }}>
          <div className="table-responsive">
            <table className="table fs-12" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '120px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Severity</th>
                  <th style={{ width: '180px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Category</th>
                  <th style={{ verticalAlign: 'middle' }}>Alert Title & Details</th>
                  <th style={{ width: '180px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Timestamp</th>
                  <th style={{ width: '90px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Status</th>
                  <th style={{ width: '120px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenDetails(item)}
                    style={{
                      cursor: 'pointer',
                      background: item.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                    }}
                  >
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{getSeverityBadge(item.severity)}</td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-secondary fs-10" style={{ whiteSpace: 'nowrap' }}>
                        {(item.type || 'NOTICE').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div className="fw-600 fs-13" style={{ color: item.isRead ? 'var(--text-primary)' : '#60a5fa' }}>
                        {item.title}
                      </div>
                      <div className="fs-12 color-tertiary truncate" style={{ maxWidth: '520px' }}>
                        {item.message}
                      </div>
                    </td>
                    <td className="fs-11 color-tertiary" style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                    </td>
                    <td style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      {item.isRead ? (
                        <span className="badge badge-neutral fs-10 color-tertiary">Read</span>
                      ) : (
                        <span className="badge badge-primary fs-10">Unread</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => handleOpenDetails(item, e)}
                        title="View Details"
                        style={{ padding: '4px 6px' }}
                      >
                        <IconExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION FOOTER */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            Page <strong style={{ color: 'var(--text-primary)' }}>{pagination.page}</strong> of{' '}
            <strong>{pagination.totalPages}</strong> ({pagination.total} total items)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              disabled={currentPage >= pagination.totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* RICH, MEANINGFUL, HIGH-CONTRAST NOTIFICATION DETAILS MODAL */}
      {selectedNotification && (() => {
        const details = getDetailedNotificationExplanation(selectedNotification);
        return (
          <div className="modal-overlay flex-center" onClick={() => setSelectedNotification(null)}>
            <div
              className="modal-container"
              style={{
                maxWidth: '620px',
                width: '92%',
                borderRadius: '12px',
                padding: '0',
                overflow: 'hidden',
                background: 'var(--bg-primary, #121215)',
                border: '1px solid var(--border-color, #2d2d38)',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '18px 24px',
                  background: 'var(--bg-secondary, #191920)',
                  borderBottom: '1px solid var(--border-color, #2d2d38)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: getSeverityColor(selectedNotification.severity) + '1a',
                      color: getSeverityColor(selectedNotification.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${getSeverityColor(selectedNotification.severity)}35`,
                    }}
                  >
                    <IconInfo size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                      Notification Audit Details
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)', marginTop: '2px' }}>
                      {selectedNotification.createdAt ? new Date(selectedNotification.createdAt).toLocaleString() : 'Recent Event'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedNotification(null)}
                  style={{ padding: '6px', color: 'var(--text-tertiary)' }}
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Event Core Banner */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary, #191920)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #2d2d38)',
                    borderLeft: `4px solid ${getSeverityColor(selectedNotification.severity)}`,
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {getSeverityBadge(selectedNotification.severity)}

                    <span className="badge badge-secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {details.categoryLabel}
                    </span>
                  </div>

                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', marginBottom: '8px', lineHeight: '1.3' }}>
                    {selectedNotification.title}
                  </div>

                  <div style={{ fontSize: '13.5px', color: '#60a5fa', fontWeight: 600, lineHeight: '1.5' }}>
                    {selectedNotification.message}
                  </div>
                </div>

                {/* RICH MEANINGFUL BUSINESS ANALYSIS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  {/* Overview */}
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--bg-secondary, #191920)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #2d2d38)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      📌 Business Event Overview
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary, #ffffff)', lineHeight: '1.45' }}>
                      {details.overview}
                    </div>
                  </div>

                  {/* Impact */}
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'rgba(59, 130, 246, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      📈 Operational & Inventory Impact
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: '1.45' }}>
                      {details.impact}
                    </div>
                  </div>

                  {/* Action Needed */}
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'rgba(16, 185, 129, 0.06)',
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      ⚡ Recommended Action for {activeOrg?.role || 'User'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: '1.45' }}>
                      {details.actionNeeded}
                    </div>
                  </div>
                </div>

                {/* Audit Key-Value Metadata Grid */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-secondary, #191920)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #2d2d38)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '10px 16px', backgroundColor: 'var(--bg-tertiary, #22222a)', borderBottom: '1px solid var(--border-color, #2d2d38)', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Audit Governance & Reference Metadata
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color, #2d2d38)', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}>Targeted Role Scope</span>
                      <span className="badge badge-purple" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconShield size={12} /> {activeOrg?.role || 'SALES'} Role
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color, #2d2d38)', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}>Verification Status</span>
                      <span className={`badge ${selectedNotification.isRead ? 'badge-neutral' : 'badge-primary'}`} style={{ padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}>
                        {selectedNotification.isRead ? '✓ Verified & Read' : '🔴 Pending Action'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color, #2d2d38)', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}>Workspace Organization</span>
                      <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: 600 }}>{activeOrg?.organizationName || 'StockPulse'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: '12.5px' }}>
                      <span style={{ color: 'var(--text-tertiary, #94a3b8)' }}>Audit Reference Hash</span>
                      <span className="mono" style={{ fontSize: '11px', color: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                        {selectedNotification.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  background: 'var(--bg-secondary, #191920)',
                  borderTop: '1px solid var(--border-color, #2d2d38)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {!selectedNotification.isRead && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleMarkAsRead(selectedNotification.id)}
                      style={{ fontSize: '12.5px' }}
                    >
                      <IconCheck size={14} /> Mark as Read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedNotification.actionUrl && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const url = selectedNotification.actionUrl!;
                        setSelectedNotification(null);
                        navigate(url);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        fontSize: '12.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Open Resource Page <IconExternalLink size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedNotification(null)}
                    style={{ fontSize: '12.5px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
