import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const notifs = await db.collection('admin_notifications')
    .find({ $or: [{ recipientId: session.id }, { recipientRole: session.role }, { recipientRole: 'all' }] })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const safe = notifs.map(({ _id, ...n }) => n);
  return NextResponse.json({ notifications: safe });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const db = await getDb();
  if (body.markAllRead) {
    await db.collection('admin_notifications').updateMany(
      { $or: [{ recipientId: session.id }, { recipientRole: session.role }], read: false },
      { $set: { read: true } }
    );
  } else if (body.id) {
    await db.collection('admin_notifications').updateOne(
      { id: sanitizeString(body.id, 50) },
      { $set: { read: true } }
    );
  }
  return NextResponse.json({ success: true });
}

// Helper to create a notification (used internally by other APIs)
export async function createNotification(db, { recipientId, recipientRole, type, title, message, link }) {
  await db.collection('admin_notifications').insertOne({
    id: uuid(),
    recipientId: recipientId || null,
    recipientRole: recipientRole || 'all',
    type: type || 'info',
    title,
    message,
    link: link || null,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
