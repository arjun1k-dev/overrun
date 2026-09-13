// ============================================================
// OVERRUN — Multi-Schema YAML Registry
// ============================================================
// Resilient Zod-based schema validation for all 10 YAML types
// Automatically handles case sensitivity, number coercion, flexible dates, and optional arrays

import { z } from 'zod';

// ============================================================
// Resilient Preprocessors & Field Schemas
// ============================================================

const PrioritySchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.enum(["HIGH", "MEDIUM", "LOW"])
).default("MEDIUM");

const PriorityLowercaseSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(["low", "medium", "high"])
).default("medium");

const ConfidenceSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(["low", "medium", "high"])
).default("medium");

const TrendSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(["improving", "stable", "declining"])
).default("stable");

const CategorySchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toLowerCase() : val),
  z.enum(["exam", "skill", "project", "internship", "other"])
).default("skill");

const TaskTypeSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.enum(["DEEP_WORK", "REVIEW", "CHORE"])
).default("CHORE");

const IntSchema = z.preprocess(
  (val) => (val !== undefined && val !== null && val !== '' ? Math.round(Number(val)) : 0),
  z.number().int().min(0)
).default(0);

const MasterySchema = z.preprocess(
  (val) => (val !== undefined && val !== null && val !== '' ? Math.min(100, Math.max(0, Math.round(Number(val)))) : 0),
  z.number().int().min(0).max(100)
).default(0);

const StringArraySchema = z.preprocess(
  (val) => (Array.isArray(val) ? val.map(String) : typeof val === 'string' && val.trim() ? [val.trim()] : []),
  z.array(z.string())
).default([]);

const FlexibleDateSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const match = val.match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val || '');
  },
  z.string().min(1, "Date format required (YYYY-MM-DD)")
);

const FlexibleDateTimeSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const clean = val.replace('T', ' ');
      const match = clean.match(/\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?/);
      if (match) return match[0];
    }
    if (val instanceof Date) return val.toISOString().slice(0, 16).replace('T', ' ');
    return String(val || '');
  },
  z.string().min(1, "DateTime format required")
);

const IDSchema = z.preprocess(
  (val) => String(val || '').trim(),
  z.string().min(1, "ID cannot be empty")
);

const VersionSchema = z.string().default("1.0.0");

// ============================================================
// STATE SCHEMAS (Pure YAML in .state/ directory)
// ============================================================

export const TaskStateSchema = z.object({
  version: VersionSchema,
  type: z.literal("task_state"),
  id: IDSchema,
  topic_id: IDSchema,
  topic_title: z.string().default("Untitled Topic"),
  scheduled_start: FlexibleDateTimeSchema,
  scheduled_end: FlexibleDateTimeSchema,
  actual_start: FlexibleDateTimeSchema.optional(),
  actual_end: FlexibleDateTimeSchema.optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped", "overtime"]).default("pending"),
  quality_rating: IntSchema.optional(),
  notes: z.string().optional(),
  priority: PrioritySchema,
  task_type: TaskTypeSchema,
  time_remaining_min: IntSchema,
  estimated_difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  created_at: FlexibleDateTimeSchema.optional(),
  updated_at: FlexibleDateTimeSchema.optional(),
});

export type TaskState = z.infer<typeof TaskStateSchema>;

export const SubtopicMasterySchema = z.object({
  concept: z.string(),
  score: MasterySchema,
  status: z.enum(["mastered", "in_progress", "needs_review", "not_started"]),
  last_quizzed: FlexibleDateSchema.optional(),
});

export const QuizHistoryEntrySchema = z.object({
  date: FlexibleDateSchema,
  overall_score: MasterySchema,
  subtopics: z.array(z.object({
    concept: z.string(),
    score: MasterySchema,
  })).optional(),
});

export const ProgressStateSchema = z.object({
  version: VersionSchema,
  type: z.literal("progress_state"),
  topic_id: IDSchema,
  topic_title: z.string().default("Untitled Topic"),
  mastery_level: MasterySchema,
  last_updated: FlexibleDateTimeSchema.optional(),
  confidence: ConfidenceSchema,
  concepts_mastered: StringArraySchema,
  concepts_needing_review: StringArraySchema,
  next_focus: z.string().optional(),
  trend: TrendSchema,
  last_studied_human: z.string().default("Just now"),
  study_count: IntSchema,
  total_time_spent_min: IntSchema,
  concept_breakdown: z.object({
    total: IntSchema,
    mastered: IntSchema,
    in_progress: IntSchema,
    not_started: IntSchema,
  }).optional(),
  // NEW: Subtopic breakdown tracking
  subtopic_mastery: z.array(SubtopicMasterySchema).optional(),
  quiz_history: z.array(QuizHistoryEntrySchema).optional(),
  category: CategorySchema,
  priority: PrioritySchema,
  created_at: FlexibleDateTimeSchema.optional(),
  updated_at: FlexibleDateTimeSchema.optional(),
});

