// ============================================================
// OVERRUN — Zustand Store with LocalStorage Persistence
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskInstance, EODSummary, DayOfWeek, TaskStatus, ParsedTask, MemoryGoal, SubGoal, GoalCategory, GoalStatus, ObsidianVaultConfig, ObsidianNoteSummary, CollegeBlock } from '@/data/types';
import { timeToMinutes, getTodayKey, getDayOfWeekFromDate, getDateKey } from '@/data/types';
import type { SchemaType } from '@/engine/schema-registry';

interface OverrunState {
  // ---- Task Management ----
  tasksByDate: Record<string, TaskInstance[]>;
  activeDate: string; // "YYYY-MM-DD"

  // ---- College Schedule (user-owned, persisted) ----
  collegeSchedule: CollegeBlock[];

  // ---- Time Bank ----
  timeBank: number;
  dailyTimeBank: Record<string, number>;

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

  // ---- Tasks File Persistence ----
  syncTasksToServer: () => Promise<void>;
  loadTasksFromServer: () => Promise<void>;

  // ---- Actions ----
  setActiveDate: (dateKey: string) => void;
  importTasks: (dateKey: string, parsedTasks: ParsedTask[]) => void;
  addTasks: (parsedTasks: ParsedTask[]) => void;
  markDone: (dateKey: string, taskId: string) => void;
  markOvertime: (dateKey: string, taskId: string, actualEnd: string) => void;
  skipTask: (dateKey: string, taskId: string) => void;
  rescheduleTask: (dateKey: string, taskId: string, newStart: string, newEnd: string) => void;
  clearDayTasks: (dateKey: string) => void;
  saveEODSummary: (dateKey: string, summary: string, taskNames: string[]) => void;

  // College Schedule actions
  setCollegeSchedule: (blocks: CollegeBlock[]) => void;
  clearCollegeSchedule: () => void;

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
  
  // Demo Mode
  enableDemoMode: () => void;
}

