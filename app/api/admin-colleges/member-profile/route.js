import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return { error: true, response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return { error: false, session };
}

export async function GET(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    
    // Fetch the user
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Fetch the college
    const college = await db.collection('colleges').findOne({ id: user.collegeId });

    // Fetch user's activities
    const activities = await db.collection('ambassador_activities')
      .find({ ambassadorId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch user's proof-of-work submissions
    const proofs = await db.collection('ambassador_proofs')
      .find({ ambassadorId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Strip password for security
    const { password, ...sanitizedUser } = user;

    return NextResponse.json({
      member: {
        ...sanitizedUser,
        collegeName: college ? college.name : 'Unknown College',
        collegeCode: college ? college.code : 'UNKNOWN',
      },
      activities,
      proofs: proofs.map(p => ({
        ...p,
        proofs: (p.proofs || []).map(f => ({ filename: f.filename, contentType: f.contentType })),
      })),
    });
  } catch (err) {
    console.error('Failed to fetch member profile details:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
