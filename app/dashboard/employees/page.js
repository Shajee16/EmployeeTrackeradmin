'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserX, UserPlus, Edit, Eye, EyeOff, X, Check, Activity, ChevronDown, ChevronUp, Wifi, WifiOff, Target, ShieldCheck, ShieldX, Link2Off, Lock, Unlock, Download, FileText } from 'lucide-react';
import { useTheme } from '../layout';

const formatDob = (dob) => {
  if (!dob) return '';
  const dobStr = dob.toString().trim();
  // Check if DDMMYYYY
  if (/^\d{8}$/.test(dobStr)) {
    return `${dobStr.substring(0, 2)}-${dobStr.substring(2, 4)}-${dobStr.substring(4, 8)}`;
  }
  // Check if YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
    const parts = dobStr.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dobStr;
};

const getMaskedValue = (value) => {
  if (!value) return '';
  const str = value.toString().trim();
  return '•'.repeat(Math.min(15, str.length));
};

export default function EmployeesPage() {
  const { user } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [savedDepartments, setSavedDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Sales', role: 'Employee', designation: '', phone: '', dob: '' });
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // New states for activity tracking
  const [activityModal, setActivityModal] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [detailModal, setDetailModal] = useState(null);
  const [employeeDetailModal, setEmployeeDetailModal] = useState(null);
  const [activityDateFilter, setActivityDateFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Revenue target states
  const [targetMap, setTargetMap] = useState({});
  const [targetModal, setTargetModal] = useState(null); // employee object
  const [targetAmount, setTargetAmount] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  // Live online status
  const [onlineMap, setOnlineMap] = useState({});
  const [onlineFilter, setOnlineFilter] = useState(''); // '' | 'online' | 'offline'
  const pollRef = useRef(null);
  const initialLoadDone = useRef(false);

  // DigiLocker verification states
  const [digilockerMap, setDigilockerMap] = useState({});
  const [digilockerModal, setDigilockerModal] = useState(null);
  const [digilockerDetail, setDigilockerDetail] = useState(null);
  const [loadingDigilocker, setLoadingDigilocker] = useState(false);
  const [visibleFields, setVisibleFields] = useState({});

  const toggleFieldVisibility = (label) => {
    setVisibleFields(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const load = () => {
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
    fetch('/api/admin-departments').then(r => r.json()).then(d => {
      setSavedDepartments(d.departments || []);
      if (!initialLoadDone.current) {
        // First load: expand all departments by default
        const initialExpanded = {};
        (d.departments || []).forEach(dept => {
          initialExpanded[dept.name] = true;
        });
        setExpandedDepts(initialExpanded);
        initialLoadDone.current = true;
      } else {
        // Subsequent polls: only add newly-created departments as expanded,
        // without resetting the user's manual toggle state
        setExpandedDepts(prev => {
          const updated = { ...prev };
          (d.departments || []).forEach(dept => {
            if (!(dept.name in updated)) {
              updated[dept.name] = true;
            }
          });
          return updated;
        });
      }
    });
    fetch('/api/admin-employees/targets').then(r => r.json()).then(d => setTargetMap(d.targets || {})).catch(() => {});
    fetch('/api/admin-digilocker').then(r => r.json()).then(d => setDigilockerMap(d.verifications || {})).catch(() => {});
  };

  useEffect(() => {
    load();
    const poll = setInterval(load, 45000);
    return () => clearInterval(poll);
  }, []);

  // Poll online status every 45 seconds
  const fetchOnlineStatus = async () => {
    try {
      const res = await fetch('/api/admin-employees/online-status');
      const data = await res.json();
      if (data.online) setOnlineMap(data.online);
    } catch {}
  };

  useEffect(() => {
    fetchOnlineStatus();
    pollRef.current = setInterval(fetchOnlineStatus, 45000);
    return () => clearInterval(pollRef.current);
  }, []);

  const showMsg = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password.length < 4) return showMsg('Password too short', true);
    const res = await fetch('/api/admin-employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) return showMsg(data.error, true);
    setShowCreate(false); setForm({ name: '', email: '', password: '', department: 'Sales', role: 'Employee', designation: '', phone: '', dob: '' });
    showMsg('Employee created'); load();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin-employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    if (!res.ok) return showMsg('Update failed', true);
    setEditModal(null); showMsg('Employee updated'); load();
  };

  const toggleStatus = async (id, currentStatus) => {
    await fetch('/api/admin-employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_status' }) });
    showMsg(`Status changed`); load();
  };

  const toggleLeaderboard = async (id, hide) => {
    await fetch('/api/admin-employees', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'toggle_leaderboard', hideFromLeaderboard: hide }) });
    showMsg(hide ? 'Hidden from leaderboard' : 'Visible on leaderboard'); load();
  };

  const toggleDeactivation = async (id, currentDeactivated, name) => {
    const actionText = currentDeactivated ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionText} ${name}?`)) {
      return;
    }
    const res = await fetch('/api/admin-employees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'toggle_deactivation' })
    });
    if (res.ok) {
      showMsg(`${name} has been ${currentDeactivated ? 'activated' : 'deactivated'}`);
      load();
    } else {
      showMsg('Failed to update employee status', true);
    }
  };

  const confirmDelete = (id, name) => {
    setDeleteConfirm({ id, name });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    await fetch(`/api/admin-employees?id=${deleteConfirm.id}`, { method: 'DELETE' });
    showMsg(`${deleteConfirm.name} removed`); 
    setDeleteConfirm(null);
    load();
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    await fetch('/api/admin-departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newDeptName }) });
    setNewDeptName(''); showMsg('Department added'); load();
  };
  
  const handleDelDept = async (id) => {
    await fetch(`/api/admin-departments?id=${id}`, { method: 'DELETE' });
    showMsg('Department deleted'); load();
  };

  const viewActivity = async (emp) => {
    setActivityModal(emp);
    setActivityData(null);
    setLoadingActivity(true);
    const res = await fetch(`/api/admin-employees/activity?employeeId=${emp.id}`);
    const data = await res.json();
    setActivityData(data);
    setLoadingActivity(false);
  };

  const viewDigilocker = async (emp) => {
    setVisibleFields({});
    setDigilockerModal(emp);
    setDigilockerDetail(null);
    setLoadingDigilocker(true);
    try {
      const res = await fetch(`/api/admin-digilocker?employeeId=${emp.id}`);
      const data = await res.json();
      setDigilockerDetail(data);
    } catch {
      setDigilockerDetail({ verified: false });
    }
    setLoadingDigilocker(false);
  };

  const unlinkDigilocker = async (employeeId, name) => {
    if (!confirm(`Are you sure you want to unlink DigiLocker verification for ${name}? This will require them to re-verify.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin-digilocker?employeeId=${employeeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`DigiLocker unlinked for ${name}`);
        // Refresh digilocker verification map
        fetch('/api/admin-digilocker')
          .then(r => r.json())
          .then(d => setDigilockerMap(d.verifications || {}))
          .catch(() => {});
      } else {
        showMsg(data.error || 'Failed to unlink DigiLocker', true);
      }
    } catch (err) {
      showMsg('An error occurred while unlinking DigiLocker', true);
    }
  };

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const onlineCount = useMemo(() => {
    return employees.filter(e => onlineMap[e.id]).length;
  }, [employees, onlineMap]);

  // Grouping
  const filteredGroups = useMemo(() => {
    const s = search.toLowerCase();
    const result = employees.filter(e => {
      const matchesSearch = ((e.name || '').toLowerCase().includes(s) || (e.email || '').toLowerCase().includes(s));
      const matchesDept = deptFilter ? e.department === deptFilter : true;
      const matchesOnline = onlineFilter === 'online' ? !!onlineMap[e.id] : onlineFilter === 'offline' ? !onlineMap[e.id] : true;
      return matchesSearch && matchesDept && matchesOnline;
    });
    
    const groups = {};
    result.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return groups;
  }, [employees, search, deptFilter, onlineFilter, onlineMap]);

  const departments = savedDepartments.map(d => d.name);
  const activeCount = employees.filter(e => e.status !== 'away').length;

  const filteredTimeline = useMemo(() => {
    if (!activityData || !activityData.timeline) return [];
    if (!activityDateFilter) return activityData.timeline;
    return activityData.timeline.filter(act => {
      if (!act.timestamp) return false;
      const d = new Date(act.timestamp);
      return d.toISOString().split('T')[0] === activityDateFilter;
    });
  }, [activityData, activityDateFilter]);

  const displayHours = useMemo(() => {
    if (!activityData) return '0h';
    let hours = 0;
    if (!activityDateFilter && activityData.attendance) {
      hours = activityData.attendance.reduce((sum, a) => sum + (a.totalHours ? Number(a.totalHours) : (a.status === 'Present' ? 6 : 0)), 0);
    } else if (activityData.attendance) {
      const dayRecords = activityData.attendance.filter(a => a.date === activityDateFilter);
      hours = dayRecords.reduce((sum, a) => sum + (a.totalHours ? Number(a.totalHours) : (a.status === 'Present' ? 6 : 0)), 0);
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, [activityData, activityDateFilter]);

  const displayActivitiesCount = useMemo(() => {
    if (!activityData) return 0;
    if (!activityDateFilter) return activityData.stats.totalActivities || 0;
    return filteredTimeline.length;
  }, [activityData, activityDateFilter, filteredTimeline]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Employee Management</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-muted)' }}>
            <span>{employees.length} total • {activeCount} active</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px rgba(34,197,94,0.5)', animation: 'pulse-dot 2s infinite' }} />
              <span style={{ fontWeight: 600, color: '#22c55e' }}>{onlineCount} online now</span>
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={18} /> Add Employee
        </button>
      </div>

      <AnimatePresence>
        {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: 14, borderRadius: 8, marginBottom: 16 }}>{error}</motion.div>}
        {success && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: 14, borderRadius: 8, marginBottom: 16 }}>{success}</motion.div>}
      </AnimatePresence>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 16px', minWidth: 200 }}>
          <Search size={18} color="var(--text-muted)" />
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent' }} />
        </div>
        <select className="card" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ width: 200, padding: '12px 16px', border: 'none' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="card" value={onlineFilter} onChange={e => setOnlineFilter(e.target.value)} style={{ width: 180, padding: '12px 16px', border: 'none' }}>
          <option value="">All Status</option>
          <option value="online">🟢 Online Only</option>
          <option value="offline">⚫ Offline Only</option>
        </select>
        <button className="btn btn-outline card" onClick={() => setShowDeptModal(true)}>Manage Depts</button>
      </div>

      {/* Grouped Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {Object.keys(filteredGroups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found.</div>
        ) : (
          Object.entries(filteredGroups).map(([dept, emps]) => (
            <div key={dept} className="card" style={{ overflow: 'hidden' }}>
              <div 
                style={{ padding: '16px 20px', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}
                onClick={() => toggleDept(dept)}
              >
                <span style={{ fontSize: '1.1rem' }}>{dept} Department <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem', marginLeft: 12 }}>{emps.length}</span></span>
                {expandedDepts[dept] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              
              <AnimatePresence initial={false}>
                {expandedDepts[dept] && (
                  <motion.div key={`dept-content-${dept}`} initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                    <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody className="responsive-tbody">
                        {emps.map(e => {
                          const isOnline = !!onlineMap[e.id];
                          const onlineInfo = onlineMap[e.id];
                          return (
                          <tr 
                            key={e.id} 
                            className="responsive-row"
                            style={{ 
                              borderBottom: '1px solid var(--surface-border)', 
                              opacity: e.deactivated ? 0.45 : (e.status === 'away' ? 0.6 : 1),
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onClick={() => setEmployeeDetailModal(e)}
                            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          >
                            <td className="responsive-cell" style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {/* Online indicator dot */}
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                  <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: isOnline ? '#22c55e' : '#6b7280',
                                    boxShadow: isOnline ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                                    transition: 'all 0.3s ease',
                                  }} />
                                  {isOnline && (
                                    <div style={{
                                      position: 'absolute', inset: -3,
                                      borderRadius: '50%',
                                      border: '2px solid rgba(34,197,94,0.4)',
                                      animation: 'online-ring 2s ease-in-out infinite',
                                    }} />
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{e.name}</div>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {e.id ? <span style={{fontWeight: 600}}>{e.id}</span> : ''} {e.id ? '•' : ''} {e.email}
                                  </div>
                                  {digilockerMap[e.id] && digilockerMap[e.id].verified ? (
                                    <div 
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.15)', cursor: 'pointer' }}
                                      onClick={(ev) => { ev.stopPropagation(); viewDigilocker(e); }}
                                      title="Click to view DigiLocker details"
                                    >
                                      <ShieldCheck size={11} /> DigiLocker Verified
                                    </div>
                                  ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(107,114,128,0.05)', color: '#9ca3af', border: '1px solid rgba(107,114,128,0.1)' }}>
                                      <ShieldX size={11} /> Not Verified
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="responsive-cell" style={{ padding: '16px 20px', color: 'var(--text-muted)', verticalAlign: 'middle' }}>{e.designation || e.role}</td>
                            <td className="responsive-cell" style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {e.deactivated ? (
                                  <span className="badge badge-danger" style={{ background: '#ef4444', color: '#fff', width: 'fit-content' }}>Deactivated</span>
                                ) : (
                                  <span className={`badge ${e.status === 'away' ? 'badge-warning' : 'badge-success'}`}>{e.status === 'away' ? 'Away' : 'Active'}</span>
                                )}
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                                  background: isOnline ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.1)',
                                  color: isOnline ? '#22c55e' : '#6b7280',
                                  border: `1px solid ${isOnline ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.15)'}`,
                                  letterSpacing: '0.02em',
                                  width: 'fit-content',
                                }}>
                                  {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                                {isOnline && onlineInfo && (
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    since {new Date(onlineInfo.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Activity Modal */}
      {activityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setActivityModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ width: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: 24, background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{activityModal.name}'s Activity</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{activityModal.department} • {activityModal.designation || activityModal.role}</p>
              </div>
              <button onClick={() => setActivityModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="var(--text-muted)" /></button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {loadingActivity ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading activity data...</div>
              ) : activityData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {[
                      { label: 'Logged Hours', val: displayHours, gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
                      { label: 'Total Activities', val: displayActivitiesCount, gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
                      { label: 'Tasks Given', val: activityData.stats.totalTasks || 0, gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' },
                      { label: 'Tasks Completed', val: activityData.stats.completedTasks || 0, gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
                      { label: 'Active Leads', val: activityData.stats.activeLeads, gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
                      { label: 'Follow-ups', val: activityData.stats.totalFollowups, gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
                      { label: 'Closed Deals', val: activityData.stats.closedDeals, gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }
                    ].map(st => (
                      <motion.div whileHover={{ y: -4, scale: 1.02 }} key={st.label} style={{ background: st.gradient, padding: '20px 16px', borderRadius: 16, color: '#fff', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{st.val}</div>
                        <div style={{ fontSize: '0.85rem', marginTop: 12, fontWeight: 600, opacity: 0.9, letterSpacing: '0.5px' }}>{st.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Activity Timeline</h4>
                    <input type="date" value={activityDateFilter} onChange={e => setActivityDateFilter(e.target.value)} className="card" style={{ padding: '6px 12px', border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  {filteredTimeline.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No activity found for this date.</p>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: 20, borderLeft: '2px solid var(--surface-border)' }}>
                      {filteredTimeline.map((act, i) => (
                        <div key={i} style={{ position: 'relative', paddingBottom: 24, paddingLeft: 20 }}>
                          <div style={{ position: 'absolute', left: -27, top: 4, width: 12, height: 12, borderRadius: '50%', background: act.source === 'followup' ? '#f59e0b' : act.source === 'email' ? '#06b6d4' : act.source === 'task' ? '#64748b' : act.source === 'lead_creation' ? '#10b981' : 'var(--primary)', border: '2px solid var(--bg)' }} />
                          <div className="card" 
                            style={{ padding: 16, background: 'var(--surface)', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                            onClick={() => setDetailModal(act)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontWeight: 700 }}>{act.type} <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>• {act.context}</span></div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(act.timestamp).toLocaleString()}</div>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>{act.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>Failed to load data.</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Activity Detail Modal */}
      {detailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }} onClick={() => setDetailModal(null)}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ width: 600, maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg)', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--surface-border)', paddingBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Activity Details</h3>
              <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Type</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{detailModal.type}</div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Context</span>
              <div style={{ fontSize: '1rem' }}>{detailModal.context}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Timestamp</span>
              <div style={{ fontSize: '1rem' }}>{new Date(detailModal.timestamp).toLocaleString()}</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Description</span>
              <div style={{ fontSize: '1rem', background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, marginTop: 4 }}>{detailModal.description}</div>
            </div>

            {detailModal.fullData && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, display: 'block' }}>Report Details</span>
                {detailModal.source === 'lead_creation' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Company Name</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.companyName}</div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Contact Person</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.contactPerson || '-'}</div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</span><div><span className="badge badge-info">{detailModal.fullData.status}</span></div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Industry</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.industry || '-'}</div></div>
                    {detailModal.fullData.dealValue && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Est. Deal Value</span><div style={{ fontWeight: 600 }}>${detailModal.fullData.dealValue}</div></div>}
                    {detailModal.fullData.services && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Services</span><div style={{ fontWeight: 600 }}>{Array.isArray(detailModal.fullData.services) ? detailModal.fullData.services.join(', ') : detailModal.fullData.services}</div></div>}
                  </div>
                )}
                {detailModal.source === 'submission' && (
                  <div>
                    <div style={{ marginBottom: 12 }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Report Title</span><div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{detailModal.fullData.title || detailModal.fullData.formType}</div></div>
                    {detailModal.fullData.data && Object.entries(detailModal.fullData.data).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{k}</span>
                        <div style={{ fontWeight: 500 }}>{typeof v === 'object' ? JSON.stringify(v) : v}</div>
                      </div>
                    ))}
                    {detailModal.fullData.adminComments && (
                      <div style={{ marginTop: 12, padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 6 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Admin Feedback:</span>
                        <div style={{ marginTop: 4 }}>{detailModal.fullData.adminComments}</div>
                      </div>
                    )}
                  </div>
                )}
                {detailModal.source === 'followup' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Client Name</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.clientName}</div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Mode of Contact</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.mode}</div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Client Response</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.clientResponse}</div></div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Next Action</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.nextAction || '-'}</div></div>
                    <div style={{ gridColumn: 'span 2' }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Discussion Summary</span><div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, marginTop: 4 }}>{detailModal.fullData.discussionSummary}</div></div>
                  </div>
                )}
                {detailModal.source === 'email' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Recipient</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.toName || detailModal.fullData.to}</div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Subject</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.subject}</div></div>
                    </div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Email Body</span><div style={{ whiteSpace: 'pre-wrap', padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 4, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detailModal.fullData.body}</div></div>
                  </div>
                )}
                {detailModal.source === 'lead' && (
                  <div>
                    <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Activity Note</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.description}</div></div>
                  </div>
                )}
                {detailModal.source === 'task' && (
                  <div>
                    <div style={{ marginBottom: 12 }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Task Title</span><div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{detailModal.fullData.title}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status</span><div><span className="badge badge-info">{detailModal.fullData.status}</span></div></div>
                      <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Due Date</span><div style={{ fontWeight: 600 }}>{detailModal.fullData.dueDate ? new Date(detailModal.fullData.dueDate).toLocaleDateString() : 'N/A'}</div></div>
                    </div>
                    <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Description</span><div style={{ whiteSpace: 'pre-wrap', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 4 }}>{detailModal.fullData.description}</div></div>
                    
                    {detailModal.fullData.completionProof && (
                      <div style={{ marginTop: 12 }}><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Completion Proof / Notes</span><div style={{ whiteSpace: 'pre-wrap', padding: 12, background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 8, marginTop: 4 }}>{detailModal.fullData.completionProof}</div></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ═══════ CREATE EMPLOYEE MODAL ═══════ */}
      <AnimatePresence>
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowCreate(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg)', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Add New Employee</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
              </div>
              <form onSubmit={handleCreate} style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Full Name *</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="John Doe" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="john@company.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Min 4 characters" style={{ width: '100%', padding: '10px 14px', paddingRight: 40, borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Department *</label>
                    <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Role</label>
                    <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="Employee">Employee</option>
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Sales Manager">Sales Manager</option>
                      <option value="Senior Sales Executive">Senior Sales Executive</option>
                      <option value="Marketing Executive">Marketing Executive</option>
                      <option value="Team Lead">Team Lead</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Designation</label>
                    <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Junior Developer" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Phone</label>
                    <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98765 43210" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Check size={16} /> Create Employee</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ EDIT EMPLOYEE MODAL ═══════ */}
      <AnimatePresence>
        {editModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg)', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Edit — {editModal.name}</h3>
                <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
              </div>
              <form onSubmit={handleEdit} style={{ padding: 24 }}>
                {editForm.id && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Employee ID:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', letterSpacing: '0.04em' }}>{editForm.id}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontStyle: 'italic' }}>Permanent</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Full Name</label>
                    <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Email</label>
                    <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Department</label>
                    <select value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Role</label>
                    <select value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="Employee">Employee</option>
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Sales Manager">Sales Manager</option>
                      <option value="Senior Sales Executive">Senior Sales Executive</option>
                      <option value="Marketing Executive">Marketing Executive</option>
                      <option value="Team Lead">Team Lead</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Designation</label>
                    <input value={editForm.designation || ''} onChange={e => setEditForm({...editForm, designation: e.target.value})} placeholder="e.g. Sales Manager" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Phone</label>
                    <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="+91 98765 43210" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Date of Birth</label>
                  <input type="date" value={editForm.dob || ''} onChange={e => setEditForm({...editForm, dob: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Status</label>
                  <select value={editForm.status || 'active'} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="active">Active</option>
                    <option value="away">Away</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Account Deactivation</label>
                  <select value={editForm.deactivated ? 'deactivated' : 'active'} onChange={e => setEditForm({...editForm, deactivated: e.target.value === 'deactivated'})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="active">Active / Enabled</option>
                    <option value="deactivated">Deactivated / Disabled</option>
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>New Password (leave blank to keep current)</label>
                  <input type="password" value={editForm.newPassword || ''} onChange={e => setEditForm({...editForm, newPassword: e.target.value})} placeholder="Enter new password..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"><Check size={16} /> Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MANAGE DEPARTMENTS MODAL ═══════ */}
      <AnimatePresence>
        {showDeptModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowDeptModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ width: 440, maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg)', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Manage Departments</h3>
                <button onClick={() => setShowDeptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
              </div>
              <div style={{ padding: 24 }}>
                <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="New department name..." required style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)' }} />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Add</button>
                </form>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedDepartments.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--surface-border)' }}>
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                      <button onClick={() => handleDelDept(d.id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>Delete</button>
                    </div>
                  ))}
                  {savedDepartments.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No departments yet</p>}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ width: 400, background: 'var(--bg)', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0, color: 'var(--danger)' }}>Confirm Deletion</h3>
                <button onClick={() => setDeleteConfirm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
              </div>
              <div style={{ padding: 24 }}>
                <p style={{ margin: '0 0 24px 0', fontSize: '1rem', color: 'var(--text)' }}>Are you sure you want to completely remove <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={executeDelete}>Yes, Remove Employee</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ SET REVENUE TARGET MODAL ═══════ */}
      <AnimatePresence>
        {targetModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={() => setTargetModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ width: 460, background: 'var(--bg)', padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={20} color="#10b981" /> Set Revenue Target
                </h3>
                <button onClick={() => setTargetModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
              </div>
              <div style={{ padding: 24 }}>
                {/* Employee info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, var(--primary-light, #c29b76), var(--primary, #a67c52))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                    {targetModal.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{targetModal.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{targetModal.id} · {targetModal.department}</div>
                  </div>
                </div>

                {/* Current target display */}
                {targetMap[targetModal.id] && (
                  <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Target</span>
                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', margin: '4px 0 0' }}>₹{Number(targetMap[targetModal.id].monthlyTarget).toLocaleString('en-IN')}</p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Set on {new Date(targetMap[targetModal.id].updatedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Target input */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    Monthly Revenue Target (₹)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-muted)' }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={targetAmount}
                      onChange={e => setTargetAmount(e.target.value)}
                      placeholder="e.g. 500000"
                      style={{
                        width: '100%', padding: '14px 14px 14px 36px', borderRadius: 10,
                        border: '2px solid var(--surface-border)', background: 'var(--surface)',
                        color: 'var(--text)', fontSize: '1.1rem', fontWeight: 700,
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = '#10b981'}
                      onBlur={e => e.target.style.borderColor = 'var(--surface-border)'}
                      autoFocus
                    />
                  </div>
                  {targetAmount && !isNaN(parseFloat(targetAmount)) && parseFloat(targetAmount) > 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      = ₹{Number(parseFloat(targetAmount)).toLocaleString('en-IN')} per month
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setTargetModal(null)} style={{
                    padding: '10px 22px', borderRadius: 10, border: '1px solid var(--surface-border)',
                    background: 'var(--bg-secondary)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
                  }}>Cancel</button>
                  <button disabled={savingTarget || !targetAmount} onClick={async () => {
                    setSavingTarget(true);
                    try {
                      const res = await fetch('/api/admin-employees/targets', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ employeeId: targetModal.id, monthlyTarget: parseFloat(targetAmount) }),
                      });
                      if (res.ok) {
                        showMsg(`Revenue target set for ${targetModal.name}`);
                        setTargetModal(null);
                        load();
                      } else {
                        const data = await res.json();
                        showMsg(data.error || 'Failed to save target', true);
                      }
                    } catch { showMsg('Network error', true); }
                    setSavingTarget(false);
                  }} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none',
                    background: '#10b981', color: '#fff', cursor: 'pointer',
                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
                    opacity: (savingTarget || !targetAmount) ? 0.6 : 1,
                  }}>
                    <Target size={16} /> {savingTarget ? 'Saving...' : 'Save Target'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ DIGILOCKER VERIFICATION DETAIL MODAL ═══════ */}
      {digilockerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setDigilockerModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ width: 800, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Header with gradient */}
            <div style={{
              padding: '20px 24px',
              background: digilockerDetail?.verified
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'linear-gradient(135deg, #6b7280, #9ca3af)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="64" height="64" rx="12" fill="rgba(255,255,255,0.2)"/>
                  <path d="M20 18h8c6.627 0 12 5.373 12 12v0c0 6.627-5.373 12-12 12h-8V18z" stroke="#fff" strokeWidth="3" fill="none"/>
                  <rect x="34" y="22" width="10" height="20" rx="3" stroke="#fff" strokeWidth="2.5" fill="none"/>
                  <circle cx="39" cy="34" r="2" fill="#fff"/>
                  <line x1="39" y1="34" x2="39" y2="38" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
                    DigiLocker Verification
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', margin: '2px 0 0', fontWeight: 500 }}>
                    {digilockerModal.name} · {digilockerModal.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setDigilockerModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#fff" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {loadingDigilocker ? (
                <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>Loading DigiLocker data...</div>
              ) : digilockerDetail?.verified ? (
                <>
                  {/* Status Banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
                    background: 'rgba(5,150,105,0.06)', border: '1.5px solid rgba(5,150,105,0.2)',
                    borderRadius: 14, marginBottom: 24,
                  }}>
                    <ShieldCheck size={22} color="#059669" />
                    <div>
                      <p style={{ fontWeight: 700, color: '#059669', fontSize: '0.92rem', margin: 0 }}>Identity Verified via DigiLocker</p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Verified on {new Date(digilockerDetail.verifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Identity Details Grid */}
                  <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Identity Details</h4>
                  
                  {digilockerDetail.photo && (
                    <div style={{ marginBottom: 20 }}>
                      <img src={`data:image/jpeg;base64,${digilockerDetail.photo}`} alt="Profile" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid var(--surface-border)' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                    {[
                      { label: 'DigiLocker Username', value: digilockerDetail.username, highlight: true, span2: true, maskable: true },
                      { label: 'Full Name', value: digilockerDetail.name },
                      { label: 'Age', value: digilockerDetail.age },
                      { label: 'Date of Birth', value: formatDob(digilockerDetail.dob), maskable: true },
                      { label: 'Gender', value: digilockerDetail.gender === 'M' ? 'Male' : digilockerDetail.gender === 'F' ? 'Female' : digilockerDetail.gender },
                      { label: 'Aadhaar', value: digilockerDetail.aadhaar, mono: true },
                      { label: 'PAN', value: digilockerDetail.pan, mono: true, highlight: true, maskable: true },
                      { label: 'Driving Licence', value: digilockerDetail.dl_no, mono: true, highlight: true, maskable: true },
                      { label: 'Mobile', value: digilockerDetail.mobile, maskable: true },
                      { label: 'Email', value: digilockerDetail.email, span2: true, maskable: true },
                      { label: 'DigiLocker ID', value: digilockerDetail.digilockerid, mono: true, highlight: true, span2: true, maskable: true },
                      { label: 'Reference Key', value: digilockerDetail.reference_key, mono: true, highlight: true, span2: true, maskable: true },
                    ].filter(f => f.value).map(field => (
                      <div key={field.label} style={{ 
                        padding: '12px 14px', 
                        background: field.highlight ? 'rgba(59,130,246,0.05)' : 'var(--bg-secondary)', 
                        borderRadius: 10, 
                        border: field.highlight ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--surface-border)',
                        gridColumn: field.span2 ? 'span 2' : 'span 1',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ 
                            fontSize: '0.72rem', fontWeight: 700, 
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: field.highlight ? '#3b82f6' : 'transparent',
                            color: field.highlight ? 'white' : 'var(--text-muted)',
                            padding: field.highlight ? '2px 6px' : '0',
                            borderRadius: field.highlight ? '4px' : '0',
                          }}>{field.label}</span>
                          {field.maskable && (
                            <button 
                              onClick={(ev) => {
                                ev.stopPropagation();
                                toggleFieldVisibility(field.label);
                              }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                                padding: '2px', borderRadius: '4px',
                                transition: 'color 0.2s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                              title={visibleFields[field.label] ? "Hide field value" : "Show field value"}
                            >
                              {visibleFields[field.label] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '0.92rem', 
                          fontWeight: 600, 
                          color: 'var(--text)', 
                          fontFamily: field.mono ? 'monospace' : 'inherit', 
                          wordBreak: 'break-word',
                          marginTop: (field.highlight && !field.maskable) ? 4 : 0
                        }}>
                          {field.maskable && !visibleFields[field.label] ? getMaskedValue(field.value) : field.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Documents Section */}
                  {(() => {
                    const docsList = Array.isArray(digilockerDetail.documents)
                      ? digilockerDetail.documents
                      : (digilockerDetail.documents?.items || []);
                    if (docsList.length === 0) return null;
                    return (
                      <>
                        <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Issued Documents ({docsList.length})</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                          {docsList.map((doc, i) => (
                            <div key={i} style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{doc.name}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 10 }}>{doc.issuer}</span>
                                {doc.date && <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 10 }}>({doc.date})</span>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {doc.fileData ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      try {
                                        const mime = doc.fileMimeType || 'application/pdf';
                                        const byteChars = atob(doc.fileData);
                                        const byteArray = new Uint8Array(byteChars.length);
                                        for (let i = 0; i < byteChars.length; i++) {
                                          byteArray[i] = byteChars.charCodeAt(i);
                                        }
                                        const blob = new Blob([byteArray], { type: mime });
                                        const url = URL.createObjectURL(blob);
                                        const ext = mime.includes('pdf') ? 'pdf' : mime.includes('xml') ? 'xml' : 'bin';
                                        const fileName = `${(doc.name || doc.doctype || 'document').replace(/[^a-zA-Z0-9 ]/g, '_')}.${ext}`;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                      } catch (err) {
                                        console.error('Download error:', err);
                                      }
                                    }}
                                    title="Download document"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid #10b981',
                                      background: 'rgba(16, 185, 129, 0.1)',
                                      color: '#10b981',
                                      cursor: 'pointer',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      transition: 'all 0.15s',
                                    }}
                                  >
                                    <Download size={12} />
                                    Download
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No file</span>
                                )}
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 8 }}>{doc.doctype}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                  {/* ICJS Profile */}
                  {digilockerDetail.icjs && (
                    <>
                      <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>ICJS Profile</h4>
                      <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)', marginBottom: 28 }}>
                        <pre style={{ fontSize: '0.75rem', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', margin: 0, maxHeight: 200, overflowY: 'auto' }}>
                          {typeof digilockerDetail.icjs === 'string' ? digilockerDetail.icjs : JSON.stringify(digilockerDetail.icjs, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}

                  {/* APAAR Details */}
                  {digilockerDetail.apaar && (
                    <>
                      <h4 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>APAAR Academic Record</h4>
                      <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)', marginBottom: 20 }}>
                        <pre style={{ fontSize: '0.75rem', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', margin: 0, maxHeight: 200, overflowY: 'auto' }}>
                          {typeof digilockerDetail.apaar === 'string' ? digilockerDetail.apaar : JSON.stringify(digilockerDetail.apaar, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <ShieldX size={48} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 8 }}>Not Verified</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {digilockerModal.name} has not completed DigiLocker verification yet.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════ EMPLOYEE PROFILE DETAIL MODAL ═══════ */}
      {employeeDetailModal && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 95, padding: 16 }} 
          onClick={() => setEmployeeDetailModal(null)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="card" 
            style={{ width: 650, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', padding: 0 }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>Employee Profile</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>All details and administrative actions</p>
              </div>
              <button onClick={() => setEmployeeDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--surface-border)' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--primary-light, #c29b76), var(--primary, #a67c52))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                  {employeeDetailModal.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>{employeeDetailModal.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>{employeeDetailModal.id || 'N/A'} · {employeeDetailModal.designation || employeeDetailModal.role}</div>
                </div>
              </div>

              {/* Personal & Work details grid */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Personal & Work Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Email Address</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', wordBreak: 'break-all' }}>{employeeDetailModal.email}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Phone Number</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{employeeDetailModal.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Date of Birth</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDob(employeeDetailModal.dob) || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Department</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{employeeDetailModal.department || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Designation / System Role</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{employeeDetailModal.designation || employeeDetailModal.role}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Joining Date</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {employeeDetailModal.joinedAt || employeeDetailModal.createdAt 
                        ? new Date(employeeDetailModal.joinedAt || employeeDetailModal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Targets Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Status Column */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Account Status</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)', height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>System Status:</span>
                      {employeeDetailModal.deactivated ? (
                        <span className="badge badge-danger" style={{ background: '#ef4444', color: '#fff' }}>Deactivated</span>
                      ) : (
                        <span className={`badge ${employeeDetailModal.status === 'away' ? 'badge-warning' : 'badge-success'}`}>{employeeDetailModal.status === 'away' ? 'Away' : 'Active'}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Online Indicator:</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                        background: !!onlineMap[employeeDetailModal.id] ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.1)',
                        color: !!onlineMap[employeeDetailModal.id] ? '#22c55e' : '#6b7280',
                        border: `1px solid ${!!onlineMap[employeeDetailModal.id] ? 'rgba(34,197,94,0.25)' : 'rgba(107,114,128,0.15)'}`,
                        letterSpacing: '0.02em',
                      }}>
                        {!!onlineMap[employeeDetailModal.id] ? <Wifi size={11} /> : <WifiOff size={11} />}
                        {!!onlineMap[employeeDetailModal.id] ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {!!onlineMap[employeeDetailModal.id] && onlineMap[employeeDetailModal.id] && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right', marginTop: 2 }}>
                        Active since {new Date(onlineMap[employeeDetailModal.id].loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Targets & Verification Column */}
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Targets & Verification</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)', height: '100%' }}>
                    {/* Revenue Target */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Monthly Target</span>
                        <span style={{ fontWeight: 700, color: targetMap[employeeDetailModal.id] ? '#10b981' : 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Target size={12} />
                          {targetMap[employeeDetailModal.id] ? `₹${Number(targetMap[employeeDetailModal.id].monthlyTarget).toLocaleString('en-IN')}` : 'No target set'}
                        </span>
                      </div>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                        onClick={() => { setTargetModal(employeeDetailModal); setTargetAmount(targetMap[employeeDetailModal.id]?.monthlyTarget || ''); setEmployeeDetailModal(null); }}
                      >
                        Set
                      </button>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: '4px 0' }} />

                    {/* DigiLocker */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>DigiLocker Status</span>
                        {digilockerMap[employeeDetailModal.id] && digilockerMap[employeeDetailModal.id].verified ? (
                          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={12} /> Verified
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ShieldX size={12} /> Not Verified
                          </span>
                        )}
                      </div>
                      {digilockerMap[employeeDetailModal.id] && digilockerMap[employeeDetailModal.id].verified && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                            onClick={() => { viewDigilocker(employeeDetailModal); setEmployeeDetailModal(null); }}
                          >
                            View
                          </button>
                          {user?.role === 'Super Admin' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 6px', color: '#dc2626', borderColor: 'rgba(220,38,38,0.2)' }} 
                              onClick={() => { unlinkDigilocker(employeeDetailModal.id, employeeDetailModal.name); setEmployeeDetailModal(null); }}
                              title="Unlink DigiLocker"
                            >
                              <Link2Off size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Actions */}
              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Administrative Actions</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: '1 1 180px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                    onClick={() => { viewActivity(employeeDetailModal); setEmployeeDetailModal(null); }}
                  >
                    <Activity size={16} /> View Activity Logs
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: '1 1 180px', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                    onClick={() => { setEditModal(employeeDetailModal); setEditForm({...employeeDetailModal, newPassword: ''}); setEmployeeDetailModal(null); }}
                  >
                    <Edit size={16} /> Edit Employee Profile
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: '1 1 180px', padding: '10px 16px', color: employeeDetailModal.hideFromLeaderboard ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                    onClick={() => {
                      toggleLeaderboard(employeeDetailModal.id, !employeeDetailModal.hideFromLeaderboard);
                      setEmployeeDetailModal(prev => ({ ...prev, hideFromLeaderboard: !prev.hideFromLeaderboard }));
                    }}
                  >
                    {employeeDetailModal.hideFromLeaderboard ? <EyeOff size={16} /> : <Eye size={16} />}
                    {employeeDetailModal.hideFromLeaderboard ? 'Show on Leaderboard' : 'Hide from Leaderboard'}
                  </button>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: '1 1 180px', padding: '10px 16px', color: employeeDetailModal.deactivated ? '#10b981' : '#ef4444', borderColor: employeeDetailModal.deactivated ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                    onClick={() => { toggleDeactivation(employeeDetailModal.id, employeeDetailModal.deactivated, employeeDetailModal.name); setEmployeeDetailModal(null); }}
                  >
                    {employeeDetailModal.deactivated ? <Unlock size={16} /> : <Lock size={16} />}
                    {employeeDetailModal.deactivated ? 'Activate Account' : 'Deactivate Account'}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ flex: '1 1 100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
                    onClick={() => { confirmDelete(employeeDetailModal.id, employeeDetailModal.name); setEmployeeDetailModal(null); }}
                  >
                    <UserX size={16} /> Remove Employee Permanent
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-secondary)' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setEmployeeDetailModal(null)}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Keyframe animations and responsive layouts */}
      <style>{`
        @keyframes online-ring {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .responsive-table {
            display: block !important;
            width: 100% !important;
          }
          .responsive-tbody {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 12px !important;
            padding: 12px 4px !important;
            box-sizing: border-box !important;
          }
          .responsive-row {
            display: flex !important;
            flex-direction: column !important;
            background: var(--surface) !important;
            border: 1px solid var(--surface-border) !important;
            border-radius: var(--radius-md, 14px) !important;
            padding: 16px !important;
            gap: 10px !important;
            align-items: stretch !important;
            justify-content: space-between !important;
            box-shadow: var(--shadow-sm) !important;
            opacity: 1 !important;
            transition: all 0.2s ease !important;
          }
          .responsive-row:hover {
            transform: translateY(-2px) !important;
            box-shadow: var(--shadow-md) !important;
            border-color: var(--primary-light) !important;
            background: var(--surface-hover) !important;
          }
          .responsive-cell {
            display: block !important;
            padding: 0 !important;
            border: none !important;
            width: 100% !important;
            text-align: left !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
