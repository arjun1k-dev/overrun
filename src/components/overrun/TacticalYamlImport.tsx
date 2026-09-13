'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle, XCircle, Wand2,
  Download, Upload, Sparkles, AlertTriangle,
  Copy, Trash2, Eye, HelpCircle, ArrowRight,
  BookOpen, Calendar, Target, Activity, ShieldCheck,
  ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { parseYaml } from '@/engine/yaml-parser';
import { transformYaml } from '@/engine/yaml-transformer';
import { YAMLViewer } from '@/components/yaml-viewers/index';
import { useStore } from '@/store/useStore';
import { registerCustomFeatureMap } from '@/engine/feature-map-registry';

interface ImportStage {
  id: 'paste' | 'validate' | 'transform' | 'complete';
  title: string;
  icon: any;
}

const STAGES: ImportStage[] = [
  { id: 'paste', title: 'Paste Content', icon: FileText },
  { id: 'validate', title: 'Validate', icon: CheckCircle },
  { id: 'transform', title: 'Transform & Execute', icon: Wand2 },
  { id: 'complete', title: 'Complete & Navigate', icon: Sparkles }
];

const CATEGORIES = [
  {
    id: 'universal',
    name: 'Universal Auto-Detect',
    description: 'Auto-detects any of the 10 Overrun schemas',
    icon: ShieldCheck,
    color: 'text-tactical-primary border-tactical-primary/30 bg-tactical-primary/10',
  },
  {
    id: 'quiz_result',
    name: 'Assessments & Quizzes',
    description: 'Quiz results from Notebook LM (Updates Mastery Grid)',
    icon: BookOpen,
    color: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  },
  {
    id: 'feature_map',
    name: 'Feature Maps',
    description: 'Subject syllabus weightage maps (Updates Mastery Modules)',
    icon: Target,
    color: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
  },
  {
    id: 'study_plan',
    name: 'Study Plans & Schedules',
    description: 'AI schedules from Notebook LM (Populates Timeline)',
    icon: Calendar,
    color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  },
  {
    id: 'focus_recommendation',
    name: 'Focus Recommendations',
    description: 'AI priority suggestions (Converts to actionable plan)',
    icon: Target,
    color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  },
  {
    id: 'progress_update',
    name: 'Progress Summaries',
    description: 'Session progress updates (Logs mastered concepts)',
    icon: Activity,
    color: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  },
];

const SAMPLE_PRESETS: Record<string, string> = {
  quiz_result: `---
version: "1.0.0"
type: "quiz_result"
topic: "C++ Pointers & Memory Management"
date: "2026-08-25"
questions_correct: 4
questions_total: 5
progress_before: 40
progress_after: 65
identified_gaps:
  - "Dangling pointers after deletion"
  - "Memory leak in dynamic array reallocation"
next_focus: "Smart Pointers (std::unique_ptr)"
confidence: "high"
---

# Quiz Results
Strong grasp of pointer dereferencing. Need review on delete[] syntax.`,

  study_plan: `---
version: "1.0.0"
type: "study_plan"
date: "2026-08-25"
focus_topics:
  - "C++ Pointers & Memory Management"
  - "Data Structures: Linked Lists"
total_time_min: 120
priority: "high"
---

# 2-Hour Actionable Study Plan
- [00:00 - 01:00]: Deep Work on C++ Pointers
- [01:00 - 02:00]: Linked Lists Node Implementation`,

  focus_recommendation: `---
version: "1.0.0"
type: "focus_recommendation"
date: "2026-08-25"
time_available_min: 60
priority_topics:
  - "C++ Pointers & Memory Management"
  - "Data Structures: Linked Lists"
reasoning: "C++ Pointers is a foundational prerequisite with upcoming exam deadline"
---

# Priority Recommendation
Focus 60 minutes on C++ Pointers before starting Linked Lists.`,

  progress_update: `---
version: "1.0.0"
type: "progress_update"
topic: "C++ Pointers & Memory Management"
date: "2026-08-25"
progress_before: 40
progress_after: 65
time_spent_min: 60
concepts_mastered:
  - "Pointer Dereferencing"
  - "Heap Allocation (new/delete)"
concepts_needing_review:
  - "Array Deallocation (delete[])"
next_session_focus: "Smart Pointers (std::unique_ptr)"
quality: "high"
---

# Session Progress Update
Productive 60 min session. Mastered basic pointer operations.`,

  feature_map: `---
version: "1.0.0"
type: "feature_map"
title: "ECA Feature Map"
total_weights: 100
features:
  - id: "basic_concepts"
    name: "Basic Electrical Concepts"
    weight: 15
  - id: "circuit_theorems"
    name: "Network Theorems"
    weight: 20
  - id: "transient_analysis"
    name: "Transient Analysis"
    weight: 15
  - id: "ac_circuits"
    name: "AC Circuits"
    weight: 25
  - id: "two_port_networks"
    name: "Two-Port Networks"
    weight: 10
  - id: "filters"
    name: "Network Synthesis & Filters"
    weight: 15
---

# Electrical Circuit Analysis Feature Map
Subject weightage configuration for ECA module`,
};

