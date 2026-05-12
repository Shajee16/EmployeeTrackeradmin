import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';

// GET: Fetch all leave applications for admin review
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const leaves = await db.collection('leaves').find({}).sort({ appliedAt: -1 }).toArray();
  return NextResponse.json({
    leaves: leaves.map(({ _id, ...rest }) => rest),
  });
}

// PUT: Approve or reject a leave application
export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { leaveId, action, adminComments } = body;

  if (!leaveId || !isOneOf(action, ['Approved', 'Rejected'])) {
    return NextResponse.json({ error: 'Invalid request. Provide leaveId and action (Approved/Rejected).' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection('leaves').findOneAndUpdate(
    { id: sanitizeString(leaveId, 100) },
    {
      $set: {
        status: action,
        adminComments: sanitizeString(adminComments || '', 500),
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.email || session.id,
      },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
  }

  // Audit log
  await logAdminAction(session, `LEAVE_${action.toUpperCase()}`, 'leave', leaveId, {
    action,
    adminComments: adminComments || '',
    userId: result.userId,
    userName: result.userName,
  });

  const { _id, ...clean } = result;
  return NextResponse.json({ leave: clean });
}
