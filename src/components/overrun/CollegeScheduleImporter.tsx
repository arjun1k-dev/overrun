'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Copy, Check, ClipboardPaste, Trash2,
  CalendarDays, AlertCircle, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { CollegeBlock, DayOfWeek } from '@/data/types';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const DAY_COLORS: Record<DayOfWeek, string> = {
  MON: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  TUE: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  WED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  THU: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  FRI: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  SAT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  SUN: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const AI_PROMPT = `You are helping format a college timetable for the OVERRUN productivity app.
Parse the timetable I give you and output a JSON array of schedule block objects with this EXACT structure:

[
  { "day": "MON", "start": "HH:MM", "end": "HH:MM", "name": "Subject Name", "isBreak": false, "isTravel": false }
]

RULES:
- Use 24-hour time format only (e.g. 09:30, 14:00, 18:30)
- "day" must be one of exactly: MON, TUE, WED, THU, FRI, SAT, SUN
- Mark commute / travel blocks with "isTravel": true
- Mark lunch / break blocks with "isBreak": true
- For all other subjects: set both "isBreak" and "isTravel" to false
- Output ONLY the raw JSON array — no explanation, no markdown, no code block
- Do not include days that have no schedule

Here is my college timetable:
[PASTE YOUR TIMETABLE HERE]`;

function validateScheduleJSON(raw: string): { valid: boolean; blocks?: CollegeBlock[]; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { valid: false, error: 'Expected a JSON array [ ... ]' };
    if (parsed.length === 0) return { valid: false, error: 'Array is empty — no blocks found' };

    const validDays = new Set(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    const timeRegex = /^\d{2}:\d{2}$/;

    for (let i = 0; i < parsed.length; i++) {
      const b = parsed[i];
      if (!validDays.has(b.day)) return { valid: false, error: `Block ${i + 1}: "day" must be one of MON/TUE/WED/THU/FRI/SAT/SUN, got "${b.day}"` };
      if (!timeRegex.test(b.start)) return { valid: false, error: `Block ${i + 1}: "start" must be HH:MM format, got "${b.start}"` };
      if (!timeRegex.test(b.end)) return { valid: false, error: `Block ${i + 1}: "end" must be HH:MM format, got "${b.end}"` };
      if (!b.name || typeof b.name !== 'string') return { valid: false, error: `Block ${i + 1}: "name" is required` };
    }

    return { valid: true, blocks: parsed as CollegeBlock[] };
  } catch {
    return { valid: false, error: 'Invalid JSON — check for missing quotes, commas, or brackets' };
  }
}

export function CollegeScheduleImporter() {
  const collegeSchedule = useStore((s) => s.collegeSchedule);
  const setCollegeSchedule = useStore((s) => s.setCollegeSchedule);
  const clearCollegeSchedule = useStore((s) => s.clearCollegeSchedule);

  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; blocks?: CollegeBlock[]; error?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [showCurrentSchedule, setShowCurrentSchedule] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);

  const hasSchedule = collegeSchedule.length > 0;

  const scheduleByDay = useMemo(() => {
    const map: Record<DayOfWeek, CollegeBlock[]> = {
      MON: [], TUE: [], WED: [], THU: [], FRI: [], SAT: [], SUN: [],
    };
    for (const b of collegeSchedule) {
      if (map[b.day]) map[b.day].push(b);
    }
    return map;
  }, [collegeSchedule]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleValidate = () => {
    const result = validateScheduleJSON(pastedJson.trim());
    setValidationResult(result);
  };

  const handleSave = () => {
    if (!validationResult?.valid || !validationResult.blocks) return;
    setCollegeSchedule(validationResult.blocks);
    setSaved(true);
    setPastedJson('');
    setValidationResult(null);
    setShowImportForm(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    if (confirm('Remove your college schedule? This will clear all blocks from the timeline view.')) {
      clearCollegeSchedule();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="tactical-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-tactical">College Schedule</h3>
              <p className="text-xs text-tactical-muted">
                {hasSchedule
                  ? `${collegeSchedule.length} blocks loaded across ${DAYS.filter((d) => scheduleByDay[d].length > 0).length} days`
                  : 'No schedule set — import once, used everywhere'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasSchedule && (
              <>
                <button
                  onClick={() => setShowCurrentSchedule(!showCurrentSchedule)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-tactical transition-all"
                >
                  {showCurrentSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showCurrentSchedule ? 'Hide' : 'View Schedule'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </>
            )}
            <button
              onClick={() => setShowImportForm(!showImportForm)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 transition-all"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {hasSchedule ? 'Update Schedule' : 'Add Schedule'}
            </button>
          </div>
        </div>

        {/* Status Badge */}
        {hasSchedule ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">
              Schedule active — timeline will show your college blocks and smart scheduling will avoid them.
            </p>
            {saved && <span className="ml-auto text-xs font-bold text-emerald-400 animate-pulse">Saved!</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              No schedule yet. Use the AI import below to set it up once — it'll be saved permanently.
            </p>
          </div>
        )}
      </div>

      {/* Current Schedule View */}
      <AnimatePresence>
        {showCurrentSchedule && hasSchedule && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tactical-card p-6"
          >
            <h4 className="text-sm font-bold text-tactical mb-4">Your College Schedule</h4>
            <div className="space-y-3">
              {DAYS.filter((d) => scheduleByDay[d].length > 0).map((day) => (
                <div key={day} className="flex gap-3">
                  <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border shrink-0 w-10 text-center ${DAY_COLORS[day]}`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {scheduleByDay[day]
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((block, i) => (
                        <span
                          key={i}
                          className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
                            block.isBreak
                              ? 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                              : block.isTravel
                              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                              : 'bg-tactical-primary/10 border-tactical-primary/30 text-tactical-primary'
                          }`}
                        >
                          {block.start}–{block.end} {block.name}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Form */}
      <AnimatePresence>
        {showImportForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tactical-card p-6 space-y-6"
          >
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h4 className="text-sm font-bold text-tactical">Copy the AI Prompt</h4>
              </div>
              <p className="text-xs text-tactical-muted mb-3">
                Copy this prompt, then open <strong className="text-tactical">ChatGPT, Gemini, or any AI</strong> and paste it. Then paste your timetable image, PDF, or text below the prompt and ask it to generate the JSON.
              </p>
              <div className="relative">
                <pre className="text-xs font-mono text-tactical-muted bg-tactical-deep/80 border border-tactical-border rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
{AI_PROMPT}
                </pre>
                <button
                  onClick={handleCopyPrompt}
                  className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    copiedPrompt
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
                  }`}
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="text-sm font-bold text-tactical">Paste the AI's JSON Output</h4>
              </div>
              <p className="text-xs text-tactical-muted mb-3">
                The AI will give you a JSON array. Paste it here exactly as-is.
              </p>
              <textarea
                value={pastedJson}
                onChange={(e) => { setPastedJson(e.target.value); setValidationResult(null); }}
                placeholder={`[\n  { "day": "MON", "start": "10:30", "end": "12:30", "name": "Design Thinking", "isBreak": false, "isTravel": false },\n  ...\n]`}
                className="w-full h-40 bg-tactical-deep border border-tactical-border rounded-xl p-4 text-xs font-mono text-tactical-text focus:border-blue-500/60 focus:outline-none resize-none placeholder:text-tactical-muted/50"
              />
            </div>

            {/* Validation */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleValidate}
                disabled={!pastedJson.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Validate JSON
              </button>

              {validationResult?.valid && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Save Schedule ({validationResult.blocks?.length} blocks)
                </button>
              )}
            </div>

            {/* Validation Result */}
            <AnimatePresence>
              {validationResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-4 rounded-xl border ${
                    validationResult.valid
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {validationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-xs font-bold ${validationResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {validationResult.valid
                          ? `✓ Valid! Found ${validationResult.blocks?.length} blocks across ${new Set(validationResult.blocks?.map((b) => b.day)).size} days`
                          : 'Validation failed'}
                      </p>
                      {validationResult.error && (
                        <p className="text-xs text-rose-300 mt-1">{validationResult.error}</p>
                      )}
                      {validationResult.valid && validationResult.blocks && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {DAYS.filter((d) => validationResult.blocks!.some((b) => b.day === d)).map((d) => {
                            const count = validationResult.blocks!.filter((b) => b.day === d).length;
                            return (
                              <span key={d} className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${DAY_COLORS[d]}`}>
                                {d}: {count} block{count !== 1 ? 's' : ''}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
