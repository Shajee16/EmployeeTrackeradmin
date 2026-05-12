import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const submissions = await readData('submissions');
  const users = await readData('users');

  // Attach user names to submissions
  const enhanced = submissions.map(s => {
    const u = users.find(user => user.id === s.userId);
    return { ...s, employeeName: u ? u.name : 'Unknown Employee', employeeDept: u ? u.department : 'Unknown' };
  });

  // Sort by latest first
  enhanced.sort((a, b) => new Date(b.submittedAt || b.timestamp || 0) - new Date(a.submittedAt || a.timestamp || 0));

  return NextResponse.json({ reports: enhanced });
}

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

  const submissions = await readData('submissions');
  const idx = submissions.findIndex(s => s.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { status: submissions[idx].status };

  if (body.status && isOneOf(body.status, ['Submitted', 'Pending', 'Reviewed', 'Approved', 'Rejected'])) {
    submissions[idx].status = body.status;
  }
  if (body.adminComments !== undefined) {
    submissions[idx].adminComments = sanitizeString(body.adminComments, 1000);
  }
  submissions[idx].reviewedAt = new Date().toISOString();
  submissions[idx].reviewedBy = session.email || session.id;

  await writeData('submissions', submissions);

  await logAdminAction(session, 'REVIEW_REPORT', 'submission', body.id, {
    before,
    after: { status: submissions[idx].status },
  });

  return NextResponse.json({ report: submissions[idx] });
}
