'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Plus } from 'lucide-react';

export default function DepartmentsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/admin-dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Departments...</div>;

  const depts = data.unitHeatmap || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Departments</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, border: '1px dashed var(--primary)', background: 'transparent', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Plus size={24} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>Initialize New Unit</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Strategic organizational structure deployment.</p>
        </div>

        {depts.map((d, i) => (
          <div key={d.department} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={20} color="var(--text-muted)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase' }}>{d.department}</h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Operational Authority Required</p>
                </div>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>UNIT-{String(i+1).padStart(2, '0')}</span>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 24, padding: '16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total Assets</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{d.headcount}</div>
              </div>
              <div style={{ width: 1, background: 'var(--surface-border)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Efficiency</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{d.efficiency}%</div>
              </div>
            </div>

            <button className="btn btn-outline" style={{ width: '100%', marginTop: 'auto' }}>Access Unit Intel</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
