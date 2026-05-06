import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

export async function GET() {
  const leads = await readData('leads');
  const users = await readData('users');
  
  // map assigned assets to leads
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
  
  if (body.action === 'engage') {
    leads[idx].status = 'Contacted';
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString(),
      type: 'Simulation',
      description: 'Tactical engagement simulation executed by Command.',
      timestamp: new Date().toISOString()
    });
  }

  await writeData('leads', leads);
  return NextResponse.json({ lead: leads[idx] });
}
