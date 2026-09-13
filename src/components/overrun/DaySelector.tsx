'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { getDateKey, getTodayKey, getDayOfWeekFromDate, type DayOfWeek } from '@/data/types';
import { playClick } from '@/engine/sounds';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS: Record<DayOfWeek, string> = { MON:'Mon', TUE:'Tue', WED:'Wed', THU:'Thu', FRI:'Fri', SAT:'Sat', SUN:'Sun' };

export function DaySelector() {
  const activeDate = useStore((s) => s.activeDate);
  const setActiveDate = useStore((s) => s.setActiveDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const todayKey = getTodayKey();

  const weekDates = useMemo(() => {
    const active = new Date(activeDate + 'T00:00:00');
    const monday = new Date(active);
    monday.setDate(active.getDate() - ((active.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return getDateKey(d); });
  }, [activeDate]);

  const go = (days: number) => { const d = new Date(activeDate + 'T00:00:00'); d.setDate(d.getDate() + days); setActiveDate(getDateKey(d)); playClick(); };

  return (
    <div className="flex items-center gap-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => go(-7)} className="max-btn !p-2 !border-violet-300">
        <ChevronLeft className="w-4 h-4 text-violet-500" />
      </motion.button>

      <div className="flex-1 flex gap-1 justify-center">
        {weekDates.map((dateKey) => {
          const d = new Date(dateKey + 'T00:00:00');
          const isToday = dateKey === todayKey;
          const isActive = dateKey === activeDate;
          const tasks = tasksByDate[dateKey] ?? [];
          const hasTasks = tasks.length > 0;
          const allDone = hasTasks && tasks.every((t) => t.status !== 'pending');

          return (
            <motion.button key={dateKey} whileTap={{ scale: 0.95 }} onClick={() => { setActiveDate(dateKey); playClick(); }}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all min-w-[48px] ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200 border-2 border-indigo-400'
                  : 'hover:bg-indigo-50 border-2 border-indigo-200'
              }`}>
              <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-amber-500' : isActive ? 'text-white' : 'text-indigo-400'}`}>
                {DAY_LABELS[getDayOfWeekFromDate(d)]}
              </span>
              <span className={`text-sm font-black font-mono ${isToday ? 'text-amber-500' : isActive ? 'text-white' : 'text-indigo-500'}`}>{d.getDate()}</span>
              {hasTasks && <div className={`w-1.5 h-1.5 rounded-full ${allDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />}
            </motion.button>
          );
        })}
      </div>

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => go(7)} className="max-btn !p-2 !border-violet-300">
        <ChevronRight className="w-4 h-4 text-violet-500" />
      </motion.button>

      {activeDate !== todayKey && (
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveDate(todayKey); playClick(); }}
          className="max-btn !px-3 !py-1.5 text-[10px] font-mono font-bold text-indigo-600 !border-indigo-300 bg-indigo-50">
          Today
        </motion.button>
      )}
    </div>
  );
}
