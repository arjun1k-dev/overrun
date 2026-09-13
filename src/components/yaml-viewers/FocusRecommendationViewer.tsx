'use client';

import React from 'react';
import type { FocusRecommendation } from '@/engine/schema-registry';
import { Lightbulb, Clock, ArrowRight, Compass } from 'lucide-react';

interface FocusRecommendationViewerProps {
  data: FocusRecommendation;
  onTransformToStudyPlan?: () => void;
}

export function FocusRecommendationViewer({ data, onTransformToStudyPlan }: FocusRecommendationViewerProps) {
  const hours = Math.floor(data.time_available_min / 60);
  const minutes = data.time_available_min % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="bg-tactical-surface border border-tactical-border rounded-xl p-4 space-y-4 hover:border-tactical-primary/50 transition-all shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-tactical-warning">
            <Lightbulb className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-tactical-text">AI Focus Recommendation</h3>
          </div>
          <p className="text-xs text-tactical-muted font-mono mt-0.5">{data.date}</p>
        </div>
        <div className="px-2.5 py-1 rounded-lg border border-tactical-warning/40 bg-tactical-warning/10 text-tactical-warning font-mono font-bold text-xs">
          STRATEGIC
        </div>
      </div>

      {/* Available Time Banner */}
      <div className="flex items-center justify-between p-3 bg-tactical-deep/50 rounded-lg border border-tactical-border/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-tactical-primary" />
          <span className="text-xs text-tactical-text font-medium">Available Time Window</span>
        </div>
        <span className="text-xs font-mono font-bold text-tactical-primary">{timeDisplay}</span>
      </div>

      {/* Reasoning */}
      <div className="bg-tactical-deep/40 rounded-lg p-3 border border-tactical-border/60 space-y-1">
        <div className="flex items-center gap-1.5 text-tactical-muted text-xs font-mono">
          <Compass className="w-3.5 h-3.5 text-tactical-warning" />
          <span>Strategic Context</span>
        </div>
        <p className="text-xs text-tactical-text leading-relaxed">{data.reasoning}</p>
      </div>

      {/* Priority Topics */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-mono text-tactical-muted">Target Topics</span>
        <div className="space-y-1.5">
          {data.priority_topics.map((topic, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 p-2 bg-tactical-deep/40 rounded-lg border border-tactical-border/60 hover:border-tactical-primary/40 transition-colors"
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 border ${
                idx === 0 ? 'bg-tactical-danger/20 border-tactical-danger text-tactical-danger' :
                idx === 1 ? 'bg-tactical-warning/20 border-tactical-warning text-tactical-warning' :
                'bg-tactical-primary/20 border-tactical-primary text-tactical-primary'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tactical-text font-medium truncate">{topic}</p>
              </div>
              {idx === 0 && (
                <span className="text-[9px] font-mono font-bold text-tactical-danger bg-tactical-danger/10 px-1.5 py-0.5 rounded border border-tactical-danger/20">
                  TOP PRIORITY
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      {onTransformToStudyPlan && (
        <button
          onClick={onTransformToStudyPlan}
          className="w-full py-2 bg-tactical-warning hover:bg-tactical-warning/80 text-tactical-deep font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2"
        >
          Convert to Actionable Study Plan
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}