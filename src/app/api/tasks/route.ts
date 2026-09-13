import { NextResponse } from 'next/server';

export const dynamic = "force-static";
import { db } from '@/lib/db';

const taskModel = (db as any).task;

// GET /api/tasks?dateKey=YYYY-MM-DD or GET all tasks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateKey = searchParams.get('dateKey');

    const tasks = await taskModel.findMany({
      where: dateKey ? { dateKey } : undefined,
      orderBy: [{ dateKey: 'asc' }, { start: 'asc' }],
    });

    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks — Sync/upsert a batch of tasks into SQLite
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks } = body;

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 });
    }

    const saved: any[] = [];

    for (const t of tasks) {
      const taskRecord = await taskModel.upsert({
        where: { id: t.id || `task-${Date.now()}` },
        update: {
          dateKey: t.dateKey,
          start: t.start,
          end: t.end,
          type: t.type,
          task: t.task,
          status: t.status || 'pending',
          actualEnd: t.actualEnd || null,
          deadline: t.deadline || null,
          rawLine: t.rawLine || null,
          isValid: t.isValid ?? true,
          collisionWith: t.collisionWith || null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
        },
        create: {
          id: t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          dateKey: t.dateKey,
          start: t.start,
          end: t.end,
          type: t.type,
          task: t.task,
          status: t.status || 'pending',
          actualEnd: t.actualEnd || null,
          deadline: t.deadline || null,
          rawLine: t.rawLine || null,
          isValid: t.isValid ?? true,
          collisionWith: t.collisionWith || null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
        },
      });

      saved.push(taskRecord);
    }

    return NextResponse.json({ success: true, count: saved.length, tasks: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save tasks' }, { status: 500 });
  }
}
