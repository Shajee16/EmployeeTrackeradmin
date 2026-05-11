'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Check, X, Send } from 'lucide-react';

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [replyModal, setReplyModal] = useState(null);
  const [reply, setReply] = useState('');
  const [filter, setFilter] = useState('');

  const load = () => {
    fetch('/api/admin-suggestions').then(r => r.json()).then(d => setSuggestions(d.suggestions || []));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter ? suggestions.filter(s => s.status === filter) : suggestions;

  const updateSuggestion = async (id, status, adminReply) => {
    await fetch('/api/admin-suggestions', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, adminReply })
    });
    setReplyModal(null);
    setReply('');
    load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Employee Suggestions</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-info">{suggestions.filter(s => s.status === 'Pending').length} pending</span>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', marginBottom: 24, width: 300, height: 44 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none' }}>
          <option value="">All Suggestions</option>
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Implemented">Implemented</option>
          <option value="Dismissed">Dismissed</option>
        </select>
      </div>

      {/* Suggestions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((s, idx) => (
          <div key={`${s.id}-${idx}`} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MessageSquare size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{s.title || s.category || 'Suggestion'}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>By: <strong>{s.employeeName}</strong> ({s.employeeDept})</span>
                  <span>{new Date(s.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`badge ${s.status === 'Pending' ? 'badge-warning' : s.status === 'Implemented' ? 'badge-success' : s.status === 'Dismissed' ? 'badge-danger' : 'badge-info'}`}>
                {s.status}
              </span>
            </div>

            {/* Content */}
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{s.suggestion || s.description || s.message || 'No content'}</p>
              {s.category && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category: <span className="badge badge-info">{s.category}</span></div>}
            </div>

            {/* Admin Reply */}
            {s.adminReply && (
              <div style={{ background: 'rgba(6,182,212,0.08)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--primary)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Admin Reply</div>
                <p style={{ fontSize: '0.9rem' }}>{s.adminReply}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => { setReplyModal(s); setReply(s.adminReply || ''); }}>
                <Send size={14} /> Reply
              </button>
              {s.status === 'Pending' && (
                <>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => updateSuggestion(s.id, 'Implemented')}>
                    <Check size={14} /> Implement
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={() => updateSuggestion(s.id, 'Dismissed')}>
                    <X size={14} /> Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No suggestions found.
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setReplyModal(null)}>
          <div className="card" style={{ padding: 24, width: 500 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Reply to Suggestion</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>From: {replyModal.employeeName}</p>
            <textarea rows={4} value={reply} onChange={e => setReply(e.target.value)} placeholder="Write your reply..." style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setReplyModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => updateSuggestion(replyModal.id, 'Reviewed', reply)}>Send Reply</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
