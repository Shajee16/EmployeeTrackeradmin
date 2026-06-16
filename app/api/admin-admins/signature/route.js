import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitize';

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

// Maximum signature size: 5MB base64 encoded
const MAX_SIGNATURE_SIZE = 5 * 1024 * 1024;

export async function POST(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Extract signature BEFORE sanitization — base64 data URIs are very long
  // and sanitizeInput() would truncate them to 10,000 chars, corrupting the image
  const signature = rawBody.signature;
  const id = sanitizeString(rawBody.id || '', 50);

  if (!id || !signature) {
    return NextResponse.json({ error: 'Admin ID and signature are required' }, { status: 400 });
  }

  // Validate signature is a proper data URI image
  if (typeof signature !== 'string' || !signature.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Signature must be a valid image data URI (data:image/...)' }, { status: 400 });
  }

  // Enforce size limit
  if (signature.length > MAX_SIGNATURE_SIZE) {
    return NextResponse.json({ error: 'Signature image is too large. Please use a smaller image (max 5MB).' }, { status: 400 });
  }

  try {
    const db = await getDb();
    const adminsCol = db.collection('admins');

    // Find if the admin exists
    const admin = await adminsCol.findOne({ id });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Update signature field directly in MongoDB
    await adminsCol.updateOne({ id }, { $set: { signature } });

    return NextResponse.json({ success: true, message: 'Signature updated successfully' });
  } catch (err) {
    console.error('Error updating admin signature:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
