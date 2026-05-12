import { NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/rateLimit';
import { sanitizeString, isValidEmail } from '@/lib/sanitize';
import { auditLog } from '@/lib/audit';
import { readData } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  // Rate limiting — 10 login attempts per 15-minute window per IP
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const { limited, remaining } = checkRateLimit(`login:${ip}`, 10);
  if (limited) {
    await auditLog({
      action: 'LOGIN_RATE_LIMITED',
      performedBy: ip,
      performedByRole: 'unknown',
      details: { ip },
    });
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = sanitizeString(body.email, 254);
  const password = sanitizeString(body.password, 128);

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // ── DB admins ────────────────────────────────────────────────────────────
  try {
    const admins = await readData('admins');
    const admin = admins.find(a => a.email && a.email.toLowerCase() === email.toLowerCase());
    if (admin && admin.password) {
      const match = await bcrypt.compare(password, admin.password);
      if (match) {
        const user = { id: admin.id, name: admin.name, role: admin.role || 'System Admin', email: admin.email };
        const token = await createToken(user);
        const c = await cookies();
        c.set('admin_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24,
        });
        await auditLog({ action: 'LOGIN_SUCCESS', performedBy: email, performedByRole: user.role, details: { ip } });
        return NextResponse.json({ user });
      }
    }
  } catch (e) {
    // admins collection may not exist yet, ignore
  }

  await auditLog({ action: 'LOGIN_FAILED', performedBy: email, performedByRole: 'unknown', details: { ip } });
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
