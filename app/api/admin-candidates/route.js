import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/admin-candidates
 *
 * Fetch all users with role "candidate" from the shared MongoDB.
 * These are self-registered candidates from the Employee Portal
 * awaiting admin review/onboarding.
 */
export async function GET() {
  const { error, response } = await requireRole(['System Admin', 'Super Admin', 'HR', 'Admin']);
  if (error) {
    return NextResponse.json(
      { error: response?.error || 'Unauthorized' },
      { status: response?.status || 401 }
    );
  }

  try {
    const db = await getDb();
    const candidates = await db
      .collection('candidates')
      .find({ onboarded: { $ne: true } })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        candidateProfile: 1,
        digilockerProfile: 1,
        selfRegistered: 1,
        mustChangePassword: 1,
        createdAt: 1,
      })
      .toArray();

    return NextResponse.json({ candidates });
  } catch (err) {
    console.error('[admin-candidates] Error fetching candidates:', err);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}
