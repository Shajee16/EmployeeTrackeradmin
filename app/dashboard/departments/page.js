'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Users, ClipboardList, Target, PlusCircle, FileText, GraduationCap, UserCheck, ChevronRight, Activity, BarChart3, Megaphone, DollarSign } from 'lucide-react';

// Department config — maps departments to their tools/sub-pages
const deptConfig = {
  'Sales': {
    icon: DollarSign,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    desc: 'Lead pipeline, targets, and sales team performance',
    tools: [
      { icon: Target, label: 'Lead Management', path: '/dashboard/leads', desc: 'View and manage all customer leads' },
      { icon: PlusCircle, label: 'Add Leads', path: '/dashboard/add-leads', desc: 'Create and assign new leads manually' },
      { icon: BarChart3, label: 'Leaderboard', path: '/dashboard/leaderboard', desc: 'View sales performance rankings' },
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Sales', desc: 'Review sales team daily reports' },
    ],
  },
  'Marketing': {
    icon: Megaphone,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    desc: 'Content, campaigns, and marketing analytics',
    tools: [
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Marketing', desc: 'Review marketing team submissions' },
    ],
  },
  'Student Ambassador': {
    icon: GraduationCap,
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    desc: 'Campus chapters, POC accounts, and ambassador onboarding',
    tools: [
      { icon: GraduationCap, label: 'Colleges', path: '/dashboard/colleges', desc: 'Manage registered colleges and POC accounts' },
      { icon: UserCheck, label: 'Onboarding Queue', path: '/dashboard/onboarding', desc: 'Review ambassador onboarding requests' },
      { icon: BarChart3, label: 'Activity Monitor', path: '/dashboard/ambassador-activity', desc: 'Monitor ambassador activities' },
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Student+Ambassador', desc: 'Review ambassador submissions' },
    ],
  },
};

// Fallback config for departments not in the config
const defaultConfig = {
  icon: Layers,
  color: '#64748b',
  gradient: 'linear-gradient(135deg, #64748b, #475569)',
  desc: 'Department overview and team management',
  tools: [],
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  useEffect(() => {
    fetch('/api/admin-dashboard').then(r => r.json()).then(setData);
    fetch('/api/admin-employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
    fetch('/api/admin-leads').then(r => r.json()).then(d => setLeads(d.leads || []));
  }, []);

  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Departments...</div>;

  const depts = data.unitHeatmap || [];

  // Auto-select first department if none selected
  const activeDeptName = selectedDept || (depts.length > 0 ? depts[0].department : null);
  const activeDept = depts.find(d => d.department === activeDeptName);
  const config = deptConfig[activeDeptName] || defaultConfig;
  const DeptIcon = config.icon;
  const deptEmployees = activeDept ? employees.filter(e => e.department === activeDeptName) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Departments</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>Click a department to see its tools, team members, and quick actions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, minHeight: 500 }} className="dept-grid">
        {/* ═══════ LEFT PANEL — Department List ═══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {depts.map((d) => {
            const cfg = deptConfig[d.department] || defaultConfig;
            const Icon = cfg.icon;
            const isActive = d.department === activeDeptName;

            return (
              <motion.button
                key={d.department}
                onClick={() => setSelectedDept(d.department)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 14, border: 'none',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  border: isActive ? `1.5px solid ${cfg.color}30` : '1.5px solid transparent',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
              >
                {/* Color accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="dept-indicator"
                    style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3,
                      borderRadius: 4, background: cfg.color,
                      boxShadow: `0 0 12px ${cfg.color}50`,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon badge */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: isActive ? cfg.gradient : `${cfg.color}12`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s ease',
                }}>
                  <Icon size={18} color={isActive ? '#fff' : cfg.color} />
                </div>

                {/* Label & count */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontWeight: isActive ? 700 : 500, fontSize: '0.88rem',
                    color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {d.department}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {d.headcount} {d.headcount === 1 ? 'member' : 'members'}
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight size={16} style={{
                  color: isActive ? cfg.color : 'var(--text-muted)',
                  opacity: isActive ? 1 : 0.4,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }} />
              </motion.button>
            );
          })}

          {depts.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No departments found.
            </div>
          )}
        </div>

        {/* ═══════ RIGHT PANEL — Department Details ═══════ */}
        <AnimatePresence mode="wait">
          {activeDeptName && activeDept && (
            <motion.div
              key={activeDeptName}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* Header Card */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  background: config.gradient,
                  padding: '24px 28px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* Decorative circles */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ position: 'absolute', bottom: -20, right: 40, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <DeptIcon size={22} color="#fff" />
                      </div>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                          {activeDeptName}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', margin: 0, marginTop: 2 }}>
                          {config.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{activeDept.headcount}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{activeDept.efficiency}%</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Efficiency</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ Tools / Quick Actions ═══ */}
              {config.tools.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Department Tools
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {config.tools.map(tool => (
                      <motion.button
                        key={tool.path}
                        onClick={() => router.push(tool.path)}
                        whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
                        whileTap={{ scale: 0.97 }}
                        className="card"
                        style={{
                          padding: '18px 16px', border: 'none', cursor: 'pointer',
                          textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12,
                          transition: 'all 0.2s', borderLeft: `3px solid ${config.color}`,
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: `${config.color}12`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <tool.icon size={18} color={config.color} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 3 }}>{tool.label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{tool.desc}</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto', flexShrink: 0, alignSelf: 'center', opacity: 0.5 }} />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Team Members ═══ */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} color={config.color} />
                    Team Members
                    <span style={{
                      background: `${config.color}15`, color: config.color,
                      padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      {deptEmployees.length}
                    </span>
                  </h4>
                </div>

                {deptEmployees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No team members in this department yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {deptEmployees.map(e => (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 10, background: 'var(--bg-secondary)',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: config.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {e.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{e.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {e.designation || e.role}
                              {e.id && <span style={{ marginLeft: 6, fontFamily: 'monospace', fontWeight: 600, color: config.color, fontSize: '0.68rem' }}>{e.id}</span>}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                          {e.status || 'active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when no department selected and no depts exist */}
        {(!activeDeptName || depts.length === 0) && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 16 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>No Department Selected</p>
            <p style={{ fontSize: '0.82rem' }}>Select a department from the left panel to view its tools and team members.</p>
          </div>
        )}
      </div>

      {/* Responsive CSS for mobile */}
      <style>{`
        @media (max-width: 768px) {
          .dept-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
