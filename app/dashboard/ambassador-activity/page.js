'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Palette, Calendar, MessageSquare, UserCheck, 
  Activity, Users, Building2, ChevronDown, ChevronRight, ChevronLeft,
  Video, FileText, MapPin, BookOpen, UserPlus, HelpCircle,
  Link2, QrCode, Megaphone, BarChart3, Filter, Trophy, Award, CheckCircle2,
  Trash2, Plus, AlertCircle, Clock
} from 'lucide-react';

const TYPE_LABELS = {
  content_post: 'Social Media Post',
  blog_article: 'Blog / Article',
  video_created: 'Video / Reel',
  advertised_event: 'Event Promotion',
  event_hosted: 'Event Hosted',
  campus_tour: 'Campus Tour',
  workshop: 'Workshop / Seminar',
  booth_managed: 'Booth Managed',
  planned_event: 'Planned Event',
  executed_event: 'Executed Event',
  student_mentored: 'Student Mentored',
  qa_session: 'Q&A Session',
  inquiry_response: 'Inquiry Response',
  lead_signup: 'Sign-up Collected',
  referral_distributed: 'Referral Code Shared',
  app_install: 'App Install',
  people_added: 'People Added',
};

const ROLE_COLORS = {
  content: { color: '#8b5cf6', label: 'Content Creator', types: ['content_post', 'blog_article', 'video_created', 'advertised_event'] },
  events: { color: '#f59e0b', label: 'Event Host', types: ['event_hosted', 'campus_tour', 'workshop', 'booth_managed', 'planned_event', 'executed_event'] },
  mentor: { color: '#06b6d4', label: 'Peer Mentor', types: ['student_mentored', 'qa_session', 'inquiry_response'] },
  leads: { color: '#10b981', label: 'Lead Generator', types: ['lead_signup', 'referral_distributed', 'app_install', 'people_added'] },
};

function getRoleKey(type) {
  for (const [key, cfg] of Object.entries(ROLE_COLORS)) {
    if (cfg.types.includes(type)) return key;
  }
  return 'content';
}

function getRoleColor(type) {
  return ROLE_COLORS[getRoleKey(type)]?.color || '#64748b';
}

