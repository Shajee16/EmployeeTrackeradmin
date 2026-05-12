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
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const db = await getDb();
  const update = { userId: session.id, updatedAt: new Date().toISOString() };

  if (body.type === 'theme') update.themeMode = sanitizeString(body.theme || 'dark', 20);
  if (body.type === 'themeColor') update.themeColor = sanitizeString(body.themeColor || 'beige', 20);
  if (body.type === 'profile') {
    update.displayName = sanitizeString(body.displayName || '', 100);
    update.phone = sanitizeString(body.phone || '', 20);
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
