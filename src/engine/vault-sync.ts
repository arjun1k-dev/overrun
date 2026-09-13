import fs from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface FrontmatterData {
  title?: string;
  type?: string;
  dateKey?: string;
  start?: string;
  end?: string;
  taskType?: string;
  tags?: string[];
  status?: string;
  deadline?: string;
  category?: string;
  topics?: string[] | string;
  description?: string;
  score?: number | string;
  weakPoints?: string[] | string;
}

function parseFrontmatter(content: string): { data: FrontmatterData; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = match[2];
  const data: Record<string, any> = {};

  const lines = yamlStr.split('\n');
  for (const line of lines) {
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (!kvMatch) continue;

    const [, key, rawVal] = kvMatch;
    let val: any = rawVal.trim().replace(/^["']|["']$/g, '');

    // Parse array syntax: [tag1, tag2]
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
    }

    data[key] = val;
  }

  return { data, body };
}

export async function syncVaultToDatabase(vaultPath: string, subfolder = '') {
  const targetDir = path.resolve(vaultPath, subfolder);

  if (!fs.existsSync(targetDir)) {
    console.error(`[SYNC] Vault path does not exist: ${targetDir}`);
    return { success: false, error: 'Path not found' };
  }

  console.log(`[SYNC] Scanning vault at: ${targetDir}`);

  let tasksSynced = 0;
  let goalsSynced = 0;
  const files = fs.readdirSync(targetDir, { recursive: true }) as string[];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const fullPath = path.join(targetDir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { data, body } = parseFrontmatter(content);

      // 1. Check if note is marked as type: goal
      if (data.type === 'goal' || data.category || data.deadline) {
        const title = data.title || path.basename(file, '.md');
        const goalId = `goal-obsidian-${title.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const topicsStr = Array.isArray(data.topics) ? data.topics.join(', ') : data.topics || '';
        const description = body.trim().slice(0, 300);

        await (prisma as any).goal.upsert({
          where: { id: goalId },
          update: {
            title,
            description,
            deadline: data.deadline || null,
            category: data.category || 'exam',
            topics: topicsStr,
            status: data.status || 'active',
          },
          create: {
            id: goalId,
            title,
            description,
            deadline: data.deadline || null,
            category: data.category || 'exam',
            topics: topicsStr,
            status: data.status || 'active',
          },
        });

        goalsSynced++;
      }

      // 2. Check if note is marked as type: testResult
      if (data.type === 'testResult' || data.score !== undefined) {
        const title = data.title || path.basename(file, '.md');
        const goalId = `test-${title.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const topicsStr = Array.isArray(data.weakPoints) ? data.weakPoints.join(', ') : data.weakPoints || '';
        const description = `NotebookLM Test Result: ${data.score || 0}% Accuracy. Weaknesses: ${topicsStr}`;

        await (prisma as any).goal.upsert({
          where: { id: goalId },
          update: {
            title: `[Test Result] ${title} (${data.score || 0}%)`,
            description,
            category: 'exam',
            topics: topicsStr,
            status: Number(data.score) >= 70 ? 'completed' : 'active',
          },
          create: {
            id: goalId,
            title: `[Test Result] ${title} (${data.score || 0}%)`,
            description,
            category: 'exam',
            topics: topicsStr,
            status: Number(data.score) >= 70 ? 'completed' : 'active',
          },
        });

        goalsSynced++;
      }

      // 3. Check if note is marked as type: task
      if (data.type === 'task' || data.dateKey || data.start) {
        const title = data.title || path.basename(file, '.md');
        const dateKey = data.dateKey || new Date().toISOString().slice(0, 10);
        const start = data.start || '09:00';
        const end = data.end || '10:30';
        const taskType = (data.taskType || 'A').toUpperCase();
        const status = data.status || 'pending';

        const taskId = `obsidian-${dateKey}-${start.replace(':', '')}-${title.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        await (prisma as any).task.upsert({
          where: { id: taskId },
          update: {
            dateKey,
            start,
            end,
            type: taskType,
            task: title,
            status,
            rawLine: content.slice(0, 200),
          },
          create: {
            id: taskId,
            dateKey,
            start,
            end,
            type: taskType,
            task: title,
            status,
            rawLine: content.slice(0, 200),
          },
        });

        tasksSynced++;
      }
    } catch (err: any) {
      console.warn(`[SYNC] Skipped ${file}: ${err.message}`);
    }
  }

  // ---- HIERARCHICAL YAML MANIFEST SYNC ----
  let subjectsSynced = 0;
  for (const file of files) {
    if (file.endsWith('index_manifest.yaml') || file.endsWith('index_manifest.yml')) {
      const fullPath = path.join(targetDir, file);
      try {
        const rawYaml = fs.readFileSync(fullPath, 'utf8');
        const manifest: any = yaml.load(rawYaml);

        if (manifest && manifest.subject_name) {
          const subjectDir = path.dirname(fullPath);
          const subjectName = manifest.subject_name;
          const subjectId = `subj-${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

          let totalSubScore = 0;
          let totalWeight = 0;

          const subject = await (prisma as any).subject.upsert({
            where: { name: subjectName },
            update: {
              category: manifest.category || 'exam',
              deadline: manifest.deadline || null,
              targetScore: Number(manifest.target_score) || 100,
            },
            create: {
              id: subjectId,
              name: subjectName,
              category: manifest.category || 'exam',
              deadline: manifest.deadline || null,
              targetScore: Number(manifest.target_score) || 100,
              overallScore: 0,
            },
          });

          // Sync Submodules listed in index_manifest
          if (Array.isArray(manifest.submodules)) {
            for (const sub of manifest.submodules) {
              const subPath = path.join(subjectDir, sub.path || '');
              let subScore = 0;

              const subModuleId = `sub-${subjectId}-${sub.id || path.basename(sub.path, '.yaml')}`;

              if (fs.existsSync(subPath)) {
                const subYamlRaw = fs.readFileSync(subPath, 'utf8');
                const tracker: any = yaml.load(subYamlRaw);

                if (tracker) {
                  subScore = Number(tracker.overall_mastery) || 0;

                  const subModule = await (prisma as any).subModule.upsert({
                    where: { id: subModuleId },
                    update: {
                      title: tracker.topic_title || sub.title,
                      weight: Number(sub.weight) || 1.0,
                      overallScore: subScore,
                      relPath: sub.path,
                    },
                    create: {
                      id: subModuleId,
                      subjectId: subject.id,
                      title: tracker.topic_title || sub.title,
                      weight: Number(sub.weight) || 1.0,
                      overallScore: subScore,
                      relPath: sub.path,
                    },
                  });

                  // Sync Concept progress items
                  if (Array.isArray(tracker.concepts)) {
                    for (const c of tracker.concepts) {
                      const conceptId = `concept-${subModuleId}-${c.concept.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                      await (prisma as any).conceptProgress.upsert({
                        where: { id: conceptId },
                        update: {
                          score: Number(c.score) || 0,
                          status: c.status || 'needs_revision',
                          weakPoints: JSON.stringify(c.weak_points || []),
                          linkedNotes: JSON.stringify(tracker.linked_knowledge_notes || []),
                          lastEvaluated: tracker.last_evaluated || null,
                        },
                        create: {
                          id: conceptId,
                          subModuleId: subModule.id,
                          concept: c.concept,
                          score: Number(c.score) || 0,
                          status: c.status || 'needs_revision',
                          weakPoints: JSON.stringify(c.weak_points || []),
                          linkedNotes: JSON.stringify(tracker.linked_knowledge_notes || []),
                          lastEvaluated: tracker.last_evaluated || null,
                        },
                      });
                    }
                  }
                }
              }

              totalSubScore += subScore * (Number(sub.weight) || 1.0);
              totalWeight += Number(sub.weight) || 1.0;
            }
          }

          const finalOverallScore = totalWeight > 0 ? Math.round(totalSubScore / totalWeight) : 0;
          await (prisma as any).subject.update({
            where: { id: subject.id },
            data: { overallScore: finalOverallScore },
          });

          subjectsSynced++;
        }
      } catch (err: any) {
        console.warn(`[SYNC] Skipped manifest ${file}: ${err.message}`);
      }
    }
  }

  console.log(`[SYNC] Completed! Synced ${tasksSynced} tasks, ${goalsSynced} goals & ${subjectsSynced} subject manifests into SQLite db/custom.db (0 LLM Tokens used).`);
  return { success: true, tasksSynced, goalsSynced, subjectsSynced };
}
