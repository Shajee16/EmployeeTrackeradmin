import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const suggestions = await readData('suggestions');
  const users = await readData('users');

  const enhanced = suggestions.map(s => {
    const u = users.find(user => user.id === s.userId);
    return { ...s, employeeName: u ? u.name : 'Unknown', employeeDept: u ? u.department : 'Unknown' };
  });

  enhanced.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  return NextResponse.json({ suggestions: enhanced });
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

  const suggestions = await readData('suggestions');
  const idx = suggestions.findIndex(s => s.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { status: suggestions[idx].status };

  if (body.status && isOneOf(body.status, ['Pending', 'Reviewed', 'Implemented', 'Dismissed'])) {
    suggestions[idx].status = body.status;
  }
  if (body.adminReply !== undefined) {
    suggestions[idx].adminReply = sanitizeString(body.adminReply, 1000);
  }
  suggestions[idx].reviewedAt = new Date().toISOString();
  suggestions[idx].reviewedBy = session.email || session.id;

  await writeData('suggestions', suggestions);

  await logAdminAction(session, 'REVIEW_SUGGESTION', 'suggestion', body.id, {
    before,
    after: { status: suggestions[idx].status },
  });

  return NextResponse.json({ suggestion: suggestions[idx] });
}
