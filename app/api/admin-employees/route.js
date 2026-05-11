import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

// Auth guard: rejects unauthenticated requests
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  return { error: false, session };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const users = await readData('users');
  // strip passwords
  const sanitized = users.map(({ password, ...u }) => u);
  return NextResponse.json({ employees: sanitized });
}

export async function POST(req) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const body = await req.json();
  const users = await readData('users');
  
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }

  if (users.find(u => u.email.toLowerCase() === body.email.toLowerCase())) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const newUser = {
    id: `u${Date.now()}-${uuid().substring(0,4)}`,
    name: body.name,
    email: body.email,
    password: hashedPassword,
    role: body.role || 'Employee',
    department: body.department || 'Sales',
    designation: body.designation || '',
    phone: body.phone || '',
    status: 'active',
    theme: 'system',
    joinedAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeData('users', users);
  
  const { password, ...sanitized } = newUser;
  return NextResponse.json({ employee: sanitized, success: true });
}

export async function PUT(req) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const body = await req.json();
  const users = await readData('users');
  const idx = users.findIndex(u => u.id === body.id);
  
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  if (body.action === 'toggle_status') {
    users[idx].status = users[idx].status === 'away' ? 'active' : 'away';
  }

  // Support editing other fields
  if (body.name !== undefined) users[idx].name = body.name;
  if (body.department !== undefined) users[idx].department = body.department;
  if (body.role !== undefined) users[idx].role = body.role;
  if (body.designation !== undefined) users[idx].designation = body.designation;
  if (body.phone !== undefined) users[idx].phone = body.phone;
  if (body.newPassword) {
    users[idx].password = await bcrypt.hash(body.newPassword, 10);
  }

  await writeData('users', users);
  const { password, ...sanitized } = users[idx];
  return NextResponse.json({ employee: sanitized, success: true });
}

export async function DELETE(req) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const users = await readData('users');
  
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  await writeData('users', filtered);
  return NextResponse.json({ success: true });
}
