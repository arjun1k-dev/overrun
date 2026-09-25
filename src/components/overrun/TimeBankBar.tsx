'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { minutesToHM } from '@/data/types';
import { Flame, Zap, Timer, Pause, Play, Square, History, X, AlertOctagon, TrendingUp, TrendingDown } from 'lucide-react';

export function TimeBankBar() {
  const timeBank = useStore((s) => s.timeBank);
  const xp = useStore((s) => s.xp);
  const streak = useStore((s) => s.streak);
  const activeSession = useStore((s) => s.activeSession);
  const timeBankLedger = useStore((s) => s.timeBankLedger) || [];

  const pauseActiveSession = useStore((s) => s.pauseActiveSession);
  const resumeActiveSession = useStore((s) => s.resumeActiveSession);
  const tickActiveSession = useStore((s) => s.tickActiveSession);
  const stopActiveSession = useStore((s) => s.stopActiveSession);

  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Live timer tick effect
  useEffect(() => {
    if (!activeSession || activeSession.isPaused) return;

    const interval = setInterval(() => {
      tickActiveSession();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.isPaused, !!activeSession, tickActiveSession]);

  const isPositive = timeBank >= 0;
  const fillPercent = Math.min(100, (Math.abs(timeBank) / 120) * 100);

  // Active session helper calculations
  const elapsedMinutes = activeSession ? Math.floor(activeSession.elapsedSeconds / 60) : 0;
  const elapsedSecsMod = activeSession ? activeSession.elapsedSeconds % 60 : 0;
  const projectedSaved = activeSession ? activeSession.plannedMinutes - elapsedMinutes : 0;

  return (
    <div className="w-full px-2 py-2 mb-2">
      {/* ⏱️ ACTIVE LIVE FOCUS SESSION BANNER */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="mb-3 p-3 rounded-2xl bg-[#0A1628] border-3 border-[#00F0FF] shadow-[4px_4px_0px_#00F0FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00F0FF]/20 border-2 border-[#00F0FF] flex items-center justify-center text-[#00F0FF] animate-pulse shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase font-black px-2 py-0.5 rounded bg-[#00F0FF] text-black">
                    Live Session
                  </span>
                  <h4 className="text-sm font-black text-white truncate max-w-[200px]" title={activeSession.taskTitle}>
                    {activeSession.taskTitle}
                  </h4>
                </div>
                <p className="text-xs font-mono text-slate-300 mt-0.5">
                  Planned: {activeSession.plannedMinutes}m • Projected Impact:{' '}
                  <span className={`font-bold ${projectedSaved >= 0 ? 'text-[#CCFF00]' : 'text-[#FF007F]'}`}>
                    {projectedSaved >= 0 ? `+${projectedSaved}m` : `${projectedSaved}m`}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right px-3 py-1 bg-black/60 rounded-xl border border-slate-700 font-mono text-lg font-black text-[#00F0FF]">
                {String(elapsedMinutes).padStart(2, '0')}:{String(elapsedSecsMod).padStart(2, '0')}
              </div>

              {activeSession.isPaused ? (
                <button
                  onClick={resumeActiveSession}
                  className="p-2 rounded-xl bg-[#CCFF00] text-black border-2 border-black font-black hover:scale-105 transition-transform"
                  title="Resume Session"
                >
                  <Play className="w-4 h-4 fill-black" />
                </button>
              ) : (
                <button
                  onClick={pauseActiveSession}
                  className="p-2 rounded-xl bg-[#FFE600] text-black border-2 border-black font-black hover:scale-105 transition-transform"
                  title="Pause Session"
                >
                  <Pause className="w-4 h-4 fill-black" />
                </button>
              )}

              <button
                onClick={() => stopActiveSession('done')}
                className="px-3 py-1.5 rounded-xl bg-[#00E676] text-black font-mono font-black text-xs border-2 border-black hover:scale-105 transition-transform"
              >
                Complete Task
              </button>

              <button
                onClick={() => stopActiveSession('skipped')}
                className="p-2 rounded-xl bg-[#FF007F] text-white border-2 border-black hover:scale-105 transition-transform"
                title="Cancel Session"
              >
                <Square className="w-4 h-4 fill-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN TIME BANK HEADER BAR */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Bank Button Trigger for Ledger Modal */}
          <button
            onClick={() => setShowLedgerModal(true)}
            className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer group"
          >
            <Timer className="w-4 h-4 text-black stroke-[3]" />
            <span className="text-xs font-mono font-black text-black">TIME BANK:</span>
            <span
              className={`text-sm font-black font-mono px-2 py-0.5 rounded border-2 border-black flex items-center gap-1 ${
                isPositive ? 'bg-[#CCFF00] text-black' : 'bg-[#FF007F] text-white animate-pulse'
              }`}
            >
              {minutesToHM(timeBank)}
              {!isPositive && <span className="text-[10px] uppercase font-bold">DEBT</span>}
            </span>
            <History className="w-3.5 h-3.5 text-slate-500 group-hover:text-black ml-1 transition-colors" />
          </button>

          {/* XP Display */}
          <div className="flex items-center gap-1.5 bg-[#FFE600] px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]">
            <Zap className="w-4 h-4 text-black fill-black stroke-[3]" />
            <span className="text-xs font-mono font-black text-black">XP</span>
            <span className="text-sm font-black font-mono text-black">{xp}</span>
          </div>

          {/* Streak Display */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FF007F] text-white px-3 py-1 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]">
              <Flame className="w-4 h-4 fill-white stroke-[3]" />
              <span className="text-sm font-black font-mono">{streak}d</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-4 rounded-xl bg-white overflow-hidden border-3 border-black shadow-[2px_2px_0px_#000]">
        <motion.div
          className={`absolute top-0 left-0 h-full ${isPositive ? 'bg-[#CCFF00]' : 'bg-[#FF007F]'}`}
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* 📜 TIME BANK TRANSACTION LEDGER MODAL */}
      <AnimatePresence>
        {showLedgerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A1628] border-3 border-black p-6 rounded-2xl max-w-xl w-full my-8 relative shadow-[8px_8px_0px_#00F0FF] text-white"
            >
              <button
                onClick={() => setShowLedgerModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 border-2 border-black text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700">
                <div className="p-2.5 rounded-xl bg-[#00F0FF] text-black border-2 border-black">
                  <History className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Time Bank Audit Ledger
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Current Balance:{' '}
                    <span className={`font-bold ${isPositive ? 'text-[#CCFF00]' : 'text-[#FF007F]'}`}>
                      {minutesToHM(timeBank)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Transactions List */}
              {timeBankLedger.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {timeBankLedger.map((tx) => {
                    const isPositiveTx = tx.deltaMinutes >= 0;
                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5">
                          {isPositiveTx ? (
                            <TrendingUp className="w-4 h-4 text-[#CCFF00] shrink-0" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-[#FF007F] shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-slate-200 line-clamp-1">{tx.reason}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(tx.timestamp).toLocaleTimeString()} • {tx.dateKey}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`font-black text-sm px-2 py-0.5 rounded border ${
                            isPositiveTx
                              ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-[#CCFF00]/30'
                              : 'bg-[#FF007F]/10 text-[#FF007F] border-[#FF007F]/30'
                          }`}
                        >
                          {isPositiveTx ? `+${tx.deltaMinutes}m` : `${tx.deltaMinutes}m`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 border border-dashed border-slate-700 rounded-xl bg-slate-900/50 text-slate-400 text-xs font-mono">
                  No time bank transactions recorded yet today. Complete tasks early or start focus sessions to log transactions!
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}