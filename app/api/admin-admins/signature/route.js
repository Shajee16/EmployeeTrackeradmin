import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';

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

export async function POST(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id, signature } = body;

  if (!id || !signature) {
    return NextResponse.json({ error: 'Admin ID and signature are required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const adminsCol = db.collection('admins');

    // Find if the admin exists
    const admin = await adminsCol.findOne({ id });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Update signature field
    await adminsCol.updateOne({ id }, { $set: { signature } });

    return NextResponse.json({ success: true, message: 'Signature updated successfully' });
  } catch (err) {
    console.error('Error updating admin signature:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
