import { NextResponse } from 'next/server';
import { readData, writeData, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isNonEmptyString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';
import { sendTaskEmail } from '@/lib/mailer';

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024; // 3 MB

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tasks = await readData('tasks');
  const users = await readData('users');

  // Auto-cleanup: remove attachments older than 25 days from MongoDB
  try {
    const db = await getDb();
    const cutoff = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
    await db.collection('task_attachments').deleteMany({ createdAt: { $lt: cutoff.toISOString() } });
  } catch (err) {
    console.error('Attachment cleanup error (non-fatal):', err);
  }

  const enhanced = tasks.map(t => {
    const u = users.find(user => user.id === t.userId);
    return { ...t, employeeName: u ? u.name : 'Unknown', employeeDept: u ? u.department : 'Unknown' };
  });

  enhanced.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
  return NextResponse.json({ tasks: enhanced });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Extract attachment before sanitization (base64 is huge)
  const rawAttachment = rawBody.attachment || null;
  delete rawBody.attachment;
  const body = sanitizeInput(rawBody);

  if (!isNonEmptyString(body.userId)) {
    return NextResponse.json({ error: 'Employee (userId) is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
  }

  const tasks = await readData('tasks');
  const users = await readData('users');
  const assignedUser = users.find(u => u.id === body.userId);

  const taskId = uuid();
  const newTask = {
    id: taskId,
    userId: sanitizeString(body.userId, 50),
    title: sanitizeString(body.title, 200),
    description: sanitizeString(body.description || '', 2000),
    priority: isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical']) ? body.priority : 'Medium',
    status: 'Pending',
    deadline: sanitizeString(body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 30),
    comments: [],
    completionProof: null,
    createdAt: new Date().toISOString(),
    hasAttachment: false,
    attachmentName: null,
  };

  // Handle attachment: validate size, store in MongoDB
  let attachmentData = null;
  if (rawAttachment && rawAttachment.data && rawAttachment.filename) {
    const base64Part = rawAttachment.data.split(',')[1] || rawAttachment.data;
    const sizeInBytes = Math.ceil(base64Part.length * 3 / 4);
    
    if (sizeInBytes > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: 'Attachment exceeds 3 MB limit' }, { status: 400 });
    }

    const db = await getDb();
    attachmentData = {
      taskId,
      filename: sanitizeString(rawAttachment.filename, 200),
      contentType: sanitizeString(rawAttachment.contentType || 'application/octet-stream', 100),
      base64Data: base64Part,
      sizeBytes: sizeInBytes,
      createdAt: new Date().toISOString(),
    };
    await db.collection('task_attachments').insertOne(attachmentData);

    newTask.hasAttachment = true;
    newTask.attachmentName = attachmentData.filename;
  }

  const db = await getDb();
  await db.collection('tasks').insertOne(newTask);

  await logAdminAction(session, 'CREATE_TASK', 'task', newTask.id, {
    title: newTask.title,
    assignedTo: newTask.userId,
    priority: newTask.priority,
  });

  // Send email notification to the assigned employee
  if (assignedUser && assignedUser.email) {
    const priorityColors = { Low: '#3b82f6', Medium: '#f59e0b', High: '#ef4444', Critical: '#dc2626' };
    const priorityColor = priorityColors[newTask.priority] || '#6b7280';
    const deadlineFormatted = newTask.deadline ? new Date(newTask.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
    
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #6366f1, #7c3aed); padding: 28px 32px; color: #fff;">
          <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700;">📋 New Task Assigned</h1>
          <p style="margin: 0; opacity: 0.85; font-size: 14px;">You have been assigned a new task by ${session.name || 'Admin'}</p>
        </div>
        <div style="padding: 28px 32px;">
          <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${newTask.title}</h2>
          ${newTask.description ? `<div style="background: #f3f4f6; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; line-height: 1.7; color: #374151; border-left: 4px solid #6366f1;">${newTask.description.replace(/\n/g, '<br/>')}</div>` : ''}
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; width: 120px;">Priority</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><span style="background: ${priorityColor}; color: #fff; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${newTask.priority}</span></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Deadline</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-size: 14px;">📅 ${deadlineFormatted}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">Assigned By</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; font-size: 14px;">${session.name || session.email}</td>
            </tr>
            ${newTask.hasAttachment ? `<tr><td style="padding: 10px 0; color: #6b7280; font-size: 13px;">Attachment</td><td style="padding: 10px 0; font-weight: 600; color: #111827; font-size: 14px;">📎 ${newTask.attachmentName}</td></tr>` : ''}
          </table>
          <p style="font-size: 13px; color: #6b7280; margin: 20px 0 0 0;">Please log in to the Employee Portal to view details and update your progress.</p>
        </div>
        <div style="padding: 16px 32px; background: #f3f4f6; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
          Sent from Cluso Employee Tracker • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    `;

    try {
      await sendTaskEmail({
        to: assignedUser.email,
        toName: assignedUser.name,
        subject: `📋 New Task: ${newTask.title}`,
        htmlBody,
        attachment: attachmentData ? {
          filename: attachmentData.filename,
          contentType: attachmentData.contentType,
          base64Data: attachmentData.base64Data,
        } : undefined,
      });
    } catch (emailErr) {
      console.error('Task email notification error (non-fatal):', emailErr);
    }
  }

  return NextResponse.json({ task: newTask });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection('tasks').findOne({ id: body.id });

  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { status: target.status, priority: target.priority };
  const updateFields = {};
  
  if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed', 'Cancelled'])) {
    updateFields.status = body.status;
  }
  if (body.priority && isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical'])) {
    updateFields.priority = body.priority;
  }
  
  const updateDoc = {};
  if (Object.keys(updateFields).length > 0) {
    updateDoc.$set = updateFields;
  }
  
  if (body.adminComment) {
    const newComment = {
      id: uuid(),
      text: sanitizeString(body.adminComment, 1000),
      timestamp: new Date().toISOString(),
      by: 'admin'
    };
    updateDoc.$push = { comments: newComment };
  }

  if (Object.keys(updateDoc).length > 0) {
    await db.collection('tasks').updateOne({ id: body.id }, updateDoc);
  }

  const updatedTask = await db.collection('tasks').findOne({ id: body.id });

  await logAdminAction(session, 'UPDATE_TASK', 'task', body.id, {
    before,
    after: { status: updatedTask.status, priority: updatedTask.priority },
  });

  return NextResponse.json({ task: updatedTask });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const db = await getDb();
  const target = await db.collection('tasks').findOne({ id });
  
  if (!target) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await db.collection('tasks').deleteOne({ id });
  
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  // Also remove attachment from MongoDB if any
  try {
    const db = await getDb();
    await db.collection('task_attachments').deleteMany({ taskId: id });
  } catch {}

  await logAdminAction(session, 'DELETE_TASK', 'task', id, {
    title: target?.title,
    assignedTo: target?.userId,
  });

  return NextResponse.json({ success: true });
}
