'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import type { TaskInstance } from '@/data/types';
import { TASK_TYPE_CONFIG, timeToMinutes } from '@/data/types';
import { playClick, playShimmer, playBuzz, playError } from '@/engine/sounds';
import { Check, Clock, RotateCcw, SkipForward, AlertTriangle, Zap } from 'lucide-react';
import { RescheduleModal } from './RescheduleModal';

interface TaskCardProps { task: TaskInstance; onReschedule: (id: string, s: string, e: string) => void; }

const TASK_COLOR_PALETTE = [
  { bg: '#CCFF00', text: '#000000', badgeBg: '#FFFFFF', label: 'Deep Work' },       // Neon Lime
  { bg: '#00F0FF', text: '#000000', badgeBg: '#FFFFFF', label: 'Deep Work' },       // Neon Cyan
  { bg: '#FFE600', text: '#000000', badgeBg: '#FFFFFF', label: 'Memorization' },   // Neon Yellow
  { bg: '#FF9F1C', text: '#000000', badgeBg: '#FFFFFF', label: 'Practice' },       // Bright Orange
  { bg: '#FF70A6', text: '#000000', badgeBg: '#FFFFFF', label: 'Revision' },       // Neon Pink
  { bg: '#9D00FF', text: '#FFFFFF', badgeBg: '#CCFF00', label: 'Deep Work' },       // Electric Violet
  { bg: '#4CC9F0', text: '#000000', badgeBg: '#FFFFFF', label: 'Study' },          // Sky Blue
  { bg: '#2EC4B6', text: '#000000', badgeBg: '#FFFFFF', label: 'Project' },        // Teal
  { bg: '#00E676', text: '#000000', badgeBg: '#FFFFFF', label: 'Lab Work' },       // Mint Green
  { bg: '#FF007F', text: '#FFFFFF', badgeBg: '#FFE600', label: 'Exam Prep' },      // Hot Magenta
];

