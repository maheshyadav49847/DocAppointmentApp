import React, { useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification } from '../stores/notificationStore';
import './NotificationBell.css';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Single notification row ─────────────────────────────────────────────────
const NotifRow: React.FC<{ n: AppNotification; onRead: () => void; onRemove: () => void }> = ({
  n, onRead, onRemove,
}) => {
  return (
    <div
      onClick={onRead}
      className={`notif-row notif-${n.type} ${n.read ? 'read' : 'unread'}`}
    >
      {/* Unread dot */}
      {!n.read && (
        <span className="notif-unread-dot" />
      )}

      {/* Icon */}
      <div className="notif-icon-box">
        {n.icon}
      </div>

      {/* Text */}
      <div className="notif-text-container">
        <p className="notif-title">{n.title}</p>
        <p className="notif-message">{n.message}</p>
        <span className="notif-time">{timeAgo(n.timestamp)}</span>
      </div>

      {/* Remove btn */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="notif-remove-btn"
        title="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Main Bell Component ─────────────────────────────────────────────────────
const NotificationBell: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, markRead, markAllRead, remove, clearAll, unreadCount } = useNotificationStore();
  const count = unreadCount();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  return (
    <div ref={panelRef} className="bell-container">
      {/* Bell Button */}
      <button
        data-tooltip="View system notifications"
        onClick={handleOpen}
        title="Notifications"
        className={`bell-btn ${open ? 'open' : ''}`}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="bell-badge">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-header">
            <div className="notif-header-title">
              <div className="notif-header-title-inner">
                <Bell size={16} color="var(--accent-color)" />
                <span className="notif-header-text">Notifications</span>
                {count > 0 && (
                  <span className="notif-header-badge">
                    {count} unread
                  </span>
                )}
              </div>
            </div>
            
            <div className="notif-actions">
              {count > 0 && (
                <button
                  data-tooltip="Acknowledge all notifications"
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="notif-action-btn notif-action-mark-read"
                >
                  <CheckCheck size={13} /> Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  data-tooltip="Delete notification history"
                  onClick={clearAll}
                  title="Clear all notifications"
                  className="notif-action-btn notif-action-clear"
                >
                  <Trash2 size={13} /> Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="notif-list-container no-scrollbar">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={36} className="notif-empty-icon" />
                <p className="notif-empty-title">All caught up!</p>
                <p className="notif-empty-subtitle">
                  Queue events, bookings, and alerts will appear here.
                </p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map(n => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    onRead={() => markRead(n.id)}
                    onRemove={() => remove(n.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notif-footer">
              <span className="notif-footer-text">
                {notifications.length} total · Last 50 events kept
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
