import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';

// One-time cleanup: remove duplicate documents from all collections
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  // Map collection name → the field to use as unique key
  const collections = {
    users: 'id',
    leads: 'id',
    tasks: 'id',
    submissions: 'id',
    suggestions: 'id',
    attendance: 'id',
    emails: 'id',
    proofs: 'id',
    leaderboard: 'userId',
  };
  const report = {};

  for (const [colName, keyField] of Object.entries(collections)) {
    const col = db.collection(colName);
    const all = await col.find({}).toArray();
    
    const seen = new Map();
    const duplicateIds = [];
    
    for (const doc of all) {
      const key = doc[keyField];
      if (!key) continue;
      if (seen.has(key)) {
        duplicateIds.push(doc._id);
      } else {
        seen.set(key, doc._id);
      }
    }

    if (duplicateIds.length > 0) {
      await col.deleteMany({ _id: { $in: duplicateIds } });
    }

    const remaining = await col.countDocuments();
    report[colName] = { before: all.length, duplicatesRemoved: duplicateIds.length, after: remaining };
  }

  // Audit log
  await logAdminAction(session, 'DATABASE_CLEANUP', 'system', 'all_collections', { report });

  return NextResponse.json({ success: true, report });
}
