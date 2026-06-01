import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isValidEmail, isNonEmptyString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

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
    const colleges = await db.collection('colleges').find({}).toArray();
    
    // Fetch all POCs from the users collection
    const pocUsers = await db.collection('users').find({ role: 'College POC' }).toArray();
    
    // Fetch all users with a collegeId
    const allUsers = await db.collection('users').find({ collegeId: { $exists: true } }).toArray();
    
    // Enrich colleges with POC user details and list of members
    const enrichedColleges = colleges.map(c => {
      const poc = pocUsers.find(u => u.collegeId === c.id || u.collegeId === String(c._id));
      
      // Filter out password and select members for this college
      const members = allUsers
        .filter(u => u.collegeId === c.id || u.collegeId === String(c._id))
        .map(({ password, ...u }) => u);

      return {
        ...c,
        pocName: poc ? poc.name : 'Unassigned',
        pocEmail: poc ? poc.email : 'Unassigned',
        members: members,
      };
    });

    return NextResponse.json({ colleges: enrichedColleges, pocs: pocUsers.map(({ password, ...u }) => u) });
  } catch (err) {
    console.error('Failed to fetch colleges:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireAdmin();
  if (auth.error) return auth.response;

  let body;
  try {
    body = sanitizeInput(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = sanitizeString(body.name, 150);
  const code = sanitizeString(body.code, 20).toUpperCase();
  const city = sanitizeString(body.city, 100);
  const state = sanitizeString(body.state, 100);
  const pocName = sanitizeString(body.pocName, 100);
  const pocEmail = sanitizeString(body.pocEmail, 254).toLowerCase();
  const pocPassword = body.pocPassword || 'Welcome@2026';

  if (!isNonEmptyString(name) || !isNonEmptyString(code) || !isNonEmptyString(pocName)) {
    return NextResponse.json({ error: 'College Name, Code, and POC Name are required' }, { status: 400 });
  }

  if (!isValidEmail(pocEmail)) {
    return NextResponse.json({ error: 'A valid POC email is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    
    // Check if college code or name already exists
    const existingCollege = await db.collection('colleges').findOne({ 
      $or: [{ code }, { name: { $regex: new RegExp(`^${name}$`, 'i') } }]
    });
    if (existingCollege) {
      return NextResponse.json({ error: 'College Name or Code already exists' }, { status: 400 });
    }

    // Check if POC email is already registered
    const existingUser = await db.collection('users').findOne({ email: pocEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'POC Email is already registered to another account' }, { status: 400 });
    }

    // Generate permanent ID for college
    const collegeId = uuid();

    // Create the POC user first
    const pocUserId = `POC${code}${uuid().substring(0, 4).toUpperCase()}`;
    const hashedPassword = await bcrypt.hash(pocPassword, 10);
    
    const newPocUser = {
      id: pocUserId,
      name: pocName,
      email: pocEmail,
      password: hashedPassword,
      role: 'College POC',
      department: 'Student Ambassador',
      designation: 'College Point of Contact',
      status: 'active',
      theme: 'system',
      collegeId: collegeId,
      joinedAt: new Date().toISOString(),
    };

    await db.collection('users').insertOne(newPocUser);

    // Create College entry
    const newCollege = {
      id: collegeId,
      name,
      code,
      city,
      state,
      pocId: pocUserId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await db.collection('colleges').insertOne(newCollege);

    // Log admin action
    await logAdminAction(auth.session, 'CREATE_COLLEGE', 'college', collegeId, {
      name,
      code,
      pocEmail,
      pocName,
    });

    const { password, ...sanitizedPoc } = newPocUser;
    return NextResponse.json({ success: true, college: newCollege, poc: sanitizedPoc });
  } catch (err) {
    console.error('Failed to create college and POC:', err);
    return NextResponse.json({ error: 'Failed to create college account due to database error' }, { status: 500 });
  }
}
