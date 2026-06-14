import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { sendTaskEmail } from '@/lib/mailer';

async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: true, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return { error: true, response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return { error: false, session };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const db = await getDb();
  const certificates = await db.collection('certificates')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const safe = certificates.map(({ _id, ...c }) => ({
    ...c,
    id: c.id || _id.toString(),
  }));

  return NextResponse.json({ certificates: safe });
}

export async function POST(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { pdfBase64, certificateHtml, respondentSignature, sendEmail } = rawBody;
  const body = sanitizeInput(rawBody);

  const {
    type, category, recipientId, recipientName, recipientEmail,
    recipientDesignation, respondentName, respondentRole,
    respondentDepartment, dateFrom, dateTo, remarks, template
  } = body;

  if (!type || !recipientName || !recipientEmail || !template) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = await getDb();

  // Generate certificate ID
  const count = await db.collection('certificates').countDocuments();
  const certId = `CERT-${String(count + 1).padStart(5, '0')}`;

  const certificate = {
    id: certId,
    type: sanitizeString(type, 50),
    category: sanitizeString(category || '', 50),
    recipientId: sanitizeString(recipientId || '', 50),
    recipientName: sanitizeString(recipientName, 100),
    recipientEmail: sanitizeString(recipientEmail, 254).toLowerCase(),
    recipientDesignation: sanitizeString(recipientDesignation || '', 100),
    respondentName: sanitizeString(respondentName || '', 100),
    respondentRole: sanitizeString(respondentRole || '', 50),
    respondentDepartment: sanitizeString(respondentDepartment || '', 50),
    dateFrom: sanitizeString(dateFrom || '', 20),
    dateTo: sanitizeString(dateTo || '', 20),
    remarks: sanitizeString(remarks || '', 500),
    template: sanitizeString(template, 20),
    respondentSignature: respondentSignature || '',
    createdAt: new Date().toISOString(),
    createdBy: auth.session.email,
    shared: false,
    sharedAt: null,
  };

  await db.collection('certificates').insertOne(certificate);

  // Audit log
  await logAdminAction(auth.session, 'CREATE_CERTIFICATE', 'certificate', certId, {
    recipientName: certificate.recipientName,
    recipientEmail: certificate.recipientEmail,
    type: certificate.type,
  });

  // Optionally send email
  if (sendEmail) {
    try {
      const emailTitle = getCertTitle(type, category);
      const emailHtmlBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 16px;">
            <h2 style="color: #b8895e; margin: 0; font-size: 1.5rem; font-weight: 700;">Congratulations, ${certificate.recipientName}!</h2>
          </div>
          <p>Dear ${certificate.recipientName},</p>
          <p>We are pleased to present you with your official <strong>${emailTitle}</strong> from Cluso Infolink.</p>
          <p>During your time with us as ${'aeiou'.includes((certificate.recipientDesignation || 'team member').charAt(0).toLowerCase()) ? 'an' : 'a'} <strong>${certificate.recipientDesignation || 'team member'}</strong>, we greatly valued your dedication, efforts, and valuable contributions to the organization.</p>
          <p>We have generated your certificate as an official document. Please find the high-quality **PDF certificate attached** directly to this email.</p>
          <p>Thank you once again, and we wish you the very best in all your future professional achievements and endeavors.</p>
          <div style="margin-top: 28px; border-top: 1px solid #edf2f7; padding-top: 16px;">
            <p style="margin: 0 0 4px; color: #718096; font-size: 0.85rem;">Best regards,</p>
            <p style="margin: 0; font-weight: 700; color: #2d3748;">Cluso Infolink Management</p>
          </div>
        </div>
      `;

      const attachment = pdfBase64 ? {
        filename: `${certificate.recipientName.replace(/\s+/g, '_')}_Certificate.pdf`,
        contentType: 'application/pdf',
        base64Data: pdfBase64
      } : null;

      const emailResult = await sendTaskEmail({
        to: certificate.recipientEmail,
        toName: certificate.recipientName,
        subject: `Your ${emailTitle} — Cluso Infolink`,
        htmlBody: emailHtmlBody,
        attachment
      });

      if (emailResult.success) {
        await db.collection('certificates').updateOne(
          { id: certId },
          { $set: { shared: true, sharedAt: new Date().toISOString() } }
        );
        certificate.shared = true;
        certificate.sharedAt = new Date().toISOString();
      }

      return NextResponse.json({
        certificate,
        success: true,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
      });
    } catch (emailErr) {
      return NextResponse.json({
        certificate,
        success: true,
        emailSent: false,
        emailError: emailErr.message,
      });
    }
  }

  return NextResponse.json({ certificate, success: true });
}

function getCertTitle(type, category) {
  const titles = {
    excellence: 'Certificate of Excellence',
    completion: 'Certificate of Completion',
    appreciation: 'Certificate of Appreciation',
    achievement: 'Certificate of Achievement',
  };
  let title = titles[type] || 'Certificate';
  if (type === 'completion' && category) {
    const catLabels = {
      internship: 'Internship',
      employment: 'Employment',
      course: 'Course',
      training: 'Training',
      project: 'Project',
    };
    title += ` — ${catLabels[category] || category}`;
  }
  return title;
}
