import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

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

  const body = await req.json();
  const tasks = await readData('tasks');

  const newTask = {
    id: uuid(),
    userId: body.userId,
    title: body.title,
    description: body.description || '',
    priority: body.priority || 'Medium',
    status: 'Pending',
    deadline: body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    comments: [],
    completionProof: null,
    createdAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  await writeData('tasks', tasks);
  return NextResponse.json({ task: newTask });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const body = await req.json();
  const tasks = await readData('tasks');
  const idx = tasks.findIndex(t => t.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.status) tasks[idx].status = body.status;
  if (body.priority) tasks[idx].priority = body.priority;
  if (body.adminComment) {
    if (!tasks[idx].comments) tasks[idx].comments = [];
    tasks[idx].comments.push({
      id: uuid(),
      text: body.adminComment,
      timestamp: new Date().toISOString(),
      by: 'admin'
    });
  }

  await writeData('tasks', tasks);
  return NextResponse.json({ task: tasks[idx] });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const tasks = await readData('tasks');
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await writeData('tasks', filtered);
  return NextResponse.json({ success: true });
}
