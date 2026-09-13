import { NextResponse } from 'next/server';

export const dynamic = "force-static";

// GET /api/goals — Returns clean empty goals list for 100% static client privacy
export async function GET() {
  return NextResponse.json({ success: true, goals: [] });
}

// POST /api/goals — Client-side sync handler fallback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goals = [] } = body;
    return NextResponse.json({ success: true, count: goals.length, goals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save goals' }, { status: 500 });
  }
}
