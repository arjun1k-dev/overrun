'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { parseSchedule, generateSampleSchedule } from '@/engine/parser';
import { getDayOfWeekFromDate, getTodayKey } from '@/data/types';
import { playClick, playError, playShimmer } from '@/engine/sounds';
import { ClipboardPaste, AlertTriangle, CheckCircle2, Loader2, Trash2, Sparkles, Clock, CalendarDays } from 'lucide-react';
import type { DayOfWeek } from '@/data/types';
import type { ParseResult } from '@/engine/parser';

export function Dropzone() {
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const activeDate = useStore((s) => s.activeDate);
  const importTasks = useStore((s) => s.importTasks);
  const addTasks = useStore((s) => s.addTasks);
  const clearDayTasks = useStore((s) => s.clearDayTasks);

  const getActiveDayOfWeek = useCallback((): DayOfWeek => getDayOfWeekFromDate(new Date(activeDate + 'T00:00:00')), [activeDate]);

  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setTimeout(() => {
      const result = parseSchedule(rawText, getActiveDayOfWeek(), activeDate);
      setParseResult(result); setIsParsing(false);
      if (result.parseErrors.length > 0) { playError(); } else { playClick(); }
    }, 150);
  }, [rawText, getActiveDayOfWeek, activeDate]);

  const handleImport = useCallback(() => {
    if (!parseResult) return;
    const validOnly = parseResult.validTasks.filter((t) => t.isValid);
    if (!validOnly.length) { playError(); return; }

    if (parseResult.multiDate) {
      // Multi-date import: use addTasks to route each task to its own date
      addTasks(validOnly);
    } else {
      // Single-date import: overwrite the active day (legacy behavior)
      importTasks(activeDate, validOnly);
    }
    playShimmer(); setRawText(''); setParseResult(null);
  }, [parseResult, activeDate, importTasks, addTasks]);

  const handleClear = useCallback(() => { clearDayTasks(activeDate); playClick(); }, [activeDate, clearDayTasks]);
  const handleLoadSample = useCallback(() => { setRawText(generateSampleSchedule()); playClick(); }, []);
  const handlePaste = useCallback(async () => { try { setRawText(await navigator.clipboard.readText()); playClick(); } catch { /* */ } }, []);

  const hasErrors = parseResult && (parseResult.invalidLines.length > 0 || parseResult.collisionTasks.length > 0 || parseResult.pastTimeTasks.length > 0);
  const hasValidTasks = parseResult && parseResult.validTasks.some((t) => t.isValid);
  const hasPastTime = parseResult && parseResult.pastTimeTasks.length > 0;
  const isToday = activeDate === getTodayKey();
  const isMultiDate = parseResult?.multiDate;

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setParseResult(null); }}
          placeholder={`[DATE::YYYY-MM-DD] [START::HH:MM] [END::HH:MM] [TYPE::A|B|C] [DEADLINE::YYYY-MM-DD HH:MM] [TASK::Description]\n\nDATE is optional (defaults to ${activeDate}). Use DATE for multi-day scheduling.`}
          className="w-full h-40 px-5 py-4 text-sm font-mono text-indigo-900 placeholder:text-indigo-300 resize-none max-inset"
          spellCheck={false}
        />
        <button onClick={handlePaste} className="absolute top-3 right-3 p-2 rounded-xl bg-violet-100 border-2 border-violet-300 hover:bg-violet-200 transition-all">
          <ClipboardPaste className="w-4 h-4 text-violet-500" />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleParse} disabled={!rawText.trim() || isParsing}
          className="max-btn !px-5 !py-2.5 text-sm font-bold text-emerald-700 !bg-emerald-100 !border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
          {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isParsing ? 'Parsing...' : 'Parse Schedule'}
        </motion.button>

        <AnimatePresence>
          {hasValidTasks && (
            <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              whileTap={{ scale: 0.97 }} onClick={handleImport}
              className="max-btn !px-5 !py-2.5 text-sm font-bold text-amber-700 !bg-amber-100 !border-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {isMultiDate ? 'Import to Respective Dates' : 'Import Valid Tasks'}
              {isMultiDate && <CalendarDays className="w-3.5 h-3.5 text-violet-500" />}
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleLoadSample}
          className="max-btn !px-4 !py-2.5 text-xs font-mono font-bold text-violet-500 !bg-violet-50 !border-violet-200 flex items-center gap-1.5">
          Load Demo
        </motion.button>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleClear}
          className="max-btn !px-4 !py-2.5 text-xs font-mono font-bold text-red-500 !bg-red-50 !border-red-200 flex items-center gap-1.5 ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Clear Day
        </motion.button>
      </div>

      <AnimatePresence>
        {parseResult && (parseResult.parseErrors.length > 0 || hasValidTasks) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-4 text-xs font-mono text-indigo-500 mb-2 font-bold">
              <span className="text-emerald-600">{parseResult.validTasks.filter((t) => t.isValid).length} valid</span>
              {hasErrors && (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {parseResult.invalidLines.length + parseResult.collisionTasks.length + parseResult.pastTimeTasks.length} errors
                </span>
              )}
              {isMultiDate && (
                <span className="text-violet-500 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> multi-date
                </span>
              )}
            </div>

            {hasPastTime && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-orange-50 rounded-2xl border-2 border-orange-300 mb-2">
                <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-mono font-bold text-orange-700">{parseResult.pastTimeTasks.length} task{parseResult.pastTimeTasks.length > 1 ? 's' : ''} blocked — scheduled in the past</span>
                  {isToday && <span className="text-[10px] font-mono text-orange-500 block mt-0.5">Use &quot;Copy Full Context for AI&quot; below to get future-only slots.</span>}
                </div>
              </div>
            )}

            {parseResult.parseErrors.length > 0 && (
              <div className="max-h-32 overflow-y-auto overrun-scroll space-y-1">
                {parseResult.parseErrors.map((err, i) => (
                  <div key={i} className={`text-xs font-mono px-3 py-1.5 rounded-xl border-2 font-bold ${
                    err.includes('PAST TIME')
                      ? 'text-orange-700 bg-orange-50 border-orange-300'
                      : 'text-red-600 bg-red-50 border-red-200'
                  }`}>{err}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}