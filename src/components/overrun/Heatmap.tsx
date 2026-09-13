 'use client';

 import { useMemo } from 'react';
 import { useStore } from '@/store/useStore';
 import { getDateKey } from '@/data/types';

 const DAYS_TO_SHOW = 90;
 const CELL_SIZE = 14;
 const CELL_GAP = 3;

 export function Heatmap() {
   const dailyTimeBank = useStore((s) => s.dailyTimeBank);

   const cells = useMemo(() => {
     const result: { dateKey: string; netMinutes: number; weekCol: number; dayRow: number }[] = [];
     const today = new Date();
     for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
       const d = new Date(today); d.setDate(d.getDate() - i);
       result.push({ dateKey: getDateKey(d), netMinutes: dailyTimeBank[getDateKey(d)] ?? 0, weekCol: Math.floor((DAYS_TO_SHOW - 1 - i) / 7), dayRow: d.getDay() });
     }
     return result;
   }, [dailyTimeBank]);

   const maxWeek = useMemo(() => Math.max(...cells.map((c) => c.weekCol), 0), [cells]);
   const getColor = (n: number) => {
     if (n === 0) return 'bg-indigo-100';
     if (n > 0) { if (n >= 60) return 'bg-emerald-500'; if (n >= 30) return 'bg-emerald-400'; if (n >= 15) return 'bg-emerald-300'; return 'bg-emerald-200'; }
     if (n <= -60) return 'bg-red-500'; if (n <= -30) return 'bg-red-400'; if (n <= -15) return 'bg-red-300'; return 'bg-red-200';
   };

   const totalActive = Object.keys(dailyTimeBank).filter((k) => dailyTimeBank[k] !== 0).length;
   const posDays = Object.values(dailyTimeBank).filter((v) => v > 0).length;
   const totalGained = Object.values(dailyTimeBank).reduce((s, v) => s + Math.max(0, v), 0);

   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <h3 className="text-sm font-black text-indigo-900">Activity Heatmap</h3>
         <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">Last {DAYS_TO_SHOW} days</span>
       </div>

       <div className="grid grid-cols-3 gap-3">
         <div className="max-card p-3 text-center !border-l-indigo-500"><div className="text-lg font-black font-mono text-indigo-600">{totalActive}</div><div className="text-[10px] font-mono text-blue-500 font-bold">Active Days</div></div>
         <div className="max-card p-3 text-center !border-l-emerald-500"><div className="text-lg font-black font-mono text-emerald-600">{posDays}</div><div className="text-[10px] font-mono text-emerald-500 font-bold">Net Positive</div></div>
         <div className="max-card p-3 text-center !border-l-amber-500"><div className="text-lg font-black font-mono text-amber-600">{Math.floor(totalGained / 60)}h</div><div className="text-[10px] font-mono text-amber-500 font-bold">Total Gained</div></div>
       </div>

       <div className="overflow-x-auto overrun-scroll pb-2">
         <div className="relative" style={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`, gridTemplateColumns: `repeat(${maxWeek + 1}, ${CELL_SIZE}px)`, gap: `${CELL_GAP}px`, width: (maxWeek + 1) * (CELL_SIZE + CELL_GAP) }}>
           {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((label, row) => (
             <div key={`l-${row}`} className="text-[8px] font-mono text-indigo-400 flex items-center font-bold" style={{ gridRow: row + 1, gridColumn: 1 }}>{label}</div>
           ))}
           {cells.map((cell, i) => (
             <div key={cell.dateKey} className={`${getColor(cell.netMinutes)} rounded-[3px] heatmap-cell cursor-default hover:ring-2 hover:ring-violet-400 transition-all`}
               style={{ gridRow: cell.dayRow + 1, gridColumn: cell.weekCol + 2, animationDelay: `${i * 3}ms`, width: CELL_SIZE, height: CELL_SIZE }}
               title={`${cell.dateKey}: ${cell.netMinutes > 0 ? '+' : ''}${cell.netMinutes}m`} />
           ))}
         </div>
       </div>

       <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-blue-400 font-bold">
         <span>Less</span>
         <div className="w-3 h-3 rounded-[2px] bg-indigo-100" /><div className="w-3 h-3 rounded-[2px] bg-emerald-200" /><div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
         <div className="w-3 h-3 rounded-[2px] bg-indigo-100" /><div className="w-3 h-3 rounded-[2px] bg-red-200" /><div className="w-3 h-3 rounded-[2px] bg-red-400" /><div className="w-3 h-3 rounded-[2px] bg-red-500" />
         <span>More</span>
       </div>
     </div>
   );
 }