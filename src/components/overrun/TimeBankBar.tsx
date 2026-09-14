'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { minutesToHM } from '@/data/types';
import { Flame, Zap, Timer } from 'lucide-react';

export function TimeBankBar() {
  const timeBank = useStore((s) => s.timeBank);
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);

  const isPositive = timeBank >= 0;
  const fillPercent = Math.min(100, (Math.abs(timeBank) / 120) * 100);

  return (
    <div className="w-full px-2 py-2 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]">
            <Timer className="w-4 h-4 text-black stroke-[3]" />
            <span className="text-xs font-mono font-black text-black">TIME BANK:</span>
            <span
              className={`text-sm font-black font-mono px-2 py-0.5 rounded border-2 border-black ${
                isPositive ? 'bg-[#CCFF00] text-black' : 'bg-[#FF007F] text-white'
              }`}
            >
              {minutesToHM(timeBank)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#FFE600] px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]">
            <Zap className="w-4 h-4 text-black fill-black stroke-[3]" />
            <span className="text-xs font-mono font-black text-black">XP</span>
            <span className="text-sm font-black font-mono text-black">{xp}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FF007F] text-white px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]">
              <Flame className="w-4 h-4 fill-white stroke-[3]" />
              <span className="text-sm font-black font-mono">{streak}d</span>
            </div>
          )}
        </div>
      </div>
      <div className="relative w-full h-4 rounded-xl bg-white overflow-hidden border-3 border-black shadow-[2px_2px_0px_#000]">
        <motion.div
          className={`absolute top-0 left-0 h-full ${isPositive ? 'bg-[#CCFF00]' : 'bg-[#FF007F]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}