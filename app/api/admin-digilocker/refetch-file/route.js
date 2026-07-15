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

// Fetch with timeout helper
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * POST /api/admin-digilocker/refetch-file
 * Re-fetch a specific document's file (PDF) from DigiLocker using the saved access token.
 * Body: { employeeId: string, docIndex: number }
 */
export async function POST(request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  try {
    const { employeeId, docIndex } = await request.json();
    if (!employeeId || docIndex === undefined) {
      return NextResponse.json({ error: 'Missing employeeId or docIndex' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne(
      { id: employeeId },
      { projection: { 'digilockerProfile.dlAccessToken': 1, 'digilockerProfile.documents': 1 } }
    );

    if (!user || !user.digilockerProfile) {
      return NextResponse.json({ error: 'User has no DigiLocker profile' }, { status: 404 });
    }

    const accessToken = user.digilockerProfile.dlAccessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No saved DigiLocker access token. User needs to re-verify DigiLocker.' }, { status: 400 });
    }

    const documents = user.digilockerProfile.documents;
    if (!documents || !documents[docIndex]) {
      return NextResponse.json({ error: `Document at index ${docIndex} not found` }, { status: 404 });
    }

    const doc = documents[docIndex];
    if (!doc.uri) {
      return NextResponse.json({ error: 'Document has no URI' }, { status: 400 });
    }

    // If document already has file data, return success
    if (doc.fileData) {
      return NextResponse.json({ success: true, message: 'Document already has file data', alreadyHad: true });
    }

    const baseUrl = process.env.DIGILOCKER_BASE_URL || 'https://digilocker.meripehchaan.gov.in';

    // Try to fetch the file from DigiLocker
    const fileRes = await fetchWithTimeout(
      `${baseUrl}/public/oauth2/1/file/${doc.uri}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      8000
    );

    if (!fileRes.ok) {
      const errText = await fileRes.text().catch(() => '');
      return NextResponse.json({
        error: `DigiLocker returned ${fileRes.status}`,
        detail: errText.substring(0, 500),
        hint: fileRes.status === 401 ? 'Access token expired. User needs to re-verify DigiLocker.' : undefined,
      }, { status: 502 });
    }

    const ct = fileRes.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    if (base64.length <= 100) {
      return NextResponse.json({ error: 'File too small — DigiLocker may not have a PDF for this document type' }, { status: 404 });
    }

    // Update just this document's fileData in MongoDB
    await db.collection('users').updateOne(
      { id: employeeId },
      {
        $set: {
          [`digilockerProfile.documents.${docIndex}.fileData`]: base64,
          [`digilockerProfile.documents.${docIndex}.fileMimeType`]: ct,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Fetched file for "${doc.name}" (${ct}, ${base64.length} chars)`,
      fileData: base64,
      fileMimeType: ct,
    });

  } catch (err) {
    console.error('[Admin DigiLocker Refetch] Error:', err);
    const message = err.name === 'AbortError'
      ? 'Request to DigiLocker timed out. Token may be expired — user needs to re-verify.'
      : err.message || 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
