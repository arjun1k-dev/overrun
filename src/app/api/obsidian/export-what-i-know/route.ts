import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultPath, notes = [], goals = [], testResults = [] } = body;

    if (!vaultPath) {
      return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    }

    const resolvedVault = path.resolve(vaultPath);
    if (!fs.existsSync(resolvedVault)) {
      return NextResponse.json({ error: 'Vault path does not exist on local disk' }, { status: 404 });
    }

    const nowStr = new Date().toISOString();
    
    let content = `---
title: OVERRUN Knowledge & Mastery State
type: context
generatedAt: "${nowStr}"
---

# OVERRUN Knowledge Base & Mastery Context (what_i_know.md)

> This document is automatically exported by OVERRUN to serve as context for NotebookLM.
> NotebookLM should read this file to know what topics the user has already covered, what their weak points are, and what tests to generate.

## 🎯 Active Goals & Target Deadlines
`;

    if (goals.length === 0) {
      content += `*(No active goals logged)*\n`;
    } else {
      for (const g of goals) {
        content += `- **${g.title}** (${g.category.toUpperCase()}) | Deadline: ${g.deadline || 'None'}\n`;
        if (g.topics && g.topics.length > 0) {
          content += `  - Topics: ${g.topics.join(', ')}\n`;
        }
      }
    }

    content += `\n## 🧠 Recent Diagnostic Test Scores & Weak Areas\n`;
    if (testResults.length === 0) {
      content += `*(No test results logged yet)*\n`;
    } else {
      for (const tr of testResults) {
        content += `- **${tr.subject} - ${tr.topic}**: **${tr.score}% Accuracy** (${tr.dateTested})\n`;
        if (tr.weakPoints && tr.weakPoints.length > 0) {
          content += `  - ⚠️ Critical Weaknesses: ${tr.weakPoints.join(', ')}\n`;
        }
      }
    }

    content += `\n## 📄 Indexed Obsidian Knowledge Notes\n`;
    if (notes.length === 0) {
      content += `*(No indexed notes)*\n`;
    } else {
      for (const n of notes) {
        const tags = n.tags && n.tags.length > 0 ? ` [${n.tags.map((t: string) => '#' + t).join(' ')}]` : '';
        content += `- **${n.title}**${tags}\n`;
        if (n.summarySnippet) {
          content += `  - Preview: "${n.summarySnippet.slice(0, 150)}..."\n`;
        }
      }
    }

    content += `\n---
## 🤖 NotebookLM System Prompt Instructions for Quiz Generation

When generating a diagnostic test or quiz for this user:
1. Focus heavily on topics flagged under **Critical Weaknesses** (<60% accuracy).
2. Skip basic introductory questions for topics marked with >80% accuracy.
3. Format your output file in strict OVERRUN frontmatter YAML format:

\`\`\`markdown
---
title: <Subject> - <Topic> Test Result
type: testResult
subject: "<Subject>"
topic: "<Topic>"
score: <0-100>
weakPoints: ["<Weakness 1>", "<Weakness 2>"]
dateKey: "${nowStr.slice(0, 10)}"
---

# Test Summary
<Detailed breakdown of questions answered and concepts to revise>
\`\`\`
`;

    const outputPath = path.join(resolvedVault, 'what_i_know.md');
    fs.writeFileSync(outputPath, content, 'utf8');

    return NextResponse.json({
      success: true,
      filePath: outputPath,
      message: `Exported what_i_know.md directly to ${outputPath}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to export what_i_know.md' }, { status: 500 });
  }
}
