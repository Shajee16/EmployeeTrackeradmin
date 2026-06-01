'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Shield, Send, GraduationCap, MapPin, Search, X, Mail, Phone, Calendar, Check, Copy, ArrowLeft, Award, Activity, FileCheck, ExternalLink } from 'lucide-react';

export default function AdminCollegesPage() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pocName, setPocName] = useState('');
  const [pocEmail, setPocEmail] = useState('');
  const [pocPassword, setPocPassword] = useState('Welcome@2026');
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Interactive View States
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [copiedText, setCopiedText] = useState('');

  // Member Profile View States
  const [selectedMember, setSelectedMember] = useState(null);
  const [loadingMemberProfile, setLoadingMemberProfile] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const fetchAndOpenMemberProfile = async (userId) => {
    setLoadingMemberProfile(true);
    try {
      const res = await fetch(`/api/admin-colleges/member-profile?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedMember(json);
      } else {
        console.error('Failed to fetch member profile');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMemberProfile(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await fetch('/api/admin-colleges');
      if (res.ok) {
        const json = await res.json();
        const collegeList = json.colleges || [];
        setColleges(collegeList);
        
        // Keep selected college modal data fresh in case new members are added
        if (selectedCollege) {
          const fresh = collegeList.find(c => (c.id || c._id) === (selectedCollege.id || selectedCollege._id));
          if (fresh) setSelectedCollege(fresh);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/admin-colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, code, city, state, pocName, pocEmail, pocPassword
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setName('');
        setCode('');
        setCity('');
        setState('');
        setPocName('');
        setPocEmail('');
        setPocPassword('Welcome@2026');
        fetchColleges();
      } else {
        setError(data.error || 'Failed to register college account');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = colleges.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.code?.toLowerCase().includes(search.toLowerCase()) ||
    c.pocEmail?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading Colleges...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>College Chapters Management</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Register and manage colleges, and allocate Point of Contact (POC) accounts.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }} className="grid-split-tablet">
        {/* LEFT COLUMN: College List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Registered Chapters ({colleges.length})</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--surface-border)', width: 220 }}>
                <Search size={14} color="var(--text-muted)" />
                <input 
                  placeholder="Filter colleges..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.8rem', width: '100%', outline: 'none' }}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No colleges matching your search.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(c => (
                  <motion.div
                    key={c.id || c._id}
                    onClick={() => setSelectedCollege(c)}
                    whileHover={{ scale: 1.012, x: 2, background: 'var(--bg-primary, #fcfbf9)' }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      padding: '16px 20px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 14,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      flexWrap: 'wrap',
                      cursor: 'pointer',
                      border: '1px solid var(--surface-border)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.01)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    className="college-card-hover"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <GraduationCap size={16} />
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name} ({c.code})</h4>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} /> {c.city}, {c.state}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          👤 POC: <strong>{c.pocName}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                          <Users size={12} /> {c.members?.length || 0} {c.members?.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>→</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Create Form */}
        <div className="card" style={{ padding: 24, alignSelf: 'start' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Plus size={18} color="var(--primary)" />
            Register College & POC
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>College Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Indian Institute of Technology, Delhi" 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>College Code *</label>
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  placeholder="e.g. IITD" 
                  required 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>City</label>
                <input 
                  type="text" 
                  value={city} 
                  onChange={e => setCity(e.target.value)} 
                  placeholder="e.g. New Delhi" 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>State</label>
              <input 
                type="text" 
                value={state} 
                onChange={e => setState(e.target.value)} 
                placeholder="e.g. Delhi" 
              />
            </div>

            <div style={{ height: 1, background: 'var(--surface-border)', margin: '10px 0' }} />

            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Point of Contact (POC) Account</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>POC Full Name *</label>
              <input 
                type="text" 
                value={pocName} 
                onChange={e => setPocName(e.target.value)} 
                placeholder="e.g. Dr. Ramesh Kumar" 
                required 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>POC Email *</label>
              <input 
                type="email" 
                value={pocEmail} 
                onChange={e => setPocEmail(e.target.value)} 
                placeholder="e.g. poc.iitd@example.com" 
                required 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>POC Password (Temporary)</label>
              <input 
                type="text" 
                value={pocPassword} 
                onChange={e => setPocPassword(e.target.value)} 
              />
            </div>

            {error && (
              <div style={{ fontSize: '0.78rem', color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: '10px 14px', borderRadius: 8 }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ fontSize: '0.78rem', color: '#10b981', background: 'rgba(16,185,129,0.06)', padding: '10px 14px', borderRadius: 8 }}>
                ✅ College and POC account created successfully!
              </div>
            )}

            <button 
              type="submit" 
              disabled={submitting} 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 8 }}
            >
              {submitting ? 'Registering...' : 'Register College Account'}
            </button>
          </form>
        </div>
      </div>

      {/* ═══════ MODAL: COLLEGE MEMBERS VIEW ═══════ */}
      <AnimatePresence>
        {selectedCollege && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedCollege(null);
              setMemberSearch('');
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                borderRadius: 20,
                border: '1px solid var(--surface-border)',
                width: '100%',
                maxWidth: 680,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
              }}
            >
              {/* Header Gradient */}
              <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                padding: '24px 28px',
                color: '#fff',
                position: 'relative',
              }}>
                <button
                  onClick={() => {
                    setSelectedCollege(null);
                    setMemberSearch('');
                  }}
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <X size={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <GraduationCap size={24} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                      {selectedCollege.name} ({selectedCollege.code})
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', margin: 0, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> {selectedCollege.city}, {selectedCollege.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Info & Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                padding: '20px 28px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--surface-border)'
              }} className="grid-split-tablet">
                {/* POC Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Point of Contact (POC)
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(99,102,241,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}>
                      {selectedCollege.pocName?.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>{selectedCollege.pocName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {selectedCollege.pocEmail}
                        <button
                          onClick={() => handleCopy(selectedCollege.pocEmail)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center' }}
                          title="Copy Email"
                        >
                          {copiedText === selectedCollege.pocEmail ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member count stats */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                      {selectedCollege.members?.length || 0}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                      Total Members
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'var(--surface-border)' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                      {selectedCollege.members?.filter(m => m.status === 'active').length || 0}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                      Active Members
                    </div>
                  </div>
                </div>
              </div>

              {/* Members List Container */}
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} color="var(--primary)" />
                    Chapter Directory
                  </h4>
                  {selectedCollege.members && selectedCollege.members.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--bg-secondary)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      border: '1px solid var(--surface-border)',
                      width: 180,
                    }}>
                      <Search size={12} color="var(--text-muted)" />
                      <input
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.75rem', width: '100%', outline: 'none' }}
                      />
                    </div>
                  )}
                </div>

                {/* Member list rendering */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {(() => {
                    const members = selectedCollege.members || [];
                    const filteredMembers = members.filter(m =>
                      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      m.role?.toLowerCase().includes(memberSearch.toLowerCase())
                    );

                    if (members.length === 0) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)', gap: 12 }}>
                          <GraduationCap size={40} style={{ opacity: 0.25 }} />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>No Members Registered</p>
                            <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0', maxWidth: 300 }}>
                              When student onboarding applications for this college are approved, they will appear here as Campus Ambassadors.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (filteredMembers.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No members matching "{memberSearch}"
                        </div>
                      );
                    }

                    return filteredMembers.map(m => (
                      <motion.div
                        key={m.id}
                        onClick={() => fetchAndOpenMemberProfile(m.id)}
                        whileHover={{ scale: 1.008, x: 2, background: 'var(--bg-primary, #fcfbf9)', borderColor: 'var(--primary)' }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 12,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--surface-border)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: m.role === 'College POC' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, var(--primary), #4f46e5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          }}>
                            {m.name?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.name}</span>
                              <span style={{
                                background: m.role === 'College POC' ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.08)',
                                color: m.role === 'College POC' ? '#10b981' : 'var(--primary)',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 8,
                              }}>
                                {m.role}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2, fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Mail size={11} />
                                {m.email}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopy(m.email); }}
                                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                                  title="Copy Email"
                                >
                                  {copiedText === m.email ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                                </button>
                              </span>
                              {m.phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Phone size={11} />
                                  {m.phone}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(m.phone); }}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                                    title="Copy Phone"
                                  >
                                    {copiedText === m.phone ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                                  </button>
                                </span>
                              )}
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={11} />
                                Joined: {new Date(m.joinedAt || new Date()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                            {m.status || 'active'}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.5 }}>→</span>
                        </div>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ OVERLAY: MEMBER PROFILE FETCH LOADING SPINNER ═══════ */}
      <AnimatePresence>
        {loadingMemberProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
            }}
          >
            <div style={{
              background: 'var(--surface)',
              padding: '20px 30px',
              borderRadius: 14,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '1px solid var(--surface-border)',
            }}>
              <div className="spinner" style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.1)',
                borderTopColor: 'var(--primary)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Loading Member Profile...</span>
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: MEMBER PROFILE DETAILS & ACTIVITIES ═══════ */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedMember(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.93, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.93, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                borderRadius: 24,
                border: '1px solid var(--surface-border)',
                width: '100%',
                maxWidth: 820,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}
            >
              {/* Profile Header Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, var(--primary) 100%)',
                padding: '24px 28px',
                color: '#fff',
                position: 'relative',
              }}>
                <button
                  onClick={() => setSelectedMember(null)}
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <ArrowLeft size={14} /> Back to Directory
                </button>

                <button
                  onClick={() => setSelectedMember(null)}
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                >
                  <X size={18} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '3.5px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}>
                    {selectedMember.member.name?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                        {selectedMember.member.name}
                      </h2>
                      <span style={{
                        background: selectedMember.member.role === 'College POC' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                      }}>
                        {selectedMember.member.role}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', margin: 0, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <GraduationCap size={13} /> {selectedMember.member.collegeName} ({selectedMember.member.collegeCode})
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Panel Content split */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '260px 1fr',
                flex: 1,
                overflow: 'hidden',
              }} className="grid-split-tablet">
                
                {/* LEFT SIDEBAR: Personal Details Card */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRight: '1px solid var(--surface-border)',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  overflowY: 'auto',
                }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    👤 Personal Directory
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Member ID */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Member ID</span>
                      <span style={{ fontSize: '0.78rem', fontFamily: 'Consolas, monospace', fontWeight: 700, background: 'var(--bg-primary)', padding: '3px 8px', borderRadius: 6, display: 'inline-block', width: 'fit-content' }}>
                        {selectedMember.member.id}
                      </span>
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, wordBreak: 'break-all' }}>
                        {selectedMember.member.email}
                        <button
                          onClick={() => handleCopy(selectedMember.member.email)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                          title="Copy Email"
                        >
                          {copiedText === selectedMember.member.email ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        </button>
                      </span>
                    </div>

                    {/* Phone */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Number</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {selectedMember.member.phone || 'Not Provided'}
                        {selectedMember.member.phone && (
                          <button
                            onClick={() => handleCopy(selectedMember.member.phone)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}
                            title="Copy Phone"
                          >
                            {copiedText === selectedMember.member.phone ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                          </button>
                        )}
                      </span>
                    </div>

                    {/* Joined Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Joined Date</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} color="var(--text-muted)" />
                        {new Date(selectedMember.member.joinedAt || new Date()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>

                    {/* Designation */}
                    {selectedMember.member.designation && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Designation</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {selectedMember.member.designation}
                        </span>
                      </div>
                    )}

                    {/* Department */}
                    {selectedMember.member.department && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Department</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {selectedMember.member.department}
                        </span>
                      </div>
                    )}

                    {/* Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Account Status</span>
                      <span className={`badge ${selectedMember.member.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem', width: 'fit-content', padding: '3px 8px' }}>
                        {selectedMember.member.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL: Activities List */}
                <div style={{
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  flex: 1,
                }}>
                  {/* Dynamic XP/Scoreboard Box */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(14,165,233,0.06) 100%)',
                    border: '1px dashed rgba(99,102,241,0.2)',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(99,102,241,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                      }}>
                        <Award size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Chapter Performance
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 2 }}>
                          {(() => {
                            const totalScore = selectedMember.activities.reduce((acc, act) => {
                              const count = parseInt(act.metrics?.count || 1, 10);
                              const pts = POINTS_MAP[act.type] || 0;
                              return acc + (count * pts);
                            }, 0);
                            return `${totalScore} Total XP`;
                          })()}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Actions Logged
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
                        {selectedMember.activities.length} Actions
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={16} color="var(--primary)" />
                    Activity History
                  </h3>

                  {/* Activity Timeline List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {selectedMember.activities.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        padding: '40px 10px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        gap: 10,
                      }}>
                        <Activity size={32} style={{ opacity: 0.2 }} />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>No Logged Activities Yet</p>
                          <p style={{ fontSize: '0.72rem', margin: '4px 0 0 0', maxWidth: 280 }}>
                            This member has not logged any pillar submissions or chapter activities in this portal.
                          </p>
                        </div>
                      </div>
                    ) : (
                      selectedMember.activities.map(act => {
                        const cfg = getActivityDetails(act.type);
                        const count = parseInt(act.metrics?.count || 1, 10);
                        const pointsPer = POINTS_MAP[act.type] || 0;
                        const totalActPoints = count * pointsPer;

                        return (
                          <div key={act.id} style={{
                            display: 'flex',
                            gap: 12,
                            padding: '12px 14px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 12,
                            border: '1px solid var(--surface-border)',
                          }}>
                            {/* Icon Circle */}
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `${cfg.color}12`,
                              color: cfg.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              flexShrink: 0,
                            }}>
                              {cfg.icon}
                            </div>

                            {/* Details */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{cfg.label}</span>
                                  {act.metrics?.count && (
                                    <span style={{
                                      background: 'rgba(0,0,0,0.04)',
                                      fontSize: '0.68rem',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      marginLeft: 6,
                                      fontWeight: 600,
                                    }}>
                                      Qty: {count}
                                    </span>
                                  )}
                                </div>
                                {totalActPoints > 0 && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#10b981',
                                    background: 'rgba(16,185,129,0.08)',
                                    padding: '2px 8px',
                                    borderRadius: 8,
                                  }}>
                                    +{totalActPoints} XP
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                                {act.description}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                <span>
                                  {new Date(act.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} at {new Date(act.createdAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                                </span>
                                {act.proofs && act.proofs.length > 0 && (
                                  <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <FileCheck size={11} /> Proof Attached
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═════════ AMBASSADOR SYSTEM CONSTANTS ═════════
const POINTS_MAP = {
  content_post: 100,
  blog_article: 100,
  video_created: 100,
  advertised_event: 100,
  event_hosted: 500,
  campus_tour: 500,
  workshop: 500,
  booth_managed: 500,
  student_mentored: 50,
  qa_session: 50,
  inquiry_response: 50,
  lead_signup: 150,
  referral_distributed: 150,
  app_install: 150,
  people_added: 150,
};

const getActivityDetails = (type) => {
  switch (type) {
    case 'content_post': return { label: 'Social Post', icon: '🎨', color: '#8b5cf6' };
    case 'blog_article': return { label: 'Blog Article', icon: '📝', color: '#f59e0b' };
    case 'video_created': return { label: 'Video Created', icon: '🎥', color: '#ef4444' };
    case 'advertised_event': return { label: 'Advertised Event', icon: '📢', color: '#3b82f6' };
    case 'event_hosted': return { label: 'Event Hosted', icon: '🎪', color: '#10b981' };
    case 'campus_tour': return { label: 'Campus Tour', icon: '🏫', color: '#0ea5e9' };
    case 'workshop': return { label: 'Workshop', icon: '💻', color: '#6366f1' };
    case 'booth_managed': return { label: 'Booth Managed', icon: '🎪', color: '#ec4899' };
    case 'student_mentored': return { label: 'Student Mentoring', icon: '💬', color: '#14b8a6' };
    case 'qa_session': return { label: 'Q&A Session', icon: '❓', color: '#f43f5e' };
    case 'inquiry_response': return { label: 'Inquiry Response', icon: '✉️', color: '#84cc16' };
    case 'lead_signup': return { label: 'Lead Signup', icon: '🎯', color: '#10b981' };
    case 'referral_distributed': return { label: 'Referral Distributed', icon: '🔗', color: '#64748b' };
    case 'app_install': return { label: 'App Install', icon: '📱', color: '#a855f7' };
    case 'people_added': return { label: 'People Added', icon: '👥', color: '#06b6d4' };
    default: return { label: 'Activity Logged', icon: '⚡', color: 'var(--primary)' };
  }
};
