'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { playClick, playShimmer } from '@/engine/sounds';
import { timeToMinutes } from '@/data/types';
import { ClipboardCopy, Save, Terminal, BookOpen, Activity, Flame, Zap, Award } from 'lucide-react';

export function EODTerminal() {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const dailyTimeBank = useStore((s) => s.dailyTimeBank);
  const xp = useStore((s) => s.xp);
  const eodSummaries = useStore((s) => s.eodSummaries);
  const saveEODSummary = useStore((s) => s.saveEODSummary);

  const tasks = tasksByDate[activeDate] ?? [];
  const completedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'overtime');
  const existingSummary = eodSummaries.find((e) => e.dateKey === activeDate);

  // Deep Daily Telemetry Analytics
  const telemetry = useMemo(() => {
    const totalTasks = tasks.length;
    const completedCount = completedTasks.length;
    const deepWorkCount = completedTasks.filter((t) => t.type === 'A').length;

    let plannedMinutesTotal = 0;
    let completedMinutesTotal = 0;

    tasks.forEach((t) => {
      const dur = Math.max(1, timeToMinutes(t.end) - timeToMinutes(t.start));
      plannedMinutesTotal += dur;
      if (t.status === 'done' || t.status === 'overtime') {
        completedMinutesTotal += dur;
      }
    });

    const completionRatePct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
    const deepWorkRatioPct = completedCount > 0 ? Math.round((deepWorkCount / completedCount) * 100) : 0;
    const netTimeBankDelta = dailyTimeBank[activeDate] ?? 0;

    return {
      totalTasks,
      completedCount,
      deepWorkCount,
      plannedMinutesTotal,
      completedMinutesTotal,
      completionRatePct,
      deepWorkRatioPct,
      netTimeBankDelta,
    };
  }, [tasks, completedTasks, dailyTimeBank, activeDate]);

  const generateExportPrompt = useCallback(() => {
    if (!completedTasks.length) return '';
    const taskList = completedTasks
      .map((t) => `  - [${t.start}-${t.end}] ${t.task} (${t.type === 'A' ? 'Deep Work' : t.type === 'B' ? 'Memorization' : 'Chore'})`)
      .join('\n');

    return `---
date: "${activeDate}"
type: "eod_summary"
completed_tasks_count: ${telemetry.completedCount}
deep_work_ratio_pct: ${telemetry.deepWorkRatioPct}
net_time_bank_delta: ${telemetry.netTimeBankDelta}
---

# 🚀 OVERRUN End-of-Day Telemetry Report — ${activeDate}
- **Completed Tasks:** ${telemetry.completedCount}/${telemetry.totalTasks} (${telemetry.completionRatePct}%)
- **Deep Work Focus Ratio:** ${telemetry.deepWorkRatioPct}%
- **Total Focus Time:** ${telemetry.completedMinutesTotal} mins / ${telemetry.plannedMinutesTotal} mins planned
- **Net Time Bank Delta:** ${telemetry.netTimeBankDelta >= 0 ? `+${telemetry.netTimeBankDelta}m` : `${telemetry.netTimeBankDelta}m`}

## Completed Task Log
${taskList}

Please summarize key mental models, concepts mastered, and open questions from today's study session.`;
  }, [completedTasks, activeDate, telemetry]);

  const handleCopy = useCallback(async () => {
    const p = generateExportPrompt();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p);
      setCopied(true);
      playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  }, [generateExportPrompt]);

  const handleSave = useCallback(() => {
    if (!importText.trim()) return;
    saveEODSummary(activeDate, importText.trim(), completedTasks.map((t) => t.task));

    // Save EOD Markdown file to disk via API
    fetch('/api/knowledge/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'progress_update',
        data: {
          topic: `EOD Summary ${activeDate}`,
          date: activeDate,
          progress_before: 50,
          progress_after: telemetry.completionRatePct,
          time_spent_min: telemetry.completedMinutesTotal,
          quality: telemetry.deepWorkRatioPct >= 50 ? 'high' : 'medium',
        },
        rawContent: importText,
      }),
    }).catch((e) => console.error('Failed to save EOD file to disk:', e));

    setSaved(true);
    playShimmer();
    setTimeout(() => setSaved(false), 2000);
  }, [importText, activeDate, completedTasks, saveEODSummary, telemetry]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-100 border border-emerald-300">
          <Terminal className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="text-sm font-black text-indigo-900">EOD Telemetry & Summary Terminal</h3>
        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 ml-auto">
          {completedTasks.length} / {tasks.length} tasks done
        </span>
      </div>

      {/* Deep Daily Telemetry Grid */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 rounded-xl border-2 border-black text-white font-mono text-xs shadow-[2px_2px_0px_#000]">
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-black">Completion</p>
          <p className="text-sm font-black text-[#00F0FF]">{telemetry.completionRatePct}%</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-black">Deep Work</p>
          <p className="text-sm font-black text-[#CCFF00]">{telemetry.deepWorkRatioPct}%</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-black">Time Bank Δ</p>
          <p className={`text-sm font-black ${telemetry.netTimeBankDelta >= 0 ? 'text-[#00E676]' : 'text-[#FF007F]'}`}>
            {telemetry.netTimeBankDelta >= 0 ? `+${telemetry.netTimeBankDelta}m` : `${telemetry.netTimeBankDelta}m`}
          </p>
        </div>
      </div>

      {existingSummary && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] text-emerald-700 font-bold">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saved EOD Summary ({activeDate})</span>
          </div>
          <p className="text-xs text-indigo-900 whitespace-pre-wrap leading-relaxed font-mono">{existingSummary.summary}</p>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCopy}
        disabled={!completedTasks.length}
        className="w-full !bg-[#00F0FF] hover:!bg-[#CCFF00] text-black font-black max-btn !py-3 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_#000]"
      >
        {copied ? <Save className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
        {copied ? 'Copied Telemetry Snapshot!' : 'Export EOD Telemetry Snapshot (Notebook LM)'}
      </motion.button>

      <div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setShowImport(!showImport);
            playClick();
          }}
          className="w-full !bg-[#FFE600] hover:!bg-[#FF9F1C] text-black font-black max-btn !py-2.5 flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_#000]"
        >
          <Terminal className="w-4 h-4" /> {showImport ? 'Hide Import Form' : 'Import AI EOD Summary'}
        </motion.button>

        <AnimatePresence>
          {showImport && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden space-y-2"
            >
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste the AI-generated EOD summary or learnings note here..."
                className="w-full h-32 px-4 py-3 text-xs font-mono text-indigo-900 bg-white rounded-xl border-2 border-black focus:outline-none focus:bg-[#CCFF00]"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!importText.trim()}
                className="w-full !bg-[#CCFF00] hover:!bg-[#00E676] text-black font-black max-btn !py-2 disabled:opacity-30 flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0px_#000]"
              >
                <Save className="w-4 h-4" /> {saved ? 'Saved & Exported to Disk!' : 'Save Summary & Sync'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}