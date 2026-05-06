'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import { ShieldAlert, Users, Target, Activity, FileText, LayoutDashboard, Settings, Layers, Menu, Bell, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Layers, label: 'Departments', path: '/dashboard/departments' },
  { icon: Users, label: 'Employees', path: '/dashboard/employees' },
  { icon: Target, label: 'Lead Management', path: '/dashboard/leads' },
  { icon: FileText, label: 'Reports', path: '/dashboard/reports' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login');
      else {
        setUser(d.user);
        setLoading(false);
      }
    }).catch(() => router.push('/login'));
    
    // Default to dark theme but let it be toggled
    const saved = localStorage.getItem('admin_theme');
    if (saved) setTheme(saved);
    else document.documentElement.setAttribute('data-theme', 'dark');
  }, [router]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading Nexus CRM...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Mobile overlay */}
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} />}

        {/* Sidebar */}
        <aside style={{
          width: 260, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }} className="md-sidebar">
          {/* Logo */}
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--sidebar-border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10L9 13L14 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Nexus CRM</span>
          </div>

          <div style={{ padding: '24px 16px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Main Menu
          </div>

          <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
            {navItems.map((item) => {
              const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <Link key={item.path} href={item.path} onClick={() => setMobileOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  textDecoration: 'none', color: active ? 'var(--primary)' : 'var(--sidebar-text)',
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  fontWeight: active ? 600 : 500, fontSize: '0.875rem', borderRadius: 8,
                  marginBottom: 4, transition: 'all 0.2s', position: 'relative'
                }}>
                  <item.icon size={18} />
                  {item.label}
                  {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: 2, background: 'var(--primary)' }} />}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div style={{ padding: '16px', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user?.role}</p>
            </div>
            <button onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/login');
            }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </aside>

        {/* Main Screen */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin 0.3s' }} className="md-main">
          {/* Topbar */}
          <header style={{ height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="md-menu-btn" onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}>
                <Menu size={24} />
              </button>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, width: 300 }} className="search-bar">
                <Search size={16} color="var(--text-muted)" />
                <input placeholder="Search items..." style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', fontSize: '0.85rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Theme Toggle Slider */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '24px' }}>
                {['light', 'dark'].map(t => (
                  <button key={t} onClick={() => setTheme(t)}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: theme === t ? 'var(--surface)' : 'transparent', boxShadow: theme === t ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: theme === t ? 'var(--primary)' : 'var(--text-muted)' }}
                    title={`Theme: ${t}`}>
                    {t === 'light' ? '☀️' : '🌙'}
                  </button>
                ))}
              </div>
              
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', position: 'relative', cursor: 'pointer' }}>
                <Bell size={20} />
                <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></span>
              </button>

              <div style={{ height: 32, width: 1, background: 'var(--surface-border)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right', display: 'none' }} className="user-text">
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>Admin User</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>ONLINE</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                  AD
                </div>
              </div>
            </div>
          </header>

          <div style={{ padding: '32px 24px', flex: 1, overflowY: 'auto' }}>
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar { transform: translateX(0) !important; }
          .md-main { margin-left: 260px; }
          .md-menu-btn { display: none !important; }
          .user-text { display: block !important; }
        }
        @media (max-width: 640px) {
          .search-bar { display: none !important; }
        }
      `}</style>
    </ThemeContext.Provider>
  );
}
