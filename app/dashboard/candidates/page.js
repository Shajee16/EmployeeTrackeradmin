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
  Download,
  ExternalLink,
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
  const [refetchingDocs, setRefetchingDocs] = useState({});
  const [resumeModal, setResumeModal] = useState(null); // { name, resume }
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

  const refetchDocument = async (candidateId, docIndex, docName) => {
    const key = `${candidateId}-${docIndex}`;
    setRefetchingDocs(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/admin-digilocker/refetch-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: candidateId, docIndex })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully fetched original file for "${docName}" from DigiLocker!`);
        setDigiModal(prev => {
          if (!prev || !prev.profile) return prev;
          const rawDocs = Array.isArray(prev.profile.documents) ? prev.profile.documents : (prev.profile.documents?.items || []);
          const updatedDocs = [...rawDocs];
          if (updatedDocs[docIndex]) {
            updatedDocs[docIndex] = {
              ...updatedDocs[docIndex],
              fileData: data.fileData,
              fileMimeType: data.fileMimeType
            };
          }
          return { ...prev, profile: { ...prev.profile, documents: updatedDocs } };
        });
        setCandidates(prev => prev.map(c => {
          if (c._id === candidateId || c.id === candidateId) {
            const rawDocs = Array.isArray(c.digilockerProfile?.documents) ? c.digilockerProfile.documents : (c.digilockerProfile?.documents?.items || []);
            const updatedDocs = [...rawDocs];
            if (updatedDocs[docIndex]) {
              updatedDocs[docIndex] = {
                ...updatedDocs[docIndex],
                fileData: data.fileData,
                fileMimeType: data.fileMimeType
              };
            }
            return { ...c, digilockerProfile: { ...c.digilockerProfile, documents: updatedDocs } };
          }
          return c;
        }));
      } else {
        if (data.notifiedCandidate) {
          alert(`📩 Re-verification request sent!\n\n${data.error}\n\nThe candidate will see a notification on their dashboard to re-verify DigiLocker.`);
        } else {
          alert(`Error: ${data.error || 'Failed to fetch file'}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching file. Please try again.');
    } finally {
      setRefetchingDocs(prev => ({ ...prev, [key]: false }));
    }
  };

  // Helper to render certificate data fields nicely
  const renderCertFields = (data, depth = 0) => {
    if (!data || typeof data !== 'object') return null;
    if (data.rawXml) {
      return (
        <pre style={{ fontSize: '0.72rem', color: 'var(--ink, #1e293b)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', margin: 0, maxHeight: 250, overflowY: 'auto', background: 'var(--bg, #f8fafc)', padding: 10, borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
          {data.rawXml}
        </pre>
      );
    }
    const entries = Object.entries(data).filter(([k, v]) =>
      v !== null && v !== undefined && v !== '' && k !== '_id' && k !== 'Signature'
    );
    if (entries.length === 0) return null;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: depth === 0 ? 'repeat(auto-fill, minmax(220px, 1fr))' : '1fr', gap: depth === 0 ? 8 : 4, paddingLeft: depth > 0 ? 12 : 0 }}>
        {entries.map(([key, val]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/@/g, '').trim();
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            return (
              <div key={key} style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: depth === 0 ? 8 : 4, marginBottom: 4 }}>{label}</div>
                {renderCertFields(val, depth + 1)}
              </div>
            );
          }
          if (Array.isArray(val)) {
            return (
              <div key={key} style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: depth === 0 ? 8 : 4, marginBottom: 4 }}>{label}</div>
                {val.map((item, vi) => (
                  <div key={vi} style={{ marginBottom: 6, paddingLeft: 12, borderLeft: '2px solid var(--border-color, #e2e8f0)' }}>
                    {typeof item === 'object' ? renderCertFields(item, depth + 1) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink, #1e293b)' }}>{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div key={key} style={{ padding: '6px 10px', background: 'var(--bg, #f8fafc)', borderRadius: 6, border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--ink-soft, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink, #1e293b)', wordBreak: 'break-word' }}>{String(val)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const generateCertificatePdf = (doc) => {
    let certName = doc.name || doc.description || 'Document';
    let certType = doc.doctype || '';
    let certNumber = '';
    let certStatus = '';
    let issueDate = doc.date || '';
    let orgName = doc.issuer || '';
    let personName = '';
    let personDob = '';
    let personGender = '';
    let personRegnNo = '';
    let personAbcId = '';
    let personFather = '';
    let personMother = '';
    let personPhoto = '';
    let certDataRows = '';
    let subjectsHtml = '';
    let courseHtml = '';
    let examHtml = '';
    let schoolHtml = '';
    let perfHtml = '';
    let qrBase64 = '';

    const rawXml = doc.certificateData?.rawXml || '';
    if (rawXml) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rawXml, 'text/xml');
        const cert = xmlDoc.querySelector('Certificate');
        if (cert) {
          certName = cert.getAttribute('name') || certName;
          certType = cert.getAttribute('type') || certType;
          certNumber = cert.getAttribute('number') || '';
          certStatus = cert.getAttribute('status') || '';
          issueDate = cert.getAttribute('issueDate') || cert.getAttribute('issuedAt') || issueDate;
        }
        const org = xmlDoc.querySelector('IssuedBy Organization');
        if (org) orgName = org.getAttribute('name') || orgName;
        const person = xmlDoc.querySelector('IssuedTo Person');
        if (person) {
          personName = person.getAttribute('name') || '';
          personDob = person.getAttribute('dob') || '';
          personGender = person.getAttribute('gender') || '';
          personRegnNo = person.getAttribute('regnNo') || person.getAttribute('rroll') || '';
          personAbcId = person.getAttribute('abcAccountId') || '';
          personFather = person.getAttribute('fatherName') || person.getAttribute('swd') || '';
          personMother = person.getAttribute('motherName') || '';
          const photoEl = person.querySelector('Photo');
          if (photoEl && photoEl.textContent) {
            personPhoto = photoEl.textContent.trim();
          }
        }
        // School / Institution info
        const schoolEl = xmlDoc.querySelector('School');
        if (schoolEl) {
          const sn = schoolEl.getAttribute('name') || '';
          const sc = schoolEl.getAttribute('code') || '';
          if (sn) {
            schoolHtml = `<div class="section"><div class="section-head">Institution / School</div><div class="info-grid"><div class="info-card" style="grid-column:1/-1"><div class="lbl">School Name</div><div class="val">${sn}${sc ? ` (Code: ${sc})` : ''}</div></div></div></div>`;
          }
        }
        // Performance summary
        const perfEl = xmlDoc.querySelector('Performance');
        if (perfEl) {
          const res = perfEl.getAttribute('result') || '';
          const tot = perfEl.getAttribute('marksTotal') || '';
          const max = perfEl.getAttribute('marksMax') || '';
          if (res || tot) {
            perfHtml = `<div class="section"><div class="section-head">Performance Summary</div><div class="info-grid">`;
            if (res) perfHtml += `<div class="info-card"><div class="lbl">Result</div><div class="val" style="color:#16a34a;font-weight:700">${res}</div></div>`;
            if (tot) perfHtml += `<div class="info-card"><div class="lbl">Total Marks</div><div class="val" style="font-weight:700">${tot}${max ? ` / ${max}` : ''}</div></div>`;
            perfHtml += `</div></div>`;
          }
        }
        // Course info
        const courseEl = xmlDoc.querySelector('Course');
        if (courseEl) {
          const cn = courseEl.getAttribute('courseName') || '';
          const spec = courseEl.querySelector('Stream')?.getAttribute('name') || courseEl.getAttribute('specializationMajor') || '';
          if (cn || spec) {
            courseHtml = `<div class="section"><div class="section-head">Course Information</div><div class="info-grid">`;
            if (cn) courseHtml += `<div class="info-card"><div class="lbl">Programme</div><div class="val">${cn}</div></div>`;
            if (spec) courseHtml += `<div class="info-card" style="grid-column:1/-1"><div class="lbl">Specialization</div><div class="val">${spec}</div></div>`;
            courseHtml += `</div></div>`;
          }
        }
        // Examination info
        const examEl = xmlDoc.querySelector('Examination');
        if (examEl) {
          const sem = examEl.getAttribute('sem') || '';
          const month = examEl.getAttribute('month') || '';
          const year = examEl.getAttribute('year') || '';
          const cgpa = examEl.getAttribute('cgpa') || '';
          const examType = examEl.getAttribute('examType') || '';
          examHtml = `<div class="section"><div class="section-head">Examination</div><div class="info-grid">`;
          if (sem) examHtml += `<div class="info-card"><div class="lbl">Semester</div><div class="val">${sem}</div></div>`;
          if (month && year) examHtml += `<div class="info-card"><div class="lbl">Session</div><div class="val">${month} ${year}</div></div>`;
          if (cgpa) examHtml += `<div class="info-card"><div class="lbl">CGPA</div><div class="val" style="font-size:18px;color:#4f46e5">${cgpa}</div></div>`;
          if (examType) examHtml += `<div class="info-card"><div class="lbl">Type</div><div class="val">${examType}</div></div>`;
          examHtml += `</div></div>`;
        }
        // Subjects table
        const subjects = xmlDoc.querySelectorAll('Subject');
        if (subjects.length > 0) {
          const hasMarks = Array.from(subjects).some(s => s.getAttribute('marksTotal') || s.getAttribute('marksTheory'));
          if (hasMarks) {
            subjectsHtml = `<div class="section"><div class="section-head">Subjects &amp; Marks</div><table class="subjects"><thead><tr><th>Code</th><th>Subject</th><th style="text-align:center">Theory</th><th style="text-align:center">Practical</th><th style="text-align:center">Total</th><th style="text-align:center">Grade</th></tr></thead><tbody>`;
            subjects.forEach(sub => {
              const code = sub.getAttribute('code') || '';
              const nm = sub.getAttribute('name') || '';
              const th = sub.getAttribute('marksTheory') || '-';
              const pr = sub.getAttribute('marksPractical') || '-';
              const tot = sub.getAttribute('marksTotal') || '-';
              const grade = sub.getAttribute('grade') || '';
              const gc = grade.startsWith('A') ? '#16a34a' : grade.startsWith('B') ? '#2563eb' : '#1e293b';
              subjectsHtml += `<tr><td style="font-family:monospace;font-size:11px;color:#64748b">${code}</td><td>${nm}</td><td style="text-align:center">${th}</td><td style="text-align:center">${pr}</td><td style="text-align:center;font-weight:700">${tot}</td><td style="text-align:center"><span style="background:${gc}15;color:${gc};padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px">${grade}</span></td></tr>`;
            });
            subjectsHtml += `</tbody></table></div>`;
          } else {
            subjectsHtml = `<div class="section"><div class="section-head">Subjects &amp; Grades</div><table class="subjects"><thead><tr><th>Code</th><th>Subject</th><th>Grade</th><th>GP</th><th>Max</th></tr></thead><tbody>`;
            subjects.forEach(sub => {
              const code = sub.getAttribute('code') || '';
              const nm = sub.getAttribute('name') || '';
              const grade = sub.getAttribute('grade') || '';
              const gp = sub.getAttribute('gp') || '';
              const mm = sub.getAttribute('marksMax') || '';
              const gc = grade === 'O' ? '#16a34a' : grade === 'A+' ? '#2563eb' : grade === 'A' ? '#7c3aed' : '#1e293b';
              subjectsHtml += `<tr><td style="font-family:monospace;font-size:11px;color:#64748b">${code}</td><td>${nm}</td><td style="text-align:center"><span style="background:${gc}11;color:${gc};padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px">${grade}</span></td><td style="text-align:center;font-weight:700">${gp}</td><td style="text-align:center">${mm}</td></tr>`;
            });
            subjectsHtml += `</tbody></table></div>`;
          }
        }
        const certDataEl = xmlDoc.querySelector('CertificateData');
        if (certDataEl && !xmlDoc.querySelector('Subject')) {
          const children = certDataEl.children;
          for (let ci = 0; ci < children.length; ci++) {
            const child = children[ci];
            const tagName = child.tagName;
            if (['OrgDetails','Examination','Course','Performance','School'].includes(tagName)) continue;
            const attrs = child.attributes;
            for (let ai = 0; ai < attrs.length; ai++) {
              const a = attrs[ai];
              if (a.value) certDataRows += `<tr><td class="label">${tagName} — ${a.name.replace(/([A-Z])/g, ' $1').trim()}</td><td class="value">${a.value}</td></tr>`;
            }
          }
        }
        const qrEl = xmlDoc.querySelector('QRMeta');
        if (qrEl && qrEl.textContent) qrBase64 = qrEl.textContent.trim();
      } catch (parseErr) { console.error('XML parse error:', parseErr); }
    } else if (doc.certificateData && typeof doc.certificateData === 'object') {
      const buildRows = (obj, prefix = '') => {
        if (!obj || typeof obj !== 'object') return '';
        return Object.entries(obj).filter(([k, v]) => v != null && v !== '' && k !== '_id' && k !== 'Signature').map(([k, v]) => {
          const lbl = (prefix ? prefix + ' › ' : '') + k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
          if (typeof v === 'object' && !Array.isArray(v)) return buildRows(v, lbl);
          return `<tr><td class="label">${lbl}</td><td class="value">${String(v)}</td></tr>`;
        }).join('');
      };
      certDataRows = buildRows(doc.certificateData);
    }

    const statusBadge = certStatus === 'A' ? '<span style="background:#dcfce7;color:#16a34a;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700">ACTIVE</span>' : certStatus ? `<span style="background:#fef3c7;color:#d97706;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700">${certStatus}</span>` : '';

    const html = `<!DOCTYPE html><html><head><title>${certName}</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Inter',sans-serif; color:#1e293b; background:#fff; }
      .page { max-width:700px; margin:0 auto; padding:40px; }
      .banner { background:linear-gradient(135deg,#4f46e5,#7c3aed,#6366f1); color:#fff; padding:28px 32px; border-radius:16px; margin-bottom:28px; position:relative; overflow:hidden; }
      .banner::after { content:''; position:absolute; top:-40px; right:-40px; width:160px; height:160px; background:rgba(255,255,255,0.06); border-radius:50%; }
      .banner h1 { font-size:22px; font-weight:800; letter-spacing:-0.02em; margin-bottom:4px; }
      .banner .sub { font-size:13px; opacity:0.85; font-weight:400; }
      .banner .badge { position:absolute; top:28px; right:32px; background:rgba(255,255,255,0.18); backdrop-filter:blur(4px); padding:6px 16px; border-radius:8px; font-size:12px; font-weight:700; letter-spacing:0.06em; }
      .section { margin-bottom:20px; }
      .section-head { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6366f1; margin-bottom:10px; padding-bottom:6px; border-bottom:2px solid #e0e7ff; }
      .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .info-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; }
      .info-card .lbl { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8; margin-bottom:3px; }
      .info-card .val { font-size:14px; font-weight:600; color:#1e293b; word-break:break-word; }
      table { width:100%; border-collapse:collapse; margin-top:8px; }
      td.label { padding:8px 14px; font-weight:600; color:#475569; border:1px solid #e2e8f0; width:40%; background:#f8fafc; font-size:12px; }
      td.value { padding:8px 14px; border:1px solid #e2e8f0; font-size:13px; color:#1e293b; font-weight:500; }
      table.subjects { font-size:12px; border:none; }
      table.subjects th { background:#4f46e5; color:#fff; padding:10px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
      table.subjects th:first-child { border-radius:8px 0 0 0; }
      table.subjects th:last-child { border-radius:0 8px 0 0; }
      table.subjects td { padding:10px 12px; border-bottom:1px solid #f1f5f9; border-left:none; border-right:none; }
      table.subjects tr:nth-child(even) { background:#f8fafc; }
      .qr-section { display:flex; align-items:center; gap:20px; margin-top:16px; padding:16px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; }
      .qr-section img { width:100px; height:100px; border-radius:6px; }
      .qr-section .qr-text { font-size:11px; color:#64748b; line-height:1.6; }
      .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; }
      .footer .left { font-size:10px; color:#94a3b8; }
      .footer .right { font-size:10px; color:#6366f1; font-weight:600; }
      @media print { .page { padding:20px; } .banner { break-inside:avoid; } }
    </style></head><body><div class="page">
      <div class="banner">
        <h1>${certName}</h1>
        <div class="sub">${orgName}${certNumber ? ' · ' + certNumber : ''}</div>
        <div class="badge">${certType}</div>
      </div>

      ${personName ? `<div class="section">
        <div class="section-head">Certificate Holder</div>
        <div style="display:flex;gap:20px;align-items:flex-start">
          ${personPhoto ? `<div style="width:90px;height:115px;border-radius:8px;overflow:hidden;border:1px solid #cbd5e1;flex-shrink:0"><img src="${personPhoto.startsWith('data:') ? personPhoto : `data:image/jpeg;base64,${personPhoto}`}" style="width:100%;height:100%;object-fit:cover" alt="Photo"/></div>` : ''}
          <div class="info-grid" style="flex:1">
            <div class="info-card"><div class="lbl">Full Name</div><div class="val">${personName}</div></div>
            ${personDob ? `<div class="info-card"><div class="lbl">Date of Birth</div><div class="val">${personDob}</div></div>` : ''}
            ${personGender ? `<div class="info-card"><div class="lbl">Gender</div><div class="val">${personGender}</div></div>` : ''}
            ${personFather ? `<div class="info-card"><div class="lbl">Father's Name</div><div class="val">${personFather}</div></div>` : ''}
            ${personMother ? `<div class="info-card"><div class="lbl">Mother's Name</div><div class="val">${personMother}</div></div>` : ''}
            ${personRegnNo ? `<div class="info-card"><div class="lbl">Registration / Roll No</div><div class="val">${personRegnNo}</div></div>` : ''}
            ${certNumber && certNumber !== personRegnNo ? `<div class="info-card"><div class="lbl">Document Number</div><div class="val">${certNumber}</div></div>` : ''}
            ${personAbcId ? `<div class="info-card"><div class="lbl">ABC Account ID</div><div class="val">${personAbcId}</div></div>` : ''}
          </div>
        </div>
      </div>` : ''}

      <div class="section">
        <div class="section-head">Document Information</div>
        <div class="info-grid">
          <div class="info-card"><div class="lbl">Issuing Authority</div><div class="val">${orgName}</div></div>
          <div class="info-card"><div class="lbl">Document Type</div><div class="val">${certName} (${certType})</div></div>
          ${issueDate ? `<div class="info-card"><div class="lbl">Date</div><div class="val">${issueDate}</div></div>` : ''}
          <div class="info-card"><div class="lbl">Status</div><div class="val">${statusBadge || 'Verified'}</div></div>
        </div>
      </div>

      ${schoolHtml}
      ${courseHtml}
      ${examHtml}
      ${perfHtml}
      ${subjectsHtml}

      ${certDataRows ? `<div class="section">
        <div class="section-head">Certificate Details</div>
        <table>${certDataRows}</table>
      </div>` : ''}

      ${qrBase64 ? `<div class="qr-section">
        <img src="data:image/png;base64,${qrBase64}" alt="QR Code"/>
        <div class="qr-text"><strong>Verification QR Code</strong><br/>Scan to verify this document on DigiLocker.<br/>URI: ${doc.uri || ''}</div>
      </div>` : ''}

      <div class="footer">
        <div class="left">Generated from DigiLocker verified data · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        <div class="right">DigiLocker Verified ✓</div>
      </div>
    </div></body></html>`;

    const printWin = window.open('', '_blank', 'width=800,height=700');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => { printWin.print(); }, 500);
    }
  };

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
    if (candidate.digilockerProfile?.verified) score += 20;
    if (p.keySkills && p.keySkills.length > 0) score += 20;
    if (p.employment && p.employment.length > 0) score += 20;
    if (p.education && p.education.length > 0) score += 20;
    if (p.resume && (p.resume.dataUrl || p.resume.fileName)) score += 20;
    return score;
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function openResumeInNewTab(resume) {
    if (!resume?.dataUrl) return;
    try {
      const parts = resume.dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : resume.fileType || 'application/pdf';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      window.open(resume.dataUrl, '_blank');
    }
  }

  function downloadResume(resume, candidateName) {
    if (!resume?.dataUrl) return;
    const a = document.createElement('a');
    a.href = resume.dataUrl;
    a.download = resume.fileName || `${(candidateName || 'Candidate').replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                          setDigiModal({
                            name: candidate.name,
                            profile: candidate.digilockerProfile,
                            candidateId: candidate._id,
                            id: candidate.onboardedEmployeeId || candidate._id,
                          });
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

                    {/* Resume / CV */}
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: profile.resume && (profile.resume.fileName || profile.resume.dataUrl) ? '#f0f9ff' : 'var(--bg, #f8fafc)',
                        border: `1px solid ${profile.resume && (profile.resume.fileName || profile.resume.dataUrl) ? '#bae6fd' : 'var(--border-color, #e2e8f0)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--ink, #334155)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <FileText size={16} style={{ color: '#0284c7' }} />
                          Resume / CV
                        </h4>
                        {profile.resume && (profile.resume.fileName || profile.resume.dataUrl) && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#0369a1',
                              background: '#e0f2fe',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              border: '1px solid #bae6fd',
                            }}
                          >
                            Attached
                          </span>
                        )}
                      </div>

                      {profile.resume && (profile.resume.fileName || profile.resume.dataUrl) ? (
                        <div>
                          <div
                            style={{
                              padding: '0.6rem 0.75rem',
                              borderRadius: '8px',
                              background: '#fff',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.82rem',
                              marginBottom: '0.75rem',
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--ink, #1e293b)', wordBreak: 'break-all' }}>
                              {profile.resume.fileName || 'Candidate_Resume.pdf'}
                            </div>
                            <div style={{ color: 'var(--ink-soft, #64748b)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                              {formatFileSize(profile.resume.fileSize)}
                              {profile.resume.uploadedAt && ` • Uploaded ${new Date(profile.resume.uploadedAt).toLocaleDateString()}`}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setResumeModal({ name: candidate.name, resume: profile.resume });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #0284c7',
                                background: '#0284c7',
                                color: '#fff',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Preview in modal"
                            >
                              <Eye size={13} />
                              Preview
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openResumeInNewTab(profile.resume);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Open full document in new tab"
                            >
                              <ExternalLink size={13} />
                              Open Tab
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadResume(profile.resume, candidate.name);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#334155',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              title="Download Resume"
                            >
                              <Download size={13} />
                              Download
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                          No resume uploaded yet
                        </p>
                      )}
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
                maxWidth: '680px',
                maxHeight: '90vh',
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
                      <FileText size={14} />
                      Issued Documents ({docs.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docs.map((doc, idx) => (
                        <details
                          key={idx}
                          style={{
                            borderRadius: 10,
                            border: '1px solid var(--border-color, #e2e8f0)',
                            overflow: 'hidden',
                            background: 'var(--surface, #fff)',
                          }}
                        >
                          <summary
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              listStyle: 'none',
                              userSelect: 'none',
                              gap: 10,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                              <FileText size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--ink, #1e293b)' }}>
                                  {doc.name || doc.description || 'Document'}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--ink-soft, #64748b)', marginTop: 1 }}>
                                  {doc.issuer}{doc.date ? ` · ${doc.date}` : ''}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              {doc.fileData ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    try {
                                      const mime = doc.fileMimeType || 'application/pdf';
                                      const byteChars = atob(doc.fileData);
                                      const byteArray = new Uint8Array(byteChars.length);
                                      for (let j = 0; j < byteChars.length; j++) byteArray[j] = byteChars.charCodeAt(j);
                                      const blob = new Blob([byteArray], { type: mime });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `${(doc.name || 'document').replace(/[^a-zA-Z0-9 ]/g, '_')}_original.pdf`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    } catch (err) {
                                      console.error('Download error:', err);
                                    }
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                    borderRadius: 6, border: '1px solid #10b981', background: 'rgba(16,185,129,0.1)',
                                    color: '#10b981', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                  }}
                                >
                                  <Download size={12} /> Original
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    refetchDocument(
                                      digiModal.candidateId || digiModal.id,
                                      idx,
                                      doc.name || doc.description || 'Document'
                                    );
                                  }}
                                  disabled={refetchingDocs[`${digiModal.candidateId || digiModal.id}-${idx}`]}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                    borderRadius: 6, border: '1px solid #d97706', background: 'rgba(217,119,6,0.1)',
                                    color: '#d97706', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                    opacity: refetchingDocs[`${digiModal.candidateId || digiModal.id}-${idx}`] ? 0.6 : 1,
                                  }}
                                >
                                  <Download size={12} /> {refetchingDocs[`${digiModal.candidateId || digiModal.id}-${idx}`] ? 'Fetching...' : 'Fetch Original'}
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  generateCertificatePdf(doc);
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                  borderRadius: 6, border: '1px solid #6366f1', background: 'rgba(99,102,241,0.1)',
                                  color: '#6366f1', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                }}
                              >
                                <Download size={12} /> Certificate
                              </button>
                              {doc.doctype && (
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 8 }}>
                                  {doc.doctype}
                                </span>
                              )}
                              <ChevronDown size={14} style={{ color: '#94a3b8' }} />
                            </div>
                          </summary>
                          <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                            {doc.certificateData ? (
                              <div style={{ marginTop: 12 }}>
                                {renderCertFields(doc.certificateData)}
                              </div>
                            ) : (
                              <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', margin: '12px 0 0' }}>
                                No certificate details available. Re-verify DigiLocker to fetch document data.
                              </p>
                            )}
                          </div>
                        </details>
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

      {/* Resume Preview Modal */}
      {resumeModal && (() => {
        const { name, resume } = resumeModal;
        const isPdf = resume?.fileType?.includes('pdf') || resume?.fileName?.toLowerCase().endsWith('.pdf') || (resume?.dataUrl && resume.dataUrl.startsWith('data:application/pdf'));
        const isImage = resume?.fileType?.includes('image') || (resume?.dataUrl && resume.dataUrl.startsWith('data:image'));

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setResumeModal(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                height: '85vh',
                background: 'var(--surface, #ffffff)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                border: '1px solid var(--border-color, #e2e8f0)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border-color, #e2e8f0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg, #f8fafc)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#0284c7',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--ink, #0f172a)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {resume?.fileName || `${name}'s Resume`}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--ink-soft, #64748b)' }}>
                      Candidate: {name} • {formatFileSize(resume?.fileSize)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => openResumeInNewTab(resume)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: '#fff',
                      color: '#334155',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Open in new browser tab"
                  >
                    <ExternalLink size={14} />
                    New Tab
                  </button>
                  <button
                    onClick={() => downloadResume(resume, name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.8rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#0284c7',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Download resume file"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    onClick={() => setResumeModal(null)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: '#fff',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body / Viewer */}
              <div style={{ flex: 1, position: 'relative', background: '#334155', overflow: 'hidden' }}>
                {isPdf && resume?.dataUrl ? (
                  <iframe
                    src={resume.dataUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Resume Preview"
                  />
                ) : isImage && resume?.dataUrl ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1rem',
                      overflow: 'auto',
                    }}
                  >
                    <img
                      src={resume.dataUrl}
                      alt="Resume Preview"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      background: '#f8fafc',
                      color: '#334155',
                      padding: '2rem',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={32} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                        {resume?.fileName || 'Candidate Resume'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '400px' }}>
                        This document format is best viewed when downloaded or opened directly on your system.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => downloadResume(resume, name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.6rem 1.2rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#0284c7',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={16} />
                        Download File
                      </button>
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
