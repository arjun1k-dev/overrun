import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultPath, title, content, tags, category, folder } = body;

    if (!vaultPath || !title || !content) {
      return NextResponse.json(
        { error: 'vaultPath, title, and content are required' },
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

    // Target folder inside vault (e.g. Projects, Areas, Resources, or root)
    const targetFolder = folder ? path.join(resolvedPath, folder) : resolvedPath;

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // Clean title for filename
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim();
    const noteFilePath = path.join(targetFolder, `${safeTitle}.md`);

    const tagsArr = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : [];
    const formattedTags = tagsArr.filter(Boolean);

    const yamlFrontmatter = `---
title: "${title}"
tags: [${formattedTags.join(', ')}]
category: "${category || 'general'}"
createdAt: "${new Date().toISOString()}"
---

`;

    const fullNoteContent = yamlFrontmatter + content.trim() + '\n';

    fs.writeFileSync(noteFilePath, fullNoteContent, 'utf8');

    return NextResponse.json({
      success: true,
      notePath: noteFilePath,
      title: safeTitle,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create Obsidian note' }, { status: 500 });
  }
}
