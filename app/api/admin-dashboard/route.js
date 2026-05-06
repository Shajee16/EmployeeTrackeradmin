import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';

export async function GET() {
  const users = await readData('users');
  const leads = await readData('leads');
  const subs = await readData('submissions');

  const forceSize = users.length;
  const activeForce = users.filter(u => u.status !== 'away').length;
  const financialYield = leads.filter(l => l.status === 'Closed').reduce((acc, l) => acc + (Number(l.dealValue) || 100000), 0);

  // Fake revenue data for AreaChart
  const revenueData = [
    { month: 'Jan', actual: 4000, projected: 4400 },
    { month: 'Feb', actual: 3000, projected: 3200 },
    { month: 'Mar', actual: 2000, projected: 2500 },
    { month: 'Apr', actual: 2780, projected: 3000 },
    { month: 'May', actual: 1890, projected: 2200 },
    { month: 'Jun', actual: 2390, projected: 2800 },
    { month: 'Jul', actual: 3490, projected: 3800 },
  ];

  // Heatmap data
  const depts = users.reduce((acc, u) => {
    acc[u.department] = (acc[u.department] || 0) + 1;
    return acc;
  }, {});

  const unitHeatmap = Object.entries(depts).map(([dept, count]) => ({
    department: dept,
    efficiency: Math.floor(Math.random() * 40) + 60, // random 60-100%
    headcount: count
  }));

  return NextResponse.json({
    metrics: { forceSize, activeForce, financialYield },
    revenueData,
    unitHeatmap
  });
}
