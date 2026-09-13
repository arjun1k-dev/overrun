'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick, playShimmer } from '@/engine/sounds';
import { 
  FolderTree, BookOpen, AlertTriangle, CheckCircle2, XCircle, 
  ChevronDown, ChevronRight, Layers, Target, RefreshCw, FileText, Sparkles
} from 'lucide-react';

export interface ConceptItem {
  id: string;
  concept: string;
  score: number;
  status: 'mastered' | 'needs_revision' | 'critical_weakness' | string;
  weakPoints: string; // JSON string
  linkedNotes: string; // JSON string
  lastEvaluated?: string;
}

export interface SubModuleItem {
  id: string;
  title: string;
  weight: number;
  overallScore: number;
  relPath: string;
  concepts: ConceptItem[];
}

export interface SubjectItem {
  id: string;
  name: string;
  category: string;
  deadline?: string;
  targetScore: number;
  overallScore: number;
  submodules: SubModuleItem[];
}

export function SubjectHierarchyTree() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedSubmodules, setExpandedSubmodules] = useState<Record<string, boolean>>({});

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
        if (data.subjects.length > 0) {
          setExpandedSubjects({ [data.subjects[0].id]: true });
          if (data.subjects[0].submodules.length > 0) {
            setExpandedSubmodules({ [data.subjects[0].submodules[0].id]: true });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch subject tree:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
    playClick();
  };

  const toggleSubmodule = (id: string) => {
    setExpandedSubmodules((prev) => ({ ...prev, [id]: !prev[id] }));
    playClick();
  };

  return (
    <div className="clay-card rounded-2xl p-6 border-4 border-black bg-white text-black space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#CCFF00] text-black border-3 border-black font-black shadow-[3px_3px_0px_#000]">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-xl text-black flex items-center gap-2">
              OVERRUN v3.0 Subject Mastery Hierarchy
              <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-[#00F0FF] text-black border-2 border-black">
                Multi-Layer YAML
              </span>
            </h3>
            <p className="text-xs font-bold text-black">
              3-Layer Zero-Token Tree (Subject Index Manifest $\rightarrow$ Module Trackers $\rightarrow$ Weak Points).
            </p>
          </div>
        </div>

        <button
          onClick={() => { fetchSubjects(); playShimmer(); }}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[#FFE600] text-black border-3 border-black font-black shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer disabled:opacity-50"
          title="Refresh Hierarchy"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center p-8 border-3 border-dashed border-black rounded-xl bg-white text-black font-bold text-xs">
          No 3-layer subject manifests loaded yet. Sync your local vault above!
        </div>
      ) : (
        <div className="space-y-4">
          {subjects.map((subj) => {
            const isSubjExpanded = !!expandedSubjects[subj.id];
            const isOverallMastered = subj.overallScore >= 75;
            const isOverallWeak = subj.overallScore < 50;

            return (
              <div
                key={subj.id}
                className="rounded-xl bg-white border-3 border-black shadow-[4px_4px_0px_#000] overflow-hidden transition-all"
              >
                {/* Layer 1: Subject Header */}
                <div
                  onClick={() => toggleSubject(subj.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#CCFF00] transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    {isSubjExpanded ? (
                      <ChevronDown className="w-5 h-5 text-black stroke-[3]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-black stroke-[3]" />
                    )}

                    <div className="p-2 rounded-lg bg-[#00F0FF] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
                      <BookOpen className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-lg text-black">{subj.name}</h4>
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-[#FFE600] text-black border-2 border-black uppercase">
                          {subj.category}
                        </span>
                        {subj.deadline && (
                          <span className="text-[10px] font-mono font-bold text-black">
                            Deadline: {subj.deadline}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black">
                        {subj.submodules.length} Sub-modules Indexed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-black text-black block">OVERALL MASTERY</span>
                      <span
                        className={`text-lg font-black font-mono px-2 py-0.5 rounded border-2 border-black ${
                          isOverallMastered
                            ? 'bg-[#CCFF00] text-black shadow-[2px_2px_0px_#000]'
                            : isOverallWeak
                            ? 'bg-[#FF007F] text-white shadow-[2px_2px_0px_#000]'
                            : 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]'
                        }`}
                      >
                        {subj.overallScore}% / {subj.targetScore}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Layer 2: Sub-modules */}
                <AnimatePresence>
                  {isSubjExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t-3 border-black bg-white p-3 space-y-3"
                    >
                      {subj.submodules.map((sub) => {
                        const isSubExpanded = !!expandedSubmodules[sub.id];

                        return (
                          <div
                            key={sub.id}
                            className="rounded-lg bg-white border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden"
                          >
                            <div
                              onClick={() => toggleSubmodule(sub.id)}
                              className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#00F0FF] transition-colors select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                {isSubExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-black stroke-[3]" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
                                )}
                                <Layers className="w-4 h-4 text-black shrink-0" />
                                <span className="font-black text-xs text-black">
                                  {sub.title}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-black">
                                  ({sub.relPath})
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-bold text-black">
                                  Weight: {sub.weight * 100}%
                                </span>
                                <span
                                  className={`text-xs font-mono font-black px-2 py-0.5 rounded border-2 border-black ${
                                    sub.overallScore >= 75
                                      ? 'bg-[#CCFF00] text-black shadow-[2px_2px_0px_#000]'
                                      : sub.overallScore < 50
                                      ? 'bg-[#FF007F] text-white shadow-[2px_2px_0px_#000]'
                                      : 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]'
                                  }`}
                                >
                                  {sub.overallScore}%
                                </span>
                              </div>
                            </div>

                            {/* Layer 3: Concept Progress Items */}
                            <AnimatePresence>
                              {isSubExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="border-t-2 border-black bg-white p-3 space-y-2.5"
                                >
                                  {sub.concepts.map((concept) => {
                                    let weakPointsList: string[] = [];
                                    let linkedNotesList: string[] = [];

                                    try {
                                      weakPointsList = JSON.parse(concept.weakPoints || '[]');
                                    } catch {
                                      weakPointsList = [];
                                    }

                                    try {
                                      linkedNotesList = JSON.parse(concept.linkedNotes || '[]');
                                    } catch {
                                      linkedNotesList = [];
                                    }

                                    const isCritical = concept.status === 'critical_weakness' || concept.score < 50;
                                    const isMastered = concept.status === 'mastered' || concept.score >= 75;

                                    return (
                                      <div
                                        key={concept.id}
                                        className="p-3 rounded-lg bg-white border-2 border-black shadow-[2px_2px_0px_#000] space-y-2"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {isMastered ? (
                                              <CheckCircle2 className="w-4 h-4 text-black shrink-0 stroke-[3]" />
                                            ) : isCritical ? (
                                              <XCircle className="w-4 h-4 text-[#FF007F] shrink-0 stroke-[3]" />
                                            ) : (
                                              <AlertTriangle className="w-4 h-4 text-black shrink-0 stroke-[3]" />
                                            )}
                                            <span className="font-black text-xs text-black">
                                              {concept.concept}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            {linkedNotesList.map((note, nIdx) => (
                                              <span
                                                key={nIdx}
                                                className="text-[10px] font-mono font-black text-black bg-[#00F0FF] border-2 border-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[1px_1px_0px_#000]"
                                              >
                                                <FileText className="w-2.5 h-2.5" />
                                                {note}
                                              </span>
                                            ))}
                                            <span className="text-xs font-mono font-black text-black bg-[#FFE600] px-2 py-0.5 rounded border-2 border-black">
                                              {concept.score}%
                                            </span>
                                          </div>
                                        </div>

                                        {/* Weak Points List */}
                                        {weakPointsList.length > 0 && (
                                          <div className="pt-1 pl-6 space-y-1">
                                            <span className="text-[10px] font-black text-[#FF007F] uppercase block">
                                              NotebookLM Weakness Log:
                                            </span>
                                            <ul className="space-y-1">
                                              {weakPointsList.map((wp, wIdx) => (
                                                <li
                                                  key={wIdx}
                                                  className="text-[11px] font-mono font-bold text-black bg-[#FFE600] px-2 py-1 rounded border-2 border-black leading-relaxed flex items-start gap-1.5 shadow-[1px_1px_0px_#000]"
                                                >
                                                  <span className="text-black font-black">•</span>
                                                  <span>{wp}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
