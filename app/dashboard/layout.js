'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, createContext, useContext, Suspense, useRef } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Users, Target, Activity, FileText, LayoutDashboard, Settings, Layers, Menu, Bell, Search, ClipboardList, CalendarCheck, MessageSquare, PlusCircle, X, LogOut, Sun, Moon, ChevronRight, ChevronDown, ChevronsLeft, ChevronsRight, Type, Trophy, GraduationCap, Megaphone, DollarSign, UserCheck, BarChart3, Monitor, Minus, Plus, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '../logo.png';

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', desc: 'Overview of all operations and key metrics' },
  { icon: Users, label: 'Employees', path: '/dashboard/employees', desc: 'Manage employee records and profiles' },
  { icon: UserCheck, label: 'Candidate Roster', path: '/dashboard/candidates', desc: 'View self-registered candidates and onboard them as employees' },
  { icon: Layers, label: 'Departments', path: '/dashboard/departments', desc: 'Manage company departments and units' },
  // ── Department Groups (expandable) ──
  {
    icon: DollarSign, label: 'Sales', desc: 'Sales team management and lead pipeline',
    isDeptGroup: true,
    color: '#10b981',
    children: [
      { icon: Target, label: 'Lead Management', path: '/dashboard/leads', desc: 'View and manage all customer leads' },
      { icon: PlusCircle, label: 'Add Leads', path: '/dashboard/add-leads', desc: 'Create and assign new leads manually' },
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Sales', desc: 'Review sales team daily reports' },
    ],
  },
  {
    icon: Megaphone, label: 'Marketing', desc: 'Marketing campaigns and content management',
    isDeptGroup: true,
    color: '#8b5cf6',
    children: [
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Marketing', desc: 'Review marketing team submissions' },
    ],
  },
  {
    icon: GraduationCap, label: 'Student Ambassador', desc: 'Campus ambassador program management',
    isDeptGroup: true,
    color: '#0ea5e9',
    children: [
      { icon: GraduationCap, label: 'Colleges', path: '/dashboard/colleges', desc: 'Manage registered colleges and POC accounts' },
      { icon: UserCheck, label: 'Onboarding Queue', path: '/dashboard/onboarding', desc: 'Review ambassador onboarding requests' },
      { icon: BarChart3, label: 'Activity Monitor', path: '/dashboard/ambassador-activity', desc: 'Monitor ambassador activities across all colleges' },
      { icon: FileText, label: 'Submissions', path: '/dashboard/reports?dept=Student+Ambassador', desc: 'Review ambassador submissions' },
    ],
  },
  // ── General Tools ──
  { icon: ClipboardList, label: 'Task Management', path: '/dashboard/tasks', desc: 'Create, assign, and track employee tasks' },
  { icon: CalendarCheck, label: 'Attendance', path: '/dashboard/attendance', desc: 'View employee attendance and manage leave requests' },
  { icon: MessageSquare, label: 'Suggestions', path: '/dashboard/suggestions', desc: 'Review suggestions and feedback from employees' },
  { icon: AlertTriangle, label: 'Alerts', path: '/dashboard/alerts', desc: 'Issue warnings and critical alerts to employees' },
  { icon: Bell, label: 'Notifications', path: '/dashboard/notifications', desc: 'View system notifications and updates' },
  { icon: ShieldCheck, label: 'Admin Management', path: '/dashboard/admin-management', superOnly: true, desc: 'Manage portal administrators and their roles' },
  { icon: Trophy, label: 'Leaderboard', path: '/dashboard/leaderboard', desc: 'View employee performance rankings' },
  { icon: Award, label: 'Certificates', path: '/dashboard/certificates', desc: 'Create and share professional certificates' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings', desc: 'Configure portal settings and your profile' },
];

