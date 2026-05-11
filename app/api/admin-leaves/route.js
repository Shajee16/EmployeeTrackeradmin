import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Fetch all leave applications for admin review
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

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

  const body = await req.json();
  const { leaveId, action, adminComments } = body;

  if (!leaveId || !['Approved', 'Rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request. Provide leaveId and action (Approved/Rejected).' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection('leaves').findOneAndUpdate(
    { id: leaveId },
    {
      $set: {
        status: action,
        adminComments: adminComments || '',
        reviewedAt: new Date().toISOString(),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result) {
    return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
  }

  const { _id, ...clean } = result;
  return NextResponse.json({ leave: clean });
}
