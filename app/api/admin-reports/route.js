import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

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

  const body = await req.json();
  const submissions = await readData('submissions');
  const idx = submissions.findIndex(s => s.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.status) submissions[idx].status = body.status;
  if (body.adminComments !== undefined) submissions[idx].adminComments = body.adminComments;
  submissions[idx].reviewedAt = new Date().toISOString();

  await writeData('submissions', submissions);
  return NextResponse.json({ report: submissions[idx] });
}