function DashboardLayoutInner({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Helper: check if nav item path matches current URL (supports query params)
  const isNavActive = (itemPath) => {
    if (!itemPath) return false;
    const [basePath, query] = itemPath.split('?');
    if (query) {
      // Path with query params — must match both pathname and the query param
      const params = new URLSearchParams(query);
      if (pathname !== basePath) return false;
      for (const [key, val] of params) {
        if (searchParams.get(key) !== val) return false;
      }
      return true;
    }
    // Regular path matching
    return pathname === itemPath || (itemPath !== '/dashboard' && pathname.startsWith(itemPath));
  };
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [themeMode, setThemeMode] = useState('dark');
  const [themeColor, setThemeColor] = useState('beige');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [fontSize, setFontSize] = useState(15); // default to 15px
  const [hoveredTab, setHoveredTab] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [fontSizeDropdownOpen, setFontSizeDropdownOpen] = useState(false);

  const themeRef = useRef(null);
  const colorRef = useRef(null);
  const fontSizeRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login');
      else {
        setUser(d.user);
        setLoading(false);
        const fetchUnread = () => fetch('/api/admin-notifications').then(r => r.json()).then(nd => {
          setUnreadCount((nd.notifications || []).filter(n => !n.read).length);
        }).catch(() => {});
        
        fetchUnread();
        
        const poll = setInterval(fetchUnread, 45000);
        
        const handleNotifRead = () => fetchUnread();
        window.addEventListener('notificationsRead', handleNotifRead);

        fetch('/api/admin-settings').then(r => r.json()).then(sd => {
          if (sd.settings?.profilePicture) {
            setUser(u => ({ ...u, profilePicture: sd.settings.profilePicture }));
          }
          if (sd.settings?.displayName) {
            setUser(u => ({ ...u, name: sd.settings.displayName }));
          }
          if (sd.settings?.themeMode) setThemeMode(sd.settings.themeMode);
          if (sd.settings?.themeColor) setThemeColor(sd.settings.themeColor);
          if (sd.settings?.fontSize) setFontSize(sd.settings.fontSize);
        }).catch(() => {});
        
        return () => {
          clearInterval(poll);
          window.removeEventListener('notificationsRead', handleNotifRead);
        };
      }
    }).catch(() => router.push('/login'));
    const savedMode = localStorage.getItem('admin_themeMode');
    const savedColor = localStorage.getItem('admin_themeColor');
    const savedCollapsed = localStorage.getItem('admin_sidebarCollapsed');
    const savedFontSize = localStorage.getItem('admin_fontSize');
    if (savedMode) setThemeMode(savedMode);
    if (savedColor) setThemeColor(savedColor);
    else document.documentElement.setAttribute('data-theme', 'dark');
    if (savedCollapsed === 'true') setCollapsed(true);
    if (savedFontSize) {
      if (savedFontSize === 'small') setFontSize(13);
      else if (savedFontSize === 'medium') setFontSize(15);
      else if (savedFontSize === 'large') setFontSize(17);
      else {
        const parsed = parseInt(savedFontSize, 10);
        if (!isNaN(parsed)) setFontSize(parsed);
      }
    }
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeDropdownOpen(false);
      }
      if (colorRef.current && !colorRef.current.contains(event.target)) {
        setColorDropdownOpen(false);
      }
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target)) {
        setFontSizeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let mode = themeMode;
    if (themeMode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    let apply = themeColor;
    if (mode === 'dark') {
      apply = themeColor === 'beige' ? 'dark' : `${themeColor}-dark`;
    } else if (themeColor !== 'beige') {
      apply = themeColor;
    } else {
      apply = 'light';
    }
    document.documentElement.setAttribute('data-theme', apply);
    localStorage.setItem('admin_themeMode', themeMode);
    localStorage.setItem('admin_themeColor', themeColor);
  }, [themeMode, themeColor]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Persist collapsed state
  useEffect(() => { localStorage.setItem('admin_sidebarCollapsed', collapsed); }, [collapsed]);

  // Font size accessibility
  useEffect(() => {
    let sizePx = '15px';
    if (typeof fontSize === 'number') {
      sizePx = `${fontSize}px`;
    } else if (fontSize === 'small') {
      sizePx = '13px';
    } else if (fontSize === 'medium') {
      sizePx = '15px';
    } else if (fontSize === 'large') {
      sizePx = '17px';
    } else {
      const parsed = parseInt(fontSize, 10);
      sizePx = !isNaN(parsed) ? `${parsed}px` : '15px';
    }
    document.documentElement.style.fontSize = sizePx;
    localStorage.setItem('admin_fontSize', fontSize.toString());
  }, [fontSize]);

  // Department group expand/collapse state (must be before early return)
  const [expandedGroups, setExpandedGroups] = useState({});

  // Auto-expand department group if current page is inside it
  useEffect(() => {
    const autoExpand = {};
    navItems.forEach(item => {
      if (item.isDeptGroup && item.children) {
        const hasActivePath = item.children.some(child => isNavActive(child.path));
        if (hasActivePath) autoExpand[item.label] = true;
      }
    });
    setExpandedGroups(prev => ({ ...prev, ...autoExpand }));
  }, [pathname]);

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
        }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Loading Cluso CRM...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const filteredNav = navItems.filter(item => !item.superOnly || user?.role === 'Super Admin');

  return (
    <ThemeContext.Provider value={{ theme: themeMode, setTheme: setThemeMode, themeColor, setThemeColor, fontSize, setFontSize, user, setUser }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)', backgroundAttachment: 'fixed' }}>

        {/* ═══════ MOBILE OVERLAY ═══════ */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 40 }}
            />
          )}
          {hoveredTab && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                left: mousePos.x + 15,
                top: mousePos.y + 15,
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                padding: '8px 12px',
                borderRadius: 8,
                boxShadow: 'var(--shadow-md)',
                zIndex: 9999,
                pointerEvents: 'none',
                maxWidth: 250,
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{hoveredTab.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{hoveredTab.desc}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ SIDEBAR ═══════ */}
        <aside className="sidebar" style={{
          width: collapsed ? 68 : 260,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRight: '1px solid var(--sidebar-border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : undefined,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: mobileOpen ? '8px 0 40px rgba(0,0,0,0.2)' : 'none',
          overflow: 'hidden',
        }}>
          {/* Logo */}
          <div style={{
            padding: collapsed ? '20px 14px' : '20px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: '1px solid var(--sidebar-border)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              <img src={logoImg.src} alt="Logo" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
            </div>
            {!collapsed && (
              <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                Cluso Admin
              </span>
            )}
            {/* Mobile close button */}
            <button className="mobile-close-btn" onClick={() => setMobileOpen(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'none', padding: 4,
            }}>
              <X size={20} />
            </button>
          </div>

          {/* Section Label */}
          {!collapsed && (
            <div style={{
              padding: '20px 20px 8px', fontSize: '0.68rem', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Navigation
            </div>
          )}
          {collapsed && <div style={{ height: 12 }} />}

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: collapsed ? '0 6px' : '0 10px', overflowY: 'auto' }}>
            {filteredNav.map((item) => {
              // ── EXPANDABLE DEPARTMENT GROUP ──
              if (item.isDeptGroup && item.children) {
                const isOpen = !!expandedGroups[item.label];
                const hasActiveChild = item.children.some(child => isNavActive(child.path));

                return (
                  <div key={item.label} style={{ marginBottom: 2 }}>
                    {/* Group Header — clickable to expand/collapse */}
                    <button
                      onClick={() => toggleGroup(item.label)}
                      onMouseEnter={() => setHoveredTab(item)}
                      onMouseLeave={() => setHoveredTab(null)}
                      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
                        padding: collapsed ? '10px 0' : '9px 12px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        width: '100%', border: 'none', cursor: 'pointer',
                        color: hasActiveChild ? 'var(--primary)' : 'var(--sidebar-text)',
                        background: hasActiveChild && !isOpen ? 'var(--sidebar-active)' : 'transparent',
                        fontWeight: hasActiveChild ? 600 : 500, fontSize: '0.84rem', borderRadius: 10,
                        transition: 'all 0.2s ease', position: 'relative',
                      }}
                    >
                      {hasActiveChild && (
                        <div style={{
                          position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3,
                          borderRadius: 2, background: item.color || 'var(--primary)',
                          boxShadow: `0 0 8px ${item.color || 'var(--primary-glow)'}40`,
                        }} />
                      )}
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: `${item.color || 'var(--primary)'}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <item.icon size={14} color={item.color || 'var(--primary)'} />
                      </div>
                      {!collapsed && (
                        <>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>{item.label}</span>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                          </motion.div>
                        </>
                      )}
                    </button>

                    {/* Sub-items (collapsible) */}
                    <AnimatePresence initial={false}>
                      {isOpen && !collapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            marginLeft: 18, paddingLeft: 14,
                            borderLeft: `2px solid ${item.color || 'var(--primary)'}30`,
                          }}>
                            {item.children.map(child => {
                              const childActive = isNavActive(child.path);
                              return (
                                <Link key={child.path} href={child.path}
                                  onMouseEnter={() => setHoveredTab(child)}
                                  onMouseLeave={() => setHoveredTab(null)}
                                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '7px 10px', textDecoration: 'none',
                                    color: childActive ? item.color || 'var(--primary)' : 'var(--sidebar-text)',
                                    background: childActive ? `${item.color || 'var(--primary)'}12` : 'transparent',
                                    fontWeight: childActive ? 600 : 450, fontSize: '0.8rem', borderRadius: 8,
                                    marginBottom: 1, transition: 'all 0.2s ease',
                                    position: 'relative',
                                  }}
                                >
                                  <child.icon size={15} style={{ flexShrink: 0, opacity: 0.75 }} />
                                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              // ── REGULAR NAV ITEM ──
              const active = isNavActive(item.path);
              return (
                <Link key={item.path} href={item.path} 
                  onMouseEnter={() => setHoveredTab(item)}
                  onMouseLeave={() => setHoveredTab(null)}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                  style={{
                  display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12,
                  padding: collapsed ? '10px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  textDecoration: 'none',
                  color: active ? 'var(--primary)' : 'var(--sidebar-text)',
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  fontWeight: active ? 600 : 500, fontSize: '0.84rem', borderRadius: 10,
                  marginBottom: 2, transition: 'all 0.2s ease', position: 'relative',
                  backdropFilter: active ? 'blur(8px)' : 'none',
                }}>
                  {active && (
                    <div style={{
                      position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3,
                      borderRadius: 2, background: 'var(--primary)',
                      boxShadow: '0 0 8px var(--primary-glow)',
                    }} />
                  )}
                  <item.icon size={17} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  {!collapsed && item.path === '/dashboard/notifications' && unreadCount > 0 && (
                    <span style={{
                      marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9,
                      background: 'var(--danger)', color: '#fff', fontSize: '0.6rem',
                      fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px',
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle */}
          <div className="collapse-toggle-wrap" style={{ padding: '8px 10px', borderTop: '1px solid var(--sidebar-border)' }}>
            <button onClick={() => setCollapsed(c => !c)} style={{
              width: '100%', padding: collapsed ? '8px 0' : '8px 12px',
              background: 'var(--surface-glass)', border: '1px solid var(--surface-border)',
              color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, fontSize: '0.78rem', fontWeight: 500, transition: 'all 0.2s',
            }} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> <span>Collapse</span></>}
            </button>
          </div>

          {/* User Profile Footer */}
          <div style={{
            padding: collapsed ? '12px 10px' : '14px 16px',
            borderTop: '1px solid var(--sidebar-border)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--surface-glass)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden',
              boxShadow: '0 2px 8px var(--primary-glow)',
            }}>
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.name?.charAt(0) || 'A'
              )}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{user?.name}</p>
                  <p style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 600, margin: 0 }}>{user?.role}</p>
                </div>
                <button onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/login');
                }} style={{
                  background: 'var(--surface)', border: '1px solid var(--surface-border)',
                  color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8,
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }} title="Logout">
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ═══════ MAIN SCREEN ═══════ */}
        <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin 0.35s' }}>

          {/* ═══════ TOPBAR ═══════ */}
          <header style={{
            height: 64,
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            {/* Left side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} style={{
                background: 'var(--surface)', border: '1px solid var(--surface-border)',
                color: 'var(--text)', cursor: 'pointer', borderRadius: 10,
                width: 38, height: 38, display: 'none', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Menu size={18} />
              </button>
              <div className="search-bar" style={{
                background: 'var(--surface)',
                border: '1px solid var(--surface-border)',
                borderRadius: 24,
                padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8,
                width: 280, backdropFilter: 'blur(12px)',
                transition: 'all 0.3s',
              }}>
                <Search size={15} color="var(--text-muted)" />
                <input placeholder="Search..." style={{ border: 'none', background: 'transparent', padding: 0, width: '100%', fontSize: '0.84rem', backdropFilter: 'none' }} />
              </div>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Color Palette Dropdown */}
              {(() => {
                const activeColorObj = [
                  { key: 'beige', color: '#c29b76', label: 'Beige Theme' },
                  { key: 'seafoam', color: '#5b9e8c', label: 'Seafoam Theme' },
                  { key: 'rose', color: '#c97a8e', label: 'Rose Theme' },
                ].find(c => c.key === themeColor) || { key: 'beige', color: '#c29b76', label: 'Beige Theme' };
                return (
                  <div ref={colorRef} onMouseEnter={() => setColorDropdownOpen(true)} onMouseLeave={() => setColorDropdownOpen(false)} style={{ position: 'relative' }}>
                    <button
                      onClick={() => {
                        setColorDropdownOpen(!colorDropdownOpen);
                        setThemeDropdownOpen(false);
                        setFontSizeDropdownOpen(false);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface)',
                        border: '1px solid var(--surface-border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      title={`Color Palette: ${activeColorObj.label}`}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: activeColorObj.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                    </button>

                    {colorDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% - 4px)',
                        right: 0,
                        padding: '12px 0px',
                        zIndex: 100,
                      }}>
                        <div style={{
                          width: 200,
                          background: 'var(--surface)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 12,
                          boxShadow: 'var(--shadow-lg)',
                          padding: 6,
                          backdropFilter: 'blur(24px)',
                        }}>
                          {[
                            { key: 'beige', color: '#c29b76', label: 'Beige Theme' },
                            { key: 'seafoam', color: '#5b9e8c', label: 'Seafoam Theme' },
                            { key: 'rose', color: '#c97a8e', label: 'Rose Theme' },
                          ].map(({ key, color, label }) => {
                            const isSelected = themeColor === key;
                            return (
                              <button
                                key={key}
                                onClick={async () => {
                                  setThemeColor(key);
                                  setColorDropdownOpen(false);
                                  await fetch('/api/admin-settings', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'themeColor', themeColor: key }),
                                  });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                                  border: 'none',
                                  borderRadius: 8,
                                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                                  fontSize: '0.8rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'var(--sidebar-active)';
                                }}
                                onMouseLeave={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Theme Mode Dropdown */}
              {(() => {
                const activeModeObj = [
                  { key: 'light', icon: Sun, label: 'Light Mode' },
                  { key: 'system', icon: Monitor, label: 'System Default' },
                  { key: 'dark', icon: Moon, label: 'Dark Mode' },
                ].find(m => m.key === themeMode) || { key: 'system', icon: Monitor, label: 'System Default' };
                const ActiveIcon = activeModeObj.icon;
                return (
                  <div ref={themeRef} onMouseEnter={() => setThemeDropdownOpen(true)} onMouseLeave={() => setThemeDropdownOpen(false)} style={{ position: 'relative' }}>
                    <button
                      onClick={() => {
                        setThemeDropdownOpen(!themeDropdownOpen);
                        setColorDropdownOpen(false);
                        setFontSizeDropdownOpen(false);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      title={`Theme Mode: ${activeModeObj.label}`}
                    >
                      <ActiveIcon size={16} />
                    </button>

                    {themeDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% - 4px)',
                        right: 0,
                        padding: '12px 0px',
                        zIndex: 100,
                      }}>
                        <div style={{
                          width: 180,
                          background: 'var(--surface)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: 12,
                          boxShadow: 'var(--shadow-lg)',
                          padding: 6,
                          backdropFilter: 'blur(24px)',
                        }}>
                          {[
                            { key: 'light', icon: Sun, label: 'Light Mode' },
                            { key: 'system', icon: Monitor, label: 'System Default' },
                            { key: 'dark', icon: Moon, label: 'Dark Mode' },
                          ].map(({ key, icon: OptionIcon, label }) => {
                            const isSelected = themeMode === key;
                            return (
                              <button
                                key={key}
                                onClick={async () => {
                                  setThemeMode(key);
                                  setThemeDropdownOpen(false);
                                  await fetch('/api/admin-settings', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'theme', theme: key }),
                                  });
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  width: '100%',
                                  padding: '8px 12px',
                                  background: isSelected ? 'var(--sidebar-active)' : 'transparent',
                                  border: 'none',
                                  borderRadius: 8,
                                  color: isSelected ? 'var(--primary)' : 'var(--text)',
                                  fontSize: '0.8rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'var(--sidebar-active)';
                                }}
                                onMouseLeave={e => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <OptionIcon size={14} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Font Size Dropdown */}
              <div ref={fontSizeRef} onMouseEnter={() => setFontSizeDropdownOpen(true)} onMouseLeave={() => setFontSizeDropdownOpen(false)} style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setFontSizeDropdownOpen(!fontSizeDropdownOpen);
                    setThemeDropdownOpen(false);
                    setColorDropdownOpen(false);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="Font Size"
                >
                  <Type size={16} />
                </button>

                {fontSizeDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% - 4px)',
                    right: 0,
                    padding: '12px 0px',
                    zIndex: 100,
                  }}>
                    <div style={{
                      width: 200,
                      background: 'var(--surface)',
                      border: '1px solid var(--surface-border)',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-lg)',
                      padding: 12,
                      backdropFilter: 'blur(24px)',
                    }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Font Size</p>
                      
                      {(() => {
                        const fontSizes = [
                          { size: 12, label: 'Smallest' },
                          { size: 13, label: 'Extra Small' },
                          { size: 14, label: 'Small' },
                          { size: 15, label: 'Default' },
                          { size: 16, label: 'Medium' },
                          { size: 17, label: 'Medium-Large' },
                          { size: 18, label: 'Large' },
                          { size: 20, label: 'Extra Large' },
                          { size: 22, label: 'XXL' },
                          { size: 24, label: 'Largest' }
                        ];
                        
                        let currentIndex = fontSizes.findIndex(f => f.size === fontSize);
                        if (currentIndex === -1) {
                          let sizeVal = 15;
                          if (fontSize === 'small') sizeVal = 13;
                          else if (fontSize === 'medium') sizeVal = 15;
                          else if (fontSize === 'large') sizeVal = 17;
                          else {
                            const parsed = parseInt(fontSize, 10);
                            if (!isNaN(parsed)) sizeVal = parsed;
                          }
                          currentIndex = fontSizes.findIndex(f => f.size === sizeVal);
                          if (currentIndex === -1) currentIndex = 3;
                        }

                        const currentObj = fontSizes[currentIndex];

                        const changeSize = async (newIndex) => {
                          if (newIndex >= 0 && newIndex < fontSizes.length) {
                            const nextObj = fontSizes[newIndex];
                            setFontSize(nextObj.size);
                            await fetch('/api/admin-settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'fontSize', fontSize: nextObj.size }),
                            });
                          }
                        };

                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-hover)', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                            <button
                              disabled={currentIndex === 0}
                              onClick={() => changeSize(currentIndex - 1)}
                              style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                background: 'var(--surface)',
                                border: '1px solid var(--surface-border)',
                                color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text)',
                                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                                opacity: currentIndex === 0 ? 0.5 : 1,
                                transition: 'all 0.15s',
                              }}
                            >
                              <Minus size={12} />
                            </button>

                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', textAlign: 'center', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {currentObj.label}
                            </span>

                            <button
                              disabled={currentIndex === fontSizes.length - 1}
                              onClick={() => changeSize(currentIndex + 1)}
                              style={{
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                background: 'var(--surface)',
                                border: '1px solid var(--surface-border)',
                                color: currentIndex === fontSizes.length - 1 ? 'var(--text-muted)' : 'var(--text)',
                                cursor: currentIndex === fontSizes.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: currentIndex === fontSizes.length - 1 ? 0.5 : 1,
                                transition: 'all 0.15s',
                              }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Notification bell */}
              <button onClick={() => router.push('/dashboard/notifications')} style={{
                background: 'var(--surface)', border: '1px solid var(--surface-border)',
                color: 'var(--text-muted)', position: 'relative', cursor: 'pointer',
                borderRadius: 10, width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 17, height: 17, borderRadius: '50%',
                    background: 'var(--danger)', color: '#fff',
                    fontSize: '0.58rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 0 8px rgba(226, 125, 114, 0.4)',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              <div style={{ height: 28, width: 1, background: 'var(--surface-border)', margin: '0 4px' }} />

              {/* Profile avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="user-text" style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>{user?.name || 'Admin'}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, margin: 0 }}>{user?.role || 'ADMIN'}</p>
                </div>
                <div onClick={() => router.push('/dashboard/settings')} style={{
                  width: 38, height: 38, borderRadius: 12, cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  border: '2px solid var(--surface-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden',
                  transition: 'all 0.25s', boxShadow: '0 2px 8px var(--primary-glow)',
                }}>
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user?.name?.charAt(0) || 'A'
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ═══════ CONTENT AREA ═══════ */}
          <div className="content-area" style={{ padding: '28px 24px', flex: 1, overflowY: 'auto' }}>
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .sidebar { transform: translateX(0) !important; width: ${collapsed ? 68 : 260}px !important; }
          .main-content { margin-left: ${collapsed ? 68 : 260}px !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-close-btn { display: none !important; }
          .user-text { display: block !important; }
          .collapse-toggle-wrap { display: block; }
        }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); width: 280px !important; }
          .main-content { margin-left: 0 !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-close-btn { display: block !important; }
          .user-text { display: none !important; }
          .theme-pills { display: none !important; }
          .content-area { padding: 16px 12px !important; }
          .search-bar { width: 180px !important; }
          .collapse-toggle-wrap { display: none !important; }
        }
        @media (max-width: 480px) {
          .search-bar { display: none !important; }
          .content-area { padding: 12px 10px !important; }
        }

        /* Sidebar link hover */
        nav a:hover {
          background: var(--sidebar-active) !important;
          color: var(--primary) !important;
        }
        button:hover { filter: brightness(1.05); }
      `}</style>
    </ThemeContext.Provider>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-gradient)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading...</p>
      </div>
    }>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
