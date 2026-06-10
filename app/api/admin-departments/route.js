import { NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin', 'HR', 'Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let departments = await readData('departments');
  if (departments.length === 0) {
    // Seed with defaults
    departments = [
      { id: uuid(), name: 'Sales' },
      { id: uuid(), name: 'Marketing' },
      { id: uuid(), name: 'Operations' },
      { id: uuid(), name: 'Engineering' },
      { id: uuid(), name: 'HR' },
      { id: uuid(), name: 'Finance' },
      { id: uuid(), name: 'Support' }
    ];
    await writeData('departments', departments);
  }

  return NextResponse.json({ departments });
}

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

  const name = sanitizeString(body.name, 100);
  if (!name) return NextResponse.json({ error: 'Department name is required' }, { status: 400 });

  const departments = await readData('departments');
  if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'Department already exists' }, { status: 400 });
  }

  const newDept = { id: uuid(), name };
  departments.push(newDept);
  await writeData('departments', departments);
  
  await logAdminAction(session, 'CREATE_DEPARTMENT', 'system', newDept.id, { name });

  return NextResponse.json({ department: newDept });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['System Admin', 'Super Admin'].includes(session.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const departments = await readData('departments');
  const target = departments.find(d => d.id === id);
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filtered = departments.filter(d => d.id !== id);
  await writeData('departments', filtered);

  await logAdminAction(session, 'DELETE_DEPARTMENT', 'system', id, { name: target.name });

  return NextResponse.json({ success: true });
}
