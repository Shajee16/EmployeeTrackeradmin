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
  const db = await getDb();
  const colleges = await db.collection('colleges').find({}).toArray();

  // Auto-cleanup: remove attachments older than 25 days from MongoDB
  try {
    const cutoff = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000);
    await db.collection('task_attachments').deleteMany({ createdAt: { $lt: cutoff.toISOString() } });
  } catch (err) {
    console.error('Attachment cleanup error (non-fatal):', err);
  }

  const enhanced = tasks.map(t => {
    if (t.userId === 'Student Ambassador' || t.scope === 'department') {
      return { ...t, employeeName: 'All Campus Ambassadors', employeeDept: 'Student Ambassador' };
    }
    const college = colleges.find(c => c.id === t.userId || c.id === t.collegeId);
    if (college) {
      return { ...t, employeeName: `${college.name} Chapter`, employeeDept: 'Student Ambassador' };
    }
    const u = users.find(user => user.id === t.userId);
    return { ...t, employeeName: u ? u.name : 'Unknown', employeeDept: u ? u.department : 'Unknown' };
  });

  enhanced.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

  const hasUserIds = Array.isArray(body.userIds) && body.userIds.length > 0;
  if (!isNonEmptyString(body.userId) && !hasUserIds) {
    return NextResponse.json({ error: 'Employee or target scope (userId) is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
  }

  const userIds = hasUserIds ? body.userIds : [body.userId];
  const db = await getDb();
  const createdTasks = [];

  // Parse and validate attachment details once
  let rawAttachmentData = null;
  if (rawAttachment && rawAttachment.data && rawAttachment.filename) {
    const base64Part = rawAttachment.data.split(',')[1] || rawAttachment.data;
    const sizeInBytes = Math.ceil(base64Part.length * 3 / 4);
    
    if (sizeInBytes > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: 'Attachment exceeds 3 MB limit' }, { status: 400 });
    }

    rawAttachmentData = {
      filename: sanitizeString(rawAttachment.filename, 200),
      contentType: sanitizeString(rawAttachment.contentType || 'application/octet-stream', 100),
      base64Data: base64Part,
      sizeBytes: sizeInBytes,
    };
  }

  for (const uId of userIds) {
    const taskId = uuid();
    const timeLimitHours = body.timeLimitHours ? parseFloat(body.timeLimitHours) : null;
    const newTask = {
      id: taskId,
      userId: sanitizeString(uId, 50), // Can be employee ID, 'Student Ambassador', or collegeId
      scope: body.scope || 'individual', // 'individual' | 'college' | 'department'
      collegeId: body.collegeId ? sanitizeString(body.collegeId, 50) : null,
      title: sanitizeString(body.title, 200),
      description: sanitizeString(body.description || '', 2000),
      priority: isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical']) ? body.priority : 'Medium',
      status: 'Pending',
      startDate: sanitizeString(body.startDate || new Date().toISOString().split('T')[0], 30),
      deadline: sanitizeString(body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 30),
      comments: [],
      completionProof: null,
      createdAt: new Date().toISOString(),
      hasAttachment: false,
      attachmentName: null,
      timeLimitHours: timeLimitHours && !isNaN(timeLimitHours) ? timeLimitHours : null,
      statusLogs: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          by: 'admin',
          userName: session.name || session.email || 'Admin',
          comment: 'Task assigned by admin'
        }
      ]
    };

    if (rawAttachmentData) {
      const attachmentData = {
        taskId,
        filename: rawAttachmentData.filename,
        contentType: rawAttachmentData.contentType,
        base64Data: rawAttachmentData.base64Data,
        sizeBytes: rawAttachmentData.sizeBytes,
        createdAt: new Date().toISOString(),
      };
      await db.collection('task_attachments').insertOne(attachmentData);

      newTask.hasAttachment = true;
      newTask.attachmentName = attachmentData.filename;
    }

    await db.collection('tasks').insertOne(newTask);

    await logAdminAction(session, 'CREATE_TASK', 'task', newTask.id, {
      title: newTask.title,
      assignedTo: newTask.userId,
      scope: newTask.scope,
      priority: newTask.priority,
    });

    createdTasks.push(newTask);
  }

  return NextResponse.json({ task: createdTasks[0], tasks: createdTasks });
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

  const before = {
    status: target.status,
    priority: target.priority,
    title: target.title,
    description: target.description,
    deadline: target.deadline,
    timeLimitHours: target.timeLimitHours,
    userId: target.userId,
    hasAttachment: target.hasAttachment,
    attachmentName: target.attachmentName
  };
  const updateFields = {};
  
  const updateDoc = {};
  
  if (body.isEdit) {
    if (body.title !== undefined) updateFields.title = sanitizeString(body.title, 200);
    if (body.description !== undefined) updateFields.description = sanitizeString(body.description, 2000);
    if (body.priority && isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical'])) {
      updateFields.priority = body.priority;
    }
    if (body.deadline !== undefined) updateFields.deadline = sanitizeString(body.deadline, 30);
    
    const timeLimitHours = body.timeLimitHours ? parseFloat(body.timeLimitHours) : null;
    updateFields.timeLimitHours = timeLimitHours && !isNaN(timeLimitHours) ? timeLimitHours : null;
    
    if (body.userId !== undefined) updateFields.userId = sanitizeString(body.userId, 50);

    // Attachment
    let newAttachmentData = null;
    const rawAttachment = body.attachment || null;
    if (rawAttachment && rawAttachment.data && rawAttachment.filename) {
      const base64Part = rawAttachment.data.split(',')[1] || rawAttachment.data;
      const sizeInBytes = Math.ceil(base64Part.length * 3 / 4);
      if (sizeInBytes > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: 'Attachment exceeds 3 MB limit' }, { status: 400 });
      }
      newAttachmentData = {
        filename: sanitizeString(rawAttachment.filename, 200),
        contentType: sanitizeString(rawAttachment.contentType || 'application/octet-stream', 100),
        base64Data: base64Part,
        sizeBytes: sizeInBytes,
      };
    }

    if (newAttachmentData) {
      await db.collection('task_attachments').deleteMany({ taskId: body.id });
      const attachmentData = {
        taskId: body.id,
        filename: newAttachmentData.filename,
        contentType: newAttachmentData.contentType,
        base64Data: newAttachmentData.base64Data,
        sizeBytes: newAttachmentData.sizeBytes,
        createdAt: new Date().toISOString(),
      };
      await db.collection('task_attachments').insertOne(attachmentData);
      
      updateFields.hasAttachment = true;
      updateFields.attachmentName = attachmentData.filename;
    } else if (body.removeAttachment) {
      await db.collection('task_attachments').deleteMany({ taskId: body.id });
      updateFields.hasAttachment = false;
      updateFields.attachmentName = null;
    }

    if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed', 'Cancelled'])) {
      updateFields.status = body.status;
    }

    const statusChanged = body.status && body.status !== target.status;
    const logEntry = {
      status: body.status || target.status,
      timestamp: new Date().toISOString(),
      by: 'admin',
      userName: session.name || session.email || 'Admin',
      comment: statusChanged 
        ? `Task details & status updated to ${body.status} by admin`
        : 'Task details updated by admin'
    };
    updateDoc.$push = { statusLogs: logEntry };
  } else {
    if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed', 'Cancelled'])) {
      updateFields.status = body.status;
      if (body.status !== target.status) {
        const logEntry = {
          status: body.status,
          timestamp: new Date().toISOString(),
          by: 'admin',
          userName: session.name || session.email || 'Admin',
          comment: body.adminComment || (body.status === 'Pending' ? 'Re-opened/Set to Pending for scrutiny' : `Status updated to ${body.status}`)
        };
        updateDoc.$push = { statusLogs: logEntry };
      }
    }
    if (body.priority && isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical'])) {
      updateFields.priority = body.priority;
    }
  }
  
  if (Object.keys(updateFields).length > 0) {
    updateDoc.$set = updateFields;
  }
  
  if (body.adminComment) {
    const newComment = {
      id: uuid(),
      text: sanitizeString(body.adminComment, 1000),
      timestamp: new Date().toISOString(),
      by: 'admin',
      adminName: session.name || session.email || 'Admin'
    };
    if (!updateDoc.$push) updateDoc.$push = {};
    updateDoc.$push.comments = newComment;
  }

  if (Object.keys(updateDoc).length > 0) {
    await db.collection('tasks').updateOne({ id: body.id }, updateDoc);
  }

  const updatedTask = await db.collection('tasks').findOne({ id: body.id });

  await logAdminAction(session, 'UPDATE_TASK', 'task', body.id, {
    before,
    after: {
      status: updatedTask.status,
      priority: updatedTask.priority,
      title: updatedTask.title,
      description: updatedTask.description,
      deadline: updatedTask.deadline,
      timeLimitHours: updatedTask.timeLimitHours,
      userId: updatedTask.userId,
      hasAttachment: updatedTask.hasAttachment,
      attachmentName: updatedTask.attachmentName
    },
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
