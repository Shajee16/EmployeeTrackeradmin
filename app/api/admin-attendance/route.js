import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const attendance = await db.collection('attendance').find({}).toArray();
  const users = await db.collection('users').find({}).toArray();
  const timesessions = await db.collection('timesessions').find({}).toArray();
  const leads = await db.collection('leads').find({}).toArray();
  const emails = await db.collection('emails').find({}).toArray();
  const submissions = await db.collection('submissions').find({}).toArray();

  // Group time sessions by userId+date
  const sessionMap = {};
  timesessions.forEach(ts => {
    const key = `${ts.userId}__${ts.date}`;
    if (!sessionMap[key]) sessionMap[key] = [];
    sessionMap[key].push({
      loginTime: ts.loginTime,
      logoutTime: ts.logoutTime,
      totalSeconds: ts.totalSeconds || 0,
    });
  });

  // Build activity timeline per userId+date
  const activityMap = {};

  // Leads created
  leads.forEach(l => {
    if (!l.createdAt) return;
    const d = new Date(l.createdAt);
    const dateStr = d.toISOString().split('T')[0];
    const userId = l.assignedTo || l.userId;
    if (!userId) return;
    const key = `${userId}__${dateStr}`;
    if (!activityMap[key]) activityMap[key] = [];
    activityMap[key].push({
      time: l.createdAt,
      action: `Lead created: ${l.companyName || l.contactPerson || 'Unknown'}`,
    });
  });

  // Lead activities
  leads.forEach(l => {
    (l.activities || []).forEach(a => {
      if (!a.timestamp) return;
      const d = new Date(a.timestamp);
      const dateStr = d.toISOString().split('T')[0];
      const userId = l.assignedTo || l.userId;
      if (!userId) return;
      const key = `${userId}__${dateStr}`;
      if (!activityMap[key]) activityMap[key] = [];
      activityMap[key].push({
        time: a.timestamp,
        action: `${a.type}: ${a.description || ''}`.substring(0, 120),
      });
    });
  });

  // Emails sent
  emails.forEach(e => {
    if (!e.sentAt || !e.userId) return;
    const d = new Date(e.sentAt);
    const dateStr = d.toISOString().split('T')[0];
    const key = `${e.userId}__${dateStr}`;
    if (!activityMap[key]) activityMap[key] = [];
    activityMap[key].push({
      time: e.sentAt,
      action: `Email to ${e.toName || e.to}: "${e.subject}"`.substring(0, 120),
    });
  });

  // Submissions
  submissions.forEach(s => {
    if (!s.submittedAt || !s.userId) return;
    const d = new Date(s.submittedAt);
    const dateStr = d.toISOString().split('T')[0];
    const key = `${s.userId}__${dateStr}`;
    if (!activityMap[key]) activityMap[key] = [];
    activityMap[key].push({
      time: s.submittedAt,
      action: `Submitted: ${s.formType}`,
    });
  });

  // Sort activities by time
  Object.values(activityMap).forEach(arr => arr.sort((a, b) => new Date(a.time) - new Date(b.time)));

  const enhanced = attendance.map(({ _id, ...a }) => {
    const u = users.find(user => user.id === a.userId);
    const key = `${a.userId}__${a.date}`;
    const sessions = (sessionMap[key] || []).sort((x, y) => new Date(x.loginTime) - new Date(y.loginTime));
    const activities = activityMap[key] || [];

    return {
      ...a,
      employeeName: u ? u.name : 'Unknown',
      employeeDept: u ? u.department : 'Unknown',
      sessions,
      activities,
    };
  });

  enhanced.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return NextResponse.json({ attendance: enhanced });
}
