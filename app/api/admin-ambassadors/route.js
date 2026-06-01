import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
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

  try {
    const db = await getDb();
    
    // Fetch onboarding requests
    const requests = await db.collection('ambassador_onboarding_requests').find({}).toArray();
    
    // Fetch colleges for enrichment
    const colleges = await db.collection('colleges').find({}).toArray();
    
    // Enrich requests with college details
    const enrichedRequests = requests.map(r => {
      const college = colleges.find(c => c.id === r.collegeId || String(c._id) === r.collegeId);
      return {
        ...r,
        collegeName: college ? college.name : 'Unknown College',
        collegeCode: college ? college.code : 'UNKNOWN',
      };
    });

    return NextResponse.json({ requests: enrichedRequests });
  } catch (err) {
    console.error('Failed to fetch onboarding requests:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const requestId = body.requestId;
  const action = sanitizeString(body.action, 20); // 'approve' | 'reject'
  const remarks = sanitizeString(body.remarks || '', 250);

  if (!requestId || !isOneOf(action, ['approve', 'reject'])) {
    return NextResponse.json({ error: 'requestId and valid action (approve/reject) are required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    
    const request = await db.collection('ambassador_onboarding_requests').findOne({ id: requestId });
    if (!request) {
      return NextResponse.json({ error: 'Onboarding request not found' }, { status: 404 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: `Request has already been ${request.status}` }, { status: 400 });
    }

    if (action === 'reject') {
      await db.collection('ambassador_onboarding_requests').updateOne(
        { id: requestId },
        {
          $set: {
            status: 'rejected',
            adminRemarks: remarks,
            resolvedAt: new Date().toISOString(),
          }
        }
      );

      await logAdminAction(auth.session, 'REJECT_AMBASSADOR_REQUEST', 'ambassador_request', requestId, { remarks });
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Action is approved
    // Check if email already exists in users
    const existingUser = await db.collection('users').findOne({ email: request.studentEmail.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this student email already exists' }, { status: 400 });
    }

    // Fetch college for code
    const college = await db.collection('colleges').findOne({ id: request.collegeId });
    const collegeCode = college ? college.code : 'AMB';
    
    // Create new Campus Ambassador User
    const ambassadorId = `AMB${collegeCode}${uuid().substring(0, 4).toUpperCase()}`;
    const defaultPassword = 'Ambassador@2026';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newAmbassadorUser = {
      id: ambassadorId,
      name: request.studentName,
      email: request.studentEmail.toLowerCase(),
      password: hashedPassword,
      role: 'Campus Ambassador',
      department: 'Student Ambassador',
      designation: 'Campus Ambassador',
      phone: request.studentPhone || '',
      status: 'active',
      theme: 'system',
      collegeId: request.collegeId,
      pocId: request.pocId,
      joinedAt: new Date().toISOString(),
    };

    await db.collection('users').insertOne(newAmbassadorUser);

    // Update Request status
    await db.collection('ambassador_onboarding_requests').updateOne(
      { id: requestId },
      {
        $set: {
          status: 'approved',
          adminRemarks: remarks,
          resolvedAt: new Date().toISOString(),
        }
      }
    );

    await logAdminAction(auth.session, 'APPROVE_AMBASSADOR_REQUEST', 'ambassador_request', requestId, {
      ambassadorId,
      email: request.studentEmail,
      college: college?.name,
    });

    // Send welcome onboarding email with logo & temporary password
    let logoBase64 = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (logoErr) {
      console.error('Failed to read inline email logo:', logoErr);
    }

    try {
      const emailHtml = `
        <div style="font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #f3f4f6; padding: 40px 15px; margin: 0;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
            <!-- Header with Gradient Accent -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px 40px; text-align: center;">
                ${logoBase64 ? '<img src="cid:clusologo" alt="Cluso Logo" width="120" style="margin: 0 auto 16px auto; display: block; max-height: 48px; object-fit: contain;" />' : '<h1 style="color: #ffffff; margin: 0 0 16px 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em;">CLUSO</h1>'}
                <p style="margin: 0; color: #e0e7ff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">Campus Ambassador Program</p>
                <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.01em;">Welcome to Cluso!</h1>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 40px 32px 40px; color: #374151;">
                <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #1f2937;">Dear <strong>${request.studentName}</strong>,</p>
                <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4b5563;">Congratulations! Your application to join Cluso as a <strong>Campus Ambassador</strong> has been approved. We are thrilled to welcome you to our growing community of student leaders and creators!</p>
                
                <!-- Onboarding Box -->
                <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
                  <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em;">Your Account Credentials</h3>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 140px; border-bottom: 1px solid #f3f4f6;">Portal / CRM Link</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #4f46e5; border-bottom: 1px solid #f3f4f6;">
                        <a href="https://crm.cluso.in" style="color: #4f46e5; text-decoration: none;">crm.cluso.in</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 140px; border-bottom: 1px solid #f3f4f6;">Login Email</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #111827; border-bottom: 1px solid #f3f4f6; word-break: break-all;">${request.studentEmail.toLowerCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; width: 140px;">Temp Password</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #111827;">
                        <code style="background-color: #eef2ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 13px;">Ambassador@2026</code>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Next Steps / Guide -->
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #111827;">Getting Started</h4>
                <ul style="margin: 0 0 28px 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                  <li style="margin-bottom: 8px;">Go to <a href="https://crm.cluso.in" style="color: #4f46e5; font-weight: 600; text-decoration: none;">crm.cluso.in</a> using a desktop or mobile device.</li>
                  <li style="margin-bottom: 8px;">Log in using your student email and the temporary password provided above.</li>
                  <li style="margin-bottom: 8px;">Explore your brand new <strong>Ambassador Workspace</strong> to log daily activities, submit proof-of-work across our 4 core pillars (Content, Events, Leads, and Shift tracking), and interact with your POC!</li>
                </ul>

                <!-- Primary CTA Button -->
                <div style="text-align: center; margin-bottom: 16px;">
                  <a href="https://crm.cluso.in" style="background-color: #4f46e5; color: #ffffff; display: inline-block; padding: 14px 32px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); text-transform: uppercase; letter-spacing: 0.05em; transition: background-color 0.2s ease;">Access Ambassador CRM</a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">This is an automated operational notification regarding your ambassador onboarding status. Please do not reply directly to this email.</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280; font-weight: 600;">© 2026 Cluso. All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </div>
      `;

      await sendTaskEmail({
        to: request.studentEmail.toLowerCase(),
        toName: request.studentName,
        subject: '🚀 Welcome to Cluso! Your Campus Ambassador Request is Approved',
        htmlBody: emailHtml,
        attachment: logoBase64 ? {
          filename: 'logo.png',
          contentType: 'image/png',
          base64Data: logoBase64,
          isInline: true,
          contentId: 'clusologo'
        } : null
      });
    } catch (mailErr) {
      console.error('Failed to send onboarding welcome email:', mailErr);
    }

    return NextResponse.json({ success: true, status: 'approved', ambassadorId });
  } catch (err) {
    console.error('Failed to resolve onboarding request:', err);
    return NextResponse.json({ error: 'Failed to process request due to database error' }, { status: 500 });
  }
}
