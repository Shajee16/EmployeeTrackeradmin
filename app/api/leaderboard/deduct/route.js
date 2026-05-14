import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(req) {
  const session = await getSession();
  if (!session || (session.role !== 'Super Admin' && session.role !== 'Admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { employeeId, points, comment } = body;
  if (!employeeId || !points) {
    return NextResponse.json({ error: 'Missing employeeId or points' }, { status: 400 });
  }

  const db = await getDb();
  
  // Insert deduction
  await db.collection('deductions').insertOne({
    id: uuid(),
    employeeId,
    points: Number(points),
    comment: comment || 'Points deducted by Admin',
    adminId: session.id,
    adminName: session.name,
    createdAt: new Date().toISOString(),
  });

  // Create alert for employee so they get notified in their portal
  await db.collection('alerts').insertOne({
    id: uuid(),
    type: 'warning',
    targetType: 'employee',
    targetEmployeeId: employeeId,
    title: 'Leaderboard Points Deducted',
    message: `Admin deducted ${points} points. Reason: ${comment || 'No reason provided'}`,
    status: 'active',
    requireComment: false,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
