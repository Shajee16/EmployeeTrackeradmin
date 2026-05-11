'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserX, Power, UserPlus, Edit, Eye, EyeOff, X, Check, AlertCircle } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Sales', role: 'Employee', designation: '', phone: '' });
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  };

  useEffect(() => { load(); }, []);

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return employees.filter(e => {
      const matchSearch = (e.name || '').toLowerCase().includes(s) || (e.email || '').toLowerCase().includes(s);
      const matchDept = deptFilter ? e.department === deptFilter : true;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 4) { showMsg('Password must be at least 4 characters', true); return; }

    const res = await fetch('/api/admin-employees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) { showMsg(data.error || 'Failed to create employee', true); return; }

    setShowCreate(false);
    setForm({ name: '', email: '', password: '', department: 'Sales', role: 'Employee', designation: '', phone: '' });
    showMsg(`Employee "${data.employee.name}" created successfully! They can log in at the employee portal.`);
    load();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin-employees', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    const data = await res.json();
    if (!res.ok) { showMsg(data.error || 'Failed to update', true); return; }
    setEditModal(null);
    showMsg('Employee updated successfully');
    load();
  };

  const toggleStatus = async (id, currentStatus) => {
    await fetch('/api/admin-employees', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle_status' })
    });
    showMsg(`Status changed to ${currentStatus === 'active' ? 'away' : 'active'}`);
    load();
  };

  const removeEmployee = async (id, name) => {
    if (!confirm(`Remove "${name}"? This will delete their account permanently.`)) return;
    await fetch(`/api/admin-employees?id=${id}`, { method: 'DELETE' });
    showMsg(`${name} has been removed`);
    load();
  };

  const activeCount = employees.filter(e => e.status !== 'away').length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Employee Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{employees.length} total • {activeCount} active • {employees.length - activeCount} away</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(!showCreate); setError(''); }}>
          <UserPlus size={16} /> {showCreate ? 'Cancel' : 'Create Employee'}
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <AlertCircle size={16} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <Check size={16} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Employee Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 24, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>Create New Employee Account</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>This account will be accessible from the employee portal (localhost:3000)</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Full Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email Address *</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 4 characters" style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Department *</label>
                <select value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="Employee">Employee</option>
                  <option value="Senior Employee">Senior Employee</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Designation</label>
                <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Sales Executive" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 9876543210" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <UserPlus size={16} /> Create Employee Account
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Search + Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} />
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--surface-border)' }}>
            <tr>
              <th>Employee</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, idx) => (
              <tr key={e.id || idx} style={{ opacity: e.status === 'away' ? 0.6 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                      {(e.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.name}</div>
                      {e.designation && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.designation}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{e.email}</td>
                <td><span className="badge badge-info">{e.department}</span></td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{e.role || 'Employee'}</td>
                <td>
                  <span className={`badge ${e.status === 'away' ? 'badge-warning' : 'badge-success'}`} style={{ textTransform: 'capitalize' }}>
                    {e.status === 'away' ? 'away' : 'active'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => { setEditModal(e); setEditForm({ id: e.id, name: e.name, department: e.department, role: e.role || 'Employee', designation: e.designation || '', phone: e.phone || '', newPassword: '' }); }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => toggleStatus(e.id, e.status)}>
                      <Power size={14} /> {e.status === 'away' ? 'Activate' : 'Set Away'}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => removeEmployee(e.id, e.name)}>
                      <UserX size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditModal(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card" style={{ padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()} onSubmit={handleEdit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Edit Employee — {editModal.name}</h3>
              <button type="button" onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Name</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Department</label>
                  <select value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}>
                    <option value="Sales">Sales</option><option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option><option value="Engineering">Engineering</option>
                    <option value="HR">HR</option><option value="Finance">Finance</option><option value="Support">Support</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                    <option value="Employee">Employee</option><option value="Senior Employee">Senior Employee</option>
                    <option value="Team Lead">Team Lead</option><option value="Manager">Manager</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Designation</label>
                <input value={editForm.designation} onChange={e => setEditForm({...editForm, designation: e.target.value})} placeholder="e.g. Senior Sales Executive" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Phone</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="+91 9876543210" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Reset Password (leave blank to keep current)</label>
                <input type="password" value={editForm.newPassword} onChange={e => setEditForm({...editForm, newPassword: e.target.value})} placeholder="New password..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </motion.form>
        </div>
      )}
    </motion.div>
  );
}
