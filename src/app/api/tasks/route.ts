import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-static";

// Define the absolute path to the timeline tasks storage file
const TASKS_FILE_PATH = path.join(process.cwd(), 'knowledge', '.state', 'tasks', 'tasksByDate.json');

// Ensure the directory exists
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

// GET /api/tasks — Read persistent timeline data
export async function GET() {
  try {
    if (!fs.existsSync(TASKS_FILE_PATH)) {
      return NextResponse.json({ success: true, tasks: {} });
    }
    const data = fs.readFileSync(TASKS_FILE_PATH, 'utf-8');
    const tasks = JSON.parse(data);
    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to read tasks' }, { status: 500 });
  }
}

// POST /api/tasks — Write persistent timeline data
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tasks = {} } = body;
    
    ensureDirectoryExistence(TASKS_FILE_PATH);
    fs.writeFileSync(TASKS_FILE_PATH, JSON.stringify(tasks, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true, count: Object.keys(tasks).length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save tasks' }, { status: 500 });
  }
}
