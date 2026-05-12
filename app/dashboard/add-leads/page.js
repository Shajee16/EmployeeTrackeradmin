'use client';
import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Download, RefreshCw, CheckCircle, XCircle, Trash2, UserCheck } from 'lucide-react';

export default function BulkLeadsPage() {
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState('add');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const fileRef = useRef();

  // Single lead form
  const [form, setForm] = useState({ companyName: '', contactPerson: '', designation: '', phone: '', email: '', address: '', industry: '', companySize: '', source: 'Admin Assigned', priority: 'Medium', status: 'New', notes: '', assignToEmployeeId: '' });
  const [submitting, setSubmitting] = useState(false);

  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 4000); };

  const load = async () => {
    const [empsRes, leadsRes] = await Promise.all([
      fetch('/api/admin-employees').then(r => r.json()),
      fetch('/api/admin-leads').then(r => r.json()),
    ]);
    setEmployees(empsRes.employees || []);
    setLeads(leadsRes.leads || []);
  };

  useEffect(() => { load(); }, []);

  const submitLead = async (e) => {
    e.preventDefault();
    if (!form.companyName) return flash('Company name is required', 'error');
    setSubmitting(true);
    const res = await fetch('/api/admin-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: [{ ...form, userId: form.assignToEmployeeId }] }),
    });
    const data = await res.json();
    if (!res.ok) flash(data.error || 'Failed', 'error');
    else { flash('Lead created and assigned!'); setForm({ companyName: '', contactPerson: '', designation: '', phone: '', email: '', address: '', industry: '', companySize: '', source: 'Admin Assigned', priority: 'Medium', status: 'New', notes: '', assignToEmployeeId: '' }); load(); }
    setSubmitting(false);
  };

  const parseCsv = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/"/g, '').trim(); });
      return obj;
    });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      setPreview(rows.slice(0, 5));
      setCsvErrors([]);
    };
    reader.readAsText(file);
  };

  const importLeads = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return flash('Please select a file first', 'error');
    setImporting(true);
    const text = await file.text();
    const rows = parseCsv(text);
    const res = await fetch('/api/admin-leads/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: rows }),
    });
    const data = await res.json();
    if (!res.ok) flash(data.error || 'Import failed', 'error');
    else {
      flash(`✅ Imported ${data.imported} leads${data.errors?.length ? ` (${data.errors.length} skipped)` : ''}!`);
      setCsvErrors(data.errors || []);
      setPreview([]);
      fileRef.current.value = '';
      load();
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const headers = 'companyName,contactPerson,designation,phone,email,address,industry,companySize,source,priority,status,notes,estDealValue,assignToEmail,servicesInterested';
    const sample = 'Acme Corp,John Doe,Manager,9876543210,john@acme.com,"Mumbai, MH",Technology,50-200,Cold Call,High,New,Interested in BGV services,500000,employee@company.com,BGV';
    const blob = new Blob([headers + '\n' + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cluso_leads_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };
  const inp = { width: '100%', padding: '9px 13px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 9, color: 'var(--text)', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 5 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>📋 Lead Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Add leads manually or import in bulk via CSV.</p>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {msg.text && (
        <div style={{ padding: '10px 16px', borderRadius: 10, marginBottom: 16, background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}`, color: msg.type === 'error' ? '#ef4444' : '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'error' ? <XCircle size={16} /> : <CheckCircle size={16} />} {msg.text}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Leads', value: leads.length },
          { label: 'Assigned', value: leads.filter(l => l.userId).length },
          { label: 'Unassigned', value: leads.filter(l => !l.userId).length },
          { label: 'Closed / Won', value: leads.filter(l => l.status === 'Closed').length },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', padding: 18 }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-secondary)', padding: 4, borderRadius: 12, width: 'fit-content' }}>
        {[['add', <Plus size={15}/>, 'Add Single Lead'], ['bulk', <Upload size={15}/>, 'Bulk Import CSV']].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: tab === key ? 'var(--surface)' : 'transparent', color: tab === key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: tab === key ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.875rem', boxShadow: tab === key ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Add Single Lead */}
      {tab === 'add' && (
        <div style={card}>
          <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18}/> Add Lead & Assign to Employee</h3>
          <form onSubmit={submitLead}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                { key: 'companyName', label: 'Company Name *', placeholder: 'Acme Corp' },
                { key: 'contactPerson', label: 'Contact Person', placeholder: 'John Doe' },
                { key: 'designation', label: 'Designation', placeholder: 'Manager' },
                { key: 'phone', label: 'Phone', placeholder: '9876543210' },
                { key: 'email', label: 'Email', placeholder: 'contact@company.com' },
                { key: 'industry', label: 'Industry', placeholder: 'Technology' },
                { key: 'address', label: 'Address', placeholder: 'City, State' },
                { key: 'companySize', label: 'Company Size', placeholder: '50-200' },
                { key: 'estDealValue', label: 'Est. Deal Value', placeholder: '500000' },
              ].map(f => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input style={inp} value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Priority</label>
                <select style={inp} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  {['Low','Medium','High','Hot','Critical'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  {['New','Contacted','Qualified','Proposal','Negotiation','Closed','Lost'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Source</label>
                <select style={inp} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                  {['Admin Assigned','Cold Call','Email','Referral','Website','LinkedIn','Other'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Assign to Employee</label>
                <select style={inp} value={form.assignToEmployeeId} onChange={e => setForm(p => ({ ...p, assignToEmployeeId: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Add any notes about this lead..." />
            </div>
            <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={16}/> {submitting ? 'Creating...' : 'Create & Assign Lead'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Import */}
      {tab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ ...card, border: '2px dashed var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={18}/> Upload CSV / Excel</h3>
              <button onClick={downloadTemplate} style={{ padding: '7px 16px', borderRadius: 9, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem' }}>
                <Download size={14}/> Download Template
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Upload a CSV file with lead data. Download the template above to see the required format. Max 1,000 rows per import. To assign leads, use the <strong>assignToEmail</strong> column with the employee's email address.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 9, color: 'var(--text)', fontSize: '0.875rem' }} />
              <button onClick={importLeads} disabled={importing} style={{ padding: '9px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 }}>
                <Upload size={15}/> {importing ? 'Importing...' : 'Import Leads'}
              </button>
            </div>
          </div>

          {/* Template reference */}
          <div style={card}>
            <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>📄 CSV Column Reference</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['Column', 'Required', 'Description', 'Example'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700, borderBottom: '1px solid var(--surface-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['companyName', '✅ Yes', 'Company / client name', 'Acme Corporation'],
                    ['contactPerson', 'No', 'Primary contact name', 'John Doe'],
                    ['designation', 'No', 'Contact designation', 'Sales Manager'],
                    ['phone', 'No', 'Phone number', '9876543210'],
                    ['email', 'No', 'Contact email', 'john@acme.com'],
                    ['address', 'No', 'Company address', 'Mumbai, Maharashtra'],
                    ['industry', 'No', 'Industry type', 'Technology'],
                    ['companySize', 'No', 'Employee count range', '50-200'],
                    ['source', 'No', 'Lead source', 'Cold Call'],
                    ['priority', 'No', 'Low / Medium / High / Hot / Critical', 'High'],
                    ['status', 'No', 'New / Contacted / Qualified / Proposal / Negotiation / Closed / Lost', 'New'],
                    ['notes', 'No', 'Internal notes', 'Follow up next week'],
                    ['estDealValue', 'No', 'Estimated deal value', '500000'],
                    ['assignToEmail', 'No', 'Employee email to assign', 'employee@cluso.in'],
                    ['servicesInterested', 'No', 'Comma-separated services', 'BGV,Staffing'],
                  ].map(([col, req, desc, ex]) => (
                    <tr key={col} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>{col}</td>
                      <td style={{ padding: '8px 12px', color: req.includes('Yes') ? '#16a34a' : 'var(--text-muted)' }}>{req}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{desc}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.length > 0 && (
            <div style={card}>
              <h4 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>🔍 Preview (first {preview.length} rows)</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>{Object.keys(preview[0]).map(k => <th key={k} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--surface-border)', whiteSpace: 'nowrap' }}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        {Object.values(row).map((v, j) => <td key={j} style={{ padding: '7px 10px', color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {csvErrors.length > 0 && (
            <div style={{ ...card, border: '1px solid #fecaca', background: '#fef2f2' }}>
              <h4 style={{ fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>⚠️ Import Errors ({csvErrors.length} rows skipped)</h4>
              {csvErrors.map((e, i) => <p key={i} style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: 4 }}>Row {e.row}: {e.error}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
