// ============================================================
// OVERRUN — Core Type Definitions
// ============================================================

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
export type TaskType = 'A' | 'B' | 'C';

export interface CollegeBlock {
  start: string;   // "HH:MM"
  end: string;     // "HH:MM"
  name: string;
  isBreak?: boolean;
  isTravel?: boolean;
}

export interface ParsedTask {
  id: string;              // unique ID (hash of content + index)
  dateKey: string;         // "YYYY-MM-DD" — the date this task is scheduled for
  start: string;           // "HH:MM"
  end: string;             // "HH:MM"
  type: TaskType;
  deadline: string;        // "YYYY-MM-DD HH:MM"
  task: string;
  rawLine: string;         // original unparsed line
  isValid: boolean;        // false if collides with college or is in the past
  collisionWith?: string;  // name of colliding college block or "PAST TIME"
}

export type TaskStatus = 'pending' | 'done' | 'overtime' | 'skipped';

export interface TaskInstance extends ParsedTask {
  status: TaskStatus;
  actualEnd?: string;       // "HH:MM" — set when marked overtime/done
  completedAt?: number;     // epoch ms
  dateKey: string;          // "YYYY-MM-DD" — the day this task belongs to
}

export interface EODSummary {
  dateKey: string;          // "YYYY-MM-DD"
  summary: string;          // AI-generated summary text
  taskNames: string[];      // completed task names for reference
  createdAt: number;        // epoch ms
}

export interface DailyTimeBankEntry {
  dateKey: string;
  netMinutes: number;       // positive = gained, negative = lost
}

export interface TimeBankTransaction {
  id: string;
  timestamp: number;        // epoch ms
  dateKey: string;          // "YYYY-MM-DD"
  deltaMinutes: number;     // positive = gained, negative = lost
  reason: string;           // explanation string
  taskId?: string;
  type: 'earned' | 'penalty' | 'overtime' | 'skip' | 'manual';
}

export interface ActiveFocusSession {
  taskId: string;
  taskTitle: string;
  dateKey: string;
  startTime: number;        // epoch ms
  plannedMinutes: number;
  elapsedSeconds: number;
  isPaused: boolean;
  type: TaskType;
}

// ============================================================
// Memory Base — Long-Term Goals
// ============================================================

export type GoalCategory = 'exam' | 'internship' | 'project' | 'skill' | 'other';
export type GoalStatus = 'active' | 'completed' | 'archived';

export const GOAL_CATEGORY_CONFIG: Record<GoalCategory, { label: string; color: string; bg: string; border: string }> = {
  exam:       { label: 'Exam',       color: '#000000', bg: 'bg-[#FF007F]', border: 'border-black' },
  internship: { label: 'Internship', color: '#000000', bg: 'bg-[#FF9F1C]', border: 'border-black' },
  project:    { label: 'Project',    color: '#000000', bg: 'bg-[#00F0FF]', border: 'border-black' },
  skill:      { label: 'Skill',      color: '#000000', bg: 'bg-[#CCFF00]', border: 'border-black' },
  other:      { label: 'Other',      color: '#FFFFFF', bg: 'bg-[#9D00FF]', border: 'border-black' },
};

export interface SubGoal {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: string;       // "YYYY-MM-DD"
  completedAt?: number;      // epoch ms
}

export interface MemoryGoal {
  id: string;
  title: string;
  description: string;
  deadline: string;          // "YYYY-MM-DD" or "" for open-ended
  category: GoalCategory;
  topics: string[];          // related prep topics / sub-tasks
  subgoals?: SubGoal[];      // granular steps towards goal
  status: GoalStatus;
  createdAt: number;         // epoch ms
  completedAt?: number;      // epoch ms
}

/**
 * Calculate days remaining until a deadline date string.
 * Returns negative if past deadline.
 */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const TASK_TYPE_CONFIG: Record<TaskType, {
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
}> = {
  A: {
    label: 'Deep Work',
    color: '#4361EE',
    bgClass: 'max-type-a',
    borderClass: 'border-blue-500/30',
    glowClass: 'shadow-blue-500/15',
  },
  B: {
    label: 'Memorization',
    color: '#F59E0B',
    bgClass: 'max-type-b',
    borderClass: 'border-amber-500/30',
    glowClass: 'shadow-amber-500/15',
  },
  C: {
    label: 'Chore',
    color: '#8B5CF6',
    bgClass: 'max-type-c',
    borderClass: 'border-violet-500/30',
    glowClass: 'shadow-violet-500/15',
  },
};

// Time utility helpers
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function minutesToHM(totalMinutes: number): string {
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = totalMinutes < 0 ? '-' : '+';
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
}

export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[new Date().getDay()];
}

export function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayOfWeekFromDate(d: Date): DayOfWeek {
  const days: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[d.getDay()];
}

/**
 * Returns current time in minutes since midnight (e.g. 14:30 → 870).
 */
export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Check if a given dateKey is in the past (before today).
 */
export function isDatePast(dateKey: string): boolean {
  return dateKey < getTodayKey();
}

/**
 * Check if a given time (HH:MM) on a given dateKey is in the past.
 * For today: compares against current clock time.
 * For past dates: always true.
 * For future dates: always false.
 */
export function isTimePast(dateKey: string, time: string): boolean {
  if (dateKey < getTodayKey()) return true;
  if (dateKey > getTodayKey()) return false;
  return timeToMinutes(time) < getCurrentTimeMinutes();
}

// ============================================================
// Obsidian Knowledge Vault
// ============================================================

export interface ObsidianNoteSummary {
  path: string;            // relative or file basename path
  title: string;           // Note title or filename
  tags: string[];          // e.g. ["study", "exam", "weak-area"]
  headings: string[];      // H1 / H2 headings
  summarySnippet: string;  // first 200 chars preview
  lastModified: number;    // epoch ms
}

// ============================================================
// Subtopic Mastery Tracking (NEW)
// ============================================================

export interface SubtopicMastery {
  concept: string;         // Subtopic identifier
  score: number;           // 0-100 mastery percentage
  status: 'mastered' | 'in_progress' | 'needs_review' | 'not_started';
  last_quizzed?: string;   // YYYY-MM-DD when last tested
}

export interface QuizHistoryEntry {
  date: string;            // YYYY-MM-DD of quiz
  overall_score: number;   // Overall topic mastery (0-100)
  subtopics?: Array<{
    concept: string;
    score: number;         // Per-subtopic mastery (0-100)
  }>;
}

export interface ObsidianVaultConfig {
  vaultPath: string;       // Absolute folder path on machine
  autoSync: boolean;       // Sync automatically on load
  autoExportEod: boolean;  // Write daily logs to Daily Notes folder
  lastSyncedAt?: number;   // epoch ms
}

