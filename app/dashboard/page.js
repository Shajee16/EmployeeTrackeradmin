'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Download, UserPlus } from 'lucide-react';

export default function StrategicCommand() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/admin-dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Dashboard Data...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>STRATEGIC COMMAND</h1>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>ADMIN OPERATIONS • CLEARANCE LEVEL ADMIN</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" style={{ padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', borderColor: 'var(--surface-border)' }}>
            <Download size={16} /> EXPORT SYSTEM DATA
          </button>
          <button className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', background: 'var(--text)', color: 'var(--primary-invert)' }} onClick={() => window.location.href = '/dashboard/employees'}>
            <UserPlus size={16} /> ENLIST PERSONNEL
          </button>
        </div>
      </div>
      
      
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Employees</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{data.metrics.forceSize}</div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Active Staff</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{((data.metrics.activeForce / data.metrics.forceSize) * 100).toFixed(0)}%</div>
        </div>
        <div className="card" style={{ padding: 24, borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Total Deal Value</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>₹{(data.metrics.financialYield / 100000).toFixed(2)}L</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Interactive Revenue Tracking */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 24 }}>Revenue Projection</h3>
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
                <Area type="monotone" dataKey="projected" stroke="var(--text-muted)" fillOpacity={1} fill="url(#colorProjected)" />
                <Area type="monotone" dataKey="actual" stroke="var(--primary)" fillOpacity={1} fill="url(#colorActual)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unit Heatmap */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 24 }}>Department Efficiency</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.unitHeatmap} margin={{ top: 10, right: 0, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <YAxis dataKey="department" type="category" stroke="var(--text)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text)' }} cursor={{ fill: 'var(--surface-border)' }} />
                <Bar dataKey="efficiency" fill="var(--success)" barSize={20} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
