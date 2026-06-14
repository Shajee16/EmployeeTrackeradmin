import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// Auth + RBAC guard
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

function calculateAge(dob) {
  if (!dob) return null;
  try {
    let birthDate = null;
    const dobStr = dob.toString().trim();
    
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
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
  } catch (err) {
    console.error('Age calculation error:', err);
  }
  return null;
}

// GET — Fetch DigiLocker verification status for all employees
export async function GET(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  const db = await getDb();

  if (employeeId) {
    // Get specific employee's DigiLocker data
    const record = await db.collection('digilocker_verifications').findOne({ userId: employeeId });
    if (!record) {
      return NextResponse.json({ verified: false, userId: employeeId });
    }
    const { _id, ...data } = record;
    if (data.dob) {
      data.age = calculateAge(data.dob);
    }
    return NextResponse.json({ verified: true, ...data });
  }

  // Get all DigiLocker verifications
  const verifications = await db.collection('digilocker_verifications').find({}).toArray();
  const verificationMap = {};
  for (const v of verifications) {
    const { _id, ...data } = v;
    if (data.dob) {
      data.age = calculateAge(data.dob);
    }
    verificationMap[v.userId] = data;
  }

  return NextResponse.json({ verifications: verificationMap });
}

// DELETE — Unlink/delete DigiLocker verification details for a user (Super Admin only)
export async function DELETE(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;
  
  if (auth.session.role !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  if (!employeeId) {
    return NextResponse.json({ error: 'Missing employeeId parameter' }, { status: 400 });
  }

  const db = await getDb();
  
  // Remove digilocker verification record
  await db.collection('digilocker_verifications').deleteOne({ userId: employeeId });
  
  // Unset verified flags in the users collection
  await db.collection('users').updateOne(
    { id: employeeId },
    { $unset: { digilockerVerified: '', digilockerVerifiedAt: '' } }
  );

  return NextResponse.json({ success: true, message: `DigiLocker unlinked successfully for employee ${employeeId}` });
}
