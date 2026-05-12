'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, RefreshCw, CheckCircle, XCircle, Clock, Users, User, Building2, Trash2, ChevronDown, ChevronRight, Info, Zap } from 'lucide-react';

const SEV_CONFIG = {
  info:     { label: 'Info',     color: '#3b82f6', bg: '#eff6ff', icon: Info },
  warning:  { label: 'Warning',  color: '#d97706', bg: '#fffbeb', icon: AlertTriangle },
  critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2', icon: Zap },
};

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tab, setTab] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', message: '', severity: 'info',
    targetType: 'all', targetDepartment: '', targetEmployeeId: '', targetEmployeeName: '',
    requireComment: false, commentPrompt: 'Please acknowledge this alert.', expiresAt: '',
  });

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const load = async () => {
    const [alertsRes, empsRes, deptsRes] = await Promise.all([
      fetch('/api/admin-alerts').then(r => r.json()),
      fetch('/api/admin-employees').then(r => r.json()),
      fetch('/api/admin-departments').then(r => r.json()).catch(() => ({ departments: [] })),
    ]);
    setAlerts(alertsRes.alerts || []);
    setEmployees(empsRes.employees || []);
    const deptNames = [...new Set((empsRes.employees || []).map(e => e.department).filter(Boolean))];
    setDepartments(deptNames);
  };

  useEffect(() => { load(); }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return flash('Title and message are required', 'error');
    if (form.targetType === 'department' && !form.targetDepartment) return flash('Select a department', 'error');
    if (form.targetType === 'employee' && !form.targetEmployeeId) return flash('Select an employee', 'error');
    setSubmitting(true);
    const res = await fetch('/api/admin-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) flash(data.error || 'Failed to create alert', 'error');
    else {
      flash('Alert issued successfully!');
      setShowForm(false);
      setForm({ title: '', message: '', severity: 'info', targetType: 'all', targetDepartment: '', targetEmployeeId: '', targetEmployeeName: '', requireComment: false, commentPrompt: 'Please acknowledge this alert.', expiresAt: '' });
      load();
    }
    setSubmitting(false);
  };

  const closeAlert = async (id) => {
    if (!confirm('Close this alert? Employees will no longer see it.')) return;
    await fetch('/api/admin-alerts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'closed' }) });
    flash('Alert closed'); load();
  };

  const deleteAlert = async (id) => {
    if (!confirm('Permanently delete this alert and all acknowledgements?')) return;
    await fetch(`/api/admin-alerts?id=${id}`, { method: 'DELETE' });
    flash('Alert deleted'); load();
  };

  const setEmployee = (empId) => {
    const emp = employees.find(e => e.id === empId);
    setForm(p => ({ ...p, targetEmployeeId: empId, targetEmployeeName: emp?.name || '' }));
  };

  const displayed = alerts.filter(a => tab === 'active' ? a.status === 'active' : a.status !== 'active');
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const historyCount = alerts.filter(a => a.status !== 'active').length;

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };
  const inp = { width: '100%', padding: '9px 13px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 9, color: 'var(--text)', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 5 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={24} /> Alerts
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Issue alerts to employees — full-page notices with optional acknowledgement comments.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
            <Plus size={15} /> Issue Alert
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: msg.type === 'error' ? '#ef4444' : '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Alerts', value: activeCount, color: '#ef4444' },
          { label: 'Total Acknowledgements', value: alerts.reduce((s, a) => s + (a.acknowledgements?.length || 0), 0), color: '#16a34a' },
          { label: 'Closed / Archived', value: historyCount, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', padding: 18 }}>
            <p style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div style={{ ...card, marginBottom: 24, border: '2px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} /> Issue New Alert</h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
          </div>

          <form onSubmit={createAlert}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Alert Title *</label>
                <input style={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. System Maintenance Notice" required />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Message *</label>
                <textarea style={{ ...inp, height: 90, resize: 'vertical' }} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Detailed alert message for employees..." required />
              </div>
              <div>
                <label style={lbl}>Severity</label>
                <select style={inp} value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                  <option value="info">ℹ️ Info</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="critical">🚨 Critical</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Expiry Date (optional)</label>
                <input type="datetime-local" style={inp} value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
              </div>
            </div>

            {/* Targeting */}
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, marginBottom: 14 }}>
              <label style={{ ...lbl, marginBottom: 10 }}>Target Audience</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[['all', '🌐 All Employees', Users], ['department', '🏢 Department', Building2], ['employee', '👤 Specific Employee', User]].map(([val, label, Icon]) => (
                  <button key={val} type="button" onClick={() => setForm(p => ({ ...p, targetType: val }))}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 9, border: `2px solid ${form.targetType === val ? 'var(--primary)' : 'var(--surface-border)'}`, background: form.targetType === val ? 'var(--primary)' : 'var(--surface)', color: form.targetType === val ? '#fff' : 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
                    {label}
                  </button>
                ))}
              </div>
              {form.targetType === 'department' && (
                <div>
                  <label style={lbl}>Select Department</label>
                  <select style={inp} value={form.targetDepartment} onChange={e => setForm(p => ({ ...p, targetDepartment: e.target.value }))}>
                    <option value="">— Choose department —</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {form.targetType === 'employee' && (
                <div>
                  <label style={lbl}>Select Employee</label>
                  <select style={inp} value={form.targetEmployeeId} onChange={e => setEmployee(e.target.value)}>
                    <option value="">— Choose employee —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Acknowledgement settings */}
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, marginBottom: 16 }}>
              <label style={{ ...lbl, marginBottom: 10 }}>Employee Acknowledgement</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
                <input type="checkbox" checked={form.requireComment} onChange={e => setForm(p => ({ ...p, requireComment: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>Require a written comment from employees</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(if unchecked, employees can acknowledge with one click)</span>
              </label>
              {form.requireComment && (
                <div>
                  <label style={lbl}>Comment Prompt (shown to employee)</label>
                  <input style={inp} value={form.commentPrompt} onChange={e => setForm(p => ({ ...p, commentPrompt: e.target.value }))} placeholder="e.g. Describe how this affects your work" />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: form.severity === 'critical' ? '#ef4444' : form.severity === 'warning' ? '#d97706' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} /> {submitting ? 'Issuing...' : 'Issue Alert Now'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--surface-border)', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[['active', `Active (${activeCount})`], ['history', `History (${historyCount})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: tab === key ? 'var(--surface)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: tab === key ? 700 : 500, cursor: 'pointer', fontSize: '0.875rem', boxShadow: tab === key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {displayed.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 60 }}>
            <AlertTriangle size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} color="var(--text-muted)" />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No {tab} alerts</p>
          </div>
        ) : displayed.map(alert => {
          const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
          const SevIcon = cfg.icon;
          const acks = alert.acknowledgements || [];
          const isExpanded = expanded[alert.id];
          return (
            <div key={alert.id} style={{ ...card, border: `1px solid ${alert.status === 'active' ? cfg.color + '40' : 'var(--surface-border)'}`, padding: 0, overflow: 'hidden' }}>
              {/* Alert header */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, background: alert.status === 'active' ? cfg.bg : 'var(--bg-secondary)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <SevIcon size={18} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>{alert.title}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: cfg.color, color: '#fff' }}>{cfg.label}</span>
                    {alert.status !== 'active' && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: 'var(--surface-border)', color: 'var(--text-muted)' }}>Closed</span>}
                    {alert.requireComment && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>Comment Required</span>}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>{alert.message}</p>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {alert.targetType === 'all' ? <><Users size={12}/> All Employees</> : alert.targetType === 'department' ? <><Building2 size={12}/> {alert.targetDepartment}</> : <><User size={12}/> {alert.targetEmployeeName}</>}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> {new Date(alert.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {alert.createdBy}</span>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>✓ {acks.length} Acknowledged</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setExpanded(p => ({ ...p, [alert.id]: !p[alert.id] }))}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600 }}>
                    {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Acknowledgements ({acks.length})
                  </button>
                  {alert.status === 'active' && (
                    <button onClick={() => closeAlert(alert.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Close</button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>

              {/* Acknowledgements panel */}
              {isExpanded && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--surface-border)' }}>
                  <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12, fontSize: '0.875rem' }}>
                    Acknowledgement History ({acks.length})
                  </h4>
                  {acks.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No acknowledgements yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {acks.map((ack, i) => (
                        <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--surface-border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                            {ack.employeeName?.charAt(0) || 'E'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem' }}>{ack.employeeName}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(ack.acknowledgedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {ack.comment && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4, fontStyle: 'italic' }}>"{ack.comment}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
