import { NextResponse } from 'next/server';

export const dynamic = "force-static";
import fs from 'fs';
import path from 'path';
import { parseYaml } from '@/engine/yaml-parser';

function scanKnowledgeDirectory(dir: string, baseDir: string, results: any[] = []) {
  try {
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Ignore system hidden directories, but allow .state directory
      if (entry.name === '.git' || entry.name === '.obsidian' || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        scanKnowledgeDirectory(fullPath, baseDir, results);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.md'))
      ) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const parsed = parseYaml(content);

          if (parsed.success) {
            results.push({
              file: entry.name,
              path: fullPath,
              relativePath,
              type: parsed.type,
              data: parsed.data,
              source: parsed.source,
            });
          } else if (entry.name.endsWith('.md')) {
            // Extract title for markdown notes that don't have an explicit schema type
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1].trim() : entry.name.replace(/\.md$/, '');
            results.push({
              file: entry.name,
              path: fullPath,
              relativePath,
              type: 'markdown_note',
              data: {
                title,
                contentSnippet: content.slice(0, 300),
              },
              source: 'markdown',
            });
          }
        } catch {
          // ignore invalid files
        }
      }
    }
  } catch (err: any) {
    console.error('Error scanning Knowledge dir:', err);
  }
  return results;
}

export async function GET() {
  try {
    const knowledgeDir = path.resolve(process.cwd(), 'knowledge');
    const records = scanKnowledgeDirectory(knowledgeDir, knowledgeDir);

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to scan knowledge' }, { status: 500 });
  }
}
