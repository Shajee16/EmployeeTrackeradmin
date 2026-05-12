'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, Phone, Mail, DollarSign, Users, TrendingUp, ChevronDown, ChevronRight, MessageSquare, Send } from 'lucide-react';

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

  const loadData = async () => {
    try {
      const [leadsRes, empsRes, emailsRes] = await Promise.all([
        fetch('/api/admin-leads').then(r => r.json()),
        fetch('/api/admin-employees').then(r => r.json()),
        fetch('/api/admin-leads/emails').then(r => r.json())
      ]);
      setLeads(leadsRes.leads || []);
      setEmployees(empsRes.employees || []);
      setEmails(emailsRes.emails || []);
      setReplies(emailsRes.replies || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const updateStatus = async (id, status) => {
    await fetch('/api/admin-leads', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    loadData();
    if (detailModal && detailModal.id === id) {
      setDetailModal(prev => ({ ...prev, status }));
    }
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
            .sort((a, b) => b.date - a.date);
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

      {/* Filters */}
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
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Company / Contact</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Value</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px' }}>Status</th>
                                      <th style={{ fontSize: '0.75rem', padding: '8px 12px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupedData[dept][emp].map(l => (
                                      <tr key={l.id}>
                                        <td style={{ padding: '8px 12px' }}>
                                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.companyName}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.contactPerson}</div>
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>₹{Number(l.dealValue || 0).toLocaleString()}</td>
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
                                          <button className="btn btn-sm btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                            onClick={() => setDetailModal(l)}>
                                            Details & Comms
                                          </button>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setDetailModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card" style={{ width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{detailModal.companyName}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span><Users size={12} style={{ display: 'inline', marginRight: 4 }}/>{detailModal.contactPerson}</span>
                  <span><Mail size={12} style={{ display: 'inline', marginRight: 4 }}/>{detailModal.email || 'No email'}</span>
                  <span><Phone size={12} style={{ display: 'inline', marginRight: 4 }}/>{detailModal.phone || 'No phone'}</span>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setDetailModal(null)}>Close</button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
              
              {/* Left Col: Lead Info & Activity */}
              <div style={{ flex: 1, borderRight: '1px solid var(--surface-border)', overflowY: 'auto', padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned To</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{detailModal.assignedAsset}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{detailModal.status}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Deal Value</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>₹{Number(detailModal.dealValue || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Priority</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{detailModal.priority}</div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16}/> Activity Log
                </h4>
                {detailModal.activities && detailModal.activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailModal.activities.map((a, i) => (
                      <div key={i} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{a.type}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(a.timestamp).toLocaleString()}</span>
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
                <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={16}/> Email Conversations
                  </h4>
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
    </motion.div>
  );
}
