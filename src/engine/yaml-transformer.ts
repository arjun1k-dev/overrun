// ============================================================
// OVERRUN — YAML Transformer
// ============================================================
// Converts between different YAML types while preserving data integrity
// Manual trigger only - user chooses when to transform

import type {
  QuizResult,
  ProgressUpdate,
  StudyPlan,
  FocusRecommendation,
  ProgressState,
  TaskState,
  GoalState,
  SessionState,
  Task,
  Goal,
} from './schema-registry';
import { serializeYaml } from './yaml-parser';

// ============================================================
// Transform Functions
// ============================================================

/**
 * Transform QuizResult to ProgressState
 * Updates mastery level based on quiz performance
 */
export function quizResultToProgressState(
  quizResult: QuizResult,
  existingProgress?: ProgressState
): ProgressState {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  // Process topic_breakdown into subtopic mastery data
  const subtopicMastery = quizResult.topic_breakdown?.map(breakdown => {
    const percentage = (breakdown.questions_correct / breakdown.questions_asked) * 100;
    const status: 'mastered' | 'in_progress' | 'needs_review' | 'not_started' = percentage >= 70 ? 'mastered' : percentage >= 40 ? 'in_progress' : 'needs_review';
    return {
      concept: breakdown.topic_id,
      score: Math.round(percentage),
      status: status,
      last_quizzed: quizResult.date
    };
  }) || [];

  return {
    version: '1.0.0',
    type: 'progress_state',
    topic_id: quizResult.topic.toLowerCase().replace(/\s+/g, '_'),
    topic_title: quizResult.topic,
    mastery_level: quizResult.progress_after,
    last_updated: now,
    confidence: quizResult.confidence,
    concepts_mastered: existingProgress?.concepts_mastered || [],
    concepts_needing_review: quizResult.identified_gaps,
    next_focus: quizResult.next_focus,
    trend: 'stable',
    last_studied_human: 'Just now',
    study_count: (existingProgress?.study_count || 0) + 1,
    total_time_spent_min: (existingProgress?.total_time_spent_min || 0),
    category: 'skill',
    priority: 'MEDIUM',
    created_at: existingProgress?.created_at || now,
    updated_at: now,
    // NEW: Include subtopic breakdown data
    subtopic_mastery: subtopicMastery,
    quiz_history: [
      ...(existingProgress?.quiz_history || []),
      {
        date: quizResult.date,
        overall_score: quizResult.progress_after,
        subtopics: quizResult.topic_breakdown?.map(b => ({
          concept: b.topic_id,
          score: Math.round((b.questions_correct / b.questions_asked) * 100)
        })) || []
      }
    ]
  };
}

/**
 * Transform ProgressUpdate to ProgressState
 * Updates mastery based on session progress
 */
export function progressUpdateToProgressState(
  progressUpdate: ProgressUpdate,
  existingProgress?: ProgressState
): ProgressState {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  return {
    version: '1.0.0',
    type: 'progress_state',
    topic_id: progressUpdate.topic.toLowerCase().replace(/\s+/g, '_'),
    topic_title: progressUpdate.topic,
    mastery_level: progressUpdate.progress_after,
    last_updated: now,
    confidence: progressUpdate.quality === 'high' ? 'high' : progressUpdate.quality === 'medium' ? 'medium' : 'low',
    concepts_mastered: [
      ...(existingProgress?.concepts_mastered || []),
      ...progressUpdate.concepts_mastered,
    ],
    concepts_needing_review: progressUpdate.concepts_needing_review,
    next_focus: progressUpdate.next_session_focus,
    trend: 'stable',
    last_studied_human: 'Just now',
    study_count: 1,
    total_time_spent_min: 0,
    category: 'skill',
    priority: 'MEDIUM',
    created_at: existingProgress?.created_at || now,
    updated_at: now,
  };
}

/**
 * Transform StudyPlan to TaskState entries
 * Generates scheduled tasks from study plan
 */
