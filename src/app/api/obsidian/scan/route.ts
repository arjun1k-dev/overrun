import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface NoteSummary {
  path: string;
  title: string;
  tags: string[];
  headings: string[];
  summarySnippet: string;
  lastModified: number;
}

function scanVaultDirectory(dir: string, baseDir: string, results: NoteSummary[] = [], maxFiles = 100) {
  if (results.length >= maxFiles) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxFiles) break;

      // Skip hidden folders like .obsidian, .git
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanVaultDirectory(fullPath, baseDir, results, maxFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf8');

          // Extract tags matching #tag-name
          const tagMatches = content.match(/#[a-zA-Z0-9_-]+/g) || [];
          const uniqueTags = Array.from(new Set(tagMatches.map((t) => t.replace('#', ''))));

          // Extract headings
          const headingMatches = content.match(/^#{1,3}\s+(.+)$/gm) || [];
          const headings = headingMatches.map((h) => h.replace(/^#{1,3}\s+/, '').trim());

          // Clean snippet (remove markdown symbols)
          const cleanSnippet = content
            .replace(/^---[\s\S]*?---/g, '') // remove frontmatter
            .replace(/#[a-zA-Z0-9_-]+/g, '')
            .replace(/[#*`_\[\]]/g, '')
            .trim()
            .slice(0, 200);

          const relativePath = path.relative(baseDir, fullPath);
          const title = entry.name.replace(/\.md$/, '');

          results.push({
            path: relativePath,
            title,
            tags: uniqueTags,
            headings,
            summarySnippet: cleanSnippet,
            lastModified: stats.mtimeMs,
          });
        } catch {
          // ignore unreadable files
        }
      }
    }
  } catch (err: any) {
    throw new Error(`Failed to read directory ${dir}: ${err.message}`);
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultPath, subfolder } = body;

    if (!vaultPath || typeof vaultPath !== 'string') {
      return NextResponse.json({ error: 'Vault path is required' }, { status: 400 });
    }

    const resolvedPath = path.resolve(vaultPath);
    const targetDir = subfolder ? path.join(resolvedPath, subfolder) : resolvedPath;

    if (!fs.existsSync(targetDir)) {
      return NextResponse.json(
        { error: `Target subfolder path does not exist: ${targetDir}` },
        { status: 404 }
      );
    }

    const notes = scanVaultDirectory(targetDir, resolvedPath);

    return NextResponse.json({
      success: true,
      vaultPath: resolvedPath,
      subfolder: subfolder || '',
      totalNotes: notes.length,
      notes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
