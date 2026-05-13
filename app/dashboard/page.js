'use client';
import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Download, UserPlus, Users, ClipboardList, FileText, MessageSquare, CalendarCheck, Target, TrendingUp, Briefcase, CheckCircle2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const cardAnim = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] } }),
};

export default function StrategicCommand() {
  const [data, setData] = useState(null);
  const pollRef = useRef(null);

  const fetchDashboard = () => fetch('/api/admin-dashboard').then(r => r.json()).then(setData).catch(() => {});

  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading Dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const ext = data.extendedMetrics || {};

  const statCards = [
    { icon: Users, label: 'Total Employees', value: data.metrics.forceSize, gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', glow: 'rgba(99,102,241,0.2)', link: '/dashboard/employees' },
    { icon: Target, label: 'Active Leads', value: ext.totalLeads || 0, sub: `${ext.newLeads || 0} new`, gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', glow: 'rgba(245,158,11,0.2)', link: '/dashboard/leads' },
    { icon: ClipboardList, label: 'Tasks', value: ext.totalTasks || 0, sub: `${ext.pendingTasks || 0} pending`, gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', glow: 'rgba(139,92,246,0.2)', link: '/dashboard/tasks' },
    { icon: FileText, label: 'Submissions', value: ext.totalSubmissions || 0, sub: `${ext.pendingSubmissions || 0} to review`, gradient: 'linear-gradient(135deg, #10b981, #34d399)', glow: 'rgba(16,185,129,0.2)', link: '/dashboard/reports' },
    { icon: MessageSquare, label: 'Suggestions', value: ext.totalSuggestions || 0, sub: `${ext.pendingSuggestions || 0} pending`, gradient: 'linear-gradient(135deg, #ec4899, #f472b6)', glow: 'rgba(236,72,153,0.2)', link: '/dashboard/suggestions' },
    { icon: CalendarCheck, label: 'Today Attendance', value: ext.todayAttendance || 0, sub: `of ${data.metrics.forceSize}`, gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)', glow: 'rgba(6,182,212,0.2)', link: '/dashboard/attendance' },
  ];

  const kpiCards = [
    {
      label: 'Active Staff', value: `${data.metrics.forceSize > 0 ? ((data.metrics.activeForce / data.metrics.forceSize) * 100).toFixed(0) : 0}%`,
      sub: `${data.metrics.activeForce} of ${data.metrics.forceSize}`,
      gradient: 'linear-gradient(135deg, #10b981, #34d399)', icon: TrendingUp,
    },
    {
      label: 'Total Deal Value', value: `₹${(data.metrics.financialYield / 100000).toFixed(2)}L`,
      sub: 'Revenue pipeline',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', icon: Briefcase,
    },
    {
      label: 'Task Completion', value: `${ext.totalTasks > 0 ? Math.round((ext.completedTasks / ext.totalTasks) * 100) : 0}%`,
      sub: `${ext.completedTasks || 0} of ${ext.totalTasks || 0} done`,
      gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', icon: CheckCircle2,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* ═══════ HEADER ═══════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.2 }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 6 }}>
            Overview of all operations • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary" style={{ borderRadius: 12, padding: '10px 20px', fontSize: '0.82rem' }} onClick={() => window.location.href = '/dashboard/employees'}>
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* ═══════ STATS GRID ═══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <motion.div key={i} custom={i} variants={cardAnim} initial="hidden" animate="show">
            <Link href={s.link} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: '18px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                {/* Glow accent */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: s.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: s.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', marginBottom: 14, boxShadow: `0 4px 12px ${s.glow}`,
                }}>
                  <s.icon size={18} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                {s.sub && (
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 600, marginTop: 6,
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    padding: '2px 8px', borderRadius: 6,
                    background: s.glow, color: 'var(--text)',
                  }}>
                    <ArrowUpRight size={10} /> {s.sub}
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ═══════ KPI ROW ═══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {kpiCards.map((k, i) => (
          <motion.div key={i} custom={i + 6} variants={cardAnim} initial="hidden" animate="show">
            <div className="card" style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden', position: 'relative' }}>
              {/* Background glow */}
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: k.gradient, opacity: 0.08, filter: 'blur(20px)', pointerEvents: 'none' }} />
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: k.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0, boxShadow: 'var(--shadow-sm)',
              }}>
                <k.icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{k.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══════ CHARTS ═══════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="chart-grid">
        {/* Revenue Chart */}
        <motion.div custom={9} variants={cardAnim} initial="hidden" animate="show">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
              Revenue from Closed Deals
            </h3>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-muted)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--text-muted)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 12, color: 'var(--text)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-md)' }}
                    itemStyle={{ color: 'var(--text)', fontSize: '0.82rem' }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: 12 }} />
                  <Area type="monotone" dataKey="projected" stroke="var(--text-muted)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorProjected)" name="Pipeline" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Closed Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Department Chart */}
        <motion.div custom={10} variants={cardAnim} initial="hidden" animate="show">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              Department Task Completion
            </h3>
            <div style={{ height: 280, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.unitHeatmap} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <YAxis dataKey="department" type="category" stroke="var(--text)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 12, color: 'var(--text)', backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-md)' }}
                    cursor={{ fill: 'var(--surface-glass)', radius: 4 }}
                  />
                  <Bar dataKey="efficiency" fill="var(--success)" barSize={24} radius={[0, 6, 6, 0]} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Responsive chart grid */}
      <style>{`
        @media (min-width: 900px) {
          .chart-grid { grid-template-columns: 3fr 2fr !important; }
        }
      `}</style>
    </motion.div>
  );
}
