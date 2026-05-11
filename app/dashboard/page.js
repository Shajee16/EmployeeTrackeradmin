'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Download, UserPlus, Users, ClipboardList, FileText, MessageSquare, CalendarCheck, Target } from 'lucide-react';
import Link from 'next/link';

export default function StrategicCommand() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/admin-dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Dashboard Data...</div>;

  const ext = data.extendedMetrics || {};

  const statCards = [
    { icon: <Users size={22} />, label: 'Total Employees', value: data.metrics.forceSize, color: 'var(--primary)', bg: 'rgba(6,182,212,0.1)', link: '/dashboard/employees' },
    { icon: <Target size={22} />, label: 'Active Leads', value: ext.totalLeads || 0, sub: `${ext.newLeads || 0} new`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', link: '/dashboard/leads' },
    { icon: <ClipboardList size={22} />, label: 'Tasks', value: ext.totalTasks || 0, sub: `${ext.pendingTasks || 0} pending`, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', link: '/dashboard/tasks' },
    { icon: <FileText size={22} />, label: 'Submissions', value: ext.totalSubmissions || 0, sub: `${ext.pendingSubmissions || 0} to review`, color: '#10b981', bg: 'rgba(16,185,129,0.1)', link: '/dashboard/reports' },
    { icon: <MessageSquare size={22} />, label: 'Suggestions', value: ext.totalSuggestions || 0, sub: `${ext.pendingSuggestions || 0} pending`, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', link: '/dashboard/suggestions' },
    { icon: <CalendarCheck size={22} />, label: 'Today Attendance', value: ext.todayAttendance || 0, sub: `of ${data.metrics.forceSize}`, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', link: '/dashboard/attendance' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>Admin Dashboard</h1>
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4 }}>Overview of all operations • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, background: 'var(--text)', color: 'var(--primary-invert)' }} onClick={() => window.location.href = '/dashboard/employees'}>
            <UserPlus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {statCards.map((s, i) => (
          <Link key={i} href={s.link} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{ padding: 20, cursor: 'pointer', transition: 'all 0.2s', borderLeft: `4px solid ${s.color}` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: '0.72rem', color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>}
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue + Deal Value */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Active Staff</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{data.metrics.forceSize > 0 ? ((data.metrics.activeForce / data.metrics.forceSize) * 100).toFixed(0) : 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{data.metrics.activeForce} of {data.metrics.forceSize}</div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Deal Value</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>₹{(data.metrics.financialYield / 100000).toFixed(2)}L</div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Task Completion</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>{ext.totalTasks > 0 ? Math.round((ext.completedTasks / ext.totalTasks) * 100) : 0}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{ext.completedTasks || 0} of {ext.totalTasks || 0} completed</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Interactive Revenue Tracking */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 24 }}>Revenue from Closed Deals</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--text-muted)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--text-muted)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text)' }} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="projected" stroke="var(--text-muted)" fillOpacity={1} fill="url(#colorProjected)" name="Total Pipeline" />
                <Area type="monotone" dataKey="actual" stroke="var(--primary)" fillOpacity={1} fill="url(#colorActual)" name="Closed Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Efficiency */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 24 }}>Department Task Completion</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.unitHeatmap} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <YAxis dataKey="department" type="category" stroke="var(--text)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)' }} cursor={{ fill: 'var(--surface-border)' }} />
                <Bar dataKey="efficiency" fill="var(--success)" barSize={20} radius={[0, 4, 4, 0]} name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
