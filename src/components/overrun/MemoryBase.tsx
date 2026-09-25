'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import type { MemoryGoal, GoalCategory, GoalStatus } from '@/data/types';
import { GOAL_CATEGORY_CONFIG, daysUntil } from '@/data/types';
import { playClick, playShimmer, playError } from '@/engine/sounds';
import {
  Plus, Target, Calendar, X, Check, Archive, Trash2,
  GraduationCap, Briefcase, FolderKanban, Wrench, MoreHorizontal,
  Clock, AlertTriangle, ChevronDown, ChevronUp, Tag
} from 'lucide-react';

import { calculateGoalProgress } from '@/engine/goal-sync-engine';

const CATEGORY_ICONS: Record<GoalCategory, typeof GraduationCap> = {
  exam: GraduationCap,
  internship: Briefcase,
  project: FolderKanban,
  skill: Wrench,
  other: MoreHorizontal,
};

function CountdownBadge({ deadline }: { deadline: string }) {
  if (!deadline) return null;
  const days = daysUntil(deadline);
  if (days === Infinity) return null;

  const isUrgent = days <= 7;
  const isPast = days < 0;

  let label: string;
  let colorClass: string;
  if (isPast) {
    label = `${Math.abs(days)}d overdue`;
    colorClass = 'bg-red-100 text-red-700 border-red-300';
  } else if (isUrgent) {
    label = days === 0 ? 'TODAY' : `${days}d left`;
    colorClass = 'bg-orange-100 text-orange-700 border-orange-300';
  } else {
    label = `${days}d left`;
    colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-300';
  }

  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${colorClass} flex items-center gap-1`}>
      {isUrgent && !isPast && <AlertTriangle className="w-3 h-3" />}
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
}

function GoalCard({ goal }: { goal: MemoryGoal }) {
  const [expanded, setExpanded] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newSubGoalTitle, setNewSubGoalTitle] = useState('');

  const tasksByDate = useStore((s) => s.tasksByDate);
  const updateMemoryGoal = useStore((s) => s.updateMemoryGoal);
  const deleteMemoryGoal = useStore((s) => s.deleteMemoryGoal);
  const setGoalStatus = useStore((s) => s.setGoalStatus);
  const addTopicToGoal = useStore((s) => s.addTopicToGoal);
  const removeTopicFromGoal = useStore((s) => s.removeTopicFromGoal);
  const addSubGoal = useStore((s) => s.addSubGoal);
  const toggleSubGoal = useStore((s) => s.toggleSubGoal);
  const deleteSubGoal = useStore((s) => s.deleteSubGoal);

  const completedTasks = Object.values(tasksByDate).flat().filter(t => t.status === 'done' || t.status === 'overtime');
  const goalProgress = calculateGoalProgress(goal, completedTasks);

  const config = GOAL_CATEGORY_CONFIG[goal.category];
  const IconComp = CATEGORY_ICONS[goal.category];
  const isActive = goal.status === 'active';
  const isCompleted = goal.status === 'completed' || goalProgress.calculatedProgressPct >= 100;

  const subgoals = goal.subgoals || [];
  const completedSubgoals = subgoals.filter((s) => s.completed);
  const progressPct = goalProgress.calculatedProgressPct;

  const handleComplete = () => { setGoalStatus(goal.id, isCompleted ? 'active' : 'completed'); playClick(); };
  const handleArchive = () => { setGoalStatus(goal.id, 'archived'); playClick(); };
  const handleDelete = () => { deleteMemoryGoal(goal.id); playClick(); };
  const handleAddTopic = () => {
    const t = newTopic.trim();
    if (!t) return;
    addTopicToGoal(goal.id, t); setNewTopic(''); playClick();
  };
  const handleAddSubGoal = () => {
    const t = newSubGoalTitle.trim();
    if (!t) return;
    addSubGoal(goal.id, t); setNewSubGoalTitle(''); playClick();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${config.bg} border-3 border-black shadow-[4px_4px_0px_#000] rounded-xl p-4 transition-all ${isCompleted ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white border-2 border-black shrink-0 mt-0.5 shadow-[2px_2px_0px_#000]">
          <IconComp className="w-4 h-4 text-black stroke-[3]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={`text-sm font-black ${isCompleted ? 'line-through text-black/50' : 'text-black'}`}>{goal.title}</h3>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-white text-black border-2 border-black uppercase shadow-[1px_1px_0px_#000]">{config.label}</span>
            <CountdownBadge deadline={goal.deadline} />
          </div>

          {goal.description && <p className="text-xs font-bold text-black/90 mb-2">{goal.description}</p>}

          {/* Subgoals / Step Progress Bar */}
          {subgoals.length > 0 && (
            <div className="mb-3 p-2.5 bg-white/80 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <div className="flex items-center justify-between text-[11px] font-mono font-black text-black mb-1">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  Steps: {completedSubgoals.length}/{subgoals.length}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 bg-gray-200 border border-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Subgoals Checklist */}
          {subgoals.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {subgoals.map((sg) => (
                <div
                  key={sg.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/90 border-2 border-black text-xs font-mono font-bold text-black shadow-[1px_1px_0px_#000]"
                >
                  <button
                    onClick={() => { toggleSubGoal(goal.id, sg.id); playClick(); }}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <div className={`w-4 h-4 rounded border-2 border-black flex items-center justify-center shrink-0 ${sg.completed ? 'bg-emerald-400' : 'bg-white'}`}>
                      {sg.completed && <Check className="w-3 h-3 text-black stroke-[3]" />}
                    </div>
                    <span className={`truncate ${sg.completed ? 'line-through opacity-60' : ''}`}>
                      {sg.title}
                    </span>
                  </button>

                  <button
                    onClick={() => { deleteSubGoal(goal.id, sg.id); playClick(); }}
                    className="text-black/40 hover:text-red-600 transition-colors p-0.5 shrink-0"
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Topics Badges */}
          {goal.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {goal.topics.map((topic) => (
                <span key={topic} className="inline-flex items-center gap-1 text-[10px] font-mono font-black text-black bg-white px-2 py-0.5 rounded-lg border-2 border-black shadow-[1px_1px_0px_#000]">
                  <Tag className="w-2.5 h-2.5 stroke-[3]" />{topic}
                  <button onClick={() => { removeTopicFromGoal(goal.id, topic); playClick(); }} className="hover:text-[#FF007F] transition-colors"><X className="w-2.5 h-2.5 stroke-[3]" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Add Subgoal Input */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={newSubGoalTitle}
              onChange={(e) => setNewSubGoalTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubGoal()}
              placeholder="+ Add step / milestone..."
              className="flex-1 px-3 py-1.5 text-xs font-mono font-bold text-black bg-white rounded-xl border-2 border-black focus:outline-none focus:bg-[#CCFF00]"
            />
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddSubGoal} disabled={!newSubGoalTitle.trim()}
              className="max-btn !bg-[#CCFF00] !border-2 !border-black !px-3 !py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_#000] disabled:opacity-40">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>
          </div>

          {expanded && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/20">
              <input
                type="text"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                placeholder="Add prep topic / tag..."
                className="flex-1 px-3 py-1.5 text-xs font-mono font-bold text-black bg-white rounded-xl border-2 border-black focus:outline-none focus:bg-[#CCFF00]"
              />
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddTopic} disabled={!newTopic.trim()}
                className="max-btn !bg-[#00F0FF] !border-2 !border-black !px-3 !py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_#000] disabled:opacity-40">
                <Tag className="w-3.5 h-3.5 stroke-[3]" />
              </motion.button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleComplete}
            className={`p-1.5 rounded-lg border transition-colors ${isCompleted ? 'bg-emerald-100 border-emerald-300 text-emerald-600' : 'bg-white/60 border-indigo-200 text-indigo-400 hover:text-emerald-500 hover:border-emerald-300'}`}>
            <Check className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setExpanded(!expanded); playClick(); }}
            className="p-1.5 rounded-lg bg-white/60 border border-indigo-200 text-indigo-400 hover:text-violet-500 hover:border-violet-300 transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </motion.button>
          {isActive && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleArchive}
              className="p-1.5 rounded-lg bg-white/60 border border-indigo-200 text-indigo-400 hover:text-amber-500 hover:border-amber-300 transition-colors">
              <Archive className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleDelete}
            className="p-1.5 rounded-lg bg-white/60 border border-indigo-200 text-indigo-400 hover:text-red-500 hover:border-red-300 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

const EMPTY_STATE = [
  { category: 'exam' as GoalCategory, title: 'Mid-Semester Exam', desc: 'NMCP, S&S, A&DE — need to start prep 3 weeks before', deadline: '' },
  { category: 'internship' as GoalCategory, title: 'Landing a Paid Internship', desc: 'Resume, portfolio, DSA practice, cold outreach', deadline: '' },
];

export function MemoryBase() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<GoalCategory>('exam');
  const [showArchived, setShowArchived] = useState(false);

  const memoryGoals = useStore((s) => s.memoryGoals);
  const addMemoryGoal = useStore((s) => s.addMemoryGoal);

  const activeGoals = memoryGoals.filter((g) => g.status === 'active');
  const archivedGoals = memoryGoals.filter((g) => g.status === 'archived' || g.status === 'completed');

  const handleSubmit = useCallback(() => {
    if (!title.trim()) { playError(); return; }
    addMemoryGoal({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || '',
      category,
      topics: [],
    });
    setTitle(''); setDescription(''); setDeadline(''); setCategory('exam');
    setShowForm(false); playShimmer();
  }, [title, description, deadline, category, addMemoryGoal]);

  const handleQuickAdd = useCallback((template: typeof EMPTY_STATE[0]) => {
    addMemoryGoal({
      title: template.title,
      description: template.desc,
      deadline: template.deadline,
      category: template.category,
      topics: [],
    });
    playShimmer();
  }, [addMemoryGoal]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-violet-100 border border-violet-300"><Target className="w-4 h-4 text-violet-600" /></div>
        <h3 className="text-sm font-black text-indigo-900">Memory Base</h3>
        <span className="text-[10px] font-mono font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-lg border border-violet-200 ml-auto">{activeGoals.length} active</span>
      </div>

      {activeGoals.length === 0 && !showForm && (
        <div className="text-center py-6">
          <Target className="w-8 h-8 text-indigo-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-indigo-400 mb-1">No long-term goals yet.</p>
          <p className="text-xs text-violet-400 mb-4">Track exams, internships, and prep topics here.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {EMPTY_STATE.map((t) => {
              const cfg = GOAL_CATEGORY_CONFIG[t.category];
              return (
                <motion.button key={t.title} whileTap={{ scale: 0.95 }} onClick={() => handleQuickAdd(t)}
                  className={`max-btn !px-3 !py-2 text-xs font-bold ${cfg.bg} ${cfg.border}`} style={{ color: cfg.color }}>
                  + {t.title}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {activeGoals.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / expand form */}
      {!showForm ? (
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setShowForm(true); playClick(); }}
          className="w-full max-btn !py-2.5 text-xs font-bold text-violet-600 !bg-violet-50 !border-violet-200 flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Goal
        </motion.button>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 p-4 bg-violet-50/50 border-2 border-violet-200 rounded-2xl overflow-hidden">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title (e.g. End-Sem NMCP)" autoFocus
            className="w-full px-4 py-2.5 text-sm font-bold text-indigo-900 bg-white rounded-xl border-2 border-violet-200 focus:outline-none focus:border-violet-400" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description — what prep is needed, strategies, notes..." rows={2}
            className="w-full px-4 py-2.5 text-xs font-mono text-indigo-900 bg-white rounded-xl border-2 border-violet-200 focus:outline-none focus:border-violet-400 resize-none" />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-mono font-bold text-violet-500 mb-1 block">Deadline (optional)</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono text-indigo-900 bg-white rounded-xl border-2 border-violet-200 focus:outline-none focus:border-violet-400" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-mono font-bold text-violet-500 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}
                className="w-full px-3 py-2 text-xs font-mono font-bold text-indigo-900 bg-white rounded-xl border-2 border-violet-200 focus:outline-none focus:border-violet-400">
                {(Object.entries(GOAL_CATEGORY_CONFIG) as [GoalCategory, typeof GOAL_CATEGORY_CONFIG[GoalCategory]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmit} disabled={!title.trim()}
              className="max-btn !bg-emerald-100 !border-emerald-300 !px-4 !py-2 text-xs font-bold text-emerald-700 flex items-center gap-1.5 disabled:opacity-40">
              <Check className="w-3.5 h-3.5" /> Save Goal
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(false); playClick(); }}
              className="max-btn !px-4 !py-2 text-xs font-bold text-violet-500">
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Archived / Completed */}
      {archivedGoals.length > 0 && (
        <div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowArchived(!showArchived); playClick(); }}
            className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-400 hover:text-indigo-600 transition-colors">
            {showArchived ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showArchived ? 'Hide' : 'Show'} archived ({archivedGoals.length})
          </motion.button>
          <AnimatePresence>
            {showArchived && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-3 overflow-hidden">
                {archivedGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
