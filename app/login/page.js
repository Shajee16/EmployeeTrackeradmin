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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} 
        style={{ width: 400, padding: 40, zIndex: 20, position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="Cluso CRM Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: 16 }} />
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', color: '#0f172a' }}>Cluso CRM Admin Portal</h1>
          <p style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Administrator Access</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', borderRadius: 8, border: '1px solid #fecaca' }}>[ ERROR: {error} ]</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Identification (Email)</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@nexus.com" style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '10px 14px', borderRadius: 8 }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Access Code (Password)</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '10px 14px', borderRadius: 8 }} />
          </div>

          <button type="submit" style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#0f172a', color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>AUTHORIZE ACCESS</button>
        </form>
      </motion.div>
    </div>
  );
}
