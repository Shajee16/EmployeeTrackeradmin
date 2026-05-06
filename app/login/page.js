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
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)', pointerEvents: 'none', zIndex: 10, opacity: 0.5 }} />
      
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} 
        className="card" style={{ width: 400, padding: 40, zIndex: 20, position: 'relative', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <ShieldAlert size={48} color="var(--accent)" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Strategic Command</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Level 5 Clearance Required</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ background: 'var(--danger)', color: 'var(--primary-invert)', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>[ ERROR: {error} ]</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Identification (Email)</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nexus.com" style={{ width: '100%' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Access Code (Password)</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%' }} />
          </div>

          <button type="submit" className="btn btn-accent" style={{ marginTop: 12 }}>AUTHORIZE ACCESS</button>
        </form>

        <div style={{ marginTop: 24, padding: 12, border: '1px dashed var(--surface-border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          DEMO OVERRIDE:<br/>
          admin@nexus.com / admin123
        </div>
      </motion.div>
    </div>
  );
}
