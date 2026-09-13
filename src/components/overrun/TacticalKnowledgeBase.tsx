'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, FileText, Search, Copy, Check, ExternalLink,
  BookOpen, Sparkles, Folder, ArrowRight, ArrowLeft, RefreshCw,
  Award, Shield, Layers, Code, CheckCircle, ChevronRight, X, Download
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { YAMLViewer } from '@/components/yaml-viewers/index';
import {
  aggregateModuleData,
  generateModuleExportMarkdown,
  SUBJECT_METADATA,
  ModuleSummaryData,
  ModuleArtifact
} from '@/engine/module-exporter';

const ALL_SUBJECT_CODES = ['dsa', 'eca', 'nmcp', 'ss', 'ade', 'fse', 'da', 'eco', 'es', 'overrun', 'system'];

export function TacticalKnowledgeBase() {
  const [yamlRecords, setYamlRecords] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ModuleArtifact | null>(null);
  const [copiedModuleExport, setCopiedModuleExport] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showSystemCard, setShowSystemCard] = useState(false);

  const obsidianNotes = useStore((s) => s.obsidianNotes);
  const memoryGoals = useStore((s) => s.memoryGoals);
  const updateYamlState = useStore((s) => s.updateYamlState);
  const yamlStates = useStore((s) => s.yamlStates);

  const fetchKnowledgeData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/knowledge/scan');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setYamlRecords(data.records);
        data.records.forEach((rec: any) => {
          if (rec.data && rec.type) {
            const id = rec.data.topic_id || rec.data.id || rec.file;
            updateYamlState(rec.type, id, rec.data);
          }
        });
      }
    } catch (err) {
      console.error('Failed to scan knowledge directory:', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchKnowledgeData();
  }, []);

  // Combine YAML records from disk AND Zustand memory store into unified artifact list
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
        r.file.replace(/\.(yaml|yml|md)$/, ''),
      type: r.type || 'unknown',
      source: r.relativePath || r.file,
      filePath: r.path,
      relativePath: r.relativePath || r.file,
      data: r.data,
      file: r.file,
    }));
  }, [yamlRecords, yamlStates]);

  // Aggregate all modules into ModuleSummaryData objects
  const modulesSummaryList = useMemo(() => {
    return ALL_SUBJECT_CODES.map((code) => aggregateModuleData(code, allArtifacts));
  }, [allArtifacts]);

  // Filter modules based on search query
  const filteredModuleCards = useMemo(() => {
    if (!searchQuery.trim()) return modulesSummaryList;
    const q = searchQuery.toLowerCase();
    return modulesSummaryList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.artifacts.some((a) => a.title.toLowerCase().includes(q) || a.relativePath.toLowerCase().includes(q))
    );
  }, [modulesSummaryList, searchQuery]);

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
    const promptText = `Explain the concept of "${concept}" in ${topic} with clear code examples, edge cases, and 3 multiple choice practice questions. Output in OVERRUN quiz_result format.`;
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(concept);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  // Academic subjects vs System Engine
  const academicModules = filteredModuleCards.filter((m) => m.code !== 'system');
  const systemModule = filteredModuleCards.find((m) => m.code === 'system');

  return (
    <div className="space-y-6">
      {/* 🧭 IF A MODULE IS SELECTED: RENDER DEDICATED MODULE WORKSPACE PAGE */}
      {activeModuleSummary ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="space-y-6"
        >
          {/* Workspace Top Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 tactical-card p-5 border-l-4 border-l-tactical-purple">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveModuleCode(null)}
                className="p-2 rounded-xl bg-tactical-deep border border-tactical-border hover:border-tactical-purple text-tactical-muted hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Modules
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeModuleSummary.icon}</span>
                  <h2 className="text-xl font-bold text-tactical">{activeModuleSummary.title}</h2>
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40 font-bold">
                    {activeModuleSummary.code}
                  </span>
                </div>
                <p className="text-xs text-tactical-muted mt-0.5">
                  {SUBJECT_METADATA[activeModuleSummary.code]?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                    Export Module Context (Notebook LM)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Module Telemetry Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#0A1628]/80 p-4 rounded-xl border border-tactical-border">
              <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Weighted Syllabus Mastery</p>
              <p className="text-2xl font-bold text-tactical-primary font-mono">{activeModuleSummary.overallMasteryPct}%</p>
            </div>
            <div className="bg-[#0A1628]/80 p-4 rounded-xl border border-tactical-border">
              <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Quizzes Taken</p>
              <p className="text-2xl font-bold text-tactical font-mono">{activeModuleSummary.totalQuizzes}</p>
            </div>
            <div className="bg-[#0A1628]/80 p-4 rounded-xl border border-tactical-border">
              <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Identified Weak Spots</p>
              <p className="text-2xl font-bold text-tactical-warning font-mono">{activeModuleSummary.weakConcepts.length}</p>
            </div>
            <div className="bg-[#0A1628]/80 p-4 rounded-xl border border-tactical-border">
              <p className="text-tactical-muted text-xs uppercase font-mono mb-1">Sub-Topics Tracked</p>
              <p className="text-2xl font-bold text-tactical-purple font-mono">{activeModuleSummary.topicProgressList.length || activeModuleSummary.artifacts.length}</p>
            </div>
          </div>

          {/* 📋 Sub-Topic Syllabus Progress Bars Matrix */}
          {activeModuleSummary.topicProgressList.length > 0 && (
            <div className="tactical-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-tactical font-mono tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-tactical-purple" />
                  <span>Sub-Topic Syllabus Accuracy Breakdown ({activeModuleSummary.topicProgressList.length} Topics)</span>
                </h3>
                <span className="text-xs font-mono text-tactical-muted">Weighted Mastery: {activeModuleSummary.overallMasteryPct}%</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeModuleSummary.topicProgressList.map((topic) => {
                  const color = topic.accuracyPct >= 75 ? 'var(--tactical-success)' : topic.questionsAsked > 0 ? 'var(--tactical-warning)' : 'var(--tactical-muted)';

                  return (
                    <div key={topic.id} className="p-3 bg-tactical-deep/60 border border-tactical-border/80 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${topic.accuracyPct >= 75 ? 'bg-tactical-success' : topic.questionsAsked > 0 ? 'bg-tactical-warning animate-pulse' : 'bg-tactical-muted'}`} />
                          <span className="font-bold text-tactical-text truncate" title={topic.name}>{topic.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/30 font-bold shrink-0">
                          {topic.weight}% Wt
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
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

          {/* Identified Weak Concepts & AI Prompts inside Module */}
          {activeModuleSummary.weakConcepts.length > 0 && (
            <div className="tactical-card p-6 border-l-4 border-l-tactical-warning bg-tactical-warning/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-tactical-warning font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Practice Prompts for Weak Concepts in {activeModuleSummary.title}</span>
                </div>
                <span className="text-xs font-mono text-tactical-muted">Click to copy Notebook LM practice prompt</span>
              </div>

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

          {/* Module Sub-Artifact File Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-tactical font-mono tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-tactical-purple" />
              <span>Artifacts & Files in {activeModuleSummary.title}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeModuleSummary.artifacts.map((artifact) => (
                <div
                  key={artifact.filePath}
                  onClick={() => setSelectedArtifact(artifact)}
                  className="tactical-card p-5 cursor-pointer transition-all hover:border-tactical-purple flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40">
                        {artifact.type}
                      </span>
                      <span className="text-[10px] font-mono text-tactical-muted truncate max-w-[160px]" title={artifact.relativePath}>
                        {artifact.relativePath}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-tactical-text mb-2 line-clamp-2 group-hover:text-tactical-purple transition-colors">
                      {artifact.title}
                    </h4>

                    {artifact.type === 'quiz_result' && (
                      <p className="text-xs font-mono text-tactical-success font-bold mt-2">
                        Score: {artifact.data?.score || 0}% ({artifact.data?.questions_correct}/{artifact.data?.questions_total})
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-4 border-t border-tactical-border/60 flex items-center justify-between text-xs font-mono text-tactical-purple font-semibold">
                    <span>Inspect File</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        /* 🏰 MAIN HIGH-LEVEL MODULE CARDS OVERVIEW PAGE */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="tactical-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-tactical-purple/20 border border-tactical-purple/40 text-tactical-purple">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-tactical">Academic & System Module Workspace</h2>
                  <p className="text-xs text-tactical-muted font-mono">
                    High-level Module Cards • 1-Click Snapshot Export for Notebook LM • Interactive Module Views
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchKnowledgeData}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-white hover:border-tactical-purple"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  Rescan Vault
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
                <div className="flex items-center gap-2 text-tactical-muted text-xs uppercase font-mono mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-tactical-primary" />
                  <span>Active Modules</span>
                </div>
                <p className="text-2xl font-bold text-tactical font-mono">{academicModules.length}</p>
              </div>

              <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
                <div className="flex items-center gap-2 text-tactical-muted text-xs uppercase font-mono mb-1">
                  <FileText className="w-3.5 h-3.5 text-tactical-purple" />
                  <span>Total Vault Artifacts</span>
                </div>
                <p className="text-2xl font-bold text-tactical-purple font-mono">{allArtifacts.length}</p>
              </div>

              <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
                <div className="flex items-center gap-2 text-tactical-muted text-xs uppercase font-mono mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-tactical-warning" />
                  <span>Weak Concepts</span>
                </div>
                <p className="text-2xl font-bold text-tactical-warning font-mono">
                  {academicModules.reduce((acc, m) => acc + m.weakConcepts.length, 0)}
                </p>
              </div>

              <div className="bg-[#0A1628]/60 p-3.5 rounded-xl border border-tactical-border">
                <div className="flex items-center gap-2 text-tactical-muted text-xs uppercase font-mono mb-1">
                  <Award className="w-3.5 h-3.5 text-tactical-success" />
                  <span>Quizzes Logged</span>
                </div>
                <p className="text-2xl font-bold text-tactical-success font-mono">
                  {academicModules.reduce((acc, m) => acc + m.totalQuizzes, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex justify-between items-center gap-4">
            <h3 className="text-sm font-bold text-tactical font-mono tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-tactical-purple" />
              <span>Academic Subject Modules ({academicModules.length})</span>
            </h3>

            <div className="relative w-72">
              <Search className="w-4 h-4 text-tactical-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules or codes..."
                className="w-full bg-[#0A1628]/80 border border-tactical-border rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-tactical focus:border-tactical-purple focus:outline-none"
              />
            </div>
          </div>

          {/* 🎴 HIGH-LEVEL ACADEMIC SUBJECT MODULE CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {academicModules.map((mod) => (
              <motion.div
                key={mod.code}
                onClick={() => setActiveModuleCode(mod.code)}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="tactical-card p-6 cursor-pointer border border-tactical-border hover:border-tactical-purple transition-all flex flex-col justify-between relative group overflow-hidden"
              >
                <div>
                  {/* Top Bar: Icon, Code & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2.5 rounded-xl bg-tactical-deep border border-tactical-border shadow-inner">
                        {mod.icon}
                      </span>
                      <div>
                        <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40">
                          {mod.code}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-tactical-muted bg-tactical-deep/60 px-2.5 py-1 rounded-lg border border-tactical-border">
                      {mod.artifacts.length} {mod.artifacts.length === 1 ? 'file' : 'files'}
                    </span>
                  </div>

                  {/* Module Title & Description */}
                  <h3 className="text-base font-bold text-tactical-text mb-1.5 group-hover:text-tactical-purple transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-tactical-muted line-clamp-2 mb-4 leading-relaxed">
                    {SUBJECT_METADATA[mod.code]?.description}
                  </p>

                  {/* Telemetry Pill Badges */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-tactical-deep/60 rounded-xl border border-tactical-border/60 mb-5 font-mono text-xs">
                    <div>
                      <p className="text-[10px] text-tactical-muted uppercase">Mastery</p>
                      <p className="font-bold text-tactical-primary">{mod.overallMasteryPct}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-tactical-muted uppercase">Quizzes</p>
                      <p className="font-bold text-tactical">{mod.totalQuizzes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-tactical-muted uppercase">Weak Spots</p>
                      <p className="font-bold text-tactical-warning">{mod.weakConcepts.length}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-4 border-t border-tactical-border/60 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => handleExportModuleContext(mod, e)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40 hover:bg-tactical-purple hover:text-white"
                    title="Copy Markdown Context for Notebook LM"
                  >
                    {copiedModuleExport === mod.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Context!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Export Module Context
                      </>
                    )}
                  </button>

                  <div className="text-xs font-mono text-tactical-purple font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Open Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ⚙️ SYSTEM & SETTINGS COLLAPSIBLE CARD */}
          {systemModule && (
            <div className="tactical-card p-6 border border-tactical-border/80 bg-tactical-deep/40">
              <div
                onClick={() => setShowSystemCard(!showSystemCard)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-tactical-deep border border-tactical-border">
                    {systemModule.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-tactical">{systemModule.title}</h3>
                    <p className="text-xs text-tactical-muted font-mono">
                      Runtime State Files • System Instructions • Session Logs ({systemModule.artifacts.length} files)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleExportModuleContext(systemModule, e)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Export System Context
                  </button>

                  <button className="text-xs font-mono text-tactical-purple font-bold flex items-center gap-1">
                    <span>{showSystemCard ? 'Hide Details' : 'Show Details'}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showSystemCard ? 'rotate-90' : ''}`} />
                  </button>
                </div>
              </div>

              {showSystemCard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-6 pt-6 border-t border-tactical-border/60 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemModule.artifacts.map((artifact) => (
                      <div
                        key={artifact.filePath}
                        onClick={() => setSelectedArtifact(artifact)}
                        className="tactical-card p-4 cursor-pointer hover:border-tactical-purple flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-tactical-purple/20 text-tactical-purple font-bold">
                            {artifact.type}
                          </span>
                          <h4 className="text-xs font-bold text-tactical-text mt-1">{artifact.title}</h4>
                          <p className="text-[10px] font-mono text-tactical-muted">{artifact.relativePath}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-tactical-purple" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🔍 INTERACTIVE FILE VIEWER MODAL */}
      <AnimatePresence>
        {selectedArtifact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-tactical-surface border-2 border-tactical-purple p-6 rounded-2xl max-w-4xl w-full my-8 relative shadow-2xl overrun-scroll max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedArtifact(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-tactical-deep border border-tactical-border text-tactical-muted hover:text-tactical transition-colors z-30"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 pb-4 border-b border-tactical-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-tactical-purple/20 text-tactical-purple border border-tactical-purple/40 mb-2 inline-block">
                    {selectedArtifact.type} Viewer
                  </span>
                  <h2 className="text-xl font-bold text-tactical-text">{selectedArtifact.title}</h2>
                  <p className="text-xs font-mono text-tactical-muted mt-1">{selectedArtifact.filePath}</p>
                </div>

                <button
                  onClick={() => {
                    const text = JSON.stringify(selectedArtifact.data, null, 2);
                    navigator.clipboard.writeText(text);
                  }}
                  className="px-4 py-2 bg-tactical-purple/20 border border-tactical-purple/40 hover:border-tactical-purple text-tactical-purple hover:text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shrink-0 self-start md:self-auto"
                >
                  <Copy className="w-4 h-4" />
                  Copy File Content
                </button>
              </div>

              {/* YAML Viewer */}
              <div className="pt-2">
                <YAMLViewer type={selectedArtifact.type as any} data={selectedArtifact.data} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
