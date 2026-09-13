'use client';

import React from 'react';
import type { ProgressUpdate } from '@/engine/schema-registry';
import { Activity, CheckCircle2, AlertTriangle, Clock, ArrowRight, Zap } from 'lucide-react';

interface ProgressUpdateViewerProps {
  data: ProgressUpdate;
  onTransformToProgress?: () => void;
}

export function ProgressUpdateViewer({ data, onTransformToProgress }: ProgressUpdateViewerProps) {
  const progressDelta = data.progress_after - data.progress_before;
  const isPositive = progressDelta >= 0;

  const qualityBadge =
    data.quality === 'high' ? 'bg-tactical-success/20 border-tactical-success text-tactical-success' :
    data.quality === 'medium' ? 'bg-tactical-warning/20 border-tactical-warning text-tactical-warning' :
    'bg-tactical-danger/20 border-tactical-danger text-tactical-danger';

  return (
    <div className="bg-tactical-surface border border-tactical-border rounded-xl p-4 space-y-4 hover:border-tactical-primary/50 transition-all shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-tactical-primary" />
            <h3 className="text-sm font-semibold text-tactical-text">Session Progress Update</h3>
          </div>
          <p className="text-xs text-tactical-muted font-mono mt-0.5">{data.topic}</p>
        </div>
        <div className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${qualityBadge}`}>
          {data.quality.toUpperCase()} QUALITY
        </div>
      </div>

      {/* Mastery Change Metrics */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-tactical-deep/50 rounded-lg border border-tactical-border/50">
        <div>
          <span className="text-[10px] uppercase font-mono text-tactical-muted block">Mastery Progress</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-bold text-tactical-text">{data.progress_before}%</span>
            <ArrowRight className="w-3.5 h-3.5 text-tactical-muted" />
            <span className="text-lg font-bold text-tactical-primary">{data.progress_after}%</span>
            <span className={`text-xs font-mono font-bold ${isPositive ? 'text-tactical-success' : 'text-tactical-danger'}`}>
              ({isPositive ? '+' : ''}{progressDelta}%)
            </span>
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-tactical-muted block">Time Invested</span>
          <div className="flex items-center gap-1.5 mt-1 text-tactical-text font-mono font-medium text-sm">
            <Clock className="w-4 h-4 text-tactical-purple" />
            {data.time_spent_min} minutes
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-tactical-muted font-mono">
          <span>Level</span>
          <span>{data.progress_after}%</span>
        </div>
        <div className="h-2 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border">
          <div
            className="h-full bg-gradient-to-r from-tactical-primary to-tactical-highlight transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, data.progress_after))}%` }}
          />
        </div>
      </div>

      {/* Mastered & Needs Review Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {data.concepts_mastered.length > 0 && (
          <div className="bg-tactical-success/10 border border-tactical-success/30 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-tactical-success font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mastered Concepts</span>
            </div>
            <ul className="space-y-1">
              {data.concepts_mastered.map((c, i) => (
                <li key={i} className="text-tactical-text font-mono text-[11px] flex items-center gap-1">
                  <span className="text-tactical-success">•</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.concepts_needing_review.length > 0 && (
          <div className="bg-tactical-warning/10 border border-tactical-warning/30 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-tactical-warning font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Review</span>
            </div>
            <ul className="space-y-1">
              {data.concepts_needing_review.map((c, i) => (
                <li key={i} className="text-tactical-text font-mono text-[11px] flex items-center gap-1">
                  <span className="text-tactical-warning">•</span> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Session Focus */}
      {data.next_session_focus && (
        <div className="bg-tactical-purple/10 border border-tactical-purple/30 rounded-lg p-3">
          <span className="text-[10px] uppercase font-mono text-tactical-purple font-semibold flex items-center gap-1">
            <Zap className="w-3 h-3" /> Next Session Objective
          </span>
          <p className="text-xs text-tactical-text mt-1">{data.next_session_focus}</p>
        </div>
      )}

      {/* Action Button */}
      {onTransformToProgress && (
        <button
          onClick={onTransformToProgress}
          className="w-full py-2 bg-tactical-primary hover:bg-tactical-highlight text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
        >
          Update Mastery State
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="text-[10px] font-mono text-tactical-muted text-right">
        {data.date}
      </div>
    </div>
  );
}
