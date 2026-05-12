'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, User, Check, X, MessageSquare, ChevronDown, ChevronRight, Building2, Users, Layers } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [commentModal, setCommentModal] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [expandedEmps, setExpandedEmps] = useState({});

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

  // Group: Department → Type → Employee → Reports
  const grouped = useMemo(() => {
    const tree = {};
    filtered.forEach(r => {
      const dept = r.employeeDept || 'Unknown';
      const type = r.formType || 'Unknown';
      const emp = r.employeeName || 'Unknown';

      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][type]) tree[dept][type] = {};
      if (!tree[dept][type][emp]) tree[dept][type][emp] = [];
      tree[dept][type][emp].push(r);
    });
    return tree;
  }, [filtered]);

  const toggleDept = (d) => setExpandedDepts(p => ({ ...p, [d]: !p[d] }));
  const toggleType = (key) => setExpandedTypes(p => ({ ...p, [key]: !p[key] }));
  const toggleEmp = (key) => setExpandedEmps(p => ({ ...p, [key]: !p[key] }));

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

  const pendingCount = reports.filter(r => r.status === 'Submitted' || r.status === 'Pending').length;

  const countInBranch = (branch) => {
    if (Array.isArray(branch)) return branch.length;
    return Object.values(branch).reduce((sum, v) => sum + countInBranch(v), 0);
  };

  const countPendingInBranch = (branch) => {
    if (Array.isArray(branch)) return branch.filter(r => r.status === 'Submitted' || r.status === 'Pending').length;
    return Object.values(branch).reduce((sum, v) => sum + countPendingInBranch(v), 0);
  };

  const typeIcons = {
    'Lead Entry': '🎯',
    'Client Follow-up': '🔄',
    'Expense Report': '🧾',
    'Daily Activity Report': '📊',
    'Attendance Entry': '📅',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Employee Submissions</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Grouped by Department → Type → Employee</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} pending review</span>}
          <span className="badge badge-info">{filtered.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', minWidth: 220, height: 44 }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none', color: 'var(--text)' }}>
            <option value="">All Report Types</option>
            {formTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', minWidth: 220, height: 44 }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none', color: 'var(--text)' }}>
            <option value="">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Hierarchical View */}
      {Object.keys(grouped).length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>📭</p>
          <p>No submissions found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(grouped).sort().map(dept => {
            const deptData = grouped[dept];
            const deptCount = countInBranch(deptData);
            const deptPending = countPendingInBranch(deptData);

            return (
              <div key={dept} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {/* Department Header */}
                <div
                  onClick={() => toggleDept(dept)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(6, 182, 212, 0.04))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: expandedDepts[dept] ? '1px solid var(--surface-border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {expandedDepts[dept] ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="var(--primary)" />}
                    <Building2 size={18} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>{dept}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {deptPending > 0 && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{deptPending} pending</span>}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{deptCount} submissions</span>
                  </div>
                </div>

                {/* Types inside Department */}
                <AnimatePresence>
                  {expandedDepts[dept] && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                      {Object.keys(deptData).sort().map(type => {
                        const typeKey = `${dept}-${type}`;
                        const typeData = deptData[type];
                        const typeCount = countInBranch(typeData);
                        const typePending = countPendingInBranch(typeData);

                        return (
                          <div key={typeKey} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                            {/* Type Header */}
                            <div
                              onClick={() => toggleType(typeKey)}
                              style={{
                                padding: '12px 20px 12px 48px', cursor: 'pointer',
                                background: 'var(--bg-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {expandedTypes[typeKey] ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                                <Layers size={16} color="var(--text-muted)" />
                                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{typeIcons[type] || '📄'} {type}</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {typePending > 0 && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{typePending}</span>}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{typeCount}</span>
                              </div>
                            </div>

                            {/* Employees inside Type */}
                            <AnimatePresence>
                              {expandedTypes[typeKey] && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                                  {Object.keys(typeData).sort().map(emp => {
                                    const empKey = `${typeKey}-${emp}`;
                                    const empReports = typeData[emp];
                                    const empPending = empReports.filter(r => r.status === 'Submitted' || r.status === 'Pending').length;

                                    return (
                                      <div key={empKey}>
                                        {/* Employee Header */}
                                        <div
                                          onClick={() => toggleEmp(empKey)}
                                          style={{
                                            padding: '10px 20px 10px 76px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            borderTop: '1px solid var(--surface-border)',
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {expandedEmps[empKey] ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                                            <Users size={14} color="var(--text-muted)" />
                                            <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{emp}</span>
                                          </div>
                                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {empPending > 0 && <span style={{ background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: 50, fontSize: '0.6rem', fontWeight: 700 }}>{empPending}</span>}
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{empReports.length} reports</span>
                                          </div>
                                        </div>

                                        {/* Reports for this Employee */}
                                        <AnimatePresence>
                                          {expandedEmps[empKey] && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                                              <div style={{ padding: '12px 20px 20px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {empReports.sort((a, b) => new Date(b.submittedAt || b.timestamp || 0) - new Date(a.submittedAt || a.timestamp || 0)).map((r, idx) => (
                                                  <div key={`${r.id}-${idx}`} style={{
                                                    background: 'var(--surface)', border: '1px solid var(--surface-border)',
                                                    borderRadius: 12, padding: 20, transition: 'all 0.2s',
                                                    borderLeft: r.status === 'Submitted' || r.status === 'Pending'
                                                      ? '4px solid #f59e0b'
                                                      : r.status === 'Approved'
                                                        ? '4px solid #10b981'
                                                        : r.status === 'Rejected' ? '4px solid #ef4444' : '4px solid var(--surface-border)',
                                                  }}>
                                                    {/* Report Header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                        <Calendar size={14} />
                                                        <span>{new Date(r.submittedAt || r.timestamp).toLocaleString()}</span>
                                                      </div>
                                                      <span className={`badge ${statusColor(r.status)}`}>{r.status}</span>
                                                    </div>

                                                    {/* Report Data */}
                                                    <div style={{
                                                      background: 'var(--bg-secondary)', padding: 14, borderRadius: 8,
                                                      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12,
                                                      marginBottom: 14,
                                                    }}>
                                                      {Object.entries(r.data || {}).map(([key, value]) => (
                                                        <div key={key}>
                                                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2, fontWeight: 600 }}>
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                          </div>
                                                          <div style={{ fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{value || '-'}</div>
                                                        </div>
                                                      ))}
                                                    </div>

                                                    {/* Admin Comments */}
                                                    {r.adminComments && (
                                                      <div style={{ background: 'rgba(6,182,212,0.08)', padding: 10, borderRadius: 8, borderLeft: '3px solid var(--primary)', marginBottom: 12 }}>
                                                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 2 }}>Admin Comments</div>
                                                        <p style={{ fontSize: '0.82rem', margin: 0 }}>{r.adminComments}</p>
                                                      </div>
                                                    )}

                                                    {/* Actions */}
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => { setCommentModal(r); setAdminComment(r.adminComments || ''); }}>
                                                        <MessageSquare size={12} /> Comment
                                                      </button>
                                                      {(r.status === 'Submitted' || r.status === 'Pending') && (
                                                        <>
                                                          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--success)', border: 'none' }} onClick={() => updateStatus(r.id, 'Approved')}>
                                                            <Check size={12} /> Approve
                                                          </button>
                                                          <button className="btn btn-danger" style={{ fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => updateStatus(r.id, 'Rejected')}>
                                                            <X size={12} /> Reject
                                                          </button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

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
