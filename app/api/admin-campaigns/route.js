import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeInput, sanitizeString, isNonEmptyString, isOneOf } from '@/lib/sanitize';
import { logAdminAction } from '@/lib/audit';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const db = await getDb();
    const campaigns = await db.collection('campaigns')
      .find({})
      .sort({ startDate: 1 })
      .toArray();

    // Fetch colleges for stats
    const colleges = await db.collection('colleges').find({}).toArray();
    const users = await db.collection('users').find({ role: 'Campus Ambassador' }).toArray();

    const enhanced = campaigns.map(camp => {
      // Calculate how many target ambassadors
      const targets = camp.targetColleges || [];
      let ambassadorCount = 0;
      if (targets.includes('All') || targets.length === 0) {
        ambassadorCount = users.length;
      } else {
        ambassadorCount = users.filter(u => targets.includes(u.collegeId)).length;
      }

      return {
        ...camp,
        ambassadorCount,
        targetCollegeNames: targets.includes('All') 
          ? ['All Colleges'] 
          : targets.map(tid => colleges.find(c => c.id === tid)?.name || tid),
      };
    });

    return NextResponse.json({ campaigns: enhanced });
  } catch (err) {
    console.error('Failed to get campaigns:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rawBody = await req.json();
    const body = sanitizeInput(rawBody);

    if (!isNonEmptyString(body.title)) {
      return NextResponse.json({ error: 'Campaign title is required' }, { status: 400 });
    }
    if (!isNonEmptyString(body.startDate) || !isNonEmptyString(body.endDate)) {
      return NextResponse.json({ error: 'Campaign start and end dates are required' }, { status: 400 });
    }

    const campaignId = uuid();
    const newCampaign = {
      id: campaignId,
      title: sanitizeString(body.title, 200),
      description: sanitizeString(body.description || '', 2000),
      startDate: sanitizeString(body.startDate, 50),
      endDate: sanitizeString(body.endDate, 50),
      status: isOneOf(body.status, ['active', 'upcoming', 'completed']) ? body.status : 'upcoming',
      targetColleges: Array.isArray(body.targetColleges) ? body.targetColleges : ['All'],
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection('campaigns').insertOne(newCampaign);

    // Auto-Task Allocation Checklist
    if (body.taskTemplate && isNonEmptyString(body.taskTemplate.title)) {
      const taskTemplate = body.taskTemplate;
      
      // 1. Fetch matching ambassadors
      const targets = newCampaign.targetColleges;
      let targetAmbassadors = [];
      if (targets.includes('All') || targets.length === 0) {
        targetAmbassadors = await db.collection('users')
          .find({ role: 'Campus Ambassador' })
          .toArray();
      } else {
        targetAmbassadors = await db.collection('users')
          .find({ role: 'Campus Ambassador', collegeId: { $in: targets } })
          .toArray();
      }

      // 2. Insert individual tasks for each matching ambassador
      if (targetAmbassadors.length > 0) {
        const newTasks = targetAmbassadors.map(amb => ({
          id: uuid(),
          userId: amb.id,
          scope: 'individual',
          collegeId: amb.collegeId,
          title: sanitizeString(taskTemplate.title, 200),
          description: sanitizeString(taskTemplate.description || `Task for campaign: ${newCampaign.title}`, 2000),
          priority: isOneOf(taskTemplate.priority, ['Low', 'Medium', 'High', 'Critical']) ? taskTemplate.priority : 'Medium',
          status: 'Pending',
          deadline: sanitizeString(taskTemplate.deadline || newCampaign.endDate, 30),
          comments: [],
          completionProof: null,
          createdAt: new Date().toISOString(),
          hasAttachment: false,
          attachmentName: null,
          campaignId: campaignId, // link back to this campaign
        }));

        await db.collection('tasks').insertMany(newTasks);
      }
    }

    await logAdminAction(session, 'CREATE_CAMPAIGN', 'campaign', campaignId, {
      title: newCampaign.title,
      targetColleges: newCampaign.targetColleges,
    });

    return NextResponse.json({ campaign: newCampaign });
  } catch (err) {
    console.error('Failed to create campaign:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!['System Admin', 'Super Admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = sanitizeString(searchParams.get('id'), 50);

  if (!id) {
    return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
  }

  try {
    const db = await getDb();
    
    // Check if campaign exists
    const campaign = await db.collection('campaigns').findOne({ id });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Delete campaign
    await db.collection('campaigns').deleteOne({ id });

    // (Optional) Remove auto-allocated tasks that are still Pending
    await db.collection('tasks').deleteMany({ campaignId: id, status: 'Pending' });

    await logAdminAction(session, 'DELETE_CAMPAIGN', 'campaign', id, {
      title: campaign.title,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete campaign:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
