import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitize';
import { auditLog } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

/**
 * POST /api/admin-leads/bulk-import
 * Accepts { leads: [...] } where each lead matches the CSV template columns.
 * Admins and Super Admins can call this.
 */
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const rows = Array.isArray(body.leads) ? body.leads : [];
  if (rows.length === 0) return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ error: 'Max 1000 leads per import' }, { status: 400 });

  const existingLeads = await readData('leads');
  const users = await readData('users');
  const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'];
  const validPriorities = ['Low', 'Medium', 'High', 'Hot', 'Critical'];
  const created = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    if (!raw.companyName || !String(raw.companyName).trim()) {
      errors.push({ row: rowNum, error: 'companyName is required' });
      continue;
    }

    // Resolve assignee: try by employee ID or email
    let assignedUserId = '';
    if (raw.assignToEmployeeId) {
      const u = users.find(u => u.id === raw.assignToEmployeeId);
      assignedUserId = u ? u.id : '';
    } else if (raw.assignToEmail) {
      const u = users.find(u => u.email?.toLowerCase() === String(raw.assignToEmail).toLowerCase());
      assignedUserId = u ? u.id : '';
    }

    const newLead = {
      id: uuid(),
      userId: sanitizeString(assignedUserId, 50),
      companyName: sanitizeString(String(raw.companyName), 200),
      contactPerson: sanitizeString(String(raw.contactPerson || ''), 100),
      designation: sanitizeString(String(raw.designation || ''), 100),
      phone: sanitizeString(String(raw.phone || ''), 20),
      email: sanitizeString(String(raw.email || ''), 254),
      address: sanitizeString(String(raw.address || ''), 500),
      industry: sanitizeString(String(raw.industry || ''), 100),
      companySize: sanitizeString(String(raw.companySize || ''), 20),
      source: sanitizeString(String(raw.source || 'Bulk Import'), 100),
      estDealValue: sanitizeString(String(raw.estDealValue || ''), 50),
      notes: sanitizeString(String(raw.notes || ''), 2000),
      priority: validPriorities.includes(raw.priority) ? raw.priority : 'Medium',
      status: validStatuses.includes(raw.status) ? raw.status : 'New',
      servicesInterested: raw.servicesInterested ? String(raw.servicesInterested).split(',').map(s => s.trim()).filter(Boolean) : [],
      activities: [{
        id: Date.now().toString() + i,
        type: 'Status Change',
        description: `Lead imported via bulk upload by ${session.name || session.email}.`,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existingLeads.push(newLead);
    created.push(newLead);
  }

  if (created.length > 0) {
    await writeData('leads', existingLeads);
    await auditLog({
      action: 'BULK_IMPORT_LEADS',
      performedBy: session.email,
      performedByRole: session.role,
      details: { count: created.length, errors: errors.length },
    });
  }

  return NextResponse.json({
    success: true,
    imported: created.length,
    errors,
    total: rows.length,
  });
}
