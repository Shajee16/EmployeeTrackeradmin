import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const HEARTBEAT_STALE_MS = 3 * 60 * 1000; // 3 min — matches employee portal threshold

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return { error: true, response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return { error: false, session };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const db = await getDb();
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - HEARTBEAT_STALE_MS).toISOString();

  // Find all active sessions (not clocked out) with a recent heartbeat
  const activeSessions = await db.collection('timesessions').find({
    logoutTime: null,
    lastHeartbeat: { $gte: staleThreshold },
  }).toArray();

  // Build a map: userId -> { loginTime, lastHeartbeat }
  const onlineMap = {};
  for (const s of activeSessions) {
    onlineMap[s.userId] = {
      loginTime: s.loginTime,
      lastHeartbeat: s.lastHeartbeat,
      date: s.date,
    };
  }

  return NextResponse.json({ online: onlineMap, serverTime: now.toISOString() });
}
