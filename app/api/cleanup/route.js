import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const usersCol = db.collection('users');
  
  const users = await usersCol.find({}).toArray();
  
  // Deduplicate by email
  const uniqueUsers = [];
  const seenEmails = new Set();
  const toDelete = [];
  
  for (const u of users) {
    if (seenEmails.has(u.email.toLowerCase())) {
      toDelete.push(u._id);
    } else {
      seenEmails.add(u.email.toLowerCase());
      uniqueUsers.push(u);
    }
  }
  
  if (toDelete.length > 0) {
    await usersCol.deleteMany({ _id: { $in: toDelete } });
  }
  
  // Reassign IDs
  const deptCounts = {};
  let updatedCount = 0;
  for (const u of uniqueUsers) {
    const dept = u.department || 'Other';
    const abbrev = dept.substring(0, 3).toUpperCase();
    if (!deptCounts[abbrev]) deptCounts[abbrev] = 0;
    deptCounts[abbrev]++;
    
    const newId = `CL${abbrev}${String(deptCounts[abbrev]).padStart(3, '0')}`;
    
    const oldId = u.id;
    if (oldId !== newId) {
      await usersCol.updateOne({ _id: u._id }, { $set: { id: newId } });
      // Update references
      await db.collection('leads').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('followups').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('attendance').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('emails').updateMany({ userId: oldId }, { $set: { userId: newId } });
      await db.collection('timesessions').updateMany({ userId: oldId }, { $set: { userId: newId } });
      updatedCount++;
    }
  }

  return NextResponse.json({ deleted: toDelete.length, updated: updatedCount });
}
