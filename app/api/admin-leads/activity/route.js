import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/utils';

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const leadId = sanitizeString(searchParams.get('leadId'), 50);
  const activityId = sanitizeString(searchParams.get('activityId'), 50);
  const activityTimestamp = searchParams.get('timestamp');

  if (!leadId) {
    return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
  }

  const leads = await readData('leads');
  const idx = leads.findIndex(l => l.id === leadId);

  if (idx === -1) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  if (leads[idx].activities) {
    if (activityId && activityId !== 'undefined') {
      leads[idx].activities = leads[idx].activities.filter(a => a.id !== activityId);
    } else if (activityTimestamp) {
      // Fallback for older logs without IDs
      leads[idx].activities = leads[idx].activities.filter(a => a.timestamp !== activityTimestamp);
    }
    
    leads[idx].updatedAt = new Date().toISOString();
    await writeData('leads', leads);
  }

  return NextResponse.json({ success: true });
}
