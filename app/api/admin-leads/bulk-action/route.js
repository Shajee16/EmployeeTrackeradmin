import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { action, leadIds, targetUserId } = body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: 'No leads selected' }, { status: 400 });
  }

  let leads = await readData('leads');
  let affected = 0;

  if (action === 'delete') {
    const originalLength = leads.length;
    leads = leads.filter(l => !leadIds.includes(l.id));
    affected = originalLength - leads.length;
    // We should also remove them from lead_deletion_requests, but keeping it simple for now or we can do it.
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    await db.collection('lead_deletion_requests').updateMany(
      { leadId: { $in: leadIds }, status: 'pending' },
      { $set: { status: 'superseded', reviewedBy: session.name || session.email, reviewedAt: new Date().toISOString() } }
    );
  } else if (action === 'reassign') {
    if (!targetUserId) return NextResponse.json({ error: 'Target user ID required for reassign' }, { status: 400 });
    for (let i = 0; i < leads.length; i++) {
      if (leadIds.includes(leads[i].id)) {
        const oldUserId = leads[i].userId;
        leads[i].userId = targetUserId;
        leads[i].activities = leads[i].activities || [];
        leads[i].activities.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          type: 'Reassignment',
          description: `Bulk reassigned by Admin (from ${oldUserId || 'unassigned'} to ${targetUserId}).`,
          timestamp: new Date().toISOString(),
          adminOnly: true
        });
        leads[i].updatedAt = new Date().toISOString();
        affected++;
      }
    }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (affected > 0) {
    await writeData('leads', leads);
  }

  return NextResponse.json({ success: true, affected });
}