export type ProgressState = z.infer<typeof ProgressStateSchema>;

export const SubGoalSchema = z.object({
  id: z.string(),
  title: z.string().default("Untitled Step"),
  completed: z.boolean().default(false),
  targetDate: FlexibleDateSchema.optional(),
  completedAt: z.number().optional(),
});

export type SubGoalSchemaType = z.infer<typeof SubGoalSchema>;

export const GoalStateSchema = z.object({
  version: VersionSchema,
  type: z.literal("goal_state"),
  goal_id: IDSchema,
  goal_title: z.string().default("Untitled Goal"),
  category: CategorySchema,
  target_completion: FlexibleDateSchema,
  current_progress: MasterySchema,
  milestones_completed: IntSchema,
  milestones_total: IntSchema,
  status: z.enum(["active", "completed", "archived"]).default("active"),
  priority: PrioritySchema,
  days_remaining: IntSchema.optional(),
  urgency_score: MasterySchema.optional(),
  related_topics: StringArraySchema.optional(),
  subgoals: z.array(SubGoalSchema).optional().default([]),
  created_at: FlexibleDateTimeSchema.optional(),
  updated_at: FlexibleDateTimeSchema.optional(),
});

export type GoalState = z.infer<typeof GoalStateSchema>;

export const SessionStateSchema = z.object({
  version: VersionSchema,
  type: z.literal("session_state"),
  session_id: IDSchema,
  topic_id: IDSchema,
  start_time: FlexibleDateTimeSchema,
  end_time: FlexibleDateTimeSchema.optional(),
  duration_min: IntSchema.optional(),
  tasks_completed: IntSchema,
  quality: ConfidenceSchema,
  notes: z.string().optional(),
  created_at: FlexibleDateTimeSchema.optional(),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

// ============================================================
// KNOWLEDGE CONTENT SCHEMAS (MD with YAML frontmatter)
// Notebook LM Friendly
// ============================================================

export const TopicScoreBreakdownSchema = z.object({
  topic_id: z.string(),
  questions_asked: IntSchema,
  questions_correct: IntSchema,
});

export const QuizResultSchema = z.object({
  version: VersionSchema,
  type: z.literal("quiz_result"),
  topic: z.string().default("General Topic"),
  date: FlexibleDateSchema,
  questions_correct: IntSchema,
  questions_total: IntSchema,
  topic_breakdown: z.array(TopicScoreBreakdownSchema).optional(),
  progress_before: MasterySchema,
  progress_after: MasterySchema,
  identified_gaps: StringArraySchema,
  next_focus: z.string().default(""),
  confidence: ConfidenceSchema,
});

export type QuizResult = z.infer<typeof QuizResultSchema>;

export const StudyPlanSchema = z.object({
  version: VersionSchema,
  type: z.literal("study_plan"),
  date: FlexibleDateSchema,
  focus_topics: StringArraySchema,
  total_time_min: IntSchema,
  priority: PriorityLowercaseSchema,
  created_at: FlexibleDateSchema.optional(),
});

export type StudyPlan = z.infer<typeof StudyPlanSchema>;

export const FocusRecommendationSchema = z.object({
  version: VersionSchema,
  type: z.literal("focus_recommendation"),
  date: FlexibleDateSchema,
  time_available_min: IntSchema,
  priority_topics: StringArraySchema,
  reasoning: z.string().default("AI-generated focus area recommendation"),
  created_at: FlexibleDateSchema.optional(),
});

export type FocusRecommendation = z.infer<typeof FocusRecommendationSchema>;

export const ProgressUpdateSchema = z.object({
  version: VersionSchema,
  type: z.literal("progress_update"),
  topic: z.string().default("General Topic"),
  date: FlexibleDateSchema,
  progress_before: MasterySchema,
  progress_after: MasterySchema,
  time_spent_min: IntSchema,
  concepts_mastered: StringArraySchema,
  concepts_needing_review: StringArraySchema,
  next_session_focus: z.string().default(""),
  quality: ConfidenceSchema,
  created_at: FlexibleDateSchema.optional(),
});

export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;

export const FeatureTopicSchema = z.object({
  id: z.string(),
  name: z.string(),
  weight: IntSchema,
});

export const FeatureMapSchema = z.object({
  version: VersionSchema,
  type: z.literal("feature_map"),
  subject_code: z.string().optional(),
  code: z.string().optional(),
  title: z.string().default("Subject Feature Map"),
  total_weights: IntSchema.optional(),
  features: z.array(FeatureTopicSchema).default([]),
});

export type FeatureMap = z.infer<typeof FeatureMapSchema>;

// ============================================================
// LEGACY SCHEMAS
// ============================================================

export const TaskSchema = z.object({
  version: VersionSchema.optional(),
  type: z.literal("task"),
  title: z.string().default("Untitled Task"),
  dateKey: FlexibleDateSchema,
  start: z.string().default("09:00"),
  end: z.string().default("10:00"),
  taskType: z.preprocess((val) => String(val || 'A').toUpperCase(), z.enum(["A", "B", "C"])).default("A"),
  tags: StringArraySchema,
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
  progress: MasterySchema.optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export const GoalSchema = z.object({
  version: VersionSchema.optional(),
  type: z.literal("goal"),
  title: z.string().default("Untitled Goal"),
  category: CategorySchema,
  deadline: FlexibleDateSchema,
  status: z.enum(["active", "completed", "archived"]).default("active"),
  topics: StringArraySchema,
  subgoals: z.array(SubGoalSchema).optional().default([]),
});

export type Goal = z.infer<typeof GoalSchema>;

// ============================================================
// SCHEMA REGISTRY
// ============================================================

export const SCHEMA_REGISTRY = {
  task_state: {
    schema: TaskStateSchema,
    description: "Runtime task execution state",
    copyPasteFriendly: false,
    directory: ".state/tasks/",
  },
  progress_state: {
    schema: ProgressStateSchema,
    description: "Per-topic mastery progress state",
    copyPasteFriendly: false,
    directory: ".state/progress/",
  },
  goal_state: {
    schema: GoalStateSchema,
    description: "Goal completion tracking state",
    copyPasteFriendly: false,
    directory: ".state/goals/",
  },
  session_state: {
    schema: SessionStateSchema,
    description: "Study session logging state",
    copyPasteFriendly: false,
    directory: ".state/sessions/",
  },
  quiz_result: {
    schema: QuizResultSchema,
    description: "Quiz/assessment results from Notebook LM",
    copyPasteFriendly: true,
    directory: "Assessments/",
  },
  study_plan: {
    schema: StudyPlanSchema,
    description: "Structured study plans from Notebook LM",
    copyPasteFriendly: true,
    directory: "Plans/",
  },
  focus_recommendation: {
    schema: FocusRecommendationSchema,
    description: "AI-driven focus recommendations from Notebook LM",
    copyPasteFriendly: true,
    directory: "Plans/",
  },
  progress_update: {
    schema: ProgressUpdateSchema,
    description: "Session summaries with progress tracking",
    copyPasteFriendly: true,
    directory: "Plans/",
  },
  feature_map: {
    schema: FeatureMapSchema,
    description: "Subject weightage & syllabus matrix from Notebook LM",
    copyPasteFriendly: true,
    directory: "Assessments/",
  },
  task: {
    schema: TaskSchema,
    description: "Scheduled learning tasks (existing format)",
    copyPasteFriendly: true,
    directory: "Subjects/",
  },
  goal: {
    schema: GoalSchema,
    description: "Long-term goals (existing format)",
    copyPasteFriendly: true,
    directory: "Goals/",
  },
} as const;

export type SchemaType = keyof typeof SCHEMA_REGISTRY;

export function validateSchema(type: SchemaType, data: unknown): {
  success: boolean;
  data?: any;
  errors?: z.ZodError;
} {
  const { schema } = SCHEMA_REGISTRY[type];
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

export function getSchemaInfo(type: SchemaType) {
  return SCHEMA_REGISTRY[type];
}

export function isCopyPasteFriendly(type: SchemaType): boolean {
  return SCHEMA_REGISTRY[type].copyPasteFriendly;
}

export function getCopyPasteFriendlyTypes(): SchemaType[] {
  return Object.entries(SCHEMA_REGISTRY)
    .filter(([_, info]) => info.copyPasteFriendly)
    .map(([type]) => type as SchemaType);
}

export function getSchemaDirectory(type: SchemaType): string {
  return SCHEMA_REGISTRY[type].directory;
}