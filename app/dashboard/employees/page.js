'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, UserX, Power, UserPlus } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showEnlist, setShowEnlist] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Sales' });

  useEffect(() => {
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(s) || e.email.toLowerCase().includes(s));
  }, [employees, search]);

  const toggleStatus = async (id) => {
    const res = await fetch('/api/admin-employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_status' }) });
    if (res.ok) fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  };

  const decommission = async (id) => {
    if (!confirm('Are you sure you want to remove this employee? This action cannot be undone.')) return;
    await fetch(`/api/admin-employees?id=${id}`, { method: 'DELETE' });
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  };

  const handleEnlist = async (e) => {
    e.preventDefault();
    await fetch('/api/admin-employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowEnlist(false);
    setForm({ name: '', email: '', password: '', department: 'Sales' });
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Employees</h2>
        <button className="btn btn-primary" onClick={() => setShowEnlist(!showEnlist)}>
          <UserPlus size={16} /> {showEnlist ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {showEnlist && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleEnlist} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Add New Employee</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Full Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email Address</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Department</label>
              <select value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Employee</button>
        </motion.form>
      )}

      {/* Search */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Search size={18} color="var(--text-muted)" />
        <input 
          placeholder="Search employees by name or email..." 
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} 
        />
      </div>

      {/* Asset Lifecycle Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--surface-border)' }}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} style={{ opacity: e.status === 'away' ? 0.6 : 1 }}>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.id}</td>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td style={{ fontSize: '0.85rem' }}>{e.email}</td>
                <td><span className="badge badge-info">{e.department}</span></td>
                <td>
                  <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ textTransform: 'capitalize' }}>
                    {e.status || 'unknown'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => toggleStatus(e.id)} title="Toggle Status">
                      <Power size={14} /> {e.status === 'active' ? 'Set Away' : 'Set Active'}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => decommission(e.id)} title="Remove Employee">
                      <UserX size={14} /> Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
