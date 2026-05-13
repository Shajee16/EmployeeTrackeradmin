'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Search, MessageSquare, Trash2, ChevronDown, Paperclip, Download, X } from 'lucide-react';

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: '', title: '', description: '', priority: 'Medium', deadline: '' });
  const [attachment, setAttachment] = useState(null); // { filename, contentType, data }
  const [commentModal, setCommentModal] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    fetch('/api/admin-tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
    return () => clearInterval(poll);
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(s) || (t.employeeName || '').toLowerCase().includes(s);
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [tasks, search, statusFilter]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      alert('File exceeds 3 MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        data: reader.result, // data:xxx;base64,...
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (attachment) {
        payload.attachment = {
          filename: attachment.filename,
          contentType: attachment.contentType,
          data: attachment.data,
        };
      }
      await fetch('/api/admin-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setShowCreate(false);
      setForm({ userId: '', title: '', description: '', priority: 'Medium', deadline: '' });
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      console.error('Task creation error:', err);
    }
    setSubmitting(false);
  };

  const updateStatus = async (id, status) => {
    await fetch('/api/admin-tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    await fetch('/api/admin-tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: commentModal.id, adminComment: comment }) });
    setComment('');
    setCommentModal(null);
    load();
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/admin-tasks?id=${id}`, { method: 'DELETE' });
    load();
  };

  const downloadAttachment = async (taskId, filename) => {
    try {
      const res = await fetch(`/api/admin-tasks/attachment?taskId=${taskId}`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Attachment not found');
        return;
      }
      // Create download link
      const link = document.createElement('a');
      link.href = `data:${data.contentType};base64,${data.base64Data}`;
      link.download = data.filename || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Failed to download attachment');
    }
  };

  const priorityColor = (p) => p === 'High' ? 'badge-danger' : p === 'Low' ? 'badge-info' : 'badge-warning';
  const statusColor = (s) => s === 'Completed' ? 'badge-success' : s === 'In Progress' ? 'badge-warning' : 'badge-info';

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Task Management</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> {showCreate ? 'Cancel' : 'Assign Task'}
        </button>
      </div>

      {/* Create Task Form */}
      {showCreate && (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Assign New Task</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Assign To</label>
              <select required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}>
                <option value="">Select Employee...</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Task Title</label>
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Complete sales report" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Task details..." />
            </div>

            {/* Attachment Section */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                <Paperclip size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Attachment (Optional, max 3 MB)
              </label>
              {!attachment ? (
                <div
                  style={{
                    border: '2px dashed var(--surface-border)', borderRadius: 10, padding: '18px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                    cursor: 'pointer', background: 'var(--bg-secondary)', transition: 'all 0.2s',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--surface)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                >
                  <Paperclip size={20} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Click to attach a file (PDF, Image, Document, etc.)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar"
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1.5px solid rgba(99,102,241,0.2)',
                }}>
                  <Paperclip size={18} color="#6366f1" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>{attachment.filename}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{attachment.contentType}</div>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? '⏳ Assigning & Sending Email...' : 'Assign Task'}
          </button>
        </motion.form>
      )}

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input placeholder="Search tasks by title or employee..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} />
        </div>
        <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead style={{ background: 'var(--surface-border)' }}>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Deadline</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, idx) => (
              <tr key={`${t.id}-${idx}`}>
                <td>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  {t.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.description.substring(0, 60)}{t.description.length > 60 ? '...' : ''}</div>}
                  {t.hasAttachment && (
                    <button
                      onClick={() => downloadAttachment(t.id, t.attachmentName)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                        color: '#6366f1', fontSize: '0.72rem', fontWeight: 600,
                      }}
                    >
                      <Download size={12} /> {t.attachmentName || 'Download'}
                    </button>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.employeeName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.employeeDept}</div>
                </td>
                <td><span className={`badge ${priorityColor(t.priority)}`}>{t.priority}</span></td>
                <td>
                  <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td style={{ fontSize: '0.85rem' }}>{t.deadline ? new Date(t.deadline).toLocaleDateString() : '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setCommentModal(t)} title="Comment">
                      <MessageSquare size={14} /> {(t.comments?.length || 0)}
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => deleteTask(t.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tasks found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCommentModal(null)}>
          <div className="card" style={{ padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Comments — {commentModal.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
              {(commentModal.comments || []).map(c => (
                <div key={c.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: c.by === 'admin' ? 'var(--primary)' : 'var(--text)' }}>{c.by === 'admin' ? 'Admin' : 'Employee'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem' }}>{c.text}</p>
                </div>
              ))}
              {(!commentModal.comments || commentModal.comments.length === 0) && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No comments yet.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary" onClick={addComment}>Send</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
