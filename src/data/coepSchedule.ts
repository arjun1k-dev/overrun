// ============================================================
// OVERRUN — College Schedule Helpers (Generic / User-Owned)
// ============================================================
// No hardcoded timetable. Schedule is set by the user via the
// "Add College Schedule" feature and persisted to localStorage.
// These helpers operate on CollegeBlock[] passed in from the store.
// ============================================================

import type { CollegeBlock, DayOfWeek } from './types';
import { timeToMinutes, minutesToTime } from './types';

/**
 * Get the college blocks for a given day from a user-provided schedule.
 * Filters out lunch/break blocks by default.
 */
export function getCollegeBlocksForDay(
  schedule: CollegeBlock[],
  day: DayOfWeek,
  includeBreaks = false
): CollegeBlock[] {
  const blocks = schedule.filter((b) => b.day === day);
  return includeBreaks ? blocks : blocks.filter((b) => !b.isBreak);
}

/**
 * Find the nearest available time gap on a given day, avoiding
 * blocks from the user's college schedule.
 */
export function findAvailableGap(
  schedule: CollegeBlock[],
  day: DayOfWeek,
  durationNeeded: number,
  excludeStartMin?: number,
  excludeEndMin?: number
): { start: number; end: number } | null {
  const collegeBlocks = schedule.filter((b) => b.day === day);
  const allSlots: { start: number; end: number }[] = [];

  for (const b of collegeBlocks) {
    allSlots.push({
      start: timeToMinutes(b.start),
      end: timeToMinutes(b.end),
    });
  }

  allSlots.sort((a, b) => a.start - b.start);

  const dayStart = 360;
  const dayEnd = 1439;
  const searchStart = excludeStartMin ?? dayStart;
  const searchEnd = excludeEndMin ?? dayEnd;

  const merged: { start: number; end: number }[] = [];
  for (const slot of allSlots) {
    if (merged.length === 0 || merged[merged.length - 1].end < slot.start) {
      merged.push({ ...slot });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, slot.end);
    }
  }

  let prevEnd = dayStart;
  for (const slot of merged) {
    const gapStart = Math.max(prevEnd, searchStart);
    const gapEnd = Math.min(slot.start, searchEnd);
    if (gapEnd - gapStart >= durationNeeded) {
      return { start: gapStart, end: gapStart + durationNeeded };
    }
    prevEnd = Math.max(prevEnd, slot.end);
  }

  const lastGapStart = Math.max(prevEnd, searchStart);
  const lastGapEnd = Math.min(dayEnd, searchEnd);
  if (lastGapEnd - lastGapStart >= durationNeeded) {
    return { start: lastGapStart, end: lastGapStart + durationNeeded };
  }

  return null;
}

// Re-export for backward compat — empty schedule constant
export const COEP_SCHEDULE: Record<DayOfWeek, CollegeBlock[]> = {
  MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: [],
};
