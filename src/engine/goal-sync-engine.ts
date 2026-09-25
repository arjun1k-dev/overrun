// ============================================================
// OVERRUN — Goal & Subgoal Dynamic Sync Engine
// ============================================================

import type { MemoryGoal, TaskInstance } from '@/data/types';

export interface GoalProgressResult {
  goalId: string;
  title: string;
  calculatedProgressPct: number;
  subgoalsCompleted: number;
  totalSubgoals: number;
  matchingTasksCompleted: number;
  status: 'active' | 'completed';
}

/**
 * Computes live completion percentage for a Memory Goal based on:
 * 1. Explicit subgoal checkmarks (60% weight)
 * 2. Completed matching tasks on the timeline (40% weight)
 */
export function calculateGoalProgress(
  goal: MemoryGoal,
  completedTasks: TaskInstance[]
): GoalProgressResult {
  const subgoals = goal.subgoals || [];
  const totalSubgoals = subgoals.length;
  const subgoalsCompleted = subgoals.filter((s) => s.completed).length;

  const subgoalPct = totalSubgoals > 0 ? (subgoalsCompleted / totalSubgoals) * 100 : 0;

  // Find timeline tasks matching goal topics or title
  const goalTopicsLower = (goal.topics || []).map((t) => t.toLowerCase());
  const goalTitleLower = (goal.title || '').toLowerCase();

  const matchingTasks = completedTasks.filter((t) => {
    const taskNameLower = (t.task || '').toLowerCase();
    if (goalTitleLower && taskNameLower.includes(goalTitleLower)) return true;
    return goalTopicsLower.some((topic) => topic && taskNameLower.includes(topic));
  });

  const matchingTasksCompleted = matchingTasks.length;
  const taskFactorPct = Math.min(100, matchingTasksCompleted * 20); // 5 matching tasks = 100%

  let calculatedProgressPct = 0;
  if (totalSubgoals > 0 && matchingTasksCompleted > 0) {
    calculatedProgressPct = Math.round(subgoalPct * 0.6 + taskFactorPct * 0.4);
  } else if (totalSubgoals > 0) {
    calculatedProgressPct = Math.round(subgoalPct);
  } else if (matchingTasksCompleted > 0) {
    calculatedProgressPct = Math.round(taskFactorPct);
  } else {
    calculatedProgressPct = goal.status === 'completed' ? 100 : 0;
  }

  const isCompleted = calculatedProgressPct >= 100 || goal.status === 'completed';

  return {
    goalId: goal.id,
    title: goal.title,
    calculatedProgressPct: Math.min(100, calculatedProgressPct),
    subgoalsCompleted,
    totalSubgoals,
    matchingTasksCompleted,
    status: isCompleted ? 'completed' : 'active',
  };
}
