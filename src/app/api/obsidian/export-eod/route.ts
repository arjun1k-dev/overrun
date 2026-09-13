import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultPath, dateKey, summary, completedTasks } = body;

    if (!vaultPath || !dateKey || !summary) {
      return NextResponse.json(
        { error: 'vaultPath, dateKey, and summary are required' },
        { status: 400 }
      );
    }

    const resolvedPath = path.resolve(vaultPath);

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `Vault path does not exist: ${resolvedPath}` },
        { status: 404 }
      );
    }

    // Default to 'Daily Notes' subfolder if exists, else root of vault
    const dailyNotesFolder = path.join(resolvedPath, 'Daily Notes');
    const targetFolder = fs.existsSync(dailyNotesFolder) ? dailyNotesFolder : resolvedPath;

    const noteFileName = `${dateKey}.md`;
    const noteFilePath = path.join(targetFolder, noteFileName);

    const taskListMd = Array.isArray(completedTasks) && completedTasks.length > 0
      ? completedTasks.map((t: string) => `- [x] ${t}`).join('\n')
      : '- No tasks recorded';

    const noteContent = `---
type: overrun-eod
date: ${dateKey}
tags: [overrun, daily-log, study-summary]
---

# 🚀 OVERRUN EOD Summary — ${dateKey}

## Completed Tasks
${taskListMd}

## AI Summary & Progress
${summary}

---
*Logged automatically from OVERRUN Tactical Scheduler on ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(noteFilePath, noteContent, 'utf8');

    return NextResponse.json({
      success: true,
      filePath: noteFilePath,
      dateKey,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to export EOD' }, { status: 500 });
  }
}
