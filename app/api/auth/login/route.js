import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  const { email, password } = await req.json();

  if (email === 'admin@nexus.com' && password === 'admin123') {
    const user = { id: 'admin-001', name: 'Commander', role: 'System Admin', email };
    const token = await createToken(user);
    
    const c = await cookies();
    c.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({ user });
  }

  return NextResponse.json({ error: 'Invalid clearance credentials' }, { status: 401 });
}
