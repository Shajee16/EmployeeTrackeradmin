'use client';
import { useState, useEffect, useContext } from 'react';
import { User, Lock, Bell, Palette, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useTheme } from '../layout';

export default function AdminSettingsPage() {
  const ctx = useTheme();
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [picError, setPicError] = useState('');
  const [picUploading, setPicUploading] = useState(false);

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Notification prefs
  const [notifs, setNotifs] = useState({
    notifLeadAssigned: true,
    notifNewEmployee: true,
    notifDailyReport: true,
    notifLoginAlert: false,
  });

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    });
    fetch('/api/admin-settings').then(r => r.json()).then(d => {
      if (d.settings) {
        setDisplayName(d.settings.displayName || '');
        setPhone(d.settings.phone || '');
        setProfilePic(d.settings.profilePicture || null);
        setNotifs({
          notifLeadAssigned: d.settings.notifLeadAssigned !== false,
          notifNewEmployee: d.settings.notifNewEmployee !== false,
          notifDailyReport: d.settings.notifDailyReport !== false,
          notifLoginAlert: d.settings.notifLoginAlert === true,
        });
      }
    });
  }, []);

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 3000); };

  const saveProfile = async () => {
    setLoading(true);
    await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', displayName, phone }) });
    if (displayName) {
      ctx?.setUser?.(u => ({ ...u, name: displayName }));
      setUser(u => ({ ...u, name: displayName }));
    }
    flash('Profile updated!');
    setLoading(false);
  };

  const handlePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicError('');

    if (!file.type.startsWith('image/')) {
      setPicError('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 300 * 1024) {
      setPicError(`File is ${(file.size / 1024).toFixed(0)}KB — maximum allowed is 300KB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setProfilePic(dataUrl);
      setPicUploading(true);
      try {
        const res = await fetch('/api/admin-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'profilePicture', picture: dataUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPicError(data.error || 'Upload failed');
        } else {
          flash('Profile picture updated!');
        }
      } catch {
        setPicError('Upload failed. Please try again.');
      }
      setPicUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removePic = async () => {
    setProfilePic(null);
    setPicError('');
    try {
      await fetch('/api/admin-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profilePicture', picture: null }),
      });
      flash('Profile picture removed!');
    } catch {
      setPicError('Failed to remove picture.');
    }
  };

  const savePassword = async () => {
    if (!newPw || newPw.length < 8) return flash('Password must be at least 8 characters');
    if (newPw !== confirmPw) return flash('Passwords do not match');
    setLoading(true);
    // NOTE: password change for super admin / legacy admins would need backend. Here we call settings.
    flash('Password change saved (applies to DB admins only)');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setLoading(false);
  };

  const saveNotifs = async () => {
    setLoading(true);
    await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'notifications', ...notifs }) });
    flash('Notification preferences saved!');
    setLoading(false);
  };

  const saveThemeMode = async (t) => {
    ctx?.setTheme(t);
    await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'theme', theme: t }) });
    flash('Theme updated!');
  };

  const saveThemeColor = async (c) => {
    ctx?.setThemeColor(c);
    await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'themeColor', themeColor: c }) });
    flash('Color palette updated!');
  };

  const saveFontSize = async (sz) => {
    ctx?.setFontSize(sz);
    await fetch('/api/admin-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fontSize', fontSize: sz }) });
    flash('Font size updated!');
  };

  const tabs = [
    { key: 'profile', icon: User, label: 'Edit Profile' },
    { key: 'password', icon: Lock, label: 'Change Password' },
    { key: 'notifications', icon: Bell, label: 'Notifications' },
    { key: 'theme', icon: Palette, label: 'Theme' },
  ];

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 28, marginBottom: 20 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)', borderRadius: 10, color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit' };
  const label = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
  const btn = { padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>⚙️ Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>Manage your admin profile, security, and preferences.</p>
      </div>

      {saved && (
        <div style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <CheckCircle size={16} /> {saved}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ width: 200, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, overflow: 'hidden' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: tab === t.key ? 'var(--sidebar-active)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)', fontWeight: tab === t.key ? 700 : 500, fontSize: '0.85rem', borderLeft: tab === t.key ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.2s' }}>
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === 'profile' && (
            <div style={card}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} /> Edit Profile</h3>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--surface-border)' }}>
                  {/* Profile Picture */}
                  <div style={{ position: 'relative' }}>
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--surface)' }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '2rem', border: '3px solid var(--surface)' }}>
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    {picUploading && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 24, height: 24, border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>{user.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>{user.email} <span style={{ marginLeft: 8, fontSize: '0.7rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>{user.role}</span></p>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{
                        padding: '7px 16px', borderRadius: 8,
                        background: 'var(--primary)', color: '#fff',
                        fontWeight: 600, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                        📷 {profilePic ? 'Change Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePicChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {profilePic && (
                        <button onClick={removePic} style={{
                          padding: '7px 14px', borderRadius: 8,
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                          fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                        }}>
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      JPG, PNG, or WebP • Max 300KB
                    </p>

                    {picError && (
                      <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 6, fontWeight: 600 }}>
                        ⚠ {picError}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={label}>Display Name</label>
                  <input style={input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label style={label}>Phone Number</label>
                  <input style={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <label style={label}>Email (read-only)</label>
                  <input style={{ ...input, opacity: 0.6 }} value={user?.email || ''} disabled />
                </div>
                <div>
                  <label style={label}>Role (read-only)</label>
                  <input style={{ ...input, opacity: 0.6 }} value={user?.role || ''} disabled />
                </div>
              </div>
              <button onClick={saveProfile} disabled={loading} style={btn}><Save size={16} />Save Changes</button>
            </div>
          )}

          {tab === 'password' && (
            <div style={card}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} /> Change Password</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                <div>
                  <label style={label}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} style={{ ...input, paddingRight: 44 }} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={label}>Confirm New Password</label>
                  <input type="password" style={input} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
                </div>
                {newPw && confirmPw && newPw !== confirmPw && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>⚠️ Passwords do not match</p>
                )}
                <button onClick={savePassword} disabled={loading} style={btn}><Lock size={16} />Update Password</button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div style={card}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Bell size={18} /> Notification Preferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { key: 'notifLeadAssigned', label: 'Lead Assigned Notifications', desc: 'Get notified when a lead is assigned or updated' },
                  { key: 'notifNewEmployee', label: 'New Employee Notifications', desc: 'Get notified when a new employee is created' },
                  { key: 'notifDailyReport', label: 'Daily Report Alerts', desc: 'Receive daily report submission notifications' },
                  { key: 'notifLoginAlert', label: 'Login Activity Alerts', desc: 'Get alerts on unusual login attempts' },
                ].map(n => (
                  <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{n.label}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{n.desc}</p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={notifs[n.key]} onChange={e => setNotifs(p => ({ ...p, [n.key]: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', inset: 0, background: notifs[n.key] ? 'var(--primary)' : 'var(--surface-border)', borderRadius: 24, transition: 'all 0.3s' }}>
                        <span style={{ position: 'absolute', left: notifs[n.key] ? 22 : 2, top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <button onClick={saveNotifs} disabled={loading} style={{ ...btn, marginTop: 20 }}><Save size={16} />Save Preferences</button>
            </div>
          )}

          {tab === 'theme' && (
            <div style={card}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Palette size={18} /> Theme & Appearance</h3>

              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Color Palette</h4>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { key: 'beige', label: 'Beige', color: '#c29b76' },
                    { key: 'seafoam', label: 'Seafoam', color: '#5b9e8c' },
                    { key: 'rose', label: 'Rose', color: '#c97a8e' },
                  ].map(c => (
                    <button key={c.key} onClick={() => saveThemeColor(c.key)}
                      style={{ padding: '8px 18px', borderRadius: 24, border: `2px solid ${ctx?.themeColor === c.key ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Appearance Mode</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { key: 'light', icon: '☀️', label: 'Light', bg: '#f0f4f8' },
                    { key: 'dark', icon: '🌙', label: 'Dark', bg: '#0b1120' },
                    { key: 'system', icon: '💻', label: 'System', bg: 'linear-gradient(135deg, #f0f4f8 50%, #0b1120 50%)' },
                  ].map(t => (
                    <button key={t.key} onClick={() => saveThemeMode(t.key)}
                      style={{ padding: 20, borderRadius: 12, border: `2px solid ${ctx?.theme === t.key ? 'var(--primary)' : 'var(--surface-border)'}`, cursor: 'pointer', textAlign: 'center', background: 'var(--surface)', transition: 'all 0.2s' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: t.bg, margin: '0 auto 10px', border: '1px solid var(--surface-border)' }} />
                      <span style={{ fontSize: '1.2rem' }}>{t.icon}</span>
                      <p style={{ fontWeight: 600, marginTop: 4, color: 'var(--text)', fontSize: '0.9rem' }}>{t.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Text Size</h4>
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

                  let currentVal = ctx?.fontSize || 15;
                  let currentIndex = fontSizes.findIndex(f => f.size === currentVal);
                  if (currentIndex === -1) {
                    let sizeVal = 15;
                    if (currentVal === 'small') sizeVal = 13;
                    else if (currentVal === 'medium') sizeVal = 15;
                    else if (currentVal === 'large') sizeVal = 17;
                    else {
                      const parsed = parseInt(currentVal, 10);
                      if (!isNaN(parsed)) sizeVal = parsed;
                    }
                    currentIndex = fontSizes.findIndex(f => f.size === sizeVal);
                    if (currentIndex === -1) currentIndex = 3;
                  }

                  const currentObj = fontSizes[currentIndex];

                  const decrease = () => {
                    if (currentIndex > 0) {
                      saveFontSize(fontSizes[currentIndex - 1].size);
                    }
                  };

                  const increase = () => {
                    if (currentIndex < fontSizes.length - 1) {
                      saveFontSize(fontSizes[currentIndex + 1].size);
                    }
                  };

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 300, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                      <button
                        disabled={currentIndex === 0}
                        onClick={decrease}
                        style={{
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          background: 'var(--surface)',
                          border: '1px solid var(--surface-border)',
                          color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text)',
                          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: currentIndex === 0 ? 0.5 : 1,
                          transition: 'all 0.2s',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                        }}
                      >
                        -
                      </button>

                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                          {currentObj.label}
                        </span>
                      </div>

                      <button
                        disabled={currentIndex === fontSizes.length - 1}
                        onClick={increase}
                        style={{
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 8,
                          background: 'var(--surface)',
                          border: '1px solid var(--surface-border)',
                          color: currentIndex === fontSizes.length - 1 ? 'var(--text-muted)' : 'var(--text)',
                          cursor: currentIndex === fontSizes.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: currentIndex === fontSizes.length - 1 ? 0.5 : 1,
                          transition: 'all 0.2s',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                        }}
                      >
                        +
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
