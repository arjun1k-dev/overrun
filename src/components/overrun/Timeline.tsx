'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { getCollegeBlocksForDay } from '@/data/coepSchedule';
import { getDayOfWeekFromDate, timeToMinutes, type TaskInstance, type CollegeBlock, type DayOfWeek, type ParsedTask } from '@/data/types';
import { generateTimelinePrompt } from '@/engine/parser';
import { TaskCard } from './TaskCard';
import { playClick, playShimmer, playError } from '@/engine/sounds';
import { Lock, UtensilsCrossed, ChevronDown, ChevronUp, Copy, Check, Car } from 'lucide-react';

const TIMELINE_START = 360;
const TIMELINE_END = 1440;
const HOUR_HEIGHT = 320; // 30-min slot = 160px — roomy spacing for comfortable task card display

// Expanded 20-Color Neo-Brutalist Subject Palette (Maximum Color Variety)
const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Design Thinking': { bg: '#FF70A6', text: '#000000' }, // Neon Pink
  'S&S Tut':         { bg: '#00F0FF', text: '#000000' }, // Neon Cyan
  'S&S':             { bg: '#35A7FF', text: '#000000' }, // Electric Blue
  'A & DE Lab':      { bg: '#FF9F1C', text: '#000000' }, // Bright Orange
  'A&DE Lab':        { bg: '#FF9F1C', text: '#000000' },
  'A&DE':            { bg: '#FFBF69', text: '#000000' }, // Sunburst Yellow
  'ADE':             { bg: '#FFBF69', text: '#000000' },
  'NMCP Lab':        { bg: '#00E676', text: '#000000' }, // Mint Green
  'NMCP':            { bg: '#CCFF00', text: '#000000' }, // Neon Lime
  'ES Lab':          { bg: '#7209B7', text: '#FFFFFF' }, // Deep Purple
  'ES':              { bg: '#9D00FF', text: '#FFFFFF' }, // Electric Violet
  'ECA Lab':         { bg: '#10B981', text: '#000000' }, // Emerald
  'ECA':             { bg: '#2EC4B6', text: '#000000' }, // Deep Teal
  'OEC':             { bg: '#FF007F', text: '#FFFFFF' }, // Hot Magenta
  'Economics':       { bg: '#FFE600', text: '#000000' }, // Neon Yellow
  'Honour/Minor':   { bg: '#F72585', text: '#FFFFFF' }, // Vivid Rose
  'Mathematics':     { bg: '#4CC9F0', text: '#000000' }, // Sky Cyan
  'Physics':         { bg: '#FF4D6D', text: '#FFFFFF' }, // Crimson Pink
  'Chemistry':       { bg: '#70E400', text: '#000000' }, // Acid Green
  'Biology':         { bg: '#3A0CA3', text: '#FFFFFF' }, // Ultra Navy
};

// 14-Color Rotating Fallback Palette for Unmapped Subjects
const FALLBACK_PALETTE = [
  { bg: '#CCFF00', text: '#000000' }, // Neon Lime
  { bg: '#FF007F', text: '#FFFFFF' }, // Hot Magenta
  { bg: '#00F0FF', text: '#000000' }, // Neon Cyan
  { bg: '#FF9F1C', text: '#000000' }, // Bright Orange
  { bg: '#9D00FF', text: '#FFFFFF' }, // Electric Purple
  { bg: '#FFE600', text: '#000000' }, // Neon Yellow
  { bg: '#4CC9F0', text: '#000000' }, // Sky Blue
  { bg: '#FF70A6', text: '#000000' }, // Neon Pink
  { bg: '#2EC4B6', text: '#000000' }, // Deep Teal
  { bg: '#F72585', text: '#FFFFFF' }, // Vivid Rose
  { bg: '#00E676', text: '#000000' }, // Mint Green
  { bg: '#35A7FF', text: '#000000' }, // Electric Blue
  { bg: '#FF4D6D', text: '#FFFFFF' }, // Crimson
  { bg: '#70E400', text: '#000000' }, // Acid Green
];

function getSubjectColor(name: string, index = 0) {
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (name.includes(key)) return val;
  }
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

