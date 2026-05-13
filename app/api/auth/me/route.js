import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  // Overlay the latest display name from settings/admins so UI always shows updated name
  try {
    const db = await getDb();
    const settings = await db.collection('user_settings').findOne({ userId: session.id });
    const admin = await db.collection('admins').findOne(
      { $or: [{ email: session.email }, { id: session.id }] },
      { projection: { name: 1, phone: 1 } }
    );

    const user = { ...session };
    if (settings?.displayName) user.name = settings.displayName;
    else if (admin?.name) user.name = admin.name;
    if (admin?.phone) user.phone = admin.phone;

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: session });
  }
}
