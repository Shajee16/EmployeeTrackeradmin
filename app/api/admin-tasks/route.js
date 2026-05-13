import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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
