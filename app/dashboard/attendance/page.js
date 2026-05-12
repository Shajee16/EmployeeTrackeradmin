'use client';
import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, Search, ShieldCheck, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, Building2, Users, CalendarDays } from 'lucide-react';

const statusBadge = (s) => {
  const map = {
    Present: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
    'Half Day': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
    Absent: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
    'On Leave': { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
    Weekend: { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8' },
  };
  const st = map[s] || map.Absent;
  return { padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700, background: st.bg, color: st.color, display: 'inline-block' };
};

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tab, setTab] = useState('attendance');
  const [leaveFilter, setLeaveFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [expandedEmps, setExpandedEmps] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  });

  const fetchData = () => {
    fetch('/api/admin-attendance').then(r => r.json()).then(d => setAttendance(d.attendance || []));
    fetch('/api/admin-leaves').then(r => r.json()).then(d => setLeaves(d.leaves || []));
  };
  useEffect(() => { fetchData(); }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPresent = attendance.filter(a => a.date === todayStr && a.status === 'Present').length;
  const todayAbsent = attendance.filter(a => a.date === todayStr && a.status === 'Absent').length;
  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

  // Filter attendance by selected month
  const monthFiltered = useMemo(() => {
    return attendance.filter(a => a.date && a.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  // Build hierarchy: Department → Employee → sorted dates
  const grouped = useMemo(() => {
    const tree = {};
    monthFiltered.forEach(a => {
      const dept = a.employeeDept || 'Unknown';
      const emp = a.employeeName || 'Unknown';
      if (!tree[dept]) tree[dept] = {};
      if (!tree[dept][emp]) tree[dept][emp] = [];
      tree[dept][emp].push(a);
    });
    // Sort each employee's records by date descending
    Object.values(tree).forEach(deptData => {
      Object.keys(deptData).forEach(emp => {
        deptData[emp].sort((a, b) => b.date.localeCompare(a.date));
      });
    });
    return tree;
  }, [monthFiltered]);

  const toggle = (setter, key) => setter(p => ({ ...p, [key]: !p[key] }));

  // Month navigation
  const months = useMemo(() => {
    const set = new Set(attendance.map(a => a.date?.substring(0, 7)).filter(Boolean));
    return [...set].sort().reverse();
  }, [attendance]);

  const handleLeaveAction = async (leaveId, action) => {
    setActionLoading(leaveId);
    const comment = action === 'Rejected' ? prompt('Optional: Add a reason for rejection') || '' : '';
    await fetch('/api/admin-leaves', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leaveId, action, adminComments: comment }),
    });
    setActionLoading(null);
    fetchData();
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => leaveFilter === 'All' || l.status === leaveFilter);
  }, [leaves, leaveFilter]);

  const getDayName = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Attendance & Leave Management</h2>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('attendance')} className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarCheck size={16} /> Attendance Records
        </button>
        <button onClick={() => setTab('leaves')} className={`btn ${tab === 'leaves' ? 'btn-primary' : 'btn-ghost'}`} style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <ShieldCheck size={16} /> Leave Approvals
          {pendingLeaves > 0 && <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 10, marginLeft: 4 }}>{pendingLeaves}</span>}
        </button>
      </div>

      {/* ════════ ATTENDANCE TAB ════════ */}
      {tab === 'attendance' && (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20, borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Records This Month</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{monthFiltered.length}</div>
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

          {/* Month Selector */}
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarDays size={18} color="var(--text-muted)" />
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
              {months.map(m => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>)}
            </select>
          </div>

          {/* Hierarchical View */}
          {Object.keys(grouped).length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records for this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.keys(grouped).sort().map(dept => {
                const deptData = grouped[dept];
                const empCount = Object.keys(deptData).length;
                return (
                  <div key={dept} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    {/* Department Header */}
                    <div onClick={() => toggle(setExpandedDepts, dept)} style={{
                      padding: '16px 20px', cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(6,182,212,0.04))',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: expandedDepts[dept] ? '1px solid var(--surface-border)' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {expandedDepts[dept] ? <ChevronDown size={18} color="var(--primary)" /> : <ChevronRight size={18} color="var(--primary)" />}
                        <Building2 size={18} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>{dept}</h3>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{empCount} employees</span>
                    </div>

                    <AnimatePresence>
                      {expandedDepts[dept] && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                          {Object.keys(deptData).sort().map(emp => {
                            const empKey = `${dept}-${emp}`;
                            const records = deptData[emp];
                            const presentDays = records.filter(r => r.status === 'Present').length;
                            const totalHrs = records.reduce((s, r) => s + (r.totalHours || 0), 0);

                            return (
                              <div key={empKey} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                {/* Employee Header */}
                                <div onClick={() => toggle(setExpandedEmps, empKey)} style={{
                                  padding: '12px 20px 12px 48px', cursor: 'pointer', background: 'var(--bg-secondary)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {expandedEmps[empKey] ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                                    <Users size={16} color="var(--text-muted)" />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{emp}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span>{presentDays} present</span>
                                    <span>{Math.round(totalHrs * 10) / 10}h total</span>
                                    <span>{records.length} days</span>
                                  </div>
                                </div>

                                {/* Day-wise calendar */}
                                <AnimatePresence>
                                  {expandedEmps[empKey] && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                                      <div style={{ padding: '12px 20px 16px 72px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                          <thead>
                                            <tr style={{ borderBottom: '2px solid var(--surface-border)' }}>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Date</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Day</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Check In</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Check Out</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Hours</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Mode</th>
                                              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {records.map((r, i) => {
                                              const isWeekend = r.status === 'Weekend';
                                              const dayKey = `${empKey}-${r.date}`;
                                              const hasSessions = r.sessions && r.sessions.length > 0;
                                              const hasActivities = r.activities && r.activities.length > 0;
                                              const hasDetail = hasSessions || hasActivities;
                                              const fmtISO = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                                              const fmtSecs = (s) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

                                              return (
                                                <React.Fragment key={i}>
                                                  <tr
                                                    onClick={() => hasDetail && toggle(setExpandedDays, dayKey)}
                                                    style={{
                                                      borderBottom: expandedDays[dayKey] ? 'none' : '1px solid var(--surface-border)',
                                                      opacity: isWeekend ? 0.5 : 1,
                                                      background: r.date === todayStr ? 'rgba(99,102,241,0.04)' : 'transparent',
                                                      cursor: hasDetail ? 'pointer' : 'default',
                                                    }}>
                                                    <td style={{ padding: '8px 10px', fontWeight: r.date === todayStr ? 700 : 500 }}>
                                                      {hasDetail && (expandedDays[dayKey] ? <ChevronDown size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : <ChevronRight size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />)}
                                                      {r.date}{r.date === todayStr && <span style={{ color: 'var(--primary)', fontSize: '0.65rem', marginLeft: 4 }}>TODAY</span>}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: isWeekend ? '#94a3b8' : 'var(--text)' }}>{getDayName(r.date)}</td>
                                                    <td style={{ padding: '8px 10px' }}>{r.loginTime || '-'}</td>
                                                    <td style={{ padding: '8px 10px' }}>{r.logoutTime || '-'}</td>
                                                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.totalHours ? `${r.totalHours}h` : '-'}</td>
                                                    <td style={{ padding: '8px 10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.workMode || '-'}</td>
                                                    <td style={{ padding: '8px 10px' }}><span style={statusBadge(r.status)}>{r.status}</span></td>
                                                  </tr>

                                                  {/* Expanded Detail Row */}
                                                  {expandedDays[dayKey] && (
                                                    <tr>
                                                      <td colSpan={7} style={{ padding: '0 10px 16px 30px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
                                                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>

                                                          {/* Sessions & Breaks */}
                                                          {hasSessions && (
                                                            <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                                                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
                                                                🕐 Sessions & Breaks ({r.sessions.length} session{r.sessions.length > 1 ? 's' : ''})
                                                              </div>
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {r.sessions.map((sess, si) => {
                                                                  // Calculate break before this session
                                                                  let breakBefore = null;
                                                                  if (si > 0 && r.sessions[si - 1].logoutTime && sess.loginTime) {
                                                                    const prevOut = new Date(r.sessions[si - 1].logoutTime).getTime();
                                                                    const curIn = new Date(sess.loginTime).getTime();
                                                                    const breakSecs = Math.floor((curIn - prevOut) / 1000);
                                                                    if (breakSecs > 60) breakBefore = breakSecs;
                                                                  }
                                                                  return (
                                                                    <React.Fragment key={si}>
                                                                      {breakBefore && (
                                                                        <div style={{
                                                                          padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem',
                                                                          background: 'rgba(245,158,11,0.08)', color: '#d97706',
                                                                          border: '1px dashed rgba(245,158,11,0.3)', textAlign: 'center',
                                                                        }}>
                                                                          ☕ Break — {fmtSecs(breakBefore)}
                                                                        </div>
                                                                      )}
                                                                      <div style={{
                                                                        padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem',
                                                                        background: 'var(--surface)', border: '1px solid var(--surface-border)',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                      }}>
                                                                        <div>
                                                                          <span style={{ fontWeight: 600, color: '#10b981' }}>▶ {fmtISO(sess.loginTime)}</span>
                                                                          <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                                                                          <span style={{ fontWeight: 600, color: '#ef4444' }}>⏹ {fmtISO(sess.logoutTime)}</span>
                                                                        </div>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                                          {fmtSecs(sess.totalSeconds)}
                                                                        </span>
                                                                      </div>
                                                                    </React.Fragment>
                                                                  );
                                                                })}
                                                              </div>
                                                            </div>
                                                          )}

                                                          {/* Activity Timeline */}
                                                          {hasActivities && (
                                                            <div style={{ flex: '1 1 320px', minWidth: 280 }}>
                                                              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
                                                                📋 Activity Log ({r.activities.length} actions)
                                                              </div>
                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' }}>
                                                                {r.activities.map((act, ai) => (
                                                                  <div key={ai} style={{
                                                                    padding: '5px 10px', fontSize: '0.75rem', borderRadius: 6,
                                                                    background: 'var(--surface)', border: '1px solid var(--surface-border)',
                                                                    display: 'flex', gap: 8, alignItems: 'flex-start',
                                                                  }}>
                                                                    <span style={{ fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                                      {fmtISO(act.time)}
                                                                    </span>
                                                                    <span style={{ color: 'var(--text)', lineHeight: 1.4 }}>{act.action}</span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}

                                                          {!hasSessions && !hasActivities && (
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No detailed session data available for this day.</div>
                                                          )}
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
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
            </div>
          )}
        </>
      )}

      {/* ════════ LEAVE APPROVALS TAB ════════ */}
      {tab === 'leaves' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Pending', color: '#f59e0b', icon: Clock, filter: 'Pending' },
              { label: 'Approved', color: '#10b981', icon: CheckCircle, filter: 'Approved' },
              { label: 'Rejected', color: '#ef4444', icon: XCircle, filter: 'Rejected' },
              { label: 'All', color: 'var(--primary)', icon: CalendarCheck, filter: 'All' },
            ].map(({ label, color, icon: Icon, filter }) => (
              <div key={label} className="card" style={{ padding: 20, borderLeft: `4px solid ${color}`, cursor: 'pointer' }} onClick={() => setLeaveFilter(filter)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon size={18} color={color} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{filter === 'All' ? leaves.length : leaves.filter(l => l.status === filter).length}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead style={{ background: 'var(--surface-border)' }}>
                <tr>
                  <th>Employee</th><th>Department</th><th>Date</th><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l, i) => (
                  <tr key={l.id || i} style={l.status === 'Pending' ? { background: 'rgba(239,68,68,0.03)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{l.userName}</td>
                    <td><span className="badge badge-info">{l.userDepartment}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{l.date ? new Date(l.date).toLocaleDateString() : '-'}</td>
                    <td><span className="badge" style={{ background: l.leaveType === 'Comp Off' ? 'rgba(139,92,246,0.1)' : 'rgba(99,102,241,0.1)', color: l.leaveType === 'Comp Off' ? '#8b5cf6' : 'var(--primary)' }}>{l.leaveType === 'Comp Off' && '⭐ '}{l.leaveType}</span></td>
                    <td style={{ fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                    <td><span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`} style={l.status === 'Pending' ? { border: '1.5px dashed #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444' } : {}}>{l.status}</span></td>
                    <td>
                      {l.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button disabled={actionLoading === l.id} onClick={() => handleLeaveAction(l.id, 'Approved')} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} /> Approve</button>
                          <button disabled={actionLoading === l.id} onClick={() => handleLeaveAction(l.id, 'Rejected')} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={13} /> Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.reviewedAt ? new Date(l.reviewedAt).toLocaleDateString() : '—'}</span>
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