const SYSTEM_PROMPT_TEXT = `# SYSTEM PROMPT FOR NOTEBOOK LM

You are an expert AI tutor for OVERRUN. Whenever you output a Quiz Result, Study Plan, Focus Recommendation, or Progress Summary, prepend it with strict YAML frontmatter enclosed in --- delimiters.

Supported types:
1. quiz_result (topic, date, questions_correct, questions_total, progress_before, progress_after, identified_gaps, next_focus, confidence)
2. feature_map (title/code, total_weights, features array with id/name/weight)
3. study_plan (date, focus_topics, total_time_min, priority)
4. focus_recommendation (date, time_available_min, priority_topics, reasoning)
5. progress_update (topic, date, progress_before, progress_after, time_spent_min, concepts_mastered, concepts_needing_review, next_session_focus, quality)

Numbers MUST be plain integers (0-100 for progress). Enums MUST be lowercase ("high", "medium", "low").`;

// Information mapping for the 6 internal/state schemas when pasted into Universal
const STATE_SCHEMA_EXPLANATIONS: Record<string, { title: string; desc: string; usage: string; location: string }> = {
  task_state: {
    title: 'Task Execution State (Internal)',
    desc: 'This is a runtime task execution tracking file.',
    usage: 'Overrun updates this automatically when tasks are started, completed, or skipped on the Timeline grid.',
    location: 'Stored in `knowledge/.state/tasks/`',
  },
  progress_state: {
    title: 'Topic Mastery State (Internal)',
    desc: 'This is an internal topic progress tracking record.',
    usage: 'Rendered inside the Mastery Grid. It is updated automatically when you import `quiz_result` or `progress_update` files.',
    location: 'Stored in `knowledge/.state/progress/`',
  },
  goal_state: {
    title: 'Goal Tracking State (Internal)',
    desc: 'This is a long-term goal completion record.',
    usage: 'Used by the Command Center to track milestones and target completion dates.',
    location: 'Stored in `knowledge/.state/goals/`',
  },
  session_state: {
    title: 'Study Session Log (Internal)',
    desc: 'This is a runtime log of an active study session.',
    usage: 'Created automatically by the system when you start a task timer to track time bank minutes.',
    location: 'Stored in `knowledge/.state/sessions/`',
  },
  task: {
    title: 'Legacy Task File',
    desc: 'This is a legacy Markdown task definition file.',
    usage: 'Overrun can migrate legacy task files into active `task_state` timeline items.',
    location: 'Stored in `knowledge/subjects/`',
  },
  goal: {
    title: 'Legacy Goal File',
    desc: 'This is a legacy Markdown goal definition file.',
    usage: 'Overrun can migrate legacy goal files into active `goal_state` items.',
    location: 'Stored in `knowledge/goals/`',
  },
};

interface TacticalYamlImportProps {
  onNavigate?: (tab: 'dashboard' | 'timeline' | 'mastery' | 'import' | 'knowledge') => void;
}

