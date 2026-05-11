import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';

export async function GET() {
  const users = await readData('users');
  const leads = await readData('leads');
  const subs = await readData('submissions');
  const tasks = await readData('tasks');
  const attendance = await readData('attendance');
  const suggestions = await readData('suggestions');

  const forceSize = users.filter(u => u.role !== 'System Admin').length;
  const activeForce = users.filter(u => u.status !== 'away' && u.role !== 'System Admin').length;
  const financialYield = leads.filter(l => l.status === 'Closed').reduce((acc, l) => acc + (Number(l.dealValue) || 100000), 0);

  // Real revenue data from leads grouped by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueByMonth = {};
  monthNames.forEach(m => { revenueByMonth[m] = { actual: 0, projected: 0 }; });

  leads.forEach(l => {
    const date = new Date(l.createdAt || l.updatedAt);
    if (!isNaN(date.getTime())) {
      const month = monthNames[date.getMonth()];
      const value = Number(l.dealValue) || 50000;
      if (l.status === 'Closed') {
        revenueByMonth[month].actual += value;
      }
      revenueByMonth[month].projected += value;
    }
  });

  const revenueData = monthNames.map(month => ({
    month,
    actual: revenueByMonth[month].actual,
    projected: revenueByMonth[month].projected,
  })).filter(d => d.actual > 0 || d.projected > 0);

  // If no revenue data, show at least current month
  if (revenueData.length === 0) {
    const now = new Date();
    revenueData.push({ month: monthNames[now.getMonth()], actual: 0, projected: 0 });
  }

  // Department data from real user groupings with real task completion rates
  const depts = users.reduce((acc, u) => {
    if (u.role === 'System Admin') return acc;
    acc[u.department] = (acc[u.department] || 0) + 1;
    return acc;
  }, {});

  const unitHeatmap = Object.entries(depts).map(([dept, count]) => {
    // Calculate real efficiency: completed tasks / total tasks for dept employees
    const deptUserIds = users.filter(u => u.department === dept).map(u => u.id);
    const deptTasks = tasks.filter(t => deptUserIds.includes(t.userId));
    const completedTasks = deptTasks.filter(t => t.status === 'Completed').length;
    const efficiency = deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0;

    return {
      department: dept,
      efficiency,
      headcount: count
    };
  });

  // Summary counts for the admin
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalSubmissions = subs.length;
  const pendingSubmissions = subs.filter(s => s.status === 'Submitted' || s.status === 'Pending').length;
  const totalSuggestions = suggestions.length;
  const pendingSuggestions = suggestions.filter(s => s.status === 'Pending').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === todayStr && a.status === 'Present').length;
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;

  return NextResponse.json({
    metrics: { forceSize, activeForce, financialYield },
    extendedMetrics: {
      totalTasks, pendingTasks, completedTasks,
      totalSubmissions, pendingSubmissions,
      totalSuggestions, pendingSuggestions,
      todayAttendance, totalLeads, newLeads,
    },
    revenueData,
    unitHeatmap
  });
}
