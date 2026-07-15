'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  UserCheck,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  Building2,
  BadgeCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Award,
  Eye,
  User,
  FileText,
  CreditCard,
} from 'lucide-react';

export default function CandidateRosterPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Onboard modal state
  const [onboardModal, setOnboardModal] = useState(null); // candidate object
  const [onboardDept, setOnboardDept] = useState('');
  const [onboardPosition, setOnboardPosition] = useState('');
  const [onboardDesignation, setOnboardDesignation] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [digiModal, setDigiModal] = useState(null); // candidate's digilockerProfile
  const [departments, setDepartments] = useState([]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-candidates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError('Failed to load candidates. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin-departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchDepartments();
  }, [fetchCandidates, fetchDepartments]);

  const filtered = candidates.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  });

  async function handleOnboard() {
    if (!onboardDept.trim()) {
      setOnboardError('Department is required.');
      return;
    }
    setOnboarding(true);
    setOnboardError('');
    try {
      const res = await fetch(`/api/admin-candidates/${onboardModal._id}/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: onboardDept.trim(),
          position: onboardPosition.trim(),
          designation: onboardDesignation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOnboardError(data.error || 'Failed to onboard.');
        return;
      }
      setSuccessMessage(data.message || 'Candidate onboarded successfully!');
      setOnboardModal(null);
      setOnboardDept('');
      setOnboardPosition('');
      setOnboardDesignation('');
      // Refresh the list
      fetchCandidates();
      // Clear success after 5s
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch {
      setOnboardError('Network error. Please try again.');
    } finally {
      setOnboarding(false);
    }
  }

  function getProfileCompleteness(candidate) {
    const p = candidate.candidateProfile || {};
    let score = 0;
    if (candidate.digilockerProfile?.verified) score += 25;
    if (p.keySkills && p.keySkills.length > 0) score += 25;
    if (p.employment && p.employment.length > 0) score += 25;
    if (p.education && p.education.length > 0) score += 25;
    return score;
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--ink, #1e293b)',
                letterSpacing: '-0.02em',
              }}
            >
              Candidate Roster
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--ink-soft, #64748b)',
              }}
            >
              Review self-registered candidates and onboard them as employees
            </p>
          </div>
        </div>

        <button
          onClick={fetchCandidates}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--surface, #fff)',
            color: 'var(--ink, #1e293b)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1px solid #86efac',
            color: '#065f46',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <BadgeCheck size={20} style={{ color: '#059669', flexShrink: 0 }} />
          {successMessage}
          <button
            onClick={() => setSuccessMessage('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#065f46',
              padding: '0.25rem',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div
        style={{
          position: 'relative',
          marginBottom: '1.5rem',
          maxWidth: '400px',
        }}
      >
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--ink-soft, #94a3b8)',
          }}
        />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.7rem 1rem 0.7rem 2.75rem',
            borderRadius: '12px',
            border: '2px solid var(--border-color, #e2e8f0)',
            background: 'var(--surface, #fff)',
            fontSize: '0.9rem',
            color: 'var(--ink, #1e293b)',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
        />
      </div>

      {/* Stats Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '1px solid #93c5fd',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1e40af',
          }}
        >
          <Users size={16} />
          {candidates.length} Total Candidate{candidates.length !== 1 ? 's' : ''}
        </div>
        {searchTerm && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#64748b',
            }}
          >
            <Search size={14} />
            {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <AlertTriangle size={24} style={{ margin: '0 auto 0.5rem', display: 'block' }} />
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--ink-soft, #64748b)',
          }}
        >
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#6366f1' }} />
          <p style={{ fontWeight: 600 }}>Loading candidates...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--ink-soft, #94a3b8)',
            borderRadius: '16px',
            border: '2px dashed var(--border-color, #e2e8f0)',
          }}
        >
          <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ margin: '0 0 0.5rem', fontWeight: 700, color: 'var(--ink, #475569)' }}>
            {searchTerm ? 'No matching candidates' : 'No candidates yet'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            {searchTerm
              ? 'Try adjusting your search term.'
              : 'Candidates will appear here once they register on the Employee Portal.'}
          </p>
        </div>
      )}

      {/* Candidate Cards */}
      {!loading &&
        filtered.map((candidate) => {
          const isExpanded = expandedId === candidate._id;
          const profile = candidate.candidateProfile || {};
          const completeness = getProfileCompleteness(candidate);
          const hasDigiLocker = Boolean(candidate.digilockerProfile?.verified);

          return (
            <div
              key={candidate._id}
              style={{
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '14px',
                background: 'var(--surface, #fff)',
                marginBottom: '0.75rem',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s, border-color 0.2s',
                boxShadow: isExpanded
                  ? '0 8px 25px rgba(0,0,0,0.08)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  cursor: 'pointer',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
                onClick={() => setExpandedId(isExpanded ? null : candidate._id)}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {(candidate.name || '?')[0].toUpperCase()}
                </div>

                {/* Name & Email */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--ink, #1e293b)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {candidate.name}
                    {hasDigiLocker && (
                      <ShieldCheck
                        size={16}
                        style={{ color: '#059669' }}
                        title="DigiLocker Verified"
                      />
                    )}
                    {candidate.selfRegistered && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#166534',
                          fontWeight: 600,
                        }}
                      >
                        Self-Registered
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--ink-soft, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginTop: '0.15rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={13} /> {candidate.email}
                    </span>
                    {candidate.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Phone size={13} /> {candidate.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Completeness Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color:
                      completeness === 100
                        ? '#059669'
                        : completeness >= 50
                        ? '#d97706'
                        : '#dc2626',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    background:
                      completeness === 100
                        ? '#ecfdf5'
                        : completeness >= 50
                        ? '#fffbeb'
                        : '#fef2f2',
                    border: `1px solid ${
                      completeness === 100
                        ? '#86efac'
                        : completeness >= 50
                        ? '#fcd34d'
                        : '#fca5a5'
                    }`,
                  }}
                >
                  <Sparkles size={14} />
                  {completeness}% Complete
                </div>

                {/* Registration Date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: 'var(--ink-soft, #94a3b8)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Calendar size={14} />
                  {candidate.createdAt
                    ? new Date(candidate.createdAt).toLocaleDateString()
                    : 'N/A'}
                </div>

                {/* Onboard Button / Status */}
                {candidate.onboarded ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                    title={candidate.onboardedAt ? `Onboarded on ${new Date(candidate.onboardedAt).toLocaleDateString()}` : "Onboarded"}
                  >
                    <UserCheck size={14} style={{ color: '#059669' }} />
                    Onboarded {candidate.onboardedEmployeeId ? `(${candidate.onboardedEmployeeId})` : ''}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOnboardModal(candidate);
                      setOnboardDept('');
                      setOnboardPosition('');
                      setOnboardDesignation('');
                      setOnboardError('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <UserCheck size={15} />
                    Onboard
                  </button>
                )}

                {/* Expand Arrow */}
                {isExpanded ? (
                  <ChevronUp size={18} style={{ color: 'var(--ink-soft, #94a3b8)', flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={18} style={{ color: 'var(--ink-soft, #94a3b8)', flexShrink: 0 }} />
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  style={{
                    padding: '0 1.25rem 1.25rem',
                    borderTop: '1px solid var(--border-color, #f1f5f9)',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '1rem',
                      marginTop: '1rem',
                    }}
                  >
                    {/* Skills */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--bg, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--ink, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Award size={16} style={{ color: '#6366f1' }} />
                        Key Skills
                      </h4>
                      {profile.keySkills && profile.keySkills.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {profile.keySkills.map((skill, i) => (
                            <span
                              key={i}
                              style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1e40af',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No skills added yet
                        </p>
                      )}
                    </div>

                    {/* Employment */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--bg, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--ink, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Briefcase size={16} style={{ color: '#f59e0b' }} />
                        Employment History
                      </h4>
                      {profile.employment && profile.employment.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {profile.employment.map((emp, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.82rem',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--ink, #1e293b)' }}>
                                {emp.designation || 'Position not specified'}
                              </div>
                              <div style={{ color: 'var(--ink-soft, #64748b)', marginTop: '0.15rem' }}>
                                {emp.companyName || 'Company not specified'}
                                {emp.city && ` • ${emp.city}`}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                {emp.startDate || '?'} — {emp.currentlyWorking ? 'Present' : emp.endDate || '?'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No employment records
                        </p>
                      )}
                    </div>

                    {/* Education */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--bg, #f8fafc)',
                        border: '1px solid var(--border-color, #e2e8f0)',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--ink, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <GraduationCap size={16} style={{ color: '#059669' }} />
                        Education
                      </h4>
                      {profile.education && profile.education.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {profile.education.map((edu, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.82rem',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--ink, #1e293b)' }}>
                                {edu.degree || edu.level || 'Degree not specified'}
                              </div>
                              <div style={{ color: 'var(--ink-soft, #64748b)', marginTop: '0.15rem' }}>
                                {edu.institution || 'Institution not specified'}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                {edu.startYear || '?'} — {edu.endYear || '?'}
                                {edu.grade && ` • Grade: ${edu.grade}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No education records
                        </p>
                      )}
                    </div>

                    {/* DigiLocker Status */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: hasDigiLocker ? '#ecfdf5' : 'var(--bg, #f8fafc)',
                        border: `1px solid ${hasDigiLocker ? '#86efac' : 'var(--border-color, #e2e8f0)'}`,
                        cursor: hasDigiLocker ? 'pointer' : 'default',
                        transition: 'box-shadow 0.2s, transform 0.2s',
                      }}
                      onClick={(e) => {
                        if (hasDigiLocker) {
                          e.stopPropagation();
                          setDigiModal({ name: candidate.name, profile: candidate.digilockerProfile });
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (hasDigiLocker) {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 0.75rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--ink, #334155)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <ShieldCheck size={16} style={{ color: hasDigiLocker ? '#059669' : '#94a3b8' }} />
                        DigiLocker
                        {hasDigiLocker && (
                          <Eye size={14} style={{ color: '#059669', marginLeft: 'auto' }} />
                        )}
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.82rem',
                          color: hasDigiLocker ? '#065f46' : '#94a3b8',
                          fontWeight: hasDigiLocker ? 600 : 400,
                          fontStyle: hasDigiLocker ? 'normal' : 'italic',
                        }}
                      >
                        {hasDigiLocker
                          ? '✓ Identity verified via DigiLocker — Click to view'
                          : 'Not linked yet'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* Onboard Modal */}
      {onboardModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setOnboardModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--surface, #fff)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserCheck size={24} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                    Onboard as Employee
                  </h2>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', opacity: 0.85 }}>
                    {onboardModal.name} ({onboardModal.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOnboardModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--ink-soft, #64748b)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <Building2 size={14} />
                    Department *
                  </label>
                  <select
                    value={onboardDept}
                    onChange={(e) => setOnboardDept(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color, #e2e8f0)',
                      fontSize: '0.9rem',
                      color: 'var(--ink, #1e293b)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: 'var(--bg, #f8fafc)',
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id || dept.name} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--ink-soft, #64748b)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <Briefcase size={14} />
                    Position
                  </label>
                  <select
                    value={onboardPosition}
                    onChange={(e) => setOnboardPosition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color, #e2e8f0)',
                      fontSize: '0.9rem',
                      color: 'var(--ink, #1e293b)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: 'var(--bg, #f8fafc)',
                    }}
                  >
                    <option value="">Select Position</option>
                    <option value="Employee">Employee</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="Sales Manager">Sales Manager</option>
                    <option value="Senior Sales Executive">Senior Sales Executive</option>
                    <option value="Marketing Executive">Marketing Executive</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Software Developer">Software Developer</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Operations Associate">Operations Associate</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--ink-soft, #64748b)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <BadgeCheck size={14} />
                    Designation
                  </label>
                  <select
                    value={onboardDesignation}
                    onChange={(e) => setOnboardDesignation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem',
                      borderRadius: '10px',
                      border: '2px solid var(--border-color, #e2e8f0)',
                      fontSize: '0.9rem',
                      color: 'var(--ink, #1e293b)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      background: 'var(--bg, #f8fafc)',
                    }}
                  >
                    <option value="">Select Designation</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Lead">Lead</option>
                    <option value="Executive">Executive</option>
                    <option value="Intern">Intern</option>
                    <option value="Manager">Manager</option>
                    <option value="Director">Director</option>
                    <option value="Associate">Associate</option>
                  </select>
                </div>
              </div>

              {onboardError && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertTriangle size={16} />
                  {onboardError}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                }}
              >
                <button
                  onClick={() => setOnboardModal(null)}
                  disabled={onboarding}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    background: 'var(--surface, #fff)',
                    color: 'var(--ink, #1e293b)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleOnboard}
                  disabled={onboarding}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: onboarding
                      ? '#a5b4fc'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff',
                    cursor: onboarding ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {onboarding ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserCheck size={16} />
                      Confirm Onboarding
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DigiLocker Details Modal */}
      {digiModal && (() => {
        const dp = digiModal.profile || {};
        const personalFields = [];
        if (dp.name) personalFields.push({ label: 'Full Name', value: dp.name });
        if (dp.dob) personalFields.push({ label: 'Date of Birth', value: dp.dob });
        if (dp.gender) {
          const gMap = { M: 'Male', F: 'Female', O: 'Other' };
          personalFields.push({ label: 'Gender', value: gMap[dp.gender] || dp.gender });
        }
        if (dp.email) personalFields.push({ label: 'Email', value: dp.email });
        if (dp.mobile) personalFields.push({ label: 'Mobile', value: dp.mobile });
        if (dp.maskedAadhaar) personalFields.push({ label: 'Aadhaar', value: dp.maskedAadhaar });
        if (dp.eaadhaar) personalFields.push({ label: 'e-Aadhaar', value: dp.eaadhaar === 'Y' ? 'Available' : dp.eaadhaar });
        if (dp.panNumber) personalFields.push({ label: 'PAN Number', value: dp.panNumber });
        if (dp.drivingLicence) personalFields.push({ label: 'Driving Licence', value: dp.drivingLicence });
        if (dp.digilockerid) personalFields.push({ label: 'DigiLocker ID', value: dp.digilockerid });
        const docs = dp.documents || [];

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
            onClick={() => setDigiModal(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '85vh',
                background: 'var(--surface, #fff)',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                animation: 'fadeIn 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldCheck size={24} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                      DigiLocker Verification
                    </h2>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                      {digiModal.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDigiModal(null)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    display: 'flex',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {/* Photo + Name */}
                {(dp.photo || dp.name) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    {dp.photo && (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '3px solid #86efac',
                          flexShrink: 0,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={dp.photo.startsWith('data:') ? dp.photo : `data:image/jpeg;base64,${dp.photo}`}
                          alt="DigiLocker Photo"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    {!dp.photo && (
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #059669, #10b981)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          flexShrink: 0,
                        }}
                      >
                        <User size={28} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink, #1e293b)' }}>
                        {dp.name || digiModal.name}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          marginTop: '0.25rem',
                          padding: '0.15rem 0.6rem',
                          borderRadius: '6px',
                          background: '#ecfdf5',
                          border: '1px solid #86efac',
                          color: '#059669',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <ShieldCheck size={12} />
                        Verified
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Details */}
                {personalFields.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4
                      style={{
                        margin: '0 0 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <CreditCard size={14} />
                      Personal Details
                    </h4>
                    <div
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #e2e8f0)',
                        overflow: 'hidden',
                      }}
                    >
                      {personalFields.map((field, idx) => (
                        <div
                          key={field.label}
                          style={{
                            display: 'flex',
                            padding: '0.6rem 1rem',
                            background: idx % 2 === 0 ? 'var(--bg, #f8fafc)' : 'var(--surface, #fff)',
                            borderBottom: idx < personalFields.length - 1 ? '1px solid #f1f5f9' : 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '120px',
                              flexShrink: 0,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--ink-soft, #64748b)',
                            }}
                          >
                            {field.label}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: 'var(--ink, #1e293b)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {field.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issued Documents */}
                {docs.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4
                      style={{
                        margin: '0 0 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <FileText size={14} />
                      Issued Documents ({docs.length})
                    </h4>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {docs.map((doc, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            background: 'var(--bg, #f8fafc)',
                            border: '1px solid var(--border-color, #e2e8f0)',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: 'var(--ink, #1e293b)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <FileText size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                            {doc.name || doc.description || 'Document'}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {doc.doctype && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '4px',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1e40af',
                                  fontWeight: 600,
                                }}
                              >
                                {doc.doctype}
                              </span>
                            )}
                            {doc.issuer && (
                              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {doc.issuer}
                              </span>
                            )}
                            {doc.date && (
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                {doc.date}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked date */}
                {dp.linkedAt && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #f1f5f9',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Calendar size={13} />
                    Linked on {new Date(dp.linkedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}

                {/* Raw API Responses Section */}
                {(dp.rawTokenResponse || dp.rawUserResponse || dp.rawDocumentsResponse) && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <h4
                      style={{
                        margin: '0 0 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <FileText size={14} />
                      Raw API Responses
                    </h4>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {[
                        { label: 'Token Response', data: dp.rawTokenResponse },
                        { label: 'User API Response', data: dp.rawUserResponse },
                        { label: 'Documents API Response', data: dp.rawDocumentsResponse },
                      ].filter(item => item.data).map((item) => (
                        <details
                          key={item.label}
                          style={{
                            borderRadius: '10px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            overflow: 'hidden',
                          }}
                        >
                          <summary
                            style={{
                              padding: '0.6rem 1rem',
                              background: 'var(--bg, #f8fafc)',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: 'var(--ink, #334155)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              userSelect: 'none',
                            }}
                          >
                            <FileText size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                            {item.label}
                          </summary>
                          <pre
                            style={{
                              margin: 0,
                              padding: '0.75rem 1rem',
                              background: '#1e293b',
                              color: '#e2e8f0',
                              fontSize: '0.72rem',
                              lineHeight: 1.5,
                              overflow: 'auto',
                              maxHeight: '300px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                            }}
                          >
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
