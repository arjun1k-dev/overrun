import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSchemaDirectory, SchemaType } from '@/engine/schema-registry';
import { serializeToMarkdown, serializeYaml } from '@/engine/yaml-parser';
import { getSubjectFeatureMap } from '@/engine/feature-map-registry';

const KNOWN_SUBJECT_CODES = ['dsa', 'eca', 'nmcp', 'ss', 'ade', 'fse', 'da', 'eco', 'es'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, rawContent } = body;

    if (!type || (!data && !rawContent)) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const knowledgeDir = path.resolve(process.cwd(), 'knowledge');
    
    // Determine relative directory based on schema type
    let subDir = 'imports';
    if (type === 'quiz_result') {
      const explicitCode = String(data?.subject || data?.code || data?.module || data?.subject_code || '').toLowerCase();
      const topicStr = String(data?.topic || data?.topic_id || '').toLowerCase();
      let moduleFolder = 'general';

      if (KNOWN_SUBJECT_CODES.includes(explicitCode)) {
        moduleFolder = explicitCode;
      } else {
        // Try to match topic against feature maps & keywords for intelligent routing
        let bestMatch: string | null = null;
        let bestMatchScore = 0;

        for (const code of KNOWN_SUBJECT_CODES) {
          if (topicStr.includes(code)) {
            bestMatch = code;
            bestMatchScore = 200;
            break;
          }

          const featureMap = getSubjectFeatureMap(code);
          if (featureMap && featureMap.features.length > 0) {
            let matchScore = 0;
            const cleanTopic = topicStr.replace(/^(circuit quiz:|quiz:|exam:|test:|practice:)\s*/i, '').trim();
            const topicWords = cleanTopic.split(/[^a-z0-9]+/i).filter(w => w.length > 2);

            featureMap.features.forEach(feature => {
              const featureName = feature.name.toLowerCase();
              const featureId = feature.id.toLowerCase();

              if (cleanTopic === featureName || cleanTopic === featureId) {
                matchScore += 100;
              } else if (cleanTopic.includes(featureName) || featureName.includes(cleanTopic)) {
                matchScore += 50;
              } else if (cleanTopic.includes(featureId) || featureId.includes(cleanTopic)) {
                matchScore += 25;
              } else {
                // Word token overlap
                const featureWords = (featureName + ' ' + featureId).split(/[^a-z0-9]+/i).filter(w => w.length > 2);
                let sharedWords = 0;
                topicWords.forEach(tw => {
                  if (featureWords.some(fw => fw.includes(tw) || tw.includes(fw))) {
                    sharedWords++;
                  }
                });
                if (sharedWords > 0) {
                  matchScore += sharedWords * 15;
                }
              }
            });

            if (matchScore > bestMatchScore) {
              bestMatchScore = matchScore;
              bestMatch = code;
            }
          }
        }

        if (bestMatch && bestMatchScore > 0) {
          moduleFolder = bestMatch;
        }
      }

      subDir = `assessments/${moduleFolder}`;
    } else if (type === 'feature_map') {
      // Extract subject code from the feature map data
      const subjectCode = String(data?.code || data?.subject_code || 'general').toLowerCase();
      subDir = `assessments/${subjectCode}`;
    } else if (type === 'study_plan' || type === 'focus_recommendation' || type === 'progress_update') {
      subDir = 'plans';
    } else if (type === 'progress_state') {
      subDir = '.state/progress';
    } else if (type === 'task_state') {
      subDir = '.state/tasks';
    } else if (type === 'goal_state') {
      subDir = '.state/goals';
    } else if (type === 'session_state') {
      subDir = '.state/sessions';
    }

    const targetDir = path.join(knowledgeDir, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Build unique filename
    const topicSlug = (data?.topic || data?.topic_id || data?.id || 'artifact')
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
      
    const dateStr = (data?.date || data?.dateKey || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, '');
    const filename = `${type}_${topicSlug}_${dateStr}.md`;
    const fullPath = path.join(targetDir, filename);

    // Build content: rawContent or formatted Markdown with frontmatter
    let fileContent = rawContent;
    if (!fileContent && data) {
      if (type.endsWith('_state')) {
        fileContent = serializeYaml(data, type as SchemaType);
      } else {
        fileContent = serializeToMarkdown(data, `# ${data.topic || data.title || type}\n\nImported artifact.`, type as SchemaType);
      }
    }

    fs.writeFileSync(fullPath, fileContent, 'utf8');

    return NextResponse.json({
      success: true,
      file: filename,
      path: fullPath,
      relativePath: path.relative(knowledgeDir, fullPath),
    });
  } catch (err: any) {
    console.error('Failed to save knowledge artifact to disk:', err);
    return NextResponse.json({ error: err.message || 'Failed to save artifact' }, { status: 500 });
  }
}
