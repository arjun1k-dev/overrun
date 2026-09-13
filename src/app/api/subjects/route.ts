import { NextResponse } from 'next/server';

export const dynamic = "force-static";

// GET /api/subjects — Returns clean empty subjects list for 100% static client privacy
export async function GET() {
  return NextResponse.json({
    success: true,
    count: 0,
    subjects: [],
  });
}
