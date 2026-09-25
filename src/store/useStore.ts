// ============================================================
// OVERRUN — Zustand Store with LocalStorage Persistence
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskInstance, EODSummary, DayOfWeek, TaskStatus, ParsedTask, MemoryGoal, SubGoal, GoalCategory, GoalStatus, ObsidianVaultConfig, ObsidianNoteSummary, TimeBankTransaction, ActiveFocusSession } from '@/data/types';
import { timeToMinutes, getTodayKey, getDayOfWeekFromDate, getDateKey } from '@/data/types';
import type { SchemaType } from '@/engine/schema-registry';

import { generatePhase1Tasks } from '@/engine/phase1-timeline-seeder';
import { calculateTaskCompletion, generateSessionStateMarkdown } from '@/engine/time-bank-engine';

interface OverrunState {
  // ---- Task Management ----
  tasksByDate: Record<string, TaskInstance[]>;
  activeDate: string; // "YYYY-MM-DD"
  seedPhase1Timeline: () => void;

  // ---- Time Bank & Active Sessions ----
  timeBank: number;
  dailyTimeBank: Record<string, number>;
  timeBankLedger: TimeBankTransaction[];
  activeSession: ActiveFocusSession | null;

  // ---- EOD Summaries ----
  eodSummaries: EODSummary[];

  // ---- XP ----
  xp: number;
  streak: number;
  lastActiveDate: string | null;

  // ---- Memory Base ----
  memoryGoals: MemoryGoal[];

  // ---- Obsidian Vault ----
  obsidianConfig: ObsidianVaultConfig;
  obsidianNotes: ObsidianNoteSummary[];

  // ---- YAML State Management ----
  yamlStates: Record<string, any>; // type -> data records
  yamlTransformQueue: Array<{ from: SchemaType; to: SchemaType; data: any; context?: any }>;

  // ---- Actions ----
  setActiveDate: (dateKey: string) => void;
  importTasks: (dateKey: string, parsedTasks: ParsedTask[]) => void;
  addTasks: (parsedTasks: ParsedTask[]) => void;
  markDone: (dateKey: string, taskId: string, customDurationMinutes?: number) => void;
  markOvertime: (dateKey: string, taskId: string, actualEnd: string) => void;
  skipTask: (dateKey: string, taskId: string) => void;
  rescheduleTask: (dateKey: string, taskId: string, newStart: string, newEnd: string) => void;
  clearDayTasks: (dateKey: string) => void;
  saveEODSummary: (dateKey: string, summary: string, taskNames: string[]) => void;

  // Active Focus Session Actions
  startActiveSession: (taskId: string, dateKey: string) => void;
  pauseActiveSession: () => void;
  resumeActiveSession: () => void;
  tickActiveSession: () => void;
  stopActiveSession: (status?: 'done' | 'overtime' | 'skipped') => void;
  addTimeBankTransaction: (tx: TimeBankTransaction) => void;
  clearTimeBankLedger: () => void;

  // Memory Base actions
  addMemoryGoal: (goal: Omit<MemoryGoal, 'id' | 'createdAt' | 'status'>) => void;
  updateMemoryGoal: (id: string, updates: Partial<MemoryGoal>) => void;
  deleteMemoryGoal: (id: string) => void;
  setGoalStatus: (id: string, status: GoalStatus) => void;
  addTopicToGoal: (id: string, topic: string) => void;
  removeTopicFromGoal: (id: string, topic: string) => void;
  addSubGoal: (goalId: string, title: string, targetDate?: string) => void;
  toggleSubGoal: (goalId: string, subGoalId: string) => void;
  deleteSubGoal: (goalId: string, subGoalId: string) => void;

  // Obsidian Vault actions
  setObsidianVaultPath: (path: string) => void;
  setObsidianNotes: (notes: ObsidianNoteSummary[]) => void;

  // YAML State actions
  updateYamlState: (type: SchemaType, id: string, data: any) => void;
  getYamlState: (type: SchemaType, id: string) => any | undefined;
  deleteYamlState: (type: SchemaType, id: string) => void;
  queueYamlTransform: (from: SchemaType, to: SchemaType, data: any, context?: any) => void;
  processTransformQueue: () => void;

