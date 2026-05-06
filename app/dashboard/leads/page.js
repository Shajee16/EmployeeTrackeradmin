'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Search, Zap } from 'lucide-react';

export default function LeadManagement() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    fetch('/api/admin-leads').then(r => r.json()).then(d => setLeads(d.leads || []));
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return leads.filter(l => {
      const matchSearch = l.companyName.toLowerCase().includes(s) || l.assignedAsset.toLowerCase().includes(s);
      const matchPrio = priorityFilter ? (l.priority?.toUpperCase() === priorityFilter || l.status?.toUpperCase() === priorityFilter) : true;
      return matchSearch && matchPrio;
    });
  }, [leads, search, priorityFilter]);

  const engageTarget = async (id) => {
    if (!confirm('Are you sure you want to engage this lead?')) return;
    const res = await fetch('/api/admin-leads', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'engage' }) });
    if (res.ok) fetch('/api/admin-leads').then(r => r.json()).then(d => setLeads(d.leads || []));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Lead Management</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Search */}
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--primary)" />
          <input 
            placeholder="Search leads by company or assigned employee..." 
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} 
          />
        </div>

        {/* Priority Surveillance */}
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
            <option value="">All Priorities & Statuses</option>
            <option value="HOT">Hot Leads</option>
            <option value="NEW">New Leads</option>
            <option value="PROPOSAL">In Negotiation</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--surface-border)' }}>
            <tr>
              <th>Company / Contact</th>
              <th>Assigned To</th>
              <th>Value (Est)</th>
              <th>Priority & Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.companyName}<br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.contactPerson}</span></td>
                <td><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{l.assignedAsset}</span></td>
                <td>₹{Number(l.dealValue || 0).toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${l.priority === 'Hot' ? 'badge-danger' : 'badge-info'}`}>{l.priority || 'Normal'}</span>
                    <span className={`badge ${l.status === 'New' ? 'badge-warning' : l.status === 'Proposal' ? 'badge-success' : 'badge-info'}`}>{l.status}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => engageTarget(l.id)}>
                    <Zap size={14} /> Engage
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No leads found matching criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
