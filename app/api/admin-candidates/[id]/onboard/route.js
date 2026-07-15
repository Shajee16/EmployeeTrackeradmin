import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { sendTaskEmail } from '@/lib/mailer';

/**
 * POST /api/admin-candidates/[id]/onboard
 *
 * Onboard a candidate as an employee:
 *  1. Read the candidate from the `candidates` collection
 *  2. Create a new employee record in the `users` collection
 *  3. Mark the candidate as onboarded in `candidates` (audit trail)
 *
 * The employee can then log into the employee app with the same email
 * and the password provided during onboarding (or the same password
 * they used as a candidate if transferred).
 *
 * Body: { department, position, designation, password? }
 *   - password is optional; if omitted, the candidate's existing password is transferred
 */
export async function POST(req, { params }) {
  const { error, response, session } = await requireRole(['System Admin', 'Super Admin', 'HR', 'Admin']);
  if (error) {
    return NextResponse.json(
      { error: response?.error || 'Unauthorized' },
      { status: response?.status || 401 }
    );
  }

  const { id } = await params;

  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { department, position, designation, password } = body || {};

  if (!department || typeof department !== 'string' || !department.trim()) {
    return NextResponse.json(
      { error: 'Department is required' },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection('users');

    // Find the candidate in the users collection
    const candidate = await usersCollection.findOne({
      _id: new ObjectId(id),
      role: 'candidate',
      onboarded: { $ne: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found or already onboarded' },
        { status: 404 }
      );
    }

    // Check if an employee with this email already exists in users collection
    const existingEmployee = await usersCollection.findOne({
      email: candidate.email,
      _id: { $ne: candidate._id },
      role: { $ne: 'candidate' },
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: `An employee with email ${candidate.email} already exists in the system.` },
        { status: 409 }
      );
    }

    // Determine the password hash for the new employee
    // If admin provides a password, hash it; otherwise transfer the candidate's password
    let employeePasswordHash;
    if (password && typeof password === 'string' && password.length >= 6) {
      employeePasswordHash = await bcrypt.hash(password, 10);
    } else {
      // Transfer the candidate's existing password hash
      employeePasswordHash = candidate.passwordHash;
    }

    // Generate sequence employee ID (e.g., CLSAL001) using id_counters collection
    const deptName = department.trim();
    const abbrev = deptName.substring(0, 3).toUpperCase();
    const prefix = `CL${abbrev}`;

    const countersCol = db.collection('id_counters');

    // First time bootstrap: check if counter exists, if not seed it from current max in users
    let counterDoc = await countersCol.findOne({ _id: prefix });
    if (!counterDoc) {
      const allDeptUsers = await usersCollection.find({ id: { $regex: `^${prefix}` } }).toArray();
      let maxNum = 0;
      for (const u of allDeptUsers) {
        const numMatch = u.id.match(/\d+$/);
        if (numMatch) {
          const num = parseInt(numMatch[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      await countersCol.updateOne(
        { _id: prefix },
        { $set: { seq: maxNum } },
        { upsert: true }
      );
    }

    // Atomically increment and get the next ID number
    const result = await countersCol.findOneAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const nextNum = result.seq;
    const customId = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const isDigiVerified = !!(candidate.digilockerProfile && candidate.digilockerProfile.verified);
    const digiVerifiedAt = isDigiVerified ? (candidate.digilockerProfile.linkedAt || new Date().toISOString()) : null;

    // Create the employee fields to update/set on the user record
    const newEmployee = {
      id: customId,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || (candidate.digilockerProfile?.mobile) || '',
      password: employeePasswordHash,
      passwordHash: employeePasswordHash, // keep both fields in sync
      role: (position || '').trim() || 'Employee',
      department: department.trim(),
      designation: (designation || '').trim() || '',
      status: 'active',
      theme: 'system',
      joinedAt: new Date().toISOString(),
      onboardedFromCandidate: true,
      candidateId: String(candidate._id),
      // Preserve full candidate profile and digilocker state on users
      candidateProfile: candidate.candidateProfile || null,
      digilockerProfile: candidate.digilockerProfile || null,
      digilockerVerified: isDigiVerified,
      digilockerVerifiedAt: digiVerifiedAt,
      // Mark candidate as onboarded on their user record
      onboarded: true,
      onboardedAt: new Date(),
      onboardedBy: session?.name || session?.email || 'Admin',
      onboardedEmployeeId: customId,
    };

    await usersCollection.updateOne(
      { _id: candidate._id },
      { $set: newEmployee }
    );

    // If candidate has DigiLocker verification, also copy it to the digilocker_verifications collection
    if (isDigiVerified) {
      const dlProfile = candidate.digilockerProfile;
      let calculatedAge = null;
      if (dlProfile.dob) {
        try {
          let birthDate = null;
          const dobStr = dlProfile.dob.toString().trim();
          
          // Check format YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
            const parts = dobStr.split('-');
            birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
          // Check format DDMMYYYY
          else if (/^\d{8}$/.test(dobStr)) {
            const part1 = parseInt(dobStr.substring(0, 2), 10);
            const part2 = parseInt(dobStr.substring(2, 4), 10);
            const year = parseInt(dobStr.substring(4, 8), 10);
            let day = part1;
            let month = part2;
            if (part2 > 12) {
              day = part2;
              month = part1;
            }
            birthDate = new Date(year, month - 1, day);
          }
          // Check format with separators (e.g. DD-MM-YYYY, MM-DD-YYYY, DD/MM/YYYY, MM/DD/YYYY)
          else {
            const parts = dobStr.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                birthDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
              } else if (parts[2].length === 4) {
                const val1 = parseInt(parts[0], 10);
                const val2 = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                let day = val1;
                let month = val2;
                
                if (val2 > 12) {
                  day = val2;
                  month = val1;
                } else if (val1 > 12) {
                  day = val1;
                  month = val2;
                }
                birthDate = new Date(year, month - 1, day);
              }
            }
          }

          if (birthDate && !isNaN(birthDate.getTime())) {
            const today = new Date();
            calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
          }
        } catch {}
      }

      const verificationData = {
        userId: customId,
        verified: true,
        digilockerid: dlProfile.digilockerid || null,
        name: dlProfile.name || null,
        dob: dlProfile.dob || null,
        age: calculatedAge,
        gender: dlProfile.gender || null,
        aadhaar: dlProfile.maskedAadhaar || null,
        mobile: dlProfile.mobile || null,
        email: dlProfile.email || null,
        reference_key: dlProfile.referenceKey || null,
        username: dlProfile.preferredUsername || null,
        pan: dlProfile.panNumber || null,
        dl_no: dlProfile.drivingLicence || null,
        photo: dlProfile.photo || null,
        documents: dlProfile.documents || null,
        rawTokenResponse: dlProfile.rawTokenResponse || null,
        rawUserResponse: dlProfile.rawUserResponse || null,
        rawDocumentsResponse: dlProfile.rawDocumentsResponse || null,
        verifiedAt: dlProfile.linkedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('digilocker_verifications').updateOne(
        { userId: customId },
        { $set: verificationData },
        { upsert: true }
      );
    }

    // Send a professional welcome email to the newly onboarded employee
    const subject = `Welcome to the Team, ${candidate.name}! Your Onboarding is Complete`;
    const safeName = candidate.name;
    const safeDept = department.trim();
    const safePos = (position || '').trim() || 'Employee';
    const safeDesg = (designation || '').trim();

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background-color: #f8fafc; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 24px; border-radius: 16px 16px 0 0; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Cluso Infolink!</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">We are excited to have you on board</p>
        </div>

        <div style="background: #ffffff; padding: 36px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear ${safeName},</p>
          <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155;">
            Congratulations! Your onboarding has been processed and completed successfully. You are officially part of the Cluso Infolink team.
          </p>

          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Employee Details</h3>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #64748b; width: 130px; font-weight: 500;">Employee ID:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700; font-family: monospace;">${customId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 500;">Department:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${safeDept}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 500;">Position:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${safePos}</td>
              </tr>
              ${safeDesg ? `
              <tr>
                <td style="padding: 6px 0; font-size: 14px; color: #64748b; font-weight: 500;">Designation:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${safeDesg}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em;">Accessing Your Portal</h3>
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155;">
            You can now log in to the Employee Portal using your existing credentials (the email and password you used for your candidate registration).
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="https://crm.cluso.in/" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
              Go to Employee Portal
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

          <p style="margin: 0; font-size: 13px; color: #64748b;">
            If you have any questions or need setup assistance, please contact your supervisor or reach out to the HR Operations team. We wish you an amazing journey ahead!
          </p>

          <p style="margin: 24px 0 0 0; font-size: 14px; color: #475569; font-weight: 600;">
            Best Regards,<br/>
            <span style="color: #6366f1;">HR Operations Team</span><br/>
            Cluso Infolink
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Cluso Infolink. All rights reserved.</p>
          <p style="margin: 4px 0 0 0;">This is an automated notification. Please do not reply directly to this email.</p>
        </div>
      </div>
    `;

    sendTaskEmail({
      to: candidate.email,
      toName: candidate.name,
      subject,
      htmlBody,
    }).catch(mailErr => {
      console.error('Failed to send onboarding welcome email:', mailErr);
    });

    return NextResponse.json({
      message: `${candidate.name} has been onboarded as an Employee in ${department.trim()}.`,
      employee: {
        id: newEmployee.id,
        name: candidate.name,
        email: candidate.email,
        department: department.trim(),
        position: (position || '').trim(),
        designation: (designation || '').trim(),
      },
    });
  } catch (err) {
    console.error('[admin-candidates/onboard] Error:', err);
    return NextResponse.json(
      { error: 'Failed to onboard candidate' },
      { status: 500 }
    );
  }
}
