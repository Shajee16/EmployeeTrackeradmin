import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

export async function GET() {
  const users = await readData('users');
  // strip passwords
  const sanitized = users.map(({ password, ...u }) => u);
  return NextResponse.json({ employees: sanitized });
}

export async function POST(req) {
  const body = await req.json();
  const users = await readData('users');
  
  if (users.find(u => u.email === body.email)) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const newUser = {
    id: `u${users.length + 1}-${uuid().substring(0,4)}`,
    name: body.name,
    email: body.email,
    password: hashedPassword,
    role: body.role || 'Operative',
    department: body.department,
    status: 'active',
    theme: 'system'
  };

  users.push(newUser);
  await writeData('users', users);
  
  const { password, ...sanitized } = newUser;
  return NextResponse.json({ employee: sanitized });
}

export async function PUT(req) {
  const body = await req.json();
  const users = await readData('users');
  const idx = users.findIndex(u => u.id === body.id);
  
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  if (body.action === 'toggle_status') {
    users[idx].status = users[idx].status === 'active' ? 'away' : 'active';
  }

  await writeData('users', users);
  const { password, ...sanitized } = users[idx];
  return NextResponse.json({ employee: sanitized });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const users = await readData('users');
  
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  await writeData('users', filtered);
  return NextResponse.json({ success: true });
}
