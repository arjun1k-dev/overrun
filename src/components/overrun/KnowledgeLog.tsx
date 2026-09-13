'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { BookOpen, Calendar } from 'lucide-react';

export function KnowledgeLog() {
  const eodSummaries = useStore((s) => s.eodSummaries);
  const sorted = useMemo(() => [...eodSummaries].sort((a, b) => b.createdAt - a.createdAt), [eodSummaries]);

  if (!sorted.length) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-violet-100 rounded-2xl border-2 border-violet-300 flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6 text-violet-500" />
        </div>
        <p className="text-sm font-bold text-violet-400">No knowledge summaries yet.</p>
        <p className="text-xs text-blue-400 mt-1">Use the EOD Terminal to log daily learnings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black text-indigo-900">Knowledge Log</h3>
      <div className="max-h-[500px] overflow-y-auto overrun-scroll pr-1 space-y-3">
        {sorted.map((entry, i) => {
          const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <motion.div key={entry.dateKey} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="max-card p-4 !border-l-violet-500">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-lg bg-violet-100 border border-violet-200"><Calendar className="w-3 h-3 text-violet-500" /></div>
                <span className="text-[11px] font-mono font-bold text-violet-600">{formattedDate}</span>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 ml-auto">{entry.taskNames.length} tasks</span>
              </div>
              {entry.taskNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {entry.taskNames.slice(0, 3).map((name, j) => (
                    <span key={j} className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-violet-50 text-violet-500 border border-violet-200 truncate max-w-[180px] font-bold">{name}</span>
                  ))}
                  {entry.taskNames.length > 3 && <span className="text-[9px] font-mono text-pink-400 font-bold">+{entry.taskNames.length - 3} more</span>}
                </div>
              )}
              <p className="text-xs text-indigo-800 whitespace-pre-wrap leading-relaxed">{entry.summary}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}