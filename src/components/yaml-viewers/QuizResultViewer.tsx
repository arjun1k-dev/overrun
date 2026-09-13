'use client';

import React from 'react';
import type { QuizResult } from '@/engine/schema-registry';
import { CheckCircle2, TrendingUp, AlertCircle, Target, ArrowRight } from 'lucide-react';

interface QuizResultViewerProps {
  data: QuizResult;
  onTransformToProgress?: () => void;
}

export function QuizResultViewer({ data, onTransformToProgress }: QuizResultViewerProps) {
  const scorePercentage = Math.round((data.questions_correct / data.questions_total) * 100);
  const progressImprovement = data.progress_after - data.progress_before;

  const scoreBadge =
    scorePercentage >= 80 ? 'bg-tactical-success/20 border-tactical-success text-tactical-success' :
    scorePercentage >= 60 ? 'bg-tactical-warning/20 border-tactical-warning text-tactical-warning' :
    'bg-tactical-danger/20 border-tactical-danger text-tactical-danger';

  const confidenceBadge =
    data.confidence === 'high' ? 'text-tactical-success border-tactical-success/40 bg-tactical-success/10' :
    data.confidence === 'medium' ? 'text-tactical-warning border-tactical-warning/40 bg-tactical-warning/10' :
    'text-tactical-danger border-tactical-danger/40 bg-tactical-danger/10';

  return (
    <div className="bg-tactical-surface border border-tactical-border rounded-xl p-4 space-y-4 hover:border-tactical-primary/50 transition-all shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase text-tactical-primary tracking-wider font-semibold">Quiz Results Assessment</span>
          <h3 className="text-sm font-semibold text-tactical-text mt-0.5">{data.topic}</h3>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${scoreBadge}`}>
          {scorePercentage}%
        </div>
      </div>

      {/* Score Summary Banner */}
      <div className="flex items-center justify-between p-3 bg-tactical-deep/50 rounded-lg border border-tactical-border/50">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-tactical-success" />
          <span className="text-xs font-medium text-tactical-text font-mono">
            {data.questions_correct} / {data.questions_total} Correct
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`w-3.5 h-3.5 ${progressImprovement >= 0 ? 'text-tactical-success' : 'text-tactical-danger'}`} />
          <span className={`text-xs font-mono font-bold ${progressImprovement >= 0 ? 'text-tactical-success' : 'text-tactical-danger'}`}>
            {progressImprovement >= 0 ? '+' : ''}{progressImprovement}% Mastery
          </span>
        </div>
      </div>

      {/* Progress Bars (Before vs After) */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-mono text-tactical-muted">Mastery Delta</span>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] text-tactical-muted">
              <span>Before</span>
              <span>{data.progress_before}%</span>
            </div>
            <div className="h-1.5 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border">
              <div className="h-full bg-tactical-muted/50 rounded-full" style={{ width: `${data.progress_before}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[11px] text-tactical-text font-bold">
              <span>After</span>
              <span>{data.progress_after}%</span>
            </div>
            <div className="h-1.5 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border">
              <div className="h-full bg-gradient-to-r from-tactical-primary to-tactical-highlight rounded-full" style={{ width: `${data.progress_after}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Identified Gaps */}
      {data.identified_gaps.length > 0 && (
        <div className="bg-tactical-danger/10 border border-tactical-danger/30 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-tactical-danger text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Target Areas Needing Review</span>
          </div>
          <ul className="space-y-1">
            {data.identified_gaps.map((gap, idx) => (
              <li key={idx} className="text-xs text-tactical-text font-mono flex items-center gap-1.5">
                <span className="text-tactical-danger">•</span> {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Focus */}
      {data.next_focus && (
        <div className="bg-tactical-primary/10 border border-tactical-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-tactical-primary text-xs font-semibold mb-1">
            <Target className="w-3.5 h-3.5" />
            <span>Recommended Next Focus</span>
          </div>
          <p className="text-xs text-tactical-text">{data.next_focus}</p>
        </div>
      )}

      {/* Confidence Level */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-tactical-muted font-mono">Confidence Level</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${confidenceBadge}`}>
          {data.confidence}
        </span>
      </div>

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