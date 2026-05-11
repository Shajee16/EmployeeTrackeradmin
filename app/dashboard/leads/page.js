'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Search, Phone, Mail, DollarSign, ChevronDown, Users, TrendingUp } from 'lucide-react';

export default function LeadManagement() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailModal, setDetailModal] = useState(null);

  const load = () => {
    fetch('/api/admin-leads').then(r => r.json()).then(d => setLeads(d.leads || []));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return leads.filter(l => {
      const matchSearch = (l.companyName || '').toLowerCase().includes(s) ||
                          (l.contactPerson || '').toLowerCase().includes(s) ||
                          (l.assignedAsset || '').toLowerCase().includes(s);
      const matchStatus = statusFilter ? l.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const updateStatus = async (id, status) => {
    await fetch('/api/admin-leads', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    load();
  };

  const statuses = [...new Set(leads.map(l => l.status).filter(Boolean))];

  // Summary
  const totalValue = leads.reduce((sum, l) => sum + Number(l.dealValue || 0), 0);
  const closedValue = leads.filter(l => l.status === 'Closed').reduce((sum, l) => sum + Number(l.dealValue || 0), 0);
  const newCount = leads.filter(l => l.status === 'New').length;

  const statusBadge = (status) => {
    const m = { 'New': 'badge-warning', 'Contacted': 'badge-info', 'Proposal': 'badge-info', 'Negotiation': 'badge-warning', 'Closed': 'badge-success', 'Lost': 'badge-danger' };
    return m[status] || 'badge-info';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Lead Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{leads.length} total leads • {newCount} new</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Target size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Leads</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{leads.length}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <DollarSign size={16} color="var(--warning)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Pipeline</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>₹{(totalValue / 100000).toFixed(2)}L</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} color="var(--success)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Closed Revenue</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>₹{(closedValue / 100000).toFixed(2)}L</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input placeholder="Search by company, contact, or assigned employee..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} />
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--surface-border)' }}>
            <tr>
              <th>Company / Contact</th>
              <th>Assigned To</th>
              <th>Deal Value</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, idx) => (
              <tr key={`${l.id}-${idx}`}>
                <td>
                  <div style={{ fontWeight: 600 }}>{l.companyName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Users size={12} /> {l.contactPerson}
                    {l.email && <> • <Mail size={12} /> {l.email}</>}
                  </div>
                </td>
                <td><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{l.assignedAsset}</span></td>
                <td style={{ fontWeight: 600 }}>₹{Number(l.dealValue || 0).toLocaleString()}</td>
                <td><span className={`badge ${l.priority === 'Hot' ? 'badge-danger' : l.priority === 'Warm' ? 'badge-warning' : 'badge-info'}`}>{l.priority || 'Normal'}</span></td>
                <td>
                  <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed">Closed</option>
                    <option value="Lost">Lost</option>
                  </select>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={() => setDetailModal(l)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No leads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDetailModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card" style={{ padding: 24, width: 600, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>{detailModal.companyName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                ['Contact Person', detailModal.contactPerson],
                ['Email', detailModal.email || '-'],
                ['Phone', detailModal.phone || '-'],
                ['Deal Value', `₹${Number(detailModal.dealValue || 0).toLocaleString()}`],
                ['Priority', detailModal.priority || 'Normal'],
                ['Status', detailModal.status],
                ['Assigned To', detailModal.assignedAsset],
                ['Source', detailModal.source || '-'],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Activities */}
            {detailModal.activities && detailModal.activities.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Activity Log</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailModal.activities.map((a, i) => (
                    <div key={i} style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{a.type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailModal.notes && (
              <div style={{ marginTop: 16, padding: 12, background: 'rgba(6,182,212,0.08)', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                <p style={{ fontSize: '0.85rem' }}>{detailModal.notes}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
