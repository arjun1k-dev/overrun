// ============================================================
// OVERRUN — Deep Time Bank & Active Session Engine
// ============================================================

import type { TaskInstance, TaskType, TimeBankTransaction, ActiveFocusSession } from '@/data/types';
import { timeToMinutes } from '@/data/types';

export interface CompletionResult {
  deltaMinutes: number;
  xpDelta: number;
  reason: string;
  transaction: TimeBankTransaction;
}

/**
 * Calculates exact Time Bank delta minutes and XP rewards based on planned vs actual execution time.
 */
export function calculateTaskCompletion(
  task: TaskInstance,
  actualDurationMinutes: number,
  status: 'done' | 'overtime' | 'skipped'
): CompletionResult {
  const plannedDuration = Math.max(1, timeToMinutes(task.end) - timeToMinutes(task.start));
  const timestamp = Date.now();
  const txId = `tx-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

  if (status === 'skipped') {
    const deltaMinutes = -15; // Flat 15 minute time bank penalty
    const xpDelta = -15;      // Significant XP loss
    const reason = `Skipped task: "${task.task}" (-15m Time Bank, -15 XP)`;

    return {
      deltaMinutes,
      xpDelta,
      reason,
      transaction: {
        id: txId,
        timestamp,
        dateKey: task.dateKey,
        deltaMinutes,
        reason,
        taskId: task.id,
        type: 'skip',
      },
    };
  }

  if (status === 'overtime') {
    const overflow = Math.max(1, actualDurationMinutes - plannedDuration);
    const deltaMinutes = -overflow;
    const xpDelta = -10;
    const reason = `Overtime penalty on "${task.task}": Went ${overflow}m over planned ${plannedDuration}m`;

    return {
      deltaMinutes,
      xpDelta,
      reason,
      transaction: {
        id: txId,
        timestamp,
        dateKey: task.dateKey,
        deltaMinutes,
        reason,
        taskId: task.id,
        type: 'overtime',
      },
    };
  }

  // Status is 'done'
  const timeSaved = plannedDuration - actualDurationMinutes;
  let deltaMinutes = 0;
  let baseXP = task.type === 'A' ? 25 : task.type === 'B' ? 15 : 10;

  if (timeSaved > 0) {
    // Finished early! Bank those saved minutes!
    deltaMinutes = timeSaved;
    const bonusXP = Math.round(timeSaved * (task.type === 'A' ? 1.5 : 1.0));
    const xpDelta = baseXP + bonusXP;
    const reason = `Finished "${task.task}" ${timeSaved}m early (+${timeSaved}m Time Bank, +${xpDelta} XP)`;

    return {
      deltaMinutes,
      xpDelta,
      reason,
      transaction: {
        id: txId,
        timestamp,
        dateKey: task.dateKey,
        deltaMinutes,
        reason,
        taskId: task.id,
        type: 'earned',
      },
    };
  } else if (timeSaved === 0) {
    // Finished exactly on time
    deltaMinutes = 0;
    const xpDelta = baseXP + 10; // On-time completion bonus
    const reason = `Completed "${task.task}" right on schedule (+0m Time Bank, +${xpDelta} XP)`;

    return {
      deltaMinutes,
      xpDelta,
      reason,
      transaction: {
        id: txId,
        timestamp,
        dateKey: task.dateKey,
        deltaMinutes: 0,
        reason,
        taskId: task.id,
        type: 'earned',
      },
    };
  } else {
    // Took longer than planned
    const extraMinutes = Math.abs(timeSaved);
    deltaMinutes = -extraMinutes;
    const xpDelta = Math.max(5, baseXP - extraMinutes);
    const reason = `Took ${extraMinutes}m longer than planned on "${task.task}" (-${extraMinutes}m Time Bank)`;

    return {
      deltaMinutes,
      xpDelta,
      reason,
      transaction: {
        id: txId,
        timestamp,
        dateKey: task.dateKey,
        deltaMinutes,
        reason,
        taskId: task.id,
        type: 'penalty',
      },
    };
  }
}

/**
 * Generates a session_state Markdown frontmatter document for logging session telemetry to disk
 */
export function generateSessionStateMarkdown(
  session: ActiveFocusSession,
  completion: CompletionResult
): string {
  const dateStr = new Date(session.startTime).toISOString().slice(0, 10);
  const actualMinutes = Math.round(session.elapsedSeconds / 60);

  return `---
version: "1.0.0"
type: "session_state"
session_id: "${session.taskId}"
task_title: "${session.taskTitle}"
date: "${dateStr}"
planned_minutes: ${session.plannedMinutes}
actual_minutes: ${actualMinutes}
net_time_bank_delta: ${completion.deltaMinutes}
xp_gained: ${completion.xpDelta}
task_type: "${session.type}"
---

# ⏱️ Active Focus Session Log — ${session.taskTitle}
- **Date:** ${dateStr}
- **Planned Duration:** ${session.plannedMinutes} mins
- **Actual Focus Time:** ${actualMinutes} mins
- **Time Bank Impact:** ${completion.deltaMinutes >= 0 ? `+${completion.deltaMinutes}m` : `${completion.deltaMinutes}m`}
- **XP Earned:** ${completion.xpDelta} XP
- **Summary:** ${completion.reason}
`;
}
