import { NextResponse } from 'next/server';
import { readData, writeData, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const settings = await db.collection('admin_settings').findOne({ userId: session.id }) || {};
  const { _id, ...safe } = settings;
  return NextResponse.json({ settings: safe });
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
    update.displayName = sanitizeString(body.displayName || '', 100);
    update.phone = sanitizeString(body.phone || '', 20);
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

  await db.collection('admin_settings').updateOne(
    { userId: session.id },
    { $set: update },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
