import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isNonEmptyString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tasks = await readData('tasks');
  const users = await readData('users');

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
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isNonEmptyString(body.userId)) {
    return NextResponse.json({ error: 'Employee (userId) is required' }, { status: 400 });
  }
  if (!isNonEmptyString(body.title)) {
    return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
  }

  const tasks = await readData('tasks');

  const newTask = {
    id: uuid(),
    userId: sanitizeString(body.userId, 50),
    title: sanitizeString(body.title, 200),
    description: sanitizeString(body.description || '', 2000),
    priority: isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical']) ? body.priority : 'Medium',
    status: 'Pending',
    deadline: sanitizeString(body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 30),
    comments: [],
    completionProof: null,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  await writeData('tasks', tasks);

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
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const tasks = await readData('tasks');
  const idx = tasks.findIndex(t => t.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { status: tasks[idx].status, priority: tasks[idx].priority };

  if (body.status && isOneOf(body.status, ['Pending', 'In Progress', 'Completed', 'Cancelled'])) {
    tasks[idx].status = body.status;
  }
  if (body.priority && isOneOf(body.priority, ['Low', 'Medium', 'High', 'Critical'])) {
    tasks[idx].priority = body.priority;
  }
  if (body.adminComment) {
    if (!tasks[idx].comments) tasks[idx].comments = [];
    tasks[idx].comments.push({
      id: uuid(),
      text: sanitizeString(body.adminComment, 1000),
      timestamp: new Date().toISOString(),
      by: 'admin'
    });
  }

  await writeData('tasks', tasks);

  await logAdminAction(session, 'UPDATE_TASK', 'task', body.id, {
    before,
    after: { status: tasks[idx].status, priority: tasks[idx].priority },
  });

  return NextResponse.json({ task: tasks[idx] });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  if (!id) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  const tasks = await readData('tasks');
  const target = tasks.find(t => t.id === id);
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await writeData('tasks', filtered);

  await logAdminAction(session, 'DELETE_TASK', 'task', id, {
    title: target?.title,
    assignedTo: target?.userId,
  });

  return NextResponse.json({ success: true });
}
