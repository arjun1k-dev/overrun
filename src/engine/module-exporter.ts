// ============================================================
// OVERRUN — End-to-End Module Context Aggregator & Markdown Exporter
// ============================================================

import { getSubjectFeatureMap, registerCustomFeatureMap, SubjectFeatureMap, FEATURE_MAP_REGISTRY } from './feature-map-registry';

export interface ModuleArtifact {
  id: string;
  title: string;
  type: string;
  source: string;
  filePath: string;
  relativePath: string;
  data: any;
  file: string;
  content?: string;
}

export interface TopicProgressDetail {
  id: string;
  name: string;
  weight: number;
  questionsAsked: number;
  questionsCorrect: number;
  accuracyPct: number;
  status: 'mastered' | 'review' | 'unstudied';
}

export interface ModuleSummaryData {
  code: string;
  title: string;
  icon: string;
  totalQuizzes: number;
  overallMasteryPct: number;
  topicProgressList: TopicProgressDetail[];
  weakConcepts: Array<{ concept: string; quizDate?: string; topic?: string }>;
  masteryState?: any;
  indexMarkdown?: string;
  artifacts: ModuleArtifact[];
  lastUpdated?: string;
}

export const SUBJECT_METADATA: Record<string, { name: string; icon: string; description: string }> = {
  overrun: { name: 'Overrun Project System', icon: '🚀', description: 'Internal system architecture, data models, schema definitions, and workflow engines.' },
  system: { name: 'System Telemetry & Settings', icon: '⚙️', description: 'Runtime state persistence, session logs, goals, and setup instructions.' },
};

const RESERVED_SUBJECT_CODES = new Set([
  'memory', 'imported', 'tutorial', 'markdown_note', 'quiz_result',
  'progress_state', 'feature_map', 'general', 'unknown', 'system',
  'overrun', 'null', 'undefined', 'src', 'components', 'app', 'api',
  'public', 'node_modules', 'plans', '.state', 'state', 'http', 'https', 'local_folder', 'file'
]);

export function isArtifactForSubject(art: ModuleArtifact, targetCode: string): boolean {
  const code = targetCode.toLowerCase();
  if (RESERVED_SUBJECT_CODES.has(code)) {
    if (code === 'system') {
      const pathLower = (art.relativePath || art.filePath || '').toLowerCase();
      return pathLower.includes('.state') || pathLower.endsWith('readme.md') || pathLower.includes('notebook_lm_instructions');
    }
    if (code === 'overrun') {
      const pathLower = (art.relativePath || art.filePath || '').toLowerCase();
      return pathLower.includes('projects/overrun') || pathLower.includes('overrun');
    }
    return false;
  }

  const pathLower = (art.relativePath || art.filePath || '').toLowerCase();
  const fileName = (art.file || '').toLowerCase();
  const data = art.data || {};

  // 1. Explicit data properties
  if (data.subject_code && String(data.subject_code).toLowerCase() === code) return true;
  if (data.subject && String(data.subject).toLowerCase() === code) return true;
  if (data.code && art.type !== 'markdown_note' && String(data.code).toLowerCase() === code) return true;
  if (data.module && String(data.module).toLowerCase() === code) return true;

  // 2. Topic prefix match
  const topicStr = String(data.topic || data.topic_id || '').toLowerCase();
  if (topicStr.startsWith(`${code}_`) || topicStr.startsWith(`${code}:`) || topicStr.startsWith(`${code}-`) || topicStr.startsWith(`${code} `)) {
    return true;
  }

  // 3. Path matching (e.g. dsa/notes.md, assessments/dsa/..., imported/quiz_result_dsa...)
  if (pathLower.startsWith(`${code}/`) || pathLower.includes(`/${code}/`) || pathLower.startsWith(`assessments/${code}`)) return true;
  if (pathLower.includes(`quiz_result_${code}`) || pathLower.includes(`progress_state:${code}`) || pathLower.includes(`progress_state_${code}`)) return true;

  // 4. File name matching
  if (fileName.startsWith(`${code}_`) || fileName.startsWith(`${code}-`) || fileName.includes(`_${code}_`) || fileName.includes(`-${code}-`)) return true;
  if (fileName === `${code}.md` || fileName === `${code}.yaml` || fileName === `${code}.yml`) return true;

  // 5. Feature map match
  if ((art.type === 'feature_map' || data.type === 'feature_map') && (fileName.includes(code) || pathLower.includes(code))) return true;

  return false;
}

