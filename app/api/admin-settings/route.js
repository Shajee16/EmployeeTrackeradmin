import { NextResponse } from 'next/server';
import { readData, writeData, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const settings = await db.collection('user_settings').findOne({
    $or: [
      { userId: session.id },
      { userId: session.email },
    ],
  }) || {};

  // Also query admins collection to get any baseline info
  const admin = await db.collection('admins').findOne({
    $or: [
      { email: { $regex: new RegExp(`^${session.email}$`, 'i') } },
      { id: session.id },
    ],
  });

  const merged = {
    displayName: settings.displayName || admin?.displayName || admin?.name || '',
    phone: settings.phone || admin?.phone || '',
    signatureDesignation: settings.signatureDesignation || settings.role || admin?.signatureDesignation || '',
    signatureDepartment: settings.signatureDepartment || settings.department || admin?.signatureDepartment || admin?.department || '',
    role: settings.signatureDesignation || settings.role || admin?.signatureDesignation || '',
    department: settings.signatureDepartment || settings.department || admin?.signatureDepartment || admin?.department || '',
    profilePicture: settings.profilePicture || null,
    notifLeadAssigned: settings.notifLeadAssigned !== false,
    notifNewEmployee: settings.notifNewEmployee !== false,
    notifDailyReport: settings.notifDailyReport !== false,
    notifLoginAlert: settings.notifLoginAlert === true,
  };

  return NextResponse.json({ settings: merged });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body;
  let rawPicture = undefined;
  try {
    const raw = await req.json();
    if (raw.type === 'profilePicture' && raw.picture) rawPicture = raw.picture;
    body = sanitizeInput(raw);
    if (rawPicture !== undefined) body.picture = rawPicture;
  } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const db = await getDb();
  const update = { userId: session.id, updatedAt: new Date().toISOString() };

  if (body.type === 'theme') update.themeMode = sanitizeString(body.theme || 'dark', 20);
  if (body.type === 'themeColor') update.themeColor = sanitizeString(body.themeColor || 'beige', 20);
  if (body.type === 'profile') {
    const cleanDisplayName = sanitizeString(body.displayName || '', 100);
    const cleanPhone = sanitizeString(body.phone || '', 20);
    const cleanDesignation = sanitizeString(body.signatureDesignation || body.role || '', 100);
    const cleanDepartment = sanitizeString(body.signatureDepartment || body.department || '', 100);

    update.displayName = cleanDisplayName;
    update.phone = cleanPhone;
    update.signatureDesignation = cleanDesignation;
    update.signatureDepartment = cleanDepartment;

    // Sync to the admins collection so Certificates signature defaults stay consistent
    // CRITICAL: NEVER overwrite admin.role (which is the RBAC system authorization role 'Super Admin' / 'System Admin')
    const adminsCol = db.collection('admins');
    const adminQuery = {
      $or: [
        { email: { $regex: new RegExp(`^${session.email}$`, 'i') } },
        { id: session.id },
      ],
    };
    if (session.id && session.id.length === 24) {
      try {
        const { ObjectId } = await import('mongodb');
        adminQuery.$or.push({ _id: new ObjectId(session.id) });
      } catch {}
    }

    const adminSet = {
      phone: cleanPhone,
      signatureDesignation: cleanDesignation,
      signatureDepartment: cleanDepartment,
      updatedAt: new Date().toISOString(),
    };
    if (cleanDisplayName) {
      adminSet.displayName = cleanDisplayName;
      adminSet.name = cleanDisplayName;
    }

    await adminsCol.updateOne(adminQuery, { $set: adminSet });
  }
  if (body.type === 'profilePicture') {
    if (!body.picture) {
      update.profilePicture = null;
    } else {
      if (!body.picture.startsWith('data:image/')) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      const base64Part = body.picture.split(',')[1] || '';
      const sizeInBytes = Math.ceil(base64Part.length * 3 / 4);
      if (sizeInBytes > 300 * 1024) return NextResponse.json({ error: 'Image exceeds 300KB limit' }, { status: 400 });
      update.profilePicture = body.picture;
    }
  }
  if (body.type === 'notifications') {
    update.notifLeadAssigned = body.notifLeadAssigned !== false;
    update.notifNewEmployee = body.notifNewEmployee !== false;
    update.notifDailyReport = body.notifDailyReport !== false;
    update.notifLoginAlert = body.notifLoginAlert !== false;
  }
  if (body.type === 'fontSize') {
    const parsed = parseInt(body.fontSize, 10);
    update.fontSize = !isNaN(parsed) ? parsed : 15;
  }

  await db.collection('user_settings').updateOne(
    { userId: session.id },
    { $set: update },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
