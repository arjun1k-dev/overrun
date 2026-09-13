import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { parseYaml, serializeYaml, serializeToMarkdown } from '../src/engine/yaml-parser';
import { validateSchema } from '../src/engine/schema-registry';
import { aggregateModuleData, generateModuleExportMarkdown, SUBJECT_METADATA } from '../src/engine/module-exporter';

const SUBJECT_CODES = ['dsa', 'eca', 'nmcp', 'ss', 'ade', 'fse', 'da', 'eco', 'es'];

describe('🛡️ OVERRUN System Integrity Test Suite', () => {
  
  // 1. Schema Validation Tests
  describe('1. Schema Registry Validation', () => {
    test('Validates quiz_result schema structure with optional topic_breakdown', () => {
      const quizSample = {
        version: '1.0.0',
        type: 'quiz_result',
        topic: 'Data Structures & Algorithms',
        date: '2026-08-25',
        questions_correct: 4,
        questions_total: 5,
        topic_breakdown: [
          { topic_id: 'arrays_strings_patterns', questions_asked: 3, questions_correct: 3 },
          { topic_id: 'binary_search', questions_asked: 2, questions_correct: 1 },
        ],
        identified_gaps: ['Binary Search recurrence'],
      };
      const res = validateSchema('quiz_result', quizSample);
      expect(res.success).toBe(true);
      expect(res.errors).toBeUndefined();
    });

    test('Validates progress_state schema structure', () => {
      const progressSample = {
        version: '1.0.0',
        type: 'progress_state',
        topic_id: 'dsa_basics',
        topic_title: 'DSA Basics',
        mastery_level: 67,
        confidence: 'medium',
        concepts_mastered: ['Array indexing'],
        concepts_needing_review: ['DFS stack space complexity'],
      };
      const res = validateSchema('progress_state', progressSample);
      expect(res.success).toBe(true);
      expect(res.errors).toBeUndefined();
    });
  });

  // 2. YAML Parser Round-Trip Serialization
  describe('2. YAML Parser & Serializer Round-Trip Integrity', () => {
    test('Parses frontmatter Markdown into valid structured object', () => {
      const mdContent = `---
version: "1.0.0"
type: "quiz_result"
topic: "C++ Pointers"
date: "2026-08-25"
questions_correct: 5
questions_total: 5
---
# Quiz Notes
Perfect score on dereferencing.`;

      const result: any = parseYaml(mdContent);
      expect(result.success).toBe(true);
      expect(result.type).toBe('quiz_result');
      expect(result.data?.topic).toBe('C++ Pointers');
      expect(result.data?.questions_correct).toBe(5);
    });

    test('Serializes YAML object back to valid frontmatter Markdown string', () => {
      const data = {
        version: '1.0.0',
        type: 'study_plan',
        date: '2026-08-25',
        focus_topics: ['Graph Traversals'],
        total_time_min: 120,
      };
      const mdString = serializeToMarkdown(data as any, '# Study Plan\nGraph focus.', 'study_plan');
      expect(mdString).toContain('type: study_plan');
      expect(mdString).toContain('total_time_min: 120');

      // Re-parse serialized output
      const reParsed: any = parseYaml(mdString);
      expect(reParsed.success).toBe(true);
      expect(reParsed.data?.total_time_min).toBe(120);
    });
  });

  // 3. Obsidian Vault File Integrity
  describe('3. Obsidian Vault File System Integrity', () => {
    test('Verifies knowledge root directory exists', () => {
      const knowledgePath = path.resolve(process.cwd(), 'knowledge');
      expect(fs.existsSync(knowledgePath)).toBe(true);
    });

    test('Verifies all 9 subject module index files exist on disk in assessments/', () => {
      const knowledgePath = path.resolve(process.cwd(), 'knowledge/assessments');
      SUBJECT_CODES.forEach((code) => {
        const indexFile = path.join(knowledgePath, code, `_Index_${code.toUpperCase()}.md`);
        expect(fs.existsSync(indexFile)).toBe(true);
        
        const content = fs.readFileSync(indexFile, 'utf8');
        expect(content).toContain('tags:');
        expect(content).toContain(`- ${code}`);
      });
    });

    test('Verifies OVERRUN project brain documentation files exist', () => {
      const hubFile = path.resolve(process.cwd(), 'knowledge/projects/overrun/🏠 Overrun Hub.md');
      expect(fs.existsSync(hubFile)).toBe(true);

      const engineFile = path.resolve(process.cwd(), 'knowledge/projects/overrun/Engine/Module Exporter & Aggregator.md');
      expect(fs.existsSync(engineFile)).toBe(true);
    });
  });

  // 4. Module Exporter Engine Integrity
  describe('4. Module Exporter & Aggregator Engine', () => {
    test('Aggregates telemetry, computes sub-topic accuracy & weighted mastery cleanly', () => {
      const mockArtifacts = [
        {
          id: '1',
          title: 'DSA Quiz 1',
          type: 'quiz_result',
          source: 'assessments/dsa/quiz1.md',
          filePath: '/knowledge/assessments/dsa/quiz1.md',
          relativePath: 'assessments/dsa/quiz1.md',
          file: 'quiz1.md',
          data: {
            topic: 'Data Structures & Algorithms',
            date: '2026-08-25',
            questions_correct: 4,
            questions_total: 5,
            topic_breakdown: [
              { topic_id: 'arrays_strings_patterns', questions_asked: 3, questions_correct: 3 },
              { topic_id: 'binary_search', questions_asked: 2, questions_correct: 1 },
            ],
            identified_gaps: ['DFS stack space', 'Binary Search recurrence'],
          },
        },
      ];

      const summary = aggregateModuleData('dsa', mockArtifacts as any);
      expect(summary.code).toBe('dsa');
      expect(summary.totalQuizzes).toBe(1);
      
      // Check sub-topic progress items
      expect(summary.topicProgressList.length).toBe(20);
      const arrayTopic = summary.topicProgressList.find(t => t.id === 'arrays_strings_patterns');
      expect(arrayTopic?.accuracyPct).toBe(100);
      expect(arrayTopic?.questionsCorrect).toBe(3);

      const bsTopic = summary.topicProgressList.find(t => t.id === 'binary_search');
      expect(bsTopic?.accuracyPct).toBe(50);
      expect(bsTopic?.questionsCorrect).toBe(1);

      // Generate Notebook LM export markdown
      const exportMd = generateModuleExportMarkdown(summary);
      expect(exportMd).toContain('module_code: "dsa"');
      expect(exportMd).toContain('DFS stack space');
      expect(exportMd).toContain('Sub-Topic Progress Breakdown');
    });
  });
});
