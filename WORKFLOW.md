# OVERRUN Complete Workflow Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [YAML Schema Architecture](#yaml-schema-architecture)
3. [File Organization](#file-organization)
4. [Data Flow & Workflows](#data-flow--workflows)
5. [API Endpoints](#api-endpoints)
6. [UI Components & Integration](#ui-components--integration)
7. [Notebook LM Integration](#notebook-lm-integration)
8. [Complete Workflow Examples](#complete-workflow-examples)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

OVERRUN is a **personal knowledge management system** that uses **multi-schema YAML architecture** to:
- Track learning progress across topics
- Schedule study sessions and tasks
- Generate AI-powered study recommendations
- Integrate with Notebook LM for intelligent planning
- Sync bidirectional with Obsidian vaults

### Key Architecture Principles

1. **Two Schema Categories**: State tracking (internal) vs Knowledge content (external/Nicknotebook LM)
2. **Unified Parsing**: Single parser handles all 10 YAML types with automatic type detection
3. **Type Transformations**: 8 transformation functions convert between schema types when needed
4. **Zod Validation**: All YAML is validated against strict schemas for type safety
5. **Real-time Dashboard**: All data flows to tactical command center for live monitoring

---

## YAML Schema Architecture

### Category 1: State Schemas (4 types) - Internal Use Only

These use **pure YAML files** in `.state/` directory for runtime tracking:

#### 1. `task_state` - Runtime Task Execution Status
**Directory**: `knowledge/.state/tasks/`

```yaml
---
version: "1.0.0"
type: "task_state"
id: "task-2024-08-25-0900-nmcp-module1"
topic_id: "nmcp_module_1"
topic_title: "NMCP Module 1 - Root Finding Algorithms"
scheduled_start: "2024-08-25 09:00"
scheduled_end: "2024-08-25 11:00"
actual_start: "2024-08-25 09:15"
actual_end: "2024-08-25 10:45"
status: "completed"
quality_rating: 4
notes: "Focus on Newton-Raphson convergence criteria"
# Dashboard-specific fields
priority: "HIGH"
task_type: "DEEP_WORK"
time_remaining_min: 45
estimated_difficulty: "medium"
created_at: "2024-08-25 08:00"
updated_at: "2024-08-25 10:45"
---
```

**Purpose**: Tracks actual task execution vs scheduled plan
**Used by**: TacticalTimeline, TaskCard components

#### 2. `progress_state` - Per-Topic Mastery Progress
**Directory**: `knowledge/.state/progress/`

```yaml
---
version: "1.0.0"
type: "progress_state"
topic_id: "nmcp_module_1"
topic_title: "NMCP Module 1 - Root Finding Algorithms"
mastery_level: 75
last_updated: "2024-08-25 10:45"
confidence: "high"
concepts_mastered:
  - "Newton-Raphson method"
  - "Bisection method convergence"
concepts_needing_review:
  - "Secant method error analysis"
  - "Gauss-Seidel iteration stability"
next_focus: "Gauss-Seidel iteration stability"
# Dashboard-specific fields
trend: "improving"
last_studied_human: "2 hours ago"
study_count: 5
total_time_spent_min: 240
concept_breakdown:
  total: 10
  mastered: 7
  in_progress: 2
  not_started: 1
category: "exam"
priority: "HIGH"
created_at: "2024-08-20 09:00"
updated_at: "2024-08-25 10:45"
---
```

**Purpose**: Tracks mastery level, concepts, and learning trends
**Used by**: TacticalMasteryGrid, ProgressStateViewer components

#### 3. `goal_state` - Long-term Goal Tracking
**Directory**: `knowledge/.state/goals/`

```yaml
---
version: "1.0.0"
type: "goal_state"
goal_id: "nmcp_exam_sept_2024"
goal_title: "NMCP Exam - September 2024"
category: "exam"
target_completion: "2024-09-15"
current_progress: 45
milestones_completed: 3
milestones_total: 10
status: "active"
# Dashboard-specific fields
priority: "HIGH"
days_remaining: 21
urgency_score: 85
related_topics:
  - "nmcp_module_1"
  - "nmcp_module_2"
  - "numerical_integration"
created_at: "2024-08-01 00:00"
updated_at: "2024-08-25 10:45"
---
```

**Purpose**: Tracks long-term objectives and completion progress
**Used by**: TacticalDashboard, MemoryBase components

#### 4. `session_state` - Study Session Logging
**Directory**: `knowledge/.state/sessions/`

```yaml
---
version: "1.0.0"
type: "session_state"
session_id: "session-2024-08-25-0915"
topic_id: "nmcp_module_1"
start_time: "2024-08-25 09:15"
end_time: "2024-08-25 10:45"
duration_min: 90
tasks_completed: 3
quality: "high"
notes: "Productive session, good focus"
created_at: "2024-08-25 09:15"
---
```

**Purpose**: Logs individual study sessions for time tracking
**Used by**: SessionStateViewer, time bank calculations

---

### Category 2: Knowledge Content Schemas (6 types) - Notebook LM Friendly

These use **Markdown with YAML frontmatter** and are copy-paste friendly:

#### 5. `quiz_result` - Assessment Outcomes
**Directory**: `knowledge/assessments/`

```markdown
---
type: "quiz_result"
topic: "NMCP Module 1 - Root Finding Algorithms"
date: "2024-08-25"
questions_correct: 4
questions_total: 5
progress_before: 60
progress_after: 75
identified_gaps:
  - "Newton-Raphson convergence criteria"
  - "Secant method error analysis"
next_focus: "Gauss-Seidel iteration stability"
confidence: "high"
---

# Quiz Results

## Questions
1. What is the convergence criterion for Newton-Raphson method?
   - **Answer**: |f(xn)| < ε and |xn+1 - xn| < ε
   - **Status**: ✅ Correct

## Analysis
- Strong understanding of root-founding concepts
- Need practice on convergence analysis
```

**Purpose**: Records quiz outcomes and identified knowledge gaps
**Generated by**: Notebook LM when you request assessments
**Transforms to**: `progress_state` (updates mastery)

#### 6. `study_plan` - Structured Study Schedules
**Directory**: `knowledge/plans/`

```markdown
---
type: "study_plan"
date: "2024-08-25"
focus_topics:
  - "NMCP Module 1 - Root Finding Algorithms"
  - "AI Transformers & Self-Attention"
total_time_min: 120
priority: "high"
---

# Study Plan for August 25, 2024

## Focus Areas (Ordered by Priority)
1. **NMCP Module 1** - Current progress: 40%
   - Time allocation: 75 minutes
   - Reason: Upcoming exam + identified weakness

2. **AI Transformers** - Current progress: 60%
   - Time allocation: 45 minutes
   - Reason: Foundation for next week's topics
```

**Purpose**: AI-generated study schedules with time allocations
**Generated by**: Notebook LM when you request study plans
**Transforms to**: `task_state` entries (creates scheduled tasks)

#### 7. `focus_recommendation` - AI Priority Suggestions
**Directory**: `knowledge/plans/`

```markdown
---
type: "focus_recommendation"
date: "2024-08-25"
time_available_min: 60
priority_topics:
  - "NMCP Module 1 - Root Finding Algorithms"
  - "AI Transformers & Self-Attention"
reasoning: "Based on upcoming deadlines + current progress levels"
---

# Recommended Focus: NMCP Module 1

## Why This Topic Now?
- **Current Progress**: 40%
- **Deadline**: 2024-09-15 (21 days)
- **Weak Areas**: Newton-Raphson convergence, Secant method error analysis
```

**Purpose**: AI-driven recommendations for what to study right now
**Generated by**: Notebook LM when you ask "what should I study?"
**Transforms to**: `study_plan` (converts to actionable plan)

#### 8. `progress_update` - Session Summaries
**Directory**: `knowledge/plans/`

```markdown
---
type: "progress_update"
topic: "NMCP Module 1 - Root Finding Algorithms"
date: "2024-08-25"
progress_before: 50
progress_after: 70
time_spent_min: 45
concepts_mastered:
  - "Newton-Raphson method"
  - "Bisection method convergence"
concepts_needing_review:
  - "Secant method error analysis"
next_session_focus: "Gauss-Seidel iteration stability"
quality: "high"
---

# Session Summary

## Achievements
✅ Mastered Newton-Raphson method
✅ Improved progress from 50% → 70%

## Next Session
Focus: Gauss-Seidel iteration stability
```

**Purpose**: Summarizes study session outcomes and progress changes
**Generated by**: Notebook LM after study sessions
**Transforms to**: `progress_state` (updates mastery)

#### 9. `task` - Scheduled Learning Tasks (Legacy)
**Directory**: `knowledge/subjects/[Subject]/[Date].md`

```markdown
---
type: "task"
title: "NMCP Module 1 Study"
dateKey: "2024-08-25"
start: "09:00"
end: "11:00"
taskType: "A"
tags:
  - "nmcp"
  - "numerical-methods"
  - "exam-prep"
status: "in-progress"
progress: 60
---

# NMCP Module 1 Study Session

## Topics Covered
- Root finding algorithms
- Convergence criteria
- Error analysis

## Notes
Focus on Newton-Raphson method for upcoming exam
```

**Purpose**: Individual scheduled tasks with time blocks
**Existing format**: Used by original OVERRUN system
**Transforms to**: `task_state` (migration to new format)

#### 10. `goal` - Long-term Objectives (Legacy)
**Directory**: `knowledge/goals/[goal-name].md`

```markdown
---
type: "goal"
title: "NMCP Exam - September 2024"
category: "exam"
deadline: "2024-09-15"
status: "active"
topics:
  - "nmcp_module_1"
  - "nmcp_module_2"
  - "numerical_integration"
  - "interpolation_methods"
---

# NMCP Exam Preparation

## Study Plan
- Complete all modules by Sept 10
- Practice past papers Sept 11-14
- Review weak areas Sept 15

## Progress
Currently at 45% completion, on track for exam
```

**Purpose**: Long-term objective tracking
**Existing format**: Used by original OVERRUN system
**Transforms to**: `goal_state` (migration to new format)

---

## File Organization

```
overrun/
├── knowledge/                          # Main knowledge vault
│   ├── .state/                         # Internal state tracking (pure YAML)
│   │   ├── tasks/                      # task_state.yaml files
│   │   ├── progress/                   # progress_state.yaml files
│   │   ├── goals/                      # goal_state.yaml files
│   │   └── sessions/                   # session_state.yaml files
│   │
│   ├── subjects/                       # Educational content (legacy task format)
│   │   ├── NMCP/
│   │   │   └── 2024-08-25.md          # Task with YAML frontmatter
│   │   └── AI/
│   │       └── 2024-08-25.md
│   │
│   ├── goals/                          # Long-term objectives (legacy goal format)
│   │   ├── nmcp-exam-sept-2024.md
│   │   └── ai-research-project.md
│   │
│   ├── assessments/                    # Quiz results (quiz_result schema)
│   │   ├── nmcp-module-1-quiz.md
│   │   └── ai-transformers-quiz.md
│   │
│   ├── plans/                          # Study plans & recommendations
│   │   ├── weekly-study-plan.md       # study_plan schema
│   │   ├── focus-recommendation.md    # focus_recommendation schema
│   │   └── progress-updates/          # progress_update schemas
│   │
│   ├── NOTEBOOK_LM_INSTRUCTIONS.md    # AI interaction guide
│   └── README.md                       # Vault documentation
│
├── src/
│   ├── engine/                         # Core YAML processing
│   │   ├── schema-registry.ts          # All 10 Zod schemas
│   │   ├── yaml-parser.ts              # Unified parser
│   │   └── yaml-transformer.ts         # Type transformation functions
│   │
│   ├── components/
│   │   ├── overrun/                    # Tactical UI components
│   │   │   ├── TacticalDashboard.tsx   # Main command center
│   │   │   ├── TacticalTimeline.tsx    # Schedule viewer
│   │   │   ├── TacticalMasteryGrid.tsx  # Progress viewer
│   │   │   └── TacticalYamlImport.tsx  # YAML import interface
│   │   │
│   │   └── yaml-viewers/               # Specialized YAML viewers
│   │       ├── TaskStateViewer.tsx
│   │       ├── ProgressStateViewer.tsx
│   │       └── [Other]Viewer.tsx
│   │
│   ├── app/
│   │   └── api/                        # API endpoints
│   │       ├── knowledge/
│   │       │   └── scan/route.ts       # YAML scanner
│   │       ├── subjects/route.ts        # Subject CRUD
│   │       ├── goals/route.ts           # Goal CRUD
│   │       └── tasks/route.ts           # Task CRUD
│   │
│   └── store/
│       └── useStore.ts                 # Zustand state management
│
├── WORKFLOW.md                          # This file
└── README.md
```

---

## Data Flow & Workflows

### Core Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     External Input Sources                     │
└─────────────────────────────────────────────────────────────┘
          │                        │
          │                        │
          ▼                        ▼
┌──────────────────┐      ┌──────────────────┐
│  Notebook LM     │      │  Manual Input    │
│  (AI-generated)  │      │  (Direct editing) │
└──────────────────┘      └──────────────────┘
          │                        │
          │    YAML Frontmatter     │
          └────────┬───────────────┘
                   ▼
          ┌──────────────────┐
          │  yaml-parser.ts  │
          │  - Auto-detect   │
          │  - Validate     │
          └────────┬─────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ Store Direct │      │ Transform?   │
│ (no change)  │      │ (optional)   │
└──────────────┘      └──────┬───────┘
                              │
                    ┌─────────┴─────────┐
                    │ yaml-transformer │
                    │ - Convert types  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ useStore.ts      │
                    │ - Update state   │
                    │ - Persist to LS  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  UI Components   │
                    │  - Dashboard     │
                    │  - Timeline      │
                    │  - Mastery Grid  │
                    └──────────────────┘
```

### Workflow 1: Quiz Result → Mastery Update

**Trigger**: You complete a quiz in Notebook LM

```
1. Notebook LM generates quiz_result YAML
   ↓
2. Copy YAML frontmatter (ctrl+C the entire block)
   ↓
3. Paste into OVERRUN YAML Import tab
   ↓
4. yaml-parser validates against QuizResultSchema
   ↓
5. System asks: "Transform to progress_state?"
   ↓
6. User clicks "Transform"
   ↓
7. yaml-transformer.quizResultToProgressState()
   - Creates progress_state with new mastery_level
   - Preserves existing concepts_mastered
   - Adds identified_gaps to concepts_needing_review
   ↓
8. useStore.updateYamlState('progress_state', topic_id, new_state)
   ↓
9. ProgressStateViewer auto-updates with new mastery
   ↓
10. TacticalDashboard refreshes mastery average
```

**Files Involved**:
- Input: `knowledge/assessments/quiz-result.md` (quiz_result schema)
- Output: `knowledge/.state/progress/nmcp-module-1.yaml` (progress_state schema)
- Display: TacticalMasteryGrid, TacticalDashboard

### Workflow 2: Study Plan → Task Schedule

**Trigger**: You request "Make a study plan for tomorrow" from Notebook LM

```
1. Notebook LM generates study_plan YAML
   ↓
2. Paste into OVERRUN YAML Import tab
   ↓
3. yaml-parser validates against StudyPlanSchema
   ↓
4. System asks: "Create tasks from this plan?"
   ↓
5. User clicks "Generate Tasks"
   ↓
6. yaml-transformer.studyPlanToTaskStates()
   - Splits focus_topics across time slots
   - Creates task_state for each topic
   - Assigns sequential times
   ↓
7. useStore.updateYamlState('task_state', id, task)
   for each generated task
   ↓
8. TacticalTimeline renders new tasks
   ↓
9. Tasks appear in schedule with proper time allocation
```

**Files Involved**:
- Input: `knowledge/plans/study-plan.md` (study_plan schema)
- Output: `knowledge/.state/tasks/task-*.yaml` (multiple task_state files)
- Display: TacticalTimeline, TaskCard components

### Workflow 3: Focus Recommendation → Study Plan

**Trigger**: You ask Notebook LM "What should I study for the next 2 hours?"

```
1. Notebook LM generates focus_recommendation YAML
   ↓
2. Paste into OVERRUN YAML Import tab
   ↓
3. yaml-parser validates against FocusRecommendationSchema
   ↓
4. System shows reasoning and priority topics
   ↓
5. User clicks "Convert to Study Plan"
   ↓
6. yaml-transformer.focusRecommendationToStudyPlan()
   - Extracts top 3 priority_topics
   - Uses time_available_min for total_time_min
   - Sets priority based on topic count
   ↓
7. Generates study_plan YAML
   ↓
8. User can then workflow 2 to create tasks
```

**Files Involved**:
- Input: `knowledge/plans/focus-recommendation.md` (focus_recommendation schema)
- Output: `knowledge/plans/study-plan.md` (study_plan schema)
- Display: TacticalYamlImport component

### Workflow 4: Manual Task Creation → State Tracking

**Trigger**: You manually create a task in Obsidian

```
1. Create file: knowledge/subjects/NMCP/2024-08-25.md
   ↓
2. Add YAML frontmatter with task schema
   ↓
3. OVERRUN auto-sync detects change
   ↓
4. yaml-parser validates against TaskSchema
   ↓
5. yaml-transformer.taskToTaskState()
   - Converts legacy format to task_state
   - Adds dashboard-specific fields
   ↓
6. useStore.addTask(date, task)
   ↓
7. Task appears in TacticalTimeline
   ↓
8. During study session, user updates status
   ↓
9. task_state updates with actual_start, actual_end
   ↓
10. Time bank calculations update
```

**Files Involved**:
- Input: `knowledge/subjects/NMCP/2024-08-25.md` (task schema)
- Output: `knowledge/.state/tasks/task-*.yaml` (task_state schema)
- Display: TacticalTimeline, TaskCard, TimeBankBar

---

## API Endpoints

### `/api/knowledge/scan` - YAML File Scanner

**Method**: GET  
**Purpose**: Scan knowledge directory for all YAML files  

**Response**:
```json
{
  "success": true,
  "records": [
    {
      "file": "nmcp-module-1-quiz.md",
      "type": "quiz_result",
      "directory": "assessments/",
      "data": {
        "topic": "NMCP Module 1",
        "progress_after": 75,
        ...
      }
    }
  ],
  "summary": {
    "total": 15,
    "by_type": {
      "quiz_result": 3,
      "study_plan": 2,
      "progress_state": 5,
      ...
    }
  }
}
```

**Used by**: TacticalDashboard for real data sync

### `/api/subjects` - Subject Management

**Methods**: GET, POST, PUT, DELETE  
**Purpose**: CRUD operations for subject/task data  

**GET Response**:
```json
{
  "subjects": [
    {
      "id": "nmcp",
      "title": "Numerical Methods & Computing",
      "tasks": [...],
      "progress": 45
    }
  ]
}
```

**Used by**: TacticalMasteryGrid for subject data

### `/api/goals` - Goal Management

**Methods**: GET, POST, PUT, DELETE  
**Purpose**: CRUD operations for goal data  

**GET Response**:
```json
{
  "goals": [
    {
      "id": "nmcp-exam",
      "title": "NMCP Exam Sept 2024",
      "category": "exam",
      "deadline": "2024-09-15",
      "status": "active"
    }
  ]
}
```

**Used by**: TacticalDashboard, MemoryBase

### `/api/tasks` - Task Management

**Methods**: GET, POST, PUT, DELETE  
**Purpose**: CRUD operations for task data  

**GET Response**:
```json
{
  "tasks": {
    "2024-08-25": [
      {
        "id": "task-1",
        "title": "NMCP Module 1 Study",
        "start": "09:00",
        "end": "11:00",
        "status": "in-progress"
      }
    ]
  }
}
```

**Used by**: TacticalTimeline, TaskCard

---

## UI Components & Integration

### TacticalDashboard (Command Center)

**Data Sources**:
- `useStore.timeBank` - Time balance calculations
- `useStore.streak` - Active day streak
- `useStore.tasksByDate[activeDate]` - Today's tasks
- `useStore.memoryGoals` - Active goals
- `useStore.yamlStates` - All YAML state records
- `/api/knowledge/scan` - Real YAML file scan

**Features**:
- Real-time metrics cards (Time Bank, Streak, Tasks, Mastery)
- Active operations list (today's tasks)
- Parsed knowledge state feed
- Memory base goals overview
- Quick navigation actions

**State Integration**:
```typescript
const yamlStates = useStore((s) => s.yamlStates);
const updateYamlState = useStore((s) => s.updateYamlState);

// On YAML import
yamlRecords.forEach((rec) => {
  if (rec.data && rec.type) {
    const id = rec.data.topic_id || rec.data.id || rec.file;
    updateYamlState(rec.type, id, rec.data);
  }
});
```

### TacticalTimeline (Schedule Viewer)

**Data Sources**:
- `useStore.tasksByDate` - Scheduled tasks by date
- `useStore.yamlStates` - Task states for execution tracking

**Features**:
- Timeline visualization with time blocks
- Track allocation algorithm (prevents overlap)
- Real-time current position indicator
- Task status updates (pending → in-progress → completed)
- Copy context for Notebook LM

**Overlap Prevention**:
```typescript
const allocateTracks = (tasks: Task[]) => {
  const tracks: Task[][] = [];
  tasks.forEach(task => {
    let trackIndex = tracks.findIndex(track =>
      !hasOverlap(track[track.length - 1], task)
    );
    if (trackIndex === -1) {
      trackIndex = tracks.length;
      tracks[trackIndex] = [];
    }
    tracks[trackIndex].push(task);
  });
  return tracks;
};
```

### TacticalMasteryGrid (Intelligence Dashboard)

**Data Sources**:
- `useStore.yamlStates` - All progress_state records
- `/api/subjects` - Subject hierarchy
- `/api/knowledge/scan` - Real YAML data

**Features**:
- Mastery level gauges (0-100%)
- Concept breakdown (mastered/in-progress/not-started)
- Trend indicators (improving/stable/declining)
- Grid/list view toggle
- Filtering by category, priority
- Sorting by mastery, last studied

**Real Data Fetching**:
```typescript
useEffect(() => {
  const fetchRealData = async () => {
    const res = await fetch('/api/subjects');
    const subjects = await res.json();
    setSubjects(subjects);
    
    const progressRecords = Object.values(yamlStates)
      .filter((s: any) => s?.type === 'progress_state');
    setProgressRecords(progressRecords);
  };
  fetchRealData();
}, [yamlStates]);
```

### TacticalYamlImport (YAML Import Interface)

**Features**:
- Multi-stage import (paste → validate → transform → complete)
- Visual error reporting for invalid YAML
- Schema type detection
- Transformation suggestions
- Progress indicators

**Import Process**:
```typescript
// Stage 1: Paste
const [yamlContent, setYamlContent] = useState('');

// Stage 2: Validate
const parsed = yamlParser.parseAuto(yamlContent);
if (!parsed.success) {
  // Show errors
  return;
}

// Stage 3: Transform
const transformSuggestion = TRANSFORM_REGISTRY[
  `${parsed.type}_to_progress_state`
];

// Stage 4: Complete
useStore.updateYamlState(parsed.type, id, parsed.data);
```

---

## Notebook LM Integration

### What is Notebook LM?

Google's **Notebook LM** is an AI assistant that can:
- Read your knowledge base YAML files
- Generate personalized study plans and quizzes
- Provide focus recommendations based on your progress
- Output structured YAML that integrates directly with OVERRUN

### Supported Output Formats

Notebook LM can generate **4 YAML types** that OVERRUN natively supports:

1. **quiz_result** - When you ask "Quiz me on [topic]"
2. **study_plan** - When you ask "Create a study plan for [date]"
3. **focus_recommendation** - When you ask "What should I study?"
4. **progress_update** - When you ask "Update my progress on [topic]"

### Complete Notebook LM Workflow

```
┌─────────────────────────────────────────────────────────────┐
│              Step 1: Prepare Context for Notebook LM         │
└─────────────────────────────────────────────────────────────┘

1. Export your current progress state:
   - Copy progress_state YAML files
   - Copy goal_state YAML files
   - Copy recent quiz results

2. Paste into Notebook LM context:
   "Here's my current learning progress across topics..."
   [Paste YAML files]

┌─────────────────────────────────────────────────────────────┐
│              Step 2: Request Action from Notebook LM        │
└─────────────────────────────────────────────────────────────┘

3. Make specific request:
   "Quiz me on NMCP Module 1"
   OR
   "Create a study plan for tomorrow"
   OR
   "What should I focus on for the next 2 hours?"

┌─────────────────────────────────────────────────────────────┐
│              Step 3: Receive YAML Output from Notebook LM    │
└─────────────────────────────────────────────────────────────┘

4. Notebook LM responds with YAML frontmatter:
   ---
   type: "quiz_result"
   topic: "NMCP Module 1"
   ...
   ---
   
   [Markdown content with quiz details]

┌─────────────────────────────────────────────────────────────┐
│              Step 4: Import into OVERRUN                     │
└─────────────────────────────────────────────────────────────┘

5. Copy entire YAML + Markdown (Ctrl+A, Ctrl+C)
6. Open OVERRUN → Import tab
7. Paste into YAML import field
8. System validates and shows transformation options
9. Click "Transform" to create progress_state
10. System updates mastery levels automatically

┌─────────────────────────────────────────────────────────────┐
│              Step 5: Updated State Reflected in UI          │
└─────────────────────────────────────────────────────────────┘

11. TacticalMasteryGrid shows new mastery level
12. TacticalDashboard updates mastery average
13. Progress trends updated automatically
14. Next focus recommendations updated
```

### Critical Rules for Notebook LM

**DO:**
- Always output YAML with `---` delimiters
- Use exact topic names from input YAML
- Follow progress range: 0-100 (integers only)
- Use YYYY-MM-DD date format
- Use HH:MM time format (24-hour)
- Match status values exactly

**DON'T:**
- Don't vary topic names (use exact matches)
- Don't use floats for progress (integers only)
- Don't use trailing commas in YAML lists
- Don't forget quotes around strings with spaces
- Don't mix date/time formats

### Example NotebookLM Prompts

**For Quiz Generation:**
```
Based on my progress_state files, quiz me on NMCP Module 1.
Generate 5 questions testing:
1. Root finding algorithms
2. Convergence criteria
3. Error analysis

Output in quiz_result YAML format with:
- Exact topic name from my YAML
- Progress before/after
- Identified knowledge gaps
- Next focus recommendation
```

**For Study Plans:**
```
Create a study plan for tomorrow (2024-08-26).
I have 3 hours available and need to focus on:
1. NMCP Module 2 (current mastery: 30%)
2. AI Transformers (current mastery: 45%)

Prioritize by urgency (NMCP exam in 3 weeks).
Output in study_plan YAML format with time allocations.
```

---

## Complete Workflow Examples

### Example 1: Complete Study Session with Progress Update

**Scenario**: You study NMCP Module 1 for 90 minutes

```
1. BEFORE SESSION:
   - mastery_level: 50%
   - confidence: "medium"
   - last_studied: "2 days ago"

2. START SESSION (10:00):
   - Open TacticalTimeline
   - Click "Start" on NMCP Module 1 task
   - System creates session_state with start_time
   - Task status → "in-progress"

3. DURING SESSION:
   - Study Newton-Raphson method
   - Practice convergence problems
   - Take notes in session_state.notes

4. END SESSION (11:30):
   - Click "Complete" on task
   - System updates session_state:
     * end_time: "2024-08-25 11:30"
     * duration_min: 90
     * tasks_completed: 3
     * quality: "high"

5. GENERATE PROGRESS UPDATE:
   - Click "Export to Notebook LM"
   - System prepares context:
     * session_state data
     * previous progress_state
     * topic details
   - Opens Notebook LM with prompt:
     "Generate a progress_update for this session..."

6. NOTEBOOK LM RESPONSE:
   ---
   type: "progress_update"
   topic: "NMCP Module 1 - Root Finding Algorithms"
   date: "2024-08-25"
   progress_before: 50
   progress_after: 70
   time_spent_min: 90
   concepts_mastered:
     - "Newton-Raphson method"
     - "Convergence criteria"
   concepts_needing_review:
     - "Secant method error analysis"
   next_session_focus: "Secant method error bounds"
   quality: "high"
   ---

7. IMPORT PROGRESS UPDATE:
   - Paste into OVERRUN YAML Import
   - System validates
   - Transform to progress_state
   - Updates mastery: 50% → 70%

8. AFTER SESSION:
   - mastery_level: 70%
   - confidence: "high"
   - last_studied: "Just now"
   - TacticalMasteryGrid updated
   - Time bank: -90m
```

**Files Created/Modified**:
- `knowledge/.state/sessions/session-2024-08-25-1000.yaml`
- `knowledge/.state/progress/nmcp-module-1.yaml` (updated)
- `knowledge/plans/progress-update-2024-08-25.md` (optional)

### Example 2: Quiz-Based Learning Cycle

**Scenario**: You test your knowledge on AI Transformers

```
1. REQUEST QUIZ:
   - Open Notebook LM
   - Provide context: progress_state for AI Transformers
   - Prompt: "Quiz me on AI Transformers & Self-Attention"
   - Specify: 5 questions, mix of conceptual and practical

2. NOTEBOOK LM GENERATES QUIZ:
   ---
   type: "quiz_result"
   topic: "AI Transformers & Self-Attention"
   date: "2024-08-25"
   questions_correct: 3
   questions_total: 5
   progress_before: 60
   progress_after: 75
   identified_gaps:
     - "Multi-head attention mechanisms"
     - "Positional encoding details"
   next_focus: "Multi-head attention implementation"
   confidence: "medium"
   ---

   [Quiz content with 5 questions and analysis]

3. ATTEMPT QUIZ:
   - Answer questions in Notebook LM
   - Get immediate feedback
   - See which concepts need work

4. IMPORT QUIZ RESULTS:
   - Copy quiz_result YAML
   - Paste into OVERRUN YAML Import
   - System validates against QuizResultSchema
   - Shows: "Transform to progress_state?"

5. TRANSFORM TO PROGRESS STATE:
   - Click "Transform"
   - System updates progress_state:
     * mastery_level: 60% → 75%
     * concepts_needing_review: [multi-head attention, positional encoding]
     * next_focus: "Multi-head attention implementation"
     * confidence: "medium"

6. UPDATE FOCUS RECOMMENDATIONS:
   - TacticalDashboard shows updated mastery
   - Next focus: "Multi-head attention implementation"
   - Priority updated based on identified gaps

7. PLAN NEXT STUDY SESSION:
   - Use updated focus to create study plan
   - Allocate 45min to multi-head attention
   - Schedule 30min for positional encoding practice

8. COMPLETE LEARNING CYCLE:
   mastery: 60% → 75% → 85% (after study session)
```

**Files Created**:
- `knowledge/assessments/ai-transformers-quiz-2024-08-25.md`
- `knowledge/.state/progress/ai-transformers.yaml` (updated)

### Example 3: Goal-Oriented Study Planning

**Scenario**: You have an exam in 3 weeks, need comprehensive plan

```
1. SET GOAL:
   - Create goal: "NMCP Exam - Sept 15, 2024"
   - Specify:
     * category: "exam"
     * topics: [10 modules]
     * target_completion: "2024-09-15"

2. GENERATE INITIAL STATE:
   - System creates goal_state
   - milestones_total: 10
   - current_progress: 0%

3. ASSESS CURRENT PROGRESS:
   - Review progress_state for each topic
   - Identify weak modules (mastery < 50%)
   - Identify strong modules (mastery > 70%)

4. REQUEST STUDY PLAN:
   - Open Notebook LM
   - Provide context:
     * goal_state (exam deadline)
     * All progress_state files
     * Available study hours
   - Prompt: "Create 3-week study plan for NMCP exam"

5. NOTEBOOK LM GENERATES PLAN:
   ---
   type: "study_plan"
   date: "2024-08-25"
   focus_topics:
     - "NMCP Module 1 - Root Finding" (priority: HIGH)
     - "NMCP Module 2 - Linear Algebra" (priority: HIGH)
     - "NMCP Module 3 - Integration" (priority: MEDIUM)
   total_time_min: 180
   priority: "high"
   ---

   [Detailed 3-week schedule with daily allocations]

6. IMPORT STUDY PLAN:
   - Paste into OVERRUN YAML Import
   - System validates
   - Transform to task_state entries:
     * Creates 3 tasks for today
     * Schedules 2 tasks per day
     * Allocates time based on priority

7. TRACK PROGRESS:
   - Each day: complete tasks, update status
   - Each week: generate progress_update
   - Aggregate progress to goal_state:
     * current_progress: 0% → 33% → 66% → 100%

8. ADJUST PLAN:
   - If Module 1 takes longer: reschedule
   - If Module 2 is easy: move up advanced topics
   - Update study_plan based on progress

9. FINAL REVIEW:
   - Week 3: Generate focus recommendations
   - Focus on weak areas (identified_gaps)
   - Practice past papers
   - Final progress_update: mastery 85%

10. EXAM DAY:
    - goal_status: "active" → "completed"
    - All milestones achieved
    - Ready for exam
```

**Files Created**:
- `knowledge/.state/goals/nmcp-exam-sept-2024.yaml`
- `knowledge/plans/3-week-study-plan.md`
- `knowledge/.state/tasks/task-*.yaml` (30+ tasks)
- `knowledge/.state/progress/nmcp-module-*.yaml` (10 files)

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: "Invalid YAML content" Error

**Symptoms**:
- YAML Import shows red error message
- No transformation options available

**Causes**:
- Missing `---` delimiters
- Incorrect date/time format
- Invalid enum values
- Missing required fields

**Solutions**:
```yaml
# ❌ WRONG
type: quiz_result
date: 08/25/2024
progress: 75.5

# ✅ CORRECT
---
type: "quiz_result"
date: "2024-08-25"
progress_after: 75
---
```

**Checklist**:
- [ ] YAML wrapped in `---` delimiters
- [ ] Dates: YYYY-MM-DD format
- [ ] Times: HH:MM format (24-hour)
- [ ] Progress: 0-100 integers only
- [ ] Status: exact enum match
- [ ] No trailing commas in arrays

#### Issue 2: "Could not detect YAML type" Error

**Symptoms**:
- Parser fails to identify schema type
- No type field present

**Solution**:
```yaml
# ❌ WRONG
---
topic: "NMCP Module 1"
date: "2024-08-25"
---

# ✅ CORRECT
---
type: "quiz_result"
topic: "NMCP Module 1"
date: "2024-08-25"
---
```

**Required Field**: `type` must be one of:
- quiz_result, study_plan, focus_recommendation, progress_update
- task_state, progress_state, goal_state, session_state
- task, goal (legacy)

#### Issue 3: "Topic name mismatch" Warning

**Symptoms**:
- Progress updates don't find existing progress_state
- Duplicate entries in mastery grid

**Cause**: Topic names don't exactly match

**Solution**:
Use exact topic names from existing YAML:
```yaml
# If progress_state has:
topic_title: "NMCP Module 1 - Root Finding Algorithms"

# Use EXACTLY that in quiz_result:
topic: "NMCP Module 1 - Root Finding Algorithms"  # ✅ Exact match
```

#### Issue 4: Transform Not Available

**Symptoms**:
- Valid YAML but no transform option shown
- Manual transformation required

**Cause**: No transform function exists for that type combination

**Available Transforms**:
```
quiz_result → progress_state
progress_update → progress_state
study_plan → task_state
focus_recommendation → study_plan
session_state → progress_update
task → task_state
goal → goal_state
progress_state → goal_state (aggregate)
```

**Workaround**:
Manually create target type or request missing transform

#### Issue 5: Dashboard Not Updating

**Symptoms**:
- YAML import successful but UI unchanged
- Old mastery levels still showing

**Solutions**:
1. **Check Store Integration**:
   ```typescript
   // Verify yamlStates updated
   console.log(useStore.getState().yamlStates);
   ```

2. **Force Refresh**:
   - Click "Sync Data" button
   - Or: Refresh page (F5)

3. **Check React State**:
   ```typescript
   // Verify component re-renders
   useEffect(() => {
     console.log('yamlStates changed:', yamlStates);
   }, [yamlStates]);
   ```

#### Issue 6: Timeline Overlap Issues

**Symptoms**:
- Tasks visually overlap on timeline
- Can't see task details

**Cause**: Track allocation algorithm not working

**Solution**:
```typescript
// Verify track allocation in TacticalTimeline.tsx
const allocateTracks = (tasks: Task[]) => {
  const tracks: Task[][] = [];
  tasks.forEach(task => {
    let trackIndex = tracks.findIndex(track =>
      !hasOverlap(track[track.length - 1], task)
    );
    if (trackIndex === -1) {
      trackIndex = tracks.length;
      tracks[trackIndex] = [];
    }
    tracks[trackIndex].push(task);
  });
  return tracks;
};
```

**Workaround**: Manually adjust task times to avoid overlap

#### Issue 7: Notebook LM Not Outputting Valid YAML

**Symptoms**:
- YAML from Notebook LM fails validation
- Missing fields or incorrect format

**Solution**:
Provide explicit formatting instructions to Notebook LM:

```
"Output in YAML format with these rules:
1. Wrap entire block in --- delimiters
2. Use EXACT topic names from my input
3. Progress values: integers 0-100 only
4. Dates: YYYY-MM-DD format
5. Times: HH:MM 24-hour format
6. No trailing commas in arrays
7. Quotes around strings with spaces"
```

### Debug Mode

Enable debug logging in yaml-parser.ts:

```typescript
export class YamlParser {
  parse<T = any>(content: string): ParseResult<T> {
    console.debug('[YamlParser] Parsing content:', content);
    // ... rest of code
    console.debug('[YamlParser] Parsed result:', result);
    return result;
  }
}
```

### Validation Checklist

Before importing YAML, verify:

**Schema Validation**:
- [ ] Type field present and valid
- [ ] All required fields present
- [ ] Field types correct (string, number, array)
- [ ] Enum values match exactly
- [ ] Date/time formats correct

**Business Logic**:
- [ ] Topic names match existing records
- [ ] Progress values 0-100
- [ ] Times chronological (start < end)
- [ ] References valid (topic_id exists)

**Integration**:
- [ ] Store integration working
- [ ] UI components listening to changes
- [ ] API endpoints returning correct data
- [ ] File system writes succeeding

---

## Quick Reference

### YAML Type Quick Guide

| Type | Category | Directory | Generated By | Transforms To |
|------|----------|-----------|--------------|---------------|
| `quiz_result` | Knowledge | `assessments/` | Notebook LM | `progress_state` |
| `study_plan` | Knowledge | `plans/` | Notebook LM | `task_state` |
| `focus_recommendation` | Knowledge | `plans/` | Notebook LM | `study_plan` |
| `progress_update` | Knowledge | `plans/` | Notebook LM | `progress_state` |
| `task` | Knowledge (Legacy) | `subjects/` | Manual | `task_state` |
| `goal` | Knowledge (Legacy) | `goals/` | Manual | `goal_state` |
| `task_state` | State | `.state/tasks/` | System | - |
| `progress_state` | State | `.state/progress/` | System | - |
| `goal_state` | State | `.state/goals/` | System | - |
| `session_state` | State | `.state/sessions/` | System | `progress_update` |

### Field Type Quick Reference

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `type` | string enum | schema type | `"quiz_result"` |
| `date` | string | YYYY-MM-DD | `"2024-08-25"` |
| `time` | string | HH:MM | `"09:00"` |
| `datetime` | string | YYYY-MM-DD HH:MM | `"2024-08-25 09:00"` |
| `progress` | integer | 0-100 | `75` |
| `mastery_level` | integer | 0-100 | `75` |
| `confidence` | string enum | low/medium/high | `"medium"` |
| `priority` | string enum | HIGH/MEDIUM/LOW | `"HIGH"` |
| `status` | string enum | varies by type | `"completed"` |
| `tags` | string array | `[...]` | `["nmcp", "exam"]` |

### Transform Quick Reference

```
quiz_result → progress_state
  ├─ mastery_level: progress_after
  ├─ confidence: confidence
  ├─ concepts_needing_review: identified_gaps
  └─ next_focus: next_focus

progress_update → progress_state
  ├─ mastery_level: progress_after
  ├─ confidence: quality
  ├─ concepts_mastered: merged
  └─ concepts_needing_review: replaced

study_plan → task_state[]
  ├─ Split focus_topics across time slots
  ├─ Create task_state per topic
  └─ Schedule sequentially

focus_recommendation → study_plan
  ├─ focus_topics: priority_topics (top 3)
  └─ total_time_min: time_available_min
```

---

## System Requirements

### Technical Stack

- **Runtime**: Node.js 18+
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite (via Prisma)
- **State**: Zustand with localStorage persistence
- **Parsing**: js-yaml + Zod validation
- **UI**: React + Framer Motion + Tailwind CSS

### File System Requirements

```
knowledge/               # Must be git-tracked
  .state/               # Auto-generated, git-ignored
    tasks/
    progress/
    goals/
    sessions/
  assessments/          # User-generated
  plans/                # User-generated
  subjects/             # User-generated
  goals/                # User-generated
```

### Browser Requirements

- Modern browser with localStorage support
- JavaScript enabled
- (Optional) Obsidian Sync for mobile access

---

## Version History

### v1.0.0 (Current)
- 10 YAML schema types
- Unified parser with auto-detection
- 8 transformation functions
- Tactical command center UI
- Notebook LM integration
- Real-time dashboard with live data

### Future Enhancements
- [ ] Automatic sync with Obsidian mobile
- [ ] Pomodoro timer integration
- [ ] Spaced repetition scheduling
- [ ] Cross-device state synchronization
- [ ] AI-powered transformation suggestions
- [ ] Progress prediction models
- [ ] Calendar export (iCal format)
- [ ] PDF report generation

---

## Support & Resources

### Documentation Files
- `README.md` - Project overview
- `NOTEBOOK_LM_INSTRUCTIONS.md` - AI integration guide
- `HOVER_EFFECTS_GUIDE.md` - UI styling reference
- `WORKFLOW.md` - This file

### Code Reference
- `src/engine/schema-registry.ts` - All schema definitions
- `src/engine/yaml-parser.ts` - Parsing logic
- `src/engine/yaml-transformer.ts` - Transform functions
- `src/store/useStore.ts` - State management

### External Tools
- **Notebook LM**: https://notebooklm.google.com/
- **Obsidian**: https://obsidian.md/
- **Prisma**: https://www.prisma.io/

---

**Last Updated**: 2024-08-25  
**Schema Version**: 1.0.0  
**Maintained By**: OVERRUN Development Team
