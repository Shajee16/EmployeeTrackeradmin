'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Search, ShieldCheck, ShieldX, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [leaveFilter, setLeaveFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = () => {
    fetch('/api/admin-attendance').then(r => r.json()).then(d => setAttendance(d.attendance || []));
    fetch('/api/admin-leaves').then(r => r.json()).then(d => setLeaves(d.leaves || []));
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Attendance filtering ── */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return attendance.filter(a => {
      const matchSearch = (a.employeeName || '').toLowerCase().includes(s);
      const matchDate = dateFilter ? a.date === dateFilter : true;
      const matchStatus = statusFilter ? a.status === statusFilter : true;
      return matchSearch && matchDate && matchStatus;
    });
  }, [attendance, search, dateFilter, statusFilter]);

  /* ── Leave filtering ── */
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => leaveFilter === 'All' || l.status === leaveFilter);
  }, [leaves, leaveFilter]);

  /* ── Stats ── */
  const uniqueDates = [...new Set(attendance.map(a => a.date))].sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(a => a.date === todayStr);
  const todayPresent = todayRecords.filter(a => a.status === 'Present').length;
  const todayAbsent = todayRecords.filter(a => a.status === 'Absent').length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  /* ── Leave approval/rejection ── */
  const handleLeaveAction = async (leaveId, action) => {
    setActionLoading(leaveId);
    const comment = action === 'Rejected'
      ? prompt('Optional: Add a reason for rejection') || ''
      : '';

    await fetch('/api/admin-leaves', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveId, action, adminComments: comment }),
    });

    setActionLoading(null);
    fetchData();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Attendance & Leave Management</h2>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setTab('attendance')}
          className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarCheck size={16} /> Attendance Records
        </button>
        <button
          onClick={() => setTab('leaves')}
          className={`btn ${tab === 'leaves' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <ShieldCheck size={16} /> Leave Approvals
          {pendingLeaves > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
              padding: '2px 6px', borderRadius: 10, marginLeft: 4,
            }}>{pendingLeaves}</span>
          )}
        </button>
      </div>

      {/* ════════ ATTENDANCE TAB ════════ */}
      {tab === 'attendance' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Records</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{attendance.length}</div>
            </div>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--success)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Present Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>{todayPresent}</div>
            </div>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--danger)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Absent Today</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)' }}>{todayAbsent}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Search size={18} color="var(--text-muted)" />
              <input placeholder="Search by employee name..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, flex: 1, color: 'var(--text)' }} />
            </div>
            <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
                <option value="">All Dates</option>
                {uniqueDates.slice(0, 30).map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString()}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', height: '100%', outline: 'none' }}>
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead style={{ background: 'var(--surface-border)' }}>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{a.employeeName}</td>
                    <td><span className="badge badge-info">{a.employeeDept}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{a.date ? new Date(a.date).toLocaleDateString() : '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{a.loginTime || a.checkIn || '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{a.logoutTime || a.checkOut || '-'}</td>
                    <td>
                      <span className={`badge ${a.status === 'Present' ? 'badge-success' : a.status === 'Half Day' ? 'badge-warning' : a.status === 'On Leave' ? 'badge-info' : 'badge-danger'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No attendance records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ════════ LEAVE APPROVALS TAB ════════ */}
      {tab === 'leaves' && (
        <>
          {/* Leave Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid #f59e0b', cursor: 'pointer' }} onClick={() => setLeaveFilter('Pending')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock size={18} color="#f59e0b" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{leaves.filter(l => l.status === 'Pending').length}</div>
            </div>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid #10b981', cursor: 'pointer' }} onClick={() => setLeaveFilter('Approved')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Approved</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{leaves.filter(l => l.status === 'Approved').length}</div>
            </div>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid #ef4444', cursor: 'pointer' }} onClick={() => setLeaveFilter('Rejected')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <XCircle size={18} color="#ef4444" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Rejected</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{leaves.filter(l => l.status === 'Rejected').length}</div>
            </div>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)', cursor: 'pointer' }} onClick={() => setLeaveFilter('All')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CalendarCheck size={18} color="var(--primary)" />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>All</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{leaves.length}</div>
            </div>
          </div>

          {/* Leave Applications Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead style={{ background: 'var(--surface-border)' }}>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l, i) => (
                  <tr key={l.id || i} style={l.status === 'Pending' ? { background: 'rgba(239,68,68,0.03)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{l.userName}</td>
                    <td><span className="badge badge-info">{l.userDepartment}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{l.date ? new Date(l.date).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className="badge" style={{
                        background: l.leaveType === 'Comp Off' ? 'rgba(139,92,246,0.1)' : 'rgba(99,102,241,0.1)',
                        color: l.leaveType === 'Comp Off' ? '#8b5cf6' : 'var(--primary)',
                      }}>
                        {l.leaveType === 'Comp Off' && '⭐ '}{l.leaveType}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.reason}
                    </td>
                    <td>
                      <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}
                        style={l.status === 'Pending' ? { border: '1.5px dashed #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444' } : {}}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            disabled={actionLoading === l.id}
                            onClick={() => handleLeaveAction(l.id, 'Approved')}
                            style={{
                              background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px',
                              borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button
                            className="btn btn-sm"
                            disabled={actionLoading === l.id}
                            onClick={() => handleLeaveAction(l.id, 'Rejected')}
                            style={{
                              background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px',
                              borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {l.reviewedAt ? new Date(l.reviewedAt).toLocaleDateString() : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeaves.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No leave applications found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
}