export const useStore = create<OverrunState>()(
  persist(
    (set, get) => ({
      tasksByDate: {},
      activeDate: getTodayKey(),
      collegeSchedule: [],
      timeBank: 0,
      dailyTimeBank: {},
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

      loadTasksFromServer: async () => {
        try {
          const res = await fetch('/api/tasks');
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.tasks && Object.keys(data.tasks).length > 0) {
              set((s) => ({ tasksByDate: { ...s.tasksByDate, ...data.tasks } }));
            }
          }
        } catch (e) {
          console.error('Failed to load tasks from server', e);
        }
      },

      syncTasksToServer: async () => {
        const state = get();
        try {
          await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: state.tasksByDate }),
          });
        } catch (e) {
          console.error('Failed to sync tasks to server', e);
        }
      },

      setActiveDate: (dateKey) => set({ activeDate: dateKey }),

      // ---- College Schedule ----
      setCollegeSchedule: (blocks) => set({ collegeSchedule: blocks }),
      clearCollegeSchedule: () => set({ collegeSchedule: [] }),

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
        get().syncTasksToServer();
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
        get().syncTasksToServer();
      },

      markDone: (dateKey, taskId) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        // If task is ALREADY done, toggle it back to pending (unmark)
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
          get().syncTasksToServer();
          return;
        }

        // If pending, overtime, or skipped, mark as done
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const plannedEnd = timeToMinutes(task.end);

        let gained = 0;
        if (currentMinutes < plannedEnd) {
          gained = plannedEnd - currentMinutes;
        } else if (currentMinutes > plannedEnd) {
          gained = plannedEnd - currentMinutes;
        }

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
          timeBank: Math.max(0, s.timeBank + gained),
          dailyTimeBank: {
            ...s.dailyTimeBank,
            [dateKey]: (s.dailyTimeBank[dateKey] ?? 0) + gained,
          },
          xp: s.xp + Math.max(10, gained),
        }));

        get()._updateStreak();
        get().syncTasksToServer();
      },

      markOvertime: (dateKey, taskId, actualEnd) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const plannedEnd = timeToMinutes(task.end);
        const actualEndMin = timeToMinutes(actualEnd);
        const lost = actualEndMin - plannedEnd;

        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
              t.id === taskId
                ? { ...t, status: 'overtime' as TaskStatus, actualEnd, completedAt: Date.now() }
                : t
            ),
          },
          timeBank: Math.max(0, s.timeBank - lost),
          dailyTimeBank: {
            ...s.dailyTimeBank,
            [dateKey]: (s.dailyTimeBank[dateKey] ?? 0) - lost,
          },
          xp: Math.max(0, s.xp - 5),
        }));

        get()._updateStreak();
        get().syncTasksToServer();
      },

      skipTask: (dateKey, taskId) => {
        const state = get();
        const tasks = state.tasksByDate[dateKey] ?? [];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const isSkipped = task.status === 'skipped';

        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: (s.tasksByDate[dateKey] ?? []).map((t) =>
              t.id === taskId
                ? { ...t, status: (isSkipped ? 'pending' : 'skipped') as TaskStatus }
                : t
            ),
          },
          xp: isSkipped ? s.xp : Math.max(0, s.xp - 15),
        }));
        get().syncTasksToServer();
      },

      rescheduleTask: (dateKey, taskId, newStart, newEnd) => {
        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: s.tasksByDate[dateKey].map((t) =>
              t.id === taskId ? { ...t, start: newStart, end: newEnd } : t
            ),
          },
        }));
        get().syncTasksToServer();
      },

      clearDayTasks: (dateKey) => {
        set((s) => ({
          tasksByDate: {
            ...s.tasksByDate,
            [dateKey]: [],
          },
        }));
        get().syncTasksToServer();
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

      enableDemoMode: () => {
        const today = getTodayKey();

        // Wipe any stale localStorage so Zustand's persist doesn't rehydrate
        // old empty/user data over the top of our demo injection.
        try { localStorage.removeItem('overrun-storage'); } catch { /* SSR guard */ }

        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = getDateKey(tomorrowDate);

        set({
          collegeSchedule: [
            { day: 'MON', start: '10:30', end: '12:30', name: 'Design Thinking', isBreak: false, isTravel: false },
            { day: 'MON', start: '13:30', end: '15:30', name: 'NMCP Lab', isBreak: false, isTravel: false },
            { day: 'TUE', start: '09:00', end: '11:00', name: 'Data Structures', isBreak: false, isTravel: false },
            { day: 'WED', start: '11:00', end: '13:00', name: 'Operating Systems', isBreak: false, isTravel: false },
          ],
          memoryGoals: [
            { id: 'g1', title: 'Ace End Semester Exams', description: 'Score at least 90%', deadline: '', category: 'exam', topics: ['Trees', 'Graphs', 'Dynamic Programming'], status: 'active', createdAt: Date.now() },
            { id: 'g2', title: 'Launch 3 SaaS Products', description: 'Build and launch products to generate MRR', deadline: '', category: 'project', topics: ['Next.js', 'Postgres', 'Stripe'], status: 'active', createdAt: Date.now() },
          ],
          obsidianNotes: [
            { path: 'Machine Learning Basics.md', title: 'Machine Learning Basics', tags: ['study', 'ml'], headings: ['Supervised Learning', 'Neural Networks'], summarySnippet: 'A comprehensive overview of foundational ML concepts including gradient descent and backpropagation.', lastModified: Date.now() },
            { path: 'React State Management.md', title: 'React State Management', tags: ['react', 'frontend'], headings: ['Zustand vs Redux', 'Context API'], summarySnippet: 'Analysis of performance characteristics for large React applications using different state management libraries.', lastModified: Date.now() },
          ],
          tasksByDate: {
            ...state.tasksByDate,
            [today]: [
              { id: 't1', dateKey: today, start: '08:00', end: '09:30', type: 'A', task: 'Deep Work: System Architecture', status: 'done', actualEnd: '09:30', isValid: true, deadline: `${today} 23:59`, rawLine: '' },
              { id: 't2', dateKey: today, start: '16:00', end: '17:30', type: 'B', task: 'Memorization: CS Notes', status: 'pending', isValid: true, deadline: `${today} 23:59`, rawLine: '' },
              { id: 't3', dateKey: today, start: '20:00', end: '21:00', type: 'C', task: 'Chore: Setup Docker Env', status: 'pending', isValid: true, deadline: `${tomorrow} 08:00`, rawLine: '' },
            ],
            [tomorrow]: [
              { id: 't4', dateKey: tomorrow, start: '09:00', end: '11:00', type: 'A', task: 'Deep Work: ML Project', status: 'pending', isValid: true, deadline: `${tomorrow} 23:59`, rawLine: '' },
            ]
          },
          xp: 1450,
          streak: 12,
        });
      },
    }),
    {
      name: 'overrun-storage',
      partialize: (state) => ({
        tasksByDate: state.tasksByDate,
        collegeSchedule: state.collegeSchedule,
        timeBank: state.timeBank,
        dailyTimeBank: state.dailyTimeBank,
        eodSummaries: state.eodSummaries,
        xp: state.xp,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        memoryGoals: state.memoryGoals,
        obsidianConfig: state.obsidianConfig,
        obsidianNotes: state.obsidianNotes,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Ensure collegeSchedule is always an array
        if (!Array.isArray(state.collegeSchedule)) {
          state.collegeSchedule = [];
        }
        // Ensure memoryGoals is always an array
        if (!Array.isArray(state.memoryGoals)) {
          state.memoryGoals = [];
        }
      },
    }
  )
);
