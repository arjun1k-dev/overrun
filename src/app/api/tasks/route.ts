import { NextResponse } from 'next/server';

export const dynamic = "force-static";

// GET /api/tasks — Returns clean empty tasks list for 100% static client privacy
export async function GET() {
  return NextResponse.json({ success: true, tasks: [] });
}

// POST /api/tasks — Client-side sync handler fallback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks = [] } = body;
    return NextResponse.json({ success: true, count: tasks.length, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save tasks' }, { status: 500 });
  }
}
