import { NextResponse } from 'next/server';

export const dynamic = "force-static";
import fs from 'fs';
import path from 'path';
import { getSchemaDirectory, SchemaType } from '@/engine/schema-registry';
import { serializeToMarkdown, serializeYaml } from '@/engine/yaml-parser';
import { getSubjectFeatureMap, FEATURE_MAP_REGISTRY } from '@/engine/feature-map-registry';

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
      const topicStr = String(data?.topic || data?.topic_id || '').toLowerCase();
      let moduleFolder = 'general';

      // Try to match topic against feature maps for intelligent routing
      let bestMatch: string | null = null;
      let bestMatchScore = 0;

      const registeredCodes = Object.keys(FEATURE_MAP_REGISTRY);
      for (const code of registeredCodes) {
        const featureMap = getSubjectFeatureMap(code);
        if (featureMap && featureMap.features.length > 0) {
          // Score this subject based on how well the topic matches its features
          let matchScore = 0;
          featureMap.features.forEach(feature => {
            const featureName = feature.name.toLowerCase();
            const featureId = feature.id.toLowerCase();

            // Clean topic string by removing common prefixes
            const cleanTopic = topicStr.replace(/^(circuit quiz:|quiz:|exam:|test:|practice:)\s*/i, '').trim();

            // Exact matches get highest score
            if (cleanTopic === featureName || cleanTopic === featureId) {
              matchScore += 100;
            }
            // Contains matches get medium score (check both directions)
            else if (cleanTopic.includes(featureName) || featureName.includes(cleanTopic)) {
              matchScore += 50;
            }
            // Partial ID matches get low score
            else if (cleanTopic.includes(featureId) || featureId.includes(cleanTopic)) {
              matchScore += 25;
            }
            // Check for key terms in topic
            else if (featureName.split('&').some((term: string) => cleanTopic.includes(term.trim()))) {
              matchScore += 30;
            }
          });

          if (matchScore > bestMatchScore) {
            bestMatchScore = matchScore;
            bestMatch = code;
          }
        }
      }

      if (bestMatch && bestMatchScore >= 50) {
        moduleFolder = bestMatch;
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
