'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { playClick, playShimmer } from '@/engine/sounds';
import { ClipboardCopy, Save, Terminal, BookOpen } from 'lucide-react';

export function EODTerminal() {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const eodSummaries = useStore((s) => s.eodSummaries);
  const saveEODSummary = useStore((s) => s.saveEODSummary);

  const tasks = tasksByDate[activeDate] ?? [];
  const completedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'overtime');
  const existingSummary = eodSummaries.find((e) => e.dateKey === activeDate);

  const generateExportPrompt = useCallback(() => {
    if (!completedTasks.length) return '';
    const taskList = completedTasks.map((t) => `  - [${t.start}-${t.end}] ${t.task} (${t.type === 'A' ? 'Deep Work' : t.type === 'B' ? 'Memorization' : 'Chore'})`).join('\n');
    return `Summarize these learnings into concise mental models and key takeaways:\n\nDate: ${activeDate}\nCompleted Tasks:\n${taskList}\n\nPlease provide:\n1. Key Mental Models formed\n2. Concepts that clicked\n3. Open questions to explore\n4. Connections to previous knowledge`;
  }, [completedTasks, activeDate]);

  const handleCopy = useCallback(async () => {
    const p = generateExportPrompt(); if (!p) return;
    try { await navigator.clipboard.writeText(p); setCopied(true); playClick(); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  }, [generateExportPrompt]);

  const handleSave = useCallback(() => {
    if (!importText.trim()) return;
    saveEODSummary(activeDate, importText.trim(), completedTasks.map((t) => t.task));
    setSaved(true); playShimmer(); setTimeout(() => setSaved(false), 2000);
  }, [importText, activeDate, completedTasks, saveEODSummary]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-100 border border-emerald-300"><Terminal className="w-4 h-4 text-emerald-600" /></div>
        <h3 className="text-sm font-black text-indigo-900">EOD Terminal</h3>
        <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 ml-auto">{completedTasks.length} tasks completed</span>
      </div>

      {existingSummary && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300">
          <div className="flex items-center gap-2 mb-2"><BookOpen className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[10px] font-mono text-emerald-600 font-bold">Saved Summary</span></div>
          <p className="text-xs text-indigo-800 whitespace-pre-wrap leading-relaxed">{existingSummary.summary}</p>
        </motion.div>
      )}

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleCopy} disabled={!completedTasks.length}
        className="w-full !bg-emerald-100 !border-emerald-400 text-emerald-700 font-bold max-btn !py-3 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {copied ? <Save className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
        {copied ? 'Copied to Clipboard!' : 'Export Completed Tasks as AI Prompt'}
      </motion.button>

      <div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowImport(!showImport); playClick(); }}
          className="w-full !bg-blue-100 !border-blue-400 text-blue-700 font-bold max-btn !py-2.5 flex items-center justify-center gap-2">
          <Terminal className="w-4 h-4" /> {showImport ? 'Hide Import' : 'Import AI Summary'}
        </motion.button>

        <AnimatePresence>{showImport && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste the AI-generated summary here..."
              className="w-full h-32 px-4 py-3 text-xs font-mono text-indigo-900 placeholder:text-emerald-300 resize-none terminal-input focus:outline-none" />
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={!importText.trim()}
              className="mt-2 w-full !bg-emerald-200 !border-emerald-400 text-emerald-800 font-bold max-btn !py-2 disabled:opacity-30 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Summary'}
            </motion.button>
          </motion.div>
        )}</AnimatePresence>
      </div>
    </div>
  );
}