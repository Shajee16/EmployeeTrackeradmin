import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString, sanitizeInput } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

// GET /api/admin-alerts — list all alerts (admin) OR active alerts for employee (employee token)
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const forEmployee = searchParams.get('forEmployee'); // employee portal passes this

  if (forEmployee) {
    // Return active alerts targeting this employee, their dept, or 'all'
    const empId = session.id;
    // Get employee info
    const usersCol = db.collection('users');
    const emp = await usersCol.findOne({ id: empId });
    const dept = emp?.department || '';

    const alerts = await db.collection('alerts').find({
      status: 'active',
      $or: [
        { targetType: 'all' },
        { targetType: 'department', targetDepartment: dept },
        { targetType: 'employee', targetEmployeeId: empId },
      ],
    }).sort({ createdAt: -1 }).toArray();

    // Filter out already acknowledged
    const acks = await db.collection('alert_acknowledgements').find({ employeeId: empId }).toArray();
    const ackedIds = new Set(acks.map(a => a.alertId));
    const unacked = alerts.filter(a => !ackedIds.has(String(a._id)) && !ackedIds.has(a.id));

    return NextResponse.json({
      alerts: alerts.map(({ _id, ...a }) => a),
      unacknowledged: unacked.map(({ _id, ...a }) => a),
    });
  }

  // Admin view — all alerts
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const alerts = await db.collection('alerts').find({}).sort({ createdAt: -1 }).toArray();
  const acks = await db.collection('alert_acknowledgements').find({}).toArray();

  const alertsWithAcks = alerts.map(({ _id, ...a }) => {
    const alertAcks = acks.filter(ak => ak.alertId === a.id).map(({ _id: _, ...ak }) => ak);
    return { ...a, acknowledgements: alertAcks };
  });

  return NextResponse.json({ alerts: alertsWithAcks });
}

// POST /api/admin-alerts — create alert (admin only)
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!body.message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  if (!['all', 'department', 'employee'].includes(body.targetType)) {
    return NextResponse.json({ error: 'Invalid targetType' }, { status: 400 });
  }

  const alert = {
    id: uuid(),
    title: sanitizeString(body.title, 200),
    message: sanitizeString(body.message, 2000),
    severity: ['info', 'warning', 'critical'].includes(body.severity) ? body.severity : 'info',
    targetType: body.targetType,
    targetDepartment: body.targetType === 'department' ? sanitizeString(body.targetDepartment || '', 100) : null,
    targetEmployeeId: body.targetType === 'employee' ? sanitizeString(body.targetEmployeeId || '', 50) : null,
    targetEmployeeName: body.targetType === 'employee' ? sanitizeString(body.targetEmployeeName || '', 100) : null,
    requireComment: body.requireComment === true,
    commentPrompt: sanitizeString(body.commentPrompt || 'Please acknowledge this alert.', 500),
    status: 'active',
    createdBy: session.name || session.email,
    createdByRole: session.role,
    createdAt: new Date().toISOString(),
    expiresAt: body.expiresAt ? sanitizeString(body.expiresAt, 30) : null,
  };

  const db = await getDb();
  await db.collection('alerts').insertOne(alert);

  // Send email to targeted employees
  try {
    const { sendEmail } = await import('@/lib/graph-mail');
    const { readData, writeData } = await import('@/lib/db');
    
    let query = {};
    if (alert.targetType === 'employee') query = { id: alert.targetEmployeeId };
    else if (alert.targetType === 'department') query = { department: alert.targetDepartment };
    // if 'all', query stays {}
    
    const usersCol = db.collection('users');
    const targetUsers = await usersCol.find(query).toArray();
    
    const emailsData = await readData('emails');
    const subject = `An alert is issued by "${alert.createdBy}" with severity "${alert.severity.toUpperCase()}"`;
    const emailBody = `An alert has been issued that requires your attention.\n\nTitle: ${alert.title}\n\nMessage:\n${alert.message}\n\nPlease log in to the Employee Portal to acknowledge this alert immediately.`;

    for (const u of targetUsers) {
      if (!u.email) continue;
      try {
        await sendEmail({
          to: u.email,
          toName: u.name || 'Employee',
          subject,
          body: emailBody,
        });
        
        emailsData.push({
          id: uuid(),
          userId: session.id, // sender is admin
          senderName: session.name || session.email,
          to: u.email,
          toName: u.name,
          subject,
          body: emailBody,
          template: 'alert',
          status: 'Delivered',
          sentAt: new Date().toISOString(),
          sentFrom: process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in',
        });
      } catch (err) {
        console.error('Failed to send alert email to', u.email, err);
      }
    }
    
    await writeData('emails', emailsData);
  } catch (err) {
    console.error('Error in alert email broadcast:', err);
  }

  return NextResponse.json({ alert, success: true });
}

// PUT /api/admin-alerts — update alert status (admin) or acknowledge (employee)
export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const db = await getDb();

  // Employee acknowledging an alert
  if (body.action === 'acknowledge') {
    const empId = session.id;
    const existing = await db.collection('alert_acknowledgements').findOne({ alertId: body.alertId, employeeId: empId });
    if (existing) return NextResponse.json({ success: true, alreadyAcked: true });

    await db.collection('alert_acknowledgements').insertOne({
      id: uuid(),
      alertId: sanitizeString(body.alertId, 50),
      employeeId: empId,
      employeeName: session.name || '',
      comment: sanitizeString(body.comment || '', 1000),
      acknowledgedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  }

  // Admin closing/archiving an alert
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.collection('alerts').updateOne(
    { id: sanitizeString(body.id, 50) },
    { $set: { status: body.status || 'closed', updatedAt: new Date().toISOString() } }
  );
  return NextResponse.json({ success: true });
}

// DELETE /api/admin-alerts
export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const db = await getDb();
  await db.collection('alerts').deleteOne({ id });
  await db.collection('alert_acknowledgements').deleteMany({ alertId: id });
  return NextResponse.json({ success: true });
}
