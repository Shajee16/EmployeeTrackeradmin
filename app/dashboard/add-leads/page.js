'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Plus, Download, RefreshCw, CheckCircle, XCircle, Trash2, UserCheck } from 'lucide-react';

const EXPECTED_COLUMNS = [
  { field: 'Company Name', key: 'companyName', required: true, example: 'TCS, Infosys' },
  { field: 'Contact Person', key: 'contactPerson', required: true, example: 'Rahul Sharma' },
  { field: 'Designation', key: 'designation', required: false, example: 'HR Manager' },
  { field: 'Phone', key: 'phone', required: true, example: '+91 98765 43210' },
  { field: 'Email', key: 'email', required: true, example: 'rahul@tcs.com' },
  { field: 'Address', key: 'address', required: false, example: 'Mumbai, India' },
  { field: 'Industry', key: 'industry', required: false, example: 'IT/Software' },
  { field: 'Company Size', key: 'companySize', required: false, example: '201-500' },
  { field: 'Services Interested', key: 'servicesInterested', required: false, example: 'Web Development, SEO' },
  { field: 'Source', key: 'source', required: false, example: 'LinkedIn' },
  { field: 'Est Monthly Volume', key: 'estMonthlyVolume', required: false, example: '100' },
  { field: 'Est Deal Value', key: 'estDealValue', required: false, example: '50000' },
  { field: 'Status', key: 'status', required: false, example: 'New' },
  { field: 'Priority', key: 'priority', required: false, example: 'Medium' },
  { field: 'Notes', key: 'notes', required: false, example: 'Interested in CRM' },
  { field: 'Next Follow-up Date', key: 'nextFollowUpDate', required: false, example: '2026-06-01' },
  { field: 'Assign To Email', key: 'assignToEmail', required: false, example: 'employee@cluso.in' },
];

