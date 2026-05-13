'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, Phone, Mail, DollarSign, Users, TrendingUp, ChevronDown, ChevronRight, MessageSquare, Send, RefreshCw, Trash2, UserPlus, AlertTriangle, CheckCircle, XCircle, Save, Edit3, MessageCircle } from 'lucide-react';

export default function LeadManagement() {
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [emails, setEmails] = useState([]);
  const [replies, setReplies] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [expandedEmps, setExpandedEmps] = useState({});
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sending, setSending] = useState(false);
  const [reassignModal, setReassignModal] = useState(null);
  const [reassignTarget, setReassignTarget] = useState('');
  const [deletionRequests, setDeletionRequests] = useState([]);
  // Editable form state for detail modal
  const [editForm, setEditForm] = useState({});
  const [editDirty, setEditDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState('');
  const [adminComment, setAdminComment] = useState('');
  
  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [bulkReassignTarget, setBulkReassignTarget] = useState('');

  const loadData = async () => {
    try {
      const ts = Date.now();
      const [leadsRes, empsRes, emailsRes, delReqRes] = await Promise.all([
        fetch(`/api/admin-leads?t=${ts}`).then(r => r.json()),
        fetch(`/api/admin-employees?t=${ts}`).then(r => r.json()),
        fetch(`/api/admin-leads/emails?t=${ts}`).then(r => r.json()),
        fetch(`/api/admin-leads/deletion-requests?t=${ts}`).then(r => r.json()),
      ]);
      setLeads(leadsRes.leads || []);
      setEmployees(empsRes.employees || []);
      setEmails(emailsRes.emails || []);
      setReplies(emailsRes.replies || []);
      setDeletionRequests(delReqRes.requests || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  useEffect(() => {
    loadData();
    const poll = setInterval(loadData, 45000);
    return () => clearInterval(poll);
  }, []);

  const updateStatus = async (id, status) => {
    await fetch('/api/admin-leads', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    loadData();
    if (detailModal && detailModal.id === id) {
      setDetailModal(prev => ({ ...prev, status }));
      setEditForm(prev => ({ ...prev, status }));
    }
  };

  // Open detail modal & init local edit form
  const openDetailModal = (lead) => {
    setDetailModal(lead);
    setEditForm({
      status: lead.status || 'New',
      priority: lead.priority || 'Medium',
      dealValue: lead.dealValue || '',
      notes: lead.notes || '',
    });
    setEditDirty(false);
    setSaveFlash('');
    setAdminComment('');
  };

  // Edit a field locally (no API call yet)
  const editField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditDirty(true);
  };

  // Save all changes to API
  const saveLeadChanges = async () => {
    if (!detailModal) return;
    setSaving(true);
    const payload = { id: detailModal.id, ...editForm };
    // Include admin comment if provided
    if (adminComment.trim()) {
      payload.adminComment = adminComment.trim();
    }
    try {
      const res = await fetch('/api/admin-leads', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailModal(prev => ({ ...prev, ...editForm, activities: data.lead?.activities || prev.activities }));
        setEditDirty(false);
        setSaveFlash('✓ Saved');
        setAdminComment('');
        setTimeout(() => setSaveFlash(''), 2000);
        loadData();
      } else {
        setSaveFlash('✗ Failed to save');
        setTimeout(() => setSaveFlash(''), 3000);
      }
    } catch {
      setSaveFlash('✗ Network error');
      setTimeout(() => setSaveFlash(''), 3000);
    }
    setSaving(false);
  };

  const sendReply = async (lead) => {
    if (!replyBody.trim() || !replySubject.trim()) return alert('Subject and Body are required');
    setSending(true);
    try {
      const res = await fetch('/api/admin-leads/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          toName: lead.contactPerson,
          subject: replySubject,
          body: replyBody,
          onBehalfOfUserId: lead.userId,
        })
      });
      if (res.ok) {
        setReplyBody('');
        setReplySubject('');
        loadData();
        alert('Email sent successfully on behalf of employee.');
      } else {
        const err = await res.json();
        alert('Failed: ' + (err.error || err.warning || 'Unknown error'));
      }
    } catch (e) {
      alert('Error sending email');
    }
    setSending(false);
  };

  // Delete lead (admin)
  const deleteLead = async (lead) => {
    if (!confirm(`Permanently delete "${lead.companyName}" (${lead.contactPerson})?\n\nThis action cannot be undone.`)) return;
    const res = await fetch(`/api/admin-leads?id=${lead.id}`, { method: 'DELETE' });
    if (res.ok) loadData();
    else alert('Failed to delete lead');
  };

  // Reassign lead
  const reassignLead = async () => {
    if (!reassignModal || !reassignTarget) return;
    const res = await fetch('/api/admin-leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reassignModal.id, userId: reassignTarget }),
    });
    if (res.ok) {
      setReassignModal(null);
      setReassignTarget('');
      loadData();
    } else alert('Failed to reassign lead');
  };

  // Approve/Reject deletion request
  const handleDeletionRequest = async (requestId, action) => {
    const res = await fetch(`/api/admin-leads?action=${action}&requestId=${requestId}`, { method: 'DELETE' });
    if (res.ok) loadData();
    else alert('Failed to process request');
  };

  // Bulk Actions
  const toggleLeadSelection = (leadId) => {
    setSelectedLeads(prev => prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]);
  };

  const toggleAllLeads = (leadList) => {
    const allSelected = leadList.every(l => selectedLeads.includes(l.id));
    if (allSelected) {
      setSelectedLeads(prev => prev.filter(id => !leadList.some(l => l.id === id)));
    } else {
      const toAdd = leadList.filter(l => !selectedLeads.includes(l.id)).map(l => l.id);
      setSelectedLeads(prev => [...prev, ...toAdd]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedLeads.length} leads?\nThis action cannot be undone.`)) return;
    const res = await fetch('/api/admin-leads/bulk-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', leadIds: selectedLeads })
    });
    if (res.ok) {
      setSelectedLeads([]);
      loadData();
    } else alert('Failed to delete leads');
  };

  const handleBulkReassign = async () => {
    if (!bulkReassignTarget) return alert('Select an employee to reassign to');
    const res = await fetch('/api/admin-leads/bulk-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reassign', leadIds: selectedLeads, targetUserId: bulkReassignTarget })
    });
    if (res.ok) {
      setSelectedLeads([]);
      setBulkReassignTarget('');
      loadData();
    } else alert('Failed to reassign leads');
  };

  // Delete an activity log (called after confirmation)
  const [confirmDeleteLog, setConfirmDeleteLog] = useState(null); // { leadId, activity }

  const deleteActivityLog = async (leadId, activity) => {
    const url = `/api/admin-leads/activity?leadId=${leadId}&activityId=${activity.id}&timestamp=${encodeURIComponent(activity.timestamp)}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      loadData();
      setConfirmDeleteLog(null);
      if (detailModal && detailModal.id === leadId) {
        setDetailModal(prev => ({ 
          ...prev, 
          activities: prev.activities.filter(a => activity.id ? a.id !== activity.id : a.timestamp !== activity.timestamp) 
        }));
      }
    } else {
      alert('Failed to delete activity log');
    }
  };

  const pendingDeletionRequests = deletionRequests.filter(r => r.status === 'pending');

  const statuses = [...new Set(leads.map(l => l.status).filter(Boolean))];

  // Grouping
  const groupedData = useMemo(() => {
    const s = search.toLowerCase();
    const filteredLeads = leads.filter(l => {
      const matchSearch = (l.companyName || '').toLowerCase().includes(s) ||
                          (l.contactPerson || '').toLowerCase().includes(s);
      const matchStatus = statusFilter ? l.status === statusFilter : true;
      return matchSearch && matchStatus;
    });

    const byDept = {};
    filteredLeads.forEach(l => {
      const dept = l.assignedDepartment || 'Unassigned';
      const emp = l.assignedAsset || 'Unassigned';
      if (!byDept[dept]) byDept[dept] = {};
      if (!byDept[dept][emp]) byDept[dept][emp] = [];
      byDept[dept][emp].push(l);
    });
    return byDept;
  }, [leads, search, statusFilter]);

  const toggleDept = (dept) => setExpandedDepts(p => ({ ...p, [dept]: !p[dept] }));
  const toggleEmp = (dept, emp) => setExpandedEmps(p => ({ ...p, [`${dept}-${emp}`]: !p[`${dept}-${emp}`] }));

  const totalValue = leads.reduce((sum, l) => sum + Number(l.dealValue || 0), 0);
  const closedValue = leads.filter(l => l.status === 'Closed').reduce((sum, l) => sum + Number(l.dealValue || 0), 0);

  // Get conversations for a lead
  const getLeadConversations = (lead) => {
    if (!lead || !lead.email) return [];
    const leadEmail = lead.email.toLowerCase();
    const leadSent = emails.filter(e => e.to?.toLowerCase() === leadEmail);
    const leadReplies = replies.filter(r => r.fromEmail?.toLowerCase() === leadEmail);
    
    return [...leadSent.map(e => ({ ...e, isReply: false, date: new Date(e.sentAt) })), 
            ...leadReplies.map(r => ({ ...r, isReply: true, date: new Date(r.receivedAt) }))]
            .sort((a, b) => a.date - b.date); // Sort ascending so newest is at the bottom
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Lead Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Organized by Department & Employee</p>
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

      {/* Filters & Bulk Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input placeholder="Search by company or contact..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)', outline: 'none' }} />
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none', color: 'var(--text)' }}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {selectedLeads.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '12px 20px', background: 'var(--surface)', border: '1px solid var(--primary)', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 15px rgba(99,102,241,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedLeads.length} leads selected</div>
            <button onClick={() => setSelectedLeads([])} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem' }}>Clear Selection</button>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select value={bulkReassignTarget} onChange={e => setBulkReassignTarget(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '0.8rem', outline: 'none' }}>
              <option value="">Select Employee to Reassign...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button onClick={handleBulkReassign} disabled={!bulkReassignTarget} className="btn btn-sm btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserPlus size={14}/> Bulk Reassign</button>
            <button onClick={handleBulkDelete} className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14}/> Bulk Delete</button>
          </div>
        </motion.div>
      )}

      {/* Grouped Leads */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.keys(groupedData).length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No leads found matching criteria.</div>
        ) : (
          Object.keys(groupedData).sort().map(dept => (
            <div key={dept} className="card" style={{ overflow: 'hidden' }}>
              {/* Department Header */}
              <div 
                onClick={() => toggleDept(dept)}
                style={{ padding: '16px 20px', background: 'var(--surface-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: expandedDepts[dept] ? '1px solid var(--surface-border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {expandedDepts[dept] ? <ChevronDown size={20} color="var(--text-muted)"/> : <ChevronRight size={20} color="var(--text-muted)"/>}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>{dept} Department</h3>
                </div>
                <div className="badge badge-info">{Object.values(groupedData[dept]).flat().length} Leads</div>
              </div>

              {/* Employees in Department */}
              <AnimatePresence>
                {expandedDepts[dept] && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                    {Object.keys(groupedData[dept]).sort().map(emp => (
                      <div key={emp} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        {/* Employee Header */}
                        <div 
                          onClick={() => toggleEmp(dept, emp)}
                          style={{ padding: '12px 20px 12px 40px', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {expandedEmps[`${dept}-${emp}`] ? <ChevronDown size={16} color="var(--text-muted)"/> : <ChevronRight size={16} color="var(--text-muted)"/>}
                            <Users size={16} color="var(--text-muted)" />
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{emp}</h4>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{groupedData[dept][emp].length} leads</div>
                        </div>

                        {/* Leads for Employee */}
                        <AnimatePresence>
                          {expandedEmps[`${dept}-${emp}`] && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                              <div style={{ padding: '0 20px 20px 60px', overflowX: 'auto' }}>
                                <table style={{ marginTop: 12 }}>
                                  <thead>
                                    <tr>
                                      <th style={{ width: 40, padding: '8px 12px' }}>
                                        <input type="checkbox"
                                          checked={groupedData[dept][emp].length > 0 && groupedData[dept][emp].every(l => selectedLeads.includes(l.id))}
                                          onChange={() => toggleAllLeads(groupedData[dept][emp])}
                                        />
                                      </th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Company / Contact</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Value</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Priority</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Status</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupedData[dept][emp].map(l => (
                                      <tr key={l.id} style={{ background: selectedLeads.includes(l.id) ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                                        <td style={{ padding: '8px 12px' }}>
                                          <input type="checkbox" checked={selectedLeads.includes(l.id)} onChange={() => toggleLeadSelection(l.id)} />
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.companyName}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.contactPerson}</div>
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>₹{Number(l.dealValue || 0).toLocaleString()}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                          <span style={{ 
                                            padding: '3px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                            background: l.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : l.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: l.priority === 'High' ? '#ef4444' : l.priority === 'Medium' ? '#f59e0b' : '#10b981'
                                          }}>
                                            {l.priority || 'Low'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '8px 12px' }}>
                                          <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)}
                                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--surface-border)', color: 'var(--text)' }}>
                                            <option value="New">New</option>
                                            <option value="Contacted">Contacted</option>
                                            <option value="Proposal">Proposal</option>
                                            <option value="Negotiation">Negotiation</option>
                                            <option value="Closed">Closed</option>
                                            <option value="Lost">Lost</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <button className="btn btn-sm btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                              onClick={() => openDetailModal(l)}>
                                              Details & Comms
                                            </button>
                                            <button style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                              onClick={() => { setReassignModal(l); setReassignTarget(''); }}
                                              title="Reassign to another employee">
                                              <UserPlus size={12} /> Reassign
                                            </button>
                                            <button style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                              onClick={() => deleteLead(l)}
                                              title="Permanently delete this lead">
                                              <Trash2 size={12} /> Delete
                                            </button>
                                          </div>
                                          {l.deletionRequested && <div style={{ marginTop: 4, fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b' }}>⚠️ Deletion requested</div>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Detail & Communication Modal */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setDetailModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ width: '100%', maxWidth: 960, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 20, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset' }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.04))' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{detailModal.companyName}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13}/>{detailModal.contactPerson}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13}/>{detailModal.email || 'No email'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13}/>{detailModal.phone || 'No phone'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saveFlash && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: saveFlash.startsWith('✓') ? '#10b981' : '#ef4444', animation: 'fadeIn 0.3s' }}>{saveFlash}</span>}
                {editDirty && (
                  <button onClick={saveLeadChanges} disabled={saving}
                    style={{ padding: '8px 20px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff', fontSize: '0.82rem', background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                    <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
                <button onClick={() => setDetailModal(null)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>Close</button>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: typeof window !== 'undefined' && window.innerWidth < 768 ? 'column' : 'row' }}>
              
              {/* Left Col: Lead Info & Activity */}
              <div style={{ flex: 1, borderRight: '1px solid var(--surface-border)', overflowY: 'auto', padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Assigned To</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{detailModal.assignedAsset}</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Status</div>
                    <select value={editForm.status || ''} onChange={e => editField('status', e.target.value)}
                      style={{ fontSize: '0.85rem', fontWeight: 600, width: '100%', border: '1.5px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', padding: '6px 8px', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }}>
                      {['New','Contacted','Qualified','Proposal','Negotiation','Closed','Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Deal Value</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                      <input type="number" value={editForm.dealValue || ''} onChange={e => editField('dealValue', e.target.value)} placeholder="0"
                        style={{ fontSize: '0.85rem', fontWeight: 600, width: '100%', border: '1.5px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', padding: '6px 8px', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Priority</div>
                    <select value={editForm.priority || ''} onChange={e => editField('priority', e.target.value)}
                      style={{ fontSize: '0.85rem', fontWeight: 600, width: '100%', border: '1.5px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', padding: '6px 8px', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }}>
                      {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
                    {editForm.notes !== (detailModal.notes || '') && (
                      <button onClick={async () => {
                        const res = await fetch('/api/admin-leads', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: detailModal.id, notes: editForm.notes }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setDetailModal(prev => ({ ...prev, notes: editForm.notes, activities: data.lead?.activities || prev.activities }));
                          setSaveFlash('✓ Notes saved');
                          setTimeout(() => setSaveFlash(''), 2000);
                          loadData();
                        }
                      }} style={{ padding: '4px 14px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff', fontSize: '0.72rem', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Save size={12} /> Save Notes
                      </button>
                    )}
                  </div>
                  <textarea value={editForm.notes || ''} onChange={e => editField('notes', e.target.value)} rows={2} placeholder="Add notes about this lead..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.82rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </div>

                {/* Admin Comment for Employee */}
                <div style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 12, border: '1.5px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MessageCircle size={14} color="#6366f1" />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1' }}>Admin Comment for Employee</span>
                    </div>
                    {adminComment.trim() && (
                      <button onClick={async () => {
                        const res = await fetch('/api/admin-leads', {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: detailModal.id, adminComment: adminComment.trim() }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setDetailModal(prev => ({ ...prev, activities: data.lead?.activities || prev.activities }));
                          setAdminComment('');
                          setSaveFlash('✓ Comment sent');
                          setTimeout(() => setSaveFlash(''), 2000);
                          loadData();
                        }
                      }} style={{ padding: '4px 14px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff', fontSize: '0.72rem', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Send size={12} /> Send Comment
                      </button>
                    )}
                  </div>
                  <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} rows={2} placeholder="Leave a comment visible to the assigned employee..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.03)', color: 'var(--text)', fontSize: '0.82rem', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '6px 0 0', fontStyle: 'italic' }}>This comment will appear in the employee's activity log for this lead.</p>
                </div>

                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16}/> Activity Log
                </h4>
                {detailModal.activities && detailModal.activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailModal.activities.map((a, i) => (
                      <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem', borderLeft: '3px solid var(--primary)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{a.type}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
                            <button 
                              onClick={() => setConfirmDeleteLog({ leadId: detailModal.id, activity: a })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, display: 'flex' }}
                              title="Delete log"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>{a.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No manual activities logged.</div>
                )}
              </div>

              {/* Right Col: Conversations & Reply */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
                <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={16}/> Email Conversations
                  </h4>
                  <button onClick={loadData} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(() => {
                    const convos = getLeadConversations(detailModal);
                    if (convos.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontSize: '0.85rem' }}>No email history found for {detailModal.email}</div>;
                    
                    return convos.map((msg, i) => (
                      <div key={i} style={{ 
                        alignSelf: msg.isReply ? 'flex-start' : 'flex-end', 
                        maxWidth: '85%', 
                        background: msg.isReply ? 'var(--surface)' : 'rgba(6, 182, 212, 0.1)', 
                        border: `1px solid ${msg.isReply ? 'var(--surface-border)' : 'rgba(6, 182, 212, 0.2)'}`,
                        borderRadius: 12, padding: 16,
                        borderBottomLeftRadius: msg.isReply ? 4 : 12,
                        borderBottomRightRadius: !msg.isReply ? 4 : 12,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{msg.isReply ? msg.fromName || msg.fromEmail : `Sent by ${msg.senderName || msg.adminName} ${msg.sentByAdmin ? '(Admin)' : ''}`}</span>
                          <span>{msg.date.toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Subject: {msg.subject}</div>
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text)', opacity: 0.9 }} 
                             dangerouslySetInnerHTML={{ __html: msg.bodyHtml || (msg.body ? msg.body.replace(/\n/g, '<br/>') : '') }} />
                      </div>
                    ));
                  })()}
                </div>

                {/* Reply Box */}
                <div style={{ padding: 20, background: 'var(--surface)', borderTop: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Reply on behalf of {detailModal.assignedAsset}
                  </div>
                  <input
                    placeholder="Subject"
                    value={replySubject}
                    onChange={e => setReplySubject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginBottom: 8, borderRadius: 6, border: '1px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <textarea
                    placeholder="Type your message here..."
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '12px', borderRadius: 6, border: '1px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.85rem', resize: 'none', marginBottom: 12, outline: 'none' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: '0.85rem' }}
                      onClick={() => sendReply(detailModal)}
                      disabled={sending || !detailModal.email}
                    >
                      {sending ? 'Sending...' : 'Send Email'} <Send size={14} />
                    </button>
                  </div>
                  {!detailModal.email && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 8, textAlign: 'right' }}>Lead has no email address.</div>}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ DELETION REQUESTS PANEL ═══ */}
      {pendingDeletionRequests.length > 0 && (
        <div className="card" style={{ marginTop: 24, border: '1.5px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(239,68,68,0.02))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Lead Deletion Requests</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>{pendingDeletionRequests.length} pending request{pendingDeletionRequests.length > 1 ? 's' : ''} from employees</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingDeletionRequests.map(r => (
              <div key={r.id} style={{
                padding: '14px 18px', borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--surface-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.leadCompanyName} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}>({r.leadContactPerson})</span></div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Requested by <strong style={{ color: 'var(--primary)' }}>{r.requestedByName}</strong> • {new Date(r.requestedAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.82rem', marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-secondary)', fontStyle: 'italic', color: 'var(--text)' }}>
                    Reason: "{r.reason}"
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDeletionRequest(r.id, 'approve-delete')}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <CheckCircle size={14} /> Approve & Delete
                  </button>
                  <button
                    onClick={() => handleDeletionRequest(r.id, 'reject-delete')}
                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ REASSIGN MODAL ═══ */}
      {reassignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setReassignModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ width: '100%', maxWidth: 500, overflow: 'hidden', borderRadius: 20, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Reassign Lead</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{reassignModal.companyName} — {reassignModal.contactPerson}</p>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Currently assigned to: </span>
                <strong style={{ color: 'var(--primary)' }}>{reassignModal.assignedAsset || 'Unassigned'}</strong>
              </div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>New Employee</label>
              <select
                value={reassignTarget}
                onChange={e => setReassignTarget(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit', marginBottom: 8 }}
              >
                <option value="">— Select Employee —</option>
                {employees.filter(e => e.id !== reassignModal.userId).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.department || 'No Dept'}) — {e.email}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 20px', lineHeight: 1.5 }}>
                All lead history, activities, and email correspondence will transfer to the new employee.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setReassignModal(null)} className="btn btn-outline">Cancel</button>
                <button
                  onClick={reassignLead}
                  disabled={!reassignTarget}
                  style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff',
                    background: !reassignTarget ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    boxShadow: !reassignTarget ? 'none' : '0 4px 16px rgba(99,102,241,0.35)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <UserPlus size={16} /> Reassign Lead
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Activity Log Delete Confirmation Modal */}
      {confirmDeleteLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setConfirmDeleteLog(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Delete Activity Log?</h3>
            </div>
            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 16, borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 2 }}>{confirmDeleteLog.activity.type}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{confirmDeleteLog.activity.description?.substring(0, 100)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDeleteLog(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => deleteActivityLog(confirmDeleteLog.leadId, confirmDeleteLog.activity)} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