function getTaskCardColor(task: TaskInstance) {
  let hash = 0;
  for (let i = 0; i < task.task.length; i++) {
    hash = (hash << 5) - hash + task.task.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TASK_COLOR_PALETTE.length;
  return TASK_COLOR_PALETTE[idx];
}

export function TaskCard({ task, onReschedule }: TaskCardProps) {
  const [showOvertime, setShowOvertime] = useState(false);
  const [overtimeInput, setOvertimeInput] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [xpAmt, setXpAmt] = useState(0);

  const activeDate = useStore((s) => s.activeDate);
  const markDone = useStore((s) => s.markDone);
  const markOvertime = useStore((s) => s.markOvertime);
  const skipTask = useStore((s) => s.skipTask);

  const config = TASK_TYPE_CONFIG[task.type];
  const dynamicColor = getTaskCardColor(task);
  const done = task.status === 'done' || task.status === 'overtime' || task.status === 'skipped';

  const handleDone = () => {
    const now = new Date();
    const gained = Math.max(0, timeToMinutes(task.end) - (now.getHours() * 60 + now.getMinutes()));
    markDone(activeDate, task.id); playShimmer();
    setXpAmt(Math.max(10, gained)); setShowXP(true); setTimeout(() => setShowXP(false), 1500);
  };
  const handleOvertime = () => {
    if (!overtimeInput.match(/^\d{2}:\d{2}$/)) { playError(); return; }
    markOvertime(activeDate, task.id, overtimeInput); playBuzz(); setShowOvertime(false); setOvertimeInput('');
  };
  const handleSkip = () => { skipTask(activeDate, task.id); playClick(); };
  const handleRes = (s: string, e: string) => { onReschedule(task.id, s, e); playClick(); };

  const statusClass = done
    ? task.status === 'overtime' ? 'max-overtime' : 'max-done'
    : task.isValid ? '' : 'max-error';

  const dur = timeToMinutes(task.end) - timeToMinutes(task.start);
  const dDate = task.deadline.split(' ')[0];
  const dTime = task.deadline.split(' ')[1];

  return (
    <>
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, height: 0 }}
        whileHover={done ? {} : { scale: 0.995 }} whileTap={done ? {} : { scale: 0.98 }}
        className={`relative flex flex-col justify-between p-3 h-full ${statusClass} ${!done ? 'cursor-default' : ''} overflow-hidden rounded-xl border-4 border-black shadow-[4px_4px_0px_#000]`}
        style={!done && task.isValid ? { backgroundColor: dynamicColor.bg, color: dynamicColor.text } : {}}
      >

        <AnimatePresence>{showXP && (
          <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -20 }} exit={{ opacity: 0, y: -35 }}
            className="absolute -top-1 right-2 flex items-center gap-1 text-black font-black text-xs font-mono bg-[#CCFF00] px-2 py-0.5 rounded border-2 border-black">
            <Zap className="w-3.5 h-3.5 fill-black" /> +{xpAmt} XP
          </motion.div>
        )}</AnimatePresence>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded border-2 border-black uppercase text-black"
            style={{ backgroundColor: dynamicColor.badgeBg }}>
            {config.label}
          </span>
          <span className="text-[11px] font-mono font-extrabold" style={{ color: dynamicColor.text }}>{task.start}–{task.end}</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: dynamicColor.text }}>({dur}m)</span>
          
          {task.deadline && (
            <span className="text-[9px] font-mono font-bold bg-white text-black px-1.5 py-0.5 rounded border border-black flex items-center gap-1 shadow-[1px_1px_0px_#000]">
              <Clock className="w-2.5 h-2.5 stroke-[3]" />
              {dDate === activeDate ? `DUE ${dTime}` : `DUE ${dDate.slice(5)}`}
            </span>
          )}

          {!task.isValid && task.collisionWith && (
            <span className="text-[10px] font-mono text-white bg-[#FF007F] px-1.5 py-0.5 rounded border border-black flex items-center gap-1 ml-auto font-black">
              <AlertTriangle className="w-3 h-3 stroke-[3]" /> {task.collisionWith}
            </span>
          )}
        </div>

        <h3 className={`text-xs font-extrabold my-1 leading-tight line-clamp-2 ${done ? 'line-through opacity-60' : ''}`} style={{ color: dynamicColor.text }}>{task.task}</h3>

        {!done && task.isValid && (
          <div className="flex items-center gap-1.5 flex-wrap shrink-0 mt-auto pt-1">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleDone}
              className="max-btn !bg-white hover:!bg-[#CCFF00] !px-2.5 !py-1 text-[11px] font-black text-black flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000]">
              <Check className="w-3 h-3 stroke-[3]" /> Done
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowOvertime(!showOvertime); playClick(); }}
              className="max-btn !bg-[#FF70A6] hover:!bg-[#FF007F] hover:!text-white !px-2.5 !py-1 text-[11px] font-black text-black flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000]">
              <Clock className="w-3 h-3 stroke-[3]" /> OT
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowReschedule(true); playClick(); }}
              className="max-btn !bg-[#00F0FF] hover:!bg-[#4CC9F0] !px-2.5 !py-1 text-[11px] font-black text-black flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000]">
              <RotateCcw className="w-3 h-3 stroke-[3]" /> Shift
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSkip}
              className="max-btn !bg-[#FFE600] hover:!bg-[#FF9F1C] !px-2 !py-1 text-[11px] font-black text-black ml-auto flex items-center gap-1 border-2 border-black shadow-[2px_2px_0px_#000]">
              <SkipForward className="w-3 h-3 stroke-[3]" />
            </motion.button>
          </div>
        )}

        <AnimatePresence>{showOvertime && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1 flex items-center gap-1.5 overflow-hidden">
            <span className="text-[10px] font-mono text-black font-bold">End:</span>
            <input type="text" value={overtimeInput} onChange={(e) => setOvertimeInput(e.target.value)} placeholder="HH:MM" autoFocus
              className="w-16 px-2 py-0.5 text-xs font-mono text-black bg-white rounded border-2 border-black focus:outline-none focus:bg-[#CCFF00]" />
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleOvertime}
              className="max-btn !bg-[#FF007F] !text-white !px-2 !py-0.5 text-[10px] font-black border-2 border-black">Save</motion.button>
          </motion.div>
        )}</AnimatePresence>

        {done && (
          <div className="flex items-center gap-2 mt-auto pt-1">
            {task.status === 'done' && <button onClick={() => markDone(activeDate, task.id)} className="text-[10px] font-mono text-black font-black bg-[#CCFF00] hover:bg-[#b5e600] px-2 py-0.5 rounded border border-black flex items-center gap-1 cursor-pointer transition-all" title="Click to unmark task"><Check className="w-3 h-3 stroke-[3]" /> DONE {task.actualEnd && `@ ${task.actualEnd}`}</button>}
            {task.status === 'overtime' && <button onClick={() => markDone(activeDate, task.id)} className="text-[10px] font-mono text-white font-black bg-[#FF007F] hover:bg-[#e0006f] px-2 py-0.5 rounded border border-black flex items-center gap-1 cursor-pointer transition-all" title="Click to unmark task"><Clock className="w-3 h-3 stroke-[3]" /> OT {task.actualEnd && `@ ${task.actualEnd}`}</button>}
            {task.status === 'skipped' && <button onClick={() => skipTask(activeDate, task.id)} className="text-[10px] font-mono text-black font-black bg-[#FFE600] hover:bg-[#ffd000] px-2 py-0.5 rounded border border-black flex items-center gap-1 cursor-pointer transition-all" title="Click to unskip task"><SkipForward className="w-3 h-3 stroke-[3]" /> SKIPPED</button>}
          </div>
        )}
      </motion.div>

      <AnimatePresence>{showReschedule && (
        <RescheduleModal task={task} onConfirm={(s, e) => { handleRes(s, e); setShowReschedule(false); }} onClose={() => setShowReschedule(false)} />
      )}</AnimatePresence>
    </>
  );
}