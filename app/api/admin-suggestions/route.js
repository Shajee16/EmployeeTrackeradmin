import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

export async function GET() {
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
  const body = await req.json();
  const suggestions = await readData('suggestions');
  const idx = suggestions.findIndex(s => s.id === body.id);

  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.status) suggestions[idx].status = body.status;
  if (body.adminReply !== undefined) suggestions[idx].adminReply = body.adminReply;
  suggestions[idx].reviewedAt = new Date().toISOString();

  await writeData('suggestions', suggestions);
  return NextResponse.json({ suggestion: suggestions[idx] });
}
