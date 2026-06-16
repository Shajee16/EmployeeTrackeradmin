import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitize';

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  const safeId = sanitizeString(employeeId, 50);

  // Gather leads (and their activities + follow-ups)
  const leads = (await readData('leads')).filter(l => l.userId === safeId);
  const followups = (await readData('followups') || []).filter(f => f.userId === safeId);
  const submissions = (await readData('submissions') || []).filter(s => s.userId === safeId);
  const emails = (await readData('emails') || []).filter(e => e.userId === safeId);
  const attendance = (await readData('attendance') || []).filter(a => a.userId === safeId);
  const tasks = (await readData('tasks') || []).filter(t => t.userId === safeId);

  // Build a unified activity timeline
  const timeline = [];

  // Lead activities and Lead creations
  leads.forEach(lead => {
    timeline.push({
      type: 'Lead Created',
      description: `Added lead: ${lead.companyName}`,
      timestamp: lead.createdAt || lead.updatedAt || new Date().toISOString(),
      context: lead.companyName,
      source: 'lead_creation',
      fullData: lead,
    });

    (lead.activities || []).forEach(act => {
      timeline.push({
        type: act.type || 'Activity',
        description: act.description,
        timestamp: act.timestamp,
        context: lead.companyName,
        source: 'lead',
        fullData: act,
      });
    });
  });

  // Follow-ups
  followups.forEach(f => {
    timeline.push({
      type: 'Follow-up',
      description: `${f.mode} with ${f.contactPerson || f.clientName} — ${f.clientResponse || 'N/A'}${f.discussionSummary ? '. ' + f.discussionSummary.substring(0, 100) : ''}`,
      timestamp: f.date || f.createdAt,
      context: f.clientName,
      source: 'followup',
      fullData: f,
    });
  });

  // Emails
  emails.forEach(e => {
    timeline.push({
      type: 'Email',
      description: `Sent: ${e.subject}`,
      timestamp: e.sentAt,
      context: e.toName || e.to,
      source: 'email',
      fullData: e,
    });
  });

  // Submissions (DARs)
  submissions.forEach(s => {
    timeline.push({
      type: 'DAR',
      description: s.summary || s.title || 'Daily Activity Report submitted',
      timestamp: s.submittedAt || s.createdAt,
      context: s.status || 'Submitted',
      source: 'submission',
      fullData: s,
    });
  });

  // Tasks
  tasks.forEach(t => {
    timeline.push({
      type: 'Task Status',
      description: `Task: ${t.title || 'Untitled'}`,
      timestamp: t.updatedAt || t.createdAt || new Date().toISOString(),
      context: t.status || 'Assigned',
      source: 'task',
      fullData: t,
    });
  });

  // Sort newest first
  timeline.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const totalHoursLogged = Number(attendance.reduce((sum, a) => sum + (Number(a.totalHours) || 0), 0).toFixed(2));

  // Summary stats
  const stats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(l => !['Closed', 'Lost'].includes(l.status)).length,
    closedDeals: leads.filter(l => l.status === 'Closed').length,
    totalFollowups: followups.length,
    totalEmails: emails.length,
    totalSubmissions: submissions.length,
    totalActivities: timeline.length,
    totalHoursLogged,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'Completed').length,
    lastActivityDate: timeline[0]?.timestamp || null,
  };

  return NextResponse.json({
    stats,
    attendance: attendance.map(a => ({ date: a.date, totalHours: a.totalHours, status: a.status })),
    timeline: timeline.slice(0, 50), // cap at 50 most recent
    leads: leads.map(l => ({
      id: l.id,
      companyName: l.companyName,
      contactPerson: l.contactPerson,
      status: l.status,
      priority: l.priority,
      activitiesCount: (l.activities || []).length,
      updatedAt: l.updatedAt,
    })),
  });
}
