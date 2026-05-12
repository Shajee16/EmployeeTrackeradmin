'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      const data = await res.json();
      setError(data.error);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        {/* Soft blur orbs instead of grid lines */}
        <div style={{ position: 'absolute', width: 600, height: 600, background: 'var(--primary-light)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, top: '-20%', left: '-10%' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'var(--accent-light)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.3, bottom: '-15%', right: '-5%' }} />
      </div>
      
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} 
        className="card" style={{ width: 400, padding: 40, zIndex: 20, position: 'relative', background: 'var(--surface)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <ShieldAlert size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', color: 'var(--text)' }}>Strategic Command</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Level 5 Clearance Required</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ background: 'rgba(226,125,114,0.1)', color: 'var(--danger)', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: 8, border: '1px solid rgba(226,125,114,0.2)' }}>[ ERROR: {error} ]</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Identification (Email)</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nexus.com" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Access Code (Password)</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8 }} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUTHORIZE ACCESS</button>
        </form>

        <div style={{ marginTop: 24, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          DEMO OVERRIDE:<br/>
          <strong style={{ color: 'var(--text)' }}>admin@nexus.com / admin123</strong>
        </div>
      </motion.div>
    </div>
  );
}
