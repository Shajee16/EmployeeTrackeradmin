import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isValidEmail, isNonEmptyString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
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
  // Exclude candidates: role must not be 'candidate', AND the user must have
  // an employee ID (the 'id' field like CLSAL001). Self-registered candidates
  // who haven't been onboarded yet should never appear in the employees list.
  const users = await usersCol.find({
    $and: [
      { role: { $ne: 'candidate' } },
      { id: { $exists: true, $nin: [null, ''] } },
      // Either not self-registered, or self-registered AND already onboarded
      { $or: [
        { selfRegistered: { $ne: true } },
        { selfRegistered: true, onboarded: true },
      ]},
    ],
  }).toArray();

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
  
  // Employee IDs are permanent — assigned once at creation and never reassigned.
  // No ID renumbering occurs here.

  const sanitized = uniqueUsers.map(({ password, _id, ...u }) => u);
  
  // Enrich with DigiLocker verification status
  try {
    const verifications = await db.collection('digilocker_verifications').find({}).toArray();
    const verifyMap = {};
    for (const v of verifications) {
      verifyMap[v.userId] = { verified: v.verified, verifiedAt: v.verifiedAt };
    }
    for (const emp of sanitized) {
      if (verifyMap[emp.id]) {
        emp.digilockerVerified = verifyMap[emp.id].verified;
        emp.digilockerVerifiedAt = verifyMap[emp.id].verifiedAt;
      }
    }
  } catch (e) {
    // Non-fatal — digilocker collection might not exist yet
  }

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

  const db = await getDb();
  const usersCol = db.collection('users');
  
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

  const existingUser = await usersCol.findOne({ email: body.email.toLowerCase() });
  if (existingUser) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const deptName = sanitizeString(body.department || 'Sales', 50);
  const abbrev = deptName.substring(0, 3).toUpperCase();
  const prefix = `CL${abbrev}`;

  // Use a persistent counter collection to ensure IDs are never reused.
  // Even if an employee is deleted, the counter only goes up.
  const countersCol = db.collection('id_counters');

  // First time bootstrap: check if counter exists, if not seed it from current max in users
  let counterDoc = await countersCol.findOne({ _id: prefix });
  if (!counterDoc) {
    // Find current max ID number for this prefix from all existing users
    const allDeptUsers = await usersCol.find({ id: { $regex: `^${prefix}` } }).toArray();
    let maxNum = 0;
    for (const u of allDeptUsers) {
      const numMatch = u.id.match(/\d+$/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    await countersCol.updateOne(
      { _id: prefix },
      { $set: { seq: maxNum } },
      { upsert: true }
    );
  }

  // Atomically increment and get the next ID number
  const result = await countersCol.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  const nextNum = result.seq;
  const customId = `${prefix}${String(nextNum).padStart(3, '0')}`;

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
    dob: sanitizeString(body.dob || '', 20),
    status: 'active',
    theme: 'system',
    joinedAt: new Date().toISOString(),
  };

  await usersCol.insertOne(newUser);

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

  const db = await getDb();
  const usersCol = db.collection('users');
  const user = await usersCol.findOne({ id: body.id });
  
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { ...user };
  delete before.password;
  delete before._id;
  
  const updateFields = {};

  if (body.action === 'toggle_status') {
    updateFields.status = user.status === 'away' ? 'active' : 'away';
  } else if (body.action === 'toggle_deactivation') {
    updateFields.deactivated = !user.deactivated;
  } else if (body.action === 'toggle_leaderboard') {
    updateFields.hideFromLeaderboard = body.hideFromLeaderboard;
  }

  // Support editing other fields with sanitization
  // NOTE: Employee ID is NEVER updated — it is permanent and immutable
  if (body.name !== undefined) updateFields.name = sanitizeString(body.name, 100);
  if (body.deactivated !== undefined) updateFields.deactivated = Boolean(body.deactivated);
  if (body.department !== undefined) updateFields.department = sanitizeString(body.department, 50);
  if (body.role !== undefined) updateFields.role = sanitizeString(body.role, 50);
  if (body.designation !== undefined) updateFields.designation = sanitizeString(body.designation, 100);
  if (body.phone !== undefined) updateFields.phone = sanitizeString(body.phone, 20);
  if (body.dob !== undefined) updateFields.dob = sanitizeString(body.dob, 20);
  if (body.newPassword) {
    const hashedPass = await bcrypt.hash(sanitizeString(body.newPassword, 128), 10);
    updateFields.password = hashedPass;
    updateFields.passwordHash = hashedPass;
  }

  if (Object.keys(updateFields).length > 0) {
    await usersCol.updateOne({ id: body.id }, { $set: updateFields });
  }

  const updatedUser = await usersCol.findOne({ id: body.id });
  const after = { ...updatedUser };
  delete after.password;
  delete after._id;

  // Audit log
  await logAdminAction(auth.session, 'UPDATE_EMPLOYEE', 'employee', body.id, { before, after });

  const { password, _id, ...sanitized } = updatedUser;
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

  const db = await getDb();
  const usersCol = db.collection('users');
  const target = await usersCol.findOne({ id });
  
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await usersCol.deleteOne({ id });

  // Audit log
  await logAdminAction(auth.session, 'DELETE_EMPLOYEE', 'employee', id, {
    deletedUser: { name: target.name, email: target.email },
  });

  return NextResponse.json({ success: true });
}
