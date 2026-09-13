'use client';

import React from 'react';
import type { StudyPlan } from '@/engine/schema-registry';
import { Clock, Target, Calendar, ArrowRight } from 'lucide-react';

interface StudyPlanViewerProps {
  data: StudyPlan;
  onTransformToTasks?: () => void;
}

export function StudyPlanViewer({ data, onTransformToTasks }: StudyPlanViewerProps) {
  const priorityBadge =
    data.priority === 'high' ? 'bg-tactical-danger/20 border-tactical-danger text-tactical-danger' :
    data.priority === 'medium' ? 'bg-tactical-warning/20 border-tactical-warning text-tactical-warning' :
    'bg-tactical-success/20 border-tactical-success text-tactical-success';

  const hours = Math.floor(data.total_time_min / 60);
  const minutes = data.total_time_min % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="bg-tactical-surface border border-tactical-border rounded-xl p-4 space-y-4 hover:border-tactical-primary/50 transition-all shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-tactical-primary tracking-wider font-semibold">Structured Plan</span>
          <h3 className="text-sm font-semibold text-tactical-text mt-0.5">Study Schedule</h3>
          <p className="text-xs text-tactical-muted font-mono mt-0.5">{data.date}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs uppercase ${priorityBadge}`}>
          {data.priority} PRIORITY
        </div>
      </div>

      {/* Time Allocation Banner */}
      <div className="flex items-center justify-between p-3 bg-tactical-deep/50 rounded-lg border border-tactical-border/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-tactical-primary" />
          <span className="text-xs text-tactical-text font-medium">Total Duration</span>
        </div>
        <span className="text-xs font-mono font-bold text-tactical-primary">{timeDisplay}</span>
      </div>

      {/* Focus Topics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-tactical-muted">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-tactical-primary" />
            <span className="font-mono uppercase text-[10px]">Focus Topics ({data.focus_topics.length})</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.focus_topics.map((topic, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 p-2 bg-tactical-deep/40 rounded-lg border border-tactical-border/60 hover:border-tactical-primary/40 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-tactical-primary/20 border border-tactical-primary text-tactical-primary flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tactical-text font-medium truncate">{topic}</p>
              </div>
              <span className="text-[10px] font-mono text-tactical-muted">
                ~{Math.round(data.total_time_min / data.focus_topics.length)}m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Breakdown */}
      <div className="bg-tactical-primary/10 border border-tactical-primary/30 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-tactical-primary text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          <span>Timeline Preview</span>
        </div>
        <div className="space-y-1">
          {data.focus_topics.map((topic, idx) => {
            const startHour = 9 + Math.floor((idx * data.total_time_min) / data.focus_topics.length / 60);
            const endHour = 9 + Math.floor(((idx + 1) * data.total_time_min) / data.focus_topics.length / 60);
            return (
              <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-tactical-muted">
                <span className="text-tactical-text font-semibold">{String(startHour).padStart(2, '0')}:00</span>
                <span>→</span>
                <span className="text-tactical-text font-semibold">{String(endHour).padStart(2, '0')}:00</span>
                <span className="text-tactical-muted truncate">• {topic}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Button */}
      {onTransformToTasks && (
        <button
          onClick={onTransformToTasks}
          className="w-full py-2 bg-tactical-primary hover:bg-tactical-highlight text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
        >
          Generate Tasks into Schedule
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}