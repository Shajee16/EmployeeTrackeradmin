import { NextResponse } from 'next/server';
import { readData, writeData, getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf, isNonEmptyString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
      type: 'Reassignment',
      description: `Lead reassigned by Admin (from ${oldUserId || 'unassigned'} to ${body.userId}).`,
      timestamp: new Date().toISOString(),
      adminOnly: true
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

  const allowedFields = ['companyName', 'contactPerson', 'designation', 'phone', 'email', 'address', 'industry', 'companySize', 'servicesInterested', 'source', 'estMonthlyVolume', 'estDealValue', 'priority', 'dealValue', 'nextFollowupDate'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      const oldVal = leads[idx][field];
      const newVal = typeof body[field] === 'string' ? sanitizeString(body[field], 2000) : body[field];
      leads[idx][field] = newVal;
      
      // Log generic field change if it actually changed
      if (oldVal !== newVal) {
        leads[idx].activities = leads[idx].activities || [];
        leads[idx].activities.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          type: 'Update',
          description: `${field} updated by Admin.`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Admin comment for employee
  if (body.adminComment && typeof body.adminComment === 'string') {
    leads[idx].activities = leads[idx].activities || [];
    leads[idx].activities.push({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      type: 'Admin Comment',
      description: sanitizeString(body.adminComment, 2000),
      by: session.name || session.email,
      timestamp: new Date().toISOString()
    });
  }

  leads[idx].updatedAt = new Date().toISOString();
  await writeData('leads', leads);

  await logAdminAction(session, 'UPDATE_LEAD', 'lead', body.id, {
    before,
    after: { status: leads[idx].status, userId: leads[idx].userId },
  });

  return NextResponse.json({ lead: leads[idx], success: true });
}

/**
 * DELETE /api/admin-leads?id=xxx  — Admin permanently deletes a lead
 * DELETE /api/admin-leads?action=approve-delete&requestId=xxx — Approve employee deletion request
 * DELETE /api/admin-leads?action=reject-delete&requestId=xxx — Reject employee deletion request
 */
export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const db = await getDb();

  // Handle employee deletion request approval/rejection
  if (action === 'approve-delete' || action === 'reject-delete') {
    const requestId = sanitizeString(searchParams.get('requestId'), 50);
    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });

    const request = await db.collection('lead_deletion_requests').findOne({ id: requestId });
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'approve-delete') {
      // Actually delete the lead
      const leads = await readData('leads');
      const filtered = leads.filter(l => l.id !== request.leadId);
      await writeData('leads', filtered);

      await db.collection('lead_deletion_requests').updateOne(
        { id: requestId },
        { $set: { status: 'approved', reviewedBy: session.name || session.email, reviewedAt: new Date().toISOString() } }
      );

      await logAdminAction(session, 'APPROVE_LEAD_DELETE', 'lead', request.leadId, {
        requestedBy: request.requestedByName,
        reason: request.reason,
        leadCompany: request.leadCompanyName,
      });

      return NextResponse.json({ success: true, message: 'Deletion approved — lead permanently removed.' });
    } else {
      // Reject — just update the request status, unmark the lead
      const leads = await readData('leads');
      const idx = leads.findIndex(l => l.id === request.leadId);
      if (idx !== -1) {
        leads[idx].deletionRequested = false;
        leads[idx].deletionRequestId = null;
        leads[idx].updatedAt = new Date().toISOString();
        await writeData('leads', leads);
      }

      await db.collection('lead_deletion_requests').updateOne(
        { id: requestId },
        { $set: { status: 'rejected', reviewedBy: session.name || session.email, reviewedAt: new Date().toISOString() } }
      );

      return NextResponse.json({ success: true, message: 'Deletion request rejected.' });
    }
  }

  // Direct admin delete
  const id = sanitizeString(searchParams.get('id'), 50);
  if (!id) return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });

  const leads = await readData('leads');
  const lead = leads.find(l => l.id === id);
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const filtered = leads.filter(l => l.id !== id);
  await writeData('leads', filtered);

  // Also clean up any pending deletion requests for this lead
  await db.collection('lead_deletion_requests').updateMany(
    { leadId: id, status: 'pending' },
    { $set: { status: 'superseded', reviewedBy: session.name || session.email, reviewedAt: new Date().toISOString() } }
  );

  await logAdminAction(session, 'DELETE_LEAD', 'lead', id, {
    company: lead.companyName,
    contact: lead.contactPerson,
  });

  return NextResponse.json({ success: true });
}
