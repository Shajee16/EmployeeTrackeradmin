'use client';
import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, UserCog } from 'lucide-react';

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', department: 'Administration' });
  const [submitting, setSubmitting] = useState(false);

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
    else { flash('Admin created successfully!'); setForm({ name: '', email: '', password: '', phone: '', department: 'Administration' }); setShowForm(false); load(); }
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
    if (!confirm(`Remove admin ${admin.name}? They will lose all access immediately.`)) return;
    const res = await fetch(`/api/admin-admins?id=${admin.id}`, { method: 'DELETE' });
    if (res.ok) { flash('Admin removed'); load(); }
    else flash('Failed to delete', 'error');
  };

  const isSuperAdmin = user?.role === 'Super Admin';

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading...</div>;

  if (!isSuperAdmin) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
      <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Super Admin Access Required</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Only the Super Admin can manage admin accounts.</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} /> Admin Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Create and manage admin accounts. Super Admin only.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Add Admin
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: msg.type === 'error' ? '#ef4444' : '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />} {msg.text}
        </div>
      )}

      {/* Create Admin Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: 24, border: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><UserCog size={18} /> New Admin Account</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
          </div>
          <form onSubmit={createAdmin}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lbl}>Full Name *</label>
                <input style={input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rajesh Sharma" required />
              </div>
              <div>
                <label style={lbl}>Email Address *</label>
                <input type="email" style={input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="admin@cluso.in" required />
              </div>
              <div>
                <label style={lbl}>Password * (min 8 chars)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} style={{ ...input, paddingRight: 44 }} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Strong password" required />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Phone Number</label>
                <input style={input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label style={lbl}>Department</label>
                <select style={input} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                  {['Administration', 'Sales', 'Operations', 'HR', 'Finance', 'IT', 'Marketing'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={submitting} style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} /> {submitting ? 'Creating...' : 'Create Admin'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--surface-border)', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Admins', value: admins.length, color: 'var(--primary)' },
          { label: 'Active', value: admins.filter(a => a.status === 'active').length, color: '#16a34a' },
          { label: 'Inactive', value: admins.filter(a => a.status !== 'active').length, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Admins Table */}
      <div style={card}>
        <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>All Admins ({admins.length})</h3>
        {admins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <UserCog size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>No admins created yet. Click "Add Admin" to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  {['Name', 'Email', 'Department', 'Phone', 'Created By', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                          {admin.name?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{admin.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{admin.email}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{admin.department || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{admin.phone || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{admin.createdBy || 'Super Admin'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: admin.status === 'active' ? '#dcfce7' : '#fef2f2', color: admin.status === 'active' ? '#16a34a' : '#ef4444' }}>
                        {admin.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => toggleStatus(admin)} title={admin.status === 'active' ? 'Deactivate' : 'Activate'}
                          style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => deleteAdmin(admin)} title="Delete Admin"
                          style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
