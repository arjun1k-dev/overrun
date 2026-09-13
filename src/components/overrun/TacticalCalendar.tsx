'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Target,
  Clock,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getTodayKey } from '@/data/types';
import { format, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

interface TaskDayData {
  date: string;
  total: number;
  completed: number;
  overdue: number;
}

export function TacticalCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showTaskStats, setShowTaskStats] = useState(true);

  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const setActiveDate = useStore((s) => s.setActiveDate);

  // Calculate task statistics for each day
  const tasksByDayData = useMemo(() => {
    const data: Record<string, TaskDayData> = {};

    Object.entries(tasksByDate).forEach(([dateKey, tasks]) => {
      const completed = tasks.filter(t => t.status === 'done' || t.status === 'overtime').length;
      const overdue = tasks.filter(t => {
        const now = new Date();
        const taskDate = parseISO(dateKey);
        return taskDate < now && t.status === 'pending';
      }).length;

      data[dateKey] = {
        date: dateKey,
        total: tasks.length,
        completed,
        overdue,
      };
    });

    return data;
  }, [tasksByDate]);

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Navigate to specific date
  const handleDateSelect = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    setActiveDate(dateKey);
  };

  // Quick navigation functions
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setActiveDate(getTodayKey());
  };

  const goToPrevWeek = () => {
    setCurrentMonth(subWeeks(currentMonth, 1));
  };

  const goToNextWeek = () => {
    setCurrentMonth(addWeeks(currentMonth, 1));
  };

  const goToPrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calculate stats for current view
  const currentMonthStats = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    let daysWithTasks = 0;
    let overdueTasks = 0;

    Object.entries(tasksByDayData).forEach(([dateKey, data]) => {
      const date = parseISO(dateKey);
      if (isSameMonth(date, currentMonth)) {
        totalTasks += data.total;
        completedTasks += data.completed;
        overdueTasks += data.overdue;
        if (data.total > 0) daysWithTasks++;
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { daysWithTasks, totalTasks, completedTasks, overdueTasks, completionRate };
  }, [tasksByDayData, currentMonth]);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      <div className="bg-tactical-surface rounded-2xl border border-tactical-border/60 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tactical-primary to-tactical-purple flex items-center justify-center shadow-lg shadow-tactical-primary/30">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-tactical tracking-tight">Mission Calendar</h2>
              <p className="text-xs text-tactical-muted font-mono mt-0.5">
                Select dates to view timeline
              </p>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={goToToday}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-500/60"
            >
              <Target className="w-4 h-4" />
              Today
            </button>

            <div className="flex items-center bg-tactical-deep/60 rounded-xl border border-tactical-border/60 p-1.5 gap-1">
              <button
                onClick={goToPrevWeek}
                className="p-2 rounded-lg hover:bg-tactical-surface/60 text-tactical-muted hover:text-tactical transition-all"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToPrevMonth}
                className="p-2 rounded-lg hover:bg-tactical-surface/60 text-tactical-muted hover:text-tactical transition-all"
                title="Previous Month"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-2 text-sm font-mono font-bold text-tactical-primary min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg hover:bg-tactical-surface/60 text-tactical-muted hover:text-tactical transition-all"
                title="Next Month"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 rounded-lg hover:bg-tactical-surface/60 text-tactical-muted hover:text-tactical transition-all"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowTaskStats(!showTaskStats)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                showTaskStats
                  ? 'bg-tactical-success/20 text-tactical-success border border-tactical-success/40'
                  : 'bg-tactical-deep/60 text-tactical-muted border border-tactical-border/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              {showTaskStats ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Month Statistics */}
        {showTaskStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3"
          >
            <div className="bg-gradient-to-br from-tactical-deep/80 to-tactical-deep/60 rounded-xl p-4 border border-tactical-border/60">
              <p className="text-tactical-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Active Days</p>
              <p className="text-2xl font-bold text-tactical-primary font-mono">{currentMonthStats.daysWithTasks}</p>
            </div>
            <div className="bg-gradient-to-br from-tactical-deep/80 to-tactical-deep/60 rounded-xl p-4 border border-tactical-border/60">
              <p className="text-tactical-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Total Missions</p>
              <p className="text-2xl font-bold text-tactical-text font-mono">{currentMonthStats.totalTasks}</p>
            </div>
            <div className="bg-gradient-to-br from-tactical-deep/80 to-tactical-deep/60 rounded-xl p-4 border border-tactical-border/60">
              <p className="text-tactical-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Completed</p>
              <p className="text-2xl font-bold text-tactical-success font-mono">{currentMonthStats.completedTasks}</p>
            </div>
            <div className="bg-gradient-to-br from-tactical-deep/80 to-tactical-deep/60 rounded-xl p-4 border border-tactical-border/60">
              <p className="text-tactical-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Overdue</p>
              <p className="text-2xl font-bold text-tactical-danger font-mono">{currentMonthStats.overdueTasks}</p>
            </div>
            <div className="bg-gradient-to-br from-tactical-deep/80 to-tactical-deep/60 rounded-xl p-4 border border-tactical-border/60">
              <p className="text-tactical-muted text-[10px] uppercase tracking-wider mb-1 font-bold">Success Rate</p>
              <p className="text-2xl font-bold text-tactical-primary font-mono">{currentMonthStats.completionRate}%</p>
            </div>
          </motion.div>
        )}

        {/* Custom Calendar Grid */}
        <div className="bg-tactical-deep/40 rounded-2xl p-6 border border-tactical-border/40">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {weekdayLabels.map((day) => (
              <div key={day} className="text-center text-xs font-mono font-bold text-tactical-muted uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date, index) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const dateKey = `${year}-${month}-${day}`;

              const dayData = tasksByDayData[dateKey];
              const isToday = isSameDay(date, new Date());
              const isSelected = activeDate === dateKey;
              const isOutsideMonth = !isSameMonth(date, currentMonth);

              // Calculate task indicators
              const pendingTasks = dayData ? dayData.total - dayData.completed - dayData.overdue : 0;
              const hasCompleted = dayData && dayData.completed > 0;
              const hasOverdue = dayData && dayData.overdue > 0;
              const hasPending = pendingTasks > 0;
              const hasTasks = dayData && dayData.total > 0;

              // Base styles
              let cellClasses = 'h-14 w-full flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer relative overflow-hidden ';

              if (isSelected) {
                cellClasses += 'bg-gradient-to-br from-tactical-primary to-tactical-purple border-tactical-primary shadow-lg shadow-tactical-primary/30 scale-105';
              } else if (isToday) {
                cellClasses += 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-500/20';
              } else if (isOutsideMonth) {
                cellClasses += 'bg-tactical-deep/30 border-tactical-border/30 opacity-40';
              } else {
                cellClasses += 'bg-tactical-deep/60 border-tactical-border/60 hover:bg-tactical-primary/20 hover:border-tactical-primary/40';
              }

              return (
                <div
                  key={index}
                  className={cellClasses}
                  onClick={() => !isOutsideMonth && handleDateSelect(date)}
                >
                  {/* Day number */}
                  <span className={`text-sm font-semibold ${isSelected ? 'text-white' : isToday ? 'text-emerald-400' : isOutsideMonth ? 'text-tactical-muted/50' : 'text-tactical-text'}`}>
                    {date.getDate()}
                  </span>

                  {/* Task indicators bar */}
                  {!isOutsideMonth && hasTasks && (
                    <div className="flex gap-0.5 mt-1">
                      {hasPending && (
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-tactical-primary"
                          title={`${pendingTasks} pending`}
                        />
                      )}
                      {hasCompleted && (
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                          title={`${dayData.completed} completed`}
                        />
                      )}
                      {hasOverdue && (
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-rose-500"
                          title={`${dayData.overdue} overdue`}
                        />
                      )}
                    </div>
                  )}

                  {/* Task count badge */}
                  {!isOutsideMonth && hasTasks && !isSelected && (
                    <div className="absolute top-1 right-1 bg-tactical-primary/80 text-white text-[9px] font-bold px-1 rounded-md">
                      {dayData.total}
                    </div>
                  )}

                  {/* Today indicator */}
                  {isToday && !isSelected && (
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-tactical-border/40 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-2 h-2 rounded-full bg-tactical-primary" />
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <span className="text-tactical-muted font-semibold">Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-tactical-primary" />
              <span className="text-tactical-primary font-bold">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-bold">Done</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-rose-400 font-bold">Overdue</span>
            </div>
          </div>
        </div>

        {/* Selected Date Info */}
        <div className="mt-4 flex items-center justify-center gap-3 text-xs font-mono">
          <span className="text-tactical-muted font-semibold">Selected:</span>
          <span className="text-tactical-primary font-bold bg-tactical-primary/10 px-3 py-1.5 rounded-lg border border-tactical-primary/30">
            {activeDate}
          </span>
          {tasksByDayData[activeDate] && (
            <>
              <span className="text-tactical-muted">•</span>
              <span className="text-tactical-text font-semibold">{tasksByDayData[activeDate].total} missions</span>
              <span className="text-tactical-muted">•</span>
              <span className="text-tactical-success font-semibold">{tasksByDayData[activeDate].completed} done</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}