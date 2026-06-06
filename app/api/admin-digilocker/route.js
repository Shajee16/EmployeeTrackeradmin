import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Auth + RBAC guard
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

// GET — Fetch DigiLocker verification status for all employees
export async function GET(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  const db = await getDb();

  if (employeeId) {
    // Get specific employee's DigiLocker data
    const record = await db.collection('digilocker_verifications').findOne({ userId: employeeId });
    if (!record) {
      return NextResponse.json({ verified: false, userId: employeeId });
    }
    const { _id, ...data } = record;
    return NextResponse.json({ verified: true, ...data });
  }

  // Get all DigiLocker verifications
  const verifications = await db.collection('digilocker_verifications').find({}).toArray();
  const verificationMap = {};
  for (const v of verifications) {
    const { _id, ...data } = v;
    verificationMap[v.userId] = data;
  }

  return NextResponse.json({ verifications: verificationMap });
}

// DELETE — Unlink/delete DigiLocker verification details for a user (Super Admin only)
export async function DELETE(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  
  if (auth.session.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employeeId parameter' }, { status: 400 });
  }

  const db = await getDb();
  
  // Remove digilocker verification record
  await db.collection('digilocker_verifications').deleteOne({ userId: employeeId });
  
  // Unset verified flags in the users collection
  await db.collection('users').updateOne(
    { id: employeeId },
    { $unset: { digilockerVerified: '', digilockerVerifiedAt: '' } }
  );

  return NextResponse.json({ success: true, message: `DigiLocker unlinked successfully for employee ${employeeId}` });
}
