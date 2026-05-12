import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isNonEmptyString } from '@/lib/sanitize';
import { sendEmail } from '@/lib/graph-mail';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

/**
 * GET /api/admin-leads/emails
 * Fetch all sent emails and replies across all employees for admin oversight.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (session.role !== 'System Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = await getDb();
  const emails = await db.collection('emails').find({}).sort({ sentAt: -1 }).toArray();
  const replies = await db.collection('email_replies').find({}).sort({ receivedAt: -1 }).toArray();
  const users = await db.collection('users').find({}).toArray();

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.name || u.email; });

  return NextResponse.json({
    emails: emails.map(({ _id, ...e }) => ({ ...e, senderName: userMap[e.userId] || e.senderName || 'Unknown' })),
    replies: replies.map(({ _id, ...r }) => ({ ...r, ownerName: userMap[r.userId] || 'Unknown' })),
  });
}

/**
 * POST /api/admin-leads/emails
 * Admin sends email on behalf of an employee to a lead.
 * Body: { to, toName, subject, body, onBehalfOfUserId }
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

  if (!isNonEmptyString(body.to)) return NextResponse.json({ error: 'Recipient is required' }, { status: 400 });
  if (!isNonEmptyString(body.subject)) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });

  const toEmail = sanitizeString(body.to, 254);
  const toName = sanitizeString(body.toName || '', 200);
  const subject = sanitizeString(body.subject, 200);
  const emailBody = sanitizeString(body.body || '', 10000);
  const onBehalfOfUserId = sanitizeString(body.onBehalfOfUserId || '', 50);

  // Send via Graph API
  let sendResult;
  try {
    sendResult = await sendEmail({ to: toEmail, toName, subject, body: emailBody });
  } catch (err) {
    sendResult = { success: false, error: err.message };
  }

  // Log the email under the employee's userId so it shows up in their sent
  const db = await getDb();
  const newEmail = {
    id: uuid(),
    userId: onBehalfOfUserId || 'admin',
    senderName: session.name || 'Admin',
    to: toEmail,
    toName: toName,
    subject: subject,
    body: emailBody,
    template: '',
    status: sendResult.success ? 'Delivered' : 'Failed',
    sendError: sendResult.error || null,
    sentAt: new Date().toISOString(),
    sentFrom: process.env.AZURE_SENDER_EMAIL || 'indiaops@cluso.in',
    sentByAdmin: true,
    adminName: session.name || 'Admin',
  };
  await db.collection('emails').insertOne(newEmail);

  await logAdminAction(session, 'SEND_EMAIL_ON_BEHALF', 'email', newEmail.id, {
    to: toEmail,
    subject: subject,
    onBehalfOf: onBehalfOfUserId,
  });

  if (!sendResult.success) {
    return NextResponse.json({ email: { ...newEmail, _id: undefined }, warning: `Email logged but delivery failed: ${sendResult.error}` }, { status: 207 });
  }

  const { _id, ...cleanEmail } = newEmail;
  return NextResponse.json({ email: cleanEmail, success: true });
}