export default function BulkLeadsPage() {
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState('add');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [importing, setImporting] = useState(false);
  const [csvErrors, setCsvErrors] = useState([]);
  const fileRef = useRef();
  // Multi-step bulk upload state
  const [bulkStep, setBulkStep] = useState('format');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkHeaders, setBulkHeaders] = useState([]);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkResults, setBulkResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [assignEmployee, setAssignEmployee] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const ROWS_PER_PAGE = 50;

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
    if (!form.email) return flash('Email is required', 'error');
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

  const parseFile = useCallback((file) => {
    setParseError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        if (json.length < 2) { setParseError('File must have at least a header row and one data row.'); return; }
        const hdrs = json[0].map(h => String(h).trim());
        const dataRows = json.slice(1).filter(row => row.some(cell => cell !== '' && cell != null));
        if (dataRows.length === 0) { setParseError('No data rows found after the header row.'); return; }
        const normalizedRows = dataRows.map(row => {
          const r = [];
          for (let i = 0; i < hdrs.length; i++) {
            let val = row[i] != null ? row[i] : '';
            if (val instanceof Date) val = val.toISOString().split('T')[0];
            r.push(String(val).trim());
          }
          return r;
        });
        setBulkHeaders(hdrs);
        setBulkRows(normalizedRows);
        setBulkFile(file);
        setBulkStep('preview');
      } catch (err) {
        setParseError(`Failed to parse the file. Ensure it is a valid CSV or Excel file. (${err.message})`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) parseFile(e.dataTransfer.files[0]); };
  const handleFileChange = (e) => { if (e.target.files?.[0]) parseFile(e.target.files[0]); };

  // Build a map of display header -> API key for column name mapping
  const headerToKey = (header) => {
    const col = EXPECTED_COLUMNS.find(c => c.field.toLowerCase() === header.toLowerCase());
    return col ? col.key : header;
  };

  const handleBulkUpload = async () => {
    setImporting(true);
    try {
      // Filter to only selected rows (or all if none selected)
      const rowsToUpload = selectedRows.size > 0
        ? bulkRows.filter((_, i) => selectedRows.has(i))
        : bulkRows;

      // Convert headers+rows into objects with API-compatible keys
      const leadsArr = rowsToUpload.map(row => {
        const obj = {};
        bulkHeaders.forEach((h, i) => { obj[headerToKey(h)] = row[i] || ''; });
        // If an employee is selected for bulk assignment, override the assignToEmail
        if (assignEmployee) {
          const emp = employees.find(e => e.id === assignEmployee);
          if (emp) obj.assignToEmail = emp.email;
        }
        return obj;
      });
      const res = await fetch('/api/admin-leads/bulk-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsArr }),
      });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error || 'Import failed'); }
      else {
        setBulkResults({ totalProcessed: leadsArr.length, successCount: data.imported || 0, skippedCount: 0, errorCount: data.errors?.length || 0, errors: data.errors || [] });
        setBulkStep('results');
        load();
      }
    } catch (err) { setParseError('Network error during upload.'); }
    setImporting(false);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS.map(c => c.field),
      EXPECTED_COLUMNS.map(c => c.example),
    ]);
    ws['!cols'] = EXPECTED_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'Cluso_Leads_Template.xlsx');
  };

  const resetBulk = () => { setBulkStep('format'); setBulkFile(null); setBulkHeaders([]); setBulkRows([]); setBulkResults(null); setParseError(''); setCsvErrors([]); setSelectedRows(new Set()); setAssignEmployee(''); setPreviewPage(1); };

  const toggleRow = (i) => { setSelectedRows(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; }); };
  const toggleAllRows = () => { setSelectedRows(prev => prev.size === bulkRows.length ? new Set() : new Set(bulkRows.map((_, i) => i))); };

  // Assign only the selected leads, remove them from preview, keep unselected
  const assignSelectedLeads = async () => {
    if (!assignEmployee) { flash('Please select an employee to assign leads to', 'error'); return; }
    if (selectedRows.size === 0) { flash('Please select at least one lead to assign', 'error'); return; }
    setImporting(true);
    try {
      const rowsToUpload = bulkRows.filter((_, i) => selectedRows.has(i));
      const leadsArr = rowsToUpload.map(row => {
        const obj = {};
        bulkHeaders.forEach((h, i) => { obj[headerToKey(h)] = row[i] || ''; });
        const emp = employees.find(e => e.id === assignEmployee);
        if (emp) obj.assignToEmail = emp.email;
        return obj;
      });
      const res = await fetch('/api/admin-leads/bulk-import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: leadsArr }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Assignment failed', 'error'); }
      else {
        const remaining = bulkRows.filter((_, i) => !selectedRows.has(i));
        const assignedCount = data.imported || rowsToUpload.length;
        const empName = employees.find(e => e.id === assignEmployee)?.name || 'employee';
        flash(`${assignedCount} lead${assignedCount > 1 ? 's' : ''} assigned to ${empName}!`);
        setBulkRows(remaining);
        setSelectedRows(new Set());
        setAssignEmployee('');
        setPreviewPage(1);
        load();
        if (remaining.length === 0) {
          setBulkResults({ totalProcessed: leadsArr.length, successCount: data.imported || 0, skippedCount: 0, errorCount: data.errors?.length || 0, errors: data.errors || [] });
          setBulkStep('results');
        }
      }
    } catch (err) { flash('Network error during assignment.', 'error'); }
    setImporting(false);
  };

  const totalPages = Math.ceil(bulkRows.length / ROWS_PER_PAGE);
  const pagedRows = bulkRows.slice((previewPage - 1) * ROWS_PER_PAGE, previewPage * ROWS_PER_PAGE);

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
                { key: 'email', label: 'Email *', placeholder: 'contact@company.com' },
                { key: 'phone', label: 'Phone', placeholder: '9876543210' },
                { key: 'designation', label: 'Designation', placeholder: 'Manager' },
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

      {/* Bulk Import — Multi-Step */}
      {tab === 'bulk' && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {parseError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: '#ef4444', marginBottom: 20, fontSize: '0.9rem', fontWeight: 500 }}>
              ⚠️ {parseError}
            </div>
          )}

          {/* ═══ STEP 1: FORMAT GUIDE ═══ */}
          {bulkStep === 'format' && (
            <>
              {/* Instructions */}
              <div style={{ ...card, position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)' }} />
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, marginTop: 8 }}>📋 How It Works</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>
                  Prepare your Excel or CSV file using the table format shown below. Your file&apos;s first row <strong>must</strong> be the column headers.
                  The system intelligently matches column names — you don&apos;t need exact names (e.g., &quot;Company&quot; works just like &quot;Company Name&quot;).
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={downloadTemplate} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                    ⬇️ Download Template (.xlsx)
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Accepts: .xlsx, .xls, .csv
                  </div>
                </div>
              </div>

              {/* Format Table */}
              <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>📑 Required Table Format</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><span style={{ color: '#ef4444' }}>*</span> = Required</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Column Name</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Example Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EXPECTED_COLUMNS.map((col, i) => (
                        <tr key={col.field} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {col.field} {col.required && <span style={{ color: '#ef4444' }}>*</span>}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {col.required ? (
                              <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>Required</span>
                            ) : (
                              <span style={{ background: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)', padding: '2px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>Optional</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{col.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pro Tips */}
              <div style={{ ...card, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 24 }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--primary)' }}>💡 Pro Tips</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'Use the assignToEmail column to auto-assign leads to employees',
                    'Status values: New, Contacted, Qualified, Proposal, Negotiation, Closed, Lost',
                    'Priority values: Low, Medium, High, Hot, Critical',
                    'Duplicate leads (matching email or phone) will be automatically skipped',
                    'Column names are flexible — "Company" works the same as "Company Name"',
                  ].map((tip, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? '#6366f1' : 'var(--surface-border)'}`,
                  borderRadius: 16, padding: '50px 40px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.3s',
                  background: dragActive ? 'rgba(99,102,241,0.06)' : 'var(--surface)', marginBottom: 24,
                }}
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.7 }}>{dragActive ? '📂' : '📄'}</div>
                <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6, color: 'var(--text)' }}>
                  {dragActive ? 'Drop your file here!' : 'Drag & Drop your file here'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>click to browse</span> — Supports .xlsx, .xls, .csv
                </p>
              </div>
            </>
          )}


          {/* ═══ STEP 2: PREVIEW ═══ */}
          {bulkStep === 'preview' && (
            <>
              {/* Header bar */}
              <div style={{ ...card, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>📋 Preview — {bulkFile?.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                    <strong style={{ color: 'var(--text)' }}>{bulkRows.length}</strong> leads remaining • {bulkHeaders.length} columns
                    {selectedRows.size > 0 && <span style={{ color: 'var(--primary)', fontWeight: 700 }}> • {selectedRows.size} selected</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={resetBulk} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>← Change File</button>
                  <button onClick={handleBulkUpload} disabled={importing} style={{
                    padding: '9px 24px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff',
                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    opacity: importing ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {importing ? '⏳ Uploading...' : `🚀 Upload All ${bulkRows.length} Leads`}
                  </button>
                </div>
              </div>

              {/* ── Assign to Employee Panel ── */}
              <div style={{
                ...card, marginBottom: 20, padding: '18px 22px',
                background: assignEmployee ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(99,102,241,0.04))' : 'var(--surface)',
                border: assignEmployee ? '1.5px solid rgba(16,185,129,0.25)' : '1px solid var(--surface-border)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Assign Leads to Employee</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedRows.size > 0
                        ? `${selectedRows.size} lead${selectedRows.size > 1 ? 's' : ''} selected — pick an employee and click Assign`
                        : 'Select leads from the table below, then choose an employee to assign them'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <select
                    value={assignEmployee}
                    onChange={e => setAssignEmployee(e.target.value)}
                    style={{ flex: 1, minWidth: 220, maxWidth: 420, padding: '10px 14px', background: 'var(--bg-secondary)', border: '1.5px solid var(--surface-border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    <option value="">— Select Employee —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
                  </select>
                  {assignEmployee && (
                    <button onClick={() => setAssignEmployee('')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                      ✕ Clear
                    </button>
                  )}
                  <button
                    onClick={assignSelectedLeads}
                    disabled={importing || !assignEmployee || selectedRows.size === 0}
                    style={{
                      padding: '10px 28px', borderRadius: 10, border: 'none', fontWeight: 700, cursor: 'pointer', color: '#fff',
                      background: (!assignEmployee || selectedRows.size === 0) ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                      boxShadow: (!assignEmployee || selectedRows.size === 0) ? 'none' : '0 4px 16px rgba(16,185,129,0.35)',
                      opacity: importing ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <UserCheck size={16} />
                    {importing ? 'Assigning...' : `Assign ${selectedRows.size > 0 ? selectedRows.size : 0} Lead${selectedRows.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
                {assignEmployee && selectedRows.size > 0 && (
                  <div style={{ marginTop: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.82rem', color: '#059669', fontWeight: 500 }}>
                    ✅ Ready: {selectedRows.size} lead{selectedRows.size > 1 ? 's' : ''} will be assigned to <strong>{employees.find(e => e.id === assignEmployee)?.name}</strong> and removed from this list
                  </div>
                )}
              </div>

              {/* ── Data Table ── */}
              <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ overflowX: 'auto', maxHeight: 520 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 8px', borderBottom: '2px solid var(--surface-border)', textAlign: 'center', width: 44 }}>
                          <input
                            type="checkbox"
                            checked={selectedRows.size === bulkRows.length && bulkRows.length > 0}
                            onChange={toggleAllRows}
                            title="Select All"
                          />
                        </th>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', color: 'var(--text-muted)', width: 44 }}>#</th>
                        {bulkHeaders.map((h, i) => (
                          <th key={i} style={{ padding: '10px 12px', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--text)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, pi) => {
                        const ri = (previewPage - 1) * ROWS_PER_PAGE + pi;
                        return (
                          <tr key={ri} onClick={() => toggleRow(ri)} style={{
                            borderBottom: '1px solid var(--surface-border)',
                            background: selectedRows.has(ri) ? 'rgba(16,185,129,0.08)' : (pi % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)'),
                            transition: 'background 0.2s',
                            cursor: 'pointer',
                          }}>
                            <td style={{ padding: '8px 8px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedRows.has(ri)}
                                onChange={() => toggleRow(ri)}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>{ri + 1}</td>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                                {cell || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Pagination bar ── */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px',
                    borderTop: '1px solid var(--surface-border)', background: 'var(--bg-secondary)',
                    flexWrap: 'wrap', gap: 8,
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Showing {(previewPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(previewPage * ROWS_PER_PAGE, bulkRows.length)} of {bulkRows.length} leads
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: previewPage === 1 ? 'default' : 'pointer', opacity: previewPage === 1 ? 0.4 : 1, fontWeight: 600, fontSize: '0.8rem' }}
                      >‹ Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - previewPage) <= 2)
                        .reduce((acc, p, idx, arr) => {
                          if (idx > 0 && p - arr[idx - 1] > 1) acc.push('dots' + idx);
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          typeof p === 'string'
                            ? <span key={p} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
                            : <button
                                key={p}
                                onClick={() => setPreviewPage(p)}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                  background: previewPage === p ? 'var(--primary)' : 'transparent',
                                  color: previewPage === p ? '#fff' : 'var(--text-muted)',
                                  minWidth: 32,
                                }}
                              >{p}</button>
                        )
                      }
                      <button
                        onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                        disabled={previewPage === totalPages}
                        style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: previewPage === totalPages ? 'default' : 'pointer', opacity: previewPage === totalPages ? 0.4 : 1, fontWeight: 600, fontSize: '0.8rem' }}
                      >Next ›</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ═══ STEP 3: RESULTS ═══ */}
          {bulkStep === 'results' && bulkResults && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{bulkResults.totalProcessed}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Total Processed</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{bulkResults.successCount}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Imported</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{bulkResults.errorCount}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Errors</div>
                </div>
              </div>

              {bulkResults.errors?.length > 0 && (
                <div style={{ ...card, border: '1px solid #fecaca', background: '#fef2f2', marginBottom: 24 }}>
                  <h4 style={{ fontWeight: 700, color: '#ef4444', marginBottom: 12 }}>⚠️ Import Errors ({bulkResults.errors.length} rows skipped)</h4>
                  {bulkResults.errors.map((e, i) => <p key={i} style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: 4 }}>Row {e.row}: {e.error}</p>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={resetBulk} style={{ padding: '10px 22px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>📊 Upload More</button>
                <button onClick={() => setTab('add')} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #6366f1, #7c3aed)', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>← Back to Add Leads</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
