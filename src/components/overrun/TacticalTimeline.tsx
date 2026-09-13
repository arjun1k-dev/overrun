'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Play, SkipForward,
  CheckCircle2, XCircle, AlertCircle,
  Calendar, ZoomIn, ZoomOut, Copy, X,
  ArrowRight, ShieldAlert, Check, Zap, Target
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getTodayKey, timeToMinutes, minutesToTime } from '@/data/types';

export function TacticalTimeline() {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 480px/hr (11520px width), 1.5 = 720px/hr, 2 = 960px/hr
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [overtimeEndInput, setOvertimeEndInput] = useState('');
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [nowMins, setNowMins] = useState(0);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const markDone = useStore((s) => s.markDone);
  const markOvertime = useStore((s) => s.markOvertime);
  const skipTask = useStore((s) => s.skipTask);
  const importTasks = useStore((s) => s.importTasks);
  const setActiveDate = useStore((s) => s.setActiveDate);
  const seedPhase1Timeline = useStore((s) => s.seedPhase1Timeline);

  useEffect(() => {
    const updateNow = () => {
      const d = new Date();
      setNowMins(d.getHours() * 60 + d.getMinutes());
    };
    updateNow();
    const interval = setInterval(updateNow, 5000);
    return () => clearInterval(interval);
  }, []);

  const tasksToday = tasksByDate[activeDate] || [];

  const [syncedPhase1, setSyncedPhase1] = useState(false);

  useEffect(() => {
    const today = getTodayKey();
    if (!tasksByDate[today] || tasksByDate[today].length === 0 || Object.keys(tasksByDate).length < 5) {
      seedPhase1Timeline();
    }
  }, [tasksByDate, seedPhase1Timeline]);

  const handleSyncPhase1 = () => {
    seedPhase1Timeline();
    setSyncedPhase1(true);
    setTimeout(() => setSyncedPhase1(false), 2000);
  };

  // Convert real store tasks into spacious timeline blocks
  const blocks = useMemo(() => {
    return tasksToday.map((t) => {
      let typeLabel = 'DEEP WORK';
      let typeBg = 'bg-tactical-primary/20 text-tactical-primary border-tactical-primary/40';
      if (t.type === 'B') {
        typeLabel = 'REVIEW';
        typeBg = 'bg-tactical-warning/20 text-tactical-warning border-tactical-warning/40';
      } else if (t.type === 'C') {
        typeLabel = 'CHORE';
        typeBg = 'bg-tactical-purple/20 text-tactical-purple border-tactical-purple/40';
      }

      const startMin = timeToMinutes(t.start);
      const endMin = timeToMinutes(t.end);
      const durationMin = Math.max(15, endMin - startMin);

      const isDone = (t.status as string) === 'done' || (t.status as string) === 'completed' || t.status === 'overtime';
      const isSkipped = t.status === 'skipped';

      let statusLabel = 'upcoming';
      if (isDone) statusLabel = 'completed';
      if (isSkipped) statusLabel = 'missed';

      // 1. ACTIVE NOW: Timeline pointer (nowMins) falls inside task start -> end duration
      const isActiveNow =
        activeDate === getTodayKey() &&
        nowMins >= startMin &&
        nowMins < endMin &&
        !isDone &&
        !isSkipped;

      // 2. OVERDUE: Task time window has passed, but task was NOT marked completed or skipped
      const isOverdue =
        !isDone &&
        !isSkipped &&
        !isActiveNow &&
        (activeDate < getTodayKey() || (activeDate === getTodayKey() && nowMins >= endMin));

      if (isActiveNow) statusLabel = 'in_progress';
      if (isOverdue) statusLabel = 'missed';

      return {
        ...t,
        typeLabel,
        typeBg,
        statusLabel,
        startMin,
        endMin,
        durationMin,
        isActiveNow,
        isOverdue,
      };
    });
  }, [tasksToday, activeDate, nowMins]);

  // Track allocation algorithm to completely eliminate ANY card overlap
  const blocksWithTracks = useMemo(() => {
    const filtered = blocks.filter((b) => showCompleted || b.statusLabel !== 'completed');
    const sorted = [...filtered].sort((a, b) => a.startMin - b.startMin);
    const tracks: typeof sorted[] = [];

    return sorted.map((block) => {
      let assignedTrack = -1;
      for (let i = 0; i < tracks.length; i++) {
        const lastInTrack = tracks[i][tracks[i].length - 1];
        if (lastInTrack.endMin <= block.startMin) {
          assignedTrack = i;
          tracks[i].push(block);
          break;
        }
      }

      if (assignedTrack === -1) {
        assignedTrack = tracks.length;
        tracks.push([block]);
      }

      return {
        ...block,
        track: assignedTrack,
      };
    });
  }, [blocks, showCompleted]);

  const maxTracks = useMemo(() => {
    return Math.max(1, Math.max(...blocksWithTracks.map((b) => b.track), 0) + 1);
  }, [blocksWithTracks]);

  const selectedTask = useMemo(() => {
    return blocks.find((b) => b.id === selectedTaskId) || null;
  }, [blocks, selectedTaskId]);

  const completedCount = blocks.filter((b) => b.statusLabel === 'completed').length;
  const overdueCount = blocks.filter((b) => b.isOverdue).length;
  const missedCount = blocks.filter((b) => b.statusLabel === 'missed').length;
  const efficiency = blocks.length > 0 ? Math.round((completedCount / blocks.length) * 100) : 0;

  // Grid dimensions: Generous spacing (480px per hour)
  const HOUR_WIDTH_PX = Math.round(480 * zoomLevel);
  const HALF_HOUR_WIDTH_PX = HOUR_WIDTH_PX / 2;     // 240px per 30 minutes!
  const totalGridWidthPx = 24 * HOUR_WIDTH_PX;       // 11520px total width
  const gridHeightPx = maxTracks * 98 + 30;

  const getCurrentTimePx = () => {
    return (nowMins / 60) * HOUR_WIDTH_PX;
  };

  const scrollToCurrentTime = (smooth = true) => {
    if (!gridScrollRef.current || activeDate !== getTodayKey()) return;
    const containerWidth = gridScrollRef.current.clientWidth;
    const timePx = (nowMins / 60) * HOUR_WIDTH_PX;
    const targetScrollLeft = Math.max(0, timePx - containerWidth / 2);

    gridScrollRef.current.scrollTo({
      left: targetScrollLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      if (activeDate === getTodayKey()) {
        scrollToCurrentTime(true);
      }
    }, 10000); // 10 seconds of inactivity
  };

  // Auto-scroll on mount, tab switch, date switch, or zoom change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentTime(true);
    }, 350);
    resetInactivityTimer();
    return () => {
      clearTimeout(timer);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [activeDate, zoomLevel]);

  const handleCopyContext = (task: typeof blocks[0]) => {
    const formatted = `[DATE::${task.dateKey}] [START::${task.start}] [END::${task.end}] [TYPE::${task.type}] [TASK::${task.task}]`;
    navigator.clipboard.writeText(formatted);
    setCopiedContext(true);
    setTimeout(() => setCopiedContext(false), 2000);
  };

  const handleExportSnapshot = () => {
    const lines = [
      `# 📅 OVERRUN Timeline Snapshot — ${activeDate}`,
      `- Total Missions: ${blocks.length}`,
      `- Completed: ${completedCount}`,
      `- Overdue/Missed: ${overdueCount + missedCount}`,
      `- Efficiency Rate: ${efficiency}%`,
      '',
      '## Scheduled Mission Blocks',
    ];

    blocks.forEach((b) => {
      const statusText = b.isOverdue
        ? 'OVERDUE'
        : b.isActiveNow
        ? 'ACTIVE NOW'
        : b.status.toUpperCase();
      lines.push(`- [${b.start} - ${b.end}] ${b.task} (Status: ${statusText}, Type: ${b.type})`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2000);
  };

  const handleOvertimeSubmit = () => {
    if (!selectedTask || !overtimeEndInput) return;
    markOvertime(activeDate, selectedTask.id, overtimeEndInput);
    setShowOvertimeModal(false);
    setOvertimeEndInput('');
  };

  return (
    <div className="space-y-6">
      {/* Timeline Controls Card */}
      <div className="tactical-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-tactical-primary" />
            <div>
              <h2 className="text-lg font-semibold text-tactical">Mission Schedule Timeline ({activeDate})</h2>
              <p className="text-xs text-tactical-muted font-mono">
                Horizontal Shimmer Pulse Waves • 🟢 Active Task • 🔴 Overdue Task
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeDate === getTodayKey() && (
              <button
                onClick={() => scrollToCurrentTime(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 font-bold"
                title="Scroll to Current Time Pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Scroll to Now
              </button>
            )}

            <button
              onClick={handleSyncPhase1}
              className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:border-purple-400 font-bold"
              title="Force Sync / Re-seed Phase 1 Timeline Tasks"
            >
              <Zap className="w-3.5 h-3.5" />
              {syncedPhase1 ? 'Phase 1 Timeline Synced!' : 'Sync Phase 1 Schedule'}
            </button>

            <button
              onClick={handleExportSnapshot}
              className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all bg-tactical-primary/20 text-tactical-primary border border-tactical-primary/40 hover:border-tactical-primary"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedSnapshot ? 'Copied Snapshot!' : 'Export Timeline Snapshot'}
            </button>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
                showCompleted
                  ? 'bg-tactical-success/20 text-tactical-success border border-tactical-success/30'
                  : 'bg-[#0A1628]/50 text-tactical-muted border border-tactical-border'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {showCompleted ? 'Hide Completed' : 'Show Completed'}
            </button>

            <div className="flex items-center bg-tactical-deep/50 rounded-lg border border-tactical-border p-1">
              <button
                onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.2))}
                className="p-1.5 rounded hover:bg-tactical-surface text-tactical-muted hover:text-tactical transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-2.5 text-tactical-primary font-bold">
                {Math.round(zoomLevel * 100)}% ({HOUR_WIDTH_PX}px/hr)
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.2))}
                className="p-1.5 rounded hover:bg-tactical-surface text-tactical-muted hover:text-tactical transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Current Date Display */}
        <div className="flex items-center gap-2 mb-6 font-mono">
          <span className="text-xs text-tactical-muted">Current View:</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-tactical-primary/20 text-tactical-primary border border-tactical-primary/40">
            {activeDate}
          </span>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0A1628]/50 rounded-lg p-3 border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase tracking-wider mb-1">Missions Scheduled</p>
            <p className="text-xl font-bold text-tactical font-mono">{blocks.length}</p>
          </div>
          <div className="bg-[#0A1628]/50 rounded-lg p-3 border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase tracking-wider mb-1">Completed</p>
            <p className="text-xl font-bold text-tactical-success font-mono">{completedCount}</p>
          </div>
          <div className="bg-[#0A1628]/50 rounded-lg p-3 border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase tracking-wider mb-1">Overdue / Missed</p>
            <p className="text-xl font-bold text-tactical-danger font-mono">{overdueCount + missedCount}</p>
          </div>
          <div className="bg-[#0A1628]/50 rounded-lg p-3 border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase tracking-wider mb-1">Efficiency Rate</p>
            <p className="text-xl font-bold text-tactical-primary font-mono">{efficiency}%</p>
          </div>
        </div>

        {/* Horizontally Scrollable 24-Hour Grid with 30-Min Reference Lines */}
        {blocks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-tactical-border rounded-xl">
            <Calendar className="w-8 h-8 text-tactical-muted mx-auto mb-2" />
            <p className="text-sm text-tactical font-medium">No missions loaded for {activeDate}</p>
            <p className="text-xs text-tactical-muted mt-1">Use the Dropzone or Import tab to load schedule blocks.</p>
          </div>
        ) : (
          <div
            ref={gridScrollRef}
            onScroll={resetInactivityTimer}
            onMouseMove={resetInactivityTimer}
            onTouchStart={resetInactivityTimer}
            className="bg-[#0A1628]/80 border border-tactical-border rounded-xl p-5 overflow-x-auto overrun-scroll"
          >
            <div className="relative pt-8 pb-4" style={{ width: `${totalGridWidthPx}px` }}>
              {/* 30-Min Vertical Grid Lines & Headers */}
              <div className="relative" style={{ height: `${gridHeightPx}px` }}>
                {Array.from({ length: 48 }, (_, i) => {
                  const hour = Math.floor(i / 2);
                  const isHalfHour = i % 2 === 1;
                  const timeLabel = isHalfHour
                    ? `${String(hour).padStart(2, '0')}:30`
                    : `${String(hour).padStart(2, '0')}:00`;

                  return (
                    <div
                      key={i}
                      className={`absolute top-0 bottom-0 border-l ${
                        isHalfHour
                          ? 'border-dashed border-tactical-border/30'
                          : 'border-solid border-tactical-border/60'
                      }`}
                      style={{ left: `${i * HALF_HOUR_WIDTH_PX}px`, width: `${HALF_HOUR_WIDTH_PX}px` }}
                    >
                      <span className={`absolute -top-7 left-2 font-mono ${
                        isHalfHour
                          ? 'text-[10px] text-tactical-muted/60'
                          : 'text-xs text-tactical-muted font-bold tracking-wider'
                      }`}>
                        {timeLabel}
                      </span>
                    </div>
                  );
                })}

                {/* Current Time Indicator Line */}
                {activeDate === getTodayKey() && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-tactical-danger z-40 pointer-events-none"
                    style={{ left: `${getCurrentTimePx()}px` }}
                  >
                    <div className="absolute -top-2 -translate-x-1/2 w-4 h-4 bg-tactical-danger rounded-full shadow-lg shadow-tactical-danger/80 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    </div>
                  </div>
                )}

                {/* Spacious Non-Overlapping Mission Cards with Framer-Motion Horizontal Pulse Waves */}
                <div className="relative h-full">
                  <AnimatePresence>
                    {blocksWithTracks.map((block) => {
                      const leftPx = (block.startMin / 60) * HOUR_WIDTH_PX;
                      const widthPx = Math.max(220, (block.durationMin / 60) * HOUR_WIDTH_PX);
                      const topPx = block.track * 94 + 6;
                      const isSelected = selectedTaskId === block.id;

                      let baseStyle = `${block.typeBg} bg-tactical-surface/95 border-tactical-border/80`;
                      if (isSelected) {
                        baseStyle += ' ring-2 ring-tactical-primary border-tactical-primary z-30';
                      }

                      return (
                        <motion.div
                          key={block.id}
                          onClick={() => setSelectedTaskId(isSelected ? null : block.id)}
                          whileHover={{ scale: 1.01, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`absolute rounded-xl px-4 py-3 border cursor-pointer transition-all flex flex-col justify-between shadow-xl overflow-hidden ${baseStyle}`}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            top: `${topPx}px`,
                            height: '86px',
                            zIndex: isSelected ? 35 : (block.isActiveNow || block.isOverdue) ? 25 : 10 + block.track,
                          }}
                        >
                          {/* ========================================================= */}
                          {/* 🟢 GREEN HORIZONTAL PULSE SHIFTER (ACTIVE NOW)           */}
                          {/* ========================================================= */}
                          {block.isActiveNow && (
                            <>
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none z-10"
                              />
                              <motion.div
                                animate={{
                                  opacity: [0.5, 1, 0.5],
                                  boxShadow: [
                                    '0 0 10px rgba(16,185,129,0.4), inset 0 0 10px rgba(16,185,129,0.2)',
                                    '0 0 25px rgba(16,185,129,0.9), inset 0 0 20px rgba(16,185,129,0.5)',
                                    '0 0 10px rgba(16,185,129,0.4), inset 0 0 10px rgba(16,185,129,0.2)',
                                  ],
                                }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                                className="absolute inset-0 rounded-xl border-2 border-emerald-400 pointer-events-none z-20"
                              />
                            </>
                          )}

                          {/* ========================================================= */}
                          {/* 🔴 RED HORIZONTAL PULSE SHIFTER (OVERDUE / TIME PASSED)  */}
                          {/* ========================================================= */}
                          {block.isOverdue && (
                            <>
                              <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent pointer-events-none z-10"
                              />
                              <motion.div
                                animate={{
                                  opacity: [0.6, 1, 0.6],
                                  boxShadow: [
                                    '0 0 12px rgba(239,68,68,0.5), inset 0 0 10px rgba(239,68,68,0.3)',
                                    '0 0 32px rgba(239,68,68,1), inset 0 0 25px rgba(239,68,68,0.6)',
                                    '0 0 12px rgba(239,68,68,0.5), inset 0 0 10px rgba(239,68,68,0.3)',
                                  ],
                                }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                className="absolute inset-0 rounded-xl border-2 border-rose-500 pointer-events-none z-20"
                              />
                            </>
                          )}

                          {/* Card Content */}
                          <div className="flex items-center justify-between gap-2 relative z-30">
                            <span className="text-xs font-bold text-tactical-text truncate font-sans tracking-wide">
                              {block.task}
                            </span>

                            {block.isActiveNow ? (
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500 text-white animate-pulse flex items-center gap-1 shrink-0 shadow-lg shadow-emerald-500/40">
                                <Zap className="w-3 h-3 fill-white" /> ACTIVE NOW
                              </span>
                            ) : block.isOverdue ? (
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse flex items-center gap-1 shrink-0 shadow-lg shadow-rose-500/40">
                                <AlertCircle className="w-3 h-3" /> OVERDUE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-current shrink-0">
                                {block.typeLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-tactical-muted font-semibold mt-1 relative z-30">
                            <span className="bg-tactical-deep/90 px-2 py-0.5 rounded border border-tactical-border/80 text-tactical-text font-bold">
                              {block.start} - {block.end}
                            </span>
                            <span className="text-tactical-primary font-bold">
                              {block.durationMin} mins
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-tactical-border/60 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 border-2 border-emerald-400 animate-pulse shadow-md shadow-emerald-500/30" />
                  <span className="text-emerald-400 font-bold">🟢 Active Task (Green Horizontal Pulse)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-rose-500/30 border-2 border-rose-500 animate-pulse shadow-md shadow-rose-500/30" />
                  <span className="text-rose-400 font-bold">🔴 Overdue Task (Red Horizontal Pulse)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-tactical-primary/30 border border-tactical-primary" />
                  <span className="text-tactical-text font-bold">Type A (Deep Work)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-tactical-warning/30 border border-tactical-warning" />
                  <span className="text-tactical-text font-bold">Type B (Review)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Task Details & Interactive Actions Drawer */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="tactical-card p-6 border-2 border-tactical-primary/60 bg-tactical-surface shadow-2xl relative"
          >
            <button
              onClick={() => setSelectedTaskId(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-tactical transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-tactical-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${selectedTask.typeBg}`}>
                    {selectedTask.typeLabel} (TYPE {selectedTask.type})
                  </span>
                  {selectedTask.isActiveNow && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                      ⚡ ACTIVE NOW
                    </span>
                  )}
                  {selectedTask.isOverdue && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                      ⚠️ OVERDUE
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-tactical-text">{selectedTask.task}</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <span className="text-xs text-tactical-muted block">Scheduled Window</span>
                  <span className="text-sm font-bold text-tactical-primary">
                    {selectedTask.start} → {selectedTask.end} ({selectedTask.durationMin} mins)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Details & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-tactical-deep/60 p-3 rounded-lg border border-tactical-border/60">
                <span className="text-[10px] font-mono uppercase text-tactical-muted block">Status</span>
                <span className={`text-sm font-bold capitalize font-mono ${
                  selectedTask.status === 'done' ? 'text-tactical-success' :
                  selectedTask.status === 'overtime' ? 'text-tactical-warning' :
                  selectedTask.isOverdue ? 'text-rose-400 font-extrabold' :
                  selectedTask.status === 'skipped' ? 'text-tactical-danger' : 'text-tactical-primary'
                }`}>
                  {selectedTask.isOverdue ? 'OVERDUE' : selectedTask.status.toUpperCase()}
                </span>
              </div>

              <div className="bg-tactical-deep/60 p-3 rounded-lg border border-tactical-border/60">
                <span className="text-[10px] font-mono uppercase text-tactical-muted block">Target Date</span>
                <span className="text-sm font-bold text-tactical-text font-mono">{selectedTask.dateKey}</span>
              </div>

              <div className="bg-tactical-deep/60 p-3 rounded-lg border border-tactical-border/60">
                <span className="text-[10px] font-mono uppercase text-tactical-muted block">Time Bank Potential</span>
                <span className="text-sm font-bold text-tactical-success font-mono">+{selectedTask.durationMin} mins</span>
              </div>
            </div>

            {/* Interactive Action Buttons Bar */}
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button
                onClick={() => {
                  markDone(activeDate, selectedTask.id);
                }}
                className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                  selectedTask.status === 'done'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/60 hover:bg-emerald-900/80'
                    : 'bg-tactical-success text-white hover:bg-tactical-success/80 shadow-tactical-success/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {selectedTask.status === 'done' ? 'Unmark Task (Done)' : 'Mark Complete (Done)'}
              </button>

              <button
                onClick={() => {
                  setOvertimeEndInput(selectedTask.end);
                  setShowOvertimeModal(true);
                }}
                className="px-4 py-2 bg-tactical-warning text-tactical-deep font-bold rounded-lg text-xs hover:bg-tactical-warning/80 transition-all flex items-center gap-2"
              >
                <Clock className="w-4 h-4" /> Mark Overtime
              </button>

              <button
                onClick={() => {
                  skipTask(activeDate, selectedTask.id);
                }}
                className={`px-4 py-2 border rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  selectedTask.status === 'skipped'
                    ? 'bg-rose-950/50 text-rose-400 border-rose-500/50 hover:bg-rose-900/50'
                    : 'bg-tactical-deep border-tactical-border text-tactical-muted hover:text-tactical-danger hover:border-tactical-danger'
                }`}
              >
                <SkipForward className="w-3.5 h-3.5" />
                {selectedTask.status === 'skipped' ? 'Unskip Task' : 'Skip Task'}
              </button>

              <button
                onClick={() => handleCopyContext(selectedTask)}
                className="px-4 py-2 bg-tactical-purple/20 border border-tactical-purple/40 text-tactical-purple hover:bg-tactical-purple/30 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ml-auto"
              >
                {copiedContext ? <Check className="w-3.5 h-3.5 text-tactical-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedContext ? 'Copied Prompt!' : 'Copy AI Prompt'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacious Mission Details Cards */}
      <div className="tactical-card p-6">
        <h3 className="text-base font-semibold text-tactical mb-4">
          All Mission Cards for {activeDate} ({blocks.length})
        </h3>

        <div className="space-y-3">
          {blocks
            .filter((b) => showCompleted || b.statusLabel !== 'completed')
            .map((task) => {
              const isSelected = selectedTaskId === task.id;

              return (
                <motion.div
                  key={task.id}
                  onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
                  whileHover={{ borderLeftWidth: '6px' }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-tactical-surface border-tactical-primary border-l-4 border-l-tactical-primary shadow-lg'
                      : task.isActiveNow
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/20'
                      : task.isOverdue
                      ? 'border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-500/20'
                      : 'bg-[#0A1628]/60 border-tactical-border hover:border-tactical-primary/50'
                  }`}
                >
                  {/* Active Green Horizontal Pulse Wave for List Card */}
                  {task.isActiveNow && (
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent pointer-events-none"
                    />
                  )}

                  {/* Overdue Red Horizontal Pulse Wave for List Card */}
                  {task.isOverdue && (
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent pointer-events-none"
                    />
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${task.typeBg}`}>
                          {task.typeLabel}
                        </span>
                        <span className="text-xs font-mono font-bold text-tactical-primary">
                          {task.start} → {task.end} ({task.durationMin}m)
                        </span>
                        {task.isActiveNow && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500 text-white animate-pulse">
                            ⚡ ACTIVE NOW
                          </span>
                        )}
                        {task.isOverdue && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                            ⚠️ OVERDUE
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-tactical-text">{task.task}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold uppercase px-2 py-1 rounded border ${
                        task.status === 'done' ? 'bg-tactical-success/15 border-tactical-success text-tactical-success' :
                        task.status === 'overtime' ? 'bg-tactical-warning/15 border-tactical-warning text-tactical-warning' :
                        task.isOverdue ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-extrabold animate-pulse' :
                        task.status === 'skipped' ? 'bg-tactical-danger/15 border-tactical-danger text-tactical-danger' :
                        'bg-tactical-primary/15 border-tactical-primary text-tactical-primary'
                      }`}>
                        {task.isOverdue ? 'OVERDUE' : task.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-tactical-muted" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Overtime Modal */}
      <AnimatePresence>
        {showOvertimeModal && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-tactical-surface border-2 border-tactical-warning p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-tactical-warning flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Mark Overtime Session
                </h3>
                <button onClick={() => setShowOvertimeModal(false)} className="text-tactical-muted hover:text-tactical">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-tactical-muted">
                Task <span className="font-bold text-tactical-text">{selectedTask.task}</span> ran longer than scheduled ({selectedTask.end}).
              </p>

              <div>
                <label className="text-xs font-mono text-tactical-text block mb-1">Enter Actual Completion Time (HH:MM)</label>
                <input
                  type="text"
                  value={overtimeEndInput}
                  onChange={(e) => setOvertimeEndInput(e.target.value)}
                  placeholder="e.g. 11:15"
                  className="w-full bg-tactical-deep border border-tactical-border rounded-lg p-2.5 text-sm font-mono text-tactical-text focus:border-tactical-warning focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const [h, m] = selectedTask.end.split(':').map(Number);
                    const newMins = h * 60 + m + 15;
                    setOvertimeEndInput(minutesToTime(newMins));
                  }}
                  className="px-2.5 py-1 bg-tactical-deep border border-tactical-border text-xs font-mono rounded text-tactical-muted hover:text-tactical"
                >
                  +15 mins
                </button>
                <button
                  onClick={() => {
                    const [h, m] = selectedTask.end.split(':').map(Number);
                    const newMins = h * 60 + m + 30;
                    setOvertimeEndInput(minutesToTime(newMins));
                  }}
                  className="px-2.5 py-1 bg-tactical-deep border border-tactical-border text-xs font-mono rounded text-tactical-muted hover:text-tactical"
                >
                  +30 mins
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowOvertimeModal(false)}
                  className="px-4 py-2 bg-tactical-deep border border-tactical-border text-tactical-muted text-xs rounded-lg font-mono"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOvertimeSubmit}
                  className="px-4 py-2 bg-tactical-warning text-tactical-deep font-bold text-xs rounded-lg"
                >
                  Submit Overtime
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}