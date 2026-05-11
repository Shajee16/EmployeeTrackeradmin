import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

export async function GET() {
  const leads = await readData('leads');
  const users = await readData('users');
  
  const enhancedLeads = leads.map(l => {
    const asset = users.find(u => u.id === l.userId);
    return { ...l, assignedAsset: asset ? asset.name : 'UNASSIGNED' };
  });

  return NextResponse.json({ leads: enhancedLeads });
}

export async function PUT(req) {
  const body = await req.json();
  const leads = await readData('leads');
  const idx = leads.findIndex(l => l.id === body.id);
  
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  // Support direct status change
  if (body.status) {
    const oldStatus = leads[idx].status;
    leads[idx].status = body.status;
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString(),
      type: 'Status Change',
      description: `Status changed from "${oldStatus}" to "${body.status}" by Admin.`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Legacy engage action
  if (body.action === 'engage') {
    leads[idx].status = 'Contacted';
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString(),
      type: 'Engagement',
      description: 'Tactical engagement initiated by Admin.',
      timestamp: new Date().toISOString()
    });
  }

  if (body.notes !== undefined) leads[idx].notes = body.notes;

  await writeData('leads', leads);
  return NextResponse.json({ lead: leads[idx], success: true });
}
