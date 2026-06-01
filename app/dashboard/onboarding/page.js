'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, ShieldAlert, Clock, CheckCircle, XCircle, Search, Mail, Phone, GraduationCap } from 'lucide-react';

export default function AdminOnboardingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'resolved'

  // Remarks Form Modal State
  const [selectedReq, setSelectedReq] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'reject'
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin-ambassadors');
      if (res.ok) {
        const json = await res.json();
        setRequests(json.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin-ambassadors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedReq.id,
          action: actionType,
          remarks: remarks,
        }),
      });

      if (res.ok) {
        setSelectedReq(null);
        setRemarks('');
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update onboarding request');
      }
    } catch {
      alert('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter(r => 
    r.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    r.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
    r.collegeName?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingRequests = filtered.filter(r => r.status === 'pending');
  const resolvedRequests = filtered.filter(r => r.status !== 'pending');

  if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Onboarding Queue...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Student Ambassador Onboarding</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Review and approve campus ambassador registration requests submitted by College POCs.</p>
      </div>

      {/* Tabs and Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 24, border: '1px solid var(--surface-border)' }}>
          {[
            { id: 'pending', label: 'Pending Inbox', count: requests.filter(r => r.status === 'pending').length },
            { id: 'resolved', label: 'Resolved History', count: requests.filter(r => r.status !== 'pending').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: '0.8rem', fontWeight: 600,
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              }}
            >
              {tab.label}
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 10, background: activeTab === tab.id ? 'var(--primary-glow)' : 'var(--bg-secondary)', color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--surface-border)', width: 240 }}>
          <Search size={14} color="var(--text-muted)" />
          <input 
            placeholder="Search requests..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      {/* PENDING TAB CONTENT */}
      {activeTab === 'pending' && (
        <div className="card" style={{ padding: 24 }}>
          {pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              📥 All requests resolved! Your pending inbox is completely empty.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {pendingRequests.map(r => (
                <div key={r.id || r._id} style={{ border: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-glow)', padding: '3px 8px', borderRadius: 12 }}>
                      Pending Request
                    </span>
                    <h4 style={{ fontWeight: 800, fontSize: '1rem', marginTop: 10 }}>{r.studentName}</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <GraduationCap size={13} /> {r.collegeName} ({r.collegeCode})
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={13} /> {r.studentEmail}
                      </span>
                      {r.studentPhone && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} /> {r.studentPhone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                    <button 
                      onClick={() => { setSelectedReq(r); setActionType('approve'); }}
                      className="btn btn-success btn-sm"
                      style={{ gap: 6 }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button 
                      onClick={() => { setSelectedReq(r); setActionType('reject'); }}
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px solid #ef4444', color: '#ef4444', gap: 6 }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RESOLVED TAB CONTENT */}
      {activeTab === 'resolved' && (
        <div className="card" style={{ padding: 24 }}>
          {resolvedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              No history found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {resolvedRequests.map(r => (
                <div key={r.id || r._id} style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, borderLeft: `4px solid ${r.status === 'approved' ? '#10b981' : '#ef4444'}` }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.studentName}</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 4, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      <span>🎓 College: {r.collegeName}</span>
                      <span>✉️ Email: {r.studentEmail}</span>
                    </div>
                    {r.adminRemarks && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 6, background: 'var(--surface)', padding: '4px 8px', borderRadius: 4, display: 'inline-block' }}>
                        Remarks: {r.adminRemarks}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.status === 'approved' ? (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 700 }}>
                        <CheckCircle size={14} /> Approved
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 700 }}>
                        <XCircle size={14} /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACTION REMARKS MODAL */}
      {selectedReq && (
        <div className="modal-overlay" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: 450, padding: 24, borderRadius: 16, background: 'var(--surface)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: 12, marginBottom: 16 }}>
              <h3 className="modal-title" style={{ fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                {actionType === 'approve' ? '✓ Approve Onboarding' : '✗ Reject Onboarding'}
              </h3>
              <button onClick={() => setSelectedReq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {actionType === 'approve' 
                  ? `Are you sure you want to approve ${selectedReq.studentName} as a Campus Ambassador for ${selectedReq.collegeName}? This will automatically create their login account and email credentials.` 
                  : `Are you sure you want to reject the onboarding request for ${selectedReq.studentName}?`}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Administrative Remarks (Optional)</label>
                <textarea 
                  value={remarks} 
                  onChange={e => setRemarks(e.target.value)} 
                  placeholder={actionType === 'approve' ? "e.g. Approved IIT Bombay chapter rep." : "e.g. Email address or student credentials could not be verified."}
                  style={{ height: 80 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSelectedReq(null)} className="btn btn-ghost">Cancel</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className={actionType === 'approve' ? "btn btn-success" : "btn btn-danger"}
                  style={{ minWidth: 100 }}
                >
                  {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
