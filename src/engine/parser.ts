// ============================================================
// OVERRUN — Schedule Parser Engine
// ============================================================

import type { ParsedTask, TaskInstance, DayOfWeek, TaskType, MemoryGoal, ObsidianNoteSummary, CollegeBlock } from '@/data/types';
import { timeToMinutes, isTimePast, isDatePast, minutesToTime, getDayOfWeekFromDate } from '@/data/types';

// Regex supports optional [DATE::YYYY-MM-DD] and optional [DEADLINE::...]
const SCHEDULE_REGEX =
  /(?:\[DATE::(\d{4}-\d{2}-\d{2})\]\s*)?\[START::(\d{2}:\d{2})\]\s*\[END::(\d{2}:\d{2})\]\s*\[TYPE::([ABC])\]\s*(?:\[DEADLINE::([^\]]+)\]\s*)?\[TASK::(.+)\]/;

/**
 * Parse a single line of the custom schedule format.
 * Supports optional [DATE::YYYY-MM-DD] — falls back to defaultDateKey.
 */
function parseLine(line: string, index: number, defaultDateKey: string): ParsedTask | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const match = trimmed.match(SCHEDULE_REGEX);
  if (!match) return null;

  const [, explicitDate, start, end, type, explicitDeadline, task] = match;
  const dateKey = explicitDate || defaultDateKey;
  const deadline = explicitDeadline || `${dateKey} 23:59`;
  const day: DayOfWeek = getDayOfWeekFromDate(new Date(dateKey + 'T00:00:00'));

  return {
    id: `task-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    dateKey,
    start,
    end,
    type: type as TaskType,
    deadline,
    task: task.trim(),
    rawLine: trimmed,
    isValid: true,
    _day: day, // internal: used for collision check
  } as ParsedTask & { _day: DayOfWeek };
}

/**
 * Check if a task's time range collides with any college block on a given day.
 * Accepts the user's own schedule (from the store) rather than a hardcoded one.
 */
function checkCollision(
  task: ParsedTask,
  day: DayOfWeek,
  schedule: CollegeBlock[]
): { collides: boolean; with?: string } {
  const dayBlocks = schedule.filter((b) => b.day === day && !b.isBreak);
  const taskStartMin = timeToMinutes(task.start);
  const taskEndMin = timeToMinutes(task.end);

  for (const block of dayBlocks) {
    const blockStartMin = timeToMinutes(block.start);
    const blockEndMin = timeToMinutes(block.end);

    if (taskStartMin < blockEndMin && blockStartMin < taskEndMin) {
      return { collides: true, with: block.name };
    }
  }

  return { collides: false };
}

/**
 * Check inter-task collision (overlap between AI tasks on the same date).
 */
function checkTaskCollision(task: ParsedTask, existingOnDate: ParsedTask[]): ParsedTask | null {
  const taskStartMin = timeToMinutes(task.start);
  const taskEndMin = timeToMinutes(task.end);

  for (const existing of existingOnDate) {
    if (existing.id === task.id) continue;
    const exStartMin = timeToMinutes(existing.start);
    const exEndMin = timeToMinutes(existing.end);

    if (taskStartMin < exEndMin && exStartMin < taskEndMin) {
      return existing;
    }
  }
  return null;
}

export interface ParseResult {
  validTasks: ParsedTask[];
  invalidLines: number[];
  collisionTasks: ParsedTask[];
  pastTimeTasks: ParsedTask[];
  parseErrors: string[];
  multiDate: boolean; // true if any task has an explicit [DATE::]
}

/**
 * Parse the full multiline schedule text.
 * Supports multi-date via [DATE::YYYY-MM-DD] on individual lines.
 * Falls back to `defaultDateKey` / `defaultDay` when DATE is omitted.
 */
export function parseSchedule(
  rawText: string,
  defaultDay: DayOfWeek,
  defaultDateKey: string,
  existingTasks: ParsedTask[] = [],
  collegeSchedule: CollegeBlock[] = []
): ParseResult {
  const lines = rawText.split('\n');
  const validTasks: ParsedTask[] = [];
  const invalidLines: number[] = [];
  const collisionTasks: ParsedTask[] = [];
  const pastTimeTasks: ParsedTask[] = [];
  const parseErrors: string[] = [];
  let multiDate = false;

  // Track parsed tasks per date for inter-task collision checks
  const parsedPerDate: Record<string, ParsedTask[]> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const task = parseLine(line, i, defaultDateKey);
    if (!task) {
      invalidLines.push(i + 1);
      parseErrors.push(`Line ${i + 1}: Invalid format`);
      continue;
    }

    // Track multi-date usage
    if (task.dateKey !== defaultDateKey) multiDate = true;

    // Get the day of week for collision checking
    const taskDay = getDayOfWeekFromDate(new Date(task.dateKey + 'T00:00:00'));

    // Check if task end time is in the past
    if (isTimePast(task.dateKey, task.end)) {
      task.isValid = false;
      task.collisionWith = 'PAST TIME';
      pastTimeTasks.push(task);
      parseErrors.push(`Line ${i + 1} [${task.dateKey}]: PAST TIME — ${task.start}–${task.end}`);
      continue;
    }

    // Check college collision (for the task's own date)
    const collision = checkCollision(task, taskDay, collegeSchedule);
    if (collision.collides) {
      task.isValid = false;
      task.collisionWith = collision.with;
      collisionTasks.push(task);
      parseErrors.push(`Line ${i + 1} [${task.dateKey}]: COLLISION with "${collision.with}"`);
    }

    // Check inter-task collision (same date only)
    const dateBucket = parsedPerDate[task.dateKey] || [];
    const taskCollision = checkTaskCollision(task, dateBucket);
    if (taskCollision) {
      task.isValid = false;
      if (!task.collisionWith) task.collisionWith = `AI Task: "${taskCollision.task}"`;
      collisionTasks.push(task);
      parseErrors.push(`Line ${i + 1} [${task.dateKey}]: Overlaps with "${taskCollision.task}"`);
    }

    if (!parsedPerDate[task.dateKey]) parsedPerDate[task.dateKey] = [];
    parsedPerDate[task.dateKey].push(task);
    validTasks.push(task);
  }

  return { validTasks, invalidLines, collisionTasks, pastTimeTasks, parseErrors, multiDate };
}

/**
 * Generate a sample schedule string for demo purposes.
 */
export function generateSampleSchedule(): string {
  return `[START::06:30] [END::08:00] [TYPE::A] [DEADLINE::2025-07-20 23:59] [TASK::Build OVERRUN parser engine]
[START::10:30] [END::12:00] [TYPE::B] [DEADLINE::2025-07-18 23:59] [TASK::Revise NMCP formulas chapter 5]
[START::14:30] [END::16:00] [TYPE::A] [DEADLINE::2025-07-22 23:59] [TASK::Design system architecture for startup MVP]
[START::18:30] [END::20:00] [TYPE::C] [DEADLINE::2025-07-17 08:00] [TASK::Submit ES assignment on Canvas]
[START::20:00] [END::21:30] [TYPE::B] [DEADLINE::2025-07-19 23:59] [TASK::Anki deck — Economics supply curves]
[START::21:30] [END::23:00] [TYPE::A] [DEADLINE::2025-07-25 23:59] [TASK::Read Lean Startup — Chapter 3-4]`;
}

// ============================================================
// Timeline Export for AI — Comprehensive Prompt Generator
// ============================================================

export interface FreeGap {
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
  durationMin: number;
}

/**
 * Generate a comprehensive prompt containing:
 * - Full weekly college schedule
 * - All existing tasks across all future dates
 * - Active memory goals and their topics
 * - Obsidian Knowledge Vault notes (study topics, weak areas)
 * - Free gaps per day (future-only for today)
 *
 * This is what the user copies and pastes into their AI.
 */
export function generateTimelinePrompt(options: {
  tasksByDate: Record<string, (ParsedTask | TaskInstance)[]>;
  memoryGoals: MemoryGoal[];
  obsidianNotes?: ObsidianNoteSummary[];
  collegeSchedule?: CollegeBlock[];
  onlyFuture?: boolean;
}): string {
  const { tasksByDate, memoryGoals, obsidianNotes = [], collegeSchedule = [], onlyFuture = true } = options;
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayDow = getDayOfWeekFromDate(now);
  const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  let prompt = `=== OVERRUN — FULL CONTEXT SNAPSHOT ===\n`;
  prompt += `Generated: ${todayKey} ${currentTimeStr}\n`;

  // ---- OBSIDIAN KNOWLEDGE VAULT CONTEXT ----
  if (obsidianNotes.length > 0) {
    prompt += `\n========== OBSIDIAN KNOWLEDGE VAULT (STUDY CONTEXT & TEST MASTERY) ==========\n`;
    for (const note of obsidianNotes.slice(0, 15)) {
      const tagsStr = note.tags.length > 0 ? ` [#${note.tags.join(' #')}]` : '';
      prompt += `📄 ${note.title}${tagsStr}\n`;
      if (note.headings.length > 0) {
        prompt += `   Topics: ${note.headings.slice(0, 5).join(' | ')}\n`;
      }
      if (note.summarySnippet) {
        prompt += `   Preview: "${note.summarySnippet.slice(0, 120)}..."\n`;
      }
    }
  }

  prompt += `\n========== ADAPTIVE SCHEDULING RULE ==========\n`;
  prompt += `CRITICAL INSTRUCTION FOR AI: Examine study topics/notes with low mastery scores (<60%) or marked with weak-area tags. Prioritize scheduling revision for these weak areas during early free time gaps!\n`;

  // ---- WEEKLY COLLEGE SCHEDULE ----
  prompt += `\n========== WEEKLY COLLEGE SCHEDULE ==========\n`;
  for (const dow of DAYS) {
    const blocks = collegeSchedule.filter((b) => b.day === dow && !b.isBreak);
    if (blocks.length === 0) {
      prompt += `${dow}: (no classes)\n`;
    } else {
      const slots = blocks.map((b) => `${b.start}–${b.end} ${b.name}`).join(', ');
      prompt += `${dow}: ${slots}\n`;
    }
  }

  // ---- MEMORY GOALS (long-term objectives) ----
  const activeGoals = memoryGoals.filter((g) => g.status === 'active');
  if (activeGoals.length > 0) {
    prompt += `\n========== LONG-TERM GOALS (MEMORY BASE) ==========\n`;
    for (const g of activeGoals) {
      prompt += `🎯 ${g.title}`;
      if (g.deadline) prompt += ` (deadline: ${g.deadline})`;
      prompt += ` [${g.category}]\n`;
      if (g.description) prompt += `   ${g.description}\n`;
      if (g.topics.length > 0) {
        prompt += `   Topics to prep: ${g.topics.join(', ')}\n`;
      }
    }
  }

  // ---- PER-DAY BREAKDOWN ----
  prompt += `\n========== PER-DAY SCHEDULE + FREE SLOTS ==========\n`;

  // Collect all dates that have tasks
  const allDates = new Set<string>();
  for (const dk of Object.keys(tasksByDate)) {
    const tasks = tasksByDate[dk];
    if (tasks.length > 0) allDates.add(dk);
  }

  // Also include today + next 6 days always
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    allDates.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
  }

  const sortedDates = [...allDates].sort();

  for (const dk of sortedDates) {
    const dateObj = new Date(dk + 'T00:00:00');
    const dow = getDayOfWeekFromDate(dateObj);
    const isToday = dk === todayKey;
    const isPast = dk < todayKey;

    // Skip past dates
    if (isPast && onlyFuture) continue;

    prompt += `\n--- ${dk} (${dow})${isToday ? ' ★ TODAY' : ''} ---\n`;

    // College blocks for this day
    const dayCollegeBlocks = collegeSchedule.filter((b) => b.day === dow && !b.isBreak);
    if (dayCollegeBlocks.length > 0) {
      prompt += `  College: `;
      prompt += dayCollegeBlocks.map((b) => `${b.start}–${b.end} ${b.name}`).join(' | ');
      prompt += '\n';
    }

    // Existing tasks for this date
    const existingTasks = (tasksByDate[dk] ?? []) as TaskInstance[];
    const nonSkipped = existingTasks.filter((t) => t.status !== 'skipped');
    if (nonSkipped.length > 0) {
      prompt += `  Tasks:\n`;
      for (const t of nonSkipped) {
        const statusTag = t.status === 'done' ? '✅' : t.status === 'overtime' ? '⏰' : '⬜';
        prompt += `    ${statusTag} ${t.start}–${t.end} [${t.type}] ${t.task}\n`;
      }
    }

    // Calculate free gaps
    const occupied: { startMin: number; endMin: number }[] = [];
    for (const b of collegeSchedule.filter((cb) => cb.day === dow)) {
      occupied.push({ startMin: timeToMinutes(b.start), endMin: timeToMinutes(b.end) });
    }
    for (const t of existingTasks) {
      if (t.status === 'skipped') continue;
      occupied.push({ startMin: timeToMinutes(t.start), endMin: timeToMinutes(t.end) });
    }

    occupied.sort((a, b) => a.startMin - b.startMin);

    const merged: { startMin: number; endMin: number }[] = [];
    for (const slot of occupied) {
      if (merged.length > 0 && merged[merged.length - 1].endMin >= slot.startMin) {
        merged[merged.length - 1].endMin = Math.max(merged[merged.length - 1].endMin, slot.endMin);
      } else {
        merged.push({ ...slot });
      }
    }

    const searchStart = isToday && onlyFuture ? currentMin : 360;
    const searchEnd = 1440;
    const gaps: FreeGap[] = [];
    let prevEnd = 360;
    for (const slot of merged) {
      const gs = Math.max(prevEnd, searchStart);
      const ge = Math.min(slot.startMin, searchEnd);
      if (ge > gs && ge - gs >= 15) {
        gaps.push({ start: minutesToTime(gs), end: minutesToTime(ge), durationMin: ge - gs });
      }
      prevEnd = Math.max(prevEnd, slot.endMin);
    }
    const lastGs = Math.max(prevEnd, searchStart);
    if (searchEnd > lastGs && searchEnd - lastGs >= 15) {
      gaps.push({ start: minutesToTime(lastGs), end: minutesToTime(searchEnd), durationMin: searchEnd - lastGs });
    }

    if (gaps.length > 0) {
      prompt += `  Free slots: `;
      prompt += gaps.map((g) => `${g.start}–${g.end} (${g.durationMin}m)`).join(' | ');
      prompt += '\n';
    } else if (isToday && onlyFuture) {
      prompt += `  Free slots: (none remaining today)\n`;
    }
  }

  // ---- INSTRUCTIONS ----
  prompt += `\n========== INSTRUCTIONS FOR AI ==========\n`;
  prompt += `1. Schedule tasks ONLY into the FREE SLOTS listed above.\n`;
  prompt += `2. Do NOT overlap tasks or use time already occupied by college or existing tasks.\n`;
  if (onlyFuture) {
    prompt += `3. CRITICAL: Current time is ${currentTimeStr}. Do NOT schedule anything before that on today (${todayKey}).\n`;
  }
  prompt += `4. Use this exact format (one task per line):\n`;
  prompt += `   [DATE::YYYY-MM-DD] [START::HH:MM] [END::HH:MM] [TYPE::A|B|C] [DEADLINE::YYYY-MM-DD HH:MM] [TASK::Description]\n`;
  prompt += `   - [DATE::] is REQUIRED when scheduling for a date other than today.\n`;
  prompt += `   - TYPE::A = Deep Work (90+ min blocks), TYPE::B = Memorization, TYPE::C = Chore\n`;
  prompt += `5. Prioritize tasks related to the LONG-TERM GOALS listed above.\n`;
  prompt += `6. Fill free slots efficiently — prefer Deep Work (A) in longer gaps.\n`;

  return prompt;
}