  // Internal
  _updateStreak: () => void;
}

export const useStore = create<OverrunState>()(
  persist(
    (set, get) => ({
      tasksByDate: {},
      activeDate: getTodayKey(),
      timeBank: 0,
      dailyTimeBank: {},
      timeBankLedger: [],
      activeSession: null,
      eodSummaries: [],
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      memoryGoals: [],
      obsidianConfig: {
        vaultPath: '',
        autoSync: true,
        autoExportEod: true,
      },
      obsidianNotes: [],
      yamlStates: {},
      yamlTransformQueue: [],

      setActiveDate: (dateKey) => set({ activeDate: dateKey }),

      seedPhase1Timeline: () => {
        const seeded = generatePhase1Tasks('2026-09-12', '2026-12-04');
        set((state) => ({
          tasksByDate: {
            ...state.tasksByDate,
            ...seeded,
          },
        }));
      },

      importTasks: (dateKey, parsedTasks) => {
        const newInstances: TaskInstance[] = parsedTasks.map((pt) => ({
          ...pt,
          dateKey,
          status: 'pending' as TaskStatus,
        }));

        set((state) => ({
          tasksByDate: {
            ...state.tasksByDate,
            [dateKey]: newInstances,
          },
        }));
      },

      addTasks: (parsedTasks) => {
        set((state) => {
          const updated = { ...state.tasksByDate };
          for (const pt of parsedTasks) {
            const dk = pt.dateKey;
            if (!updated[dk]) updated[dk] = [];
            updated[dk] = [
              ...updated[dk],
              { ...pt, status: 'pending' as TaskStatus },
            ];
          }
          return { tasksByDate: updated };
        });
      },

      markDone: (dateKey, taskId, customDurationMinutes) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        // If task is ALREADY done, toggle back to pending (unmark)
        if (task.status === 'done') {
          set((s) => ({
            tasksByDate: {
              ...s.tasksByDate,
              [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
                t.id === taskId
                  ? { ...t, status: 'pending' as TaskStatus, actualEnd: undefined, completedAt: undefined }
                  : t
              ),
            },
          }));
          return;
        }

        const plannedDuration = Math.max(1, timeToMinutes(task.end) - timeToMinutes(task.start));
        const actualDuration = customDurationMinutes ?? plannedDuration;

        const result = calculateTaskCompletion(task, actualDuration, 'done');
        const now = new Date();
        const actualEndStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
              t.id === taskId
                ? { ...t, status: 'done' as TaskStatus, actualEnd: actualEndStr, completedAt: Date.now() }
                : t
            ),
          },
          timeBank: s.timeBank + result.deltaMinutes, // Allows real negative debt!
          dailyTimeBank: {
            ...s.dailyTimeBank,
            [dateKey]: (s.dailyTimeBank[dateKey] ?? 0) + result.deltaMinutes,
          },
          timeBankLedger: [result.transaction, ...(s.timeBankLedger || [])].slice(0, 50),
          xp: Math.max(0, s.xp + result.xpDelta),
        }));

        get()._updateStreak();
      },

      markOvertime: (dateKey, taskId, actualEnd) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const plannedEnd = timeToMinutes(task.end);
        const actualEndMin = timeToMinutes(actualEnd);
        const plannedDuration = Math.max(1, plannedEnd - timeToMinutes(task.start));
        const actualDuration = Math.max(plannedDuration + 1, actualEndMin - timeToMinutes(task.start));

        const result = calculateTaskCompletion(task, actualDuration, 'overtime');

        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
              t.id === taskId
                ? { ...t, status: 'overtime' as TaskStatus, actualEnd, completedAt: Date.now() }
                : t
            ),
          },
          timeBank: s.timeBank + result.deltaMinutes,
          dailyTimeBank: {
            ...s.dailyTimeBank,
            [dateKey]: (s.dailyTimeBank[dateKey] ?? 0) + result.deltaMinutes,
          },
          timeBankLedger: [result.transaction, ...(s.timeBankLedger || [])].slice(0, 50),
          xp: Math.max(0, s.xp + result.xpDelta),
        }));

        get()._updateStreak();
      },

      skipTask: (dateKey, taskId) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const isSkipped = task.status === 'skipped';

        if (isSkipped) {
          set((s) => ({
            tasksByDate: {
              ...s.tasksByDate,
              [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
                t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t
              ),
            },
          }));
          return;
        }

        const result = calculateTaskCompletion(task, 0, 'skipped');

        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
              t.id === taskId ? { ...t, status: 'skipped' as TaskStatus } : t
            ),
          },
          timeBank: s.timeBank + result.deltaMinutes,
          dailyTimeBank: {
            ...s.dailyTimeBank,
            [dateKey]: (s.dailyTimeBank[dateKey] ?? 0) + result.deltaMinutes,
          },
          timeBankLedger: [result.transaction, ...(s.timeBankLedger || [])].slice(0, 50),
          xp: Math.max(0, s.xp + result.xpDelta),
        }));
      },

      // Active Focus Session Implementation
      startActiveSession: (taskId, dateKey) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const plannedMinutes = Math.max(1, timeToMinutes(task.end) - timeToMinutes(task.start));

        set({
          activeSession: {
            taskId: task.id,
            taskTitle: task.task,
            dateKey,
            startTime: Date.now(),
            plannedMinutes,
            elapsedSeconds: 0,
            isPaused: false,
            type: task.type,
          },
        });
      },

      pauseActiveSession: () => {
        set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, isPaused: true } } : {}));
      },

      resumeActiveSession: () => {
        set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, isPaused: false } } : {}));
      },

      tickActiveSession: () => {
        set((s) => {
          if (!s.activeSession || s.activeSession.isPaused) return {};
          return {
            activeSession: {
              ...s.activeSession,
              elapsedSeconds: s.activeSession.elapsedSeconds + 1,
            },
          };
        });
      },

      stopActiveSession: (status = 'done') => {
        const state = get();
        const session = state.activeSession;
        if (!session) return;

        const actualMinutes = Math.max(1, Math.round(session.elapsedSeconds / 60));
        set({ activeSession: null });

        if (status === 'done') {
          get().markDone(session.dateKey, session.taskId, actualMinutes);
        } else if (status === 'overtime') {
          const now = new Date();
          const actualEnd = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          get().markOvertime(session.dateKey, session.taskId, actualEnd);
        } else if (status === 'skipped') {
          get().skipTask(session.dateKey, session.taskId);
        }
      },

      addTimeBankTransaction: (tx) => {
        set((s) => ({
          timeBank: s.timeBank + tx.deltaMinutes,
          timeBankLedger: [tx, ...(s.timeBankLedger || [])].slice(0, 50),
        }));
      },

      clearTimeBankLedger: () => set({ timeBankLedger: [] }),

      rescheduleTask: (dateKey, taskId, newStart, newEnd) => {
        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: s.tasksByDate[dateKey].map((t) =>
              t.id === taskId ? { ...t, start: newStart, end: newEnd } : t
            ),
          },
        }));
      },

      clearDayTasks: (dateKey) => {
        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: [],
          },
        }));
      },

      saveEODSummary: (dateKey, summary, taskNames) => {
        set((s) => ({
          eodSummaries: [
            { dateKey, summary, taskNames, createdAt: Date.now() },
            ...s.eodSummaries.filter((e) => e.dateKey !== dateKey),
          ],
        }));
      },

      // ---- Memory Base ----
      addMemoryGoal: (goal) => {
        const newGoal: MemoryGoal = {
          ...goal,
          id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'active',
          createdAt: Date.now(),
        };
        set((s) => ({ memoryGoals: [newGoal, ...s.memoryGoals] }));
      },

      updateMemoryGoal: (id, updates) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) => g.id === id ? { ...g, ...updates } : g),
        }));
      },

      deleteMemoryGoal: (id) => {
        set((s) => ({ memoryGoals: s.memoryGoals.filter((g) => g.id !== id) }));
      },

      setGoalStatus: (id, status) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) =>
            g.id === id
              ? { ...g, status, completedAt: status === 'completed' ? Date.now() : undefined }
              : g
          ),
        }));
      },

      addTopicToGoal: (id, topic) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) =>
            g.id === id && !g.topics.includes(topic)
              ? { ...g, topics: [...g.topics, topic] }
              : g
          ),
        }));
      },

      removeTopicFromGoal: (id, topic) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) =>
            g.id === id
              ? { ...g, topics: g.topics.filter((t) => t !== topic) }
              : g
          ),
        }));
      },

      addSubGoal: (goalId, title, targetDate) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        const newSubGoal: SubGoal = {
          id: `subgoal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: trimmed,
          completed: false,
          targetDate: targetDate || undefined,
        };
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) => {
            if (g.id !== goalId) return g;
            const updatedSubgoals = [...(g.subgoals || []), newSubGoal];
            return { ...g, subgoals: updatedSubgoals };
          }),
        }));
      },

      toggleSubGoal: (goalId, subGoalId) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) => {
            if (g.id !== goalId) return g;
            const updatedSubgoals = (g.subgoals || []).map((sg) =>
              sg.id === subGoalId
                ? {
                    ...sg,
                    completed: !sg.completed,
                    completedAt: !sg.completed ? Date.now() : undefined,
                  }
                : sg
            );
            return { ...g, subgoals: updatedSubgoals };
          }),
        }));
      },

      deleteSubGoal: (goalId, subGoalId) => {
        set((s) => ({
          memoryGoals: s.memoryGoals.map((g) => {
            if (g.id !== goalId) return g;
            return {
              ...g,
              subgoals: (g.subgoals || []).filter((sg) => sg.id !== subGoalId),
            };
          }),
        }));
      },

      // ---- Obsidian Vault ----
      setObsidianVaultPath: (vaultPath) => {
        set((s) => ({
          obsidianConfig: { ...s.obsidianConfig, vaultPath },
        }));
      },

      setObsidianNotes: (obsidianNotes) => {
        set((s) => ({
          obsidianNotes,
          obsidianConfig: { ...s.obsidianConfig, lastSyncedAt: Date.now() },
        }));
      },

      // YAML State actions
      updateYamlState: (type, id, data) => {
        set((s) => ({
          yamlStates: {
            ...s.yamlStates,
            [`${type}:${id}`]: data,
          },
        }));
      },

      getYamlState: (type, id) => {
        const state = get();
        return state.yamlStates[`${type}:${id}`];
      },

      deleteYamlState: (type, id) => {
        set((s) => {
          const newStates = { ...s.yamlStates };
          delete newStates[`${type}:${id}`];
          return { yamlStates: newStates };
        });
      },

      queueYamlTransform: (from, to, data, context) => {
        set((s) => ({
          yamlTransformQueue: [
            ...s.yamlTransformQueue,
            { from, to, data, context },
          ],
        }));
      },

      processTransformQueue: () => {
        const state = get();
        const { yamlTransformQueue } = state;

        if (yamlTransformQueue.length === 0) return;

        // Process each transform (would call yamlTransformer here)
        // For now, just clear the queue
        set({ yamlTransformQueue: [] });
      },

      _updateStreak: () => {
        const today = getTodayKey();
        const state = get();
        const lastActive = state.lastActiveDate;

        if (lastActive === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getDateKey(yesterday);

        if (lastActive === yesterdayKey) {
          set({ streak: state.streak + 1, lastActiveDate: today });
        } else {
          set({ streak: 1, lastActiveDate: today });
        }
      },
    }),
    {
      name: 'overrun-storage',
      partialize: (state) => ({
        tasksByDate: state.tasksByDate,
        timeBank: state.timeBank,
        dailyTimeBank: state.dailyTimeBank,
        timeBankLedger: state.timeBankLedger,
        eodSummaries: state.eodSummaries,
        xp: state.xp,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        memoryGoals: state.memoryGoals,
        obsidianConfig: state.obsidianConfig,
        obsidianNotes: state.obsidianNotes,
      }),
    }
  )
);
