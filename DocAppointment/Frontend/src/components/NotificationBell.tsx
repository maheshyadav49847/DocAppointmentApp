import React, { useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotificationStore } from '../stores/notificationStore';
import type { AppNotification, NotificationType } from '../stores/notificationStore';

// ─── Type → colour map ───────────────────────────────────────────────────────
const TYPE_COLOR: Record<NotificationType, { color: string; bg: string; border: string }> = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
  info:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.2)' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  danger:  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
};

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
  const cfg = TYPE_COLOR[n.type];
  return (
    <div
      onClick={onRead}
      style={{
        display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '10px',
        background: n.read ? 'transparent' : cfg.bg,
        border: `1px solid ${n.read ? 'transparent' : cfg.border}`,
        cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : cfg.bg)}
    >
      {/* Unread dot */}
      {!n.read && (
        <span style={{
          position: 'absolute', top: '10px', right: '36px',
          width: '7px', height: '7px', borderRadius: '50%',
          background: cfg.color,
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem',
      }}>
        {n.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'white', lineHeight: 1.3 }}>{n.title}</p>
        <p style={{ margin: '3px 0 5px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.message}</p>
        <span style={{ fontSize: '0.7rem', color: cfg.color, fontWeight: 600 }}>{timeAgo(n.timestamp)}</span>
      </div>

      {/* Remove btn */}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
          cursor: 'pointer', padding: '2px', flexShrink: 0, display: 'flex', alignItems: 'flex-start',
          marginTop: '2px', transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
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
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: 'relative', background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: '12px', width: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s', color: open ? 'white' : 'var(--text-secondary)',
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            minWidth: '18px', height: '18px', borderRadius: '9px',
            background: 'var(--danger)', border: '2px solid #0f172a',
            fontSize: '0.65rem', fontWeight: 900, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', right: 0,
          width: '360px', maxWidth: 'calc(100vw - 30px)',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px', boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
          zIndex: 10000, overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={16} color="var(--accent-color)" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Notifications</span>
              {count > 0 && (
                <span style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem',
                  fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: 'var(--danger)',
                }}>
                  {count} unread
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  style={{
                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                    color: 'var(--accent-color)', borderRadius: '8px', padding: '5px 10px',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <CheckCheck size={12} /> Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all notifications"
                  style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: 'var(--danger)', borderRadius: '8px', padding: '5px 10px',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '10px' }} className="no-scrollbar">
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <Bell size={36} style={{ opacity: 0.15, marginBottom: '12px', color: 'var(--accent-color)' }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>All caught up!</p>
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}>
                  Queue events, bookings, and alerts will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
            <div style={{
              padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.05)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
