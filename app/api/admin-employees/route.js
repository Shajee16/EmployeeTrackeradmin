import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isValidEmail, isNonEmptyString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

// Auth + RBAC guard: rejects unauthenticated or non-admin requests
async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return { error: true, response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return { error: false, session };
}

import { getDb } from '@/lib/db';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const db = await getDb();
  const usersCol = db.collection('users');
  const users = await usersCol.find({}).toArray();

  // Deduplicate by email
  const uniqueUsers = [];
  const seenEmails = new Set();
  const toDelete = [];
  
  for (const u of users) {
    if (seenEmails.has(u.email.toLowerCase())) {
      toDelete.push(u._id);
    } else {
      seenEmails.add(u.email.toLowerCase());
      uniqueUsers.push(u);
    }
  }
  
  if (toDelete.length > 0) {
    await usersCol.deleteMany({ _id: { $in: toDelete } });
  }
  
  // Reassign IDs
  const deptCounts = {};
  for (const u of uniqueUsers) {
    const dept = u.department || 'Other';
    const abbrev = dept.substring(0, 3).toUpperCase();
    if (!deptCounts[abbrev]) deptCounts[abbrev] = 0;
    deptCounts[abbrev]++;
    
    const newId = `CL${abbrev}${String(deptCounts[abbrev]).padStart(3, '0')}`;
    
    const oldId = u.id;
    if (oldId !== newId) {
      await usersCol.updateOne({ _id: u._id }, { $set: { id: newId } });
      u.id = newId;
      // Update references
      await db.collection('leads').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('followups').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('attendance').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('emails').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('timesessions').updateMany({ userId: oldId }, { $set: { userId: newId } });
    }
  }

  const sanitized = uniqueUsers.map(({ password, _id, ...u }) => u);
  return NextResponse.json({ employees: sanitized });
}

export async function POST(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const users = await readData('users');
  
  // Input validation
  if (!isNonEmptyString(body.name)) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!body.password || body.password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  if (users.find(u => u.email.toLowerCase() === body.email.toLowerCase())) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const deptName = sanitizeString(body.department || 'Sales', 50);
  const abbrev = deptName.substring(0, 3).toUpperCase();
  const deptUsers = users.filter(u => u.department === deptName && u.id && u.id.startsWith(`CL${abbrev}`));
  
  let maxNum = 0;
  for (const u of deptUsers) {
    const numMatch = u.id.match(/\d+$/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const customId = `CL${abbrev}${String(maxNum + 1).padStart(3, '0')}`;

  const hashedPassword = await bcrypt.hash(sanitizeString(body.password, 128), 10);
  const newUser = {
    id: customId,
    name: sanitizeString(body.name, 100),
    email: sanitizeString(body.email, 254).toLowerCase(),
    password: hashedPassword,
    role: sanitizeString(body.role || 'Employee', 50),
    department: sanitizeString(body.department || 'Sales', 50),
    designation: sanitizeString(body.designation || '', 100),
    phone: sanitizeString(body.phone || '', 20),
    status: 'active',
    theme: 'system',
    joinedAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeData('users', users);

  // Audit log
  await logAdminAction(auth.session, 'CREATE_EMPLOYEE', 'employee', newUser.id, {
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    department: newUser.department,
  });
  
  const { password, ...sanitized } = newUser;
  return NextResponse.json({ employee: sanitized, success: true });
}

export async function PUT(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const users = await readData('users');
  const idx = users.findIndex(u => u.id === body.id);
  
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { ...users[idx] };
  delete before.password;
  
  if (body.action === 'toggle_status') {
    users[idx].status = users[idx].status === 'away' ? 'active' : 'away';
  }

  // Support editing other fields with sanitization
  if (body.name !== undefined) users[idx].name = sanitizeString(body.name, 100);
  if (body.department !== undefined) users[idx].department = sanitizeString(body.department, 50);
  if (body.role !== undefined) users[idx].role = sanitizeString(body.role, 50);
  if (body.designation !== undefined) users[idx].designation = sanitizeString(body.designation, 100);
  if (body.phone !== undefined) users[idx].phone = sanitizeString(body.phone, 20);
  if (body.newPassword) {
    users[idx].password = await bcrypt.hash(sanitizeString(body.newPassword, 128), 10);
  }

  await writeData('users', users);

  const after = { ...users[idx] };
  delete after.password;

  // Audit log
  await logAdminAction(auth.session, 'UPDATE_EMPLOYEE', 'employee', body.id, { before, after });

  const { password, ...sanitized } = users[idx];
  return NextResponse.json({ employee: sanitized, success: true });
}

export async function DELETE(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  if (!id) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  const users = await readData('users');
  const target = users.find(u => u.id === id);
  
  const filtered = users.filter(u => u.id !== id);
  if (filtered.length === users.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  await writeData('users', filtered);

  // Audit log
  await logAdminAction(auth.session, 'DELETE_EMPLOYEE', 'employee', id, {
    deletedUser: target ? { name: target.name, email: target.email } : {},
  });

  return NextResponse.json({ success: true });
}
