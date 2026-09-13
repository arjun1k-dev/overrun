'use client';

import React from 'react';
import type { ProgressState } from '@/engine/schema-registry';
import { Gauge, CheckCircle2, AlertTriangle, Target, ArrowRight } from 'lucide-react';

interface ProgressStateViewerProps {
  data: ProgressState;
  onViewDetails?: () => void;
}

export function ProgressStateViewer({ data, onViewDetails }: ProgressStateViewerProps) {
  const masteryColor =
    data.mastery_level >= 70 ? 'bg-tactical-success' :
    data.mastery_level >= 40 ? 'bg-tactical-warning' : 'bg-tactical-danger';

  const badgeColor =
    data.mastery_level >= 70 ? 'bg-tactical-success/20 border-tactical-success text-tactical-success' :
    data.mastery_level >= 40 ? 'bg-tactical-warning/20 border-tactical-warning text-tactical-warning' :
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
          <h3 className="text-sm font-semibold text-tactical-text">{data.topic_title}</h3>
          <p className="text-xs text-tactical-muted font-mono mt-0.5">ID: {data.topic_id}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${badgeColor}`}>
          {data.mastery_level}%
        </div>
      </div>

      {/* Mastery Gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-tactical-muted">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-tactical-primary" />
            <span className="font-mono uppercase text-[10px]">Mastery Status</span>
          </div>
          <span className="font-mono text-tactical-text font-bold">{data.mastery_level}%</span>
        </div>
        <div className="h-2 bg-tactical-deep rounded-full overflow-hidden border border-tactical-border">
          <div
            className={`h-full ${masteryColor} transition-all duration-500 rounded-full`}
            style={{ width: `${data.mastery_level}%` }}
          />
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-tactical-border/40">
        <span className="text-tactical-muted font-mono">Confidence</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${confidenceBadge}`}>
          {data.confidence}
        </span>
      </div>

      {/* Concepts */}
      <div className="space-y-2 text-xs">
        {data.concepts_mastered.length > 0 && (
          <div className="bg-tactical-success/10 border border-tactical-success/30 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-tactical-success font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mastered Concepts ({data.concepts_mastered.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.concepts_mastered.slice(0, 3).map((concept, idx) => (
                <span key={idx} className="text-[10px] font-mono bg-tactical-deep border border-tactical-success/40 text-tactical-success px-2 py-0.5 rounded">
                  {concept}
                </span>
              ))}
              {data.concepts_mastered.length > 3 && (
                <span className="text-[10px] font-mono text-tactical-muted self-center">
                  +{data.concepts_mastered.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {data.concepts_needing_review.length > 0 && (
          <div className="bg-tactical-warning/10 border border-tactical-warning/30 rounded-lg p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-tactical-warning font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Review ({data.concepts_needing_review.length})</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.concepts_needing_review.slice(0, 2).map((concept, idx) => (
                <span key={idx} className="text-[10px] font-mono bg-tactical-deep border border-tactical-warning/40 text-tactical-warning px-2 py-0.5 rounded">
                  {concept}
                </span>
              ))}
              {data.concepts_needing_review.length > 2 && (
                <span className="text-[10px] font-mono text-tactical-muted self-center">
                  +{data.concepts_needing_review.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Focus */}
      {data.next_focus && (
        <div className="bg-tactical-primary/10 border border-tactical-primary/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-tactical-primary text-xs font-semibold mb-1">
            <Target className="w-3.5 h-3.5" />
            <span>Next Focus</span>
          </div>
          <p className="text-xs text-tactical-text">{data.next_focus}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-tactical-muted pt-2 border-t border-tactical-border/40">
        <span>Updated: {data.last_updated?.split(' ')[0] || 'N/A'}</span>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-tactical-primary hover:text-tactical-highlight font-semibold flex items-center gap-1 transition-colors"
          >
            Details <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}