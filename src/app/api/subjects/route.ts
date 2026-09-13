import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const subjects = await (prisma as any).subject.findMany({
      include: {
        submodules: {
          include: {
            concepts: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch subjects' }, { status: 500 });
  }
}