export function studyPlanToTaskStates(
  studyPlan: StudyPlan,
  baseDate: string,
  startHour: number = 9
): TaskState[] {
  const tasks: TaskState[] = [];
  const currentTime = new Date(baseDate);
  currentTime.setHours(startHour, 0, 0, 0);

  const timePerTopic = Math.floor(studyPlan.total_time_min / studyPlan.focus_topics.length);

  studyPlan.focus_topics.forEach((topic, index) => {
    const startTime = currentTime.toISOString().slice(0, 16).replace('T', ' ');
    currentTime.setMinutes(currentTime.getMinutes() + timePerTopic);
    const endTime = currentTime.toISOString().slice(0, 16).replace('T', ' ');

    tasks.push({
      version: '1.0.0',
      type: 'task_state',
      id: `task-${Date.now()}-${index}`,
      topic_id: topic.toLowerCase().replace(/\s+/g, '_'),
      topic_title: topic,
      scheduled_start: startTime,
      scheduled_end: endTime,
      status: 'pending',
      priority: 'MEDIUM',
      task_type: 'DEEP_WORK',
      time_remaining_min: 60,
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  });

  return tasks;
}

/**
 * Transform FocusRecommendation to simplified StudyPlan
 * Converts AI recommendation into actionable plan
 */
export function focusRecommendationToStudyPlan(
  recommendation: FocusRecommendation
): StudyPlan {
  return {
    version: '1.0.0',
    type: 'study_plan',
    date: recommendation.date,
    focus_topics: recommendation.priority_topics.slice(0, 3), // Top 3 priorities
    total_time_min: recommendation.time_available_min,
    priority: recommendation.priority_topics.length > 2 ? 'high' : 'medium',
    created_at: recommendation.created_at,
  };
}

/**
 * Transform SessionState to ProgressUpdate
 * Creates session summary for Notebook LM
 */
export function sessionStateToProgressUpdate(
  session: SessionState,
  topicTitle: string,
  progressBefore: number,
  progressAfter: number
): ProgressUpdate {
  const qualityToConfidence = (quality: string) => {
    if (quality === 'high') return 'high';
    if (quality === 'medium') return 'medium';
    return 'low';
  };

  return {
    version: '1.0.0',
    type: 'progress_update',
    topic: topicTitle,
    date: session.start_time.split(' ')[0],
    progress_before: progressBefore,
    progress_after: progressAfter,
    time_spent_min: session.duration_min || 0,
    concepts_mastered: [],
    concepts_needing_review: [],
    next_session_focus: '',
    quality: qualityToConfidence(session.quality),
    created_at: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Transform Task to TaskState
 * Legacy task format to new state format
 */
export function taskToTaskState(task: Task): TaskState {
  const dateTime = `${task.dateKey} ${task.start}`;

  return {
    version: '1.0.0',
    type: 'task_state',
    id: `task-${task.dateKey}-${task.start}-${task.title}`,
    topic_id: task.title.toLowerCase().replace(/\s+/g, '_'),
    topic_title: task.title,
    scheduled_start: dateTime,
    scheduled_end: `${task.dateKey} ${task.end}`,
    status: task.status === 'in-progress' ? 'in_progress' : task.status as any,
    priority: 'MEDIUM',
    task_type: 'CHORE',
    time_remaining_min: 60,
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
}

/**
 * Transform Goal to GoalState
 * Legacy goal format to new state format
 */
export function goalToGoalState(goal: Goal): GoalState {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const subgoals = goal.subgoals || [];
  const completedCount = subgoals.filter(s => s.completed).length;

  return {
    version: '1.0.0',
    type: 'goal_state',
    goal_id: goal.title.toLowerCase().replace(/\s+/g, '_'),
    goal_title: goal.title,
    category: goal.category,
    target_completion: goal.deadline,
    current_progress: subgoals.length > 0 ? Math.round((completedCount / subgoals.length) * 100) : 0,
    milestones_completed: completedCount,
    milestones_total: subgoals.length || goal.topics.length,
    status: goal.status,
    priority: 'MEDIUM',
    subgoals: subgoals,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Aggregate ProgressStates to update GoalState
 * Updates goal progress based on topic completion
 */
export function aggregateProgressToGoal(
  goal: GoalState,
  topicProgressStates: ProgressState[]
): GoalState {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const relevantTopics = topicProgressStates.filter(
    p => goal.goal_title.toLowerCase().includes(p.topic_title.toLowerCase().split(' ')[0])
  );

  const avgMastery = relevantTopics.length > 0
    ? Math.round(relevantTopics.reduce((sum, p) => sum + p.mastery_level, 0) / relevantTopics.length)
    : goal.current_progress;

  return {
    ...goal,
    current_progress: avgMastery,
    milestones_completed: relevantTopics.filter(p => p.mastery_level >= 70).length,
    updated_at: now,
  };
}

/**
 * Identity transformation for feature_map
 * Returns the feature_map as-is since it doesn't need transformation
 */
export function featureMapIdentity(featureMap: any): any {
  return featureMap;
}

// ============================================================
// Transformer Registry
// ============================================================

export const TRANSFORM_REGISTRY = {
  quiz_result_to_progress_state: {
    from: 'quiz_result',
    to: 'progress_state',
    transform: quizResultToProgressState,
    description: 'Update mastery from quiz results',
  },
  progress_update_to_progress_state: {
    from: 'progress_update',
    to: 'progress_state',
    transform: progressUpdateToProgressState,
    description: 'Update mastery from session progress',
  },
  study_plan_to_task_states: {
    from: 'study_plan',
    to: 'task_state',
    transform: studyPlanToTaskStates,
    description: 'Generate scheduled tasks from study plan',
  },
  focus_recommendation_to_study_plan: {
    from: 'focus_recommendation',
    to: 'study_plan',
    transform: focusRecommendationToStudyPlan,
    description: 'Convert AI recommendation to study plan',
  },
  session_state_to_progress_update: {
    from: 'session_state',
    to: 'progress_update',
    transform: sessionStateToProgressUpdate,
    description: 'Create session summary from session state',
  },
  task_to_task_state: {
    from: 'task',
    to: 'task_state',
    transform: taskToTaskState,
    description: 'Legacy task format to new state format',
  },
  goal_to_goal_state: {
    from: 'goal',
    to: 'goal_state',
    transform: goalToGoalState,
    description: 'Legacy goal format to new state format',
  },
  aggregate_progress_to_goal: {
    from: 'progress_state',
    to: 'goal_state',
    transform: aggregateProgressToGoal,
    description: 'Update goal progress from topic completion',
  },
  feature_map_identity: {
    from: 'feature_map',
    to: 'feature_map',
    transform: featureMapIdentity,
    description: 'Register feature map for mastery calculations',
  },
} as const;

export type TransformType = keyof typeof TRANSFORM_REGISTRY;

// ============================================================
// Transformer Utility Class
// ============================================================

export class YamlTransformer {
  /**
   * Transform data from one type to another
   */
  transform<T = any>(
    fromType: string,
    toType: string,
    data: any,
    context?: any
  ): T | null {
    const transformKey = `${fromType}_to_${toType}` as TransformType;

    if (!(transformKey in TRANSFORM_REGISTRY)) {
      console.error(`No transform found for ${fromType} -> ${toType}`);
      return null;
    }

    const transform = TRANSFORM_REGISTRY[transformKey];

    try {
      return (transform.transform as any)(data, context) as T;
    } catch (error) {
      console.error(`Transform failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get available transforms for a source type
   */
  getAvailableTransforms(fromType: string): TransformType[] {
    return Object.entries(TRANSFORM_REGISTRY)
      .filter(([_, info]) => info.from === fromType)
      .map(([key]) => key as TransformType);
  }

  /**
   * Get transform information
   */
  getTransformInfo(transformType: TransformType) {
    return TRANSFORM_REGISTRY[transformType];
  }

  /**
   * Check if transform is available
   */
  hasTransform(fromType: string, toType: string): boolean {
    const key = `${fromType}_to_${toType}` as TransformType;
    return key in TRANSFORM_REGISTRY;
  }
}

// ============================================================
// Singleton Instance
// ============================================================

export const yamlTransformer = new YamlTransformer();

// ============================================================
// Convenience Functions
// ============================================================

/**
 * Transform data between types
 */
export function transformYaml<T = any>(
  fromType: string,
  toType: string,
  data: any,
  context?: any
): T | null {
  return yamlTransformer.transform<T>(fromType, toType, data, context);
}