export function extractSubjectCodesFromArtifacts(allArtifacts: ModuleArtifact[]): string[] {
  const codes = new Set<string>();

  // 1. Auto-register all feature maps across all artifacts first
  allArtifacts.forEach((art) => {
    if (art.type === 'feature_map' || art.data?.type === 'feature_map') {
      const artCode = (art.data?.code || art.data?.subject_code || art.data?.subject || '').toLowerCase();
      if (artCode && !RESERVED_SUBJECT_CODES.has(artCode)) {
        registerCustomFeatureMap(artCode, art.data);
      }
    }
  });

  // 2. Add all registered feature map codes
  Object.keys(FEATURE_MAP_REGISTRY).forEach((code) => {
    const clean = code.toLowerCase();
    if (!RESERVED_SUBJECT_CODES.has(clean)) {
      codes.add(clean);
    }
  });

  // 3. Scan all artifacts for subject indicators
  allArtifacts.forEach((art) => {
    const data = art.data || {};
    if (data.subject_code) {
      const c = String(data.subject_code).toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c)) codes.add(c);
    }
    if (data.subject) {
      const c = String(data.subject).toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c)) codes.add(c);
    }
    if (data.module) {
      const c = String(data.module).toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c)) codes.add(c);
    }
    if (data.code && art.type !== 'markdown_note') {
      const c = String(data.code).toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c)) codes.add(c);
    }

    const pathLower = (art.relativePath || art.filePath || art.file || '').toLowerCase();

    // Check assessments/<code_folder> or subjects/<code_folder> or modules/<code_folder>
    const folderMatch = pathLower.match(/(?:assessments|subjects|modules)\/([a-z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      const c = folderMatch[1].toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c) && !c.startsWith('_')) {
        codes.add(c);
      }
    }

    // Check quiz_result_<code_or_topic>
    const quizMatch = pathLower.match(/quiz_result_([a-z0-9]+)/);
    if (quizMatch && quizMatch[1]) {
      const c = quizMatch[1].toLowerCase().trim();
      if (!RESERVED_SUBJECT_CODES.has(c)) codes.add(c);
    }

    // Check topic prefix in quiz_result (e.g. "dsa_binary_search")
    if (art.type === 'quiz_result' || art.data?.type === 'quiz_result') {
      const topic = String(data.topic || data.topic_id || '').toLowerCase().trim();
      const prefixMatch = topic.match(/^([a-z0-9]+)[:_]/);
      if (prefixMatch && prefixMatch[1]) {
        const c = prefixMatch[1];
        if (!RESERVED_SUBJECT_CODES.has(c) && c.length >= 2 && c.length <= 12) {
          codes.add(c);
        }
      }
    }
  });

  return Array.from(codes).filter((c) => c && !RESERVED_SUBJECT_CODES.has(c) && c.length <= 20);
}

/**
 * Aggregates all raw knowledge records for a subject code into a single ModuleSummaryData object
 */
