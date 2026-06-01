import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

const POINTS = {
  content_post: 100,
  blog_article: 100,
  video_created: 100,
  advertised_event: 100,
  event_hosted: 500,
  campus_tour: 500,
  workshop: 500,
  booth_managed: 500,
  student_mentored: 50,
  qa_session: 50,
  inquiry_response: 50,
  lead_signup: 150,
  referral_distributed: 150,
  app_install: 150,
  people_added: 150,
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Fetch all ambassador activities
    const activities = await db.collection('ambassador_activities')
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    // Fetch all ambassadors
    const ambassadors = await db.collection('users')
      .find({ role: 'Campus Ambassador' })
      .toArray();

    // Fetch all colleges
    const colleges = await db.collection('colleges')
      .find({})
      .toArray();

    // Enrich activities with ambassador name and college name
    const enriched = activities.map(act => {
      const amb = ambassadors.find(a => a.id === act.ambassadorId);
      const college = colleges.find(c => c.id === act.collegeId);
      return {
        id: act.id,
        type: act.type,
        description: act.description,
        metrics: act.metrics,
        proofs: (act.proofs || []).map(p => ({ filename: p.filename, contentType: p.contentType })), // strip base64 for list view
        createdAt: act.createdAt,
        ambassadorName: amb?.name || 'Unknown',
        ambassadorEmail: amb?.email || '',
        collegeName: college?.name || 'Unknown College',
      };
    });

    // Compute aggregated stats
    const contentTypes = ['content_post', 'blog_article', 'video_created', 'advertised_event'];
    const eventTypes = ['event_hosted', 'campus_tour', 'workshop', 'booth_managed', 'planned_event', 'executed_event'];
    const mentorTypes = ['student_mentored', 'qa_session', 'inquiry_response'];
    const leadTypes = ['lead_signup', 'referral_distributed', 'app_install', 'people_added'];

    const stats = {
      totalActivities: activities.length,
      totalAmbassadors: ambassadors.length,
      totalColleges: colleges.length,
      contentCreated: activities.filter(a => contentTypes.includes(a.type)).length,
      eventsHosted: activities.filter(a => eventTypes.includes(a.type)).length,
      studentsMentored: activities.filter(a => mentorTypes.includes(a.type)).reduce((acc, curr) => acc + (curr.metrics?.count || 1), 0),
      leadsGenerated: activities.filter(a => leadTypes.includes(a.type)).reduce((acc, curr) => acc + (curr.metrics?.count || 0), 0),
    };

    // Group by college for breakdown
    const collegeBreakdown = {};
    enriched.forEach(act => {
      const cName = act.collegeName;
      if (!collegeBreakdown[cName]) {
        collegeBreakdown[cName] = { total: 0, ambassadors: new Set(), content: 0, events: 0, mentoring: 0, leads: 0 };
      }
      collegeBreakdown[cName].total++;
      collegeBreakdown[cName].ambassadors.add(act.ambassadorName);
      if (contentTypes.includes(act.type)) collegeBreakdown[cName].content++;
      if (eventTypes.includes(act.type)) collegeBreakdown[cName].events++;
      if (mentorTypes.includes(act.type)) collegeBreakdown[cName].mentoring++;
      if (leadTypes.includes(act.type)) collegeBreakdown[cName].leads++;
    });

    // Convert Sets to counts
    const collegeStats = Object.entries(collegeBreakdown).map(([name, data]) => ({
      name,
      total: data.total,
      ambassadorCount: data.ambassadors.size,
      content: data.content,
      events: data.events,
      mentoring: data.mentoring,
      leads: data.leads,
    }));

    // Fetch proof-of-work submissions
    const proofSubmissions = await db.collection('ambassador_proofs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const enrichedProofs = proofSubmissions.map(p => {
      const amb = ambassadors.find(a => a.id === p.ambassadorId);
      const college = colleges.find(c => c.id === p.collegeId);
      return {
        ...p,
        proofs: (p.proofs || []).map(f => ({ filename: f.filename, contentType: f.contentType })),
        ambassadorName: amb?.name || 'Unknown',
        collegeName: college?.name || 'Unknown College',
      };
    });

    stats.totalProofSubmissions = proofSubmissions.length;
    stats.pendingProofs = proofSubmissions.filter(p => p.status === 'pending').length;

    // Calculate Leaderboard dynamic list
    const leaderboardData = ambassadors.map(user => {
      const userActivities = activities.filter(a => a.ambassadorId === user.id);

      let score = 0;
      let contentCreated = 0;
      let eventsHosted = 0;
      let studentsMentored = 0;
      let leadsGenerated = 0;
      let totalActivities = 0;

      userActivities.forEach(act => {
        const type = act.type;
        const count = parseInt(act.metrics?.count || 1, 10);

        if (POINTS[type] !== undefined) {
          totalActivities++;
          if (['content_post', 'blog_article', 'video_created', 'advertised_event'].includes(type)) {
            score += POINTS[type];
            contentCreated++;
          } else if (['event_hosted', 'campus_tour', 'workshop', 'booth_managed'].includes(type)) {
            score += POINTS[type];
            eventsHosted++;
          } else if (['student_mentored', 'qa_session', 'inquiry_response'].includes(type)) {
            score += count * POINTS[type];
            studentsMentored += count;
          } else if (['lead_signup', 'referral_distributed', 'app_install', 'people_added'].includes(type)) {
            score += count * POINTS[type];
            leadsGenerated += count;
          }
        }
      });

      const badges = [
        { id: 'content_catalyst', label: 'Content Catalyst', emoji: '🎨', unlocked: contentCreated >= 5 },
        { id: 'campus_pioneer', label: 'Campus Pioneer', emoji: '🎪', unlocked: eventsHosted >= 3 },
        { id: 'student_guide', label: 'Student Guide', emoji: '💬', unlocked: studentsMentored >= 10 },
        { id: 'lead_magnet', label: 'Lead Magnet', emoji: '🎯', unlocked: leadsGenerated >= 10 },
        { id: 'super_ambassador', label: 'Super Ambassador', emoji: '⭐', unlocked: totalActivities >= 25 },
      ];

      const college = colleges.find(c => c.id === user.collegeId);

      return {
        userId: user.id,
        name: user.name || 'Anonymous Rep',
        email: user.email,
        collegeId: user.collegeId,
        collegeName: college?.name || 'Unknown College',
        score,
        badges,
        stats: { contentCreated, eventsHosted, studentsMentored, leadsGenerated, totalActivities }
      };
    });

    leaderboardData.sort((a, b) => b.score - a.score);
    const rankedLeaderboard = leaderboardData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return NextResponse.json({
      activities: enriched,
      stats,
      collegeStats,
      proofSubmissions: enrichedProofs,
      leaderboard: rankedLeaderboard,
    });
  } catch (err) {
    console.error('Failed in GET /api/admin-ambassador-activity:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { proofId, status } = body;

    if (!proofId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid proofId or status' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('ambassador_proofs').updateOne(
      { id: proofId },
      { $set: { status, reviewedBy: session.name || session.email, reviewedAt: new Date().toISOString() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed in PUT /api/admin-ambassador-activity:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
