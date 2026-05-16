'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, UserCog, X, Zap, Lock, Mail, Phone, Building2, ChevronDown } from 'lucide-react';

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: 'Administration', role: 'System Admin' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const load = async () => {
    setLoading(true);
    const [userRes, adminsRes] = await Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/admin-admins').then(r => r.json()),
    ]);
    setUser(userRes.user || null);
    setAdmins(adminsRes.admins || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createAdmin = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return flash('Name, email, and password are required', 'error');
    if (form.password.length < 8) return flash('Password must be at least 8 characters', 'error');
    setSubmitting(true);
    const res = await fetch('/api/admin-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { flash(data.error || 'Failed to create admin', 'error'); }
    else { flash('Admin created successfully!'); setForm({ name: '', email: '', password: '', phone: '', department: 'Administration', role: 'System Admin' }); setShowForm(false); load(); }
    setSubmitting(false);
  };

  const toggleStatus = async (admin) => {
    const res = await fetch('/api/admin-admins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id, status: admin.status === 'active' ? 'inactive' : 'active' }),
    });
    if (res.ok) { flash('Status updated'); load(); }
  };

  const deleteAdmin = async (admin) => {
    try {
      const res = await fetch(`/api/admin-admins?id=${encodeURIComponent(admin.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { flash('Admin removed'); setConfirmDelete(null); load(); }
      else flash(data.error || 'Failed to delete', 'error');
    } catch (err) {
      flash('Network error: ' + err.message, 'error');
    }
  };

  const isSuperAdmin = user?.role === 'Super Admin';

  const inputStyle = {
    width: '100%', padding: '11px 14px', background: 'var(--bg-secondary)',
    border: '1px solid var(--surface-border)', borderRadius: 10, color: 'var(--text)',
    fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Super Admin Access Required</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Only the Super Admin can manage admin accounts.</p>
    </div>
  );

  const activeCount = admins.filter(a => a.status === 'active').length;
  const inactiveCount = admins.length - activeCount;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <ShieldCheck size={24} /> Admin Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>Create and manage admin accounts. Super Admin only.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={load} style={{
            padding: '9px 16px', borderRadius: 10, border: '1px solid var(--surface-border)',
            background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem',
          }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} style={{
            padding: '9px 18px', borderRadius: 10, background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            <Plus size={15} /> Add Admin
          </button>
        </div>
      </div>

      {/* Flash Message */}
      {msg.text && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 20,
          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: msg.type === 'error' ? '#ef4444' : '#16a34a',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem',
        }}>
          {msg.type === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />} {msg.text}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Admins', value: admins.length, color: 'var(--primary)', bg: 'var(--primary-glow, rgba(194,155,118,0.1))' },
          { label: 'Active', value: activeCount, color: '#16a34a', bg: 'rgba(22,163,106,0.08)' },
          { label: 'Inactive', value: inactiveCount, color: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--surface-border)',
            borderRadius: 14, padding: '20px 16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1, margin: 0 }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Admin Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setShowForm(false)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 540,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid var(--surface-border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1.1rem' }}>
                <UserCog size={20} /> New Admin Account
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createAdmin} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rajesh Sharma" required />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@cluso.in" required />
                </div>
                <div>
                  <label style={labelStyle}>Password * (min 8 chars)</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 44 }} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Strong password" required />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select style={inputStyle} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                    {['Administration', 'Sales', 'Operations', 'HR', 'Finance', 'IT', 'Marketing'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Admin Type *</label>
                  <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="System Admin">System Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                    {form.role === 'Super Admin' ? '⚡ Full system access + manage admins' : '🔒 All permissions except admin management'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: '10px 22px', borderRadius: 10, border: '1px solid var(--surface-border)',
                  background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
                }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{
                  padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  opacity: submitting ? 0.7 : 1,
                }}>
                  <Plus size={16} /> {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Cards List */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--surface-border)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--surface-border)' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text)', margin: 0, fontSize: '1.05rem' }}>All Admins ({admins.length})</h3>
        </div>

        {admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <UserCog size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontWeight: 500 }}>No admins created yet. Click "Add Admin" to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {admins.map((admin, idx) => (
              <div key={admin.id || admin._id || idx} style={{
                padding: '18px 24px',
                borderBottom: idx < admins.length - 1 ? '1px solid var(--surface-border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 16,
                flexWrap: 'wrap',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                  background: admin.role === 'Super Admin'
                    ? 'linear-gradient(135deg, #7c3aed, #a78bfa)'
                    : 'linear-gradient(135deg, var(--primary-light, #c29b76), var(--primary, #a67c52))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 800, fontSize: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  {admin.name?.charAt(0)}
                </div>

                {/* Info - takes remaining space */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{admin.name}</span>
                    {/* Role badge */}
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: admin.role === 'Super Admin' ? '#ede9fe' : '#eff6ff',
                      color: admin.role === 'Super Admin' ? '#7c3aed' : '#3b82f6',
                      border: `1px solid ${admin.role === 'Super Admin' ? '#c4b5fd' : '#bfdbfe'}`,
                      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}>
                      {admin.role === 'Super Admin' ? <Zap size={10} /> : <Lock size={10} />}
                      {admin.role}
                    </span>
                    {/* Status badge */}
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                      background: admin.status === 'active' ? '#dcfce7' : '#fef2f2',
                      color: admin.status === 'active' ? '#16a34a' : '#ef4444',
                      whiteSpace: 'nowrap',
                    }}>
                      {admin.status === 'active' ? '● Active' : '● Inactive'}
                    </span>
                  </div>
                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={12} /> {admin.email}
                    </span>
                    {admin.department && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={12} /> {admin.department}
                      </span>
                    )}
                    {admin.createdBy && (
                      <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
                        Created by {admin.createdBy}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleStatus(admin)} style={{
                    padding: '7px 14px', borderRadius: 9, fontSize: '0.8rem', fontWeight: 600,
                    border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)',
                    color: admin.status === 'active' ? '#d97706' : '#16a34a',
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}>
                    {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setConfirmDelete(admin)} style={{
                    padding: '7px 10px', borderRadius: 9, border: 'none',
                    background: '#fef2f2', color: '#ef4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setConfirmDelete(null)}>
          <div style={{
            background: 'var(--surface)', borderRadius: 20, padding: 28,
            maxWidth: 420, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--surface-border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>Delete Admin</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>This action cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: 24 }}>
              Are you sure you want to remove <strong>{confirmDelete.name}</strong> ({confirmDelete.email})? They will lose all admin access immediately.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: '10px 22px', borderRadius: 10, border: '1px solid var(--surface-border)',
                background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={() => deleteAdmin(confirmDelete)} style={{
                padding: '10px 22px', borderRadius: 10, border: 'none', background: '#ef4444',
                color: '#fff', cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 600px) {
          .admin-mgmt-stats { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
