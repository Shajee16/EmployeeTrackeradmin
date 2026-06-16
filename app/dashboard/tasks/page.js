'use client';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Search, MessageSquare, Trash2, ChevronDown, Paperclip, Download, X } from 'lucide-react';
import { useTheme } from '../layout';

export default function TaskManagement() {
  const themeCtx = useTheme();
  const loggedInUser = themeCtx?.user;
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: '', userIds: [], title: '', description: '', priority: 'Medium', deadline: '', timeLimitHours: '' });
  const [attachment, setAttachment] = useState(null); // { filename, contentType, data }
  const [commentModal, setCommentModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // task to delete
  const fileInputRef = useRef(null);

  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const employeeDropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [timeSpentMs, setTimeSpentMs] = useState(0);

  const calculateTimeSpent = (statusLogs) => {
    if (!statusLogs || statusLogs.length === 0) return 0;
    let totalMs = 0;
    let activeStart = null;
    for (let i = 0; i < statusLogs.length; i++) {
      const log = statusLogs[i];
      if (log.status === 'In Progress') {
        activeStart = new Date(log.timestamp);
      } else if (activeStart && ['Completed', 'Pending', 'Cancelled'].includes(log.status)) {
        totalMs += new Date(log.timestamp) - activeStart;
        activeStart = null;
      }
    }
    if (activeStart) {
      totalMs += new Date() - activeStart;
    }
    return totalMs;
  };

  const formatTimeSpent = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  useEffect(() => {
    if (!viewModal) {
      setTimeSpentMs(0);
      return;
    }

    const updateTimer = () => {
      const ms = calculateTimeSpent(viewModal.statusLogs);
      setTimeSpentMs(ms);
    };

    updateTimer();
    if (viewModal.status === 'In Progress') {
      const timerId = setInterval(updateTimer, 1000);
      return () => clearInterval(timerId);
    }
  }, [viewModal]);

  const load = () => {
    fetch(`/api/admin-tasks?t=${Date.now()}`).then(r => r.json()).then(d => setTasks(d.tasks || []));
  };

  useEffect(() => {
    load();
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(s) || (t.employeeName || '').toLowerCase().includes(s);
      const matchStatus = statusFilter ? t.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [tasks, search, statusFilter]);

  const [expandedGroups, setExpandedGroups] = useState({});

  const groupedTasks = useMemo(() => {
    const groups = {};
    filtered.forEach(t => {
      const dateKey = t.createdAt 
        ? new Date(t.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown Date';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(t);
    });
    
    return Object.entries(groups).map(([date, items]) => {
      return { date, items };
    }).sort((a, b) => {
      if (a.date === 'Unknown Date') return 1;
      if (b.date === 'Unknown Date') return -1;
      const dateA = a.items[0]?.createdAt ? new Date(a.items[0].createdAt) : new Date(0);
      const dateB = b.items[0]?.createdAt ? new Date(b.items[0].createdAt) : new Date(0);
      return dateB - dateA;
    });
  }, [filtered]);

  const toggleGroup = (date) => {
    setExpandedGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

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
      setForm({ userId: '', userIds: [], title: '', description: '', priority: 'Medium', deadline: '', timeLimitHours: '' });
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
    load(true);
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    await fetch('/api/admin-tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: commentModal.id, adminComment: comment }) });
    setComment('');
    setCommentModal(null);
    load(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin-tasks?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');
      load();
    } catch (err) {
      console.error(err);
      alert('Error deleting task: ' + err.message);
    }
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

  const downloadCompletionProof = async (taskId, filename) => {
    try {
      const res = await fetch(`/api/admin-tasks/attachment?taskId=${taskId}&type=completion_proof`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Completion proof not found');
        return;
      }
      const link = document.createElement('a');
      link.href = `data:${data.contentType};base64,${data.base64Data}`;
      link.download = data.filename || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Failed to download completion proof');
    }
  };

  const addCommentFromViewModal = async () => {
    if (!comment.trim() || !viewModal) return;
    const res = await fetch('/api/admin-tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewModal.id, adminComment: comment }) });
    if (res.ok) {
      const updatedText = comment;
      setViewModal(prev => {
        if (!prev) return null;
        const newComments = [...(prev.comments || []), {
          id: Math.random().toString(),
          text: updatedText,
          timestamp: new Date().toISOString(),
          by: 'admin',
          adminName: loggedInUser?.name || loggedInUser?.email || 'Admin'
        }];
        return { ...prev, comments: newComments };
      });
      setComment('');
      load();
    }
  };

  const updateStatusFromViewModal = async (status) => {
    if (!viewModal) return;
    const res = await fetch('/api/admin-tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewModal.id, status }) });
    if (res.ok) {
      setViewModal(prev => prev ? { ...prev, status } : null);
      load();
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
            <div ref={employeeDropdownRef} style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Assign To</label>
              <div 
                onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--surface-border)',
                  borderRadius: 12,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 44,
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ color: form.userIds.length > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                  {form.userIds.length === 0 
                    ? 'Select Employees...' 
                    : form.userIds.length === 1 
                      ? `${employees.find(e => e.id === form.userIds[0])?.name || '1 employee'} selected`
                      : `${form.userIds.length} employees selected`
                  }
                </span>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: showEmployeeDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {showEmployeeDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: 'var(--surface, #ffffff)',
                  border: '1.5px solid var(--surface-border)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 200,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: 280
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      placeholder="Search employee..." 
                      value={empSearch}
                      onChange={e => setEmpSearch(e.target.value)}
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '0.8rem', 
                        borderRadius: 8,
                        border: '1px solid var(--surface-border)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        flex: 1
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const filteredIds = employees
                          .filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()))
                          .map(e => e.id);
                        setForm(prev => ({
                          ...prev,
                          userIds: Array.from(new Set([...prev.userIds, ...filteredIds]))
                        }));
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: '1.5px solid var(--surface-border)',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      All
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm(prev => ({ ...prev, userIds: [] }));
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: '1.5px solid var(--surface-border)',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                    {employees
                      .filter(emp => emp.name.toLowerCase().includes(empSearch.toLowerCase()))
                      .map(emp => {
                        const isChecked = form.userIds.includes(emp.id);
                        return (
                          <label 
                            key={emp.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 10, 
                              fontSize: '0.85rem', 
                              padding: '6px 8px', 
                              borderRadius: 8, 
                              cursor: 'pointer',
                              background: isChecked ? 'rgba(99,102,241,0.06)' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isChecked ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = isChecked ? 'rgba(99,102,241,0.06)' : 'transparent'}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setForm(prev => ({ ...prev, userIds: prev.userIds.filter(id => id !== emp.id) }));
                                } else {
                                  setForm(prev => ({ ...prev, userIds: [...prev.userIds, emp.id] }));
                                }
                              }}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{emp.name}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.department}</span>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
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
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Time Limit (Hours, Optional)</label>
              <input type="number" step="0.1" min="0.1" max="1000" placeholder="e.g. 4" value={form.timeLimitHours} onChange={e => setForm({...form, timeLimitHours: e.target.value})} />
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
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting || form.userIds.length === 0}>
            {submitting ? '⏳ Assigning...' : 'Assign Task'}
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
            {groupedTasks.map((group) => (
              <Fragment key={group.date}>
                <tr 
                  onClick={() => toggleGroup(group.date)} 
                  style={{ 
                    background: 'var(--surface-border)', 
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  className="group-header-row"
                >
                  <td colSpan={6} style={{ padding: '10px 16px', fontWeight: 700, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChevronDown 
                        size={15} 
                        style={{ 
                          transform: expandedGroups[group.date] ? 'rotate(0deg)' : 'rotate(-90deg)', 
                          transition: 'transform 0.2s ease',
                          color: 'var(--text-muted)'
                        }} 
                      />
                      <span style={{ color: 'var(--text)' }}>Issued: {group.date}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        color: 'var(--text-muted)', 
                        background: 'var(--bg-secondary)', 
                        padding: '1px 6px', 
                        borderRadius: 10,
                        fontWeight: 600
                      }}>
                        {group.items.length} {group.items.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>
                  </td>
                </tr>
                {expandedGroups[group.date] && group.items.map((t, idx) => (
                  <tr key={`${t.id}-${idx}`} style={{ cursor: 'pointer' }} onClick={() => setViewModal(t)}>
                    <td>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setViewModal(t); }}
                        style={{ 
                          fontWeight: 600, 
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-block',
                          transition: 'color 0.2s, text-decoration 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                      >
                        {t.title}
                      </div>
                      {t.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.description.substring(0, 60)}{t.description.length > 60 ? '...' : ''}</div>}
                      {t.hasAttachment && (
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadAttachment(t.id, t.attachmentName); }}
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
                      <select value={t.status} onClick={e => e.stopPropagation()} onChange={e => updateStatus(t.id, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{t.deadline ? new Date(t.deadline).toLocaleDateString() : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setCommentModal(t)} title="Comment">
                          <MessageSquare size={14} /> {(t.comments?.length || 0)}
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setDeleteConfirm(t)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {groupedTasks.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tasks found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Task View/Detail Modal */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setViewModal(null)}>
          <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-secondary)' }}>
              <div>
                <span className={`badge ${priorityColor(viewModal.priority)}`} style={{ marginBottom: 6 }}>{viewModal.priority}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{viewModal.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Assigned to: <strong>{viewModal.employeeName}</strong> ({viewModal.employeeDept})
                </p>
              </div>
              <button onClick={() => setViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
            </div>
            
            {/* Scrollable Content */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Task Meta Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  <select value={viewModal.status} onChange={e => updateStatusFromViewModal(e.target.value)}
                    style={{ fontSize: '0.8rem', fontWeight: 600, width: '100%', border: '1px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', padding: '4px 6px', borderRadius: 6 }}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Deadline</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{viewModal.deadline ? new Date(viewModal.deadline).toLocaleDateString() : '-'}</div>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Created At</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{viewModal.createdAt ? new Date(viewModal.createdAt).toLocaleDateString() : '-'}</div>
                </div>
              </div>

              {/* Task Timer / Time Limit display */}
              <div style={{
                background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', fontSize: '0.8rem' }}>
                      ⏱️
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Spent</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {formatTimeSpent(timeSpentMs)}
                    {viewModal.status === 'In Progress' && (
                      <span className="live-pulse-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                    )}
                  </div>
                </div>

                {viewModal.timeLimitHours && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Time Limit: {viewModal.timeLimitHours} hrs</span>
                      <span style={{ color: timeSpentMs > (viewModal.timeLimitHours * 3600 * 1000) ? '#ef4444' : 'var(--text-secondary)' }}>
                        {(timeSpentMs / (3600 * 1000)).toFixed(2)} / {viewModal.timeLimitHours} hrs
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--surface-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${Math.min(100, (timeSpentMs / (viewModal.timeLimitHours * 3600 * 1000)) * 100)}%`, 
                        height: '100%', 
                        background: timeSpentMs > (viewModal.timeLimitHours * 3600 * 1000) ? '#ef4444' : 'var(--primary)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    {timeSpentMs > (viewModal.timeLimitHours * 3600 * 1000) && (
                      <p style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, margin: '6px 0 0 0' }}>
                        ⚠️ Employee has exceeded the set time limit of {viewModal.timeLimitHours} hours!
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</h4>
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {viewModal.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
                </div>
              </div>

              {/* Attachments */}
              {(viewModal.hasAttachment || viewModal.hasCompletionProof) && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attachments</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {viewModal.hasAttachment && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Task Document: {viewModal.attachmentName || 'Attachment'}</span>
                        <button onClick={() => downloadAttachment(viewModal.id, viewModal.attachmentName)} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 10px' }}>
                          <Download size={12} /> Download
                        </button>
                      </div>
                    )}
                    {viewModal.hasCompletionProof && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Completion Proof: {viewModal.completionProofName || 'Proof.pdf'}</span>
                        <button onClick={() => downloadCompletionProof(viewModal.id, viewModal.completionProofName || 'Proof')} className="btn btn-sm btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 10px', background: '#10b981', border: 'none' }}>
                          <Download size={12} /> Download Proof
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Logs History Timeline */}
              {viewModal.statusLogs && viewModal.statusLogs.length > 0 && (
                <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity & Status Log</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 8, marginBottom: 20 }}>
                    {viewModal.statusLogs.map((log, lIdx) => {
                      const logDate = new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      });
                      const isCompleted = log.status === 'Completed';
                      const isInProgress = log.status === 'In Progress';
                      const isPending = log.status === 'Pending';
                      const badgeColor = isCompleted ? '#10b981' : isInProgress ? 'var(--primary)' : 'var(--text-muted)';
                      
                      return (
                        <div key={lIdx} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                          {/* Timeline Connector Line */}
                          {lIdx < viewModal.statusLogs.length - 1 && (
                            <div style={{ position: 'absolute', left: 7, top: 18, bottom: -18, width: 2, background: 'var(--surface-border)' }} />
                          )}
                          {/* Timeline Dot */}
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%',
                            background: badgeColor, border: '3px solid var(--surface)',
                            boxShadow: '0 0 0 1px var(--surface-border)',
                            flexShrink: 0, marginTop: 3
                          }} />
                          {/* Log Details */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                                {log.status === 'In Progress' ? '🚀 Task Started' : log.status === 'Completed' ? '✅ Task Completed & Submitted' : log.status === 'Pending' ? '📋 Task Assigned / Set to Pending' : `Task status: ${log.status}`}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{logDate}</span>
                            </div>
                            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                              Action by: <strong>{log.userName || (log.by === 'admin' ? 'Admin' : 'Employee')}</strong>
                            </p>
                            {log.comment && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, margin: '6px 0 0 0', display: 'inline-block', border: '1px solid var(--surface-border)' }}>
                                {log.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comments & Discussion</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                  {(viewModal.comments || []).map(c => (
                    <div key={c.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: c.by === 'admin' ? 'var(--primary)' : 'var(--text)' }}>
                          {c.by === 'admin' ? (c.adminName ? `${c.adminName} (Admin)` : 'Admin') : 'Employee'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text)', lineHeight: 1.4 }}>{c.text}</p>
                    </div>
                  ))}
                  {(!viewModal.comments || viewModal.comments.length === 0) && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0', fontSize: '0.82rem' }}>No comments logged yet.</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Add a comment to this task..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCommentFromViewModal()} style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)' }} />
                  <button className="btn btn-primary" onClick={addCommentFromViewModal} style={{ padding: '10px 20px', fontWeight: 600 }}>Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setCommentModal(null)}>
          <div className="card" style={{ padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Comments — {commentModal.title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
              {(commentModal.comments || []).map(c => (
                <div key={c.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: c.by === 'admin' ? 'var(--primary)' : 'var(--text)' }}>
                      {c.by === 'admin' ? (c.adminName ? `${c.adminName} (Admin)` : 'Admin') : 'Employee'}
                    </span>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteConfirm(null)}>
          <div className="card" style={{ padding: 28, width: 420, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Delete Task?</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-outline" style={{ padding: '10px 24px', fontSize: '0.88rem' }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ padding: '10px 24px', fontSize: '0.88rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onClick={confirmDelete} onMouseEnter={e => e.target.style.background='#dc2626'} onMouseLeave={e => e.target.style.background='#ef4444'}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .live-pulse-dot {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.3; transform: scale(0.9); }
        }
        .group-header-row:hover {
          background-color: var(--surface-border) !important;
          opacity: 0.95;
        }
      `}</style>
    </motion.div>
  );
}