export function TacticalYamlImport({ onNavigate }: TacticalYamlImportProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('universal');

  const triggerNavigate = (tab: 'dashboard' | 'timeline' | 'mastery' | 'import' | 'knowledge') => {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.dispatchEvent(new CustomEvent('overrun-navigate', { detail: tab }));
    }
  };
  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

  const updateYamlState = useStore((s) => s.updateYamlState);
  const importTasks = useStore((s) => s.importTasks);
  const activeDate = useStore((s) => s.activeDate);

  const handleParse = async () => {
    if (!input.trim()) {
      setError('Please paste YAML content');
      return;
    }

    setIsProcessing(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 500));

    const result = parseYaml(input);

    if (result.success) {
      setParseResult(result);
      setCurrentStage(2); // Move to transform stage
    } else {
      const errorMessages = result.errors.map(e =>
        `${e.path.length > 0 ? e.path.join('.') + ': ' : ''}${e.message}`
      ).join('\n');
      setError(errorMessages);
      setCurrentStage(1);
    }

    setIsProcessing(false);
  };

  const handleTransform = (toType: string) => {
    if (!parseResult?.data || !parseResult?.type) return;

    try {
      // Special handling for feature_map - no transformation needed
      if (parseResult.type === 'feature_map') {
        // 1. Save feature map to disk
        fetch('/api/knowledge/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: parseResult.type,
            data: parseResult.data,
            rawContent: input,
          }),
        }).catch((e) => console.error('Failed to save feature map to disk:', e));

        // 2. Register feature map immediately
        const subjectCode = parseResult.data.subject_code || parseResult.data.code || parseResult.data.title?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
        registerCustomFeatureMap(subjectCode, parseResult.data);

        // 3. Update Zustand state
        updateYamlState(parseResult.type, subjectCode, parseResult.data);

        console.log(`Feature map registered for ${subjectCode}`);
        setCurrentStage(3); // Move to complete stage
        return;
      }

      // 1. Physically save raw imported artifact to disk (e.g. knowledge/assessments/ or knowledge/plans/)
      fetch('/api/knowledge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: parseResult.type,
          data: parseResult.data,
          rawContent: input,
        }),
      }).catch((e) => console.error('Failed to save raw artifact to disk:', e));

      const transformed = transformYaml(parseResult.type, toType, parseResult.data);
      if (transformed) {
        // 2. Physically save transformed state to disk
        fetch('/api/knowledge/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: toType,
            data: transformed,
          }),
        }).catch((e) => console.error('Failed to save transformed state to disk:', e));

        if (toType === 'progress_state') {
          const topicId = transformed.topic_id || parseResult.data.topic || 'general';
          updateYamlState('progress_state', topicId, transformed);
        } else if (toType === 'task_state') {
          if (Array.isArray(transformed)) {
            const tasksToImport = transformed.map((t: any) => ({
              id: t.id,
              task: t.topic_title,
              start: t.scheduled_start ? t.scheduled_start.split(' ')[1] || '09:00' : '09:00',
              end: t.scheduled_end ? t.scheduled_end.split(' ')[1] || '10:00' : '10:00',
              type: (t.task_type === 'DEEP_WORK' ? 'A' : 'B') as any,
              dateKey: activeDate,
              status: 'pending' as any,
              deadline: '',
              rawLine: '',
              isValid: true,
            }));
            importTasks(activeDate, tasksToImport);
          }
        }
      }

      // 3. Update Zustand memory state
      const rawId = parseResult.data.topic_id || parseResult.data.id || parseResult.data.topic || `import-${Date.now()}`;
      updateYamlState(parseResult.type, rawId, parseResult.data);
    } catch (err) {
      console.error('Failed to execute transform:', err);
    }

    setCurrentStage(3); // Move to complete stage
  };

  const loadPreset = (catId: string) => {
    if (SAMPLE_PRESETS[catId]) {
      setInput(SAMPLE_PRESETS[catId]);
      setError(null);
    }
  };

  const copySystemPrompt = () => {
    navigator.clipboard.writeText(SYSTEM_PROMPT_TEXT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const copyInputText = () => {
    navigator.clipboard.writeText(input);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const clearInput = () => {
    setInput('');
    setParseResult(null);
    setError(null);
    setCurrentStage(0);
  };

  const isStateSchema = parseResult?.type && STATE_SCHEMA_EXPLANATIONS[parseResult.type];

  return (
    <div className="space-y-6">
      {/* 🧭 Guided Workflow Banner & System Prompt Quick Copy */}
      <div className="tactical-card p-5 border-l-4 border-l-tactical-primary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tactical-primary/20 border border-tactical-primary flex items-center justify-center text-tactical-primary">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-tactical flex items-center gap-2">
                Tactical Ingestion Workflow Hub
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-tactical-primary/20 text-tactical-primary border border-tactical-primary/30">
                  Notebook LM Sync
                </span>
              </h3>
              <p className="text-xs text-tactical-muted">
                Import AI study plans, quiz scores, or session summaries directly into your Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copySystemPrompt}
              className="px-3 py-1.5 rounded-lg bg-tactical-primary/20 border border-tactical-primary/40 hover:border-tactical-primary text-tactical-primary hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedPrompt ? 'Copied Prompt!' : 'Copy System Prompt'}
            </button>
            <button
              onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
              className="p-1.5 rounded-lg bg-tactical-deep/50 border border-tactical-border hover:border-tactical-primary text-tactical-muted hover:text-tactical transition-all"
            >
              {showWorkflowGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Accordion Walkthrough Guide */}
        <AnimatePresence>
          {showWorkflowGuide && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-tactical-border/50 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
            >
              <div className="p-3 rounded-lg bg-tactical-deep/40 border border-tactical-border">
                <span className="font-mono text-tactical-primary font-bold">STEP 1</span>
                <h4 className="font-semibold text-tactical mt-1">Copy System Prompt</h4>
                <p className="text-tactical-muted text-[11px] mt-0.5">
                  Click 'Copy System Prompt' and paste it into Notebook LM instructions.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-tactical-deep/40 border border-tactical-border">
                <span className="font-mono text-amber-400 font-bold">STEP 2</span>
                <h4 className="font-semibold text-tactical mt-1">Select Category Tab</h4>
                <p className="text-tactical-muted text-[11px] mt-0.5">
                  Choose Quiz, Study Plan, Recommendation, or Universal Auto-Detect below.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-tactical-deep/40 border border-tactical-border">
                <span className="font-mono text-emerald-400 font-bold">STEP 3</span>
                <h4 className="font-semibold text-tactical mt-1">Paste & Validate</h4>
                <p className="text-tactical-muted text-[11px] mt-0.5">
                  Paste Notebook LM's output. Overrun validates Zod schemas in real-time.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-tactical-deep/40 border border-tactical-border">
                <span className="font-mono text-purple-400 font-bold">STEP 4</span>
                <h4 className="font-semibold text-tactical mt-1">Execute & Navigate</h4>
                <p className="text-tactical-muted text-[11px] mt-0.5">
                  Transform payload to update your Mastery Grid or Timeline live!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 📁 Categorized Import Sub-Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                if (currentStage === 0 && !input.trim() && SAMPLE_PRESETS[cat.id]) {
                  setInput(SAMPLE_PRESETS[cat.id]);
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `${cat.color} shadow-lg ring-1 ring-tactical-primary/50`
                  : 'bg-tactical-deep/40 border-tactical-border hover:border-tactical-muted text-tactical-muted hover:text-tactical'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className="w-4 h-4" />
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-tactical-primary animate-pulse" />}
                </div>
                <h4 className="text-xs font-bold">{cat.name}</h4>
                <p className="text-[10px] opacity-80 mt-1 line-clamp-2">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 📥 Main Stage Area */}
      <div className="tactical-card p-6">
        {/* Progress Pipeline Stages */}
        <div className="flex items-center justify-between mb-8">
          {STAGES.map((stage, index) => {
            const status = index < currentStage ? 'completed' : index === currentStage ? 'active' : 'pending';
            const StageIcon = stage.icon;

            return (
              <div key={stage.id} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                      status === 'completed'
                        ? 'bg-tactical-success/20 border-tactical-success text-tactical-success'
                        : status === 'active'
                        ? 'bg-tactical-primary/20 border-tactical-primary text-tactical-primary shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                        : 'bg-tactical-deep/50 border-tactical-border text-tactical-muted'
                    }`}
                  >
                    {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <StageIcon className="w-5 h-5" />}
                  </div>
                  <p
                    className={`text-[11px] font-medium mt-1.5 text-center ${
                      status === 'active'
                        ? 'text-tactical-primary font-bold'
                        : status === 'completed'
                        ? 'text-tactical-success'
                        : 'text-tactical-muted'
                    }`}
                  >
                    {stage.title}
                  </p>
                </div>

                {index < STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-tactical-border relative overflow-hidden">
                    <div
                      className={`absolute h-full bg-tactical-success transition-all duration-500 ${
                        status === 'completed' ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content Stages */}
        <AnimatePresence mode="wait">
          {currentStage === 0 && (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-tactical-deep/30 rounded-lg p-4 border border-tactical-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-tactical-primary" />
                    <h3 className="text-xs font-bold text-tactical uppercase tracking-wider font-mono">
                      Ingest Panel — {CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                    </h3>
                  </div>

                  {SAMPLE_PRESETS[selectedCategory] && (
                    <button
                      onClick={() => loadPreset(selectedCategory)}
                      className="px-2.5 py-1 rounded bg-tactical-primary/10 border border-tactical-primary/30 text-tactical-primary text-[11px] font-mono hover:bg-tactical-primary/20 transition-all"
                    >
                      ⚡ Load Sample Preset
                    </button>
                  )}
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Paste your YAML content or Markdown frontmatter here...\n\nExample:\n---\nversion: "1.0.0"\ntype: "${selectedCategory === 'universal' ? 'quiz_result' : selectedCategory}"\n...`}
                  className="w-full h-52 p-4 text-xs font-mono bg-tactical-deep/60 border border-tactical-border rounded-lg text-tactical placeholder-tactical-muted/40 resize-none focus:border-tactical-primary focus:outline-none transition-colors"
                />

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {input && (
                      <>
                        <button
                          onClick={copyInputText}
                          className="p-2 rounded-lg bg-tactical-deep/50 border border-tactical-border hover:border-tactical-primary text-tactical-muted hover:text-tactical transition-all"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={clearInput}
                          className="p-2 rounded-lg bg-tactical-deep/50 border border-tactical-border hover:border-tactical-danger text-tactical-muted hover:text-tactical-danger transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleParse}
                    disabled={!input.trim() || isProcessing}
                    className="px-6 py-2 bg-tactical-primary text-white rounded-lg font-medium hover:bg-tactical-highlight transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase font-mono tracking-wider shadow-lg"
                  >
                    {isProcessing ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Parse & Validate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStage === 1 && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-tactical-danger/10 rounded-lg p-5 border-2 border-tactical-danger"
            >
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-tactical-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-tactical-danger mb-2">Validation Failed</h4>
                  <pre className="text-xs text-tactical-danger/90 whitespace-pre-wrap font-mono bg-tactical-deep/60 rounded p-3 border border-tactical-danger/20">
                    {error}
                  </pre>
                </div>
                <button
                  onClick={() => setCurrentStage(0)}
                  className="px-3 py-1.5 rounded-lg bg-tactical-deep/60 border border-tactical-border hover:border-tactical-danger text-tactical-muted hover:text-tactical text-xs font-mono"
                >
                  Edit Input
                </button>
              </div>
            </motion.div>
          )}

          {currentStage === 2 && parseResult && (
            <motion.div
              key="transform"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Success Badge */}
              <div className="bg-tactical-success/10 rounded-lg p-4 border-2 border-tactical-success flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-tactical-success" />
                  <div>
                    <h4 className="text-xs font-bold text-tactical-success uppercase font-mono tracking-wider">
                      Valid Schema Detected
                    </h4>
                    <p className="text-xs text-tactical-muted">
                      Type: <span className="font-mono text-tactical-primary font-bold">{parseResult.type}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 💡 HANDLING FOR THE 6 INTERNAL / STATE SCHEMAS IN UNIVERSAL AUTO-DETECT */}
              {isStateSchema ? (
                <div className="bg-tactical-primary/10 rounded-lg p-5 border-2 border-tactical-primary/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-6 h-6 text-tactical-primary" />
                    <div>
                      <h4 className="text-sm font-bold text-tactical-primary">
                        {STATE_SCHEMA_EXPLANATIONS[parseResult.type].title}
                      </h4>
                      <p className="text-xs text-tactical-muted">
                        {STATE_SCHEMA_EXPLANATIONS[parseResult.type].desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-tactical-deep/60 rounded border border-tactical-border text-xs space-y-1 font-mono">
                    <p className="text-tactical-highlight font-semibold">Purpose & Functionality:</p>
                    <p className="text-tactical-muted">{STATE_SCHEMA_EXPLANATIONS[parseResult.type].usage}</p>
                    <p className="text-tactical-muted/70 text-[11px] pt-1">{STATE_SCHEMA_EXPLANATIONS[parseResult.type].location}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleTransform('progress_state')}
                      className="px-4 py-2 bg-tactical-primary text-white rounded-lg text-xs font-bold hover:bg-tactical-highlight transition-all"
                    >
                      Save to Runtime State
                    </button>
                    <button
                      onClick={() => setCurrentStage(0)}
                      className="px-4 py-2 bg-tactical-deep/50 border border-tactical-border hover:border-tactical-primary text-tactical text-xs font-semibold rounded-lg"
                    >
                      Paste Notebook LM Output Instead
                    </button>
                  </div>
                </div>
              ) : (
                /* ⚡ NORMAL TRANSFORMATIONS FOR THE 4 NOTEBOOK LM SCHEMAS */
                <div className="bg-tactical-primary/10 rounded-lg p-5 border-2 border-tactical-primary/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <Wand2 className="w-5 h-5 text-tactical-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-tactical uppercase font-mono tracking-wider">
                        Available Transformations
                      </h4>
                      <p className="text-xs text-tactical-muted">
                        Execute transformation to update your Command Center live
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(parseResult.type === 'quiz_result' || parseResult.type === 'progress_update') && (
                      <button
                        onClick={() => handleTransform('progress_state')}
                        className="p-3.5 bg-tactical-deep/60 border border-tactical-border hover:border-tactical-success transition-all rounded-lg text-left group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-tactical group-hover:text-tactical-success">
                            Update Mastery Grid
                          </p>
                          <ArrowRight className="w-3.5 h-3.5 text-tactical-muted group-hover:text-tactical-success group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-[11px] text-tactical-muted">
                          {parseResult.type} → <span className="font-mono text-tactical-success">progress_state</span>
                        </p>
                      </button>
                    )}

                    {(parseResult.type === 'study_plan' || parseResult.type === 'task') && (
                      <button
                        onClick={() => handleTransform('task_state')}
                        className="p-3.5 bg-tactical-deep/60 border border-tactical-border hover:border-tactical-primary transition-all rounded-lg text-left group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-tactical group-hover:text-tactical-primary">
                            Generate Schedule Tasks
                          </p>
                          <ArrowRight className="w-3.5 h-3.5 text-tactical-muted group-hover:text-tactical-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-[11px] text-tactical-muted">
                          {parseResult.type} → <span className="font-mono text-tactical-primary">task_state</span>
                        </p>
                      </button>
                    )}

                    {parseResult.type === 'focus_recommendation' && (
                      <button
                        onClick={() => handleTransform('study_plan')}
                        className="p-3.5 bg-tactical-deep/60 border border-tactical-border hover:border-cyan-400 transition-all rounded-lg text-left group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-tactical group-hover:text-cyan-400">
                            Convert to Study Plan
                          </p>
                          <ArrowRight className="w-3.5 h-3.5 text-tactical-muted group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-[11px] text-tactical-muted">
                          focus_recommendation → <span className="font-mono text-cyan-400">study_plan</span>
                        </p>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* YAML Live Viewer Preview */}
              <div className="bg-tactical-deep/30 rounded-lg p-4 border border-tactical-border">
                <h4 className="text-xs font-bold text-tactical uppercase font-mono tracking-wider mb-3">
                  Parsed Data Payload Preview
                </h4>
                <YAMLViewer type={parseResult.type} data={parseResult.data} />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStage(0)}
                  className="px-4 py-2 bg-tactical-deep/50 border border-tactical-border hover:border-tactical-primary rounded-lg text-tactical text-xs font-semibold"
                >
                  Import Another
                </button>
              </div>
            </motion.div>
          )}

          {currentStage === 3 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-tactical-success/10 rounded-lg p-8 border-2 border-tactical-success text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-tactical-success/20 flex items-center justify-center mx-auto border border-tactical-success">
                <CheckCircle className="w-8 h-8 text-tactical-success" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-tactical-success">Import & Transformation Successful!</h3>
                <p className="text-xs text-tactical-muted mt-1">
                  Your payload has been executed and updated in the system.
                </p>
              </div>

              {/* 🧭 CONTEXTUAL NEXT-STEPS GUIDANCE & NAVIGATION */}
              <div className="p-4 bg-tactical-deep/60 border border-tactical-border rounded-xl text-left max-w-md mx-auto space-y-3">
                <h4 className="text-xs font-bold text-tactical-highlight uppercase font-mono tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-tactical-success" />
                  Recommended Next Actions
                </h4>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => triggerNavigate('timeline')}
                    className="p-2.5 rounded-lg bg-tactical-primary/10 border border-tactical-primary/30 hover:border-tactical-primary text-tactical-primary text-xs font-semibold flex items-center justify-between group transition-all"
                  >
                    <span>View Scheduled Tasks on Timeline</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={() => triggerNavigate('mastery')}
                    className="p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/30 hover:border-amber-400 text-amber-400 text-xs font-semibold flex items-center justify-between group transition-all"
                  >
                    <span>View Progress in Mastery Grid</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={() => triggerNavigate('knowledge')}
                    className="p-2.5 rounded-lg bg-purple-400/10 border border-purple-400/30 hover:border-purple-400 text-purple-400 text-xs font-semibold flex items-center justify-between group transition-all"
                  >
                    <span>View Vault Artifacts in Knowledge Base</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  clearInput();
                  setCurrentStage(0);
                }}
                className="px-6 py-2 bg-tactical-primary text-white rounded-lg font-bold hover:bg-tactical-highlight text-xs font-mono uppercase tracking-wider"
              >
                Import Another Payload
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}