import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { IconBell, IconCheck, IconExternalLink } from '../common/Icons';

export interface NotificationItem {
  id: string;
  type: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationBell: React.FC = () => {
  const { activeOrg } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications', {
        headers: activeOrg ? { 'x-organization-id': activeOrg.organizationId } : {},
      });
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s live role alert refresh
    return () => clearInterval(interval);
  }, [activeOrg?.organizationId]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`, {}, {
        headers: activeOrg ? { 'x-organization-id': activeOrg.organizationId } : {},
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
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
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    if (item.actionUrl) {
      navigate(item.actionUrl);
      setOpen(false);
    }
  };

  const filteredItems = filter === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const getSeverityBadgeClass = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'badge badge-danger';
      case 'WARNING': return 'badge badge-warning';
      case 'SUCCESS': return 'badge badge-success';
      default: return 'badge badge-info';
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn header-action-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        title="Role Alerts & Notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '8px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconBell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 0 2px var(--bg-primary)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'var(--bg-elevated, #19191d)',
            border: '1px solid var(--border-color, #27272e)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color, #27272e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-secondary, #111114)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary, #f8fafc)' }}>Role Alerts</span>
              {unreadCount > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '11px', background: '#3b82f6', color: '#ffffff' }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color, #27272e)',
              padding: '6px 12px',
              gap: '8px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-tertiary, #19191d)',
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              style={{
                padding: '5px 12px',
                border: filter === 'ALL' ? '1px solid var(--border-color, #3f3f46)' : '1px solid transparent',
                background: filter === 'ALL' ? 'var(--bg-elevated, #242429)' : 'transparent',
                color: filter === 'ALL' ? 'var(--text-primary, #f8fafc)' : 'var(--text-tertiary, #94a3b8)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: filter === 'ALL' ? 600 : 400,
              }}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              style={{
                padding: '5px 12px',
                border: filter === 'UNREAD' ? '1px solid var(--border-color, #3f3f46)' : '1px solid transparent',
                background: filter === 'UNREAD' ? 'var(--bg-elevated, #242429)' : 'transparent',
                color: filter === 'UNREAD' ? 'var(--text-primary, #f8fafc)' : 'var(--text-tertiary, #94a3b8)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: filter === 'UNREAD' ? 600 : 400,
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0', backgroundColor: 'var(--bg-secondary, #111114)' }}>
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: '36px 16px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary, #94a3b8)',
                  fontSize: '13px',
                }}
              >
                {filter === 'UNREAD' ? 'No unread role alerts' : 'No notifications yet'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color, #27272e)',
                    backgroundColor: item.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={getSeverityBadgeClass(item.severity)} style={{ fontSize: '10px' }}>
                      {item.severity}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary, #94a3b8)' }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: '1.4' }}>
                    {item.message}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    {item.actionUrl ? (
                      <span style={{ fontSize: '11px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View details <IconExternalLink size={12} />
                      </span>
                    ) : <span />}

                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as read"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary, #94a3b8)',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <IconCheck size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border-color, #27272e)',
              backgroundColor: 'var(--bg-tertiary, #19191d)',
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View Full Notification History ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
