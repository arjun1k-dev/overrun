// ============================================================
// OVERRUN — Immutable College Timetable (COEP Schedule)
// ============================================================

import type { CollegeBlock, DayOfWeek } from './types';

export const COEP_SCHEDULE: Record<DayOfWeek, CollegeBlock[]> = {
  MON: [
    { start: '08:30', end: '10:30', name: 'Commute / Travel', isTravel: true },
    { start: '10:30', end: '12:30', name: 'Design Thinking (Batch 1)' },
    { start: '12:30', end: '13:30', name: 'LUNCH BREAK', isBreak: true },
    { start: '13:30', end: '14:30', name: 'S&S Tut (B)' },
  ],
  TUE: [
    { start: '09:30', end: '10:30', name: 'Morning Commute / Travel', isTravel: true },
    { start: '10:30', end: '12:30', name: 'A & DE Lab (B)' },
    { start: '12:30', end: '13:30', name: 'LUNCH BREAK', isBreak: true },
    { start: '13:30', end: '14:30', name: 'A&DE' },
    { start: '14:30', end: '15:30', name: 'NMCP' },
    { start: '15:30', end: '16:30', name: 'ES' },
    { start: '16:30', end: '17:30', name: 'A&DE' },
    { start: '17:30', end: '18:30', name: 'Return Commute / Travel', isTravel: true },
  ],
  WED: [
    { start: '09:30', end: '10:30', name: 'Morning Commute / Travel', isTravel: true },
    { start: '10:30', end: '11:30', name: 'S&S' },
    { start: '11:30', end: '12:30', name: 'ECA' },
    { start: '12:30', end: '13:30', name: 'LUNCH BREAK', isBreak: true },
    { start: '13:30', end: '15:30', name: 'NMCP (B)' },
    { start: '15:30', end: '16:30', name: 'Return Commute / Travel', isTravel: true },
  ],
  THU: [
    { start: '08:30', end: '09:30', name: 'Morning Commute / Travel', isTravel: true },
    { start: '09:30', end: '10:30', name: 'OEC' },
    { start: '12:30', end: '13:30', name: 'LUNCH BREAK', isBreak: true },
    { start: '13:30', end: '14:30', name: 'ADE' },
    { start: '15:30', end: '17:30', name: 'Economics' },
    { start: '17:30', end: '18:30', name: 'Honour/Minor' },
    { start: '18:30', end: '19:30', name: 'Return Commute / Travel', isTravel: true },
  ],
  FRI: [
    { start: '08:30', end: '09:30', name: 'Morning Commute / Travel', isTravel: true },
    { start: '09:30', end: '10:30', name: 'OEC' },
    { start: '10:30', end: '11:30', name: 'S&S' },
    { start: '11:30', end: '12:30', name: 'ECA' },
    { start: '12:30', end: '13:30', name: 'LUNCH BREAK', isBreak: true },
    { start: '13:30', end: '15:30', name: 'ECA Lab (B)' },
    { start: '16:30', end: '18:30', name: 'Honour/Minor' },
    { start: '18:30', end: '19:30', name: 'Return Commute / Travel', isTravel: true },
  ],
  SAT: [
    { start: '09:00', end: '11:00', name: 'Commute / Travel Block', isTravel: true },
  ],
  SUN: [],
};

/**
 * Get the college blocks for a given day of week.
 * Filters out lunch breaks by default.
 */
export function getCollegeBlocksForDay(day: DayOfWeek, includeBreaks = false): CollegeBlock[] {
  const blocks = COEP_SCHEDULE[day] ?? [];
  return includeBreaks ? blocks : blocks.filter(b => !b.isBreak);
}

/**
 * Find the nearest available time gap on a given day.
 * Returns { start, end } in minutes or null if no gap found.
 */
export function findAvailableGap(
  day: DayOfWeek,
  durationNeeded: number,
  excludeStartMin?: number,
  excludeEndMin?: number
): { start: number; end: number } | null {
  const collegeBlocks = COEP_SCHEDULE[day] ?? [];
  const allSlots: { start: number; end: number }[] = [];

  // Add college blocks as occupied
  for (const b of collegeBlocks) {
    allSlots.push({
      start: parseInt(b.start.split(':')[0]) * 60 + parseInt(b.start.split(':')[1]),
      end: parseInt(b.end.split(':')[0]) * 60 + parseInt(b.end.split(':')[1]),
    });
  }

  // Sort occupied slots
  allSlots.sort((a, b) => a.start - b.start);

  // Define the search window (06:00 to 23:59)
  const dayStart = 360;
  const dayEnd = 1439;
  const searchStart = excludeStartMin ?? dayStart;
  const searchEnd = excludeEndMin ?? dayEnd;

  // Merge overlapping slots
  const merged: { start: number; end: number }[] = [];
  for (const slot of allSlots) {
    if (merged.length === 0 || merged[merged.length - 1].end < slot.start) {
      merged.push({ ...slot });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, slot.end);
    }
  }

  // Find gaps
  let prevEnd = dayStart;
  for (const slot of merged) {
    const gapStart = Math.max(prevEnd, searchStart);
    const gapEnd = Math.min(slot.start, searchEnd);
    if (gapEnd - gapStart >= durationNeeded) {
      return { start: gapStart, end: gapStart + durationNeeded };
    }
    prevEnd = Math.max(prevEnd, slot.end);
  }

  // Check after last slot
  const lastGapStart = Math.max(prevEnd, searchStart);
  const lastGapEnd = Math.min(dayEnd, searchEnd);
  if (lastGapEnd - lastGapStart >= durationNeeded) {
    return { start: lastGapStart, end: lastGapStart + durationNeeded };
  }

  return null;
}
