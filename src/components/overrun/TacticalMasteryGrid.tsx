'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, TrendingUp, Target, SortDesc, Grid, List, AlertCircle, RefreshCw,
  Copy, Check, Sparkles, Folder, ArrowRight, ChevronRight, X, Award
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  aggregateModuleData,
  generateModuleExportMarkdown,
  extractSubjectCodesFromArtifacts,
  SUBJECT_METADATA,
  ModuleSummaryData,
  ModuleArtifact
} from '@/engine/module-exporter';

export function TacticalMasteryGrid() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'mastery' | 'quizzes' | 'weakSpots' | 'code'>('mastery');
  const [isLoading, setIsLoading] = useState(false);
  const [yamlRecords, setYamlRecords] = useState<any[]>([]);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [copiedModuleExport, setCopiedModuleExport] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const yamlStates = useStore((s) => s.yamlStates);
  const obsidianNotes = useStore((s) => s.obsidianNotes);
  const updateYamlState = useStore((s) => s.updateYamlState);

  const fetchKnowledgeData = async () => {
    setIsLoading(true);
    try {
      const resScan = await fetch('/api/knowledge/scan');
      const dataScan = await resScan.json();
      if (dataScan.success && Array.isArray(dataScan.records)) {
        setYamlRecords(dataScan.records);
        dataScan.records.forEach((rec: any) => {
          if (rec.data && rec.type) {
            const id = rec.data.topic_id || rec.data.id || rec.file;
            updateYamlState(rec.type, id, rec.data);
          }
        });
      }
    } catch (err) {
      console.error('Error scanning knowledge directory:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKnowledgeData();
  }, []);

  // Combine YAML records from disk, Zustand memory store, and Obsidian notes into unified artifact list
  const allArtifacts = useMemo(() => {
    const memoryItems: any[] = [];

    if (yamlStates && typeof yamlStates === 'object') {
      Object.entries(yamlStates).forEach(([type, recordsMap]: [string, any]) => {
        if (recordsMap && typeof recordsMap === 'object') {
          Object.entries(recordsMap).forEach(([id, data]: [string, any]) => {
            if (data) {
              memoryItems.push({
                file: `${type}_${id}.yaml`,
                path: `memory://${type}/${id}`,
                relativePath: `imported/${type}/${id}`,
                type: type,
                data: data,
              });
            }
          });
        }
      });
    }

    if (Array.isArray(obsidianNotes)) {
      obsidianNotes.forEach((n) => {
        memoryItems.push({
          file: n.path.split(/[/\\]/).pop() || n.title,
          path: n.path,
          relativePath: n.path,
          type: 'markdown_note',
          data: {
            title: n.title,
            tags: n.tags,
            contentSnippet: n.summarySnippet,
          },
          source: 'obsidian',
        });
      });
    }

    const merged = [...yamlRecords];

    memoryItems.forEach((mem) => {
      const exists = merged.some(
        (r) =>
          r.path === mem.path ||
          (r.type === mem.type &&
            (r.data?.topic_id === mem.data?.topic_id ||
              r.data?.topic === mem.data?.topic ||
              r.file === mem.file))
      );
      if (!exists) {
        merged.push(mem);
      }
    });

    return merged.map((r) => ({
      id: r.path,
      title:
        r.data?.title ||
        r.data?.topic_title ||
        r.data?.topic ||
        r.data?.subject ||
        r.data?.topic_id ||
        (r.file ? r.file.replace(/\.(yaml|yml|md)$/, '') : 'Untitled'),
      type: r.type || 'unknown',
      source: r.relativePath || r.file || r.path,
      filePath: r.path,
      relativePath: r.relativePath || r.file || r.path,
      data: r.data,
      file: r.file || r.path,
    }));
  }, [yamlRecords, yamlStates, obsidianNotes]);

  // Dynamically extract subject codes from artifacts and feature map registry
  const academicSubjectCodes = useMemo(() => {
    return extractSubjectCodesFromArtifacts(allArtifacts);
  }, [allArtifacts]);

  // Aggregate telemetry dynamically for discovered subject modules
  const moduleMasteryList = useMemo(() => {
    const modules = academicSubjectCodes.map((code) => aggregateModuleData(code, allArtifacts));
    
    return modules.sort((a, b) => {
      switch (sortBy) {
        case 'mastery':
          return b.overallMasteryPct - a.overallMasteryPct;
        case 'quizzes':
          return b.totalQuizzes - a.totalQuizzes;
        case 'weakSpots':
          return b.weakConcepts.length - a.weakConcepts.length;
        case 'code':
          return a.code.localeCompare(b.code);
        default:
          return 0;
      }
    });
  }, [academicSubjectCodes, allArtifacts, sortBy]);

  const activeModuleSummary = useMemo(() => {
    if (!activeModuleCode) return null;
    return aggregateModuleData(activeModuleCode, allArtifacts);
  }, [activeModuleCode, allArtifacts]);

  const handleExportModuleContext = (summary: ModuleSummaryData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const markdownPayload = generateModuleExportMarkdown(summary);
    navigator.clipboard.writeText(markdownPayload);
    setCopiedModuleExport(summary.code);
    setTimeout(() => setCopiedModuleExport(null), 2500);
  };

  const handleCopyWeakConceptPrompt = (concept: string, topic: string) => {
    const promptText = `Explain the concept of "${concept}" in ${topic} with clear code examples, edge cases, and 3 practice questions. Output in OVERRUN quiz_result format.`;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(concept);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'var(--tactical-success)';
    if (mastery >= 60) return 'var(--tactical-primary)';
    if (mastery >= 40) return 'var(--tactical-warning)';
    return 'var(--tactical-danger)';
  };

  const totalWeakSpots = useMemo(() => {
    return moduleMasteryList.reduce((acc, m) => acc + m.weakConcepts.length, 0);
  }, [moduleMasteryList]);

  const avgMastery = useMemo(() => {
    if (moduleMasteryList.length === 0) return 0;
    const sum = moduleMasteryList.reduce((acc, m) => acc + m.overallMasteryPct, 0);
    return Math.round(sum / moduleMasteryList.length);
  }, [moduleMasteryList]);

  return (
    <div className="space-y-6">
      {/* Header & Overall Telemetry Card */}
      <div className="tactical-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-tactical-purple/20 border border-tactical-purple/40 text-tactical-purple">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-tactical">Subject Mastery Intelligence</h2>
              <p className="text-xs text-tactical-muted font-mono">
                Real-Time Telemetry • {moduleMasteryList.length} Active Modules • Weak Spot Diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchKnowledgeData}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-white hover:border-tactical-purple"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Rescan Telemetry
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-tactical-deep/50 rounded-lg p-1 border border-tactical-border font-mono text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-tactical-purple text-white'
                    : 'text-tactical-muted hover:text-tactical'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-tactical-purple text-white'
                    : 'text-tactical-muted hover:text-tactical'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-tactical-deep/80 border border-tactical-border rounded-lg px-3 py-1.5 text-xs font-mono text-tactical focus:border-tactical-purple focus:outline-none"
            >
              <option value="mastery">Sort by Mastery %</option>
              <option value="weakSpots">Sort by Weak Spots</option>
              <option value="quizzes">Sort by Quizzes Taken</option>
              <option value="code">Sort Alphabetically</option>
            </select>
          </div>
        </div>

        {/* Global Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Academic Modules</p>
            <p className="text-2xl font-bold text-tactical font-mono">{moduleMasteryList.length}</p>
          </div>
          <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Avg Subject Mastery</p>
            <p className="text-2xl font-bold text-tactical-primary font-mono">{avgMastery}%</p>
          </div>
          <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Identified Weak Spots</p>
            <p className="text-2xl font-bold text-tactical-warning font-mono">{totalWeakSpots}</p>
          </div>
          <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
            <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Total Quizzes Logged</p>
            <p className="text-2xl font-bold text-tactical-success font-mono">
              {moduleMasteryList.reduce((acc, m) => acc + m.totalQuizzes, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 🎴 ACADEMIC SUBJECT MODULE CARDS GRID */}
      {moduleMasteryList.length === 0 ? (
        <div className="tactical-card p-10 text-center space-y-3 border-dashed border-tactical-border">
          <Brain className="w-10 h-10 text-tactical-muted mx-auto opacity-50" />
          <h3 className="text-base font-bold text-tactical">No Active Study Modules</h3>
          <p className="text-xs text-tactical-muted max-w-md mx-auto font-mono">
            Connect your local knowledge vault or import a subject feature map to dynamically track module mastery.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                : 'space-y-4'
            }
          >
          {moduleMasteryList.map((mod, index) => {
            const masteryColor = getMasteryColor(mod.overallMasteryPct);

            return (
              <motion.div
                key={mod.code}
                onClick={() => setActiveModuleCode(mod.code)}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="tactical-card p-6 cursor-pointer border border-tactical-border hover:border-tactical-purple transition-all flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Top Bar: Icon, Title & Code Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2.5 rounded-xl bg-tactical-deep border border-tactical-border shadow-inner">
                        {mod.icon}
                      </span>
                      <div>
                        <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40">
                          {mod.code}
                        </span>
                        <h3 className="text-sm font-bold text-tactical-text mt-1 group-hover:text-tactical-purple transition-colors">
                          {mod.title}
                        </h3>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-tactical-muted bg-tactical-deep/60 px-2.5 py-1 rounded-lg border border-tactical-border">
                      {mod.totalQuizzes} {mod.totalQuizzes === 1 ? 'quiz' : 'quizzes'}
                    </span>
                  </div>

                  {/* Live Mastery Gauge Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-tactical-muted">Module Mastery</span>
                      <span className="text-xs font-mono font-bold" style={{ color: masteryColor }}>
                        {mod.overallMasteryPct}%
                      </span>
                    </div>
                    <div className="h-2 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${mod.overallMasteryPct}%` }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: masteryColor }}
                      />
                    </div>
                  </div>

                  {/* Weak Spot Pills Preview */}
                  <div className="mb-4">
                    {mod.weakConcepts.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-mono text-tactical-warning mb-1.5 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Needs Practice ({mod.weakConcepts.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.weakConcepts.slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-tactical-warning/10 border border-tactical-warning/30 text-tactical-warning px-2 py-0.5 rounded font-mono truncate max-w-[200px]"
                            >
                              {item.concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] font-mono text-tactical-success flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>No weak spots logged yet</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-4 border-t border-tactical-border/60 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => handleExportModuleContext(mod, e)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40 hover:bg-tactical-purple hover:text-white"
                    title="Export Markdown Snapshot for Notebook LM"
                  >
                    {copiedModuleExport === mod.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Snapshot!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Export Snapshot
                      </>
                    )}
                  </button>

                  <div className="text-xs font-mono text-tactical-purple font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Inspect Module</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
      )}

      {/* 🔍 INTERACTIVE MODULE MASTERY DRAWER MODAL */}
      <AnimatePresence>
        {activeModuleSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-tactical-surface border-2 border-tactical-purple p-6 rounded-2xl max-w-3xl w-full my-8 relative shadow-2xl overrun-scroll max-h-[90vh] space-y-6"
            >
              <button
                onClick={() => setActiveModuleCode(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-tactical transition-colors z-30"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 pr-10">
                <span className="text-3xl p-2 rounded-xl bg-tactical-deep border border-tactical-border">
                  {activeModuleSummary.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-tactical-text">{activeModuleSummary.title}</h2>
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40 font-bold">
                      {activeModuleSummary.code}
                    </span>
                  </div>
                  <p className="text-xs text-tactical-muted mt-0.5">
                    {SUBJECT_METADATA[activeModuleSummary.code]?.description}
                  </p>
                </div>
              </div>

              {/* Telemetry Stats Bar inside Modal */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-tactical-deep/60 rounded-xl border border-tactical-border text-center font-mono">
                <div>
                  <p className="text-xs text-tactical-muted uppercase">Weighted Mastery</p>
                  <p className="text-xl font-bold text-tactical-primary">{activeModuleSummary.overallMasteryPct}%</p>
                </div>
                <div>
                  <p className="text-xs text-tactical-muted uppercase">Quizzes Completed</p>
                  <p className="text-xl font-bold text-tactical">{activeModuleSummary.totalQuizzes}</p>
                </div>
                <div>
                  <p className="text-xs text-tactical-muted uppercase">Weak Concepts</p>
                  <p className="text-xl font-bold text-tactical-warning">{activeModuleSummary.weakConcepts.length}</p>
                </div>
              </div>

              {/* 📋 Sub-Topic Syllabus Progress Bars Matrix */}
              {activeModuleSummary.topicProgressList.length > 0 && (
                <div className="p-4 bg-tactical-deep/40 border border-tactical-border rounded-xl space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-tactical font-mono uppercase tracking-wider">
                      Sub-Topic Syllabus Progress ({activeModuleSummary.topicProgressList.length} Topics)
                    </h4>
                    <span className="text-[10px] text-tactical-muted">Weighted Mastery: {activeModuleSummary.overallMasteryPct}%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto overrun-scroll pr-1">
                    {activeModuleSummary.topicProgressList.map((topic) => {
                      const color = topic.accuracyPct >= 75 ? 'var(--tactical-success)' : topic.questionsAsked > 0 ? 'var(--tactical-warning)' : 'var(--tactical-muted)';

                      return (
                        <div key={topic.id} className="p-2.5 bg-tactical-surface border border-tactical-border/70 rounded-lg space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-tactical-text truncate max-w-[170px]" title={topic.name}>{topic.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/30 font-bold shrink-0">
                              {topic.weight}% Wt
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-tactical-muted">
                              {topic.questionsAsked > 0 ? `${topic.questionsCorrect}/${topic.questionsAsked} correct` : 'Unstudied'}
                            </span>
                            <span className="font-bold" style={{ color }}>{topic.accuracyPct}%</span>
                          </div>

                          <div className="h-1.5 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border/60">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${topic.accuracyPct}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weak Concepts AI Practice Prompts */}
              {activeModuleSummary.weakConcepts.length > 0 && (
                <div className="p-4 bg-tactical-warning/10 border border-tactical-warning/40 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-tactical-warning font-mono uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Notebook LM AI Practice Prompts</span>
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {activeModuleSummary.weakConcepts.map((item, idx) => {
                      const isCopied = copiedPrompt === item.concept;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleCopyWeakConceptPrompt(item.concept, activeModuleSummary.title)}
                          className="px-3 py-1.5 rounded-lg bg-tactical-deep border border-tactical-warning/40 text-xs font-mono text-tactical-text hover:border-tactical-warning transition-all flex items-center gap-2 group"
                        >
                          <span className="text-tactical-warning font-bold">•</span>
                          <span>{item.concept}</span>
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-tactical-success" />
                          ) : (
                            <Copy className="w-3 h-3 text-tactical-muted group-hover:text-tactical-warning" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* File Inventory & Quiz History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-tactical font-mono uppercase tracking-wider">
                  Module Vault File Inventory ({activeModuleSummary.artifacts.length})
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto overrun-scroll pr-1">
                  {activeModuleSummary.artifacts.map((art) => (
                    <div
                      key={art.filePath}
                      className="p-3 bg-tactical-deep/50 border border-tactical-border rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-tactical-purple px-1.5 py-0.5 rounded bg-tactical-purple/20 border border-tactical-purple/30 mr-2">
                          {art.type}
                        </span>
                        <span className="text-tactical-text font-semibold">{art.title}</span>
                      </div>
                      <span className="text-tactical-muted text-[10px]">{art.relativePath}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-tactical-border flex items-center justify-between">
                <button
                  onClick={() => handleExportModuleContext(activeModuleSummary)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all bg-gradient-to-r from-tactical-purple to-indigo-600 text-white shadow-lg shadow-tactical-purple/30 hover:opacity-90"
                >
                  {copiedModuleExport === activeModuleSummary.code ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Copied Snapshot for Notebook LM!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Export Module Snapshot
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveModuleCode(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-white"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}