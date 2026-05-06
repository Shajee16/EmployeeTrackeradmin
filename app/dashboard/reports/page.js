'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, User } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetch('/api/admin-reports').then(r => r.json()).then(d => setReports(d.reports || []));
  }, []);

  const filtered = filterType ? reports.filter(r => r.formType === filterType) : reports;

  const formTypes = [...new Set(reports.map(r => r.formType))];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Employee Reports</h2>
      </div>

      <div className="card" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', marginBottom: 24, width: 300, height: 44 }}>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', outline: 'none' }}>
          <option value="">All Report Types</option>
          {formTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(r => (
          <div key={r.id} className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} color="var(--primary)" /> {r.formType}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> {r.employeeName} ({r.employeeDept})</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={14} /> {new Date(r.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {Object.entries(r.data || {}).map(([key, value]) => (
                <div key={key}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No reports found.
          </div>
        )}
      </div>
    </motion.div>
  );
}