interface TimelineBlock { startMin: number; endMin: number; isCollege: boolean; isBreak: boolean; data: CollegeBlock | TaskInstance; }

export function Timeline() {
  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const memoryGoals = useStore((s) => s.memoryGoals);
  const obsidianNotes = useStore((s) => s.obsidianNotes);
  const rescheduleTask = useStore((s) => s.rescheduleTask);
  const collegeSchedule = useStore((s) => s.collegeSchedule);
  const [currentTimeLine, setCurrentTimeLine] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [copiedTimeline, setCopiedTimeline] = useState(false);

  // Auto-scroll refs
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoScrolledRef = useRef(false);

  const dayOfWeek: DayOfWeek = useMemo(() => getDayOfWeekFromDate(new Date(activeDate + 'T00:00:00')), [activeDate]);
  const collegeBlocks = useMemo(() => getCollegeBlocksForDay(collegeSchedule, dayOfWeek), [collegeSchedule, dayOfWeek]);
  const tasks: TaskInstance[] = useMemo(() => tasksByDate[activeDate] ?? [], [tasksByDate, activeDate]);

  const blocks = useMemo((): TimelineBlock[] => {
    const all: TimelineBlock[] = [];
    for (const b of collegeBlocks) all.push({ startMin: timeToMinutes(b.start), endMin: timeToMinutes(b.end), isCollege: true, isBreak: !!b.isBreak, data: b });
    for (const t of tasks) all.push({ startMin: timeToMinutes(t.start), endMin: timeToMinutes(t.end), isCollege: false, isBreak: false, data: t });
    return all.sort((a, b) => a.startMin - b.startMin);
  }, [collegeBlocks, tasks]);

  const activeTask = useMemo(() => tasks.find((t) => t.status === 'pending' && t.isValid), [tasks]);

  // Current time updater
  useEffect(() => {
    const update = () => { const now = new Date(); setCurrentTimeLine(now.toDateString() === new Date(activeDate + 'T00:00:00').toDateString() ? now.getHours() * 60 + now.getMinutes() : null); };
    update(); const iv = setInterval(update, 30000); return () => clearInterval(iv);
  }, [activeDate]);

  // Auto-scroll to current time after 5s inactivity when viewing today
  useEffect(() => {
    const isToday = activeDate === new Date().toISOString().slice(0, 10);
    if (!isToday) { hasAutoScrolledRef.current = false; return; }

    // Reset auto-scroll flag when date changes back to today
    hasAutoScrolledRef.current = false;

    const doAutoScroll = () => {
      if (hasAutoScrolledRef.current || !currentTimeRef.current) return;
      hasAutoScrolledRef.current = true;
      currentTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const resetTimer = () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      activityTimerRef.current = setTimeout(doAutoScroll, 5000);
    };

    // Activity events to track
    const events = ['scroll', 'mousemove', 'mousedown', 'keydown', 'touchstart'] as const;
    for (const evt of events) window.addEventListener(evt, resetTimer, { passive: true });
    resetTimer(); // Start the initial timer

    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      for (const evt of events) window.removeEventListener(evt, resetTimer);
    };
  }, [activeDate]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status !== 'pending');
  const handleReschedule = (taskId: string, newStart: string, newEnd: string) => rescheduleTask(activeDate, taskId, newStart, newEnd);
  const glowClass = activeTask ? `dynamic-glow-${activeTask.type.toLowerCase()}` : '';

  const handleCopyTimeline = useCallback(async () => {
    // Convert TaskInstances to ParsedTask for the prompt generator
    const allParsed: Record<string, ParsedTask[]> = {};
    for (const [dk, insts] of Object.entries(tasksByDate)) {
      allParsed[dk] = insts;
    }
    const prompt = generateTimelinePrompt({ tasksByDate: allParsed, memoryGoals, obsidianNotes, collegeSchedule });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedTimeline(true);
      playShimmer();
      setTimeout(() => setCopiedTimeline(false), 2500);
    } catch {
      playError();
    }
  }, [tasksByDate, memoryGoals, obsidianNotes]);

  return (
    <div className={`relative ${glowClass} transition-all duration-1000`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black text-indigo-900">Timeline</h2>
          <span className="text-[10px] font-mono font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-lg border border-violet-200">{activeDate} ({dayOfWeek})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-blue-500">{pendingTasks.length} pending · {completedTasks.length} done</span>
          {completedTasks.length > 0 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCompleted(!showCompleted)} className="flex items-center gap-1 text-[10px] font-mono font-bold text-violet-500 hover:text-violet-700 transition-colors">
              {showCompleted ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showCompleted ? 'Hide' : 'Show'} done
            </motion.button>
          )}
        </div>
      </div>

      {/* Copy Timeline for AI — now includes full weekly schedule + all future tasks + memory goals */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCopyTimeline}
        className="w-full mb-4 max-btn !bg-gradient-to-r !from-violet-50 !to-pink-50 !border-violet-300 !py-2.5 text-xs font-bold text-violet-700 flex items-center justify-center gap-2 hover:!from-violet-100 hover:!to-pink-100"
      >
        {copiedTimeline ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        {copiedTimeline ? 'Copied! Paste into your AI' : 'Copy Full Context for AI'}
        {!copiedTimeline && <span className="text-[10px] font-mono text-violet-400 font-normal">— weekly schedule + all tasks + goals</span>}
      </motion.button>

      <div className="relative">
        <div className="relative" style={{ height: (TIMELINE_END - TIMELINE_START) / 60 * HOUR_HEIGHT }}>
          {Array.from({ length: 19 }, (_, i) => (
            <div key={i} className="absolute w-full" style={{ top: i * HOUR_HEIGHT }}>
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-indigo-400 w-10 text-right -mt-2 select-none font-bold">{String(6 + i).padStart(2, '0')}:00</span>
                <div className="flex-1 border-t-2 border-indigo-100" />
              </div>
            </div>
          ))}

          {currentTimeLine !== null && (
            <div ref={currentTimeRef}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute left-10 right-0 z-20" style={{ top: ((currentTimeLine - TIMELINE_START) / 60) * HOUR_HEIGHT }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <div className="flex-1 h-0.5 bg-red-400" />
              </div>
              </motion.div>
            </div>
          )}

          {blocks.map((block, idx) => {
            const top = ((block.startMin - TIMELINE_START) / 60) * HOUR_HEIGHT;
            const height = Math.max(20, ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT);

            if (block.isCollege) {
              const cd = block.data as CollegeBlock;
              const isTravel = !!cd.isTravel;
              const c = isTravel
                ? { bg: '#FF9F1C', text: '#000000' }
                : getSubjectColor(cd.name, idx);
              return (
                <div 
                  key={`c-${idx}`} 
                  className={`absolute left-12 right-0 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] ${block.isBreak ? 'opacity-85 border-dashed' : isTravel ? 'opacity-90' : ''}`} 
                  style={{ top, height, minHeight: 36, backgroundColor: c.bg, color: c.text }}
                >
                  <div className="flex items-center gap-2 px-3 h-full">
                    {isTravel ? (
                      <Car className="w-4 h-4 shrink-0 stroke-[3]" />
                    ) : block.isBreak ? (
                      <UtensilsCrossed className="w-4 h-4 shrink-0 stroke-[3]" />
                    ) : (
                      <Lock className="w-4 h-4 shrink-0 stroke-[3]" />
                    )}
                    <span className="text-xs font-black font-mono truncate">{cd.name}</span>
                    <span className="text-[10px] font-mono font-black ml-auto shrink-0 bg-white text-black px-2 py-0.5 rounded border border-black">{cd.start}–{cd.end}</span>
                  </div>
                </div>
              );
            }

            const td = block.data as TaskInstance;
            const isCompleted = td.status !== 'pending';
            if (isCompleted && !showCompleted) return null;
            return (
              <div key={td.id} className="absolute left-12 right-0 px-1" style={{ top, height }}>
                <TaskCard task={td} onReschedule={handleReschedule} />
              </div>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-bold text-indigo-400">No schedule loaded for this day.</p>
          <p className="text-xs text-violet-400 mt-1">Paste an AI schedule above to get started.</p>
        </motion.div>
      )}
    </div>
  );
}