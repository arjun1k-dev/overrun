// ============================================================
// YAML Viewers Registry & Routing (Tactical Design System)
// ============================================================

import React from 'react';
import type { SchemaType } from '@/engine/schema-registry';
import { ProgressStateViewer } from './ProgressStateViewer';
import { QuizResultViewer } from './QuizResultViewer';
import { StudyPlanViewer } from './StudyPlanViewer';
import { FocusRecommendationViewer } from './FocusRecommendationViewer';
import { ProgressUpdateViewer } from './ProgressUpdateViewer';

// Helper component for tactical fallbacks
function TacticalFallbackCard({ type, label }: { type: string; label: string }) {
  return (
    <div className="bg-tactical-surface border border-tactical-border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-tactical-muted">Interchange Schema</span>
        <span className="text-[10px] font-mono text-tactical-primary font-bold px-2 py-0.5 rounded bg-tactical-primary/10 border border-tactical-primary/20">
          {type}
        </span>
      </div>
      <p className="text-xs text-tactical-text font-medium">{label}</p>
      <p className="text-[11px] text-tactical-muted">
        This record is ingested directly into the SQLite DB & active Tactical UI dashboards.
      </p>
    </div>
  );
}

// ============================================================
// Viewer Registry
// ============================================================

interface ViewerComponent {
  component: React.ComponentType<any>;
  copyPasteFriendly: boolean;
  description: string;
  category: 'state' | 'content';
}

export const VIEWER_REGISTRY: Record<SchemaType, ViewerComponent> = {
  // State viewers (internal use)
  task_state: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="task_state" label={`Runtime Task Execution State (${data?.id || 'State Record'})`} />
    ),
    copyPasteFriendly: false,
    description: 'Runtime task execution state',
    category: 'state',
  },
  progress_state: {
    component: ProgressStateViewer,
    copyPasteFriendly: false,
    description: 'Per-topic mastery progress state',
    category: 'state',
  },
  goal_state: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="goal_state" label={`Goal Completion State (${data?.goal_title || 'Goal Record'})`} />
    ),
    copyPasteFriendly: false,
    description: 'Goal completion tracking state',
    category: 'state',
  },
  session_state: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="session_state" label={`Study Session Log (${data?.session_id || 'Session Record'})`} />
    ),
    copyPasteFriendly: false,
    description: 'Study session logging state',
    category: 'state',
  },

  // Knowledge content viewers (copy-paste friendly)
  quiz_result: {
    component: QuizResultViewer,
    copyPasteFriendly: true,
    description: 'Quiz/assessment results from Notebook LM',
    category: 'content',
  },
  study_plan: {
    component: StudyPlanViewer,
    copyPasteFriendly: true,
    description: 'Structured study plans from Notebook LM',
    category: 'content',
  },
  focus_recommendation: {
    component: FocusRecommendationViewer,
    copyPasteFriendly: true,
    description: 'AI-driven focus recommendations from Notebook LM',
    category: 'content',
  },
  progress_update: {
    component: ProgressUpdateViewer,
    copyPasteFriendly: true,
    description: 'Session summaries with progress tracking',
    category: 'content',
  },
  feature_map: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="feature_map" label={`Subject Feature Map (${data?.title || data?.subject_code || 'Syllabus Matrix'})`} />
    ),
    copyPasteFriendly: true,
    description: 'Subject weightage & syllabus matrix from Notebook LM',
    category: 'content',
  },
  task: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="task" label={`Scheduled Task (${data?.title || 'Task Item'})`} />
    ),
    copyPasteFriendly: true,
    description: 'Scheduled learning tasks',
    category: 'content',
  },
  goal: {
    component: ({ data }: { data: any }) => (
      <TacticalFallbackCard type="goal" label={`Long-Term Goal (${data?.title || 'Goal Item'})`} />
    ),
    copyPasteFriendly: true,
    description: 'Long-term goals',
    category: 'content',
  },
};

// ============================================================
// YAML Viewer Component (with auto-routing)
// ============================================================

interface YAMLViewerProps {
  type: SchemaType;
  data: any;
  onAction?: (action: string, data?: any) => void;
}

export function YAMLViewer({ type, data, onAction }: YAMLViewerProps) {
  const viewer = VIEWER_REGISTRY[type];

  if (!viewer) {
    return (
      <div className="bg-tactical-danger/10 border border-tactical-danger/30 rounded-xl p-4 text-xs font-mono text-tactical-danger">
        Unknown YAML type: {type}
      </div>
    );
  }

  const ViewerComponent = viewer.component;

  return (
    <div className="yaml-viewer-wrapper">
      <ViewerComponent data={data} onAction={onAction} />
    </div>
  );
}

// ============================================================
// Utility Functions
// ============================================================

export function getViewerInfo(type: SchemaType) {
  return VIEWER_REGISTRY[type];
}

export function isCopyPasteFriendlyViewer(type: SchemaType): boolean {
  return VIEWER_REGISTRY[type]?.copyPasteFriendly ?? false;
}

export function getCopyPasteFriendlyViewers(): SchemaType[] {
  return Object.entries(VIEWER_REGISTRY)
    .filter(([_, info]) => info.copyPasteFriendly)
    .map(([type]) => type as SchemaType);
}

export function getStateViewers(): SchemaType[] {
  return Object.entries(VIEWER_REGISTRY)
    .filter(([_, info]) => info.category === 'state')
    .map(([type]) => type as SchemaType);
}

export function getContentViewers(): SchemaType[] {
  return Object.entries(VIEWER_REGISTRY)
    .filter(([_, info]) => info.category === 'content')
    .map(([type]) => type as SchemaType);
}
