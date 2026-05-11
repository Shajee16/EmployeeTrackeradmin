import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const attendance = await readData('attendance');
  const users = await readData('users');

  const enhanced = attendance.map(a => {
    const u = users.find(user => user.id === a.userId);
    return { ...a, employeeName: u ? u.name : 'Unknown', employeeDept: u ? u.department : 'Unknown' };
  });

  enhanced.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return NextResponse.json({ attendance: enhanced });
}
