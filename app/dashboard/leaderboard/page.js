'use client';
import { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Phone, Handshake, RotateCcw } from 'lucide-react';

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => setData(d.leaderboard || []));
  }, []);

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const myRank = -1; // Admin doesn't have a rank

  const medalColors = [
    { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', shadow: 'rgba(245,158,11,0.3)', text: '🥇' },
    { bg: 'linear-gradient(135deg, #d1d5db, #9ca3af)', shadow: 'rgba(156,163,175,0.3)', text: '🥈' },
    { bg: 'linear-gradient(135deg, #f97316, #ea580c)', shadow: 'rgba(249,115,22,0.3)', text: '🥉' },
  ];

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={20} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Team Leaderboard</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live performance rankings — powered by real data</p>
        </div>
      </div>

      {/* Points Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: '🏆', label: 'Deal Closed', pts: '1,000 pts', color: '#16a34a', bg: '#f0fdf4' },
          { icon: '📞', label: 'Call Made', pts: '100 pts', color: '#3b82f6', bg: '#eff6ff' },
          { icon: '🔄', label: 'Follow-up', pts: '100 pts', color: '#f59e0b', bg: '#fffbeb' },
        ].map(p => (
          <div key={p.label} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 10,
            background: p.bg, border: `1px solid ${p.color}25`,
            fontSize: '0.78rem', fontWeight: 600, color: p.color,
          }}>
            <span>{p.icon}</span> {p.label} = <strong>{p.pts}</strong>
          </div>
        ))}
      </div>

      {/* Period Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-glass)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--surface-border)' }}>
        {['week', 'month', 'quarter', 'all'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s', letterSpacing: '-0.01em',
              background: period === p ? 'var(--surface)' : 'transparent',
              color: period === p ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: period === p ? 'var(--shadow-sm)' : 'none',
            }}>
            {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container" style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--surface-glass)', borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deals</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calls</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Follow-ups</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</th>
              <th style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={`${e.userId}-${i}`} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '16px' }}>
                  {i < 3 ? (
                    <span style={{ fontSize: '1.4rem' }}>{medalColors[i].text}</span>
                  ) : (
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{i+1}</span>
                  )}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, hsl(${230 + i*25}, 70%, 65%), hsl(${250 + i*25}, 70%, 55%))`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                    }}>{e.name.charAt(0)}</div>
                    <div>
                      <span style={{ fontWeight: 500 }}>
                        {e.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: 600 }}>{e.dealsCount}</td>
                <td style={{ padding: '16px', fontWeight: 600 }}>{e.callsMade}</td>
                <td style={{ padding: '16px', fontWeight: 600 }}>{e.followUps}</td>
                <td style={{ padding: '16px' }}><strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{e.score}</strong></td>
                <td style={{ padding: '16px' }}>
                  {e.trend === 'up' ? <TrendingUp size={18} color="#34d399" /> : 
                   e.trend === 'down' ? <TrendingDown size={18} color="#f87171" /> : 
                   <Minus size={18} color="var(--text-muted)" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
