'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Users, ClipboardList, Target } from 'lucide-react';

export default function DepartmentsPage() {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetch('/api/admin-dashboard').then(r => r.json()).then(setData);
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
    fetch('/api/admin-leads').then(r => r.json()).then(d => setLeads(d.leads || []));
  }, []);

  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Departments...</div>;

  const depts = data.unitHeatmap || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Departments</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {depts.map((d, i) => {
          const deptEmployees = employees.filter(e => e.department === d.department);
          const deptLeads = leads.filter(l => {
            const assignedEmp = employees.find(e => e.name === l.assignedAsset);
            return assignedEmp && assignedEmp.department === d.department;
          });

          return (
            <div key={d.department} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{d.department}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.headcount} employees</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Users size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Employees</span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{d.headcount}</div>
                </div>
                <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <ClipboardList size={14} color="#8b5cf6" />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Efficiency</span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: d.efficiency > 70 ? 'var(--success)' : d.efficiency > 40 ? 'var(--warning)' : 'var(--danger)' }}>{d.efficiency}%</div>
                </div>
              </div>

              {/* Employee List */}
              {deptEmployees.length > 0 && (
                <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Team Members</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {deptEmployees.slice(0, 5).map(e => (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{e.name?.charAt(0)}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{e.name}</span>
                        </div>
                        <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>{e.status}</span>
                      </div>
                    ))}
                    {deptEmployees.length > 5 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>+{deptEmployees.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {depts.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
            No departments found. Add employees to create departments automatically.
          </div>
        )}
      </div>
    </motion.div>
  );
}
