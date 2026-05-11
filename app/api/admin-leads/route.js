import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const leads = await readData('leads');
  const users = await readData('users');
  
  const enhancedLeads = leads.map(l => {
    const asset = users.find(u => u.id === l.userId);
    return { ...l, assignedAsset: asset ? asset.name : 'UNASSIGNED' };
  });

  return NextResponse.json({ leads: enhancedLeads });
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const leads = await readData('leads');
  const idx = leads.findIndex(l => l.id === body.id);
  
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const before = { status: leads[idx].status };
  
  // Support direct status change with validation
  if (body.status && isOneOf(body.status, ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'])) {
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

  if (body.notes !== undefined) leads[idx].notes = sanitizeString(body.notes, 2000);

  await writeData('leads', leads);

  await logAdminAction(session, 'UPDATE_LEAD', 'lead', body.id, {
    before,
    after: { status: leads[idx].status },
  });

  return NextResponse.json({ lead: leads[idx], success: true });
}
