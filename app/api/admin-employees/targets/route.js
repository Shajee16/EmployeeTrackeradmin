import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Auth guard
async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  if (!['System Admin', 'Super Admin'].includes(session.role)) return { error: true, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { error: false, session };
}

// GET — Fetch all targets (or a single employee's target)
export async function GET(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  const db = await getDb();
  const col = db.collection('revenue_targets');

  if (employeeId) {
    const target = await col.findOne({ employeeId });
    return NextResponse.json({ target: target || null });
  }

  const targets = await col.find({}).toArray();
  const targetMap = {};
  targets.forEach(t => { targetMap[t.employeeId] = t; });
  return NextResponse.json({ targets: targetMap });
}

// PUT — Set or update an employee's revenue target
export async function PUT(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { employeeId, monthlyTarget, quarter, year } = body;
  if (!employeeId || monthlyTarget === undefined) {
    return NextResponse.json({ error: 'employeeId and monthlyTarget are required' }, { status: 400 });
  }

  const amount = parseFloat(monthlyTarget);
  if (isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: 'Invalid target amount' }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection('revenue_targets');

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  await col.updateOne(
    { employeeId },
    {
      $set: {
        employeeId,
        monthlyTarget: amount,
        month: currentMonth,
        quarter: quarter || `Q${Math.ceil((now.getMonth() + 1) / 3)}`,
        year: year || now.getFullYear(),
        updatedAt: now.toISOString(),
        updatedBy: auth.session.id || auth.session.email,
      },
      $setOnInsert: { createdAt: now.toISOString() },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}
