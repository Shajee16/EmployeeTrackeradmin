import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

// GET: Fetch all holidays
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const holidays = await db.collection('holidays').find({}).sort({ date: 1 }).toArray();
  return NextResponse.json({ holidays: holidays.map(({ _id, ...rest }) => rest) });
}

// POST: Add a single holiday OR bulk import
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const db = await getDb();

  // Bulk import mode
  if (Array.isArray(body.holidays)) {
    const imported = [];
    const errors = [];

    for (let i = 0; i < body.holidays.length; i++) {
      const h = body.holidays[i];
      const rowNum = i + 2; // 1-indexed + header
      const date = String(h.date || h.Date || '').trim();
      const name = String(h.name || h.Name || h['Holiday Name'] || h.holiday || h.Holiday || '').trim();
      const type = String(h.type || h.Type || h['Holiday Type'] || 'Public Holiday').trim();

      if (!date || !name) {
        errors.push({ row: rowNum, error: `Missing ${!date ? 'Date' : 'Name'}` });
        continue;
      }

      // Validate date format
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        errors.push({ row: rowNum, error: `Invalid date: ${date}` });
        continue;
      }

      const dateStr = parsed.toISOString().split('T')[0];

      const holiday = {
        id: uuid(),
        date: dateStr,
        name: sanitizeString(name, 200),
        type: sanitizeString(type, 50),
        createdBy: session.email,
        createdAt: new Date().toISOString(),
      };

      await db.collection('holidays').updateOne(
        { date: dateStr },
        { $set: holiday },
        { upsert: true }
      );
      imported.push(holiday);
    }

    return NextResponse.json({ success: true, imported: imported.length, errors, total: body.holidays.length });
  }

  // Single holiday mode
  const date = sanitizeString(body.date || '', 10);
  const name = sanitizeString(body.name || '', 200);
  const type = sanitizeString(body.type || 'Public Holiday', 50);

  if (!date || !name) {
    return NextResponse.json({ error: 'Date and name are required' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format (expected YYYY-MM-DD)' }, { status: 400 });
  }

  const holiday = {
    id: uuid(),
    date,
    name,
    type,
    createdBy: session.email,
    createdAt: new Date().toISOString(),
  };

  await db.collection('holidays').updateOne(
    { date },
    { $set: holiday },
    { upsert: true }
  );

  return NextResponse.json({ success: true, holiday });
}

// DELETE: Remove a holiday
export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });

  const db = await getDb();
  await db.collection('holidays').deleteOne({ id: sanitizeString(id, 50) });
  return NextResponse.json({ success: true });
}
