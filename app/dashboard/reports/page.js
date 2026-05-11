'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User, Check, X, MessageSquare } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [commentModal, setCommentModal] = useState(null);
  const [adminComment, setAdminComment] = useState('');

  const load = () => {
    fetch('/api/admin-reports').then(r => r.json()).then(d => setReports(d.reports || []));
  };

  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => {
    const matchType = filterType ? r.formType === filterType : true;
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchType && matchStatus;
  });

  const formTypes = [...new Set(reports.map(r => r.formType))];

  const updateStatus = async (id, status) => {
    await fetch('/api/admin-reports', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    load();
  };

  const submitComment = async () => {
    if (!adminComment.trim()) return;
    await fetch('/api/admin-reports', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: commentModal.id, adminComments: adminComment })
    });
    setCommentModal(null);
    setAdminComment('');
    load();
  };

  const statusColor = (s) => {
    if (s === 'Approved') return 'badge-success';
    if (s === 'Rejected') return 'badge-danger';
    if (s === 'Submitted' || s === 'Pending') return 'badge-warning';
    return 'badge-info';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Employee Submissions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-warning">{reports.filter(r => r.status === 'Submitted' || r.status === 'Pending').length} pending review</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', width: 250, height: 44 }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none' }}>
            <option value="">All Report Types</option>
            {formTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', width: 250, height: 44 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none' }}>
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((r, idx) => (
          <div key={`${r.id}-${idx}`} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--primary)" /> {r.formType}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {r.employeeName} ({r.employeeDept})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(r.submittedAt || r.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <span className={`badge ${statusColor(r.status)}`}>{r.status}</span>
            </div>

            {/* Data Fields */}
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              {Object.entries(r.data || {}).map(([key, value]) => (
                <div key={key}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '-'}</div>
                </div>
              ))}
            </div>

            {/* Admin Comments */}
            {r.adminComments && (
              <div style={{ background: 'rgba(6,182,212,0.08)', padding: 12, borderRadius: 8, borderLeft: '3px solid var(--primary)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Admin Comments</div>
                <p style={{ fontSize: '0.85rem' }}>{r.adminComments}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => { setCommentModal(r); setAdminComment(r.adminComments || ''); }}>
                <MessageSquare size={14} /> Comment
              </button>
              {(r.status === 'Submitted' || r.status === 'Pending') && (
                <>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--success)', border: 'none' }} onClick={() => updateStatus(r.id, 'Approved')}>
                    <Check size={14} /> Approve
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => updateStatus(r.id, 'Rejected')}>
                    <X size={14} /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No submissions found.
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCommentModal(null)}>
          <div className="card" style={{ padding: 24, width: 500 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Add Comment</h3>
            <textarea rows={4} value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Write your comments..." style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setCommentModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitComment}>Save Comment</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
