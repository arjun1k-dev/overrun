'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TaskInstance } from '@/data/types';
import { timeToMinutes, minutesToTime, getDayOfWeekFromDate } from '@/data/types';
import { useStore } from '@/store/useStore';
import { findAvailableGap } from '@/data/coepSchedule';
import { playClick, playPop } from '@/engine/sounds';
import { X, Lightbulb, ArrowLeftRight, ChevronRight } from 'lucide-react';

interface Props { task: TaskInstance; onConfirm: (s: string, e: string) => void; onClose: () => void; }

export function RescheduleModal({ task, onConfirm, onClose }: Props) {
  const [mode, setMode] = useState<'manual' | 'smart'>('manual');
  const [offset, setOffset] = useState(0);
  const [suggestion, setSuggestion] = useState<{ s: string; e: string } | null>(null);

  const activeDate = useStore((s) => s.activeDate);
  const collegeSchedule = useStore((s) => s.collegeSchedule);
  const dow = useMemo(() => getDayOfWeekFromDate(new Date(activeDate + 'T00:00:00')), [activeDate]);
  const dur = useMemo(() => timeToMinutes(task.end) - timeToMinutes(task.start), [task]);
  const newStart = useMemo(() => minutesToTime(timeToMinutes(task.start) + offset * 60), [task, offset]);
  const newEnd = useMemo(() => minutesToTime(timeToMinutes(newStart) + dur), [newStart, dur]);
  const valid = useMemo(() => { const s = timeToMinutes(newStart); const e = timeToMinutes(newEnd); return s >= 360 && e <= 1440 && s < e; }, [newStart, newEnd]);

  const handleSmart = () => {
    const g = findAvailableGap(collegeSchedule, dow, dur, 0, timeToMinutes(task.start)) ?? findAvailableGap(collegeSchedule, dow, dur, timeToMinutes(task.end));
    if (g) setSuggestion({ s: minutesToTime(g.start), e: minutesToTime(g.end) });
    playClick();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-white rounded-3xl p-6 border-2 border-indigo-200 shadow-2xl shadow-indigo-200">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black text-indigo-900">Reschedule Task</h2>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { playClick(); onClose(); }} className="p-1.5 rounded-xl hover:bg-red-50 transition-colors">
            <X className="w-4 h-4 text-red-400" />
          </motion.button>
        </div>

        <div className="mb-4 px-3 py-2.5 rounded-xl bg-blue-50 border-2 border-blue-200">
          <p className="text-xs font-mono font-bold text-blue-500">Current: {task.start} — {task.end}</p>
          <p className="text-sm font-bold text-indigo-900 mt-1">{task.task}</p>
        </div>

        <div className="flex gap-2 mb-5">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMode('manual'); playPop(); }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all ${mode === 'manual' ? 'bg-blue-100 border-blue-400 text-blue-600' : 'bg-blue-50 border-indigo-200 text-indigo-400 hover:text-indigo-600'}`}>
            <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1.5" /> Manual
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMode('smart'); playPop(); }}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border-2 transition-all ${mode === 'smart' ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-amber-50 border-indigo-200 text-indigo-400 hover:text-indigo-600'}`}>
            <Lightbulb className="w-3.5 h-3.5 inline mr-1.5" /> Smart Suggest
          </motion.button>
        </div>

        {mode === 'manual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setOffset((p) => p - 1); playClick(); }} className="max-btn !w-10 !h-10 !border-violet-300 !bg-violet-100 flex items-center justify-center text-violet-600 font-black text-lg">−</motion.button>
              <div className="text-center">
                <div className="text-2xl font-black font-mono text-indigo-900">{offset >= 0 ? '+' : ''}{offset}h</div>
                <div className="text-[10px] font-mono text-blue-500 mt-1 font-bold">{newStart} — {newEnd}</div>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setOffset((p) => p + 1); playClick(); }} className="max-btn !w-10 !h-10 !border-violet-300 !bg-violet-100 flex items-center justify-center text-violet-600 font-black text-lg">+</motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { if (valid) { onConfirm(newStart, newEnd); playClick(); } }} disabled={!valid}
              className="w-full !bg-emerald-100 !border-emerald-400 text-emerald-700 font-bold max-btn !py-2.5 disabled:opacity-40">Apply Shift</motion.button>
          </div>
        )}

        {mode === 'smart' && (
          <div className="space-y-4">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSmart}
              className="w-full !bg-amber-100 !border-amber-400 text-amber-700 font-bold max-btn !py-2.5 flex items-center justify-center gap-2">
              <Lightbulb className="w-4 h-4" /> Find Nearest Gap ({dur}m needed)
            </motion.button>
            {suggestion ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
                <p className="text-xs font-mono text-emerald-600 mb-2 font-bold">Suggested slot:</p>
                <p className="text-lg font-black font-mono text-indigo-900">{suggestion.s} — {suggestion.e}</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onConfirm(suggestion.s, suggestion.e); playClick(); }}
                  className="mt-3 w-full !bg-emerald-200 !border-emerald-400 text-emerald-800 font-bold max-btn !py-2 flex items-center justify-center gap-1.5">
                  Accept <ChevronRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ) : <p className="text-xs text-blue-400 text-center font-bold">Click above to scan for available gaps</p>}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}