'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Target, Brain, TrendingUp, AlertTriangle,
  CheckCircle, Pause, Play, Plus,
  ChevronRight, Calendar, BookOpen, Zap, Settings, RefreshCw
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { minutesToHM } from '@/data/types';

interface MetricCard {
  title: string;
  value: string | number;
  trend: string;
  icon: any;
  color: string;
  status: 'success' | 'warning' | 'danger' | 'intel';
}

export function TacticalDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Store data
  const timeBank = useStore((s) => s.timeBank);
  const streak = useStore((s) => s.streak);
  const activeDate = useStore((s) => s.activeDate);
  const tasksByDate = useStore((s) => s.tasksByDate);
  const memoryGoals = useStore((s) => s.memoryGoals);
  const yamlStates = useStore((s) => s.yamlStates);
  const updateYamlState = useStore((s) => s.updateYamlState);
  const markDone = useStore((s) => s.markDone);
  const skipTask = useStore((s) => s.skipTask);

  const tasksToday = tasksByDate[activeDate] || [];
  const completedToday = tasksToday.filter((t) => t.status === 'done' || t.status === 'overtime').length;

  // Real YAML / DB scan
  const [yamlRecords, setYamlRecords] = useState<any[]>([]);
  const [isLoadingYaml, setIsLoadingYaml] = useState(false);

  const fetchRealData = async () => {
    setIsLoadingYaml(true);
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
      console.error('Failed to fetch real YAML data', err);
    }
    setIsLoadingYaml(false);
  };

  useEffect(() => {
    fetchRealData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live mastery average from real progress_state records
  const progressRecords = Object.values(yamlStates).filter((s: any) => s && s.type === 'progress_state');
  const avgMastery = progressRecords.length > 0
    ? Math.round(progressRecords.reduce((sum: number, r: any) => sum + (r.mastery_level || 0), 0) / progressRecords.length)
    : (tasksToday.length > 0 ? Math.round((completedToday / tasksToday.length) * 100) : 0);

  const metrics: MetricCard[] = [
    {
      title: 'Time Bank',
      value: minutesToHM(timeBank),
      trend: `${timeBank >= 0 ? '+' : ''}${timeBank}m net`,
      icon: Clock,
      color: '#3B82F6',
      status: timeBank >= 0 ? 'success' : 'danger'
    },
    {
      title: 'Active Streak',
      value: `${streak} day${streak === 1 ? '' : 's'}`,
      trend: streak > 0 ? 'Active momentum' : 'Start a task today',
      icon: TrendingUp,
      color: '#10B981',
      status: streak > 0 ? 'success' : 'warning'
    },
    {
      title: 'Tasks Today',
      value: `${completedToday}/${tasksToday.length}`,
      trend: `${tasksToday.length - completedToday} remaining`,
      icon: CheckCircle,
      color: '#F59E0B',
      status: completedToday === tasksToday.length && tasksToday.length > 0 ? 'success' : 'warning'
    },
    {
      title: 'Mastery Avg',
      value: `${avgMastery}%`,
      trend: `${progressRecords.length} topic${progressRecords.length === 1 ? '' : 's'} indexed`,
      icon: Brain,
      color: '#8B5CF6',
      status: 'intel'
    }
  ];

  return (
    <div className="min-h-screen bg-tactical-deep text-tactical">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-tactical-primary/5 via-transparent to-tactical-success/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.1)_0%,_transparent_50%)]" />
      </div>

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto px-6 py-4 relative">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="tactical-card p-4 hover:border-tactical-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${metric.color}20` }}>
                  <metric.icon className="w-5 h-5" style={{ color: metric.color }} />
                </div>
                <div className={`status-dot ${metric.status}`} />
              </div>

              <div className="space-y-1">
                <p className="text-tactical-muted text-xs uppercase tracking-wider">{metric.title}</p>
                <p className="text-2xl font-bold text-tactical font-mono">{metric.value}</p>
                <p className="text-tactical-muted text-xs">{metric.trend}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Operations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="tactical-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-tactical-primary" />
                  <h2 className="text-lg font-semibold text-tactical">Active Operations ({activeDate})</h2>
                </div>
                <button
                  onClick={fetchRealData}
                  disabled={isLoadingYaml}
                  className="px-3 py-1.5 bg-tactical-deep border border-tactical-border hover:border-tactical-primary text-tactical-muted text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingYaml ? 'animate-spin' : ''}`} />
                  Sync Data
                </button>
              </div>

              {tasksToday.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-tactical-border rounded-lg">
                  <Calendar className="w-8 h-8 text-tactical-muted mx-auto mb-2" />
                  <p className="text-sm text-tactical font-medium">No tasks scheduled for {activeDate}</p>
                  <p className="text-xs text-tactical-muted mt-1">Paste a schedule in the Dropzone or Import tab to load real missions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasksToday.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#0A1628]/50 rounded-lg p-4 border border-tactical-border hover:border-tactical-primary transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-tactical-primary/30 bg-tactical-primary/10 text-tactical-primary">
                              TYPE {task.type}
                            </span>
                            <span className="text-[10px] font-mono text-tactical-muted">
                              {task.start} → {task.end}
                            </span>
                          </div>
                          <h3 className="font-semibold text-tactical text-sm">{task.task}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-semibold uppercase ${
                            task.status === 'done' ? 'text-tactical-success' :
                            task.status === 'overtime' ? 'text-tactical-warning' :
                            task.status === 'skipped' ? 'text-tactical-muted' : 'text-tactical-primary'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-tactical-border/50">
                        <button
                          onClick={() => markDone(activeDate, task.id)}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all border ${
                            task.status === 'done'
                              ? 'bg-tactical-success text-white border-tactical-success hover:bg-tactical-success/80'
                              : 'bg-tactical-success/20 text-tactical-success border-tactical-success/40 hover:bg-tactical-success/30'
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {task.status === 'done' ? 'Completed' : 'Mark Done'}
                        </button>
                        <button
                          onClick={() => skipTask(activeDate, task.id)}
                          className={`px-3 py-1 rounded text-xs font-mono transition-all ml-auto border ${
                            task.status === 'skipped'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                              : 'bg-tactical-deep border-tactical-border text-tactical-muted hover:text-tactical'
                          }`}
                        >
                          {task.status === 'skipped' ? 'Skipped' : 'Skip'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Parsed YAML Knowledge State Feed */}
            {yamlRecords.length > 0 && (
              <div className="tactical-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-5 h-5 text-tactical-purple" />
                  <h2 className="text-lg font-semibold text-tactical">Parsed Knowledge State Records ({yamlRecords.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {yamlRecords.map((rec, idx) => (
                    <div key={idx} className="bg-tactical-deep/50 border border-tactical-border p-3 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-tactical-primary">
                        <span>{rec.type}</span>
                        <span>{rec.file}</span>
                      </div>
                      <p className="font-semibold text-tactical-text">{rec.data.topic_title || rec.data.topic || rec.data.goal_title || rec.data.title || rec.file}</p>
                      {rec.data.mastery_level !== undefined && (
                        <div className="flex justify-between font-mono text-tactical-muted">
                          <span>Mastery Level</span>
                          <span className="text-tactical-success font-bold">{rec.data.mastery_level}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Priority Alerts & Goals */}
          <div className="space-y-6">
            <div className="tactical-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-tactical-warning" />
                <h2 className="text-lg font-semibold text-tactical">Memory Base Goals ({memoryGoals.length})</h2>
              </div>

              {memoryGoals.length === 0 ? (
                <div className="text-center py-8 text-tactical-muted text-xs">
                  No active goals set. Add goals in Memory Base tab to track deadlines.
                </div>
              ) : (
                <div className="space-y-3">
                  {memoryGoals.map((goal) => {
                    const subgoals = goal.subgoals || [];
                    const completedSubgoals = subgoals.filter((s) => s.completed);
                    const pct = subgoals.length > 0 ? Math.round((completedSubgoals.length / subgoals.length) * 100) : 0;

                    return (
                      <div
                        key={goal.id}
                        className="bg-[#0A1628]/50 rounded-lg p-4 border border-tactical-border hover:border-tactical-warning transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-tactical-warning/20 text-tactical-warning border border-tactical-warning/30 uppercase">
                              {goal.category}
                            </span>
                            <h3 className="font-semibold text-tactical text-sm mt-1">{goal.title}</h3>
                          </div>
                        </div>

                        {subgoals.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-tactical-muted">
                              <span>Steps: {completedSubgoals.length}/{subgoals.length}</span>
                              <span className="text-tactical-success font-bold">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border/60">
                              <div className="h-full bg-tactical-success transition-all duration-300" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-tactical-muted font-mono mt-2">{goal.deadline ? `Deadline: ${goal.deadline}` : 'Open-ended'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Navigation Actions */}
            <div className="tactical-card p-6">
              <h3 className="text-sm font-semibold text-tactical mb-4">Quick Navigation</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.location.hash = '#timeline'}
                  className="p-3 rounded-lg bg-[#0A1628]/50 border border-tactical-border hover:border-tactical-primary transition-all text-left group"
                >
                  <Calendar className="w-5 h-5 text-tactical-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-medium text-tactical">View Schedule</p>
                </button>
                <button
                  onClick={() => window.location.hash = '#mastery'}
                  className="p-3 rounded-lg bg-[#0A1628]/50 border border-tactical-border hover:border-tactical-success transition-all text-left group"
                >
                  <BookOpen className="w-5 h-5 text-tactical-success mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-medium text-tactical">Intelligence</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}