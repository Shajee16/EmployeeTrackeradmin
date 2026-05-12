import { NextResponse } from 'next/server';
import { readData, writeData, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf, isNonEmptyString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const leads = await readData('leads');
  const users = await readData('users');
  
  const enhancedLeads = leads.map(l => {
    const asset = users.find(u => u.id === l.userId);
    return {
      ...l,
      assignedAsset: asset ? asset.name : 'UNASSIGNED',
      assignedDepartment: asset ? (asset.department || 'Unassigned') : 'Unassigned',
    };
  });

  return NextResponse.json({ leads: enhancedLeads });
}

/**
 * POST /api/admin-leads
 * Bulk create leads and assign them to employees.
 * Body: { leads: [{ companyName, contactPerson, email, phone, ... , assignToUserId }] }
 */
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const incomingLeads = Array.isArray(body.leads) ? body.leads : (body.companyName ? [body] : []);
  if (incomingLeads.length === 0) {
    return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
  }

  const existingLeads = await readData('leads');
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'];
  const created = [];

  for (const raw of incomingLeads) {
    if (!isNonEmptyString(raw.companyName)) continue;

    const newLead = {
      id: uuid(),
      userId: sanitizeString(raw.assignToUserId || raw.userId || '', 50),
      companyName: sanitizeString(raw.companyName, 200),
      contactPerson: sanitizeString(raw.contactPerson || '', 100),
      designation: sanitizeString(raw.designation || '', 100),
      phone: sanitizeString(raw.phone || '', 20),
      email: sanitizeString(raw.email || '', 254),
      address: sanitizeString(raw.address || '', 500),
      industry: sanitizeString(raw.industry || '', 100),
      companySize: sanitizeString(raw.companySize || '', 20),
      servicesInterested: Array.isArray(raw.servicesInterested) ? raw.servicesInterested.map(s => sanitizeString(s, 100)) : [],
      source: sanitizeString(raw.source || 'Admin Assigned', 100),
      estMonthlyVolume: sanitizeString(raw.estMonthlyVolume || '', 50),
      estDealValue: sanitizeString(raw.estDealValue || '', 50),
      dealValue: raw.dealValue || '',
      notes: sanitizeString(raw.notes || '', 2000),
      priority: ['Low', 'Medium', 'High', 'Hot', 'Critical'].includes(raw.priority) ? raw.priority : 'Medium',
      status: validStatuses.includes(raw.status) ? raw.status : 'New',
      nextFollowupDate: sanitizeString(raw.nextFollowupDate || '', 20),
      activities: [{
        id: Date.now().toString(),
        type: 'Status Change',
        description: `Lead assigned by Admin (${session.name || 'System Admin'}).`,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existingLeads.push(newLead);
    created.push(newLead);
  }

  await writeData('leads', existingLeads);

  await logAdminAction(session, 'BULK_CREATE_LEADS', 'leads', null, {
    count: created.length,
    leads: created.map(l => ({ id: l.id, company: l.companyName, assignedTo: l.userId })),
  });

  return NextResponse.json({ success: true, count: created.length, leads: created });
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

  const before = { status: leads[idx].status, userId: leads[idx].userId };
  
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

  // Reassign lead to a different employee
  if (body.userId !== undefined) {
    const oldUserId = leads[idx].userId;
    leads[idx].userId = sanitizeString(body.userId, 50);
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString(),
      type: 'Status Change',
      description: `Lead reassigned by Admin (from ${oldUserId || 'unassigned'} to ${body.userId}).`,
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

  leads[idx].updatedAt = new Date().toISOString();
  await writeData('leads', leads);

  await logAdminAction(session, 'UPDATE_LEAD', 'lead', body.id, {
    before,
    after: { status: leads[idx].status, userId: leads[idx].userId },
  });

  return NextResponse.json({ lead: leads[idx], success: true });
}

