import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isValidEmail, isNonEmptyString } from '@/lib/sanitize';
import { auditLog } from '@/lib/audit';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  if (session.role !== 'Super Admin') return { error: true, response: NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 }) };
  return { error: false, session };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.response;

  const admins = await readData('admins');
  const safe = admins.map(({ password, ...a }) => a);
  return NextResponse.json({ admins: safe });
}

export async function POST(req) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.response;

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  if (!isNonEmptyString(body.name)) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!isValidEmail(body.email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  if (!body.password || body.password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

  const admins = await readData('admins');
  if (admins.find(a => a.email.toLowerCase() === body.email.toLowerCase())) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(sanitizeString(body.password, 128), 10);
  const newAdmin = {
    id: `ADMIN-${uuid().slice(0, 8).toUpperCase()}`,
    name: sanitizeString(body.name, 100),
    email: sanitizeString(body.email, 254).toLowerCase(),
    password: hashedPassword,
    role: 'System Admin',
    department: sanitizeString(body.department || 'Administration', 50),
    phone: sanitizeString(body.phone || '', 20),
    status: 'active',
    createdBy: auth.session.email,
    createdAt: new Date().toISOString(),
  };

  admins.push(newAdmin);
  await writeData('admins', admins);

  await auditLog({ action: 'CREATE_ADMIN', performedBy: auth.session.email, performedByRole: 'Super Admin', details: { adminId: newAdmin.id, name: newAdmin.name, email: newAdmin.email } });

  const { password, ...safe } = newAdmin;
  return NextResponse.json({ admin: safe, success: true });
}

export async function PUT(req) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.response;

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const admins = await readData('admins');
  const idx = admins.findIndex(a => a.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

  if (body.name !== undefined) admins[idx].name = sanitizeString(body.name, 100);
  if (body.phone !== undefined) admins[idx].phone = sanitizeString(body.phone, 20);
  if (body.department !== undefined) admins[idx].department = sanitizeString(body.department, 50);
  if (body.status !== undefined) admins[idx].status = body.status === 'active' ? 'active' : 'inactive';
  if (body.newPassword && body.newPassword.length >= 8) {
    admins[idx].password = await bcrypt.hash(sanitizeString(body.newPassword, 128), 10);
  }
  admins[idx].updatedAt = new Date().toISOString();

  await writeData('admins', admins);
  const { password, ...safe } = admins[idx];
  return NextResponse.json({ admin: safe, success: true });
}

export async function DELETE(req) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);
  if (!id) return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });

  const admins = await readData('admins');
  const filtered = admins.filter(a => a.id !== id);
  if (filtered.length === admins.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await writeData('admins', filtered);
  await auditLog({ action: 'DELETE_ADMIN', performedBy: auth.session.email, performedByRole: 'Super Admin', details: { adminId: id } });
  return NextResponse.json({ success: true });
}