export function aggregateModuleData(code: string, allArtifacts: ModuleArtifact[]): ModuleSummaryData {
  const targetCode = code.toLowerCase();
  const meta = SUBJECT_METADATA[targetCode] || { name: targetCode.toUpperCase(), icon: '📁', description: `${targetCode.toUpperCase()} knowledge module.` };

  // Auto-register feature maps
  allArtifacts.forEach((art) => {
    if (art.type === 'feature_map' || art.data?.type === 'feature_map') {
      const artCode = (art.data?.code || art.data?.subject_code || art.data?.subject || '').toLowerCase();
      if (artCode) {
        registerCustomFeatureMap(artCode, art.data);
      }
    }
  });

  // Filter artifacts belonging to this module
  const moduleArtifacts = allArtifacts.filter((art) => {
    if (targetCode === 'system') {
      const pathLower = (art.relativePath || art.filePath || '').toLowerCase();
      return pathLower.includes('.state') || pathLower.endsWith('readme.md') || pathLower.includes('notebook_lm_instructions');
    }
    if (targetCode === 'overrun') {
      const pathLower = (art.relativePath || art.filePath || '').toLowerCase();
      return pathLower.includes('projects/overrun') || pathLower.includes('overrun');
    }

    return isArtifactForSubject(art, targetCode);
  });

  let totalQuizzes = 0;
  let masteryState: any = null;
  let indexMarkdown = '';
  const weakConceptsMap = new Map<string, { concept: string; quizDate?: string; topic?: string }>();
  let lastUpdated = '';

  // Track per-subtopic asked & correct counts
  const topicCountsMap: Record<string, { asked: number; correct: number }> = {};

  // 0. Auto-register any dynamically imported feature_map files for this subject
  moduleArtifacts.forEach((art) => {
    if (art.type === 'feature_map' || art.data?.type === 'feature_map') {
      registerCustomFeatureMap(code, art.data);
    }
  });

  const activeFeatureMap = getSubjectFeatureMap(code);

  moduleArtifacts.forEach((art) => {
    // 1. Quizzes
    if (art.type === 'quiz_result') {
      totalQuizzes++;
      if (art.data?.date) lastUpdated = art.data.date;
      
      const gaps = art.data?.identified_gaps || art.data?.weak_concepts || [];
      if (Array.isArray(gaps)) {
        gaps.forEach((g: string) => {
          weakConceptsMap.set(g.trim().toLowerCase(), {
            concept: g.trim(),
            quizDate: art.data?.date,
            topic: art.data?.topic || meta.name,
          });
        });
      }

      // Process topic_breakdown array if provided by Notebook LM
      if (Array.isArray(art.data?.topic_breakdown) && art.data.topic_breakdown.length > 0) {
        art.data.topic_breakdown.forEach((tb: any) => {
          const tid = (tb.topic_id || '').toLowerCase();
          if (!topicCountsMap[tid]) {
            topicCountsMap[tid] = { asked: 0, correct: 0 };
          }
          topicCountsMap[tid].asked += Number(tb.questions_asked) || 1;
          topicCountsMap[tid].correct += Number(tb.questions_correct) || 0;
        });
      } else {
        // Fallback: attribute global quiz scores to default topics
        const asked = Number(art.data?.questions_total) || 1;
        const correct = Number(art.data?.questions_correct) || 0;
        const defaultTopicId = activeFeatureMap?.features[0]?.id || 'general';
        if (!topicCountsMap[defaultTopicId]) {
          topicCountsMap[defaultTopicId] = { asked: 0, correct: 0 };
        }
        topicCountsMap[defaultTopicId].asked += asked;
        topicCountsMap[defaultTopicId].correct += correct;
      }
    }

    // 2. Progress State
    if (art.type === 'progress_state') {
      masteryState = art.data;
      if (art.data?.concepts_needing_review && Array.isArray(art.data.concepts_needing_review)) {
        art.data.concepts_needing_review.forEach((g: string) => {
          weakConceptsMap.set(g.trim().toLowerCase(), {
            concept: g.trim(),
            topic: meta.name,
          });
        });
      }
    }

    // 3. Index File
    if (art.file?.includes('_Index_') || art.title?.includes('Master Index')) {
      indexMarkdown = art.data?.content || art.data?.description || '';
    }
  });

  // Calculate per-subtopic progress list & weighted module mastery
  const topicProgressList: TopicProgressDetail[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  if (activeFeatureMap && activeFeatureMap.features.length > 0) {
    activeFeatureMap.features.forEach((feat) => {
      const counts = topicCountsMap[feat.id.toLowerCase()] || { asked: 0, correct: 0 };
      const accuracyPct = counts.asked > 0 ? Math.round((counts.correct / counts.asked) * 100) : 0;
      
      let status: 'mastered' | 'review' | 'unstudied' = 'unstudied';
      if (counts.asked > 0) {
        status = accuracyPct >= 75 ? 'mastered' : 'review';
      }

      topicProgressList.push({
        id: feat.id,
        name: feat.name,
        weight: feat.weight,
        questionsAsked: counts.asked,
        questionsCorrect: counts.correct,
        accuracyPct,
        status,
      });

      weightedSum += (feat.weight * accuracyPct);
      totalWeight += feat.weight;
    });
  }

  // Calculate weighted overall mastery percentage (or 0 for unstudied)
  // Prefer explicit progress_after values from quiz results over calculated topic_breakdown
  let overallMasteryPct = 0;

  if (totalQuizzes > 0) {
    // Try to use the most recent explicit progress_after value
    const quizArtifacts = moduleArtifacts.filter(art => art.type === 'quiz_result');
    const latestQuizWithProgress = quizArtifacts
      .filter(art => art.data?.progress_after !== undefined)
      .sort((a, b) => {
        const dateA = new Date(a.data?.date || '1970-01-01').getTime();
        const dateB = new Date(b.data?.date || '1970-01-01').getTime();
        return dateB - dateA; // Most recent first
      })[0];

    if (latestQuizWithProgress?.data?.progress_after !== undefined) {
      overallMasteryPct = Math.round(latestQuizWithProgress.data.progress_after);
    } else if (totalWeight > 0) {
      // Fallback to calculated weighted average from topic_breakdown
      overallMasteryPct = Math.round(weightedSum / totalWeight);
    } else {
      overallMasteryPct = masteryState?.mastery_level || 0;
    }
  } else {
    overallMasteryPct = masteryState?.mastery_level || 0;
  }

  const weakConcepts = Array.from(weakConceptsMap.values());

  return {
    code,
    title: meta.name,
    icon: meta.icon,
    totalQuizzes,
    overallMasteryPct,
    topicProgressList,
    weakConcepts,
    masteryState,
    indexMarkdown,
    artifacts: moduleArtifacts,
    lastUpdated,
  };
}

/**
 * Generates a complete, high-signal Markdown Snapshot for pasting into Notebook LM
 */
export function generateModuleExportMarkdown(summary: ModuleSummaryData): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`---`);
  lines.push(`exported_from: OVERRUN Command Center`);
  lines.push(`module_code: "${summary.code}"`);
  lines.push(`module_title: "${summary.title}"`);
  lines.push(`export_date: "${dateStr}"`);
  lines.push(`overall_mastery_pct: ${summary.overallMasteryPct}`);
  lines.push(`total_quizzes_taken: ${summary.totalQuizzes}`);
  lines.push(`weak_concepts_count: ${summary.weakConcepts.length}`);
  lines.push(`---`);
  lines.push(``);

  lines.push(`# ${summary.icon} OVERRUN Module Snapshot — ${summary.title}`);
  lines.push(`> **Purpose:** Copy & paste this snapshot directly into your dedicated Notebook LM source for **${summary.title}**. It provides Notebook LM with your exact mastery level, weak concepts, and sub-topic breakdown to generate hyper-targeted quizzes.`);
  lines.push(``);

  lines.push(`## 📊 Current Telemetry & Mastery State`);
  lines.push(`- **Weighted Syllabus Mastery:** ${summary.overallMasteryPct}%`);
  lines.push(`- **Quizzes Completed:** ${summary.totalQuizzes}`);
  lines.push(`- **Target Priority:** ${summary.masteryState?.priority || 'MEDIUM'}`);
  lines.push(`- **Recommended Next Focus:** ${summary.masteryState?.next_focus || 'Review foundational concepts & gap areas'}`);
  lines.push(``);

  if (summary.topicProgressList.length > 0) {
    lines.push(`## 📋 Sub-Topic Progress Breakdown (${summary.topicProgressList.length} Topics)`);
    summary.topicProgressList.forEach((t) => {
      const statusSymbol = t.status === 'mastered' ? '🟢' : t.status === 'review' ? '🟡' : '🔴';
      lines.push(`- ${statusSymbol} **${t.name}** (Weight: ${t.weight}%) — Accuracy: ${t.accuracyPct}% (${t.questionsCorrect}/${t.questionsAsked} correct)`);
    });
    lines.push(``);
  }

  if (summary.weakConcepts.length > 0) {
    lines.push(`## ⚠️ Identified Weak Concepts (Needs Practice)`);
    summary.weakConcepts.forEach((item, i) => {
      lines.push(`${i + 1}. **${item.concept}** ${item.quizDate ? `*(Identified on ${item.quizDate})*` : ''}`);
    });
    lines.push(``);
    lines.push(`### 🎯 Prompt for Notebook LM:`);
    lines.push(`\`\`\`text`);
    lines.push(`Generate a 5-question multiple choice practice quiz focusing specifically on these gap areas in ${summary.title}:`);
    summary.weakConcepts.forEach((item) => lines.push(`- ${item.concept}`));
    lines.push(`Include a 'topic_breakdown' array in your YAML quiz_result output matching OVERRUN schema.`);
    lines.push(`\`\`\``);
    lines.push(``);
  } else {
    lines.push(`## ⚠️ Identified Weak Concepts`);
    lines.push(`*No weak concepts logged yet. Complete a quiz in Notebook LM to populate gaps.*`);
    lines.push(``);
  }

  // Quiz History
  const quizArtifacts = summary.artifacts.filter((a) => a.type === 'quiz_result');
  if (quizArtifacts.length > 0) {
    lines.push(`## 📝 Quiz Assessment History`);
    quizArtifacts.forEach((q) => {
      lines.push(`- **[${q.data?.date || 'Date N/A'}] ${q.data?.topic || q.title}** — Score: ${q.data?.questions_correct || 0}/${q.data?.questions_total || 0} (${q.data?.score || 0}%)`);
    });
    lines.push(``);
  }

  // Artifact Inventory
  lines.push(`## 📂 Module File Inventory (${summary.artifacts.length} Items)`);
  summary.artifacts.forEach((art) => {
    lines.push(`- \`[${art.type}]\` **${art.title}** (${art.relativePath || art.file})`);
  });

  return lines.join('\n');
}
