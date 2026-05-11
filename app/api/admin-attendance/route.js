import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';

export async function GET() {
  const attendance = await readData('attendance');
  const users = await readData('users');

  const enhanced = attendance.map(a => {
    const u = users.find(user => user.id === a.userId);
    return { ...a, employeeName: u ? u.name : 'Unknown', employeeDept: u ? u.department : 'Unknown' };
  });

  enhanced.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return NextResponse.json({ attendance: enhanced });
}