export default function AmbassadorActivityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [activeTab, setActiveTab] = useState('activities'); // activities | proofs | leaderboard | campaigns
  
  // Gamification & Campaigns state
  const [searchRep, setSearchRep] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [collegesList, setCollegesList] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Create campaign modal form state
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStatus, setNewStatus] = useState('upcoming');
  const [newTargetColleges, setNewTargetColleges] = useState(['All']);
  
  // Auto task template state inside campaign scheduler
  const [includeTask, setIncludeTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDeadline, setTaskDeadline] = useState('');

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Selected ambassador & tasks for visual scheduler
  const [tasks, setTasks] = useState([]);
  const [selectedAmbassadorId, setSelectedAmbassadorId] = useState('');
  
  // Task Scheduler Modals (Cell Click & Task Details)
  const [showAddCalendarTaskModal, setShowAddCalendarTaskModal] = useState(false);
  const [newCalendarTask, setNewCalendarTask] = useState({
    userId: '',
    title: '',
    description: '',
    priority: 'Medium',
    startDate: '',
    deadline: '',
  });
  const [calendarTaskSubmitting, setCalendarTaskSubmitting] = useState(false);
  const [calendarTaskError, setCalendarTaskError] = useState('');
  
  // Detail Modal for Tasks clicked in Calendar
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [selectedTaskComment, setSelectedTaskComment] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin-ambassador-activity');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }

      // Fetch admin campaigns
      const campRes = await fetch('/api/admin-campaigns');
      if (campRes.ok) {
        const campData = await campRes.json();
        setCampaigns(campData.campaigns || []);
      }

      // Fetch colleges list for form dropdowns
      const colRes = await fetch('/api/admin-colleges');
      if (colRes.ok) {
        const colData = await colRes.json();
        setCollegesList(colData.colleges || []);
      }

      // Fetch admin tasks
      const tasksRes = await fetch('/api/admin-tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const loadedTasks = tasksData.tasks || [];
        setTasks(loadedTasks);
        
        // If a task detail is open, keep it updated
        if (selectedTaskDetail) {
          const updated = loadedTasks.find(t => t.id === selectedTaskDetail.id);
          if (updated) setSelectedTaskDetail(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateProofStatus = async (proofId, status) => {
    try {
      await fetch('/api/admin-ambassador-activity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId, status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      const payload = {
        title: newTitle,
        description: newDescription,
        startDate: newStartDate,
        endDate: newEndDate,
        status: newStatus,
        targetColleges: newTargetColleges,
      };

      if (includeTask && taskTitle.trim()) {
        payload.taskTemplate = {
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          deadline: taskDeadline || newEndDate,
        };
      }

      const res = await fetch('/api/admin-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (res.ok) {
        setFormSuccess(true);
        // Reset form
        setNewTitle('');
        setNewDescription('');
        setNewStartDate('');
        setNewEndDate('');
        setNewStatus('upcoming');
        setNewTargetColleges(['All']);
        setIncludeTask(false);
        setTaskTitle('');
        setTaskDescription('');
        setTaskPriority('Medium');
        setTaskDeadline('');
        
        fetchData();
        setTimeout(() => {
          setShowAddCampaignModal(false);
          setFormSuccess(false);
        }, 1200);
      } else {
        setFormError(resJson.error || 'Failed to create campaign initiative');
      }
    } catch {
      setFormError('Failed to create campaign. Network error.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Are you sure you want to cancel and delete this campaign initiative? This will also remove any Pending auto-assigned tasks.')) return;
    try {
      const res = await fetch(`/api/admin-campaigns?id=${campaignId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete campaign');
      }
    } catch {
      alert('Network error deleting campaign');
    }
  };

  const handleCalendarDayClick = (dayNum) => {
    if (!dayNum) return;
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setNewCalendarTask({
      userId: selectedAmbassadorId || '',
      title: '',
      description: '',
      priority: 'Medium',
      startDate: dateStr,
      deadline: dateStr,
    });
    setCalendarTaskError('');
    setShowAddCalendarTaskModal(true);
  };

  const handleCreateCalendarTask = async (e) => {
    e.preventDefault();
    if (!newCalendarTask.userId) {
      setCalendarTaskError('Please select a Campus Ambassador to assign this task to.');
      return;
    }
    setCalendarTaskSubmitting(true);
    setCalendarTaskError('');
    try {
      const res = await fetch('/api/admin-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCalendarTask)
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddCalendarTaskModal(false);
        setNewCalendarTask({ userId: '', title: '', description: '', priority: 'Medium', startDate: '', deadline: '' });
        fetchData();
      } else {
        setCalendarTaskError(data.error || 'Failed to create task');
      }
    } catch {
      setCalendarTaskError('Network error creating task');
    } finally {
      setCalendarTaskSubmitting(false);
    }
  };

  const updateTaskStatusInCalendar = async (taskId, status) => {
    try {
      const res = await fetch('/api/admin-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskPriorityInCalendar = async (taskId, priority) => {
    try {
      const res = await fetch('/api/admin-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, priority })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCalendarTaskComment = async () => {
    if (!selectedTaskComment.trim() || !selectedTaskDetail) return;
    try {
      const res = await fetch('/api/admin-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTaskDetail.id, adminComment: selectedTaskComment })
      });
      if (res.ok) {
        setSelectedTaskComment('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCalendarTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin-tasks?id=${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTaskDetail(null);
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete task');
      }
    } catch {
      alert('Network error deleting task');
    }
  };

  if (loading) return (
    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--surface-border)', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      Loading Activity Monitor...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const activities = data?.activities || [];
  const stats = data?.stats || {};
  const collegeStats = data?.collegeStats || [];
  const proofSubmissions = data?.proofSubmissions || [];
  const leaderboard = data?.leaderboard || [];

  // Filtering logs and proofs
  const filteredActivities = activities.filter(a => {
    const matchRole = filterRole ? ROLE_COLORS[filterRole]?.types.includes(a.type) : true;
    const matchCollege = filterCollege ? a.collegeName === filterCollege : true;
    return matchRole && matchCollege;
  });

  const filteredProofs = proofSubmissions.filter(p => {
    const matchCollege = filterCollege ? p.collegeName === filterCollege : true;
    return matchCollege;
  });

  const filteredLeaderboard = leaderboard.filter(rep => {
    const matchCollege = filterCollege ? rep.collegeName === filterCollege : true;
    const matchSearch = searchRep ? (rep.name.toLowerCase().includes(searchRep.toLowerCase()) || rep.collegeName.toLowerCase().includes(searchRep.toLowerCase())) : true;
    return matchCollege && matchSearch;
  });

  const colleges = [...new Set(activities.map(a => a.collegeName))].sort();

  const statCards = [
    { label: 'Total Activities', value: stats.totalActivities || 0, icon: Activity, color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
    { label: 'Content Created', value: stats.contentCreated || 0, icon: Palette, color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { label: 'Events Hosted', value: stats.eventsHosted || 0, icon: Calendar, color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { label: 'Students Mentored', value: stats.studentsMentored || 0, icon: MessageSquare, color: '#06b6d4', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { label: 'Leads Generated', value: stats.leadsGenerated || 0, icon: UserCheck, color: '#10b981', bg: 'linear-gradient(135deg, #10b981, #059669)' },
    { label: 'Proof Submissions', value: stats.totalProofSubmissions || 0, icon: FileText, color: '#ec4899', bg: 'linear-gradient(135deg, #ec4899, #db2777)' },
  ];

  const PROOF_CAT_COLORS = { content: '#8b5cf6', event: '#f59e0b', lead: '#10b981', admin: '#ec4899' };
  const PROOF_CAT_LABELS = { content: 'Content', event: 'Event', lead: 'Lead', admin: 'Admin & Compensation' };
  const PROOF_CAT_EMOJIS = { content: '🎨', event: '🎪', lead: '🎯', admin: '📋' };

  // Calendar parameters for Campaigns tab
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(calendarDate);
  const startDay = getFirstDayOfMonth(calendarDate);
  const blanks = Array(startDay).fill(null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...monthDays];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getCampaignsForDate = (dayNum) => {
    if (!dayNum) return [];
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return campaigns.filter(camp => {
      const start = camp.startDate;
      const end = camp.endDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  const getTasksForDate = (dayNum, ambassadorId) => {
    if (!dayNum || !ambassadorId) return [];
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return tasks.filter(t => {
      if (t.userId !== ambassadorId) return false;
      const start = t.startDate ? t.startDate.substring(0, 10) : (t.createdAt || '').substring(0, 10) || dateStr;
      const end = (t.deadline || '').substring(0, 10);
      return end && dateStr >= start && dateStr <= end;
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Ambassador Activity Monitor</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Track activities, review proof submissions, oversee gamification leaderboard and coordinate campaigns
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ padding: '18px 16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderRadius: '50%', background: `${s.color}10` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color="#fff" />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* ═══ Tabs Navigation ═══ */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-secondary)', borderRadius: 12, padding: 4 }}>
        {[
          { key: 'activities', label: 'Activity Logs', count: filteredActivities.length },
          { key: 'proofs', label: 'Proof Submissions', count: filteredProofs.length, pending: stats.pendingProofs || 0 },
          { key: 'leaderboard', label: 'Gamification Leaderboard', count: filteredLeaderboard.length },
          { key: 'campaigns', label: 'Campaign Scheduler', count: campaigns.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 500, fontSize: '0.84rem',
              boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {tab.label}
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: 'var(--bg-secondary)' }}>{tab.count}</span>
            {tab.pending > 0 && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: '#f59e0b15', color: '#f59e0b' }}>
                {tab.pending} pending
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ General Filters ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} color="var(--text-muted)" />
        {activeTab === 'activities' && (
          <div className="card" style={{ padding: '0 14px', height: 40, display: 'flex', alignItems: 'center' }}>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.84rem', outline: 'none', color: 'var(--text)', cursor: 'pointer' }}>
              <option value="">All Roles</option>
              {Object.entries(ROLE_COLORS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        )}
        {(activeTab === 'activities' || activeTab === 'proofs' || activeTab === 'leaderboard') && (
          <div className="card" style={{ padding: '0 14px', height: 40, display: 'flex', alignItems: 'center' }}>
            <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.84rem', outline: 'none', color: 'var(--text)', cursor: 'pointer' }}>
              <option value="">All Colleges</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {activeTab === 'leaderboard' && (
          <input
            value={searchRep}
            onChange={e => setSearchRep(e.target.value)}
            placeholder="Search rep by name..."
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid var(--surface-border)',
              fontSize: '0.84rem', background: 'var(--surface)', color: 'var(--text)', width: 220, height: 40, boxSizing: 'border-box'
            }}
          />
        )}
      </div>

      {/* ═══ TABS CONTENT ═══ */}

      {/* 1. Activities Tab */}
      {activeTab === 'activities' && (
        <>
          {filteredActivities.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <GraduationCap size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No activities found</p>
              <p style={{ fontSize: '0.82rem' }}>Ambassador activities will appear here once logged.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredActivities.slice(0, 50).map((act, idx) => {
                const roleColor = getRoleColor(act.type);
                return (
                  <div
                    key={act.id || idx}
                    className="card"
                    style={{ padding: '14px 18px', borderLeft: `4px solid ${roleColor}`, display: 'flex', alignItems: 'flex-start', gap: 14 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${roleColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={16} color={roleColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{act.ambassadorName}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${roleColor}12`, color: roleColor }}>
                            {TYPE_LABELS[act.type] || act.type}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(act.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {act.description && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 6px', lineHeight: 1.5 }}>{act.description}</p>}
                      <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GraduationCap size={12} color="#0ea5e9" />{act.collegeName}</span>
                        {act.metrics?.count > 0 && <span style={{ fontWeight: 700, color: roleColor }}>Count: {act.metrics.count}</span>}
                        {act.metrics?.eventName && <span>📌 {act.metrics.eventName}</span>}
                        {act.proofs?.length > 0 && <span style={{ color: roleColor }}>📎 Proof attached</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 2. Proof Submissions Tab */}
      {activeTab === 'proofs' && (
        <>
          {filteredProofs.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No proof submissions yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredProofs.map((p, idx) => {
                const catColor = PROOF_CAT_COLORS[p.category] || '#64748b';
                const catLabel = PROOF_CAT_LABELS[p.category] || p.category;
                const catEmoji = PROOF_CAT_EMOJIS[p.category] || '📄';
                const statusBg = p.status === 'approved' ? '#10b98115' : p.status === 'rejected' ? '#ef444415' : '#f59e0b15';
                const statusColor = p.status === 'approved' ? '#10b981' : p.status === 'rejected' ? '#ef4444' : '#f59e0b';

                return (
                  <div
                    key={p.id || idx}
                    className="card"
                    style={{ padding: '16px 20px', borderLeft: `4px solid ${catColor}` }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.2rem' }}>{catEmoji}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.title || 'Untitled'}</span>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '1px 8px', borderRadius: 6, background: `${catColor}12`, color: catColor }}>{catLabel}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>by {p.ambassadorName}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• {p.collegeName}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: statusBg, color: statusColor, textTransform: 'capitalize' }}>
                          {p.status}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    {/* Category data */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                      {p.category === 'content' && p.contentData && (<>
                        {p.contentData.platform && <span>📱 {p.contentData.platform}</span>}
                        {p.contentData.postUrl && <a href={p.contentData.postUrl} target="_blank" rel="noopener noreferrer" style={{ color: catColor, fontWeight: 600 }}>🔗 View Post</a>}
                        {p.contentData.views > 0 && <span>👁 {p.contentData.views} views</span>}
                        {p.contentData.likes > 0 && <span>❤️ {p.contentData.likes} likes</span>}
                      </>)}
                      {p.category === 'event' && p.eventData && (<>
                        <span>📌 {p.eventData.eventName}</span>
                        {p.eventData.eventDate && <span>📅 {p.eventData.eventDate}</span>}
                        {p.eventData.attendeeCount > 0 && <span>👥 {p.eventData.attendeeCount} attendees</span>}
                      </>)}
                      {p.category === 'lead' && p.leadData && (<>
                        <span>👤 {p.leadData.leadName}</span>
                        {p.leadData.leadEmail && <span>✉️ {p.leadData.leadEmail}</span>}
                        {p.leadData.leadInterest && <span>🎓 {p.leadData.leadInterest}</span>}
                      </>)}
                      {p.category === 'admin' && p.adminData && (<>
                        <span>📋 {p.adminData.claimType}</span>
                        {p.adminData.amount > 0 && <span>💰 ₹{p.adminData.amount}</span>}
                        {p.adminData.hoursWorked > 0 && <span>⏱ {p.adminData.hoursWorked}h</span>}
                      </>)}
                      {p.proofs?.length > 0 && <span style={{ color: catColor }}>📎 {p.proofs.length} file(s)</span>}
                    </div>

                    {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>{p.description}</p>}

                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button onClick={() => updateProofStatus(p.id, 'approved')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '5px 12px', background: '#10b981', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => updateProofStatus(p.id, 'rejected')} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 3. Gamification Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={18} color="var(--primary)" />
            Active Campus Ambassador Rankings
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Ambassador</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>College Campus</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Earned Badges</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Total Logs</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Score Points</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((rep) => (
                  <tr key={rep.userId} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      {rep.rank <= 3 ? (
                        <span style={{ fontSize: '1.2rem' }}>
                          {rep.rank === 1 ? '🥇' : rep.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{rep.rank}</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `linear-gradient(135deg, #3b82f6, #1d4ed8)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                        }}>
                          {rep.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{rep.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{rep.collegeName}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {rep.badges.filter(b => b.unlocked).map(b => (
                          <span key={b.id} title={b.label} style={{ fontSize: '1.1rem' }}>{b.emoji}</span>
                        ))}
                        {rep.badges.filter(b => b.unlocked).length === 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No badges yet</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {rep.stats.totalActivities}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      {rep.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Campaigns Scheduler Tab */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, flexWrap: 'wrap' }}>
          
          {/* Visual Administrative Calendar and Scheduler */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Visual Calendar */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} color="var(--primary)" />
                    Campus Initiatives Visual Calendar
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Click any day cell to schedule a task directly!
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Select Ambassador Dropdown */}
                  <select
                    value={selectedAmbassadorId}
                    onChange={e => setSelectedAmbassadorId(e.target.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--surface-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: 220
                    }}
                  >
                    <option value="">👤 All / Campaigns Only</option>
                    {leaderboard.map(rep => (
                      <option key={rep.userId} value={rep.userId}>
                        👤 {rep.name} ({rep.collegeName})
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: 6, minWidth: 'auto', display: 'flex' }}><ChevronLeft size={16} /></button>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', width: 120, textAlign: 'center' }}>
                      {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: 6, minWidth: 'auto', display: 'flex' }}><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>

              {/* Month Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase' }}>
                    {day}
                  </div>
                ))}

                {calendarCells.map((dayNum, cellIdx) => {
                  const dateCampaigns = getCampaignsForDate(dayNum);
                  const dateTasks = getTasksForDate(dayNum, selectedAmbassadorId);
                  
                  return (
                    <div
                      key={cellIdx}
                      onClick={() => handleCalendarDayClick(dayNum)}
                      style={{
                        minHeight: 110, padding: 8, borderRadius: 10,
                        background: dayNum ? 'var(--bg-secondary)' : 'transparent',
                        border: dayNum ? '1px solid var(--surface-border)' : 'none',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        cursor: dayNum ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (dayNum) { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.background = 'var(--surface)'; } }}
                      onMouseLeave={e => { if (dayNum) { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; } }}
                    >
                      {dayNum && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {dayNum}
                        </span>
                      )}
                      
                      {/* Campaigns */}
                      {dateCampaigns.slice(0, 2).map((camp) => (
                        <div
                          key={`camp-${camp.id}`}
                          onClick={(e) => { e.stopPropagation(); }}
                          style={{
                            fontSize: '0.58rem', fontWeight: 700, padding: '2px 4px',
                            background: camp.status === 'active' ? '#8b5cf6' : '#06b6d4',
                            color: '#fff', borderRadius: 3,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}
                          title={`Campaign: ${camp.title}`}
                        >
                          📢 {camp.title}
                        </div>
                      ))}

                      {/* Ambassador tasks */}
                      {dateTasks.slice(0, 2).map((t) => {
                        const completed = t.status === 'Completed';
                        const isOverdue = t.status !== 'Completed' && new Date(t.deadline) < new Date();
                        const ribbonBg = completed 
                          ? 'linear-gradient(135deg, #10b981, #059669)' // Green
                          : isOverdue 
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)' // Red
                          : 'linear-gradient(135deg, #3b82f6, #2563eb)'; // Blue
                        return (
                          <div
                            key={`task-${t.id}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedTaskDetail(t); }}
                            style={{
                              fontSize: '0.58rem', fontWeight: 700, padding: '2px 4px',
                              background: ribbonBg,
                              color: '#fff', borderRadius: 3, cursor: 'pointer',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}
                            title={`Task: ${t.title} (${t.status})`}
                          >
                            📋 {t.title}
                          </div>
                        );
                      })}

                      {(dateCampaigns.length + dateTasks.length) > 4 && (
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                          + {dateCampaigns.length + dateTasks.length - 4} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaigns timeline cards list */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Active Campus Campaigns</h3>
                <button onClick={() => setShowAddCampaignModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 14px', borderRadius: 8 }}>
                  <Plus size={14} /> Schedule Initiative
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {campaigns.length === 0 ? (
                  <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    No campaigns scheduled yet. Click "Schedule Initiative" to launch one!
                  </div>
                ) : (
                  campaigns.map(camp => (
                    <div key={camp.id} style={{
                      padding: 16, borderRadius: 12, border: '1px solid var(--surface-border)',
                      background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 8,
                            background: camp.status === 'active' ? '#8b5cf615' : '#06b6d415',
                            color: camp.status === 'active' ? '#8b5cf6' : '#06b6d4',
                            textTransform: 'uppercase',
                          }}>{camp.status}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Timeline: {new Date(camp.startDate).toLocaleDateString()} to {new Date(camp.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{camp.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                          {camp.description}
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>👥 Targets: <strong>{camp.ambassadorCount} Ambassadors</strong></span>
                          <span>🏢 Campus: <strong>{camp.targetCollegeNames?.join(', ')}</strong></span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteCampaign(camp.id)} style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 6,
                        display: 'flex', alignItems: 'center',
                      }} title="Delete Initiative">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Colleges Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 12 }}>
                College Outreach Metrics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collegeStats.sort((a, b) => b.total - a.total).slice(0, 6).map(c => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <Building2 size={13} color="#0ea5e9" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{c.total} logs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Visual Schedule Initiative Modal ═══ */}
      {showAddCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowAddCampaignModal(false)}
        >
          <div className="card" style={{ width: 550, maxWidth: '95vw', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Schedule Campus Initiative
              </h3>
              <button onClick={() => setShowAddCampaignModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '80vh', overflowY: 'auto' }}>
              {formSuccess && (
                <div style={{ background: '#10b98115', border: '1px solid #10b981', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={18} /> Campaign scheduled and tasks assigned!
                </div>
              )}
              {formError && (
                <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: '0.85rem' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Campaign Title *</label>
                <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Social Media Blitz, June Enrollment Drive" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Initiative Description</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="What are the goals of this campaign initiative?..." rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.85rem', resize: 'none', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Start Date *</label>
                  <input required type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>End Date *</label>
                  <input required type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Target Campus Colleges *</label>
                  <select multiple value={newTargetColleges} onChange={e => setNewTargetColleges(Array.from(e.target.selectedOptions, option => option.value))} style={{ width: '100%', padding: '6px 10px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.84rem', background: 'var(--surface)', color: 'var(--text)', height: 60 }}>
                    <option value="All">All Colleges</option>
                    {collegesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto Task template checkbox */}
              <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeTask} onChange={e => setIncludeTask(e.target.checked)} />
                  Auto-Assign Task Template to Ambassadors
                </label>
                
                {includeTask && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                    <div>
                      <input required={includeTask} value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task Title (e.g. Publish social media reel)" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Task Description & instructions..." rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', resize: 'none', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)' }}>
                          <option value="Low">Low Priority</option>
                          <option value="Medium">Medium Priority</option>
                          <option value="High">High Priority</option>
                          <option value="Critical">Critical Priority</option>
                        </select>
                      </div>
                      <div>
                        <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={formSubmitting} className="btn btn-primary" style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', marginTop: 6,
              }}>
                {formSubmitting ? 'Scheduling Initiative...' : 'Schedule Initiative & Assign Tasks'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Visual Schedule Calendar Task Modal ═══ */}
      {showAddCalendarTaskModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowAddCalendarTaskModal(false)}
        >
          <div className="card" style={{ width: 520, maxWidth: '95vw', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Schedule Ambassador Task
              </h3>
              <button onClick={() => setShowAddCalendarTaskModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCalendarTask} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {calendarTaskError && (
                <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: '0.85rem' }}>
                  {calendarTaskError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Assign To Campus Ambassador *</label>
                <select required value={newCalendarTask.userId} onChange={e => setNewCalendarTask({ ...newCalendarTask, userId: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }}>
                  <option value="">Select Ambassador...</option>
                  {leaderboard.map(rep => (
                    <option key={rep.userId} value={rep.userId}>{rep.name} ({rep.collegeName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Task Title *</label>
                <input required value={newCalendarTask.title} onChange={e => setNewCalendarTask({ ...newCalendarTask, title: e.target.value })} placeholder="e.g. Host introductory workshop" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Task Description</label>
                <textarea value={newCalendarTask.description} onChange={e => setNewCalendarTask({ ...newCalendarTask, description: e.target.value })} placeholder="Enter guidelines or instructions..." rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.85rem', resize: 'none', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Start Date *</label>
                  <input required type="date" value={newCalendarTask.startDate} onChange={e => setNewCalendarTask({ ...newCalendarTask, startDate: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Deadline (End Date) *</label>
                  <input required type="date" value={newCalendarTask.deadline} onChange={e => setNewCalendarTask({ ...newCalendarTask, deadline: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Priority</label>
                <select value={newCalendarTask.priority} onChange={e => setNewCalendarTask({ ...newCalendarTask, priority: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical Priority</option>
                </select>
              </div>

              <button type="submit" disabled={calendarTaskSubmitting} className="btn btn-primary" style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', marginTop: 6,
              }}>
                {calendarTaskSubmitting ? 'Creating Task...' : 'Schedule & Assign Task'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Admin Task Details Modal ═══ */}
      {selectedTaskDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setSelectedTaskDetail(null)}
        >
          <div className="card" style={{ width: 560, maxWidth: '95vw', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: selectedTaskDetail.status === 'Completed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 4 }}>
                  Ambassador Task Detail
                </span>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  {selectedTaskDetail.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTaskDetail(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Task Description
                </h4>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {selectedTaskDetail.description || 'No description provided.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned To</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedTaskDetail.employeeName || 'Campus Ambassador'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Campus College</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedTaskDetail.employeeDept || 'Student Chapter'}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Status</label>
                  <select
                    value={selectedTaskDetail.status}
                    onChange={e => updateTaskStatusInCalendar(selectedTaskDetail.id, e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Priority</label>
                  <select
                    value={selectedTaskDetail.priority}
                    onChange={e => updateTaskPriorityInCalendar(selectedTaskDetail.id, e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>
                  <strong>Start Date:</strong> {new Date(selectedTaskDetail.startDate || selectedTaskDetail.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <strong>Deadline:</strong> {new Date(selectedTaskDetail.deadline).toLocaleDateString()}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: '4px 0' }} />

              {/* Conversational Comments */}
              <div>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={13} color="var(--primary)" /> Comments & Conversation
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}>
                  {(selectedTaskDetail.comments || []).map((c, ci) => (
                    <div key={c.id || ci} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.by === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {c.by === 'admin' ? 'Admin (You)' : 'Ambassador'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text)' }}>{c.text}</p>
                    </div>
                  ))}
                  {(!selectedTaskDetail.comments || selectedTaskDetail.comments.length === 0) && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: 12, margin: 0 }}>
                      No messages or comments logged for this task.
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="Type an instruction or comment..."
                    value={selectedTaskComment}
                    onChange={e => setSelectedTaskComment(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--surface-border)', fontSize: '0.82rem', background: 'var(--surface)', color: 'var(--text)' }}
                    onKeyDown={e => e.key === 'Enter' && handleAddCalendarTaskComment()}
                  />
                  <button onClick={handleAddCalendarTaskComment} className="btn btn-primary btn-sm" style={{ padding: '8px 14px', borderRadius: 8 }}>
                    Send
                  </button>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--surface-border)', margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleDeleteCalendarTask(selectedTaskDetail.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 10,
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                >
                  <Trash2 size={13} /> Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
