import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/admin-leads/deletion-requests — list all pending deletion requests
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const requests = await db.collection('lead_deletion_requests')
    .find({})
    .sort({ requestedAt: -1 })
    .toArray();

  return NextResponse.json({
    requests: requests.map(({ _id, ...r }) => r),
  });
}
