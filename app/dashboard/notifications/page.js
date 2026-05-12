'use client';
import { useState, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const TYPE_CONFIG = {
  info: { icon: Info, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  success: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  warning: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  error: { icon: XCircle, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin-notifications');
    const data = await res.json();
    setNotifs(data.notifications || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    await fetch('/api/admin-notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    await fetch('/api/admin-notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const displayed = notifs.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : n.type === filter);
  const unreadCount = notifs.filter(n => !n.read).length;

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} /> Notifications {unreadCount > 0 && <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>{unreadCount}</span>}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>All system alerts and activity notifications.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {['all', 'unread', 'info', 'success', 'warning', 'error'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: filter === f ? 'var(--surface)' : 'transparent', color: filter === f ? 'var(--primary)' : 'var(--text-muted)', fontWeight: filter === f ? 700 : 500, cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading notifications...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Bell size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No notifications</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>You're all caught up!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                  style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${n.read ? 'var(--surface-border)' : cfg.border}`, background: n.read ? 'var(--bg-secondary)' : cfg.bg, cursor: n.read ? 'default' : 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all 0.2s', opacity: n.read ? 0.7 : 1 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontWeight: n.read ? 500 : 700, color: 'var(--text)', fontSize: '0.9rem' }}>{n.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />}
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(n.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 3 }}>{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
