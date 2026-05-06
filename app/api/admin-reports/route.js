import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';

export async function GET() {
  const submissions = await readData('submissions');
  const users = await readData('users');
  
  // Attach user names to submissions
  const enhanced = submissions.map(s => {
    const u = users.find(user => user.id === s.userId);
    return { ...s, employeeName: u ? u.name : 'Unknown Employee', employeeDept: u ? u.department : 'Unknown' };
  });

  // Sort by latest first
  enhanced.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return NextResponse.json({ reports: enhanced });
}
