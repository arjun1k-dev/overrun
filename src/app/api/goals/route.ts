import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const goalModel = (db as any).goal;

// GET /api/goals — fetch all goals from SQLite
export async function GET() {
  try {
    const goals = await goalModel.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const parsedGoals = goals.map((g: any) => ({
      ...g,
      topics: typeof g.topics === 'string' ? g.topics.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    }));

    return NextResponse.json({ success: true, goals: parsedGoals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch goals' }, { status: 500 });
  }
}

// POST /api/goals — Sync/upsert a batch of goals into SQLite
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goals } = body;

    if (!Array.isArray(goals)) {
      return NextResponse.json({ error: 'goals array is required' }, { status: 400 });
    }

    const saved: any[] = [];

    for (const g of goals) {
      const topicsStr = Array.isArray(g.topics) ? g.topics.join(', ') : g.topics || '';

      const record = await goalModel.upsert({
        where: { id: g.id || `goal-${Date.now()}` },
        update: {
          title: g.title,
          description: g.description || null,
          deadline: g.deadline || null,
          category: g.category || 'other',
          topics: topicsStr,
          status: g.status || 'active',
          completedAt: g.completedAt ? new Date(g.completedAt) : null,
        },
        create: {
          id: g.id || `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: g.title,
          description: g.description || null,
          deadline: g.deadline || null,
          category: g.category || 'other',
          topics: topicsStr,
          status: g.status || 'active',
          completedAt: g.completedAt ? new Date(g.completedAt) : null,
        },
      });

      saved.push(record);
    }

    return NextResponse.json({ success: true, count: saved.length, goals: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save goals' }, { status: 500 });
  }
}
